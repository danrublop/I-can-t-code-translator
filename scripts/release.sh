#!/bin/bash

# Automated release script for "i cant code"
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default to patch if no argument provided
RELEASE_TYPE=${1:-patch}

echo -e "${BLUE}🚀 Starting release process for: ${RELEASE_TYPE}${NC}"
echo ""

# Validate release type
if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}❌ Invalid release type. Use: patch, minor, or major${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Run this script from the project root${NC}"
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
    git status --short
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Aborted${NC}"
        exit 1
    fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📋 Current version: ${CURRENT_VERSION}${NC}"

# Test the build
echo -e "${YELLOW}🧪 Testing build...${NC}"
if ! npm run build:prod; then
    echo -e "${RED}❌ Build failed! Fix errors before releasing.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"
echo ""

# Bump version
echo -e "${YELLOW}📈 Bumping version (${RELEASE_TYPE})...${NC}"
npm version $RELEASE_TYPE --no-git-tag-version

NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✅ Version updated: ${CURRENT_VERSION} → ${NEW_VERSION}${NC}"

# Create commit with version bump
git add package.json package-lock.json
git commit -m "chore: bump version to ${NEW_VERSION}

- ${RELEASE_TYPE} version bump
- ready for release"

# Create git tag
echo -e "${YELLOW}🏷️  Creating git tag: v${NEW_VERSION}${NC}"
git tag "v${NEW_VERSION}"

# Show what will be pushed
echo ""
echo -e "${BLUE}📤 Ready to push:${NC}"
echo "  - Commit: Version bump to ${NEW_VERSION}"
echo "  - Tag: v${NEW_VERSION}"
echo "  - This will trigger GitHub Actions to build and release"
echo ""

# Confirm push
read -p "Push to GitHub and trigger release? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏸️  Release prepared but not pushed. You can push manually:${NC}"
    echo "  git push origin main --follow-tags"
    exit 0
fi

# Push to GitHub
echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
git push origin main --follow-tags

echo ""
echo -e "${GREEN}🎉 Release v${NEW_VERSION} has been triggered!${NC}"
echo ""
echo -e "${BLUE}📋 What happens next:${NC}"
echo "1. GitHub Actions will build your app (~3-5 minutes)"
echo "2. A release will be created with the DMG file"
echo "3. Check progress: https://github.com/danrublop/I-can-t-code-translator/actions"
echo "4. Release will appear: https://github.com/danrublop/I-can-t-code-translator/releases"
echo ""
echo -e "${YELLOW}📝 Don't forget to:${NC}"
echo "1. Update Homebrew formula SHA256 (after build completes)"
echo "2. Test the Homebrew installation"
echo "3. Announce the release to users"
echo ""

# Offer to open GitHub Actions
read -p "Open GitHub Actions in browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "https://github.com/danrublop/I-can-t-code-translator/actions"
fi

echo -e "${GREEN}✅ Release process complete!${NC}"
