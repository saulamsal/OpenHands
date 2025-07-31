#!/bin/bash
# Simple script to test MinIO configuration

echo "=========================================="
echo "MinIO Configuration Test"
echo "=========================================="
echo ""

# Check environment variables
echo "1. Checking Environment Variables:"
echo "   FILE_STORE: $(grep '^FILE_STORE=' .env | cut -d'=' -f2)"
echo "   AWS_S3_BUCKET: $(grep '^AWS_S3_BUCKET=' .env | cut -d'=' -f2)"
echo "   AWS_S3_ENDPOINT: $(grep '^AWS_S3_ENDPOINT=' .env | cut -d'=' -f2)"
echo ""

# Test MinIO connection with curl
echo "2. Testing MinIO Connection:"
MINIO_URL=$(grep '^AWS_S3_ENDPOINT=' .env | cut -d'=' -f2)
if [ ! -z "$MINIO_URL" ]; then
    echo "   Trying to connect to: $MINIO_URL"
    curl -k -s -o /dev/null -w "   Connection status: %{http_code}\n" "$MINIO_URL" || echo "   Connection failed"
else
    echo "   ERROR: MinIO URL not found in .env"
fi
echo ""

# Check if events are being stored locally
echo "3. Checking Local Storage:"
if [ -d "./workspace" ]; then
    echo "   ./workspace directory exists"
    echo "   Number of files: $(find ./workspace -type f | wc -l)"
    echo "   Recent event files:"
    find ./workspace -name "*.json" -type f -mtime -1 | head -5 | sed 's/^/      /'
else
    echo "   ./workspace directory does not exist"
fi
echo ""

echo "=========================================="
echo "SUMMARY:"
if grep -q '^FILE_STORE=s3' .env; then
    echo "✅ MinIO is ENABLED in .env"
    echo "✅ Events should be stored in MinIO bucket: $(grep '^AWS_S3_BUCKET=' .env | cut -d'=' -f2)"
else
    echo "❌ MinIO is DISABLED in .env"
    echo "❌ Events are being stored locally"
fi
echo "=========================================="
echo ""
echo "To run with Poetry environment:"
echo "poetry run python debug_storage_config.py"