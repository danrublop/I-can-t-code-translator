#!/bin/bash

# Build script for "i cant code" - generates all platform builds
# Make sure you have electron-builder installed: npm install -g electron-builder

echo "🚀 Building i cant code for all platforms..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf build/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build for macOS
echo "🍎 Building for macOS..."
npm run build:mac

# Build for Windows
echo "🪟 Building for Windows..."
npm run build:win

# Build for Linux
echo "🐧 Building for Linux..."
npm run build:linux

# Copy builds to website downloads directory
echo "📁 Copying builds to website downloads..."
mkdir -p website/public/downloads/

# Copy macOS build
if [ -f "dist/i-cant-code-*.dmg" ]; then
    cp dist/i-cant-code-*.dmg website/public/downloads/i-cant-code-mac.dmg
    echo "✅ macOS build copied"
else
    echo "❌ macOS build not found"
fi

# Copy Windows build
if [ -f "dist/i-cant-code-*.exe" ]; then
    cp dist/i-cant-code-*.exe website/public/downloads/i-cant-code-windows.exe
    echo "✅ Windows build copied"
else
    echo "❌ Windows build not found"
fi

# Copy Linux build
if [ -f "dist/i-cant-code-*.AppImage" ]; then
    cp dist/i-cant-code-*.AppImage website/public/downloads/i-cant-code-linux.AppImage
    echo "✅ Linux build copied"
else
    echo "❌ Linux build not found"
fi

echo "🎉 Build complete! Check website/public/downloads/ for the files."
echo "📝 Don't forget to update the version number in your download page!"

