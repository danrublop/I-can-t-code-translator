@echo off
setlocal enabledelayedexpansion

REM Release script for i cant code (Windows)
REM This script creates a new version tag and pushes it to trigger GitHub Actions

echo 🚀 i cant code Release Script
echo ================================

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Not in a git repository
    pause
    exit /b 1
)

REM Check if we have uncommitted changes
git diff-index --quiet HEAD -- >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Warning: You have uncommitted changes
    echo Please commit or stash them before releasing.
    echo.
    git status --short
    echo.
    set /p "continue=Continue anyway? (y/N): "
    if /i not "!continue!"=="y" (
        echo Release cancelled
        pause
        exit /b 1
    )
)

REM Get current version from package.json
for /f "tokens=*" %%i in ('node -p "require('./package.json').version"') do set CURRENT_VERSION=%%i
echo 📦 Current version: !CURRENT_VERSION!

echo.
echo What type of release is this?
echo 1) Patch (bug fixes)
echo 2) Minor (new features)  
echo 3) Major (breaking changes)
echo 4) Custom version
echo.

set /p "choice=Choose option (1-4): "

if "!choice!"=="1" (
    for /f "tokens=*" %%i in ('node -e "const semver = require('semver'); console.log(semver.inc('!CURRENT_VERSION!', 'patch'))"') do set NEW_VERSION=%%i
) else if "!choice!"=="2" (
    for /f "tokens=*" %%i in ('node -e "const semver = require('semver'); console.log(semver.inc('!CURRENT_VERSION!', 'minor'))"') do set NEW_VERSION=%%i
) else if "!choice!"=="3" (
    for /f "tokens=*" %%i in ('node -e "const semver = require('semver'); console.log(semver.inc('!CURRENT_VERSION!', 'major'))"') do set NEW_VERSION=%%i
) else if "!choice!"=="4" (
    set /p "NEW_VERSION=Enter custom version (e.g., 1.2.3): "
) else (
    echo ❌ Invalid option
    pause
    exit /b 1
)

echo.
echo 🎯 New version: !NEW_VERSION!

REM Confirm release
echo.
set /p "confirm=Create release v!NEW_VERSION!? (y/N): "
if /i not "!confirm!"=="y" (
    echo Release cancelled
    pause
    exit /b 1
)

REM Update package.json version
echo 📝 Updating package.json...
npm version !NEW_VERSION! --no-git-tag-version

REM Commit version change
echo 💾 Committing version change...
git add package.json package-lock.json
git commit -m "chore: bump version to !NEW_VERSION!"

REM Create and push tag
echo 🏷️  Creating tag v!NEW_VERSION!...
git tag -a "v!NEW_VERSION!" -m "Release v!NEW_VERSION!"

echo 📤 Pushing changes and tag...
git push origin main
git push origin "v!NEW_VERSION!"

echo.
echo ✅ Release v!NEW_VERSION! created successfully!
echo.
echo 📋 Next steps:
echo 1. GitHub Actions will automatically build your app
echo 2. Check the Actions tab in your repository
echo 3. Once builds complete, a release will be created
echo 4. Review and publish the release
echo.
echo 🔗 Useful links:
echo - Actions: https://github.com/yourusername/yourrepo/actions
echo - Releases: https://github.com/yourusername/yourrepo/releases
echo.
echo 🎉 Happy releasing!
pause
