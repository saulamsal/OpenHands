# How to Run Debug Scripts

## 🚨 IMPORTANT: Run from Project Root Directory

You must be in `/Users/saul_sharma/projects/startup/qlurplatform/` when running these scripts.

## 1. Simple Test (No Python Required)

```bash
# From project root:
cd /Users/saul_sharma/projects/startup/qlurplatform
./test_minio_simple.sh
```

This will show:
- Current FILE_STORE setting
- MinIO connection status
- Local storage usage

## 2. Python Debug Scripts (Requires Poetry)

Since the project uses Poetry for dependencies, run the Python scripts like this:

```bash
# From project root:
cd /Users/saul_sharma/projects/startup/qlurplatform

# Run storage configuration debug:
poetry run python debug_storage_config.py

# Install boto3 first, then run MinIO debug:
poetry add boto3
poetry run python debug_minio_storage.py
```

## 3. Quick Check if MinIO is Enabled

```bash
# From project root:
grep "^FILE_STORE=" .env
```

Should show: `FILE_STORE=s3`

## 4. After Changing .env

**ALWAYS restart the backend after changing .env:**

```bash
# Stop current server (Ctrl+C)
# Then restart:
./run_saas.sh
```

## Common Issues

1. **"No such file or directory"** - You're in the wrong directory. CD to project root.
2. **"Module not found"** - Use `poetry run` prefix for Python scripts
3. **MinIO still empty** - Did you restart the backend after enabling MinIO?

## Expected Results

After enabling MinIO and restarting:
1. New conversations will store events in MinIO
2. MinIO bucket will show: `users/{user_id}/conversations/{conversation_id}/events/`
3. Frontend will auto-redirect after creating conversations