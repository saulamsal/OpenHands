#!/bin/bash

# Script to run OpenHands in SaaS mode with database backend

echo "Starting OpenHands in SaaS mode..."

# Check if .env.saas exists
if [ ! -f .env.saas ]; then
    echo "Error: .env.saas file not found!"
    echo "Please create .env.saas with your database configuration"
    exit 1
fi

# Backup existing .env if it exists
if [ -f .env ]; then
    echo "Backing up existing .env to .env.backup..."
    cp .env .env.backup
fi

# Use SaaS configuration
cp .env.saas .env

# Load environment variables
set -a  # Enable auto-export
source .env
set +a  # Disable auto-export

# Check if database exists
echo "Checking database connection..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_DATABASE -c "SELECT 1" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Database connection failed. Creating database..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -c "CREATE DATABASE $DB_DATABASE" 2>&1
fi

# Run migrations
echo "Running database migrations..."
poetry run alembic upgrade head

# Use the database server config
export OPENHANDS_CONFIG_CLS=openhands.server.config.database_server_config.DatabaseServerConfig

# Start the server
echo "Starting server on port $PORT..."
poetry run python -m openhands.server
