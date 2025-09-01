#!/bin/bash

# Fix macOS Security Issues for "i cant code" app
# This script helps users bypass the "damaged" app warning

echo "🔧 Fixing macOS Security Issues for 'i cant code'"
echo "================================================"

# Check if the app exists in Applications
APP_PATH="/Applications/i cant code.app"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ App not found in /Applications/"
    echo "Please install the app first, then run this script."
    exit 1
fi

echo "✅ Found app at: $APP_PATH"

# Remove quarantine attribute
echo "🔓 Removing quarantine attribute..."
xattr -rd com.apple.quarantine "$APP_PATH"

# Remove extended attributes that might cause issues
echo "🧹 Cleaning extended attributes..."
xattr -cr "$APP_PATH"

echo ""
echo "✅ Security fixes applied!"
echo ""
echo "If you still get a security warning:"
echo "1. Go to System Preferences > Security & Privacy"
echo "2. Click 'Open Anyway' when prompted"
echo "3. Or right-click the app and select 'Open'"
echo ""
echo "Alternative method:"
echo "1. Right-click the app in Finder"
echo "2. Select 'Open' from the context menu"
echo "3. Click 'Open' in the security dialog"
echo ""
echo "The app should now run without security warnings."
