export interface AnalyticsConfig {
  enabled: boolean;
  endpoint: string;
  batchSize: number;
  flushInterval: number;
  privacyLevel: 'minimal' | 'standard' | 'detailed';
  collectSystemInfo: boolean;
  collectUsageData: boolean;
  collectErrorData: boolean;
}

export const defaultAnalyticsConfig: AnalyticsConfig = {
  enabled: true,
  endpoint: 'https://api.icantcode.app/analytics',
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  privacyLevel: 'standard',
  collectSystemInfo: true,
  collectUsageData: true,
  collectErrorData: true
};

export class AnalyticsConfigManager {
  private static instance: AnalyticsConfigManager;
  private config: AnalyticsConfig;

  private constructor() {
    this.config = { ...defaultAnalyticsConfig };
    this.loadConfig();
  }

  static getInstance(): AnalyticsConfigManager {
    if (!AnalyticsConfigManager.instance) {
      AnalyticsConfigManager.instance = new AnalyticsConfigManager();
    }
    return AnalyticsConfigManager.instance;
  }

  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getEndpoint(): string {
    return this.config.endpoint;
  }

  getPrivacyLevel(): string {
    return this.config.privacyLevel;
  }

  shouldCollectSystemInfo(): boolean {
    return this.config.enabled && this.config.collectSystemInfo;
  }

  shouldCollectUsageData(): boolean {
    return this.config.enabled && this.config.collectUsageData;
  }

  shouldCollectErrorData(): boolean {
    return this.config.enabled && this.config.collectErrorData;
  }

  private loadConfig(): void {
    try {
      // In a real implementation, you'd load from a config file
      // For now, we'll use the default config
      console.log('Analytics config loaded:', this.config);
    } catch (error) {
      console.error('Failed to load analytics config, using defaults:', error);
    }
  }

  private saveConfig(): void {
    try {
      // In a real implementation, you'd save to a config file
      console.log('Analytics config saved:', this.config);
    } catch (error) {
      console.error('Failed to save analytics config:', error);
    }
  }
}

