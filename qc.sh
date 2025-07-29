#!/bin/bash

# Quick Commit Script - Even simpler version
# Usage: ./qc.sh "Your commit message"

if [ -z "$1" ]; then
    echo "Usage: ./qc.sh \"Your commit message\""
    exit 1
fi

# Quick commit and push
git add .
git commit --no-verify -m "$1"
git push origin sl-custom

echo "✅ Done! Committed and pushed to sl-custom"