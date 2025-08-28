# i cant code - Installation Guide

## 🚀 Quick Start (5 minutes)

**Just want to get running quickly? Follow these steps:**

1. **Install Ollama**: [ollama.ai/download](https://ollama.ai/download)
2. **Download AI Model**: Open terminal and run `ollama pull mistral`
3. **Download & Install**: Get the app from the download section below
4. **Launch**: Open the app and start coding!

**Need help?** See the detailed [Ollama Setup](#ollama-setup) section below.

## Download

### macOS
- **DMG Installer**: Download the `.dmg` file for easy installation
- **ZIP Archive**: Download the `.zip` file for manual installation
- **Architecture Support**: Both Intel (x64) and Apple Silicon (ARM64) supported

### Windows
- **NSIS Installer**: Download the `.exe` installer for standard installation
- **Portable**: Download the portable `.exe` for no-installation use

### Linux
- **AppImage**: Download the `.AppImage` file for universal compatibility
- **Debian Package**: Download the `.deb` file for Debian/Ubuntu systems

## Installation Instructions

### macOS
1. Download the `.dmg` file
2. Double-click the downloaded file
3. Drag the CodeLens Translator app to your Applications folder
4. Launch from Applications or Spotlight

**Note**: On first launch, you may need to:
- Right-click the app and select "Open" to bypass Gatekeeper
- Go to System Preferences > Security & Privacy and click "Open Anyway"

### Windows
1. Download the `.exe` installer
2. Run the installer as Administrator
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

### Linux
1. **AppImage**: 
   - Download the `.AppImage` file
   - Make it executable: `chmod +x CodeLens-Translator-*.AppImage`
   - Run: `./CodeLens-Translator-*.AppImage`

2. **Debian Package**:
   - Download the `.deb` file
   - Install: `sudo dpkg -i codelens-translator_*.deb`
   - Launch from your application menu

## Prerequisites

### Required Software
- **Ollama**: Must be installed and running locally
- **Internet Connection**: For AI model downloads and updates

### Ollama Setup

#### What is Ollama?
Ollama is a local AI model runner that allows you to run large language models on your computer without sending data to external servers. This keeps your code private and secure.

#### Installation Instructions

**macOS:**
1. **Download Ollama**: Visit [ollama.ai/download](https://ollama.ai/download)
2. **Install**: Double-click the downloaded `.dmg` file and drag Ollama to Applications
3. **Launch**: Open Ollama from Applications (it will start automatically)
4. **Verify**: Open Terminal and run `ollama --version` to confirm installation

**Windows:**
1. **Download Ollama**: Visit [ollama.ai/download](https://ollama.ai/download)
2. **Install**: Run the downloaded `.exe` installer as Administrator
3. **Launch**: Ollama will start automatically with Windows
4. **Verify**: Open Command Prompt and run `ollama --version`

**Linux:**
1. **Install via script** (recommended):
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ```
2. **Or install manually**:
   - Download from [ollama.ai/download](https://ollama.ai/download)
   - Extract and follow platform-specific instructions
3. **Start Ollama**: `ollama serve`
4. **Verify**: `ollama --version`

#### Download the AI Model
After installing Ollama, you need to download the Mistral model:

1. **Open Terminal/Command Prompt**
2. **Download Mistral model**:
   ```bash
   ollama pull mistral
   ```
   This will download approximately 4GB and may take several minutes depending on your internet speed.

3. **Verify the model**:
   ```bash
   ollama list
   ```
   You should see `mistral` in the list.

#### Start Ollama Service
Ollama needs to be running for the app to work:

**macOS/Windows**: Ollama starts automatically when you install it
**Linux**: Run `ollama serve` in a terminal

**To check if Ollama is running**:
```bash
ollama list
```
If you get a response, Ollama is running. If you get a connection error, start it with `ollama serve`.

#### Troubleshooting Ollama Installation

**"Command not found" error**:
- Restart your terminal/command prompt after installation
- On macOS/Windows, restart your computer
- On Linux, log out and back in

**Permission errors**:
- On macOS: Right-click Ollama and select "Open" on first launch
- On Windows: Run as Administrator
- On Linux: Use `sudo` if needed

**Port conflicts**:
- Ollama uses port 11434 by default
- If you get connection errors, check if another service is using this port
- You can change the port in Ollama settings if needed

## First Launch

### What to Expect (First Time Setup)
- **App Launch**: May take 10-15 seconds on first run
- **Ollama Connection**: App will automatically connect to Ollama
- **Model Loading**: First AI request may take 20-30 seconds as the model loads
- **Status Updates**: Watch the toolbar status indicator for connection status

### Before You Start
1. **Ensure Ollama is running** (see Ollama Setup section above)
2. **Verify Mistral model is downloaded**: Run `ollama list` in terminal
3. **Check internet connection** (needed for first-time model loading)

### Launch the App
1. **Launch i cant code** from your Applications folder
2. **The toolbar will appear** at the top of your screen
3. **Check the status indicator** - it should show "Ready" with a green dot

### Test the Setup
1. **Copy some code** from any application (e.g., a simple JavaScript function)
2. **Press Cmd+Shift+T** (Mac) / **Ctrl+Shift+T** (Windows/Linux)
3. **Wait for the explanation window** to appear
4. **You should see AI-generated code explanations**

### Global Shortcuts
- **Cmd+Shift+T** (Mac) / **Ctrl+Shift+T** (Windows/Linux): Translate highlighted code
- **Cmd+Shift+H** (Mac) / **Ctrl+Shift+H** (Windows/Linux): Toggle toolbar visibility

## Troubleshooting

### App Won't Launch
- **Check Ollama**: Ensure Ollama is running: `ollama serve`
- **System Requirements**: Verify you meet minimum system requirements
- **Permissions**: On macOS, right-click app and select "Open" on first launch
- **Terminal Debug**: Try running from terminal for detailed error messages

### Toolbar Not Visible
- **Toggle Visibility**: Use **Cmd+Shift+H** (Mac) / **Ctrl+Shift+H** (Windows/Linux) to toggle
- **Check Background**: Look for the app in your system tray/menu bar
- **Restart App**: Quit and relaunch the application

### AI Not Working

#### Common Issues:
1. **Ollama Not Running**:
   ```bash
   ollama list
   ```
   If you get a connection error, start Ollama:
   ```bash
   ollama serve
   ```

2. **Model Not Downloaded**:
   ```bash
   ollama list
   ```
   If Mistral isn't listed, download it:
   ```bash
   ollama pull mistral
   ```

3. **Port Conflicts**:
   - Ollama uses port 11434
   - Check if another service is using this port
   - Restart Ollama: `ollama serve`

4. **Slow First Response**:
   - First AI request may take 10-30 seconds
   - Subsequent requests will be faster
   - This is normal for local AI models

#### Status Indicators:
- **Green dot + "Ready"**: Everything is working
- **Yellow dot + "Ollama API Error"**: Ollama is running but there's a connection issue
- **Red dot + "Ollama Not Running"**: Ollama service is not active

### Performance Issues
- **First Launch**: May take longer as Ollama loads the model
- **Memory Usage**: Mistral model uses ~4GB RAM when active
- **CPU Usage**: AI processing will use CPU resources
- **Storage**: Ensure you have at least 5GB free space

## System Requirements

### Minimum
- **macOS**: 10.15 (Catalina) or later
- **Windows**: Windows 10 (64-bit) or later
- **Linux**: Ubuntu 18.04 or equivalent
- **RAM**: 4GB
- **Storage**: 2GB free space

### Recommended
- **RAM**: 8GB or more
- **Storage**: 5GB free space
- **Internet**: Stable broadband connection

## Support

For issues and support:
- Check the [main README.md](README.md) for development information
- Report bugs through the project repository
- Ensure you're using the latest version

## Updates

The app will check for updates automatically. To manually update:
1. Download the latest version from the releases page
2. Follow the installation instructions above
3. Your settings and preferences will be preserved
