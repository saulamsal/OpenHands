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

# Show current configuration
echo ""
echo "Configuration:"
echo "  Database: $DB_DATABASE @ $DB_HOST:$DB_PORT"
echo "  Storage: $FILE_STORE"
if [ "$FILE_STORE" = "s3" ]; then
    echo "  MinIO: $AWS_S3_ENDPOINT (bucket: $AWS_S3_BUCKET)"
fi
echo ""

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