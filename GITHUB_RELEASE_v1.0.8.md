# GitHub Release Setup Guide - v1.0.8

## 🎯 Overview
This guide will help you create a GitHub Release for version 1.0.8 with the production domain updates.

## 🆕 What's New in v1.0.8

### ✨ Key Changes:
- **Production Domain Integration**: App now connects to `https://i-cant-code.vercel.app`
- **Updated Authentication**: Auth flow works with production website
- **Website Integration**: All app links point to the live website
- **Improved User Experience**: Seamless connection between app and website

### 🔧 Technical Updates:
- Updated `src/main/config/website.ts` to use production domain
- Updated `src/main/services/auth.service.ts` for production auth
- Updated `website/config/website.ts` for production URLs
- All endpoints now point to `https://i-cant-code.vercel.app`

## 📁 Files to Upload

### macOS Builds
- **Universal DMG** (170MB): `build/i cant code-1.0.8-universal.dmg`
  - Works on both Intel and Apple Silicon Macs
  - Recommended for most users

### Windows Builds
- **Portable EXE** (81MB): `build/i cant code 1.0.8.exe`
  - No installation required, just run the file
  
- **Setup EXE** (81MB): `build/i cant code Setup 1.0.8.exe`
  - Full installer with desktop shortcuts

## 🚀 Step-by-Step Instructions

### 1. Go to GitHub Releases
Visit: https://github.com/danrublop/I-can-t-code-translator/releases

### 2. Create New Release
1. Click **"Create a new release"** button
2. Click **"Choose a tag"** and select **"v1.0.8"**
3. Click **"Create new tag: v1.0.8"**

### 3. Release Details
- **Release title**: `I Can't Code v1.0.8 - Production Domain Update`
- **Description**:
```markdown
## 🎉 I Can't Code v1.0.8 - Production Domain Update

### ✨ What's New
- **Production Domain Integration**: App now connects to https://i-cant-code.vercel.app
- **Updated Authentication**: Auth flow works with production website
- **Website Integration**: All app links point to the live website
- **Improved User Experience**: Seamless connection between app and website

### 🔧 Technical Updates
- Updated app configuration to use production domain
- Fixed authentication endpoints for production
- All website links now point to the correct domain
- Improved user experience with live website integration

### 📦 Downloads

#### macOS
- **Universal** (Intel + Apple Silicon): `i cant code-1.0.8-universal.dmg`

#### Windows
- **Portable**: `i cant code 1.0.8.exe`
- **Installer**: `i cant code Setup 1.0.8.exe`

### 🛠️ Installation
1. Download the appropriate file for your platform
2. For macOS: Open the DMG and drag to Applications
3. For Windows: Run the EXE file or use the installer
4. The app will now connect to the production website

### 🔗 Important Notes
- This version connects to the live website at https://i-cant-code.vercel.app
- Authentication and all website features now work with the production domain
- Users will have a seamless experience between the app and website

### 🐛 Bug Reports
Please report any issues on the GitHub repository.
```

### 4. Upload Files
Drag and drop these files from your `build/` directory:

**macOS:**
- `i cant code-1.0.8-universal.dmg`

**Windows:**
- `i cant code 1.0.8.exe`
- `i cant code Setup 1.0.8.exe`

### 5. Publish Release
1. Click **"Publish release"**
2. Your files will be available for download

## 🔗 Download URLs
After publishing, your files will be available at:
```
https://github.com/danrublop/I-can-t-code-translator/releases/download/v1.0.8/[filename]
```

## 📝 Next Steps
1. Update your website download links to point to the new v1.0.8 release
2. Test the app with the production domain
3. Share the release with your users

## 💡 Key Benefits of v1.0.8
- **Production Ready**: App now works with the live website
- **Better Integration**: Seamless experience between app and website
- **Updated Authentication**: Works with production auth system
- **Improved UX**: Users get the full website experience from the app
