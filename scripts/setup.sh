#!/bin/bash

# CodeLens Translator Setup Script
# This script helps set up the development environment

set -e

echo "🚀 Setting up CodeLens Translator development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) is installed"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm $(npm -v) is available"

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama is not installed. Installing Ollama..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        curl -fsSL https://ollama.ai/install.sh | sh
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://ollama.ai/install.sh | sh
    else
        echo "❌ Please install Ollama manually from: https://ollama.ai/download"
        echo "   After installation, run: ollama pull mistral:latest"
    fi
else
    echo "✅ Ollama is installed"
fi

# Check if Ollama is running
if command -v ollama &> /dev/null; then
    if ! ollama list &> /dev/null; then
        echo "⚠️  Ollama is not running. Starting Ollama..."
        ollama serve &
        sleep 5
    fi
    
    # Check if Mistral model is available
    if ! ollama list | grep -q "mistral"; then
        echo "⚠️  Mistral model not found. Pulling Mistral model..."
        ollama pull mistral:latest
    else
        echo "✅ Mistral model is available"
    fi
fi

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

echo ""
echo "🎉 Setup complete! You can now run the application with:"
echo "   npm start"
echo ""
echo "For development mode, use:"
echo "   npm run dev"
echo ""
echo "📚 Check the README.md file for more information about usage and development."
echo ""
echo "🔑 Global shortcuts:"
echo "   - Cmd+Shift+T (Mac) / Ctrl+Shift+T (Windows/Linux): Translate code"
echo "   - Cmd+Shift+H (Mac) / Ctrl+Shift+H (Windows/Linux): Toggle toolbar"
