import { app, BrowserWindow, globalShortcut, ipcMain, clipboard } from 'electron';
import { join } from 'path';
import { OllamaService } from './services/ollama.service';
import { CodeAnalysisService } from './services/code-analysis.service';

class MainProcess {
  private mainWindow: BrowserWindow | null = null;
  private explanationWindow: BrowserWindow | null = null;
  private ollamaService: OllamaService;
  private codeAnalysisService: CodeAnalysisService;
  private isToolbarVisible = true;
  private clipboardWatcher: NodeJS.Timeout | null = null;
  private lastClipboardContent = '';

  constructor() {
    this.ollamaService = new OllamaService();
    this.codeAnalysisService = new CodeAnalysisService();
  }

  async initialize(): Promise<void> {
    // Wait for Electron to be ready
    await app.whenReady();

    // Create the main toolbar window
    this.createMainWindow();

    // Register global shortcuts
    this.registerGlobalShortcuts();

    // Set up IPC handlers
    this.setupIpcHandlers();

    // Start clipboard monitoring
    this.startClipboardMonitoring();

    // Handle app lifecycle
    this.handleAppLifecycle();

    console.log('CodeLens Translator initialized successfully');
  }

  private createMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.focus();
      return;
    }

    // Get screen dimensions
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;

    // Calculate toolbar position (center at top) with original dimensions
    const toolbarWidth = Math.min(800, screenWidth);
    const toolbarHeight = 40;
    const toolbarX = Math.round((screenWidth - toolbarWidth) / 2);
    const toolbarY = 0;

    this.mainWindow = new BrowserWindow({
      width: toolbarWidth,
      height: toolbarHeight,
      x: toolbarX,
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
      console.log('Toolbar loaded and ready');
      
      // Send initial clipboard data
      this.updateLineCount(clipboard.readText());
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
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

    console.log(`Global shortcuts registered: ${translationShortcut}, ${toolbarShortcut}`);
  }

  private async handleTranslationShortcut(): Promise<void> {
    try {
      console.log('Translation shortcut triggered - checking for highlighted text...');
      
      // Get current clipboard content
      let clipboardContent = clipboard.readText();
      
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
      const language = await this.codeAnalysisService.detectLanguage(clipboardContent);
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
      
      // Ensure the explanation window is still open before sending data
      if (this.explanationWindow && !this.explanationWindow.isDestroyed()) {
        // Send final explanation data
        this.sendExplanationData({
          code: clipboardContent,
          language: language,
          explanation: explanation,
          status: 'completed',
          progress: 100
        });
        
        console.log('Final explanation data sent to window');
      } else {
        console.log('Explanation window is no longer available');
      }

      console.log('Explanation generated successfully');

    } catch (error) {
      console.error('Error handling translation shortcut:', error);
      this.sendExplanationData({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  private createExplanationWindow(): void {
    if (this.explanationWindow) {
      this.explanationWindow.focus();
      return;
    }

    // Get screen dimensions
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;

    // Calculate explanation window position (right side)
    const explanationWidth = 600;
    const explanationHeight = 700;
    const explanationX = screenWidth - explanationWidth - 20; // 20px margin from right edge
    const explanationY = 100; // Fixed position from top

    this.explanationWindow = new BrowserWindow({
      width: explanationWidth,
      height: explanationHeight,
      x: explanationX,
      y: explanationY,
      minWidth: 600,
      minHeight: 400,
      frame: false,
      resizable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js')
      }
    });

    // Fix the path to load from the correct dist directory
    const explanationPath = join(__dirname, '..', 'explanation.html');
    console.log('Loading explanation window from:', explanationPath);
    
    this.explanationWindow.loadFile(explanationPath).catch(error => {
      console.error('Failed to load explanation window:', error);
    });

    // Wait for the window to be ready before sending data
    this.explanationWindow.webContents.on('did-finish-load', () => {
      console.log('Explanation window loaded and ready');
      
      // Open developer tools for debugging
      this.explanationWindow?.webContents.openDevTools();
      
      // Send a test message to verify IPC communication
      setTimeout(() => {
        console.log('Sending test message to verify IPC communication');
        this.sendExplanationData({
          status: 'processing',
          code: 'Test code',
          language: 'javascript',
          explanation: 'This is a test message to verify IPC communication is working.',
          progress: 50
        });
      }, 1000);
    });

    this.explanationWindow.on('closed', () => {
      console.log('Explanation window closed');
      this.explanationWindow = null;
    });
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
      if (this.explanationWindow && !this.explanationWindow.isDestroyed()) {
        this.explanationWindow.webContents.send('open-settings-page');
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
      clearInterval(this.clipboardWatcher);
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
    });
  }

  private showNotification(title: string, message: string): void {
    // Create a simple notification window
    const notificationWindow = new BrowserWindow({
      width: 400,
      height: 120,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
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
            .shortcut {
              background: #374151;
              padding: 4px 8px;
              border-radius: 4px;
              font-family: monospace;
              margin: 0 4px;
            }
          </style>
        </head>
        <body>
          <div class="title">${title}</div>
          <div class="message">${message}</div>
        </body>
      </html>
    `);

    // Auto-close after 5 seconds
    setTimeout(() => {
      if (!notificationWindow.isDestroyed()) {
        notificationWindow.close();
      }
    }, 5000);
  }
}

// Initialize the application
const mainProcess = new MainProcess();
mainProcess.initialize().catch(console.error);
