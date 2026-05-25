import { app, BrowserWindow, globalShortcut, ipcMain, clipboard } from 'electron';
import { join } from 'path';
import { OllamaService } from './services/ollama.service';
import { OllamaProcessService } from './services/ollama-process.service';
import { CodeAnalysisService } from './services/code-analysis.service';
import { writeFile, readFile, existsSync, mkdirSync } from 'fs';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
// Notch panel stack (notch/notebook pivot)
import { createMacCaptureProvider } from './services/capture/mac-capture';
import type { CaptureProvider } from './services/capture/capture';
import { captureRegion } from './services/vision/screenshot';
import { NotchController } from './services/notch/notch-controller';
import { OllamaLlmClient } from './services/llm/ollama-llm-client';
import { MarkdownStore } from './services/notebook/markdown-store';
import { NotebookStore } from './services/notebook/notebook-store';
import { MemoryNotebookIndex } from './services/notebook/memory-index';
import type { NotebookIndex } from './services/notebook/types';
import { BUILT_IN_PRESETS } from './services/presets/presets';

// Promisify file operations
const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);

class MainProcess {
  private mainWindow: BrowserWindow | null = null;
  private explanationWindow: BrowserWindow | null = null;
  private ollamaService: OllamaService;
  private ollamaProcessService: OllamaProcessService;
  private codeAnalysisService: CodeAnalysisService;
  private isToolbarVisible = true;
  private clipboardWatcher: NodeJS.Timeout | null = null;
  private lastClipboardContent = '';
  private savedExplanations: any[] = []; // In-memory storage for saved explanations
  private explanationsFilePath: string;
  // Notch panel stack
  private notchPanel: BrowserWindow | null = null;
  private notchController: NotchController | null = null;
  private captureProvider: CaptureProvider | null = null;
  private notebookStore: NotebookStore | null = null;
  private notchReady = false;
  private pendingCaptured: { selection: string; sourceApp?: string; empty: boolean } | null = null;

  constructor() {
    this.ollamaService = new OllamaService();
    this.ollamaProcessService = new OllamaProcessService();
    this.codeAnalysisService = new CodeAnalysisService();

    // Set up persistent storage path for explanations
    const userDataPath = app.getPath('userData');
    const explanationsDir = join(userDataPath, 'explanations');
    if (!existsSync(explanationsDir)) {
      mkdirSync(explanationsDir, { recursive: true });
    }
    this.explanationsFilePath = join(explanationsDir, 'explanations.json');
  }

  async initialize(): Promise<void> {
    // Wait for Electron to be ready
    await app.whenReady();

    // Start Ollama automatically
    await this.startOllamaIfNeeded();

    // Load existing explanations from file
    await this.loadExplanationsFromFile();

    // Wire the notch panel stack (capture + controller + notebook)
    this.setupNotch();

    // Create the main toolbar window
    this.createMainWindow();

    // Register global shortcuts
    this.registerGlobalShortcuts();

    // Set up IPC handlers
    this.setupIpcHandlers();
    this.setupNotchIpc();

    // Handle app lifecycle
    this.handleAppLifecycle();

    console.log('Initialized successfully');
  }

  private createMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.focus();
      return;
    }

    // Get screen dimensions
    const { screen } = require('electron');

    // Calculate toolbar position (center at top) with content-based dimensions
    const toolbarHeight = 40;
    const toolbarY = 50; // Move down from top to avoid menu bar

    this.mainWindow = new BrowserWindow({
      width: 700, // Sweet spot - enough space without excess
      height: toolbarHeight,
      x: 0, // Will center after content loads
      y: toolbarY,
      frame: false,
      resizable: true,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js')
      }
    });

    // Fix the path to load from the correct dist directory
    const toolbarPath = join(__dirname, '..', 'toolbar.html');
    console.log('Loading toolbar from:', toolbarPath);

    this.mainWindow.loadFile(toolbarPath).catch(error => {
      console.error('Failed to load toolbar:', error);
    });

    // Wait for the window to be ready before sending data
    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('Llamas Remote - Toolbar loaded and ready');

      // Center the window after content loads
      if (this.mainWindow) {
        const { width: contentWidth } = this.mainWindow.getContentBounds();
        const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
        const toolbarX = Math.round((screenWidth - contentWidth) / 2);
        this.mainWindow.setPosition(toolbarX, toolbarY);
      }

      // Start clipboard monitoring now that the window is ready
      this.startClipboardMonitoring();

      // Send initial clipboard data
      this.updateLineCount(clipboard.readText());
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private createExplanationWindow(): void {
    if (this.explanationWindow) {
      console.log('Explanation window already exists, focusing...');
      this.explanationWindow.focus();
      return;
    }

    console.log('Creating new explanation window...');

    // Create explanation window
    this.explanationWindow = new BrowserWindow({
      width: 800,
      height: 600,
      frame: false, // Remove default frame to show custom header
      resizable: true,
      alwaysOnTop: false,
      show: false, // Don't show until ready to prevent white flash
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js')
      }
    });

    console.log('Explanation window created, loading HTML...');

    // Load explanation HTML
    const explanationPath = join(__dirname, '..', 'explanation.html');
    console.log('Loading explanation window from:', explanationPath);

    this.explanationWindow.loadFile(explanationPath).catch(error => {
      console.error('Failed to load explanation window:', error);
    });

    this.explanationWindow.webContents.on('did-finish-load', () => {
      console.log('Explanation window loaded and ready');

      // Send initial message to explanation window
      console.log('Sending initial message to explanation window');
      this.sendExplanationData({
        status: 'idle', // Changed from 'processing' to 'idle' for initial state
        hasExplanation: false,
        explanationLength: 0
      });

      // Show the window after everything is ready
      console.log('Showing explanation window...');
      if (this.explanationWindow && !this.explanationWindow.isDestroyed()) {
        this.explanationWindow.show();
        console.log('Explanation window shown successfully');
      }
    });

    this.explanationWindow.on('closed', () => {
      console.log('Explanation window closed');
      this.explanationWindow = null;
    });
  }

  // ── Notch panel stack ───────────────────────────────────────────────────
  //
  //   hotkey ─▶ capture selection ─▶ show panel ─▶ panel runs query via IPC
  //                                                   │
  //                          NotchController ─▶ Ollama ─▶ stream tokens ─▶ panel
  //                                  └─▶ NotebookStore (markdown + index)
  //
  private setupNotch(): void {
    try {
      const userData = app.getPath('userData');
      const files = new MarkdownStore(join(userData, 'notebook'));

      let index: NotebookIndex;
      try {
        // Lazy require: if better-sqlite3 isn't rebuilt for the Electron ABI yet, fall
        // back to an in-memory index so the app still launches and works this session.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { SqliteNotebookIndex } = require('./services/notebook/sqlite-index');
        index = new SqliteNotebookIndex(join(userData, 'notebook.db'));
      } catch (err) {
        console.warn('SQLite index unavailable (run `npx electron-builder install-app-deps`); using in-memory index.', err);
        index = new MemoryNotebookIndex();
      }

      this.notebookStore = new NotebookStore(files, index);
      try {
        this.notebookStore.syncFromDisk();
      } catch (e) {
        console.warn('notebook syncFromDisk failed:', e);
      }

      this.captureProvider = createMacCaptureProvider();
      this.notchController = new NotchController({
        llm: new OllamaLlmClient(),
        notebook: this.notebookStore,
        routerConfig: { defaultTextModel: 'mistral:latest', visionModel: 'llava:latest' },
        presets: BUILT_IN_PRESETS,
        newId: () => randomUUID(),
        now: () => new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to set up notch stack:', err);
    }
  }

  private createNotchPanel(): void {
    if (this.notchPanel && !this.notchPanel.isDestroyed()) return;
    const { screen } = require('electron');
    const width = 640;
    const height = 460;
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

    this.notchReady = false;
    this.notchPanel = new BrowserWindow({
      width,
      height,
      x: Math.round((screenWidth - width) / 2), // centered under the notch
      y: 0,
      frame: false,
      transparent: true,
      resizable: false,
      alwaysOnTop: true,
      show: false,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload-panel.js'),
      },
    });

    this.notchPanel.loadFile(join(__dirname, '..', 'panel.html')).catch((e) => console.error('Failed to load panel:', e));

    this.notchPanel.webContents.on('did-finish-load', () => {
      this.notchReady = true;
      if (this.pendingCaptured && this.notchPanel && !this.notchPanel.isDestroyed()) {
        this.notchPanel.webContents.send('panel:captured', this.pendingCaptured);
        this.pendingCaptured = null;
      }
    });
    // Hide when the user clicks away — keeps it Spotlight-like.
    this.notchPanel.on('blur', () => {
      if (this.notchPanel && !this.notchPanel.isDestroyed()) this.notchPanel.hide();
    });
    this.notchPanel.on('closed', () => {
      this.notchPanel = null;
      this.notchReady = false;
    });
  }

  private async handleNotchHotkey(): Promise<void> {
    this.createNotchPanel();
    const panel = this.notchPanel;
    if (!panel) return;

    // Capture the current selection before showing our panel (so focus is still on the
    // source app). On-demand only — we never monitor selections in the background.
    let captured = { selection: '', sourceApp: undefined as string | undefined, empty: true };
    try {
      if (this.captureProvider) {
        const res = await this.captureProvider.captureSelection();
        captured = { selection: res.text, sourceApp: res.sourceApp, empty: res.text.trim().length === 0 };
      }
    } catch (e) {
      console.warn('Selection capture failed:', e);
    }

    if (this.notchReady && !panel.isDestroyed()) {
      panel.webContents.send('panel:captured', captured);
    } else {
      this.pendingCaptured = captured; // flushed on did-finish-load
    }

    panel.show();
    panel.focus();
  }

  private setupNotchIpc(): void {
    ipcMain.handle('panel:run-query', async (event, req: {
      kind: 'text' | 'image';
      presetId?: string;
      freeText?: string;
      selection?: string;
      sourceApp?: string;
      imagePath?: string;
    }) => {
      if (!this.notchController) return { ok: false, error: 'Notch controller not ready' };
      const sender = event.sender;
      try {
        const result = await this.notchController.runQuery({
          kind: req.kind,
          presetId: req.presetId,
          freeText: req.freeText,
          capture:
            req.kind === 'text'
              ? { text: req.selection ?? '', sourceApp: req.sourceApp, via: 'clipboard' }
              : undefined,
          imagePath: req.imagePath,
          onToken: (partial) => {
            if (!sender.isDestroyed()) sender.send('panel:token', partial);
          },
        });
        return { ok: true, answer: result.answer, model: result.model, entryId: result.entry.id };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
      }
    });

    ipcMain.handle('panel:screenshot', async () => {
      try {
        const { path } = await captureRegion();
        return path;
      } catch (e) {
        console.error('Screenshot failed:', e);
        return null;
      }
    });

    ipcMain.handle('panel:search', (_event, query: string) => {
      if (!this.notebookStore) return [];
      try {
        return this.notebookStore.search(query);
      } catch {
        return [];
      }
    });

    ipcMain.on('panel:close', () => {
      if (this.notchPanel && !this.notchPanel.isDestroyed()) this.notchPanel.hide();
    });
  }

  private registerGlobalShortcuts(): void {
    // Translation shortcut: Cmd+Shift+T (Mac) / Ctrl+Shift+T (Windows/Linux)
    const translationShortcut = process.platform === 'darwin' ? 'Cmd+Shift+T' : 'Ctrl+Shift+T';

    globalShortcut.register(translationShortcut, () => {
      this.handleTranslationShortcut();
    });

    // Toolbar toggle shortcut: Cmd+Shift+H (Mac) / Ctrl+Shift+H (Windows/Linux)
    const toolbarShortcut = process.platform === 'darwin' ? 'Cmd+Shift+H' : 'Ctrl+Shift+H';

    globalShortcut.register(toolbarShortcut, () => {
      this.toggleToolbar();
    });

    // Notch panel shortcut: Cmd+Shift+Space (Mac) / Ctrl+Shift+Space — the primary
    // capture->ask loop for the pivot.
    const notchShortcut = process.platform === 'darwin' ? 'Cmd+Shift+Space' : 'Ctrl+Shift+Space';
    globalShortcut.register(notchShortcut, () => {
      this.handleNotchHotkey();
    });

    console.log(`Global shortcuts registered: ${translationShortcut}, ${toolbarShortcut}, ${notchShortcut}`);
  }

  private async handleTranslationShortcut(): Promise<void> {

    let clipboardContent = '';
    let language = '';

    try {
      console.log('Translation shortcut triggered - checking for highlighted text...');

      // Get current clipboard content
      clipboardContent = clipboard.readText();

      // If no content, show instructions to the user
      if (!clipboardContent.trim()) {
        console.log('No text in clipboard - showing instructions to user');
        this.showNotification(
          'No text found',
          'Please highlight text in any app, copy it (Cmd+C), then press Cmd+Shift+T again'
        );
        return;
      }

      console.log(`Found text in clipboard: ${clipboardContent.substring(0, 100)}...`);

      // Analyze the code
      language = await this.codeAnalysisService.detectLanguage(clipboardContent);
      console.log(`Detected language: ${language}`);

      // Create explanation window
      this.createExplanationWindow();

      // Send data to explanation window
      this.sendExplanationData({
        code: clipboardContent,
        language: language,
        status: 'processing'
      });

      // Generate AI explanation with progress tracking
      console.log('Starting AI explanation generation...');

      // Send initial progress
      this.sendExplanationData({
        code: clipboardContent,
        language: language,
        explanation: '',
        status: 'processing',
        progress: 0
      });

      // Add timeout wrapper to prevent hanging - increase to 2 minutes for Ollama
      const explanation = await Promise.race([
        this.ollamaService.generateExplanation(
          clipboardContent,
          language,
          'intermediate',
          undefined,
          (progress: number, partialResponse: string) => {
            // Send progress updates to the explanation window
            this.sendExplanationData({
              code: clipboardContent,
              language: language,
              explanation: partialResponse,
              status: 'processing',
              progress: progress
            });
          }
        ),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('AI explanation request timed out after 2 minutes')), 120000)
        )
      ]);

      console.log('AI explanation received, length:', explanation.length);

      // Send final explanation data
      this.sendExplanationData({
        code: clipboardContent,
        language: language,
        explanation: explanation,
        status: 'completed',
        progress: 100
      });

    } catch (error) {
      console.error('Error in translation shortcut:', error);

      // Send error to explanation window
      this.sendExplanationData({
        code: clipboardContent || '',
        language: language || 'unknown',
        explanation: '',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });

      // Show error notification
      this.showNotification(
        'Error',
        'Failed to generate explanation. Please try again.'
      );
    }
  }

  private sendExplanationData(data: any): void {
    if (this.explanationWindow && !this.explanationWindow.isDestroyed()) {
      try {
        console.log('Sending data to explanation window:', {
          status: data.status,
          hasExplanation: !!data.explanation,
          explanationLength: data.explanation?.length || 0
        });

        this.explanationWindow.webContents.send('explanation-data', data);
        console.log('Data sent successfully to explanation window');
      } catch (error) {
        console.error('Failed to send data to explanation window:', error);
      }
    } else {
      console.log('Cannot send data: explanation window is not available');
    }
  }

  private toggleToolbar(): void {
    if (this.mainWindow) {
      if (this.isToolbarVisible) {
        this.mainWindow.hide();
        this.isToolbarVisible = false;
      } else {
        this.mainWindow.show();
        this.isToolbarVisible = true;
      }
    }
  }

  private setupIpcHandlers(): void {
    // Handle toolbar visibility toggle
    ipcMain.handle('toggle-toolbar', () => {
      this.toggleToolbar();
    });

    // Handle get-toolbar-visibility
    ipcMain.handle('get-toolbar-visibility', () => {
      return this.isToolbarVisible;
    });

    // Handle open-settings-page request from toolbar
    ipcMain.on('open-settings-page', () => {
      // Ensure explanation window is open
      if (!this.explanationWindow || this.explanationWindow.isDestroyed()) {
        this.createExplanationWindow();
      }

      // Wait a moment for the window to be ready, then send the message
      setTimeout(() => {
        if (this.explanationWindow && !this.explanationWindow.isDestroyed()) {
          this.explanationWindow.webContents.send('open-settings-page');
        }
      }, 500);
    });

    // Handle open-notebook-in-explanation request from toolbar
    ipcMain.on('open-notebook-in-explanation', () => {
      // Ensure explanation window is open
      if (!this.explanationWindow || this.explanationWindow.isDestroyed()) {
        this.createExplanationWindow();
      }

      // Wait a moment for the window to be ready, then send the message
      setTimeout(() => {
        if (this.explanationWindow && !this.explanationWindow.isDestroyed()) {
          this.explanationWindow.webContents.send('open-notebook-in-explanation');
        }
      }, 500);
    });

    // Handle save-explanation request
    ipcMain.handle('save-explanation', async (_, data) => {
      try {
        console.log('Saving explanation to notebook:', data);

        // Check for duplicates before saving
        if (!this.savedExplanations) {
          this.savedExplanations = [];
        }

        // Check for duplicates
        const isDuplicate = this.savedExplanations.some(existing =>
          existing.code === data.code && existing.explanation === data.explanation
        );

        if (isDuplicate) {
          console.log('Duplicate explanation detected, skipping save');
          // Return the existing explanation
          const existingExplanation = this.savedExplanations.find(existing =>
            existing.code === data.code && existing.explanation === data.explanation
          );
          return {
            success: true,
            explanation: existingExplanation,
            isDuplicate: true
          };
        }

        // For now, we'll use a simple in-memory storage
        // In a real app, you'd save to a database or file
        const savedExplanation = {
          id: Date.now().toString(), // Simple ID generation
          ...data,
          timestamp: data.timestamp || new Date().toISOString()
        };

        // Store in memory
        this.savedExplanations.push(savedExplanation);

        // Save to file for persistence
        await this.saveExplanationsToFile();

        console.log('Explanation saved successfully:', savedExplanation);

        return {
          success: true,
          explanation: savedExplanation
        };
      } catch (error) {
        console.error('Error saving explanation:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Handle get-all-explanations request
    ipcMain.handle('get-all-explanations', async () => {
      try {
        const explanations = this.savedExplanations || [];
        console.log('Retrieved explanations:', explanations.length);

        return {
          success: true,
          explanations
        };
      } catch (error) {
        console.error('Error getting explanations:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Handle delete-explanation request
    ipcMain.handle('delete-explanation', async (_, id: string) => {
      try {
        const index = this.savedExplanations.findIndex(exp => exp.id === id);
        if (index === -1) {
          return {
            success: false,
            error: 'Explanation not found'
          };
        }

        // Remove from memory
        this.savedExplanations.splice(index, 1);

        // Save to file for persistence
        await this.saveExplanationsToFile();

        console.log('Explanation deleted successfully:', id);

        return {
          success: true
        };
      } catch (error) {
        console.error('Error deleting explanation:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Handle translation requests
    ipcMain.handle('translate-code', async (_, { code, detailLevel }) => {
      try {
        console.log('Translation request received:', { codeLength: code.length, detailLevel });

        // Detect language
        const language = await this.codeAnalysisService.detectLanguage(code);
        console.log(`Detected language: ${language}`);

        // Generate explanation
        const explanation = await this.ollamaService.generateExplanation(code, language, detailLevel);

        return { success: true, explanation, language };
      } catch (error) {
        console.error('Translation error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Handle window control operations
    ipcMain.handle('window-close', () => {
      try {
        if (this.explanationWindow && !this.explanationWindow.isDestroyed()) {
          this.explanationWindow.close();
          this.explanationWindow = null;
        }
        return { success: true };
      } catch (error) {
        console.error('Error closing window:', error);
        return { success: false, error: 'Failed to close window' };
      }
    });

    ipcMain.handle('window-minimize', () => {
      try {
        if (this.explanationWindow && !this.explanationWindow.isDestroyed()) {
          this.explanationWindow.minimize();
        }
        return { success: true };
      } catch (error) {
        console.error('Error minimizing window:', error);
        return { success: false, error: 'Failed to minimize window' };
      }
    });

    ipcMain.handle('window-maximize', () => {
      try {
        if (this.explanationWindow && !this.explanationWindow.isDestroyed()) {
          if (this.explanationWindow.isMaximized()) {
            this.explanationWindow.unmaximize();
          } else {
            this.explanationWindow.maximize();
          }
        }
        return { success: true };
      } catch (error) {
        console.error('Error maximizing window:', error);
        return { success: false, error: 'Failed to maximize window' };
      }
    });

    // Handle Ollama status requests
    ipcMain.handle('get-ollama-status', () => {
      try {
        const status = this.ollamaProcessService.getStatus();
        return { success: true, status };
      } catch (error) {
        console.error('Error getting Ollama status:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Handle manual Ollama start requests
    ipcMain.handle('start-ollama', async () => {
      try {
        console.log('Manual Ollama start requested');
        const started = await this.ollamaProcessService.startOllama();

        if (started) {
          // Try to ensure model is available
          await this.ollamaProcessService.ensureModelAvailable('mistral:latest');
        }

        return {
          success: started,
          status: this.ollamaProcessService.getStatus()
        };
      } catch (error) {
        console.error('Error starting Ollama manually:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  private startClipboardMonitoring(): void {
    // Check clipboard every 500ms for changes
    this.clipboardWatcher = setInterval(() => {
      const currentContent = clipboard.readText();

      // Only process if content has changed
      if (currentContent !== this.lastClipboardContent) {
        this.lastClipboardContent = currentContent;
        this.updateLineCount(currentContent);
      }
    }, 500);
  }

  private updateLineCount(content: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const lineCount = content.trim() ? content.split('\n').length : 0;
    const charCount = content.length;

    // Send line count update to toolbar
    this.mainWindow.webContents.send('clipboard-update', {
      lineCount,
      charCount,
      hasContent: content.trim().length > 0
    });
  }

  private stopClipboardMonitoring(): void {
    if (this.clipboardWatcher) {
      this.clipboardWatcher = null;
    }
  }

  private handleAppLifecycle(): void {
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    app.on('before-quit', () => {
      this.stopClipboardMonitoring();
      // Stop Ollama if we started it
      this.ollamaProcessService.stopOllama();
      // Save explanations before quitting
      this.saveExplanationsToFile();
    });
  }

  private async startOllamaIfNeeded(): Promise<void> {
    try {
      console.log('Checking if Ollama needs to be started...');

      // Check if Ollama is already running
      const isRunning = await this.ollamaProcessService.checkIfRunning();
      if (isRunning) {
        console.log('Ollama is already running');
        return;
      }

      // Start Ollama
      console.log('Starting Ollama...');
      const started = await this.ollamaProcessService.startOllama();

      if (started) {
        console.log('Ollama started successfully');

        // Ensure the Mistral model is available
        console.log('Ensuring Mistral model is available...');
        const modelAvailable = await this.ollamaProcessService.ensureModelAvailable('mistral:latest');

        if (modelAvailable) {
          console.log('Mistral model is ready');
        } else {
          console.warn('Mistral model could not be loaded, but Ollama is running');
        }
      } else {
        console.warn('Failed to start Ollama automatically. User will need to start it manually.');
      }
    } catch (error) {
      console.error('Error during Ollama startup:', error);
      // Don't throw - allow the app to continue even if Ollama fails to start
    }
  }

  private async loadExplanationsFromFile(): Promise<void> {
    try {
      if (existsSync(this.explanationsFilePath)) {
        const data = await readFileAsync(this.explanationsFilePath, 'utf8');
        this.savedExplanations = JSON.parse(data);
        console.log(`Loaded ${this.savedExplanations.length} explanations from file`);
      } else {
        // Try to find backup files or old locations
        await this.migrateExplanationsData();

        if (existsSync(this.explanationsFilePath)) {
          const data = await readFileAsync(this.explanationsFilePath, 'utf8');
          this.savedExplanations = JSON.parse(data);
          console.log(`Migrated and loaded ${this.savedExplanations.length} explanations from backup`);
        } else {
          this.savedExplanations = [];
          console.log('No existing explanations file found, starting with empty list');
        }
      }
    } catch (error) {
      console.error('Error loading explanations from file:', error);
      this.savedExplanations = [];
    }
  }

  private async migrateExplanationsData(): Promise<void> {
    try {
      const userDataPath = app.getPath('userData');
      const possiblePaths = [
        join(userDataPath, 'explanations.json'),
        join(userDataPath, 'saved-explanations.json'),
        join(userDataPath, 'codebook.json'),
        join(userDataPath, 'notebook.json')
      ];

      for (const path of possiblePaths) {
        if (existsSync(path) && path !== this.explanationsFilePath) {
          console.log(`Found explanations data at: ${path}`);
          const data = await readFileAsync(path, 'utf8');
          const explanations = JSON.parse(data);

          // Save to the new location
          await writeFileAsync(this.explanationsFilePath, JSON.stringify(explanations, null, 2), 'utf8');
          console.log(`Migrated ${explanations.length} explanations to new location`);
          break;
        }
      }
    } catch (error) {
      console.error('Error during data migration:', error);
    }
  }

  private async saveExplanationsToFile(): Promise<void> {
    try {
      // Create backup before saving
      if (existsSync(this.explanationsFilePath)) {
        const backupPath = this.explanationsFilePath.replace('.json', '.backup.json');
        await writeFileAsync(backupPath, JSON.stringify(this.savedExplanations, null, 2), 'utf8');
      }

      // Save to main file
      await writeFileAsync(this.explanationsFilePath, JSON.stringify(this.savedExplanations, null, 2), 'utf8');
      console.log(`Saved ${this.savedExplanations.length} explanations to file`);
    } catch (error) {
      console.error('Error saving explanations to file:', error);
    }
  }

  private showNotification(title: string, message: string): void {
    // Create a simple notification window
    const notificationWindow = new BrowserWindow({
      width: 400,
      height: 120,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false, // Don't show until ready to prevent white flash
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    notificationWindow.loadURL(`data:text/html,
      <html>
        <head>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              background: #2a2a2a; 
              color: #ffffff; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              border-radius: 8px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
            }
            .title { 
              font-weight: bold; 
              margin-bottom: 12px; 
              font-size: 16px;
              color: #3b82f6;
            }
            .message { 
              color: #e5e7eb; 
              font-size: 14px;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <div class="title">${title}</div>
          <div class="message">${message}</div>
        </body>
      </html>
    `);

    // Show window when ready to prevent white flash
    notificationWindow.once('ready-to-show', () => {
      notificationWindow.show();
    });

    // Auto-close after 3 seconds
    setTimeout(() => {
      if (!notificationWindow.isDestroyed()) {
        notificationWindow.close();
      }
    }, 3000);
  }
}

// Create and initialize the main process
const mainProcess = new MainProcess();
mainProcess.initialize().catch(error => {
  console.error('Failed to initialize main process:', error);
  app.quit();
});
