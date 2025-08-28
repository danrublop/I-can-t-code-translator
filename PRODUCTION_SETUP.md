# Production Setup Guide for i cant code

This guide explains how to set up the production-ready authentication system with gamification features.

## Overview

The app now includes:
- **Authentication System**: Users must log in to use the app
- **Gamification**: Points, levels, achievements, and avatar customization
- **Profile Management**: Interactive user profiles with progression tracking
- **Social Features**: Avatar sharing and social media integration

## Authentication Setup

### 1. Configure Auth Service

Update `src/main/services/auth.service.ts` with your production values:

```typescript
private readonly AUTH_URL = 'https://your-actual-auth-website.com/auth';
private readonly CLIENT_ID = 'your-actual-client-id';
private readonly REDIRECT_URI = 'https://your-actual-domain.com/auth/callback';
```

### 2. Set Up Your Auth Server

You'll need to implement an OAuth 2.0 server that handles:

- User registration and login
- OAuth code exchange for tokens
- User profile management
- Token refresh and validation

**Recommended OAuth Flow:**
1. User clicks login in the app
2. App opens auth window to your website
3. User logs in on your website
4. Website redirects back to app with authorization code
5. App exchanges code for access/refresh tokens
6. App stores tokens securely and fetches user profile

### 3. Secure Token Storage

For production, replace the simple localStorage approach with secure storage:

```typescript
// Install keytar for secure credential storage
npm install keytar

// Update auth.service.ts to use keytar
import * as keytar from 'keytar';

private async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await keytar.setPassword('i-cant-code', 'access-token', accessToken);
  await keytar.setPassword('i-cant-code', 'refresh-token', refreshToken);
}

private async getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const accessToken = await keytar.getPassword('i-cant-code', 'access-token');
  const refreshToken = await keytar.getPassword('i-cant-code', 'refresh-token');
  return { accessToken, refreshToken };
}
```

## Gamification Configuration

### 1. Customize Achievement System

Update `src/main/services/gamification.service.ts` to add your own achievements:

```typescript
private achievements: Achievement[] = [
  {
    id: 'your_custom_achievement',
    name: 'Custom Achievement',
    description: 'Description of your achievement',
    icon: '🏆',
    points: 100,
    unlocked: false,
    category: 'special'
  }
  // Add more achievements...
];
```

### 2. Configure Avatar System

Customize the avatar levels and outfit items:

```typescript
private avatarLevels: AvatarLevel[] = [
  {
    level: 1,
    minPoints: 0,
    maxPoints: 99,
    title: 'Your Custom Title',
    description: 'Your custom description',
    avatarUnlock: 'custom_avatar_1',
    color: '#your-color'
  }
  // Add more levels...
];
```

### 3. Set Up Avatar Images

Replace the emoji-based avatars with actual images:

1. Create avatar image assets
2. Store them in a CDN or your server
3. Update the Profile component to load real images
4. Implement image caching for performance

## Database Integration

### 1. User Data Storage

For production, you'll want to store user data in a database:

```typescript
// Example with a database service
interface DatabaseService {
  saveUser(user: UserProfile): Promise<void>;
  getUser(userId: string): Promise<UserProfile | null>;
  updateUser(userId: string, updates: Partial<UserProfile>): Promise<void>;
  saveAchievement(userId: string, achievement: Achievement): Promise<void>;
  getUserAchievements(userId: string): Promise<Achievement[]>;
}
```

### 2. Analytics and Metrics

Track user engagement and app usage:

```typescript
// Enhanced analytics service
class AnalyticsService {
  trackUserLogin(userId: string, method: string): void;
  trackAchievementUnlocked(userId: string, achievementId: string): void;
  trackAvatarCustomization(userId: string, itemId: string): void;
  trackPointsEarned(userId: string, points: number, source: string): void;
}
```

## Social Media Integration

### 1. Implement Social Sharing

Update the Profile component to integrate with actual social media APIs:

```typescript
const handleSocialShare = async () => {
  const shareData = {
    title: 'My Coding Avatar',
    text: `Check out my level ${user.level} coding avatar!`,
    url: 'https://your-app-website.com/share'
  };

  if (navigator.share) {
    await navigator.share(shareData);
  } else {
    // Fallback to specific social media buttons
    showSocialMediaButtons();
  }
};
```

### 2. Social Media Buttons

Add buttons for specific platforms:

```typescript
const SocialMediaButtons = () => (
  <div className="social-buttons">
    <button onClick={() => shareToTwitter()}>Twitter</button>
    <button onClick={() => shareToLinkedIn()}>LinkedIn</button>
    <button onClick={() => shareToDiscord()}>Discord</button>
  </div>
);
```

## Security Considerations

### 1. Token Validation

Implement proper token validation on your server:

```typescript
// Validate tokens on each request
const validateToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch('https://your-auth-server.com/validate', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};
```

### 2. Rate Limiting

Implement rate limiting for API endpoints:

```typescript
// Example rate limiting
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (userId: string, limit: number, windowMs: number): boolean => {
  const now = Date.now();
  const userLimit = rateLimiter.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimiter.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= limit) {
    return false;
  }
  
  userLimit.count++;
  return true;
};
```

### 3. Input Validation

Validate all user inputs:

```typescript
const validateUserInput = (input: any): boolean => {
  // Validate email format
  if (input.email && !isValidEmail(input.email)) return false;
  
  // Validate name length
  if (input.name && (input.name.length < 2 || input.name.length > 50)) return false;
  
  // Validate points (must be positive)
  if (input.points && input.points < 0) return false;
  
  return true;
};
```

## Deployment

### 1. Environment Variables

Use environment variables for sensitive configuration:

```bash
# .env file
AUTH_URL=https://your-auth-server.com
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
DATABASE_URL=your-database-connection-string
```

### 2. Build Configuration

Update your build scripts for production:

```json
{
  "scripts": {
    "build:prod": "NODE_ENV=production npm run build:main && npm run build:renderer:prod",
    "package:prod": "npm run build:prod && electron-builder --publish=always"
  }
}
```

### 3. Code Signing

For macOS and Windows distribution, implement code signing:

```json
{
  "build": {
    "mac": {
      "identity": "Your Developer ID",
      "hardenedRuntime": true
    },
    "win": {
      "certificateFile": "path/to/certificate.p12",
      "certificatePassword": "your-password"
    }
  }
}
```

## Testing

### 1. Authentication Testing

Test the authentication flow:

```typescript
// Test authentication states
describe('Authentication', () => {
  test('should require login for new users', () => {});
  test('should remember login state', () => {});
  test('should handle token refresh', () => {});
  test('should logout properly', () => {});
});
```

### 2. Gamification Testing

Test the gamification features:

```typescript
describe('Gamification', () => {
  test('should award points for requests', () => {});
  test('should unlock achievements', () => {});
  test('should level up users', () => {});
  test('should handle avatar customization', () => {});
});
```

## Monitoring and Analytics

### 1. User Metrics

Track key user engagement metrics:

- Daily/Monthly Active Users
- Feature usage rates
- Achievement unlock rates
- User retention rates

### 2. Performance Monitoring

Monitor app performance:

- Response times for AI explanations
- Memory usage
- CPU usage
- Crash rates

### 3. Error Tracking

Implement comprehensive error tracking:

```typescript
// Enhanced error tracking
const trackError = (error: Error, context: any) => {
  // Log to your error tracking service
  errorTrackingService.captureException(error, {
    extra: context,
    tags: { component: 'main-process' }
  });
  
  // Also log locally for debugging
  console.error('Error occurred:', error, context);
};
```

## Support and Documentation

### 1. User Documentation

Create user guides for:

- How to log in
- How to earn points
- How to customize avatars
- How to share achievements

### 2. Developer Documentation

Document the codebase for future developers:

- API endpoints
- Data models
- Authentication flow
- Gamification rules

## Conclusion

This production setup provides a solid foundation for a professional, gamified coding assistance app. The authentication system ensures only authorized users can access the app, while the gamification features encourage engagement and learning.

Remember to:
- Test thoroughly before deployment
- Monitor performance and user engagement
- Keep security measures up to date
- Gather user feedback for improvements
- Plan for scalability as your user base grows

For additional help or questions, refer to the main README.md or create an issue in the repository.
