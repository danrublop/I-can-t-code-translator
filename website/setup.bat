@echo off
echo 🚀 Setting up i cant code website...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Visit: https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2 delims=." %%a in ('node --version') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:~1%
if %NODE_VERSION% lss 18 (
    echo ❌ Node.js version 18+ is required. Current version: 
    node --version
    echo    Please upgrade Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js version detected:
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ npm version detected:
npm --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% equ 0 (
    echo ✅ Dependencies installed successfully
) else (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Create .env.local file if it doesn't exist
if not exist .env.local (
    echo 🔧 Creating .env.local file...
    (
        echo # Environment variables for i cant code website
        echo NEXT_PUBLIC_APP_NAME="i cant code"
        echo NEXT_PUBLIC_APP_DESCRIPTION="AI-powered code explanations using Mistral language model"
        echo NEXT_PUBLIC_GITHUB_REPO="danrublop/code-translator"
    ) > .env.local
    echo ✅ .env.local file created
    echo ⚠️  Please update the GitHub repository URL in .env.local
)

echo.
echo 🎉 Setup completed successfully!
echo.
echo Next steps:
echo 1. Update the GitHub username in app/download/page.tsx
echo 2. Customize the content in the page components
echo 3. Run 'npm run dev' to start the development server
echo 4. Open http://localhost:3000 in your browser
echo.
echo Happy coding! 🚀
pause

