#!/bin/bash

# Dora Learning App - Push to GitHub Script
# Usage: ./push-to-github.sh

set -e

echo "🚀 Dora Learning App - GitHub Push Helper"
echo "=========================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "❌ Error: Not a git repository"
    echo "Make sure you're in the dora-learning-app directory"
    exit 1
fi

# Check if remote exists
if git remote | grep -q "origin"; then
    echo "✅ Remote 'origin' already exists"
    REMOTE_URL=$(git config --get remote.origin.url)
    echo "   URL: $REMOTE_URL"
else
    echo "⚠️  Remote 'origin' not found"
    echo ""
    echo "Please create the GitHub repository first:"
    echo "1. Go to https://github.com/new"
    echo "2. Name: dora-learning-app"
    echo "3. Public visibility"
    echo "4. Don't initialize with README/gitignore"
    echo "5. Click 'Create repository'"
    echo ""
    read -p "Enter your GitHub repo URL (e.g., https://github.com/santaclawbot/dora-learning-app.git): " REPO_URL
    
    if [ -z "$REPO_URL" ]; then
        echo "❌ No URL provided"
        exit 1
    fi
    
    git remote add origin "$REPO_URL"
    echo "✅ Remote added"
fi

echo ""
echo "Pushing to GitHub..."
echo "-------------------"

# Ensure main branch
git branch -M main

# Push
git push -u origin main

echo ""
echo "✅ Successfully pushed to GitHub!"
echo ""
echo "Repository: https://github.com/santaclawbot/dora-learning-app"
echo ""
echo "Next steps:"
echo "1. Clone: git clone https://github.com/santaclawbot/dora-learning-app.git"
echo "2. Setup: See SETUP.md or QUICKSTART.md for instructions"
echo ""
echo "Happy coding! 🎓"
