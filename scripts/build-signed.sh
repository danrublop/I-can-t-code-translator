#!/bin/bash

# Build script for code-signed macOS app
# Usage: ./scripts/build-signed.sh

set -e

echo "🔨 Building i cant code with code signing..."

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script must be run on macOS for code signing"
    exit 1
fi

# Check if Developer ID certificate is available
if ! security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
    echo "⚠️  No Developer ID certificate found in keychain"
    echo "Building without code signing..."
    export CSC_IDENTITY_AUTO_DISCOVERY=false
else
    echo "✅ Developer ID certificate found"
    # Auto-discover the certificate
    export CSC_IDENTITY_AUTO_DISCOVERY=true
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf build/
rm -rf dist/

# Build the app
echo "🏗️  Building production version..."
npm run build:prod

# Build for macOS
echo "📦 Creating macOS distribution..."
npm run build:mac

# Check if build was successful
if [ -f "build/i cant code-1.0.0.dmg" ]; then
    echo "✅ Build successful!"
    
    # Verify code signature if signed
    if [[ "$CSC_IDENTITY_AUTO_DISCOVERY" == "true" ]]; then
        echo "🔍 Verifying code signature..."
        if codesign --verify --verbose=2 "build/mac/i cant code.app"; then
            echo "✅ Code signature verified"
        else
            echo "❌ Code signature verification failed"
        fi
    fi
    
    echo ""
    echo "📁 Build artifacts:"
    ls -la build/*.dmg build/*.zip 2>/dev/null || true
    echo ""
    echo "🎉 Ready to distribute!"
    
    # Ask if user wants to copy to website downloads
    read -p "📤 Copy DMG to website downloads folder? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp "build/i cant code-1.0.0.dmg" "website/public/downloads/i-cant-code-mac.dmg"
        echo "✅ Copied to website/public/downloads/"
    fi
    
else
    echo "❌ Build failed - DMG file not found"
    exit 1
fi

echo ""
echo "📋 Next steps:"
echo "1. Test the app: open 'build/i cant code-1.0.0.dmg'"
echo "2. If not code signed, users will need to right-click → Open"
echo "3. For proper code signing, get an Apple Developer account"
echo "4. See CODE_SIGNING_GUIDE.md for detailed instructions"
