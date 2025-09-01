#!/bin/bash

# Extract Website to Private Repository Script
# This script helps separate the website directory into its own private repository

set -e

echo "🚀 Website Extraction Script"
echo "=============================="

# Configuration
WEBSITE_DIR="website"
TEMP_DIR="temp-website-extract"
NEW_REPO_NAME="i-cant-code-website-private"
CURRENT_BRANCH=$(git branch --show-current)

echo "📋 Current Configuration:"
echo "  - Website directory: $WEBSITE_DIR"
echo "  - Current branch: $CURRENT_BRANCH"
echo "  - New repository name: $NEW_REPO_NAME"
echo ""

# Check if website directory exists
if [ ! -d "$WEBSITE_DIR" ]; then
    echo "❌ Error: Website directory '$WEBSITE_DIR' not found!"
    exit 1
fi

echo "🔍 Checking current git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes in your repository."
    echo "   Please commit or stash them before proceeding."
    read -p "   Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted by user."
        exit 1
    fi
fi

echo ""
echo "📦 Step 1: Creating temporary directory..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo "📦 Step 2: Copying website files..."
cp -r "$WEBSITE_DIR"/* "$TEMP_DIR/"

echo "📦 Step 3: Creating new repository structure..."
cd "$TEMP_DIR"

# Create new package.json with updated name
if [ -f "package.json" ]; then
    echo "📝 Updating package.json..."
    # Update the name in package.json
    sed -i.bak 's/"name": "i-cant-code-website"/"name": "i-cant-code-website-private"/' package.json
    rm package.json.bak
fi

# Create new README for the private repository
cat > README.md << 'EOF'
# i cant code - Website (Private Repository)

This is the private repository for the "i cant code" website.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

## 🔗 Production URL
https://i-cant-code.vercel.app

## 📝 Notes
- This is a private repository for the website only
- Main app repository: https://github.com/danrublop/I-can-t-code-translator
- Deployed on Vercel with automatic deployments

## 🔧 Environment Variables
Make sure to set up the following environment variables in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 📦 Deployment
This repository is automatically deployed to Vercel when changes are pushed to the main branch.
EOF

# Create .gitignore for the new repository
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js
.next/
out/

# Production
build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
EOF

echo "📦 Step 4: Initializing git repository..."
git init
git add .
git commit -m "Initial commit: Extract website from main repository"

echo ""
echo "✅ Website extraction completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Create a new private repository on GitHub named '$NEW_REPO_NAME'"
echo "2. Add the remote origin:"
echo "   git remote add origin https://github.com/danrublop/$NEW_REPO_NAME.git"
echo "3. Push to the new repository:"
echo "   git push -u origin main"
echo "4. Update Vercel deployment to point to the new repository"
echo "5. Remove the website directory from the main repository"
echo ""
echo "📁 Extracted files are in: $TEMP_DIR"
echo ""

# Go back to original directory
cd ..

echo "🔗 Useful Commands:"
echo "cd $TEMP_DIR"
echo "git remote add origin https://github.com/danrublop/$NEW_REPO_NAME.git"
echo "git push -u origin main"
echo ""
echo "🎉 Ready to create your private repository!"
