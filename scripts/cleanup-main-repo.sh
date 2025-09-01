#!/bin/bash

# Cleanup Main Repository Script
# This script removes the website directory from the main repository after extraction

set -e

echo "🧹 Main Repository Cleanup Script"
echo "=================================="

WEBSITE_DIR="website"
CURRENT_BRANCH=$(git branch --show-current)

echo "📋 Current Configuration:"
echo "  - Website directory: $WEBSITE_DIR"
echo "  - Current branch: $CURRENT_BRANCH"
echo ""

# Check if website directory exists
if [ ! -d "$WEBSITE_DIR" ]; then
    echo "❌ Error: Website directory '$WEBSITE_DIR' not found!"
    echo "   It may have already been removed or the extraction hasn't been completed."
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
echo "⚠️  WARNING: This will permanently remove the website directory from this repository!"
echo "   Make sure you have:"
echo "   1. ✅ Successfully extracted the website to a separate private repository"
echo "   2. ✅ Updated Vercel deployment to point to the new repository"
echo "   3. ✅ Tested that the website still works from the new repository"
echo ""
read -p "   Are you sure you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted by user."
    exit 1
fi

echo ""
echo "📦 Step 1: Removing website directory..."
rm -rf "$WEBSITE_DIR"

echo "📦 Step 2: Updating .gitignore to exclude website directory..."
# Add website directory to .gitignore if not already present
if [ -f ".gitignore" ]; then
    if ! grep -q "^website/$" .gitignore; then
        echo "" >> .gitignore
        echo "# Website (now in separate private repository)" >> .gitignore
        echo "website/" >> .gitignore
        echo "✅ Added website/ to .gitignore"
    else
        echo "ℹ️  website/ already in .gitignore"
    fi
else
    echo "# Website (now in separate private repository)" > .gitignore
    echo "website/" >> .gitignore
    echo "✅ Created .gitignore with website/ exclusion"
fi

echo "📦 Step 3: Creating commit for website removal..."
git add .
git commit -m "Remove website directory (moved to separate private repository)

- Website code moved to: https://github.com/danrublop/i-cant-code-website-private
- Website deployment: https://i-cant-code.vercel.app
- Main app repository now focuses on Electron app only"

echo ""
echo "✅ Cleanup completed successfully!"
echo ""
echo "📋 Summary of changes:"
echo "  - ✅ Removed website/ directory"
echo "  - ✅ Updated .gitignore"
echo "  - ✅ Created commit with removal message"
echo ""
echo "🔗 Next Steps:"
echo "1. Push the changes to GitHub:"
echo "   git push origin $CURRENT_BRANCH"
echo "2. Verify the main repository is cleaner and focused on the Electron app"
echo "3. Test that your app still works correctly"
echo ""
echo "🎉 Main repository cleanup complete!"
