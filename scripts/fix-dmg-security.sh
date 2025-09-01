#!/bin/bash

# Fix DMG Security Issues
# This script removes quarantine attributes from DMG files

echo "🔧 Fixing DMG Security Issues"
echo "============================="

# Check if DMG files exist in build directory
BUILD_DIR="build"
WEBSITE_DIR="website/public/downloads"

echo "Checking for DMG files..."

# Fix DMG files in build directory
if [ -f "$BUILD_DIR/i cant code-1.0.6.dmg" ]; then
    echo "✅ Found Intel DMG in build directory"
    echo "🔓 Removing quarantine attribute from Intel DMG..."
    xattr -rd com.apple.quarantine "$BUILD_DIR/i cant code-1.0.6.dmg"
    echo "✅ Intel DMG fixed"
else
    echo "❌ Intel DMG not found in build directory"
fi

if [ -f "$BUILD_DIR/i cant code-1.0.6-arm64.dmg" ]; then
    echo "✅ Found Apple Silicon DMG in build directory"
    echo "🔓 Removing quarantine attribute from Apple Silicon DMG..."
    xattr -rd com.apple.quarantine "$BUILD_DIR/i cant code-1.0.6-arm64.dmg"
    echo "✅ Apple Silicon DMG fixed"
else
    echo "❌ Apple Silicon DMG not found in build directory"
fi

# Fix DMG files in website directory
if [ -f "$WEBSITE_DIR/i-cant-code-mac-v1.0.6.dmg" ]; then
    echo "✅ Found Intel DMG in website directory"
    echo "🔓 Removing quarantine attribute from Intel DMG..."
    xattr -rd com.apple.quarantine "$WEBSITE_DIR/i-cant-code-mac-v1.0.6.dmg"
    echo "✅ Intel DMG fixed"
else
    echo "❌ Intel DMG not found in website directory"
fi

if [ -f "$WEBSITE_DIR/i-cant-code-mac-apple-silicon-v1.0.6.dmg" ]; then
    echo "✅ Found Apple Silicon DMG in website directory"
    echo "🔓 Removing quarantine attribute from Apple Silicon DMG..."
    xattr -rd com.apple.quarantine "$WEBSITE_DIR/i-cant-code-mac-apple-silicon-v1.0.6.dmg"
    echo "✅ Apple Silicon DMG fixed"
else
    echo "❌ Apple Silicon DMG not found in website directory"
fi

echo ""
echo "✅ DMG security fixes completed!"
echo ""
echo "The DMG files should now open without the 'damaged' error."
echo "If you still have issues, try:"
echo "1. Right-click the DMG file and select 'Open'"
echo "2. Or run: sudo spctl --master-disable (use with caution)"
echo ""
