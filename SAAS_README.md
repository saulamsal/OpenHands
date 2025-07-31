# OpenHands SaaS Implementation

This implementation adds multi-tenant SaaS capabilities to OpenHands, similar to Laravel Jetstream.

## Features

### 🔐 Authentication & Authorization
- **JWT-based authentication** (like Laravel Sanctum)
- **User registration with email/password**
- **Personal teams** - Each user gets a personal team on registration (Jetstream pattern)
- **API key management** for programmatic access

### 👥 Team Management
- **Multiple teams per user** - Users can create and join multiple teams
- **Role-based permissions** - Owner, Admin, Developer, Viewer roles
- **Team invitations** - Invite users by email
- **Team conversations** - Share conversations within teams

### 💾 Database Storage
- **PostgreSQL database** for user data, teams, and metadata
- **Hybrid storage approach**:
  - User data, settings, and metadata in PostgreSQL
  - Large event streams in file storage (S3/MinIO)
- **Cost-effective** - Combines database reliability with file storage efficiency

### 🏗️ Architecture

```
Frontend (React) → FastAPI Backend → PostgreSQL Database
                                  ↘
                                    File Storage (Events)
```

## Quick Start

### 1. Database Setup

```bash
# Create the database
createdb qlurplatform

# Or using the provided credentials
PGPASSWORD=postgres psql -U postgres -c "CREATE DATABASE qlurplatform"
```

### 2. Configuration

Copy the example environment file:
```bash
cp .env.database.example .env
```

Edit `.env` with your settings:
```env
# Database
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=qlurplatform
DB_USERNAME=postgres
DB_PASSWORD=postgres

# Authentication
JWT_SECRET=your-secret-key-change-this

# Storage
STORAGE_BACKEND=database
```

### 3. Run Migrations

```bash
poetry run alembic upgrade head
```

### 4. Start the Server

```bash
# Using the convenience script
./run_saas.sh

# Or manually
export OPENHANDS_CONFIG_CLS=openhands.server.config.database_server_config.DatabaseServerConfig
poetry run python -m openhands.server
```

## API Endpoints

### Authentication

```bash
# Register a new user
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}

# Login
POST /api/auth/jwt/login
{
  "username": "user@example.com",
  "password": "securepassword"
}

# Get current user
GET /api/auth/users/me
Authorization: Bearer <token>
```

### Teams

```bash
# List user's teams
GET /api/teams
Authorization: Bearer <token>

# Create a team
POST /api/teams
{
  "name": "My Team"
}

# Invite a member
POST /api/teams/{team_id}/members
{
  "email": "colleague@example.com",
  "role": "developer"
}
```

## Database Schema

### Users
- Stores user accounts with hashed passwords
- Email verification support
- Profile information (name, avatar)

### Teams
- Team ownership and membership
- Personal teams (one per user, like Jetstream)
- Regular teams for collaboration

### Conversations
- Linked to users and optionally teams
- Metadata in database, events in file storage
- Cost tracking per conversation

## Laravel Comparisons

| Laravel | OpenHands Implementation |
|---------|-------------------------|
| Jetstream | Personal teams on registration |
| Sanctum | JWT authentication with FastAPI-Users |
| Eloquent | SQLAlchemy ORM |
| Migrations | Alembic migrations |
| Form Requests | Pydantic schemas |
| Middleware | FastAPI dependencies |

## Security

- **Password hashing** with bcrypt
- **JWT tokens** with expiration
- **Team-based access control**
- **Encrypted secrets storage** (TODO: implement encryption)

## Next Steps

1. **Frontend Integration** - Add login/register forms to React frontend
2. **Email Verification** - Implement email sending for verification
3. **Password Reset** - Add forgot password flow
4. **OAuth Providers** - Add GitHub/Google login
5. **Billing Integration** - Add Stripe for subscriptions

## Testing

```bash
# Create a test user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123", "name": "Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/jwt/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=testpass123"

# Use the token
export TOKEN="<token-from-login>"
curl http://localhost:3000/api/auth/users/me \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check credentials in `.env`
- Verify database exists

### Migration Issues
- Run `poetry install` to ensure dependencies
- Check database connection before migrations
- Use `alembic downgrade -1` to rollback

### Authentication Issues
- Ensure JWT_SECRET is set
- Check token expiration (default 1 hour)
- Verify STORAGE_BACKEND=database

## Architecture Decisions

1. **Hybrid Storage**: Database for metadata, files for large data
2. **JWT over Sessions**: Stateless authentication for scalability
3. **Personal Teams**: Every user gets a team, simplifying permissions
4. **PostgreSQL**: Better JSON support than MySQL for event metadata
5. **FastAPI-Users**: Battle-tested auth solution like Laravel Jetstream