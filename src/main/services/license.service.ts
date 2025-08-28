import { app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

export interface LicenseInfo {
  type: 'free' | 'trial' | 'paid';
  status: 'active' | 'expired' | 'revoked';
  trialStartDate?: Date | null;
  trialEndDate?: Date | null;
  subscriptionStartDate?: Date | null;
  subscriptionEndDate?: Date | null;
  features: string[];
  createdAt: Date;
  lastUpdated: Date;
}

export class LicenseService {
  private licenseInfo!: LicenseInfo;
  private configPath: string;
  
  constructor() {
    this.configPath = join(app.getPath('userData'), 'license.json');
    this.loadLicense();
  }

  private loadLicense(): void {
    try {
      if (existsSync(this.configPath)) {
        const data = readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(data);
        
        // Convert date strings back to Date objects
        this.licenseInfo = {
          ...parsed,
          trialStartDate: parsed.trialStartDate ? new Date(parsed.trialStartDate) : null,
          trialEndDate: parsed.trialEndDate ? new Date(parsed.trialEndDate) : null,
          subscriptionStartDate: parsed.subscriptionStartDate ? new Date(parsed.subscriptionStartDate) : null,
          subscriptionEndDate: parsed.subscriptionEndDate ? new Date(parsed.subscriptionEndDate) : null,
          createdAt: new Date(parsed.createdAt),
          lastUpdated: new Date(parsed.lastUpdated)
        };
      } else {
        // Default to free license
        this.licenseInfo = this.createFreeLicense();
        this.saveLicense();
      }
    } catch (error) {
      console.error('Error loading license:', error);
      this.licenseInfo = this.createFreeLicense();
    }
  }

  private createFreeLicense(): LicenseInfo {
    const now = new Date();
    return {
      type: 'free',
      status: 'active',
      trialStartDate: null,
      trialEndDate: null,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      features: [
        'basic_explanation', 
        'code_analysis', 
        'notebook', 
        'advanced_features',
        'premium_support'
      ], // All features free for now
      createdAt: now,
      lastUpdated: now
    };
  }

  public getLicenseInfo(): LicenseInfo {
    return { ...this.licenseInfo };
  }

  public isFeatureAvailable(feature: string): boolean {
    return this.licenseInfo.features.includes(feature);
  }

  public canUseApp(): boolean {
    return this.licenseInfo.status === 'active';
  }

  public getRemainingTrialDays(): number | null {
    if (this.licenseInfo.type !== 'trial' || !this.licenseInfo.trialEndDate) {
      return null;
    }
    
    const now = new Date();
    const end = new Date(this.licenseInfo.trialEndDate);
    const diff = end.getTime() - now.getTime();
    
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  public isTrialExpired(): boolean {
    if (this.licenseInfo.type !== 'trial') return false;
    
    const daysLeft = this.getRemainingTrialDays();
    return daysLeft !== null && daysLeft <= 0;
  }

  // Future methods for when you want to implement charging
  public startTrial(): void {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days
    
    this.licenseInfo = {
      ...this.licenseInfo,
      type: 'trial',
      status: 'active',
      trialStartDate: now,
      trialEndDate: trialEnd,
      lastUpdated: now
    };
    
    this.saveLicense();
  }

  public activateSubscription(): void {
    const now = new Date();
    const subscriptionEnd = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
    
    this.licenseInfo = {
      ...this.licenseInfo,
      type: 'paid',
      status: 'active',
      subscriptionStartDate: now,
      subscriptionEndDate: subscriptionEnd,
      lastUpdated: now
    };
    
    this.saveLicense();
  }

  public revokeLicense(): void {
    this.licenseInfo.status = 'revoked';
    this.licenseInfo.lastUpdated = new Date();
    this.saveLicense();
  }

  private saveLicense(): void {
    try {
      this.licenseInfo.lastUpdated = new Date();
      writeFileSync(this.configPath, JSON.stringify(this.licenseInfo, null, 2));
    } catch (error) {
      console.error('Error saving license:', error);
    }
  }

  // Method to easily transition from free to trial mode
  public enableTrialMode(): void {
    if (this.licenseInfo.type === 'free') {
      this.startTrial();
    }
  }

  // Method to check if app should be in free mode
  public isInFreeMode(): boolean {
    return this.licenseInfo.type === 'free';
  }
}
