# 📊 Analytics & Data Collection - "i cant code"

## 🔍 Overview

The "i cant code" application includes comprehensive analytics and data collection to help improve the user experience and understand how the application is being used. This document explains what data is collected, how it's used, and how users can control it.

## 📈 What Data We Collect

### 🚀 Application Usage
- **App Launches**: When the application starts
- **Session Data**: How long users stay in the app
- **Feature Usage**: Which features are used most often
- **Error Tracking**: What goes wrong and when

### 💻 Code Analysis
- **Language Detection**: What programming languages users work with
- **Code Length**: Size of code snippets being explained
- **Response Times**: How fast AI explanations are generated
- **Success Rates**: How often explanations are successful

### 🏗️ System Information (Configurable)
- **Platform**: Operating system (Windows, macOS, Linux)
- **Architecture**: CPU architecture (x64, ARM64)
- **App Version**: Current version of the application
- **Performance**: Memory usage and response times

### 👤 User Preferences (Optional)
- **Coding Level**: Self-reported skill level
- **Language Preferences**: Favorite programming languages
- **Usage Patterns**: How often and when the app is used

## 🛡️ Privacy & Control

### 🔒 Privacy Levels

#### Minimal
- Only basic app usage statistics
- No system information
- No detailed user data
- Anonymous tracking only

#### Standard (Default)
- App usage and performance metrics
- Basic system information
- Anonymous user behavior patterns
- No personally identifiable information

#### Detailed
- Comprehensive usage analytics
- Full system information
- Detailed performance metrics
- User preference tracking

### ⚙️ Configuration Options

Users can control data collection through:

```typescript
// Example configuration
{
  enabled: true,                    // Enable/disable analytics
  privacyLevel: 'standard',         // Privacy level
  collectSystemInfo: true,          // System information
  collectUsageData: true,           // Usage patterns
  collectErrorData: true,           // Error tracking
  endpoint: 'https://your-api.com'  // Custom endpoint
}
```

## 📡 Data Transmission

### 🌐 Online Mode
- Data is sent immediately to analytics server
- Real-time tracking and monitoring
- Automatic retry on failure

### 📱 Offline Mode
- Data is stored locally until connection restored
- Automatic sync when back online
- No data loss during offline periods

### 🔄 Batch Processing
- Events are batched for efficiency
- Configurable batch sizes and intervals
- Reduces server load and improves performance

## 🎯 Use Cases

### 🚀 For Developers
- **Performance Monitoring**: Track app responsiveness
- **Error Detection**: Identify and fix bugs quickly
- **Feature Usage**: Understand what users need most
- **User Experience**: Improve interface and workflows

### 📊 For Users
- **Usage Insights**: See your own usage patterns
- **Performance**: Monitor app performance
- **Customization**: Tailor the app to your needs
- **Feedback**: Help improve the application

## 🔧 Technical Implementation

### 📁 File Structure
```
src/main/services/
├── analytics.service.ts      # Main analytics service
├── code-analysis.service.ts  # Code language detection
└── explanation-storage.service.ts # User data storage

src/main/config/
└── analytics.config.ts       # Configuration management

src/renderer/services/
└── onboarding.service.ts     # User onboarding & preferences
```

### 🔌 API Endpoints
- **Analytics**: `POST /analytics` - Send analytics events
- **User Data**: `GET /user/profile` - Retrieve user profile
- **Metrics**: `GET /metrics` - Get usage statistics

### 💾 Data Storage
- **Local Storage**: User preferences and settings
- **Session Storage**: Temporary session data
- **File System**: Persistent metrics and logs
- **Cloud Storage**: Aggregated analytics data

## 🚫 Disabling Analytics

### Method 1: Configuration File
```json
{
  "analytics": {
    "enabled": false
  }
}
```

### Method 2: Environment Variable
```bash
export ICANTCODE_ANALYTICS_DISABLED=true
```

### Method 3: Runtime Configuration
```typescript
import { AnalyticsConfigManager } from './config/analytics.config';

const config = AnalyticsConfigManager.getInstance();
config.updateConfig({ enabled: false });
```

## 📋 Data Export & Deletion

### 📤 Export Your Data
```typescript
// Export all collected data
const userData = onboardingService.exportUserData();
console.log(userData);
```

### 🗑️ Delete Your Data
```typescript
// Clear all user data
onboardingService.clearAllUserData();
```

### 📊 Analytics Summary
```typescript
// Get usage summary
const summary = onboardingService.getAnalyticsSummary();
console.log(summary);
```

## 🔐 Security & Compliance

### 🔒 Data Protection
- **Encryption**: All data is encrypted in transit
- **Authentication**: Secure API endpoints
- **Authorization**: Role-based access control
- **Audit Logs**: Complete audit trail

### 📜 Compliance
- **GDPR**: Right to access, rectification, and erasure
- **CCPA**: California Consumer Privacy Act compliance
- **SOC 2**: Security and privacy standards
- **ISO 27001**: Information security management

## 📞 Support & Questions

### 🤝 Getting Help
- **Documentation**: Check this README first
- **Issues**: Report problems on GitHub
- **Email**: Contact support team
- **Community**: Join our Discord server

### 🔧 Technical Support
- **Configuration**: Help with setup and customization
- **Troubleshooting**: Debug analytics issues
- **Integration**: Custom analytics endpoints
- **Performance**: Optimize data collection

## 📚 Additional Resources

- [Privacy Policy](https://icantcode.app/privacy)
- [Terms of Service](https://icantcode.app/terms)
- [API Documentation](https://api.icantcode.app/docs)
- [Community Guidelines](https://icantcode.app/community)

---

**Last Updated**: August 2024  
**Version**: 1.0.0  
**Contact**: analytics@icantcode.app

