# How to Update "i cant code"

This guide shows users how to update their app depending on how they originally installed it.

## 🍺 Homebrew Users (Easiest)

If you installed via Homebrew, updating is super simple:

### Update Just "i cant code"
```bash
brew upgrade --cask i-cant-code
```

### Update All Your Apps
```bash
brew upgrade
```

### Check for Available Updates
```bash
brew outdated --cask
```

**Benefits:**
- ✅ Automatic - no manual downloads
- ✅ No security warnings
- ✅ Updates dependencies (Ollama) if needed
- ✅ One command updates everything

---

## 📦 GitHub Releases Users

If you downloaded from GitHub Releases:

### Manual Update Process
1. **Check for updates**: Visit [GitHub Releases](https://github.com/danrublop/I-can-t-code-translator/releases)
2. **Download latest DMG**: Click on the newest release
3. **Install new version**: 
   - Open the DMG
   - Drag to Applications (replace existing)
   - Right-click → "Open" (first time only)

### Get Update Notifications
- ⭐ **Star the repository** to get notified of new releases
- 🔔 **Watch releases** for email notifications

---

## 🌐 Direct Download Users (Website)

If you downloaded directly from the website:

### Manual Update Process
1. **Visit the website**: Go to your download page
2. **Download latest version**: Click the download button
3. **Install new version**:
   - Open the DMG
   - Drag to Applications (replace existing)
   - Right-click → "Open" (first time only)

### Stay Updated
- 📧 **Subscribe to updates** (if you add email notifications)
- 🔖 **Bookmark the download page**
- 📱 **Follow on social media** for announcements

---

## 🔄 In-App Updates (Future Feature)

*Coming soon: The app will check for updates automatically and notify you when new versions are available.*

### Planned Features
- **Automatic update checking** on app startup
- **In-app notifications** when updates are available
- **One-click update** for Homebrew users
- **Download prompt** for direct download users

---

## 📋 Update Comparison

| Installation Method | Update Command | Difficulty | Security Warnings |
|-------------------|---------------|------------|------------------|
| **Homebrew** | `brew upgrade --cask i-cant-code` | ⭐ Easy | ❌ None |
| **GitHub Releases** | Manual download & install | ⭐⭐ Medium | ⚠️ First time only |
| **Direct Download** | Manual download & install | ⭐⭐ Medium | ⚠️ First time only |

---

## 🚀 Recommended: Switch to Homebrew

If you're currently using manual downloads, consider switching to Homebrew for easier updates:

### One-Time Setup
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Remove current app (optional - keeps your settings)
# Just delete from Applications folder

# Install via Homebrew
brew install --cask danrublop/i-cant-code/i-cant-code
```

### Future Updates
```bash
brew upgrade --cask i-cant-code
```

**Benefits of switching:**
- ✅ No more manual downloads
- ✅ No security warnings ever again
- ✅ Automatic dependency management
- ✅ One command updates everything
- ✅ Trusted by developers worldwide

---

## 🔍 How to Check Your Current Version

### In the App
- Open "i cant code"
- Look in the app menu or About section
- Version number will be displayed (e.g., "v1.0.1")

### From Terminal (if installed via Homebrew)
```bash
brew list --cask --versions i-cant-code
```

---

## ❓ Troubleshooting Updates

### Update Fails or App Won't Start
1. **Completely quit** the old version first
2. **Restart your Mac** (sometimes helps with file locks)
3. **Re-download** and install fresh
4. **Check Ollama**: Make sure it's still running (`ollama serve`)

### Homebrew Issues
```bash
# Update Homebrew itself first
brew update

# Then try updating the app
brew upgrade --cask i-cant-code

# If that fails, reinstall
brew uninstall --cask i-cant-code
brew install --cask danrublop/i-cant-code/i-cant-code
```

### Lost Settings After Update
Don't worry! Your settings are preserved in:
- `~/Library/Application Support/i cant code/`
- `~/Library/Preferences/com.icantcode.app.plist`

---

## 📢 Stay Updated

### Get Notified of New Releases

**GitHub (Best for developers):**
- ⭐ Star the repository
- 👁️ Watch → Releases only

**Social Media:**
- 🐦 Follow on X/Twitter
- 📸 Follow on Instagram

**Email Updates:**
- 📧 Subscribe to our newsletter (if available)

---

## 🎯 Quick Reference

### Homebrew Users
```bash
brew upgrade --cask i-cant-code
```

### Manual Download Users
1. Visit [GitHub Releases](https://github.com/danrublop/I-can-t-code-translator/releases)
2. Download latest DMG
3. Install (drag to Applications)
4. Right-click → Open (if needed)

### Check Version
Look in the app's About section or menu bar.

---

**Need help?** Check our [GitHub Issues](https://github.com/danrublop/I-can-t-code-translator/issues) or contact support!
