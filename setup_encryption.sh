#!/bin/bash

# OpenHands Encryption Key Setup Script
# This script helps set up the encryption key for LLM API storage

echo "=========================================="
echo "OpenHands Encryption Key Setup"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file first."
    exit 1
fi

# Load current environment
set -a
source .env
set +a

# Check if encryption key already exists
if [ ! -z "$OPENHANDS_ENCRYPTION_KEY" ]; then
    echo "✅ Encryption key already configured:"
    echo "   Key: ${OPENHANDS_ENCRYPTION_KEY:0:8}..."
    echo ""
    
    # Check if it's the default key
    if [ "$OPENHANDS_ENCRYPTION_KEY" = "UwXPuV4UzwAl19qgPeLSyiRzb8dqElhfCJOhu_mcSTM=" ]; then
        echo "⚠️  WARNING: You're using the default encryption key!"
        echo "This is fine for development, but NOT secure for production."
        echo ""
        read -p "Generate a new secure key? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Keeping current key."
            exit 0
        fi
    else
        echo "Your encryption key appears to be custom. Good!"
        exit 0
    fi
fi

# Generate new encryption key
echo "Generating new encryption key..."
NEW_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to generate key. Make sure cryptography is installed:"
    echo "   pip install cryptography"
    exit 1
fi

echo "✅ New encryption key generated!"
echo ""

# Backup .env file
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backed up .env file"

# Add or update encryption key in .env
if grep -q "^OPENHANDS_ENCRYPTION_KEY=" .env; then
    # Update existing key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/^OPENHANDS_ENCRYPTION_KEY=.*/OPENHANDS_ENCRYPTION_KEY=$NEW_KEY/" .env
    else
        # Linux
        sed -i "s/^OPENHANDS_ENCRYPTION_KEY=.*/OPENHANDS_ENCRYPTION_KEY=$NEW_KEY/" .env
    fi
    echo "✅ Updated encryption key in .env"
else
    # Add new key
    echo "" >> .env
    echo "# ====================
# Encryption Settings
# ====================
# IMPORTANT: Keep this key secure! Losing it means losing access to encrypted data.
# Generated on: $(date)
OPENHANDS_ENCRYPTION_KEY=$NEW_KEY" >> .env
    echo "✅ Added encryption key to .env"
fi

echo ""
echo "=========================================="
echo "IMPORTANT SECURITY NOTES:"
echo "=========================================="
echo "1. Keep this key secure - it protects all encrypted API keys"
echo "2. Back up this key in a secure location (password manager, vault, etc.)"
echo "3. If you lose this key, you'll need to re-enter all API keys"
echo "4. Never commit the .env file to version control"
echo "5. Use different keys for development and production"
echo ""
echo "Your new encryption key:"
echo "$NEW_KEY"
echo ""
echo "✅ Setup complete!"