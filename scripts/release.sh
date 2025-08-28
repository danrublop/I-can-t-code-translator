#!/bin/bash

# Release script for i cant code
# This script creates a new version tag and pushes it to trigger GitHub Actions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 i cant code Release Script${NC}"
echo "================================"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    echo "Please commit or stash them before releasing."
    echo ""
    git status --short
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📦 Current version: ${CURRENT_VERSION}${NC}"

# Ask for new version
echo ""
echo "What type of release is this?"
echo "1) Patch (bug fixes) - ${CURRENT_VERSION} → $(npx semver -i patch ${CURRENT_VERSION})"
echo "2) Minor (new features) - ${CURRENT_VERSION} → $(npx semver -i minor ${CURRENT_VERSION})"
echo "3) Major (breaking changes) - ${CURRENT_VERSION} → $(npx semver -i major ${CURRENT_VERSION})"
echo "4) Custom version"
echo ""

read -p "Choose option (1-4): " -n 1 -r
echo

case $REPLY in
    1)
        NEW_VERSION=$(npx semver -i patch ${CURRENT_VERSION})
        ;;
    2)
        NEW_VERSION=$(npx semver -i minor ${CURRENT_VERSION})
        ;;
    3)
        NEW_VERSION=$(npx semver -i major ${CURRENT_VERSION})
        ;;
    4)
        read -p "Enter custom version (e.g., 1.2.3): " NEW_VERSION
        ;;
    *)
        echo -e "${RED}❌ Invalid option${NC}"
        exit 1
        ;;
esac

# Validate version format
if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}❌ Invalid version format. Use semantic versioning (e.g., 1.2.3)${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🎯 New version: ${NEW_VERSION}${NC}"

# Confirm release
echo ""
read -p "Create release v${NEW_VERSION}? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Release cancelled${NC}"
    exit 1
fi

# Update package.json version
echo -e "${BLUE}📝 Updating package.json...${NC}"
npm version ${NEW_VERSION} --no-git-tag-version

# Commit version change
echo -e "${BLUE}💾 Committing version change...${NC}"
git add package.json package-lock.json
git commit -m "chore: bump version to ${NEW_VERSION}"

# Create and push tag
echo -e "${BLUE}🏷️  Creating tag v${NEW_VERSION}...${NC}"
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"

echo -e "${BLUE}📤 Pushing changes and tag...${NC}"
git push origin main
git push origin "v${NEW_VERSION}"

echo ""
echo -e "${GREEN}✅ Release v${NEW_VERSION} created successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. GitHub Actions will automatically build your app"
echo "2. Check the Actions tab in your repository"
echo "3. Once builds complete, a release will be created"
echo "4. Review and publish the release"
echo ""
echo -e "${BLUE}🔗 Useful links:${NC}"
echo "- Actions: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/')/actions"
echo "- Releases: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/')/releases"
echo ""
echo -e "${GREEN}🎉 Happy releasing!${NC}"
