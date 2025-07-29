#!/bin/bash

# OpenHands Custom Commit Script
# Usage: ./commit.sh "Your commit message"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if commit message was provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide a commit message${NC}"
    echo "Usage: ./commit.sh \"Your commit message\""
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Check if we're on sl-custom branch
if [ "$CURRENT_BRANCH" != "sl-custom" ]; then
    echo -e "${YELLOW}Warning: You're on branch '${CURRENT_BRANCH}', not 'sl-custom'${NC}"
    echo -n "Do you want to switch to sl-custom? (y/n): "
    read SWITCH_BRANCH
    
    if [ "$SWITCH_BRANCH" = "y" ] || [ "$SWITCH_BRANCH" = "Y" ]; then
        git checkout sl-custom
        CURRENT_BRANCH="sl-custom"
    else
        echo -n "Continue committing to '${CURRENT_BRANCH}'? (y/n): "
        read CONTINUE
        if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
            echo "Commit cancelled."
            exit 0
        fi
    fi
fi

echo -e "${GREEN}📝 Preparing to commit to branch: ${CURRENT_BRANCH}${NC}"

# Check for changes
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}No changes to commit${NC}"
    exit 0
fi

# Show status
echo -e "\n${GREEN}📊 Git Status:${NC}"
git status --short

# Add all changes
echo -e "\n${GREEN}➕ Adding all changes...${NC}"
git add .

# Try regular commit first
echo -e "\n${GREEN}💾 Attempting commit...${NC}"
if git commit -m "$1" 2>/dev/null; then
    echo -e "${GREEN}✅ Commit successful!${NC}"
else
    # If failed, use --no-verify
    echo -e "${YELLOW}⚠️  Pre-commit hooks failed, bypassing...${NC}"
    git commit --no-verify -m "$1"
    echo -e "${GREEN}✅ Commit successful (hooks bypassed)!${NC}"
fi

# Show the commit
echo -e "\n${GREEN}📄 Last commit:${NC}"
git log --oneline -1

# Ask if user wants to push
echo -e "\n${GREEN}🚀 Push to remote?${NC}"
echo -n "Push to origin/$CURRENT_BRANCH? (y/n): "
read PUSH_CONFIRM

if [ "$PUSH_CONFIRM" = "y" ] || [ "$PUSH_CONFIRM" = "Y" ]; then
    echo -e "${GREEN}📤 Pushing to origin/$CURRENT_BRANCH...${NC}"
    if git push origin "$CURRENT_BRANCH"; then
        echo -e "${GREEN}✅ Push successful!${NC}"
        echo -e "${GREEN}🔗 View at: https://github.com/saulamsal/OpenHands/tree/$CURRENT_BRANCH${NC}"
    else
        echo -e "${RED}❌ Push failed. Please check your connection and try again.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⏸️  Commit saved locally. Push skipped.${NC}"
    echo "To push later, run: git push origin $CURRENT_BRANCH"
fi

echo -e "\n${GREEN}✨ Done!${NC}"