# 🚀 i cant code v{VERSION}

## ✨ What's New

### 🎯 Features
- AI-powered code explanations using Mistral
- Smart programming language detection
- Personal code notebook with search
- Beautiful dark theme UI
- Global shortcut (Cmd+Shift+T / Ctrl+Shift+T)
- Persistent explanation storage

### 🐛 Bug Fixes
- Fixed explanation persistence between app restarts
- Improved error handling and user feedback
- Enhanced markdown formatting support

### 🔧 Technical Improvements
- Optimized build process
- Better memory management
- Enhanced security with license system

## 📱 System Requirements

- **macOS**: 10.15+ (Catalina or later)
- **Windows**: 10+ (64-bit)
- **Linux**: Ubuntu 18.04+ / Debian 10+ / CentOS 7+
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB available space

## 🔧 Prerequisites

**Ollama must be installed and running on your system:**

### macOS
```bash
brew install ollama
ollama serve
ollama pull mistral:latest
```

### Windows
```bash
# Download from https://ollama.ai/download
# Install and run, then:
ollama pull mistral:latest
```

### Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve
ollama pull mistral:latest
```

## 📥 Installation

1. **Download** the desktop app for your operating system (below)
2. **Install** the application
3. **Launch** i cant code
4. **Use** Cmd+Shift+T (Mac) or Ctrl+Shift+T (Windows/Linux) to analyze code

> **Note**: This is the desktop application. The website is hosted separately at [icantcode.app](https://icantcode.app) for authentication and account management.

## 💡 Getting Started

1. **Copy any code** from any application
2. **Press the global shortcut** (Cmd+Shift+T / Ctrl+Shift+T)
3. **Get instant AI explanations** with proper formatting
4. **Save explanations** to your personal notebook
5. **Search and organize** your code knowledge

## 🔑 Features

- **🎯 Smart Analysis**: Automatically detects programming languages
- **📚 Personal Notebook**: Save and organize all explanations
- **🔍 Advanced Search**: Find explanations by code, language, or tags
- **🎨 Beautiful UI**: Modern dark theme with smooth animations
- **⚡ Fast Performance**: Optimized for quick responses
- **🔒 Privacy First**: All processing happens locally via Ollama

## 🆘 Troubleshooting

### Common Issues

**"Ollama is not running"**
- Make sure Ollama is installed and running
- Run `ollama serve` in terminal

**"Mistral model not found"**
- Run `ollama pull mistral:latest` to download the model

**"App won't start"**
- Check system requirements
- Ensure you have sufficient permissions

**"Shortcut not working"**
- Grant accessibility permissions in System Preferences
- Restart the application

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check the README for detailed setup
- **Community**: Join our Discord for support

## 🔒 Security

- **Code signed** for macOS and Windows
- **SHA256 checksums** provided for verification
- **Open source** - review the code yourself
- **Local processing** - your code never leaves your machine

## 📈 What's Next

- [ ] Advanced code analysis features
- [ ] Multiple AI model support
- [ ] Team collaboration features
- [ ] Cloud sync (optional)
- [ ] Mobile companion app

## 🙏 Support

If you find this app helpful, please:
- ⭐ **Star the repository**
- 🐛 **Report bugs** on GitHub
- 💡 **Suggest features** via issues
- 📢 **Share with other developers**

---

**Made with ❤️ by the i cant code team**

*Built with Electron, React, and powered by Mistral AI*
