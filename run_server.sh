#!/bin/bash

# Simple unified server startup script
# Everything is now database + MinIO based (persistent storage)

echo "=========================================="
echo "Starting OpenHands Server"
echo "=========================================="

# Load environment variables from .env
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Load environment
set -a
source .env
set +a

# Check for encryption key
if [ -z "$OPENHANDS_ENCRYPTION_KEY" ]; then
    echo ""
    echo "⚠️  WARNING: No encryption key found!"
    echo ""
    echo "Generating a new encryption key..."
    NEW_KEY=$(poetry run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
    echo ""
    echo "Add this to your .env file:"
    echo "OPENHANDS_ENCRYPTION_KEY=$NEW_KEY"
    echo ""
    echo "❌ ERROR: Cannot start server without encryption key."
    echo ""
    echo "IMPORTANT FOR PRODUCTION:"
    echo "1. Add the encryption key to your .env file"
    echo "2. Keep this key secure - losing it means losing access to encrypted data"
    echo "3. Back up this key in a secure location"
    echo "4. Never commit the key to version control"
    echo ""
    exit 1
fi

# Validate encryption key format
poetry run python -c "
import sys
from cryptography.fernet import Fernet
try:
    Fernet('$OPENHANDS_ENCRYPTION_KEY'.encode())
except Exception as e:
    print(f'❌ Invalid encryption key format: {e}')
    print('Generate a new key with:')
    print('python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"')
    sys.exit(1)
" || exit 1

# Show current configuration
echo ""
echo "Configuration:"
echo "  Database: $DB_DATABASE @ $DB_HOST:$DB_PORT"
echo "  Storage: $FILE_STORE"
if [ "$FILE_STORE" = "s3" ]; then
    echo "  MinIO: $AWS_S3_ENDPOINT (bucket: $AWS_S3_BUCKET)"
fi
echo "  Encryption: ✅ Key configured (${OPENHANDS_ENCRYPTION_KEY:0:8}...)"
echo ""

# Production warning
if [ "$OPENHANDS_ENCRYPTION_KEY" = "UwXPuV4UzwAl19qgPeLSyiRzb8dqElhfCJOhu_mcSTM=" ]; then
    echo "⚠️  WARNING: Using default encryption key!"
    echo "⚠️  This is insecure for production. Generate a new key with:"
    echo "   python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
    echo ""
fi

# Run database migrations
echo "Running database migrations..."
poetry run alembic upgrade head

# Use database server config (for authentication & storage)
export OPENHANDS_CONFIG_CLS=openhands.server.config.database_server_config.DatabaseServerConfig

# Start the server
echo ""
echo "Starting server on port ${PORT:-3000}..."
echo "Frontend should be running on port 3001"
echo ""
poetry run python -m openhands.server