# 🚀 Release Guide - i cant code

This guide explains how to use the automated release system to build and distribute your app.

## 📋 Prerequisites

- **GitHub repository** with your code
- **GitHub Actions enabled** (should be automatic)
- **Node.js and npm** installed locally
- **Git** configured with proper permissions

## 🔄 How It Works

1. **Create a version tag** using the release script
2. **GitHub Actions automatically builds** your app for all platforms
3. **Release is created** with built files and checksums
4. **Users can download** the appropriate version for their OS

## 🎯 Creating a Release

### Option 1: Automated Script (Recommended)

#### macOS/Linux:
```bash
./scripts/release.sh
```

#### Windows:
```cmd
scripts\release.bat
```

The script will:
- Check your current version
- Ask what type of release (patch/minor/major/custom)
- Update package.json
- Create a git tag
- Push to GitHub
- Trigger the build process

### Option 2: Manual Process

```bash
# 1. Update version in package.json
npm version patch  # or minor, major, or specific version

# 2. Commit changes
git add package.json package-lock.json
git commit -m "chore: bump version to X.Y.Z"

# 3. Create and push tag
git tag -a "vX.Y.Z" -m "Release vX.Y.Z"
git push origin main
git push origin "vX.Y.Z"
```

## 🏗️ Build Process

When you push a version tag, GitHub Actions will:

1. **Build for macOS** (Intel + Apple Silicon)
2. **Build for Windows** (64-bit)
3. **Build for Linux** (AppImage)
4. **Generate checksums** for security
5. **Create a release** with all files

## 📱 What Gets Built

- **macOS**: `.dmg` file (Intel + ARM64)
- **Windows**: `.exe` installer
- **Linux**: `.AppImage` file
- **Checksums**: SHA256 verification files

## 🔍 Monitoring the Build

1. Go to your GitHub repository
2. Click **Actions** tab
3. Find the workflow run for your tag
4. Monitor the build progress
5. Check for any build errors

## 📦 Publishing the Release

Once the build completes:

1. Go to **Releases** in your repository
2. Find the draft release for your version
3. **Review the release notes** (auto-generated from template)
4. **Customize the description** if needed
5. **Click "Publish release"**

## 📝 Release Notes Template

The system uses `RELEASE_TEMPLATE.md` as a base. You can:

- **Customize the template** for your needs
- **Add specific features** for each release
- **Include troubleshooting tips**
- **Add screenshots** or GIFs

## 🚨 Troubleshooting

### Build Fails

**Common issues:**
- **Dependencies**: Check if all packages are available
- **Node version**: Ensure compatibility with your code
- **Build scripts**: Verify `build:mac`, `build:win`, `build:linux` exist

**Solutions:**
```bash
# Test build locally first
npm run build:mac
npm run build:win
npm run build:linux
```

### Release Not Created

**Check:**
- **Tag format**: Must be `vX.Y.Z` (e.g., `v1.0.0`)
- **GitHub Actions**: Ensure they're enabled
- **Permissions**: Check repository settings

### Files Missing

**Verify:**
- **Build output**: Check `dist/` directory structure
- **File patterns**: Ensure `.dmg`, `.exe`, `.AppImage` are generated
- **Build scripts**: Confirm they output to correct locations

## 🔧 Customization

### Modify Build Process

Edit `.github/workflows/release.yml`:
- **Add platforms** (e.g., 32-bit Windows)
- **Change Node version**
- **Add build steps** (e.g., code signing)
- **Modify artifact retention**

### Custom Release Notes

Edit `RELEASE_TEMPLATE.md`:
- **Add your branding**
- **Include specific features**
- **Add installation instructions**
- **Include support information**

## 📊 Release Statistics

Track your releases:
- **Downloads**: GitHub shows download counts
- **Issues**: Link releases to GitHub issues
- **Feedback**: Monitor user reactions
- **Analytics**: Add tracking to your app

## 🎉 Best Practices

1. **Semantic Versioning**: Use `MAJOR.MINOR.PATCH` format
2. **Release Notes**: Always include what's new
3. **Testing**: Test builds locally before releasing
4. **Communication**: Announce releases to your users
5. **Feedback**: Monitor and respond to user issues

## 🔗 Useful Commands

```bash
# Check current version
npm version

# List all tags
git tag -l

# Delete a tag (if needed)
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

# View release workflow
gh workflow view "Build and Release"

# Manually trigger workflow
gh workflow run "Build and Release"
```

## 📞 Support

If you encounter issues:

1. **Check GitHub Actions logs** for error details
2. **Verify your build scripts** work locally
3. **Check GitHub documentation** for Actions
4. **Open an issue** in your repository

---

**Happy releasing! 🚀**

Your app will now automatically build and release whenever you create a version tag!
