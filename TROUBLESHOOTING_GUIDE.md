# Troubleshooting Guide - OpenHands Conversation System

## Current Issues & Solutions

### 1. 🐳 Docker Container Not Starting

**Symptoms:**
- Conversation stuck on "Connecting"
- No Docker container visible
- Agent not initializing

**Diagnosis Steps:**
```bash
# 1. Check Docker is running
./check_docker.sh

# 2. Check logs for runtime initialization
# Look for: "Initializing runtime `docker` now..."
# Look for: "Runtime class: DockerRuntime"
```

**Solutions:**
1. Ensure Docker Desktop is running
2. Check Docker permissions
3. Verify runtime configuration in `.env`:
   ```
   RUNTIME=docker
   SANDBOX_RUNTIME_CONTAINER_IMAGE=ghcr.io/all-hands-ai/runtime:oh_v0.50.0_t2h0d1xmsx5pxmch
   ```

### 2. 📦 MinIO Storage Issues

**Symptoms:**
- MinIO bucket is empty
- Logs show "Storing event to file storage" but no files in MinIO

**Diagnosis Steps:**
```bash
# 1. Test MinIO connection
poetry run python test_minio_connection.py

# 2. Check simple configuration
./test_minio_simple.sh

# 3. Check server logs for:
# "Initializing FileStore with type: s3"
# "FileStore initialized: S3FileStore"
```

**Solutions:**
1. Verify `.env` has `FILE_STORE=s3` (not `local`)
2. Check MinIO credentials are correct
3. Ensure bucket "qlurplatform" exists
4. Check MinIO is accessible at https://minio.herd.test

### 3. 🔌 WebSocket Connection Issues

**Symptoms:**
- Frontend stuck on "Connecting"
- WebSocket not upgrading

**Diagnosis Steps:**
1. Check browser console for WebSocket errors
2. Check Network tab for WS connection attempts
3. Look for CORS errors

**Solutions:**
1. Ensure backend is running on port 3000
2. Frontend on port 3001
3. CORS is already configured (`cors_allowed_origins='*'`)

## Quick Checklist

### Before Starting:
- [ ] Docker Desktop is running
- [ ] MinIO is accessible (https://minio.herd.test)
- [ ] PostgreSQL is running

### Configuration (.env):
- [ ] `FILE_STORE=s3` (not `local`)
- [ ] `RUNTIME=docker`
- [ ] MinIO credentials are set
- [ ] Database credentials are correct

### Starting Services:
```bash
# 1. Start backend
./run_server.sh

# 2. Start frontend (new terminal)
cd frontend
npm run dev

# 3. Watch logs for:
#    - "FileStore initialized: S3FileStore"
#    - "Initializing runtime `docker` now..."
#    - "Runtime connected successfully"
```

## Debug Commands

### 1. Test MinIO Storage
```bash
poetry run python test_minio_connection.py
```

### 2. Check Docker
```bash
./check_docker.sh
```

### 3. Simple MinIO Test
```bash
./test_minio_simple.sh
```

### 4. Check Logs
Look for these key messages:
- ✅ "FileStore initialized: S3FileStore"
- ✅ "Initializing runtime `docker` now..."
- ✅ "Runtime class: DockerRuntime"
- ✅ "Storing event to file storage (S3/MinIO)"

## Common Fixes

### MinIO Empty Despite Logs
1. **Wrong FileStore**: Server using LocalFileStore instead of S3FileStore
   - Fix: Ensure `FILE_STORE=s3` in `.env`
   - Restart server

2. **Path Issues**: Events stored in wrong location
   - Check: `users/{user_id}/conversations/{conversation_id}/events/`
   - Navigate through folders in MinIO UI

### Docker Not Starting
1. **Docker Not Running**: Start Docker Desktop
2. **Permissions**: Run `sudo usermod -aG docker $USER`
3. **Socket Issues**: Check `/var/run/docker.sock` exists

### Frontend Navigation Issues
1. **API Response**: Backend now returns correct ConversationResponse
2. **Cache**: Clear browser cache (Cmd+Shift+R)

## Expected Flow

1. Create conversation → API returns conversation_id
2. Frontend redirects to `/conversations/{id}`
3. WebSocket connects
4. Docker container starts
5. Agent initializes
6. Events stored in MinIO

## Still Having Issues?

1. **Restart Everything**:
   ```bash
   # Stop all services
   # Clear browser cache
   # Restart backend and frontend
   ```

2. **Check All Logs**:
   - Backend terminal for errors
   - Browser console for frontend errors
   - Docker logs: `docker logs <container_id>`

3. **Verify Storage**:
   - Run `poetry run python test_minio_connection.py`
   - Check MinIO dashboard
   - Look for test files created

Remember: After any `.env` changes, you MUST restart the backend server!