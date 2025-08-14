@echo off
REM CodeLens Translator Setup Script for Windows
REM This script helps set up the development environment

echo 🚀 Setting up CodeLens Translator development environment...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js v16 or higher.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2 delims=." %%a in ('node --version') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:~1%
if %NODE_VERSION% lss 16 (
    echo ❌ Node.js version 16 or higher is required. Current version: 
    node --version
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo ✅ npm is available
npm --version

REM Check if Ollama is installed
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Ollama is not installed. Please install Ollama from: https://ollama.ai/download
    echo    After installation, run: ollama pull mistral:latest
    echo.
    echo Press any key to continue with setup (you can install Ollama later)...
    pause >nul
) else (
    echo ✅ Ollama is installed
    
    REM Check if Ollama is running
    ollama list >nul 2>&1
    if %errorlevel% neq 0 (
        echo ⚠️  Ollama is not running. Please start Ollama manually.
        echo    Run: ollama serve
        echo.
        echo Press any key to continue with setup (you can start Ollama later)...
        pause >nul
    ) else (
        echo ✅ Ollama is running
        
        REM Check if Mistral model is available
        ollama list | findstr "mistral" >nul 2>&1
        if %errorlevel% neq 0 (
            echo ⚠️  Mistral model not found. Pulling Mistral model...
            ollama pull mistral:latest
        ) else (
            echo ✅ Mistral model is available
        )
    )
)

REM Install npm dependencies
echo 📦 Installing npm dependencies...
npm install

REM Build the project
echo 🔨 Building the project...
npm run build

echo.
echo 🎉 Setup complete! You can now run the application with:
echo    npm start
echo.
echo For development mode, use:
echo    npm run dev
echo.
echo 📚 Check the README.md file for more information about usage and development.
echo.
echo 🔑 Global shortcuts:
echo    - Ctrl+Shift+T: Translate code
echo    - Ctrl+Shift+H: Toggle toolbar
echo.
pause
