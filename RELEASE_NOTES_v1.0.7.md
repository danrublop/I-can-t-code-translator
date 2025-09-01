# Release Notes - Version 1.0.7

## User Experience Improvements

### Simplified Installation Process
- **Issue**: Previous versions had complex security workarounds requiring terminal commands
- **Solution**: Reverted to standard macOS app behavior with simple right-click "Open" method
- **Impact**: Much more user-friendly installation process

### Fixed White Blank Window Issue
- **Issue**: White blank window would briefly appear after explanation generation completed
- **Root Cause**: Achievement notification windows were being created without proper white flash prevention
- **Solution**: Updated the `showNotification` method to use `show: false` and `ready-to-show` event handler
- **Impact**: Eliminates the visual glitch that occurred when users received achievement notifications

## Technical Details

### Changes Made
- Modified `src/main/main.ts` in the `showNotification` method
- Added `show: false` property to notification window configuration
- Added `ready-to-show` event handler to prevent white flash
- Ensures notification windows only appear after content is fully loaded
- Reverted build configuration to standard macOS app behavior

### Files Modified
- `src/main/main.ts` - Fixed notification window creation
- `package.json` - Updated version to 1.0.7
- `homebrew/i-cant-code.rb` - Updated version to 1.0.7

## Installation

### For Homebrew Users
```bash
brew update
brew upgrade i-cant-code
```

### For Direct Download Users
Download the latest version from the website or GitHub releases.

## User-Friendly Installation Steps

### macOS Installation (Simple Method)
1. **Download the DMG file** from the website
2. **Double-click the DMG file** to mount it
3. **Drag the app to Applications folder**
4. **Right-click the app** in Applications and select "Open"
5. **Click "Open"** in the security dialog that appears
6. **App runs normally** - no terminal commands needed!

### Why This Works Better
- Standard macOS app behavior (like VS Code, Docker, etc.)
- No complex terminal commands or scripts required
- Simple right-click "Open" method that users expect
- Security dialog is normal for apps not distributed through App Store

## Compatibility
- macOS 10.15+ (Catalina and later)
- Requires Ollama to be installed and running
- Compatible with existing saved explanations and user data

## Previous Versions
- v1.0.6 - Previous release with complex security fixes
- v1.0.5 - Previous release
- v1.0.4 - Bug fix release
- v1.0.3 - Previous release
- v1.0.2 - Initial stable release
- v1.0.1 - Beta release
- v1.0.0 - Alpha release
