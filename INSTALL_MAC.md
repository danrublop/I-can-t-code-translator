# macOS Installation Guide

## Installing "i cant code" on macOS

### Method 1: Standard Installation (Recommended)

1. **Download the DMG file** from the releases page
2. **Double-click the DMG file** to mount it
3. **Drag the app to Applications folder**
4. **Eject the disk image**
5. **Open the app from Applications**

### Method 2: If You Get "App is Damaged" Error

If you see the message "i cant code is damaged and can't be opened", follow these steps:

#### Option A: Use the Fix Script (Easiest)
1. Download and run the fix script:
   ```bash
   curl -O https://raw.githubusercontent.com/danrublop/I-can-t-code-translator/main/scripts/fix-mac-security.sh
   chmod +x fix-mac-security.sh
   ./fix-mac-security.sh
   ```

#### Option B: Manual Fix
1. **Right-click the app** in Finder
2. **Select "Open"** from the context menu
3. **Click "Open"** in the security dialog that appears
4. The app should now run normally

#### Option C: Use the App Fix Script (Recommended)
1. Download and run the app fix script:
   ```bash
   curl -O https://raw.githubusercontent.com/danrublop/I-can-t-code-translator/main/scripts/fix-app-security.sh
   chmod +x fix-app-security.sh
   ./fix-app-security.sh
   ```

#### Option D: Manual Terminal Command
1. Open Terminal
2. Run this command:
   ```bash
   xattr -rd com.apple.quarantine "/Applications/i cant code.app"
   ```
3. Try opening the app again

### Method 3: System Preferences Override

1. Go to **System Preferences > Security & Privacy**
2. Click the **"Open Anyway"** button when prompted
3. The app will be allowed to run

### Method 4: Gatekeeper Settings (Advanced)

If you want to allow apps from any developer:

1. Open Terminal
2. Run: `sudo spctl --master-disable`
3. This disables Gatekeeper (use with caution)

To re-enable: `sudo spctl --master-enable`

## Troubleshooting

### Common Issues

**Q: The app won't open after installation**
A: Try Method 2 above to bypass the security warning.

**Q: I get a "not verified" message**
A: This is normal for apps not signed by Apple. Use the right-click "Open" method.

**Q: The app crashes on startup**
A: Make sure you have Ollama installed and running. See the main README for Ollama setup.

### System Requirements

- macOS 10.15 (Catalina) or later
- Intel Mac or Apple Silicon (M1/M2)
- Ollama installed and running
- At least 2GB RAM

### Security Note

The "damaged" app warning is a macOS security feature, not an actual problem with the app. It appears because the app isn't signed by Apple, which is normal for open-source applications.

## Support

If you continue to have issues:
1. Check that Ollama is running: `ollama list`
2. Try the fix script: `./scripts/fix-mac-security.sh`
3. Open an issue on GitHub with your macOS version and error details

