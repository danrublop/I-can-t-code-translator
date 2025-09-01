# Release Notes - v1.0.3

## 🐛 Bug Fixes

### Fixed White Blank Window Flash
- **Issue**: Users experienced a brief white blank window appearing in the center of the screen for a few seconds after explanation generation completed
- **Cause**: Achievement notification windows were not using proper anti-flash techniques
- **Fix**: Added `show: false` and `ready-to-show` event handling to notification windows to prevent white flash before content loads

## 📦 Distribution Updates

### Homebrew Formula Updated
- Updated Homebrew cask to version 1.0.3
- Updated SHA256 hash for new DMG file
- Formula available at `homebrew/i-cant-code.rb`

### Download Files Available
- **macOS Intel (x64)**: `i cant code-1.0.3.dmg` (104.7 MB)
- **macOS Apple Silicon (ARM64)**: `i cant code-1.0.3-arm64.dmg` (99.6 MB)
- **macOS ZIP Intel**: `i cant code-1.0.3-mac.zip` (101.4 MB)
- **macOS ZIP ARM64**: `i cant code-1.0.3-arm64-mac.zip` (96.2 MB)

## 🔧 Technical Details

### Changes Made
- Modified `showNotification()` method in `src/main/main.ts`
- Added proper window flash prevention for all notification windows
- Updated version number in `package.json`
- Added `website/` directory to `.gitignore` to keep website files separate

### File Hashes
- **DMG (Intel)**: `93ab0dff5c4c412697da8b22e93fcce8efb5b5c4846ba422a999c07f0aae2735`
- **DMG (ARM64)**: Available in blockmap files

## 📋 Installation

### Via Homebrew (Recommended)
```bash
brew install --cask i-cant-code
```

### Direct Download
Download the appropriate DMG file for your Mac architecture from the releases page.

## 🚀 What's Next

This is a maintenance release focused on improving user experience. The core functionality remains unchanged, with all AI explanation features working as expected.

---

**Full Changelog**: https://github.com/danrublop/I-can-t-code-translator/compare/v1.0.2...v1.0.3
