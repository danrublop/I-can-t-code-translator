@echo off
REM Build script for "i cant code" - generates all platform builds
REM Make sure you have electron-builder installed: npm install -g electron-builder

echo 🚀 Building i cant code for all platforms...

REM Clean previous builds
echo 🧹 Cleaning previous builds...
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Build for macOS
echo 🍎 Building for macOS...
npm run build:mac

REM Build for Windows
echo 🪟 Building for Windows...
npm run build:win

REM Build for Linux
echo 🐧 Building for Linux...
npm run build:linux

REM Copy builds to website downloads directory
echo 📁 Copying builds to website downloads...
if not exist website\public\downloads mkdir website\public\downloads

REM Copy macOS build
for %%f in (dist\i-cant-code-*.dmg) do (
    copy "%%f" "website\public\downloads\i-cant-code-mac.dmg"
    echo ✅ macOS build copied
    goto :mac_copied
)
echo ❌ macOS build not found
:mac_copied

REM Copy Windows build
for %%f in (dist\i-cant-code-*.exe) do (
    copy "%%f" "website\public\downloads\i-cant-code-windows.exe"
    echo ✅ Windows build copied
    goto :win_copied
)
echo ❌ Windows build not found
:win_copied

REM Copy Linux build
for %%f in (dist\i-cant-code-*.AppImage) do (
    copy "%%f" "website\public\downloads\i-cant-code-linux.AppImage"
    echo ✅ Linux build copied
    goto :linux_copied
)
echo ❌ Linux build not found
:linux_copied

echo 🎉 Build complete! Check website\public\downloads\ for the files.
echo 📝 Don't forget to update the version number in your download page!
pause

