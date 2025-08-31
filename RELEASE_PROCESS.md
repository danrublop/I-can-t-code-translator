# Release Process Guide

This guide covers how to create updates and releases for "i cant code" across all distribution channels.

## 🚀 Quick Release Process

### 1. **Make Your Changes**
- Fix bugs, add features, update code
- Test everything works locally
- Update documentation if needed

### 2. **Update Version Number**
```bash
# Automatically bump version and create git tag
npm version patch   # 1.0.0 → 1.0.1 (bug fixes)
npm version minor   # 1.0.0 → 1.1.0 (new features)
npm version major   # 1.0.0 → 2.0.0 (breaking changes)
```

### 3. **Push to GitHub**
```bash
git push origin main --follow-tags
```

### 4. **Automatic Magic Happens** ✨
- GitHub Actions builds your app
- Creates GitHub release with DMG
- Homebrew users get notified of updates
- Website can be updated with new version

## 📋 Detailed Release Workflow

### Step 1: Development
```bash
# Make your changes
git add .
git commit -m "Add new feature: explain complex algorithms better"

# Test locally
npm run dev
# Test the built version
npm run build:mac
```

### Step 2: Version Management
```bash
# Choose the right version bump:

# Bug fixes, small improvements
npm version patch

# New features, non-breaking changes  
npm version minor

# Major changes, breaking changes
npm version major
```

This command automatically:
- Updates `package.json` version
- Creates a git commit with the version
- Creates a git tag (e.g., `v1.0.1`)

### Step 3: Release
```bash
# Push everything to GitHub
git push origin main --follow-tags
```

The `--follow-tags` ensures both commits and tags are pushed, triggering the release.

### Step 4: Automatic Build & Distribution
GitHub Actions automatically:

1. **Builds** your app for macOS
2. **Creates** a GitHub release
3. **Uploads** the DMG file
4. **Generates** release notes
5. **Notifies** Homebrew users

## 🔄 Update Homebrew Formula

After each release, you may need to update the Homebrew formula:

### Automatic SHA256 Update Script
```bash
#!/bin/bash
# Save as scripts/update-homebrew.sh

VERSION=$(node -p "require('./package.json').version")
DMG_URL="https://github.com/danrublop/I-can-t-code-translator/releases/download/v${VERSION}/i-cant-code-mac.dmg"

# Download and calculate SHA256
curl -sL "$DMG_URL" | shasum -a 256 | cut -d' ' -f1

echo "Update homebrew-i-cant-code/Casks/i-cant-code.rb:"
echo "  version: $VERSION"
echo "  sha256: [calculated above]"
```

### Manual Homebrew Update
1. Go to your Homebrew repository: `/Users/daniellopez/homebrew-i-cant-code`
2. Update `Casks/i-cant-code.rb`:
   ```ruby
   version "1.0.1"  # New version
   sha256 "new_hash_here"  # New SHA256
   ```
3. Commit and push:
   ```bash
   git add Casks/i-cant-code.rb
   git commit -m "Update to v1.0.1"
   git push origin main
   ```

## 📝 Release Notes Template

Good release notes help users understand what's new:

```markdown
## What's New in v1.0.1

### ✨ New Features
- Added support for TypeScript interfaces
- Improved explanation accuracy for React components
- New "Expert" detail level with advanced insights

### 🐛 Bug Fixes
- Fixed crash when analyzing very large files
- Resolved authentication timeout issues
- Fixed toolbar positioning on multiple monitors

### 🔧 Improvements
- Faster code analysis (30% speed improvement)
- Better error messages
- Updated AI model responses

### 📦 Installation
**macOS:**
1. Download the `.dmg` file below
2. Right-click the app → "Open" to bypass security warning

**Homebrew:** `brew upgrade --cask i-cant-code`

### 📋 Requirements
- macOS 10.15+
- Ollama with Mistral model
```

## 🛠️ Automated Release Script

Let me create a script to automate the entire process:
