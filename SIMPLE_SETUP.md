# Simple Setup - Everything is Persistent Now! 🎉

## The Problem Was
- `run_saas.sh` was copying `.env.saas` over your `.env` file
- This was reverting MinIO back to local storage every time!

## The Solution
Use the new simple script that respects your `.env`:

```bash
./run_server.sh
```

## What This Does
1. Uses YOUR `.env` file (no more overwriting!)
2. Runs database migrations
3. Starts server with database + MinIO storage
4. Everything is persistent - no more local/SaaS distinction

## Quick Start

### Backend (Terminal 1):
```bash
./run_server.sh
```

### Frontend (Terminal 2):
```bash
cd frontend
npm run dev
```

## Verify MinIO is Working

After creating a conversation, check MinIO:
1. Go to https://minio.herd.test
2. Login with: herd / secretkey
3. Navigate: qlurplatform → users → {user_id} → conversations → {conversation_id} → events
4. You should see JSON files!

## That's It!

- ✅ No more confusing SaaS/non-SaaS modes
- ✅ Everything uses database + MinIO
- ✅ All data is persistent
- ✅ Simple, clean setup

## Troubleshooting

If MinIO is still empty:
1. Make sure `.env` has `FILE_STORE=s3`
2. Restart the server
3. Create a NEW conversation (old ones used local storage)