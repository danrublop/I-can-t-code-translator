# 🚀 i cant code - Mac Installation Guide

## 📦 What You Got

This is the **production version** of "i cant code" - an AI-powered code explanation tool that works with Ollama.

## ✨ Features Fixed & Working

- ✅ **Line & Character Counts** - Now properly display in toolbar
- ✅ **Real-time Clipboard Monitoring** - Updates every 500ms
- ✅ **React-based Toolbar** - Modern, responsive interface
- ✅ **Ollama Integration** - Works with local AI models
- ✅ **Keyboard Shortcuts** - Cmd+Shift+T for translation, Cmd+Shift+H to toggle

## 🛠️ Installation Steps

### 1. Extract the ZIP
```bash
unzip i-cant-code-production.zip
cd dist
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Install Ollama (Required)
```bash
# Visit https://ollama.ai and download for Mac
# Or use Homebrew:
brew install ollama
```

### 4. Start Ollama
```bash
ollama serve
```

### 5. Run the Application
```bash
npm start
```

## 🎯 How to Use

1. **Copy any code** to your clipboard (Cmd+C)
2. **Watch the toolbar** - it shows line count, character count, and status
3. **Press Cmd+Shift+T** to get AI explanations of your code
4. **Press Cmd+Shift+H** to hide/show the toolbar

## 🔧 Troubleshooting

- **Line counts not showing?** Make sure you've copied text to clipboard
- **Ollama connection failed?** Ensure Ollama is running (`ollama serve`)
- **App won't start?** Check that all dependencies are installed

## 📱 System Requirements

- macOS 10.12+ (Sierra or later)
- Node.js 16+ 
- Ollama installed and running
- At least 2GB RAM

## 🆘 Need Help?

The application includes debug logging. Check the terminal output for any error messages.

---

**Built with ❤️ using Electron, React, and Ollama**

