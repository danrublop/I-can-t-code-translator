#!/bin/bash

# Fix App Security Issues
# This script removes quarantine attributes from the installed app

echo "🔧 Fixing App Security Issues"
echo "============================"

APP_PATH="/Applications/i cant code.app"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ App not found in /Applications/"
    echo "Please install the app first, then run this script."
    echo ""
    echo "Installation steps:"
    echo "1. Download the DMG file"
    echo "2. Double-click to mount the DMG"
    echo "3. Drag the app to Applications folder"
    echo "4. Run this script: ./scripts/fix-app-security.sh"
    exit 1
fi

echo "✅ Found app at: $APP_PATH"

# Remove quarantine attribute from the app
echo "🔓 Removing quarantine attribute from app..."
xattr -rd com.apple.quarantine "$APP_PATH"

# Remove extended attributes that might cause issues
echo "🧹 Cleaning extended attributes..."
xattr -cr "$APP_PATH"

# Also fix the app bundle contents
echo "🔧 Fixing app bundle contents..."
find "$APP_PATH" -name "*.dylib" -exec xattr -rd com.apple.quarantine {} \; 2>/dev/null || true
find "$APP_PATH" -name "*.so" -exec xattr -rd com.apple.quarantine {} \; 2>/dev/null || true
find "$APP_PATH" -name "*.framework" -exec xattr -rd com.apple.quarantine {} \; 2>/dev/null || true

echo ""
echo "✅ App security fixes applied!"
echo ""
echo "Now try opening the app:"
echo "1. Right-click the app in Finder"
echo "2. Select 'Open' from the context menu"
echo "3. Click 'Open' in the security dialog"
echo ""
echo "If you still get errors, try:"
echo "1. Go to System Preferences > Security & Privacy"
echo "2. Click 'Open Anyway' when prompted"
echo ""
echo "Alternative terminal command:"
echo "sudo spctl --master-disable"
echo "(Remember to re-enable with: sudo spctl --master-enable)"
