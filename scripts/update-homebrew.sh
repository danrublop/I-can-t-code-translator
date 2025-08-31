#!/bin/bash

# Script to update Homebrew formula after a release
# Usage: ./scripts/update-homebrew.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍺 Updating Homebrew formula...${NC}"
echo ""

# Get current version from package.json
VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📋 Current version: ${VERSION}${NC}"

# Check if release exists on GitHub
DMG_URL="https://github.com/danrublop/I-can-t-code-translator/releases/download/v${VERSION}/i-cant-code-mac.dmg"

echo -e "${YELLOW}🔍 Checking if release v${VERSION} exists...${NC}"
if ! curl -s --head "$DMG_URL" | head -n 1 | grep -q "200 OK"; then
    echo -e "${RED}❌ Release v${VERSION} not found on GitHub!${NC}"
    echo "Make sure the GitHub Actions workflow completed successfully."
    echo "Check: https://github.com/danrublop/I-can-t-code-translator/releases"
    exit 1
fi

echo -e "${GREEN}✅ Release found!${NC}"

# Calculate SHA256
echo -e "${YELLOW}🔐 Calculating SHA256 hash...${NC}"
SHA256=$(curl -sL "$DMG_URL" | shasum -a 256 | cut -d' ' -f1)

if [ -z "$SHA256" ]; then
    echo -e "${RED}❌ Failed to calculate SHA256${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SHA256: ${SHA256}${NC}"

# Check if Homebrew directory exists
HOMEBREW_DIR="/Users/daniellopez/homebrew-i-cant-code"
if [ ! -d "$HOMEBREW_DIR" ]; then
    echo -e "${RED}❌ Homebrew directory not found: ${HOMEBREW_DIR}${NC}"
    exit 1
fi

# Update the Homebrew formula
CASK_FILE="$HOMEBREW_DIR/Casks/i-cant-code.rb"

echo -e "${YELLOW}📝 Updating Homebrew formula...${NC}"

# Create a backup
cp "$CASK_FILE" "$CASK_FILE.backup"

# Update version and SHA256
sed -i '' "s/version \".*\"/version \"${VERSION}\"/" "$CASK_FILE"
sed -i '' "s/sha256 \".*\"/sha256 \"${SHA256}\"/" "$CASK_FILE"

echo -e "${GREEN}✅ Formula updated!${NC}"

# Show the changes
echo -e "${BLUE}📋 Changes made:${NC}"
echo "  Version: ${VERSION}"
echo "  SHA256: ${SHA256}"

# Change to Homebrew directory and commit
cd "$HOMEBREW_DIR"

# Check if there are changes
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  No changes detected in Homebrew formula${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}📤 Git status:${NC}"
git status --short

echo ""
read -p "Commit and push Homebrew formula update? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏸️  Changes made but not committed${NC}"
    echo "You can review and commit manually in: $HOMEBREW_DIR"
    exit 0
fi

# Commit and push
git add Casks/i-cant-code.rb
git commit -m "Update i-cant-code to v${VERSION}

- Version: ${VERSION}
- SHA256: ${SHA256}
- Release: https://github.com/danrublop/I-can-t-code-translator/releases/tag/v${VERSION}"

git push origin main

echo ""
echo -e "${GREEN}🎉 Homebrew formula updated successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Users can now update with:${NC}"
echo "  brew upgrade --cask i-cant-code"
echo ""
echo -e "${BLUE}🧪 Test the update:${NC}"
echo "  brew uninstall --cask i-cant-code"
echo "  brew install --cask danrublop/i-cant-code/i-cant-code"
