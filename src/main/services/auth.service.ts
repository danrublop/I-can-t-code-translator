import { BrowserWindow, app } from 'electron';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
  level: number;
  points: number;
  totalRequests: number;
  avatarCustomization: AvatarCustomization;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface AvatarCustomization {
  baseAvatar: string;
  outfit: string;
  accessories: string[];
  background: string;
  frame: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface PersistentAuthData {
  authState: AuthState;
  loginTimestamp: number;
  appVersion: string;
  websiteVersion: string;
  expiresAt: number;
}

export interface VersionInfo {
  appVersion: string;
  websiteVersion: string;
  hasUpdate: boolean;
  updateAvailable?: {
    version: string;
    releaseNotes: string;
    downloadUrl: string;
  };
}

export class AuthService {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null
  };

  private authWindow: BrowserWindow | null = null;
  private readonly AUTH_URL = 'http://localhost:3000/auth'; // Development auth website
  private readonly CLIENT_ID = 'your-client-id'; // Replace with your actual client ID
  private readonly REDIRECT_URI = 'http://localhost:3000/auth/callback';
  private readonly AUTH_FILE_NAME = 'auth-session.json';
  private readonly SESSION_DURATION_DAYS = 30;
  private readonly VERSION_CHECK_URL = 'https://api.icantcode.app/version'; // Your website version endpoint
  private authFilePath: string;
  private currentAppVersion: string;
  private currentWebsiteVersion: string = '';
  private wasForceLoggedOut: boolean = false; // Track if user was logged out due to version change

  constructor() {
    // Set up persistent storage path
    const userDataPath = app.getPath('userData');
    this.authFilePath = join(userDataPath, this.AUTH_FILE_NAME);
    
    // Get current app version from package.json
    this.currentAppVersion = app.getVersion();
    
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    try {
      if (!existsSync(this.authFilePath)) {
        console.log('No persistent auth session found, starting fresh');
        return;
      }

      const authData = JSON.parse(readFileSync(this.authFilePath, 'utf8')) as PersistentAuthData;
      const now = Date.now();

      // Check if session has expired
      if (now > authData.expiresAt) {
        console.log('Persistent auth session expired, requiring new login');
        this.clearStoredAuth();
        return;
      }

      // Check if app version has changed (force re-auth on updates)
      if (authData.appVersion !== this.currentAppVersion) {
        console.log(`App version changed from ${authData.appVersion} to ${this.currentAppVersion}, requiring new login`);
        this.clearStoredAuth();
        return;
      }

      // Check website version in background (don't block auth loading)
      this.checkWebsiteVersionUpdate(authData.websiteVersion || '1.0.0');

      // Session is valid, restore auth state
      this.authState = authData.authState;
      
      const daysRemaining = Math.ceil((authData.expiresAt - now) / (1000 * 60 * 60 * 24));
      console.log(`Restored persistent auth session, expires in ${daysRemaining} days`);
      
    } catch (error) {
      console.error('Failed to load stored auth:', error);
      this.clearStoredAuth();
    }
  }

  private saveAuthState(): void {
    try {
      if (!this.authState.isAuthenticated) {
        // Don't save unauthenticated state
        return;
      }

      const now = Date.now();
      const expiresAt = now + (this.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000); // 30 days from now

      const persistentData: PersistentAuthData = {
        authState: this.authState,
        loginTimestamp: now,
        appVersion: this.currentAppVersion,
        websiteVersion: this.currentWebsiteVersion || '1.0.0',
        expiresAt: expiresAt
      };

      writeFileSync(this.authFilePath, JSON.stringify(persistentData, null, 2), 'utf8');
      
      const expiryDate = new Date(expiresAt).toLocaleDateString();
      console.log(`Persistent auth session saved, expires on ${expiryDate}`);
      
    } catch (error) {
      console.error('Failed to save auth state:', error);
    }
  }

  private clearStoredAuth(): void {
    try {
      if (existsSync(this.authFilePath)) {
        const fs = require('fs');
        fs.unlinkSync(this.authFilePath);
        console.log('Cleared stored auth session');
      }
    } catch (error) {
      console.error('Failed to clear stored auth:', error);
    }
  }

  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated && !!this.authState.accessToken;
  }

  public getUser(): UserProfile | null {
    return this.authState.user;
  }

  public getAccessToken(): string | null {
    return this.authState.accessToken;
  }

  public async login(): Promise<boolean> {
    return new Promise((resolve) => {
      // Create auth window
      this.authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        },
        show: false
      });

      // Load auth URL
      const authUrl = `${this.AUTH_URL}?client_id=${this.CLIENT_ID}&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&response_type=code&scope=profile email`;
      
      this.authWindow.loadURL(authUrl);

      this.authWindow.once('ready-to-show', () => {
        this.authWindow?.show();
      });

      // Handle auth callback
      this.authWindow.webContents.on('will-redirect', async (event, url) => {
        if (url.startsWith(this.REDIRECT_URI)) {
          event.preventDefault();
          
          try {
            const urlObj = new URL(url);
            const code = urlObj.searchParams.get('code');
            
            if (code) {
              // Exchange code for tokens
              const success = await this.exchangeCodeForTokens(code);
              if (success) {
                // Fetch user profile
                await this.fetchUserProfile();
                resolve(true);
              } else {
                resolve(false);
              }
            } else {
              resolve(false);
            }
          } catch (error) {
            console.error('Auth callback error:', error);
            resolve(false);
          } finally {
            this.authWindow?.close();
            this.authWindow = null;
          }
        }
      });

      // Handle window close
      this.authWindow.on('closed', () => {
        this.authWindow = null;
        resolve(false);
      });
    });
  }

  private async exchangeCodeForTokens(_code: string): Promise<boolean> {
    try {
      // In production, make a request to your auth server
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock tokens (replace with actual API call)
      this.authState.accessToken = 'mock_access_token_' + Date.now();
      this.authState.refreshToken = 'mock_refresh_token_' + Date.now();
      this.authState.isAuthenticated = true;
      
      this.saveAuthState();
      return true;
    } catch (error) {
      console.error('Failed to exchange code for tokens:', error);
      return false;
    }
  }

  // Development bypass method
  public bypassLogin(): void {
    console.log('Development bypass login activated');
    this.authState.isAuthenticated = true;
    this.authState.accessToken = 'dev_bypass_token_' + Date.now();
    this.authState.refreshToken = 'dev_bypass_refresh_token_' + Date.now();
    
          // Create a mock user profile
      this.authState.user = {
        id: 'dev_user_' + Date.now(),
        email: 'dev@example.com',
        name: 'Hey there, Code Explorer! 👋',
        avatar: 'dev_avatar',
        level: 3,
        points: 250,
        totalRequests: 25,
        avatarCustomization: {
          baseAvatar: 'default',
          outfit: 'casual',
          accessories: ['glasses'],
          background: 'office_bg',
          frame: 'none'
        },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        lastLoginAt: new Date()
      };
    
    this.saveAuthState();
  }

  private async fetchUserProfile(): Promise<void> {
    try {
      // In production, make a request to your auth server
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock user profile
      this.authState.user = {
        id: 'user_' + Date.now(),
        email: 'user@example.com',
        name: 'Time to vibecode! 🚀',
        avatar: 'new_user_avatar',
        level: 1,
        points: 0,
        totalRequests: 0,
        avatarCustomization: {
          baseAvatar: 'new_user',
          outfit: 'basic',
          accessories: [],
          background: 'default',
          frame: 'none'
        },
        createdAt: new Date(),
        lastLoginAt: new Date()
      };
      
      this.saveAuthState();
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  }

  public async logout(): Promise<void> {
    this.authState = {
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null
    };
    
    // Clear persistent storage
    this.clearStoredAuth();
    
    console.log('User logged out and persistent session cleared');
    
    // In production, you'd also want to revoke tokens on your server
  }

  public async setUserAuthenticated(userData: any): Promise<void> {
    try {
      console.log('Setting user as authenticated:', userData);
      
      // Set authentication state
      this.authState.isAuthenticated = true;
      this.authState.accessToken = 'website_auth_token_' + Date.now();
      this.authState.refreshToken = 'website_refresh_token_' + Date.now();
      
      // Create user profile from website data
      this.authState.user = {
        id: 'website_user_' + Date.now(),
        email: userData.email || 'user@website.com',
        name: userData.name || 'Website User',
        avatar: 'new_user_avatar',
        level: 1,
        points: 0,
        totalRequests: 0,
        avatarCustomization: {
          baseAvatar: 'new_user',
          outfit: 'basic',
          accessories: [],
          background: 'default',
          frame: 'none'
        },
        createdAt: new Date(),
        lastLoginAt: new Date()
      };
      
      this.saveAuthState();
      console.log('User authenticated successfully via website');
    } catch (error) {
      console.error('Failed to set user authenticated:', error);
      throw error;
    }
  }

  public async refreshTokens(): Promise<boolean> {
    if (!this.authState.refreshToken) {
      return false;
    }

    try {
      // In production, make a request to your auth server
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock new tokens
      this.authState.accessToken = 'mock_access_token_' + Date.now();
      this.authState.refreshToken = 'mock_refresh_token_' + Date.now();
      
      this.saveAuthState();
      return true;
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      return false;
    }
  }

  public async addPoints(points: number): Promise<void> {
    if (!this.authState.user) return;

    this.authState.user.points += points;
    this.authState.user.totalRequests += 1;
    
    // Check if user should level up
    const newLevel = Math.floor(this.authState.user.points / 100) + 1;
    if (newLevel > this.authState.user.level) {
      this.authState.user.level = newLevel;
      // In production, you'd want to show a level up notification
    }
    
    this.saveAuthState();
  }

  public async updateAvatarCustomization(customization: Partial<AvatarCustomization>): Promise<void> {
    if (!this.authState.user) return;

    this.authState.user.avatarCustomization = {
      ...this.authState.user.avatarCustomization,
      ...customization
    };
    
    this.saveAuthState();
  }

  public async purchaseOutfit(_outfitId: string, cost: number): Promise<boolean> {
    if (!this.authState.user || this.authState.user.points < cost) {
      return false;
    }

    this.authState.user.points -= cost;
    
    // Add outfit to user's collection
    // In production, you'd want to store this in a database
    
    this.saveAuthState();
    return true;
  }

  public getSessionInfo(): { daysRemaining: number; expiresAt: Date; appVersion: string } | null {
    try {
      if (!existsSync(this.authFilePath)) {
        return null;
      }

      const authData = JSON.parse(readFileSync(this.authFilePath, 'utf8')) as PersistentAuthData;
      const now = Date.now();
      const daysRemaining = Math.ceil((authData.expiresAt - now) / (1000 * 60 * 60 * 24));

      return {
        daysRemaining: Math.max(0, daysRemaining),
        expiresAt: new Date(authData.expiresAt),
        appVersion: authData.appVersion
      };
    } catch (error) {
      console.error('Failed to get session info:', error);
      return null;
    }
  }

  public extendSession(): void {
    // Extend the session by updating the login timestamp
    if (this.authState.isAuthenticated) {
      this.saveAuthState();
      console.log('Session extended for another 30 days');
    }
  }

  public wasUserForceLoggedOut(): boolean {
    return this.wasForceLoggedOut;
  }

  public clearForceLogoutFlag(): void {
    this.wasForceLoggedOut = false;
  }

  private async checkWebsiteVersionUpdate(storedWebsiteVersion: string): Promise<void> {
    try {
      console.log('Checking for website version updates...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(this.VERSION_CHECK_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `i-cant-code/${this.currentAppVersion}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log('Website version check failed, continuing with cached version');
        return;
      }

      const versionData = await response.json() as any;
      this.currentWebsiteVersion = versionData.websiteVersion || '1.0.0';
      
      // Check if website version changed (force re-auth)
      if (storedWebsiteVersion !== this.currentWebsiteVersion) {
        console.log(`Website version changed from ${storedWebsiteVersion} to ${this.currentWebsiteVersion}, requiring new login`);
        this.wasForceLoggedOut = true; // Mark that user was forced to log out due to version change
        this.clearStoredAuth();
        
        // Reset auth state to force re-login
        this.authState = {
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null
        };
        return;
      }

      console.log(`Website version check passed: ${this.currentWebsiteVersion}`);
      
    } catch (error) {
      console.error('Website version check failed:', error);
      // Don't force logout on network errors, just continue
    }
  }

  public async checkForUpdates(): Promise<VersionInfo> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(this.VERSION_CHECK_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `i-cant-code/${this.currentAppVersion}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Version check failed: ${response.status}`);
      }

      const versionData = await response.json() as any;
      const latestAppVersion = versionData.appVersion || this.currentAppVersion;
      const latestWebsiteVersion = versionData.websiteVersion || '1.0.0';
      
      const hasUpdate = this.compareVersions(latestAppVersion, this.currentAppVersion) > 0;
      
      return {
        appVersion: this.currentAppVersion,
        websiteVersion: this.currentWebsiteVersion || latestWebsiteVersion,
        hasUpdate,
        updateAvailable: hasUpdate ? {
          version: latestAppVersion,
          releaseNotes: versionData.releaseNotes || 'Bug fixes and improvements',
          downloadUrl: versionData.downloadUrl || 'https://icantcode.app/download'
        } : undefined
      };
      
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return {
        appVersion: this.currentAppVersion,
        websiteVersion: this.currentWebsiteVersion || '1.0.0',
        hasUpdate: false
      };
    }
  }

  private compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1parts.length, v2parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    
    return 0;
  }

  public async forceVersionCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(this.VERSION_CHECK_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `i-cant-code/${this.currentAppVersion}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      const versionData = await response.json() as any;
      const latestWebsiteVersion = versionData.websiteVersion || '1.0.0';
      
      // Update current website version
      this.currentWebsiteVersion = latestWebsiteVersion;
      
      // Check if we need to force re-auth
      if (existsSync(this.authFilePath)) {
        const authData = JSON.parse(readFileSync(this.authFilePath, 'utf8')) as PersistentAuthData;
        const storedWebsiteVersion = authData.websiteVersion || '1.0.0';
        
        if (storedWebsiteVersion !== latestWebsiteVersion) {
          console.log(`Website version mismatch detected: stored=${storedWebsiteVersion}, latest=${latestWebsiteVersion}`);
          this.wasForceLoggedOut = true; // Mark that user was forced to log out due to version change
          this.clearStoredAuth();
          
          // Reset auth state to force re-login
          this.authState = {
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null
          };
          return true; // Indicates re-auth is required
        }
      }
      
      return false; // No re-auth required
      
    } catch (error) {
      console.error('Force version check failed:', error);
      return false;
    }
  }
}

export const authService = new AuthService();
