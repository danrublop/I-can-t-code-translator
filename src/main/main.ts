import { app, BrowserWindow, globalShortcut, ipcMain, clipboard } from 'electron';
import { join } from 'path';
import { OllamaService } from './services/ollama.service';
import { OllamaProcessService } from './services/ollama-process.service';
import { CodeAnalysisService } from './services/code-analysis.service';
import { analyticsService } from './services/analytics.service';
import { authService } from './services/auth.service';
import { gamificationService } from './services/gamification.service';
import { WEBSITE_CONFIG } from './config/website';
import { LicenseService } from './services/license.service';
import { LICENSING_CONFIG } from './config/licensing.config';
import { writeFile, readFile, existsSync, mkdirSync } from 'fs';
import { promisify } from 'util';

// Promisify file operations
const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);

class MainProcess {
  private mainWindow: BrowserWindow | null = null;
  private explanationWindow: BrowserWindow | null = null;
  private websiteAuthWindow: BrowserWindow | null = null;
  private ollamaService: OllamaService;
  private ollamaProcessService: OllamaProcessService;
  private codeAnalysisService: CodeAnalysisService;
  private licenseService: LicenseService;
  // private explanationStorageService: ExplanationStorageService;
  private isToolbarVisible = true;
  private clipboardWatcher: NodeJS.Timeout | null = null;
  private lastClipboardContent = '';
  private savedExplanations: any[] = []; // In-memory storage for saved explanations
  private explanationsFilePath: string;

  constructor() {
    this.ollamaService = new OllamaService();
    this.ollamaProcessService = new OllamaProcessService();
    this.codeAnalysisService = new CodeAnalysisService();
    this.licenseService = new LicenseService();
    // this.explanationStorageService = new ExplanationStorageService();
    
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

    // Create the main toolbar window
    this.createMainWindow();

    // Register global shortcuts
    this.registerGlobalShortcuts();

    // Set up IPC handlers
    this.setupIpcHandlers();

    // Handle app lifecycle
    this.handleAppLifecycle();

    // Track app launch
    analyticsService.trackAppLaunch();
    
    console.log('i cant code - Initialized successfully');
  }

  private checkAndShowOnboarding(): void {
    // Only show onboarding for authenticated users
    if (!authService.isAuthenticated()) {
      console.log('User not authenticated - skipping onboarding');
      return;
    }
    
    console.log('Checking if authenticated user needs onboarding...');
    
    // For authenticated users, check if they need onboarding
    // The explanation window will check localStorage and show onboarding if needed
    // No delay - create window immediately to prevent white popup
    this.createExplanationWindow();
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
      console.log('i cant code - Toolbar loaded and ready');
      
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
      
      // Check authentication status and notify the renderer
      const isAuthenticated = authService.isAuthenticated();
      console.log('User authentication status:', isAuthenticated);
      
      // Send authentication status to the main window
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('auth-status', {
          isAuthenticated,
          user: authService.getUser()
        });
      }
      
      // Only check for onboarding if user is authenticated
      if (isAuthenticated) {
        this.checkAndShowOnboarding();
      } else {
        console.log('User not authenticated - login required in main window');
      }
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
      console.log('i cant code - Explanation window loaded and ready');
      
      // Send authentication status to explanation window
      const isAuthenticated = authService.isAuthenticated();
      const user = authService.getUser();
      
      if (this.explanationWindow && !this.explanationWindow.isDestroyed()) {
        this.explanationWindow.webContents.send('auth-status', {
          isAuthenticated,
          user
        });
      }
      
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

  private createWebsiteAuthWindow(url: string): void {
    // Create a window for the website authentication
    const authWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      frame: true, // Show frame for website navigation
      resizable: true,
      alwaysOnTop: false,
      show: false, // Don't show until ready to prevent white flash
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload-website.js')
      }
    });

    // Load the website URL
    authWindow.loadURL(url);

    // Show window when ready to prevent white flash
    authWindow.once('ready-to-show', () => {
      authWindow.show();
    });

    // Handle window close - ensure it's properly cleaned up
    authWindow.on('closed', () => {
      console.log('Website auth window closed');
      this.websiteAuthWindow = null;
    });

    // Handle page load errors
    authWindow.webContents.on('did-fail-load', () => {
      console.log('Website auth window failed to load, closing...');
      authWindow.close();
      this.websiteAuthWindow = null;
    });

    // Store reference to close it later
    this.websiteAuthWindow = authWindow;
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
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      console.log('User not authenticated - showing login prompt');
      this.showNotification(
        'Authentication Required', 
        'Please log in using the login button in the toolbar first.'
      );
      
      // Focus the main window to show the login button
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.focus();
        this.mainWindow.show();
      }
      return;
    }

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
      
      // Track explanation request
      analyticsService.trackExplanationRequest(language, clipboardContent.length);
      
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
      
      const startTime = Date.now();
      
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
        
      // Track explanation completion
      const responseTime = Date.now() - startTime;
      analyticsService.trackExplanationCompleted(language, clipboardContent.length, responseTime, true);
      
      // Award points for successful explanation
      const points = gamificationService.calculatePointsForRequest(language, clipboardContent.length);
      await authService.addPoints(points);
      
      // Check for achievements
      const user = authService.getUser();
      if (user) {
        // Check for first request achievement
        if (user.totalRequests === 1) {
          const achievement = gamificationService.unlockAchievement('first_request');
          if (achievement) {
            this.showNotification(
              'Achievement Unlocked! 🏆', 
              `You've unlocked: ${achievement.name} - ${achievement.description}`
            );
          }
        }
      }
      
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
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        this.showNotification(
          'Authentication Required', 
          'Please log in first to access settings.'
        );
        return;
      }
      
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
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        this.showNotification(
          'Authentication Required', 
          'Please log in first to access the codebook.'
        );
        return;
      }
      
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
        // Check if user is authenticated
        if (!authService.isAuthenticated()) {
          return { 
            success: false, 
            error: 'Authentication required. Please log in first.' 
          };
        }

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
        // Check if user is authenticated
        if (!authService.isAuthenticated()) {
          return { 
            success: false, 
            error: 'Authentication required. Please log in first.' 
          };
        }

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
        // Check if user is authenticated
        if (!authService.isAuthenticated()) {
          return { 
            success: false, 
            error: 'Authentication required. Please log in first.' 
          };
        }

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

    // Handle license info requests
    ipcMain.handle('get-license-info', async () => {
      try {
        const licenseInfo = this.licenseService.getLicenseInfo();
        const isFreeMode = LICENSING_CONFIG.mode === 'free';
        
        return { 
          success: true, 
          licenseInfo,
          isFreeMode,
          config: LICENSING_CONFIG
        };
      } catch (error) {
        console.error('Error getting license info:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Handle trial start requests
    ipcMain.handle('start-trial', async () => {
      try {
        this.licenseService.startTrial();
        console.log('Trial started successfully');
        
        return { 
          success: true, 
          licenseInfo: this.licenseService.getLicenseInfo()
        };
      } catch (error) {
        console.error('Error starting trial:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Handle translation requests
    ipcMain.handle('translate-code', async (_, { code, detailLevel }) => {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        return { 
          success: false, 
          error: 'Authentication required. Please log in first.' 
        };
      }
      
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

    // Handle website authentication opening
    ipcMain.handle('open-auth-website', async () => {
      try {
        // Open the website login page in an Electron window
        const loginUrl = WEBSITE_CONFIG.getLoginUrl();
        console.log('Opening authentication website in Electron window:', loginUrl);
        
        // Create a new window for the website
        this.createWebsiteAuthWindow(loginUrl);
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Handle authentication success from website
    ipcMain.handle('auth-success', async (_, userData) => {
      try {
        console.log('Authentication successful:', userData);
        
        // DON'T close the website auth window immediately - let user click continue button
        // The window will be closed when user clicks "Return to Application"
        
        // Update the auth service with user data
        await authService.setUserAuthenticated(userData);
        
        // Check for updates immediately after successful login
        try {
          const versionInfo = await authService.checkForUpdates();
          const wasForceLoggedOut = authService.wasUserForceLoggedOut();
          
          // If update is available, show download prompt
          if (versionInfo.hasUpdate && versionInfo.updateAvailable) {
            console.log('Update detected after login:', versionInfo.updateAvailable);
            
            // Show update dialog with appropriate message
            const { dialog } = require('electron');
            const title = wasForceLoggedOut ? 'New Update Required! 🚀' : 'Update Available! 🚀';
            const message = wasForceLoggedOut 
              ? `A new version (v${versionInfo.updateAvailable.version}) has been released and requires your attention!`
              : `A new version (v${versionInfo.updateAvailable.version}) is available!`;
            const detail = wasForceLoggedOut
              ? `We've updated the app with important improvements:\n\n${versionInfo.updateAvailable.releaseNotes}\n\nPlease download the latest version to continue using all features.`
              : `${versionInfo.updateAvailable.releaseNotes}\n\nWould you like to download the update now?`;
            
            const result = await dialog.showMessageBox(null, {
              type: 'info',
              title,
              message,
              detail,
              buttons: ['Download Update', 'Later'],
              defaultId: 0,
              cancelId: 1,
              icon: undefined // You can add an icon path here if you have one
            });
            
            if (result.response === 0) {
              // User clicked "Download Update"
              const { shell } = require('electron');
              shell.openExternal(versionInfo.updateAvailable.downloadUrl);
              console.log('Opening download URL:', versionInfo.updateAvailable.downloadUrl);
            }
            
            // Clear the force logout flag after showing the update prompt
            authService.clearForceLogoutFlag();
          } else if (wasForceLoggedOut) {
            // User was forced to log out but no app update available - just clear the flag
            authService.clearForceLogoutFlag();
          }
        } catch (updateError) {
          console.error('Failed to check for updates after login:', updateError);
          // Don't fail the login process if update check fails
          // Still clear the force logout flag
          if (authService.wasUserForceLoggedOut()) {
            authService.clearForceLogoutFlag();
          }
        }
        
        // Notify the main window about authentication state change
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('auth-state-changed', {
            isAuthenticated: true,
            user: authService.getUser()
          });
        }
        
        return { success: true };
      } catch (error) {
        console.error('Error handling auth success:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Handle user clicking "Return to Application" button
    ipcMain.handle('continue-to-application', async () => {
      try {
        console.log('User clicked continue to application');
        
        // Close the website auth window
        if (this.websiteAuthWindow && !this.websiteAuthWindow.isDestroyed()) {
          console.log('Closing website auth window...');
          this.websiteAuthWindow.close();
          this.websiteAuthWindow = null;
          console.log('Website auth window closed successfully');
        }
        
        // Now that user is authenticated, trigger the main app flow
        console.log('User authenticated, transitioning to main app...');
        
        // Ensure main window is focused and visible
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          console.log('Focusing main window...');
          this.mainWindow.focus();
          this.mainWindow.show();
        }
        
        // Trigger the onboarding/explanation flow
        console.log('Creating explanation window...');
        this.checkAndShowOnboarding();
        
        return { success: true };
      } catch (error) {
        console.error('Error handling continue to application:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Handle authentication state refresh
    ipcMain.handle('auth-refresh-state', async () => {
      try {
        const isAuthenticated = authService.isAuthenticated();
        const user = authService.getUser();
        
        return { 
          success: true, 
          isAuthenticated, 
          user 
        };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Handle session info requests
    ipcMain.handle('get-session-info', async () => {
      try {
        const sessionInfo = authService.getSessionInfo();
        return { success: true, sessionInfo };
      } catch (error) {
        console.error('Error getting session info:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Handle session extension
    ipcMain.handle('extend-session', async () => {
      try {
        authService.extendSession();
        return { success: true };
      } catch (error) {
        console.error('Error extending session:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Handle version check requests
    ipcMain.handle('check-for-updates', async () => {
      try {
        const versionInfo = await authService.checkForUpdates();
        return { success: true, versionInfo };
      } catch (error) {
        console.error('Error checking for updates:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Handle force version check (for manual refresh)
    ipcMain.handle('force-version-check', async () => {
      try {
        const requiresReauth = await authService.forceVersionCheck();
        return { success: true, requiresReauth };
      } catch (error) {
        console.error('Error in force version check:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Handle logout
    ipcMain.handle('auth-logout', async () => {
      try {
        await authService.logout();
        
        // Close explanation window if open
        if (this.explanationWindow && !this.explanationWindow.isDestroyed()) {
          this.explanationWindow.close();
          this.explanationWindow = null;
        }
        
        // Notify the main window about authentication state change
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('auth-state-changed', {
            isAuthenticated: false,
            user: null
          });
        }
        
        // Show logout notification
        this.showNotification(
          'Logged Out', 
          'You have been logged out. Please log in again to continue.'
        );
        
        return { success: true };
      } catch (error) {
        console.error('Error during logout:', error);
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
