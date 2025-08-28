#!/bin/bash

# 🚀 i cant code - Mac Startup Script

echo "🚀 Starting i cant code..."
echo "📱 Loading AI-powered code explanation tool..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the dist directory"
    echo "   cd dist && ./start-mac.sh"
    exit 1
fi

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo "⚠️  Warning: Ollama is not running"
    echo "   Please start Ollama first: ollama serve"
    echo "   Then run this script again"
    echo ""
    echo "Press any key to continue anyway..."
    read -n 1
fi

# Start the application
echo "✅ Starting application..."
npm start

echo "👋 Application closed. Thanks for using i cant code!"

