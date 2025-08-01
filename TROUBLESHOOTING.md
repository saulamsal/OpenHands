# OpenHands Troubleshooting Guide

## Common Issues and Solutions

### 1. Conversation Stuck at "Connecting"

**Symptoms**: Frontend shows "Connecting..." indefinitely

**Root Causes**:
1. WebSocket connection fails during validation
2. Conversation not found in database
3. User ID mismatch between frontend and backend

**Solutions Applied**:
```python
# Fixed in conversation_validator.py
# Now finds conversation by ID first, then uses correct user_id
```

### 2. Asyncio Runtime Error

**Symptom**: `RuntimeError: asyncio.run() cannot be called from a running event loop`

**Root Cause**: Using `asyncio.run()` inside an async function

**Solution Applied**:
```python
# In session.py, changed:
model, api_key, base_url = asyncio.run(resolve_config())
# To:
model, api_key, base_url = await resolve_config()
```

### 3. Conversation Not Starting

**Symptom**: New conversations have "STARTING" status but don't initialize

**Root Cause**: Frontend only started conversations with "STOPPED" status

**Solution Applied**:
```typescript
// In conversation.tsx, changed:
if (conversation?.status === "STOPPED")
// To:
if (conversation?.status === "STOPPED" || conversation?.status === "STARTING")
```

### 4. MinIO SSL Warnings

**Symptom**: InsecureRequestWarning messages in logs

**Root Cause**: Self-signed certificate for MinIO

**Solution**: This is expected in development. Set `AWS_S3_VERIFY_SSL=false` in `.env`

### 5. SQLAlchemy Connection Warnings

**Symptom**: "Garbage collector trying to clean up non-checked-in connection"

**Root Cause**: Database sessions not properly closed in some code paths

**Status**: Non-critical warning, doesn't affect functionality

## Debugging Commands

### Check Database Connectivity
```bash
poetry run python -c "
import asyncio
from openhands.storage.database.session import get_async_session_context
from sqlalchemy import text

async def test_db():
    async with get_async_session_context() as db:
        result = await db.execute(text('SELECT 1'))
        print('Database connection successful')

asyncio.run(test_db())"
```

### Check MinIO Storage
```bash
poetry run python -c "
import boto3
s3 = boto3.client('s3', 
    endpoint_url='https://minio.herd.test',
    aws_access_key_id='herd',
    aws_secret_access_key='secretkey',
    verify=False)
print(s3.list_buckets())"
```

### Check Docker Runtime
```bash
docker ps | grep openhands-runtime
```

### View Conversation in Database
```bash
poetry run python -c "
import asyncio
from openhands.storage.database.session import get_async_session_context
from sqlalchemy import text

async def check():
    async with get_async_session_context() as db:
        result = await db.execute(
            text('SELECT conversation_id, status, created_at FROM conversations ORDER BY created_at DESC LIMIT 5')
        )
        for row in result:
            print(row)

asyncio.run(check())"
```

## Log Locations

- **Server Logs**: Terminal output from `./run_server.sh`
- **Frontend Logs**: Browser DevTools Console
- **Docker Logs**: `docker logs openhands-runtime-{conversation_id}`
- **Application Logs**: `./logs/` directory

## Environment Variables Reference

Critical settings in `.env`:

```bash
# Storage
STORAGE_BACKEND=database        # Use PostgreSQL
FILE_STORE=s3                  # Use MinIO for events
RUNTIME=docker                 # Use Docker containers

# Database
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=qlurplatform

# MinIO
AWS_S3_ENDPOINT=https://minio.herd.test
AWS_S3_BUCKET=qlurplatform
AWS_S3_VERIFY_SSL=false

# Runtime
SANDBOX_VOLUMES=./workspace:/workspace:rw
```

## Quick Fixes

### Reset Everything
```bash
# Stop all services
pkill -f "openhands.server"
docker stop $(docker ps -q --filter name=openhands-runtime)

# Clear workspace
rm -rf ./workspace/*

# Restart
./run_server.sh
```

### Force Rebuild Frontend
```bash
cd frontend
rm -rf build/
npm run build
npm run dev
```

### Clear Database Conversations
```sql
-- Connect to PostgreSQL and run:
DELETE FROM conversations WHERE created_at < NOW() - INTERVAL '1 day';
```