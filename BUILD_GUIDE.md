# Quick Build Guide for "i cant code"

## 🚀 Generate Downloadable Files

### Prerequisites
- Node.js and npm installed
- Electron Builder installed: `npm install -g electron-builder`

### Option 1: Use the Build Scripts (Recommended)

#### On macOS/Linux:
```bash
# Make the script executable
chmod +x scripts/build-all.sh

# Run the build script
bash scripts/build-all.sh
```

#### On Windows:
```cmd
# Run the batch file
scripts\build-all.bat
```

### Option 2: Manual Build

```bash
# 1. Install dependencies
npm install

# 2. Build the app
npm run build:prod

# 3. Build for specific platforms
npm run build:mac    # Creates .dmg file
npm run build:win    # Creates .exe file
npm run build:linux  # Creates .AppImage file

# 4. Copy files to website
mkdir -p website/public/downloads/
cp dist/*.dmg website/public/downloads/i-cant-code-mac.dmg
cp dist/*.exe website/public/downloads/i-cant-code-windows.exe
cp dist/*.AppImage website/public/downloads/i-cant-code-linux.AppImage
```

## 📁 Expected Output

After building, you should have these files:
```
website/public/downloads/
├── i-cant-code-mac.dmg      # macOS installer (~45MB)
├── i-cant-code-windows.exe  # Windows installer (~42MB)
└── i-cant-code-linux.AppImage # Linux installer (~40MB)
```

## 🔍 Verify Builds

1. **Check file sizes**: Should be 40-50MB, not a few KB
2. **File types**: Should be actual binary files, not text
3. **Test downloads**: Try downloading from your website

## 🚨 Common Issues

- **Small file sizes**: Build didn't complete properly
- **Text files**: Wrong files were copied
- **404 errors**: Files not in the right location

## 📝 After Building

1. **Test downloads** on your website
2. **Update version numbers** if needed
3. **Deploy** your website with the new files

## 🆘 Need Help?

- Check the build output for errors
- Ensure all dependencies are installed
- Verify the build configuration in `package.json`

