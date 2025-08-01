# OpenHands Encryption Setup Guide

## Overview

OpenHands uses AES-256 encryption (via Fernet) to securely store LLM API keys in the database. This ensures that sensitive API keys are never stored in plain text.

## Quick Start

### 1. Automatic Setup (Recommended)

Run the setup script:
```bash
./setup_encryption.sh
```

This script will:
- Check if an encryption key exists
- Generate a new secure key if needed
- Update your `.env` file
- Create a backup of your settings

### 2. Manual Setup

Add this to your `.env` file:
```bash
# Generate a new key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Add to .env
OPENHANDS_ENCRYPTION_KEY=your-generated-key-here
```

## Important Security Notes

### ⚠️ Production Deployment

1. **Never use the default key in production**
   - The default key is only for development/testing
   - Generate a unique key for each environment

2. **Secure Key Storage**
   - Store the key in a secure location (e.g., AWS Secrets Manager, HashiCorp Vault)
   - Never commit the key to version control
   - Back up the key securely

3. **Key Rotation**
   - Plan for key rotation in production
   - Keep old keys to decrypt historical data
   - Update all API keys when rotating the encryption key

### 🔒 Key Management Best Practices

1. **Environment-Specific Keys**
   ```bash
   # Development
   OPENHANDS_ENCRYPTION_KEY=dev-key-only-for-local

   # Staging
   OPENHANDS_ENCRYPTION_KEY=staging-key-different

   # Production
   OPENHANDS_ENCRYPTION_KEY=production-key-super-secure
   ```

2. **Backup Strategy**
   - Keep encrypted backups of your encryption keys
   - Store backups in multiple secure locations
   - Test key recovery procedures regularly

3. **Access Control**
   - Limit who has access to encryption keys
   - Use proper file permissions (600 for .env)
   - Audit key access regularly

## Troubleshooting

### "Failed to decrypt API key" Error

This happens when:
1. No encryption key is set
2. Wrong encryption key is used
3. API key was encrypted with a different key

**Solution:**
1. Ensure `OPENHANDS_ENCRYPTION_KEY` is set in `.env`
2. If you lost the key, you'll need to:
   - Delete existing LLM configurations
   - Set a new encryption key
   - Re-enter all API keys

### "No encryption key found" Warning

The system generates a temporary key if none is set, but this causes issues:
- Different key each time = can't decrypt stored keys
- Data loss on restart

**Solution:** Always set `OPENHANDS_ENCRYPTION_KEY` in your `.env` file

### Testing Encryption

Test your setup:
```bash
# Start the server
./run_server.sh

# Check the output for:
# ✅ Encryption: Key configured (UwXPuV4U...)
```

## Migration from Legacy Storage

If you had API keys stored before encryption:
1. Set up your encryption key
2. Re-enter API keys through the UI
3. Old unencrypted keys will be ignored

## Using with Docker

Add to your Docker environment:
```yaml
environment:
  - OPENHANDS_ENCRYPTION_KEY=${OPENHANDS_ENCRYPTION_KEY}
```

Or in docker-compose:
```yaml
env_file:
  - .env
```

## CI/CD Integration

For GitHub Actions:
```yaml
env:
  OPENHANDS_ENCRYPTION_KEY: ${{ secrets.OPENHANDS_ENCRYPTION_KEY }}
```

For other CI systems, add the key as a secure environment variable.

## Recovery Procedures

If you lose your encryption key:
1. All encrypted API keys become unrecoverable
2. You'll need to:
   - Generate a new encryption key
   - Delete all LLM configurations from the database
   - Re-enter all API keys through the UI

Prevent this by:
- Backing up your encryption key securely
- Documenting your key management procedures
- Testing recovery procedures regularly