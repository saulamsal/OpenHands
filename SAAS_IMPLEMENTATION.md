# OpenHands SaaS Implementation

This document outlines the SaaS implementation for OpenHands, transforming it from a single-user application to a multi-tenant SaaS platform with Laravel-like features.

## Overview

The implementation adds database-backed authentication, team management, and multi-tenant storage following Laravel Jetstream patterns.

## Key Features

### 1. Authentication (Laravel Sanctum equivalent)
- JWT-based authentication using FastAPI-Users
- User registration with automatic personal team creation
- Protected API endpoints
- Anonymous user support for backward compatibility

### 2. Database Models (Eloquent equivalent)
- **User**: Authentication and user profile
- **Team**: Multi-tenant teams with personal teams
- **TeamMember**: Team membership with roles (Owner, Admin, Developer, Viewer)
- **ConversationDB**: Database-backed conversation metadata
- **UserSettings**: User preferences storage

### 3. Database Storage
- PostgreSQL as the primary database
- SQLAlchemy ORM (Eloquent equivalent)
- Alembic for migrations (Laravel Migrations equivalent)
- Hybrid storage: metadata in DB, files in S3/local storage

### 4. Configuration
- Environment-based configuration (.env.saas)
- Custom DatabaseServerConfig for SaaS mode
- Backward compatible with file-based storage

## Quick Start

1. **Database Setup**
```bash
# PostgreSQL connection details in .env.saas
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=qlurplatform
DB_USERNAME=postgres
DB_PASSWORD=postgres
```

2. **Run in SaaS Mode**
```bash
./run_saas.sh
```

This script:
- Sets up the database
- Runs migrations
- Starts the server with database auth

3. **Test the Implementation**
```bash
python test_saas.py
```

## API Endpoints

### Authentication
- `POST /api/auth/register-with-team` - Register with personal team
- `POST /api/auth/jwt/login` - Login (returns JWT token)
- `GET /api/auth/users/me` - Get current user profile

### Teams
- `GET /api/teams/` - List user's teams
- `POST /api/teams/` - Create new team
- `GET /api/teams/{team_id}` - Get team details
- `POST /api/teams/{team_id}/members` - Add team member

## Architecture Decisions

### Laravel Pattern Equivalents
- **FastAPI-Users** → Laravel Sanctum
- **SQLAlchemy** → Eloquent ORM
- **Alembic** → Laravel Migrations
- **Pydantic** → Laravel Requests/Resources
- **Dependency Injection** → Laravel Service Container

### Storage Strategy
- **User Data**: PostgreSQL database
- **Conversation Events**: File storage (S3/MinIO)
- **Settings**: Database with encryption for secrets

### Multi-tenancy
- Team-based isolation
- Personal teams (Jetstream pattern)
- Role-based access control

## Future Enhancements

1. **Email Verification**
   - Add email verification flow
   - Password reset functionality

2. **Team Collaboration**
   - Real-time collaboration features
   - Shared conversation access

3. **Billing Integration**
   - Subscription management
   - Usage tracking

4. **Frontend Updates**
   - Auth UI components
   - Team management interface

## Environment Variables

Key environment variables for SaaS mode:

```env
# Storage
STORAGE_BACKEND=database
FILE_STORE=local
FILE_STORE_PATH=./workspace

# Authentication
JWT_SECRET=your-secret-key-change-this-in-production

# Server
PORT=3001
HOST=0.0.0.0
SERVE_FRONTEND=false

# Features
OPENHANDS_CONFIG_CLS=openhands.server.config.database_server_config.DatabaseServerConfig
```

## Database Schema

The database schema includes:
- Users table with authentication fields
- Teams table with ownership
- Team members junction table
- Conversations with user/team associations
- Settings and API keys

Run migrations to create/update schema:
```bash
poetry run alembic upgrade head
```

## Security Considerations

1. **JWT Tokens**: Change SECRET in production
2. **Database Credentials**: Use environment variables
3. **Password Hashing**: Automatic via FastAPI-Users
4. **API Rate Limiting**: Built-in middleware

## Monitoring

- Database queries logged
- User actions tracked
- API performance metrics available

This implementation provides a solid foundation for running OpenHands as a SaaS platform while maintaining compatibility with the original single-user mode.