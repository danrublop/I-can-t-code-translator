# i cant code

An AI-powered desktop application that provides intelligent code explanations using the Mistral language model. Select code from any application, press a global shortcut, and receive detailed explanations in a beautiful popup window.

## 🚀 Features

- **Global Shortcuts**: Trigger code translation from anywhere with `Cmd+Shift+T` (Mac) or `Ctrl+Shift+T` (Windows/Linux)
- **AI-Powered Explanations**: Uses Ollama with Mistral model for intelligent code analysis
- **Smart Language Detection**: Automatically identifies programming languages with confidence scoring
- **Multiple Detail Levels**: Choose between Beginner, Intermediate, and Expert explanations
- **Always-on-Top Toolbar**: Minimal toolbar that stays visible for quick access
- **Context-Aware**: Integrates relevant project files for better explanations
- **Beautiful UI**: Modern, dark-themed interface with smooth animations
- **Cross-Platform**: Works on macOS, Windows, and Linux

## 📥 Download & Install

### **🚀 Quick Download (Recommended)**

**One-click downloads for your platform:**

- **🍎 macOS**: [Download .dmg file](https://github.com/danrublop/code-translator/releases/latest)
- **🪟 Windows**: [Download .exe file](https://github.com/danrublop/code-translator/releases/latest)
- **🐧 Linux**: [Download .AppImage file](https://github.com/danrublop/code-translator/releases/latest)

### **💻 Installation Steps:**

#### **macOS:**
1. Download the `.dmg` file above
2. Double-click the downloaded file
3. Drag the "i cant code" app to your Applications folder
4. Launch from Applications or Spotlight (Cmd+Space)

#### **Windows:**
1. Download the `.exe` file above
2. Run the installer
3. Follow the installation wizard
4. Launch from Start menu or desktop shortcut

#### **Linux:**
1. Download the `.AppImage` file above
2. Make it executable: `chmod +x i-cant-code-linux.AppImage`
3. Double-click to run

### **📋 Alternative Download:**
- Visit: [GitHub Releases](https://github.com/danrublop/code-translator/releases)
- Choose the latest version for your platform

### **⚠️ Note:**
The one-click download links will work once GitHub Actions completes building v1.0.2. Currently, you can download from the releases page above.

## 🏗️ Architecture

- **Backend**: Electron main process with TypeScript
- **Frontend**: React components with TypeScript
- **AI Integration**: Ollama HTTP API with Mistral model
- **Communication**: Secure IPC bridge between processes
- **Build System**: Webpack + TypeScript compilation

## 📋 Prerequisites

Before running this application, ensure you have:

1. **Node.js** (v16 or higher)
2. **Ollama** installed and running locally
3. **Mistral model** pulled (`ollama pull mistral:latest`)

### Installing Ollama

#### macOS
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Windows
Download from [https://ollama.ai/download](https://ollama.ai/download)

#### Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Pulling the Mistral Model
```bash
ollama pull mistral:latest
```

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd codelens-translator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the application**
   ```bash
   npm run build
   ```

4. **Start the application**
   ```bash
   npm start
   ```

## 🔧 Development

### Development Mode
```bash
npm run dev
```

This command will:
- Build the renderer process with webpack
- Compile the main process with TypeScript
- Start Electron in development mode
- Enable hot reloading

### Build Commands
```bash
# Build both main and renderer processes
npm run build

# Build only the main process
npm run build:main

# Build only the renderer process
npm run build:renderer

# Package the application
npm run package

## 📦 Distribution

### Building for Distribution
To create distributable packages for users:

```bash
# Build for all platforms (requires cross-compilation setup)
npm run dist

# Build for specific platform
npm run dist:mac      # macOS (DMG + ZIP)
npm run dist:win      # Windows (NSIS + Portable)
npm run dist:linux    # Linux (AppImage + DEB)

# Use the automated build script
./scripts/build-dist.sh    # macOS/Linux
scripts\build-dist.bat     # Windows
```

### Distribution Files
After building, you'll find the packages in the `build/` directory:
- **macOS**: `.dmg` installer and `.zip` archive
- **Windows**: `.exe` installer and portable `.exe`
- **Linux**: `.AppImage` and `.deb` package

### User Installation
Users can download and install the app using the [INSTALLATION.md](INSTALLATION.md) guide.

### Prerequisites for Distribution
- **macOS**: Requires code signing for distribution outside App Store
- **Windows**: May require code signing for SmartScreen compatibility
- **Linux**: AppImage works on most distributions

## 🎯 Usage

### Basic Workflow

1. **Select code** in any application (VS Code, browser, text editor, etc.)
2. **Press the global shortcut**: `Cmd+Shift+T` (Mac) or `Ctrl+Shift+T` (Windows/Linux)
3. **Wait for AI processing** - the app will automatically copy your selection and analyze it
4. **View the explanation** in a popup window with your chosen detail level

### Toolbar Controls

- **Status Indicator**: Shows connection status and current state
- **Context Files**: Displays number of relevant project files
- **Shortcut Info**: Shows available keyboard shortcuts

### Explanation Window

- **Detail Level Toggle**: Switch between Beginner, Intermediate, and Expert explanations
- **Code Viewer**: Displays the selected code with syntax highlighting
- **AI Explanation**: Shows the generated explanation in markdown format
- **Resizable Interface**: Drag the bottom-right corner to resize the window

### Global Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Translate Code | `Cmd+Shift+T` | `Ctrl+Shift+T` |
| Toggle Toolbar | `Cmd+Shift+H` | `Ctrl+Shift+H` |

## 🔌 Configuration

### Ollama Settings

The application connects to Ollama at `http://127.0.0.1:11434` by default. You can modify this in `src/main/services/ollama.service.ts`:

```typescript
private readonly baseUrl = 'http://127.0.0.1:11434';
private readonly model = 'mistral:latest';
private readonly timeout = 60000; // 60 seconds
```

### Model Parameters

Adjust AI model parameters in the Ollama service:

```typescript
options: {
  temperature: 0.7,    // Creativity level (0.0 - 1.0)
  top_p: 0.9,         // Nucleus sampling
  max_tokens: 2000    // Maximum response length
}
```

## 🎨 Customization

### Styling

The application uses CSS for styling. Main styles are in the HTML files:
- `src/renderer/toolbar.html` - Toolbar styling
- `src/renderer/explanation.html` - Explanation window styling

### Language Support

Add new programming languages in `src/main/services/code-analysis.service.ts`:

```typescript
patterns.set('your-language', {
  keywords: ['keyword1', 'keyword2'],
  extensions: ['ext1', 'ext2'],
  patterns: [/regex1/, /regex2/]
});
```

## 🐛 Troubleshooting

### Common Issues

1. **"Ollama Not Running" Error**
   - Ensure Ollama is installed and running
   - Check that it's accessible at `http://127.0.0.1:11434`
   - Run `ollama serve` to start the service

2. **Model Not Found**
   - Pull the Mistral model: `ollama pull mistral:latest`
   - Check available models: `ollama list`

3. **Global Shortcuts Not Working**
   - Ensure the application has focus
   - Check system permissions for global shortcuts
   - Restart the application

4. **Build Errors**
   - Clear `dist/` directory: `rm -rf dist/`
   - Reinstall dependencies: `rm -rf node_modules && npm install`
   - Check TypeScript configuration

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=* npm start
```

## 📁 Project Structure

```
src/
├── main/                    # Electron main process
│   ├── main.ts             # Main application logic
│   ├── preload.ts          # IPC bridge setup
│   └── services/           # AI and analysis services
│       ├── ollama.service.ts
│       └── code-analysis.service.ts
└── renderer/               # Frontend components
    ├── toolbar.tsx         # Main toolbar component
    ├── explanation.tsx     # Explanation popup component
    ├── toolbar.html        # Toolbar HTML template
    └── explanation.html    # Explanation HTML template
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests if applicable
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ollama** for providing the local AI inference platform
- **Mistral AI** for the powerful language model
- **Electron** for the cross-platform desktop framework
- **React** for the component-based UI library

## 📞 Support

If you encounter any issues or have questions:

1. Check the [troubleshooting section](#-troubleshooting)
2. Search existing [issues](../../issues)
3. Create a new issue with detailed information
4. Include your operating system, Node.js version, and error logs

---

**Happy coding! 🚀**
