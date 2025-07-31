SaaS Transformation Plan for OpenHands                                                                                                                                                                      │ │
│ │                                                                                                                                                                                                             │ │
│ │ Current Architecture Analysis                                                                                                                                                                               │ │
│ │                                                                                                                                                                                                             │ │
│ │ OpenHands currently operates as a single-user application with:                                                                                                                                             │ │
│ │ - File-based storage through FileStore abstraction (local, S3, Google Cloud)                                                                                                                                │ │
│ │ - No authentication - DefaultUserAuth returns None for user_id                                                                                                                                              │ │
│ │ - Session-based conversations stored as files in the FileStore                                                                                                                                              │ │
│ │ - FastAPI backend with WebSocket support for real-time communication                                                                                                                                        │ │
│ │                                                                                                                                                                                                             │ │
│ │ Laravel → FastAPI Equivalents                                                                                                                                                                               │ │
│ │                                                                                                                                                                                                             │ │
│ │ Authentication & Authorization                                                                                                                                                                              │ │
│ │                                                                                                                                                                                                             │ │
│ │ - Laravel Sanctum → FastAPI-JWT-Auth or Authlib                                                                                                                                                             │ │
│ │   - Token-based authentication with JWT                                                                                                                                                                     │ │
│ │   - Session management similar to Sanctum's API tokens                                                                                                                                                      │ │
│ │   - Support for both cookie and bearer token auth                                                                                                                                                           │ │
│ │                                                                                                                                                                                                             │ │
│ │ Database ORM                                                                                                                                                                                                │ │
│ │                                                                                                                                                                                                             │ │
│ │ - Laravel Eloquent → SQLAlchemy with Alembic                                                                                                                                                                │ │
│ │   - Declarative ORM with relationships                                                                                                                                                                      │ │
│ │   - Database migrations like Laravel's migrations                                                                                                                                                           │ │
│ │   - Model events and observers                                                                                                                                                                              │ │
│ │                                                                                                                                                                                                             │ │
│ │ Real-time Features                                                                                                                                                                                          │ │
│ │                                                                                                                                                                                                             │ │
│ │ - Laravel Reverb/Echo → python-socketio (already in use)                                                                                                                                                    │ │
│ │   - WebSocket support for real-time updates                                                                                                                                                                 │ │
│ │   - Room-based broadcasting                                                                                                                                                                                 │ │
│ │                                                                                                                                                                                                             │ │
│ │ Queue System                                                                                                                                                                                                │ │
│ │                                                                                                                                                                                                             │ │
│ │ - Laravel Horizon → Celery with Redis                                                                                                                                                                       │ │
│ │   - Async task processing                                                                                                                                                                                   │ │
│ │   - Job monitoring dashboard                                                                                                                                                                                │ │
│ │                                                                                                                                                                                                             │ │
│ │ Testing                                                                                                                                                                                                     │ │
│ │                                                                                                                                                                                                             │ │
│ │ - Laravel Dusk → Playwright (already used)                                                                                                                                                                  │ │
│ │   - E2E testing framework                                                                                                                                                                                   │ │
│ │                                                                                                                                                                                                             │ │
│ │ Proposed Database Schema                                                                                                                                                                                    │ │
│ │                                                                                                                                                                                                             │ │
│ │ -- Users table (like Laravel's users migration)                                                                                                                                                             │ │
│ │ users:                                                                                                                                                                                                      │ │
│ │   - id (UUID)                                                                                                                                                                                               │ │
│ │   - email (unique)                                                                                                                                                                                          │ │
│ │   - password_hash                                                                                                                                                                                           │ │
│ │   - name                                                                                                                                                                                                    │ │
│ │   - email_verified_at                                                                                                                                                                                       │ │
│ │   - created_at                                                                                                                                                                                              │ │
│ │   - updated_at                                                                                                                                                                                              │ │
│ │                                                                                                                                                                                                             │ │
│ │ -- Teams table (like Jetstream)                                                                                                                                                                             │ │
│ │ teams:                                                                                                                                                                                                      │ │
│ │   - id (UUID)                                                                                                                                                                                               │ │
│ │   - name                                                                                                                                                                                                    │ │
│ │   - owner_id (FK users)                                                                                                                                                                                     │ │
│ │   - created_at                                                                                                                                                                                              │ │
│ │   - updated_at                                                                                                                                                                                              │ │
│ │                                                                                                                                                                                                             │ │
│ │ -- Team members (like Jetstream)                                                                                                                                                                            │ │
│ │ team_members:                                                                                                                                                                                               │ │
│ │   - team_id (FK teams)                                                                                                                                                                                      │ │
│ │   - user_id (FK users)                                                                                                                                                                                      │ │
│ │   - role (owner/admin/member)                                                                                                                                                                               │ │
│ │   - created_at                                                                                                                                                                                              │ │
│ │                                                                                                                                                                                                             │ │
│ │ -- Conversations (existing metadata, now in DB)                                                                                                                                                             │ │
│ │ conversations:                                                                                                                                                                                              │ │
│ │   - id (UUID, existing conversation_id)                                                                                                                                                                     │ │
│ │   - user_id (FK users)                                                                                                                                                                                      │ │
│ │   - team_id (FK teams, nullable)                                                                                                                                                                            │ │
│ │   - title                                                                                                                                                                                                   │ │
│ │   - selected_repository                                                                                                                                                                                     │ │
│ │   - selected_branch                                                                                                                                                                                         │ │
│ │   - git_provider                                                                                                                                                                                            │ │
│ │   - trigger                                                                                                                                                                                                 │ │
│ │   - status                                                                                                                                                                                                  │ │
│ │   - accumulated_cost                                                                                                                                                                                        │ │
│ │   - prompt_tokens                                                                                                                                                                                           │ │
│ │   - completion_tokens                                                                                                                                                                                       │ │
│ │   - created_at                                                                                                                                                                                              │ │
│ │   - last_updated_at                                                                                                                                                                                         │ │
│ │                                                                                                                                                                                                             │ │
│ │ -- User settings (existing, now in DB)                                                                                                                                                                      │ │
│ │ user_settings:                                                                                                                                                                                              │ │
│ │   - user_id (FK users)                                                                                                                                                                                      │ │
│ │   - settings_json                                                                                                                                                                                           │ │
│ │   - created_at                                                                                                                                                                                              │ │
│ │   - updated_at                                                                                                                                                                                              │ │
│ │                                                                                                                                                                                                             │ │
│ │ -- User secrets (existing, now encrypted in DB)                                                                                                                                                             │ │
│ │ user_secrets:                                                                                                                                                                                               │ │
│ │   - user_id (FK users)                                                                                                                                                                                      │ │
│ │   - encrypted_secrets                                                                                                                                                                                       │ │
│ │   - created_at                                                                                                                                                                                              │ │
│ │   - updated_at                                                                                                                                                                                              │ │
│ │                                                                                                                                                                                                             │ │
│ │ Implementation Plan                                                                                                                                                                                         │ │
│ │                                                                                                                                                                                                             │ │
│ │ Phase 1: Database Foundation (Minimal Changes)                                                                                                                                                              │ │
│ │                                                                                                                                                                                                             │ │
│ │ 1. Add SQLAlchemy + Alembic                                                                                                                                                                                 │ │
│ │   - Add dependencies: sqlalchemy, alembic, asyncpg/aiomysql                                                                                                                                                 │ │
│ │   - Create database models mirroring existing data structures                                                                                                                                               │ │
│ │   - Set up Alembic for migrations                                                                                                                                                                           │ │
│ │ 2. Create Database Storage Implementations                                                                                                                                                                  │ │
│ │   - DatabaseConversationStore implementing ConversationStore                                                                                                                                                │ │
│ │   - DatabaseSettingsStore implementing SettingsStore                                                                                                                                                        │ │
│ │   - DatabaseSecretsStore implementing SecretsStore                                                                                                                                                          │ │
│ │   - Keep existing file-based stores as fallback                                                                                                                                                             │ │
│ │ 3. Add Environment-based Configuration                                                                                                                                                                      │ │
│ │   - DATABASE_URL for connection string                                                                                                                                                                      │ │
│ │   - STORAGE_BACKEND to switch between file/database                                                                                                                                                         │ │
│ │   - Similar to Laravel's .env approach                                                                                                                                                                      │ │
│ │                                                                                                                                                                                                             │ │
│ │ Phase 2: Authentication System                                                                                                                                                                              │ │
│ │                                                                                                                                                                                                             │ │
│ │ 1. Create Auth Models & Tables                                                                                                                                                                              │ │
│ │   - User model with password hashing (bcrypt)                                                                                                                                                               │ │
│ │   - Session/token management                                                                                                                                                                                │ │
│ │ 2. Implement JWTUserAuth                                                                                                                                                                                    │ │
│ │   - Extends UserAuth abstract class                                                                                                                                                                         │ │
│ │   - JWT token generation/validation                                                                                                                                                                         │ │
│ │   - Cookie and Bearer token support                                                                                                                                                                         │ │
│ │ 3. Add Auth Endpoints                                                                                                                                                                                       │ │
│ │   - /api/auth/register                                                                                                                                                                                      │ │
│ │   - /api/auth/login                                                                                                                                                                                         │ │
│ │   - /api/auth/logout                                                                                                                                                                                        │ │
│ │   - /api/auth/user                                                                                                                                                                                          │ │
│ │ 4. Update Middleware                                                                                                                                                                                        │ │
│ │   - Add auth middleware to protect routes                                                                                                                                                                   │ │
│ │   - Inject user context into requests                                                                                                                                                                       │ │
│ │                                                                                                                                                                                                             │ │
│ │ Phase 3: Teams Support                                                                                                                                                                                      │ │
│ │                                                                                                                                                                                                             │ │
│ │ 1. Add Team Models                                                                                                                                                                                          │ │
│ │   - Team and TeamMember models                                                                                                                                                                              │ │
│ │   - Team-based permissions                                                                                                                                                                                  │ │
│ │ 2. Update Conversation Ownership                                                                                                                                                                            │ │
│ │   - Add team_id to conversations                                                                                                                                                                            │ │
│ │   - Check team permissions in routes                                                                                                                                                                        │ │
│ │ 3. Team Management Endpoints                                                                                                                                                                                │ │
│ │   - Create/update/delete teams                                                                                                                                                                              │ │
│ │   - Invite/remove members                                                                                                                                                                                   │ │
│ │                                                                                                                                                                                                             │ │
│ │ Phase 4: Frontend Integration                                                                                                                                                                               │ │
│ │                                                                                                                                                                                                             │ │
│ │ 1. Add Auth UI Components                                                                                                                                                                                   │ │
│ │   - Login/Register forms                                                                                                                                                                                    │ │
│ │   - User profile dropdown                                                                                                                                                                                   │ │
│ │   - Team switcher                                                                                                                                                                                           │ │
│ │ 2. Update API Client                                                                                                                                                                                        │ │
│ │   - Handle auth tokens                                                                                                                                                                                      │ │
│ │   - Add interceptors for 401 responses                                                                                                                                                                      │ │
│ │ 3. Protected Routes                                                                                                                                                                                         │ │
│ │   - Redirect to login when unauthenticated                                                                                                                                                                  │ │
│ │   - Show team-specific conversations                                                                                                                                                                        │ │
│ │                                                                                                                                                                                                             │ │
│ │ Key Design Decisions                                                                                                                                                                                        │ │
│ │                                                                                                                                                                                                             │ │
│ │ 1. Backward Compatibility                                                                                                                                                                                   │ │
│ │   - Keep file-based storage as default                                                                                                                                                                      │ │
│ │   - Database storage enabled via config                                                                                                                                                                     │ │
│ │   - Existing single-user mode still works                                                                                                                                                                   │ │
│ │ 2. Minimal Code Changes                                                                                                                                                                                     │ │
│ │   - Implement new storage backends following existing interfaces                                                                                                                                            │ │
│ │   - Add new UserAuth implementation without changing core logic                                                                                                                                             │ │
│ │   - Use dependency injection to swap implementations                                                                                                                                                        │ │
│ │ 3. Scalability                                                                                                                                                                                              │ │
│ │   - Database-backed storage for multi-tenancy                                                                                                                                                               │ │
│ │   - Redis for caching and sessions                                                                                                                                                                          │ │
│ │   - Horizontal scaling ready                                                                                                                                                                                │ │
│ │ 4. Security                                                                                                                                                                                                 │ │
│ │   - Encrypted secrets storage                                                                                                                                                                               │ │
│ │   - JWT tokens with refresh mechanism                                                                                                                                                                       │ │
│ │   - Team-based access control                                                                                                                                                                               │ │
│ │                                                                                                                                                                                                             │ │
│ │ This approach mirrors Laravel Jetstream's functionality while respecting OpenHands' existing architecture and minimizing disruption to the codebase.



---

UPDATED PLANS:

SaaS Transformation Plan for OpenHands/QlurAI                                                                                                                                    │ │
│ │                                                                                                                                                                                  │ │
│ │ Current Architecture Analysis ✅                                                                                                                                                  │ │
│ │                                                                                                                                                                                  │ │
│ │ OpenHands currently operates as a single-user application with:                                                                                                                  │ │
│ │ - File-based storage through FileStore abstraction (local, S3, Google Cloud)                                                                                                     │ │
│ │ - No authentication - DefaultUserAuth returns None for user_id                                                                                                                   │ │
│ │ - Clean abstraction layers - UserAuth, FileStore, ConversationStore interfaces                                                                                                   │ │
│ │ - Event-driven architecture similar to Laravel's event system                                                                                                                    │ │
│ │                                                                                                                                                                                  │ │
│ │ Laravel → FastAPI Equivalents                                                                                                                                                    │ │
│ │                                                                                                                                                                                  │ │
│ │ Authentication & Authorization                                                                                                                                                   │ │
│ │                                                                                                                                                                                  │ │
│ │ - Laravel Jetstream → FastAPI-Users                                                                                                                                              │ │
│ │   - Complete auth system with registration, login, email verification                                                                                                            │ │
│ │   - Team management capabilities                                                                                                                                                 │ │
│ │   - OAuth support built-in                                                                                                                                                       │ │
│ │   - API tokens like Sanctum                                                                                                                                                      │ │
│ │                                                                                                                                                                                  │ │
│ │ Database & ORM                                                                                                                                                                   │ │
│ │                                                                                                                                                                                  │ │
│ │ - Laravel Eloquent → SQLAlchemy with Alembic                                                                                                                                     │ │
│ │   - Declarative ORM with relationships                                                                                                                                           │ │
│ │   - Database migrations                                                                                                                                                          │ │
│ │   - Model events and observers                                                                                                                                                   │ │
│ │                                                                                                                                                                                  │ │
│ │ Real-time Features                                                                                                                                                               │ │
│ │                                                                                                                                                                                  │ │
│ │ - Laravel Reverb/Echo → python-socketio (already in use)                                                                                                                         │ │
│ │   - WebSocket support for real-time updates                                                                                                                                      │ │
│ │   - Room-based broadcasting                                                                                                                                                      │ │
│ │                                                                                                                                                                                  │ │
│ │ Storage                                                                                                                                                                          │ │
│ │                                                                                                                                                                                  │ │
│ │ - Laravel Storage → Hybrid approach                                                                                                                                              │ │
│ │   - PostgreSQL for metadata, users, teams                                                                                                                                        │ │
│ │   - MinIO/S3 for events and files (cost-effective)                                                                                                                               │ │
│ │                                                                                                                                                                                  │ │
│ │ Proposed Database Schema                                                                                                                                                         │ │
│ │                                                                                                                                                                                  │ │
│ │ -- Users table (like Laravel's users migration)                                                                                                                                  │ │
│ │ users:                                                                                                                                                                           │ │
│ │   - id (UUID)                                                                                                                                                                    │ │
│ │   - email (unique)                                                                                                                                                               │ │
│ │   - hashed_password                                                                                                                                                              │ │
│ │   - is_active                                                                                                                                                                    │ │
│ │   - is_verified                                                                                                                                                                  │ │
│ │   - created_at                                                                                                                                                                   │ │
│ │   - updated_at                                                                                                                                                                   │ │
│ │                                                                                                                                                                                  │ │
│ │ -- Teams table (like Jetstream)                                                                                                                                                  │ │
│ │ teams:                                                                                                                                                                           │ │
│ │   - id (UUID)                                                                                                                                                                    │ │
│ │   - name                                                                                                                                                                         │ │
│ │   - owner_id (FK users)                                                                                                                                                          │ │
│ │   - created_at                                                                                                                                                                   │ │
│ │   - updated_at                                                                                                                                                                   │ │
│ │                                                                                                                                                                                  │ │
│ │ -- Team members (like Jetstream)                                                                                                                                                 │ │
│ │ team_members:                                                                                                                                                                    │ │
│ │   - id (UUID)                                                                                                                                                                    │ │
│ │   - team_id (FK teams)                                                                                                                                                           │ │
│ │   - user_id (FK users)                                                                                                                                                           │ │
│ │   - role (owner/admin/developer/viewer)                                                                                                                                          │ │
│ │   - created_at                                                                                                                                                                   │ │
│ │                                                                                                                                                                                  │ │
│ │ -- Conversations (enhanced metadata)                                                                                                                                             │ │
│ │ conversations:                                                                                                                                                                   │ │
│ │   - id (UUID, existing conversation_id)                                                                                                                                          │ │
│ │   - user_id (FK users)                                                                                                                                                           │ │
│ │   - team_id (FK teams, nullable)                                                                                                                                                 │ │
│ │   - title                                                                                                                                                                        │ │
│ │   - selected_repository                                                                                                                                                          │ │
│ │   - git_provider                                                                                                                                                                 │ │
│ │   - status                                                                                                                                                                       │ │
│ │   - accumulated_cost                                                                                                                                                             │ │
│ │   - created_at                                                                                                                                                                   │ │
│ │   - last_updated_at                                                                                                                                                              │ │
│ │                                                                                                                                                                                  │ │
│ │ -- User settings                                                                                                                                                                 │ │
│ │ user_settings:                                                                                                                                                                   │ │
│ │   - id (UUID)                                                                                                                                                                    │ │
│ │   - user_id (FK users)                                                                                                                                                           │ │
│ │   - settings (JSONB)                                                                                                                                                             │ │
│ │   - created_at                                                                                                                                                                   │ │
│ │   - updated_at                                                                                                                                                                   │ │
│ │                                                                                                                                                                                  │ │
│ │ -- API Keys (like Sanctum tokens)                                                                                                                                                │ │
│ │ api_keys:                                                                                                                                                                        │ │
│ │   - id (UUID)                                                                                                                                                                    │ │
│ │   - user_id (FK users)                                                                                                                                                           │ │
│ │   - name                                                                                                                                                                         │ │
│ │   - token_hash                                                                                                                                                                   │ │
│ │   - abilities (JSONB)                                                                                                                                                            │ │
│ │   - last_used_at                                                                                                                                                                 │ │
│ │   - expires_at                                                                                                                                                                   │ │
│ │   - created_at                                                                                                                                                                   │ │
│ │                                                                                                                                                                                  │ │
│ │ Implementation Plan                                                                                                                                                              │ │
│ │                                                                                                                                                                                  │ │
│ │ Phase 1: Database Foundation (Week 1-2)                                                                                                                                          │ │
│ │                                                                                                                                                                                  │ │
│ │ 1. Add Dependencies                                                                                                                                                              │ │
│ │ sqlalchemy = "^2.0"                                                                                                                                                              │ │
│ │ alembic = "^1.13"                                                                                                                                                                │ │
│ │ asyncpg = "^0.29"                                                                                                                                                                │ │
│ │ fastapi-users = "^13.0"                                                                                                                                                          │ │
│ │ fastapi-users-db-sqlalchemy = "^6.0"                                                                                                                                             │ │
│ │ 2. Create Database Models                                                                                                                                                        │ │
│ │   - User, Team, TeamMember models                                                                                                                                                │ │
│ │   - Enhanced ConversationMetadata with user/team relations                                                                                                                       │ │
│ │   - Settings and APIKey models                                                                                                                                                   │ │
│ │ 3. Implement Database Storage                                                                                                                                                    │ │
│ │   - DatabaseConversationStore implementing ConversationStore                                                                                                                     │ │
│ │   - DatabaseSettingsStore implementing SettingsStore                                                                                                                             │ │
│ │   - Keep file stores as fallback                                                                                                                                                 │ │
│ │ 4. Environment Configuration                                                                                                                                                     │ │
│ │ STORAGE_BACKEND=database  # or "file"                                                                                                                                            │ │
│ │ DATABASE_URL=postgresql://user:pass@localhost/openhands                                                                                                                          │ │
│ │                                                                                                                                                                                  │ │
│ │ Phase 2: Authentication System (Week 3-4)                                                                                                                                        │ │
│ │                                                                                                                                                                                  │ │
│ │ 1. FastAPI-Users Integration                                                                                                                                                     │ │
│ │   - User registration/login/logout                                                                                                                                               │ │
│ │   - Email verification                                                                                                                                                           │ │
│ │   - Password reset                                                                                                                                                               │ │
│ │   - JWT + Cookie auth                                                                                                                                                            │ │
│ │ 2. Create DatabaseUserAuth                                                                                                                                                       │ │
│ │ class DatabaseUserAuth(UserAuth):                                                                                                                                                │ │
│ │     async def get_user_id(self) -> str:                                                                                                                                          │ │
│ │         return self.current_user.id                                                                                                                                              │ │
│ │                                                                                                                                                                                  │ │
│ │     async def get_user_email(self) -> str:                                                                                                                                       │ │
│ │         return self.current_user.email                                                                                                                                           │ │
│ │ 3. Auth Endpoints                                                                                                                                                                │ │
│ │   - /api/auth/register                                                                                                                                                           │ │
│ │   - /api/auth/login                                                                                                                                                              │ │
│ │   - /api/auth/logout                                                                                                                                                             │ │
│ │   - /api/auth/verify                                                                                                                                                             │ │
│ │   - /api/users/me                                                                                                                                                                │ │
│ │ 4. API Key Management                                                                                                                                                            │ │
│ │   - Create/revoke API keys                                                                                                                                                       │ │
│ │   - Scoped permissions                                                                                                                                                           │ │
│ │                                                                                                                                                                                  │ │
│ │ Phase 3: Teams Support (Week 5-6)                                                                                                                                                │ │
│ │                                                                                                                                                                                  │ │
│ │ 1. Team Management                                                                                                                                                               │ │
│ │   - Create/update/delete teams                                                                                                                                                   │ │
│ │   - Invite/remove members                                                                                                                                                        │ │
│ │   - Role-based permissions                                                                                                                                                       │ │
│ │ 2. Update Conversation Access                                                                                                                                                    │ │
│ │   - Check team permissions                                                                                                                                                       │ │
│ │   - Share conversations within teams                                                                                                                                             │ │
│ │   - Team-wide settings                                                                                                                                                           │ │
│ │ 3. Team Endpoints                                                                                                                                                                │ │
│ │   - /api/teams                                                                                                                                                                   │ │
│ │   - /api/teams/{id}/members                                                                                                                                                      │ │
│ │   - /api/teams/{id}/invites                                                                                                                                                      │ │
│ │                                                                                                                                                                                  │ │
│ │ Phase 4: Frontend Integration (Week 7-8)                                                                                                                                         │ │
│ │                                                                                                                                                                                  │ │
│ │ 1. Auth UI Components                                                                                                                                                            │ │
│ │   - Login/Register forms                                                                                                                                                         │ │
│ │   - User profile dropdown                                                                                                                                                        │ │
│ │   - Team switcher                                                                                                                                                                │ │
│ │ 2. Protected Routes                                                                                                                                                              │ │
│ │   - Redirect to login when unauthenticated                                                                                                                                       │ │
│ │   - Team-based navigation                                                                                                                                                        │ │
│ │ 3. API Client Updates                                                                                                                                                            │ │
│ │   - Handle auth tokens                                                                                                                                                           │ │
│ │   - Add interceptors for 401                                                                                                                                                     │ │
│ │                                                                                                                                                                                  │ │
│ │ Hybrid Storage Strategy                                                                                                                                                          │ │
│ │                                                                                                                                                                                  │ │
│ │ 1. PostgreSQL stores:                                                                                                                                                            │ │
│ │   - User data and authentication                                                                                                                                                 │ │
│ │   - Conversation metadata                                                                                                                                                        │ │
│ │   - Team relationships                                                                                                                                                           │ │
│ │   - Settings and preferences                                                                                                                                                     │ │
│ │ 2. MinIO/S3 stores:                                                                                                                                                              │ │
│ │   - Event streams (large JSON files)                                                                                                                                             │ │
│ │   - File uploads                                                                                                                                                                 │ │
│ │   - Workspace files                                                                                                                                                              │ │
│ │   - Conversation trajectories                                                                                                                                                    │ │
│ │ 3. Benefits:                                                                                                                                                                     │ │
│ │   - Cost-effective (MinIO is 100x cheaper)                                                                                                                                       │ │
│ │   - Scalable for large event data                                                                                                                                                │ │
│ │   - Fast queries for metadata                                                                                                                                                    │ │
│ │                                                                                                                                                                                  │ │
│ │ Key Design Decisions                                                                                                                                                             │ │
│ │                                                                                                                                                                                  │ │
│ │ 1. Backward Compatibility                                                                                                                                                        │ │
│ │   - File storage remains default                                                                                                                                                 │ │
│ │   - Database enabled via config                                                                                                                                                  │ │
│ │   - Migration tools provided                                                                                                                                                     │ │
│ │ 2. Minimal Code Changes                                                                                                                                                          │ │
│ │   - New implementations of existing interfaces                                                                                                                                   │ │
│ │   - Dependency injection for swapping                                                                                                                                            │ │
│ │   - No changes to core logic                                                                                                                                                     │ │
│ │ 3. Security First                                                                                                                                                                │ │
│ │   - Bcrypt password hashing                                                                                                                                                      │ │
│ │   - JWT with refresh tokens                                                                                                                                                      │ │
│ │   - Team-based access control                                                                                                                                                    │ │
│ │   - Encrypted secrets storage                                                                                                                                                    │ │
│ │ 4. Performance                                                                                                                                                                   │ │
│ │   - PostgreSQL for fast queries                                                                                                                                                  │ │
│ │   - Redis for caching                                                                                                                                                            │ │
│ │   - Connection pooling                                                                                                                                                           │ │
│ │   - Async throughout                                                                                                                                                             │ │
│ │                                                                                                                                                                                  │ │
│ │ Migration Path                                                                                                                                                                   │ │
│ │                                                                                                                                                                                  │ │
│ │ 1. New Installations:                                                                                                                                                            │ │
│ │   - Use database by default                                                                                                                                                      │ │
│ │   - Guided setup process                                                                                                                                                         │ │
│ │ 2. Existing Installations:                                                                                                                                                       │ │
│ │   - Optional migration command                                                                                                                                                   │ │
│ │   - Can run hybrid mode                                                                                                                                                          │ │
│ │   - Gradual transition                                                                                                                                                           │ │
│ │                                                                                                                                                                                  │ │
│ │ Success Metrics                                                                                                                                                                  │ │
│ │                                                                                                                                                                                  │ │
│ │ - Zero breaking changes for existing users                                                                                                                                       │ │
│ │ - <100ms auth check latency                                                                                                                                                      │ │
│ │ - Support for 10K+ concurrent users                                                                                                                                              │ │
│ │ - 99.9% uptime for auth services                                                                                                                                                 │ │
│ │                                                                                                                                                                                  │ │
│ │ This plan transforms OpenHands into a production-ready SaaS platform while maintaining its excellent architecture and developer experience.
