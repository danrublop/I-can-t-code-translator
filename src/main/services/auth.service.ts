import { BrowserWindow } from 'electron';

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

  constructor() {
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    // In production, you'd want to use secure storage like keytar
    // For now, we'll use a simple approach
    try {
      // localStorage is not available in main process, so we'll start fresh
      console.log('Starting with fresh auth state in main process');
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    }
  }

  private saveAuthState(): void {
    try {
      // localStorage is not available in main process, so we'll just log
      console.log('Auth state would be saved in production');
    } catch (error) {
      console.error('Failed to save auth state:', error);
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
    
    this.saveAuthState();
    
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
}

export const authService = new AuthService();
