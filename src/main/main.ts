import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, systemPreferences, shell, dialog } from 'electron';
import { join, extname, basename } from 'path';
import { randomUUID } from 'crypto';
import { rmSync, existsSync, readFileSync, statSync } from 'fs';
import { OllamaProcessService } from './services/ollama-process.service';
// Notch panel stack (notch/notebook pivot)
import { createMacCaptureProvider } from './services/capture/mac-capture';
import type { CaptureProvider } from './services/capture/capture';
import { captureRegion } from './services/vision/screenshot';
import { NotchController } from './services/notch/notch-controller';
import { OllamaLlmClient } from './services/llm/ollama-llm-client';
import { OpenAiLlmClient } from './services/llm/openai-llm-client';
import { AnthropicLlmClient } from './services/llm/anthropic-llm-client';
import { MultiLlmClient, CLOUD_MODELS } from './services/llm/multi-llm-client';
import { SettingsService, settingsPath } from './services/settings/settings-service';
import { MarkdownStore } from './services/notebook/markdown-store';
import { NotebookStore } from './services/notebook/notebook-store';
import { MemoryNotebookIndex } from './services/notebook/memory-index';
import type { NotebookIndex } from './services/notebook/types';
import { BUILT_IN_PRESETS } from './services/presets/presets';

const DEFAULT_TEXT_MODEL = 'mistral:latest';
const VISION_MODEL = 'llava:latest';

// ── Llamas Remote main process ───────────────────────────────────────────────
//
//   hotkey / tray ─▶ capture selection ─▶ show notch panel ─▶ panel runs query
//                                                                │
//                            NotchController ─▶ Ollama ─▶ stream tokens ─▶ panel
//                                    └─▶ NotebookStore (markdown + FTS5 index)
//
// The app lives in the menu bar (Tray) and the notch panel; there is no always-on
// toolbar window. Legacy auth/license/explanation UI was removed in the pivot.
class MainProcess {
  private notchPanel: BrowserWindow | null = null;
  private notchReady = false;
  private pendingCaptured: { selection: string; sourceApp?: string; empty: boolean; error?: string } | null = null;
  private pendingExpand = false;
  private accessibilityPrompted = false;
  private screenshotInFlight = false;
  private tray: Tray | null = null;

  private ollamaProcessService = new OllamaProcessService();
  private notchController: NotchController | null = null;
  private captureProvider: CaptureProvider | null = null;
  private notebookStore: NotebookStore | null = null;
  private llmClient: OllamaLlmClient | null = null;
  private settingsService: SettingsService | null = null;
  private notebookWindow: BrowserWindow | null = null;

  async initialize(): Promise<void> {
    await app.whenReady();

    // Start Ollama automatically (auto-install/start handled by the service).
    await this.startOllamaIfNeeded();

    // Wire the notch panel stack (capture + controller + notebook).
    this.setupNotch();

    // Menu-bar presence + the notch panel (the primary UI).
    this.createTray();
    this.createNotchPanel();
    if (this.notchPanel) this.notchPanel.showInactive(); // visible on first launch

    this.registerGlobalShortcuts();
    this.setupNotchIpc();
    this.handleAppLifecycle();

    // No dock icon — this is a menu-bar utility.
    if (process.platform === 'darwin') app.dock?.hide();

    console.log('Llamas Remote — initialized');
  }

  private setupNotch(): void {
    try {
      const userData = app.getPath('userData');
      const files = new MarkdownStore(join(userData, 'notebook'));

      let index: NotebookIndex;
      try {
        // Lazy require: if better-sqlite3 isn't built for this Electron ABI, fall back to
        // an in-memory index so the app still launches (persistence just won't survive a restart).
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { SqliteNotebookIndex } = require('./services/notebook/sqlite-index');
        index = new SqliteNotebookIndex(join(userData, 'notebook.db'));
      } catch (err) {
        console.warn('SQLite index unavailable; using in-memory index.', err);
        index = new MemoryNotebookIndex();
      }

      this.notebookStore = new NotebookStore(files, index);
      try {
        this.notebookStore.syncFromDisk();
      } catch (e) {
        console.warn('notebook syncFromDisk failed:', e);
      }

      this.captureProvider = createMacCaptureProvider();
      this.llmClient = new OllamaLlmClient();
      this.settingsService = new SettingsService(settingsPath(userData));
      const llm = new MultiLlmClient({
        ollama: this.llmClient,
        openai: new OpenAiLlmClient(() => this.settingsService?.get().openaiKey),
        anthropic: new AnthropicLlmClient(() => this.settingsService?.get().anthropicKey),
      });
      this.notchController = new NotchController({
        llm,
        notebook: this.notebookStore,
        routerConfig: { defaultTextModel: DEFAULT_TEXT_MODEL, visionModel: VISION_MODEL },
        presets: BUILT_IN_PRESETS,
        newId: () => randomUUID(),
        now: () => new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to set up notch stack:', err);
    }
  }

  // Dynamic-Island style: a transparent canvas pinned to the top-center, the same width
  // as the menu bar around the notch. The renderer draws a black island fused to the
  // notch (square top, round bottom) that expands on hover/hotkey. The window stays
  // click-through (forwarding move events so :hover works) until the pointer is over the
  // island or the panel is expanded — so it never blocks the screen underneath.
  private createNotchPanel(): void {
    if (this.notchPanel && !this.notchPanel.isDestroyed()) return;
    const { screen } = require('electron');
    const display = screen.getPrimaryDisplay();
    const width = Math.min(820, display.workAreaSize.width);
    const height = 540;
    const x = Math.round((display.bounds.width - width) / 2); // centered on the physical display

    this.notchReady = false;
    this.notchPanel = new BrowserWindow({
      width,
      height,
      x,
      y: 0, // flush with the very top so the island fuses with the notch
      frame: false,
      transparent: true,
      hasShadow: false,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      show: false,
      skipTaskbar: true,
      fullscreenable: false,
      // Defeats AppKit's "constrain frame to visible screen" clamp, so a y:0 window can
      // sit OVER the menu bar (otherwise it's parked at the work-area top, below the bar).
      enableLargerThanScreen: true,
      // Float above full-screen apps and the menu bar.
      type: process.platform === 'darwin' ? 'panel' : undefined,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload-panel.js'),
      },
    });
    this.notchPanel.setAlwaysOnTop(true, 'screen-saver');
    if (process.platform === 'darwin') {
      this.notchPanel.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }

    this.notchPanel.loadFile(join(__dirname, '..', 'panel.html')).catch((e) => console.error('Failed to load panel:', e));

    this.notchPanel.webContents.on('did-finish-load', () => {
      this.notchReady = true;
      // Force the window to the ABSOLUTE display top (over the menu-bar level), not the
      // work-area top — otherwise macOS parks it below the menu bar and the island floats.
      if (this.notchPanel && !this.notchPanel.isDestroyed()) {
        const d = require('electron').screen.getPrimaryDisplay();
        const w = Math.min(820, d.bounds.width);
        // Force the window to the ABSOLUTE display top (over the menu bar), not the
        // work-area top — else macOS parks it below the menu bar and the island floats.
        this.notchPanel.setAlwaysOnTop(true, 'screen-saver');
        this.notchPanel.setBounds({ x: Math.round((d.bounds.width - w) / 2), y: d.bounds.y, width: w, height: 540 });
      }
      if (!this.notchPanel || this.notchPanel.isDestroyed()) return;
      // Flush a capture/expand requested via the hotkey before the window finished loading.
      if (this.pendingCaptured) {
        this.notchPanel.webContents.send('panel:captured', this.pendingCaptured);
        this.pendingCaptured = null;
      }
      if (this.pendingExpand) {
        this.notchPanel.webContents.send('panel:expand');
        this.notchPanel.setIgnoreMouseEvents(false);
        this.pendingExpand = false;
      } else {
        // Idle: click-through, but forward move events so the renderer can detect hover.
        this.notchPanel.setIgnoreMouseEvents(true, { forward: true });
      }
    });

    // On blur, collapse back to the island and go click-through (unless mid-screenshot).
    this.notchPanel.on('blur', () => {
      if (this.screenshotInFlight) return;
      if (this.notchPanel && !this.notchPanel.isDestroyed()) {
        this.notchPanel.webContents.send('panel:collapse');
        this.notchPanel.setIgnoreMouseEvents(true, { forward: true });
      }
    });
    this.notchPanel.on('closed', () => {
      this.notchPanel = null;
      this.notchReady = false;
    });
  }

  // When capture is blocked, trigger the real macOS Accessibility prompt (adds the app to
  // the list) and open the Accessibility settings pane. Fires at most once per session.
  private promptAccessibility(): void {
    if (this.accessibilityPrompted || process.platform !== 'darwin') return;
    this.accessibilityPrompted = true;
    try {
      // prompting=true surfaces the system "grant Accessibility" dialog for this app.
      systemPreferences.isTrustedAccessibilityClient(true);
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
    } catch (e) {
      console.warn('Failed to prompt for Accessibility:', e);
    }
  }

  private async handleNotchHotkey(): Promise<void> {
    this.createNotchPanel();
    const panel = this.notchPanel;
    if (!panel) return;

    // Capture the current selection BEFORE showing our panel (focus is still on the
    // source app). On-demand only — never monitored in the background.
    let captured: { selection: string; sourceApp?: string; empty: boolean; error?: string } =
      { selection: '', sourceApp: undefined, empty: true };
    try {
      if (this.captureProvider) {
        const res = await this.captureProvider.captureSelection();
        captured = { selection: res.text, sourceApp: res.sourceApp, empty: res.text.trim().length === 0 };
      }
    } catch (e) {
      console.warn('Selection capture failed:', e);
      captured = { selection: '', sourceApp: undefined, empty: true, error: e instanceof Error ? e.message : 'capture failed' };
      this.promptAccessibility();
    }

    if (this.notchReady && !panel.isDestroyed()) {
      panel.webContents.send('panel:captured', captured);
      panel.webContents.send('panel:expand');
      panel.setIgnoreMouseEvents(false); // interactive so the expanded panel takes input
    } else {
      // Window still loading — flush both on did-finish-load (and become interactive then).
      this.pendingCaptured = captured;
      this.pendingExpand = true;
    }

    panel.show();
    panel.focus();
  }

  // Resolve a bundled asset both in dev (build-resources/) and packaged (extraResources
  // copies it to Contents/Resources/).
  private assetPath(name: string): string {
    return app.isPackaged ? join(process.resourcesPath, name) : join(app.getAppPath(), 'build-resources', name);
  }

  private createTray(): void {
    try {
      // Menu-bar template image (the gamepad-directional symbol). Template = monochrome
      // black+alpha; macOS recolors it for the light/dark menu bar. The @2x sibling is
      // auto-loaded for Retina.
      const iconPath = this.assetPath('trayTemplate.png');
      const image = nativeImage.createFromPath(iconPath);
      if (!image.isEmpty()) image.setTemplateImage(true);
      this.tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image);
      this.tray.setToolTip('Llamas Remote');
      const menu = Menu.buildFromTemplate([
        { label: 'Ask  (⌘⇧Space)', click: () => this.handleNotchHotkey() },
        { label: 'Notebook', click: () => this.showNotebook() },
        { label: 'Settings…', click: () => this.showSettings() },
        { type: 'separator' },
        { label: 'Quit Llamas Remote', click: () => app.quit() },
      ]);
      this.tray.setContextMenu(menu);
      this.tray.on('click', () => this.toggleNotch());
    } catch (err) {
      console.warn('Failed to create tray:', err);
    }
  }

  private toggleNotch(): void {
    // The island always hangs from the notch; tray/activate just pops it open.
    this.handleNotchHotkey();
  }

  // The notebook is the content window: a normal resizable window where answers stream in.
  private createNotebookWindow(): void {
    if (this.notebookWindow && !this.notebookWindow.isDestroyed()) return;
    this.notebookWindow = new BrowserWindow({
      width: 900,
      height: 720,
      minWidth: 600,
      show: false,
      title: 'Llamas Remote — Notebook',
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload-notebook.js'),
      },
    });
    this.notebookWindow.loadFile(join(__dirname, '..', 'notebook.html')).catch((e) => console.error('Failed to load notebook:', e));
    this.notebookWindow.on('closed', () => { this.notebookWindow = null; });
  }

  private showNotebook(): void {
    this.createNotebookWindow();
    if (this.notebookWindow && !this.notebookWindow.isDestroyed()) {
      if (process.platform === 'darwin') app.dock?.show();
      this.notebookWindow.show();
      this.notebookWindow.focus();
    }
  }

  private sendNotebook(channel: string, payload?: unknown): void {
    if (this.notebookWindow && !this.notebookWindow.isDestroyed()) {
      this.notebookWindow.webContents.send(channel, payload);
    }
  }

  // Read attached files to text for the prompt. Caps per-file size (256 KB) and total
  // (768 KB) so a stray binary or huge log can't blow the context window; unreadable or
  // over-cap files are skipped (the model still gets the rest of the query).
  private readAttachments(paths?: string[]): Array<{ name: string; content: string }> {
    if (!paths?.length) return [];
    const PER_FILE = 256 * 1024;
    const TOTAL = 768 * 1024;
    const out: Array<{ name: string; content: string }> = [];
    let used = 0;
    for (const p of paths.slice(0, 10)) {
      try {
        if (!existsSync(p) || statSync(p).size > PER_FILE) continue;
        const content = readFileSync(p, 'utf8');
        if (used + content.length > TOTAL) break;
        used += content.length;
        out.push({ name: basename(p), content });
      } catch { /* skip unreadable / non-text files */ }
    }
    return out;
  }

  // Settings lives in the notebook's right pane (single, unified surface). Open/focus the
  // notebook window and tell it to switch to the settings view — waiting for first load if
  // the window was just created so the renderer is listening when the message arrives.
  private showSettings(): void {
    const fresh = !this.notebookWindow || this.notebookWindow.isDestroyed();
    this.showNotebook();
    const win = this.notebookWindow;
    if (!win) return;
    if (fresh) win.webContents.once('did-finish-load', () => win.webContents.send('notebook:show-settings'));
    else win.webContents.send('notebook:show-settings');
  }

  private setupNotchIpc(): void {
    ipcMain.handle('panel:run-query', async (_event, req: {
      kind: 'text' | 'image';
      presetId?: string;
      freeText?: string;
      selection?: string;
      sourceApp?: string;
      imagePath?: string;
      userSelectedModel?: string;
      attachments?: string[]; // absolute paths the user attached via the picker
      autoOpen?: boolean; // open the notebook automatically when done (default true)
    }) => {
      if (!this.notchController) return { ok: false, error: 'Notch controller not ready' };

      const attachments = this.readAttachments(req.attachments);

      // The answer streams into the notebook window (created hidden if not open). The panel
      // only shows progress + an Open button.
      this.createNotebookWindow();
      const preset = req.presetId ? BUILT_IN_PRESETS.find((p) => p.id === req.presetId) : undefined;
      const label = preset?.name ?? (req.freeText?.trim() || 'Ask');
      const displayModel = req.userSelectedModel || (req.kind === 'image' ? VISION_MODEL : DEFAULT_TEXT_MODEL);
      this.sendNotebook('notebook:start', { prompt: label, selection: req.selection ?? '', sourceApp: req.sourceApp, model: displayModel });

      try {
        const result = await this.notchController.runQuery({
          kind: req.kind,
          presetId: req.presetId,
          freeText: req.freeText,
          userSelectedModel: req.userSelectedModel,
          capture:
            req.kind === 'text'
              ? { text: req.selection ?? '', sourceApp: req.sourceApp, via: 'clipboard' }
              : undefined,
          imagePath: req.imagePath,
          attachments,
          onToken: (partial) => this.sendNotebook('notebook:token', partial),
        });
        this.sendNotebook('notebook:done', result.answer);
        this.sendNotebook('notebook:saved', result.entry.id);
        if (req.autoOpen !== false) this.showNotebook(); // auto-open when done
        return { ok: true, answer: result.answer, model: result.model, entryId: result.entry.id };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.sendNotebook('notebook:error', message);
        if (req.autoOpen !== false) this.showNotebook();
        return { ok: false, error: message };
      } finally {
        // Clean up the temp screenshot once the model has consumed it.
        if (req.kind === 'image' && req.imagePath && existsSync(req.imagePath)) {
          try { rmSync(req.imagePath); } catch { /* ignore */ }
        }
      }
    });

    // Let the panel attach files: open a native picker and hand back the chosen paths +
    // display names (the panel can't touch the filesystem). Contents are read at run time.
    ipcMain.handle('panel:pick-files', async () => {
      const win = this.notchPanel ?? undefined;
      const result = win
        ? await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] })
        : await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });
      if (result.canceled) return [];
      return result.filePaths.map((p) => ({ path: p, name: basename(p) }));
    });

    // On-demand capture when the panel opens (hover/click), while the source app is still
    // frontmost. The panel becomes mouse-interactive without taking key focus, so a
    // synthetic Cmd+C still targets the app the user was in.
    ipcMain.handle('panel:capture', async () => {
      if (!this.captureProvider) return { selection: '', sourceApp: undefined, empty: true };
      try {
        const r = await this.captureProvider.captureSelection();
        return { selection: r.text, sourceApp: r.sourceApp, empty: r.text.trim().length === 0 };
      } catch (e) {
        console.warn('panel:capture failed:', e);
        this.promptAccessibility();
        return { selection: '', sourceApp: undefined, empty: true, error: e instanceof Error ? e.message : 'capture failed' };
      }
    });

    // Open the notebook window immediately (the panel's Open button) to watch streaming.
    ipcMain.on('open-notebook', () => this.showNotebook());

    // Model picker = local Ollama models + cloud models for providers whose key is set.
    ipcMain.handle('panel:models', async () => {
      const local = this.llmClient ? await this.llmClient.listModels() : [];
      const s = this.settingsService?.get() ?? {};
      const cloud = [
        ...(s.openaiKey ? CLOUD_MODELS.openai : []),
        ...(s.anthropicKey ? CLOUD_MODELS.anthropic : []),
      ];
      return [...local, ...cloud];
    });

    // Settings window + operations.
    ipcMain.on('open-settings', () => this.showSettings());
    ipcMain.handle('settings:get', () => this.settingsService?.getRedacted() ?? { openaiKeySet: false, anthropicKeySet: false });
    ipcMain.handle('settings:set-key', (_e, provider: 'openai' | 'anthropic', key: string) => {
      this.settingsService?.setKey(provider, key);
    });
    ipcMain.handle('ollama:pull', async (event, name: string) => {
      if (!this.llmClient || !name.trim()) return { ok: false, error: 'No model name' };
      try {
        await this.llmClient.pullModel(name.trim(), (status, percent) => {
          if (!event.sender.isDestroyed()) event.sender.send('settings:pull-progress', { name, status, percent });
        });
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Pull failed' };
      }
    });

    // Notebook (notes app) operations.
    ipcMain.handle('notebook:list', () => this.notebookStore?.list() ?? []);
    ipcMain.handle('notebook:search', (_e, query: string) => this.notebookStore?.search(query) ?? []);
    ipcMain.handle('notebook:get', (_e, id: string) => this.notebookStore?.getBody(id) ?? null);
    ipcMain.handle('notebook:image', (_e, id: string) => {
      const p = this.notebookStore?.getImagePath(id);
      if (!p || !existsSync(p)) return null;
      try {
        const ext = extname(p).slice(1).toLowerCase() || 'png';
        const mime = ext === 'jpg' ? 'jpeg' : ext;
        return `data:image/${mime};base64,${readFileSync(p).toString('base64')}`;
      } catch {
        return null;
      }
    });
    ipcMain.handle('notebook:rename', (_e, id: string, title: string) => { this.notebookStore?.rename(id, title); });
    ipcMain.handle('notebook:pin', (_e, id: string, pinned: boolean) => { this.notebookStore?.setPinned(id, pinned); });
    ipcMain.handle('notebook:update-body', (_e, id: string, body: string) => { this.notebookStore?.updateBody(id, body); });
    ipcMain.handle('notebook:hide', (_e, id: string) => { this.notebookStore?.hide(id); });
    ipcMain.handle('notebook:restore', (_e, id: string) => { this.notebookStore?.restore(id); });
    ipcMain.handle('notebook:delete', (_e, id: string) => { this.notebookStore?.delete(id); });

    ipcMain.handle('panel:screenshot', async () => {
      this.screenshotInFlight = true;
      try {
        const { path } = await captureRegion();
        return path;
      } catch (e) {
        console.error('Screenshot failed:', e);
        return null;
      } finally {
        this.screenshotInFlight = false;
        if (this.notchPanel && !this.notchPanel.isDestroyed()) {
          this.notchPanel.show();
          this.notchPanel.focus();
        }
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

    // Renderer toggles interactivity as the pointer enters/leaves the island, so the
    // transparent canvas stays click-through everywhere else.
    ipcMain.on('panel:set-interactive', (_event, interactive: boolean) => {
      if (this.notchPanel && !this.notchPanel.isDestroyed()) {
        this.notchPanel.setIgnoreMouseEvents(!interactive, { forward: true });
      }
    });

    // Collapse back to the idle island (does not hide — the island always hangs from the notch).
    ipcMain.on('panel:close', () => {
      if (this.notchPanel && !this.notchPanel.isDestroyed()) {
        this.notchPanel.webContents.send('panel:collapse');
        this.notchPanel.setIgnoreMouseEvents(true, { forward: true });
      }
    });
  }

  private registerGlobalShortcuts(): void {
    const notchShortcut = process.platform === 'darwin' ? 'Cmd+Shift+Space' : 'Ctrl+Shift+Space';
    globalShortcut.register(notchShortcut, () => this.handleNotchHotkey());
    console.log(`Global shortcut registered: ${notchShortcut}`);
  }

  private handleAppLifecycle(): void {
    // Menu-bar app: keep running when the panel is hidden/closed.
    app.on('window-all-closed', () => {
      // no-op on macOS; the tray keeps the app alive
      if (process.platform !== 'darwin') app.quit();
    });
    app.on('activate', () => this.toggleNotch());
    app.on('before-quit', () => {
      this.ollamaProcessService.stopOllama();
    });
  }

  private async startOllamaIfNeeded(): Promise<void> {
    try {
      const isRunning = await this.ollamaProcessService.checkIfRunning();
      if (isRunning) {
        console.log('Ollama is already running');
        return;
      }
      console.log('Starting Ollama...');
      const started = await this.ollamaProcessService.startOllama();
      if (started) {
        await this.ollamaProcessService.ensureModelAvailable(DEFAULT_TEXT_MODEL);
      } else {
        console.warn('Failed to start Ollama automatically; user can start it manually.');
      }
    } catch (error) {
      console.error('Error during Ollama startup:', error);
    }
  }
}

const mainProcess = new MainProcess();
mainProcess.initialize().catch((error) => {
  console.error('Failed to initialize main process:', error);
  app.quit();
});
