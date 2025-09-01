# Download Files

This directory contains the downloadable application files for "i cant code".

## File Structure

- `i-cant-code-mac.dmg` - macOS application installer
- `i-cant-code-windows.exe` - Windows application installer
- `i-cant-code-linux.AppImage` - Linux application installer

## How to Update

1. Build your Electron app for each platform
2. Replace the files in this directory
3. Update the version numbers in the download page

## Building Instructions

### macOS
```bash
npm run build:mac
# Copy the .dmg file to this directory
```

### Windows
```bash
npm run build:win
# Copy the .exe file to this directory
```

### Linux
```bash
npm run build:linux
# Copy the .AppImage file to this directory
```

