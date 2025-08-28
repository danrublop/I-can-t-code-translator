import { clipboard } from 'electron';
import { AnalyticsConfigManager } from '../config/analytics.config';

export interface AnalyticsEvent {
  eventType: 'app_launched' | 'explanation_requested' | 'explanation_completed' | 'error_occurred';
  timestamp: string;
  sessionId: string;
  data: any;
  systemInfo: {
    platform: string;
    arch: string;
    nodeVersion: string;
    electronVersion: string;
    appVersion: string;
  };
}

export interface UserMetrics {
  totalExplanations: number;
  totalErrors: number;
  averageResponseTime: number;
  favoriteLanguages: string[];
  lastActive: string;
}

class AnalyticsService {
  private sessionId: string;
  private isOnline: boolean = true;
  private pendingEvents: AnalyticsEvent[] = [];
  private configManager: AnalyticsConfigManager;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.configManager = AnalyticsConfigManager.getInstance();
    this.loadMetrics();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get system information
   */
  private getSystemInfo(): AnalyticsEvent['systemInfo'] {
    if (!this.configManager.shouldCollectSystemInfo()) {
      return {
        platform: 'unknown',
        arch: 'unknown',
        nodeVersion: 'unknown',
        electronVersion: 'unknown',
        appVersion: '1.0.0'
      };
    }

    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      appVersion: '1.0.0'
    };
  }

  /**
   * Track app launch
   */
  trackAppLaunch(): void {
    const event: AnalyticsEvent = {
      eventType: 'app_launched',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      data: {
        launchTime: Date.now(),
        clipboardContent: clipboard.readText().substring(0, 100) // First 100 chars for context
      },
      systemInfo: this.getSystemInfo()
    };

    this.sendEvent(event);
  }

  /**
   * Track explanation request
   */
  trackExplanationRequest(language: string, codeLength: number): void {
    const event: AnalyticsEvent = {
      eventType: 'explanation_requested',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      data: {
        language,
        codeLength,
        requestTime: Date.now()
      },
      systemInfo: this.getSystemInfo()
    };

    this.sendEvent(event);
  }

  /**
   * Track explanation completion
   */
  trackExplanationCompleted(language: string, codeLength: number, responseTime: number, success: boolean): void {
    const event: AnalyticsEvent = {
      eventType: 'explanation_completed',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      data: {
        language,
        codeLength,
        responseTime,
        success,
        completionTime: Date.now()
      },
      systemInfo: this.getSystemInfo()
    };

    this.sendEvent(event);
    this.updateMetrics(language, responseTime, success);
  }

  /**
   * Track error occurrence
   */
  trackError(errorType: string, errorMessage: string, context?: any): void {
    const event: AnalyticsEvent = {
      eventType: 'error_occurred',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      data: {
        errorType,
        errorMessage,
        context,
        errorTime: Date.now()
      },
      systemInfo: this.getSystemInfo()
    };

    this.sendEvent(event);
    this.updateMetrics('error', 0, false);
  }

  /**
   * Send analytics event to server
   */
  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    // Check if analytics is enabled
    if (!this.configManager.isEnabled()) {
      console.log('Analytics disabled, skipping event:', event.eventType);
      return;
    }

    if (!this.isOnline) {
      this.pendingEvents.push(event);
      return;
    }

    try {
      const response = await fetch(this.configManager.getEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`Analytics request failed: ${response.status}`);
      }

      console.log('Analytics event sent successfully:', event.eventType);
    } catch (error) {
      console.error('Failed to send analytics event:', error);
      this.pendingEvents.push(event);
    }
  }

  /**
   * Update local metrics
   */
  private updateMetrics(language: string, responseTime: number, success: boolean): void {
    try {
      const metrics = this.loadMetrics();
      
      if (success) {
        metrics.totalExplanations += 1;
        
        // Update average response time
        const totalTime = metrics.averageResponseTime * (metrics.totalExplanations - 1) + responseTime;
        metrics.averageResponseTime = totalTime / metrics.totalExplanations;
        
        // Update favorite languages
        if (!metrics.favoriteLanguages.includes(language)) {
          metrics.favoriteLanguages.push(language);
        }
      } else {
        metrics.totalErrors += 1;
      }
      
      metrics.lastActive = new Date().toISOString();
      
      this.saveMetrics(metrics);
    } catch (error) {
      console.error('Failed to update metrics:', error);
    }
  }

  /**
   * Load metrics from file
   */
  private loadMetrics(): UserMetrics {
    try {
      // For now, return default metrics
      // In a real implementation, you'd load from a file
      return {
        totalExplanations: 0,
        totalErrors: 0,
        averageResponseTime: 0,
        favoriteLanguages: [],
        lastActive: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to load metrics:', error);
      return {
        totalExplanations: 0,
        totalErrors: 0,
        averageResponseTime: 0,
        favoriteLanguages: [],
        lastActive: new Date().toISOString()
      };
    }
  }

  /**
   * Save metrics to file
   */
  private saveMetrics(metrics: UserMetrics): void {
    try {
      // For now, just log the metrics
      // In a real implementation, you'd save to a file
      console.log('Metrics updated:', metrics);
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): UserMetrics {
    return this.loadMetrics();
  }

  /**
   * Flush pending events (when back online)
   */
  async flushPendingEvents(): Promise<void> {
    if (this.pendingEvents.length === 0) return;

    console.log(`Flushing ${this.pendingEvents.length} pending analytics events...`);
    
    for (const event of this.pendingEvents) {
      await this.sendEvent(event);
    }

    this.pendingEvents = [];
    console.log('Pending analytics events flushed successfully');
  }

  /**
   * Set online status
   */
  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
    if (online) {
      this.flushPendingEvents();
    }
  }
}

export const analyticsService = new AnalyticsService();
