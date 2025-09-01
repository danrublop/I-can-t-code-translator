# GitHub Release Setup Guide - v1.0.7

## 🎯 Overview
This guide will help you create a GitHub Release for version 1.0.7 with all platform builds.

## 📁 Files to Upload

### macOS Builds
- **Universal DMG** (170MB): `build/i cant code-1.0.7-universal.dmg`
  - Works on both Intel and Apple Silicon Macs
  - Recommended for most users
  
- **Intel DMG** (100MB): `build/i cant code-1.0.7.dmg`
  - Intel Macs only
  
- **ARM64 DMG** (95MB): `build/i cant code-1.0.7-arm64.dmg`
  - Apple Silicon Macs only

### Windows Builds
- **Portable EXE** (81MB): `build/i cant code 1.0.7.exe`
  - No installation required, just run the file
  
- **Setup EXE** (81MB): `build/i cant code Setup 1.0.7.exe`
  - Full installer with desktop shortcuts

## 🚀 Step-by-Step Instructions

### 1. Go to GitHub Releases
Visit: https://github.com/danrublop/I-can-t-code-translator/releases

### 2. Create New Release
1. Click **"Create a new release"** button
2. Click **"Choose a tag"** and select **"v1.0.7"**
3. Click **"Create new tag: v1.0.7"**

### 3. Release Details
- **Release title**: `I Can't Code v1.0.7`
- **Description**:
```markdown
## 🎉 I Can't Code v1.0.7

### ✨ What's New
- Enhanced code explanation capabilities
- Improved UI/UX
- Better performance and stability
- Cross-platform support

### 📦 Downloads

#### macOS
- **Universal** (Intel + Apple Silicon): `i cant code-1.0.7-universal.dmg`
- **Intel only**: `i cant code-1.0.7.dmg`
- **Apple Silicon only**: `i cant code-1.0.7-arm64.dmg`

#### Windows
- **Portable**: `i cant code 1.0.7.exe`
- **Installer**: `i cant code Setup 1.0.7.exe`

### 🛠️ Installation
1. Download the appropriate file for your platform
2. For macOS: Open the DMG and drag to Applications
3. For Windows: Run the EXE file or use the installer

### 🐛 Bug Reports
Please report any issues on the GitHub repository.
```

### 4. Upload Files
Drag and drop these files from your `build/` directory:

**macOS:**
- `i cant code-1.0.7-universal.dmg`
- `i cant code-1.0.7.dmg`
- `i cant code-1.0.7-arm64.dmg`

**Windows:**
- `i cant code 1.0.7.exe`
- `i cant code Setup 1.0.7.exe`

### 5. Publish Release
1. Click **"Publish release"**
2. Your files will be available for download

## 🔗 Download URLs
After publishing, your files will be available at:
```
https://github.com/danrublop/I-can-t-code-translator/releases/download/v1.0.7/[filename]
```

## 📝 Next Steps
1. Update your website download links to point to GitHub Releases
2. Test all download links
3. Share the release with your users

## 💡 Tips
- The universal DMG is recommended for macOS users
- Windows users can choose between portable (no install) or setup (full install)
- All files are under GitHub's 2GB limit for releases
