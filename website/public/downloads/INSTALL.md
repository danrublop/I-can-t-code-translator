# Installation Instructions

## macOS (.dmg file)

### ⚠️ Important Security Notice
This app is not yet code signed, so macOS will show a security warning. This is safe to bypass.

**Installation Steps:**
1. Download the `i-cant-code-mac.dmg` file
2. Double-click the downloaded file
3. Drag the "i cant code" app to your Applications folder
4. **Right-click** the app and select "Open" (don't double-click)
5. Click "Open" when macOS asks about the unverified developer
6. The app will now run and be trusted for future launches

**Alternative Method:**
- If right-click doesn't work, go to System Preferences → Security & Privacy
- Click "Open Anyway" next to the blocked app message

## Windows (.exe file)
1. Download the `i-cant-code-windows.exe` file
2. Run the downloaded file
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

## Linux (.AppImage file)
1. Download the `i-cant-code-linux.AppImage` file
2. Make it executable: `chmod +x i-cant-code-linux.AppImage`
3. Run: `./i-cant-code-linux.AppImage`

## System Requirements

- **macOS**: 10.14+ (Mojave or later)
- **Windows**: Windows 10 or later
- **Linux**: Ubuntu 18.04+ or similar
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space

## First Launch

1. The app will request necessary permissions
2. You'll need to authenticate with your account
3. Ensure Ollama is running with Mistral model installed

## Troubleshooting

### macOS Issues
- **"App cannot be opened because developer cannot be verified"**: Right-click the app → Open, then click "Open" in the dialog
- **"App is damaged"**: Re-download the .dmg file (incomplete download)
- **App won't launch**: Check that the app is in your Applications folder

### Windows Issues  
- **"Windows protected your PC"**: Click "More info" → "Run anyway"
- **Installer won't run**: Right-click the .exe and select "Run as administrator"

### General Issues
- **Authentication issues**: Verify your login credentials
- **AI not working**: Ensure Ollama is running and Mistral is installed (`ollama pull mistral`)
- **App crashes on startup**: Check system requirements and ensure Ollama is installed

## Support

If you encounter issues, please check our documentation or contact support.

