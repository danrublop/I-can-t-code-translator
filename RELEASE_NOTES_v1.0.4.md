# Release Notes - Version 1.0.4

## Bug Fixes

### Fixed White Blank Window Issue
- **Issue**: A white blank window would briefly appear in the center of the screen after explanation generation completed
- **Root Cause**: Achievement notification windows were being created without proper white flash prevention
- **Solution**: Updated the `showNotification` method to use `show: false` and `ready-to-show` event handler
- **Impact**: Eliminates the visual glitch that occurred when users received achievement notifications

## Technical Details

### Changes Made
- Modified `src/main/main.ts` in the `showNotification` method
- Added `show: false` property to notification window configuration
- Added `ready-to-show` event handler to prevent white flash
- Ensures notification windows only appear after content is fully loaded

### Files Modified
- `src/main/main.ts` - Fixed notification window creation
- `package.json` - Updated version to 1.0.4
- `homebrew/i-cant-code.rb` - Updated version to 1.0.4

## Installation

### For Homebrew Users
```bash
brew update
brew upgrade i-cant-code
```

### For Direct Download Users
Download the latest version from the website or GitHub releases.

## Compatibility
- macOS 10.15+ (Catalina and later)
- Requires Ollama to be installed and running
- Compatible with existing saved explanations and user data

## Previous Versions
- v1.0.3 - Previous release
- v1.0.2 - Initial stable release
- v1.0.1 - Beta release
- v1.0.0 - Alpha release
