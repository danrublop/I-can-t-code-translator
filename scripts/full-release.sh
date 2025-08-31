#!/bin/bash

# Complete release workflow: version bump → GitHub release → Homebrew update
# Usage: ./scripts/full-release.sh [patch|minor|major]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

RELEASE_TYPE=${1:-patch}

echo -e "${BLUE}🚀 Complete Release Workflow${NC}"
echo -e "${BLUE}=============================${NC}"
echo ""

# Step 1: Create GitHub release
echo -e "${YELLOW}Step 1: Creating GitHub release...${NC}"
./scripts/release.sh $RELEASE_TYPE

# Wait for user confirmation that GitHub Actions completed
echo ""
echo -e "${YELLOW}⏳ Waiting for GitHub Actions to complete...${NC}"
echo "The build usually takes 3-5 minutes."
echo ""
read -p "Has the GitHub Actions workflow completed successfully? (y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏸️  Please wait for the build to complete, then run:${NC}"
    echo "  ./scripts/update-homebrew.sh"
    exit 0
fi

# Step 2: Update Homebrew formula
echo ""
echo -e "${YELLOW}Step 2: Updating Homebrew formula...${NC}"
./scripts/update-homebrew.sh

echo ""
echo -e "${GREEN}🎉 Complete release workflow finished!${NC}"
echo ""
echo -e "${BLUE}📋 What was accomplished:${NC}"
echo "✅ Version bumped and tagged"
echo "✅ GitHub release created with DMG"
echo "✅ Homebrew formula updated"
echo ""
echo -e "${BLUE}📦 Distribution channels updated:${NC}"
echo "• Direct download (your website)"
echo "• GitHub Releases"
echo "• Homebrew (no security warnings)"
echo ""
echo -e "${BLUE}🧪 Test the update:${NC}"
echo "  brew upgrade --cask i-cant-code"
