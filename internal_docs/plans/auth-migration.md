

UPDATE THIS IS NEW SUMMARY:
Summary: localStorage to Cookie-Based Authentication Migration

  What We've Been Building

  We've been implementing a comprehensive migration from localStorage-based JWT
  authentication to secure cookie-based authentication for the OpenHands platform,
  following the detailed plan in /internal_docs/plans/auth-migration.md.

  Why This Migration

  The migration addresses critical security vulnerabilities:
  - XSS Prevention: Moving tokens from localStorage (accessible to any JavaScript) to
   HttpOnly cookies (inaccessible to JavaScript)
  - CSRF Protection: Implementing double-submit cookie pattern
  - No Token Exposure: Removing tokens from URLs during OAuth callbacks
  - Server-Side Control: Enabling session management and invalidation

  What We've Accomplished

  Phase 1 - Backend Foundation ✅

  1. Database Schema:
    - Created migration 9f5102b5b214_add_sessions_and_csrf_tokens_tables_for_.py
    - Added sessions table for server-side session tracking
    - Added csrf_tokens table for CSRF protection
    - Updated models.py with Session and CSRFToken classes
  2. Cookie Transport:
    - Created /openhands/server/auth/cookie_backend.py
    - Implemented CookieTransport class for cookie-based auth
    - Implemented DualTransport class for backward compatibility
    - Fixed FastAPI-Users integration issues (scheme attribute)
  3. Session Management:
    - Created /openhands/server/auth/session_manager.py
    - Implemented session creation, validation, and cleanup
    - Added session fingerprinting for security
    - Implemented CSRF token management
  4. Auth Configuration:
    - Updated /openhands/server/auth/users.py for dual auth support
    - Created custom API-only authentication dependency
    - Configured both cookie and bearer token backends

  Phase 2 - Security Layer ✅

  1. CSRF Protection:
    - Created /openhands/server/middleware_auth/csrf.py
    - Implemented double-submit cookie pattern
    - Added exemptions for safe methods and OAuth endpoints
  2. Cookie Security:
    - Updated /openhands/server/listen.py to add CSRF middleware
    - Enhanced CORS configuration in middleware.py
    - Added environment variables for cookie configuration
  3. Session Endpoints:
    - Created /openhands/server/routes/session.py
    - Added endpoints for session management:
        - GET /api/auth/csrf-token - Get CSRF token
      - GET /api/auth/sessions - List user sessions
      - DELETE /api/auth/sessions/{id} - Invalidate session
      - POST /api/auth/sessions/invalidate-all - Logout everywhere
  4. OAuth Updates:
    - Modified /openhands/server/routes/auth.py
    - OAuth callback now sets secure cookies instead of returning tokens in URL

  Phase 3 - Frontend Migration ✅

  1. Auth Context Updates:
    - Removed all localStorage operations from /frontend/src/context/auth-context.tsx
    - Simplified login to rely on server-set cookies
    - Updated to check authentication via API calls
  2. Axios Configuration:
    - Updated /frontend/src/api/open-hands-axios.ts
    - Added withCredentials: true for cookie support
    - Implemented automatic CSRF token injection for state-changing requests
  3. Auth Callback:
    - Updated /frontend/src/routes/auth-callback.tsx
    - Removed token extraction from URL
    - Now just verifies authentication after OAuth
  4. Auth Utils:
    - Updated /frontend/src/utils/auth.client.ts
    - Changed from localStorage checks to API-based authentication verification

  Environment Variables Added

  In .env.saas:
  SESSION_LIFETIME=3600            # 1 hour
  REMEMBER_ME_LIFETIME=2592000     # 30 days
  COOKIE_DOMAIN=                   # Leave empty for current domain
  COOKIE_SECURE=false              # Set true in production
  CSRF_SECRET=your-csrf-secret-change-this-in-production

  Technical Challenges Resolved

  1. Import Issues: Fixed circular imports and module conflicts
  2. FastAPI-Users Compatibility: Added required scheme attributes
  3. Database Exports: Updated __init__.py files to export new models
  4. Middleware Organization: Renamed directory to avoid naming conflicts

  Current Status

  The server is now loading successfully with:
  - ✅ Secure cookie-based authentication
  - ✅ CSRF protection
  - ✅ Session management
  - ✅ Backward compatibility for API clients
  - ✅ Frontend updated to use cookies

  Security Improvements

  1. No XSS Token Theft: Tokens in HttpOnly cookies
  2. CSRF Protection: Double-submit pattern
  3. Session Control: Server can invalidate sessions
  4. No URL Exposure: OAuth tokens never appear in URLs
  5. Fingerprinting: Optional session binding to IP/User-Agent

  The migration successfully transforms the authentication system from a client-side
  localStorage approach to a server-controlled, cookie-based system with enhanced
  security and better user experience.






  FYI,


IT WAS BASED OFF THIS:


Comprehensive Migration Plan: localStorage to Secure Cookie-Based Authentication   │ │
│ │                                                                                    │ │
│ │ 1. Executive Summary & Rationale                                                   │ │
│ │                                                                                    │ │
│ │ Why This Migration is Critical                                                     │ │
│ │                                                                                    │ │
│ │ Security Vulnerabilities with Current Implementation:                              │ │
│ │                                                                                    │ │
│ │ 1. XSS Attack Vector: Any malicious script can steal JWT tokens from localStorage  │ │
│ │   - localStorage is accessible to all JavaScript code on the page                  │ │
│ │   - Third-party scripts, browser extensions, or compromised dependencies can read  │ │
│ │ tokens                                                                             │ │
│ │   - No protection against cross-site scripting attacks                             │ │
│ │ 2. Token Exposure in URLs: Current OAuth flow exposes tokens in redirect URLs      │ │
│ │   - Tokens visible in browser history                                              │ │
│ │   - Tokens logged in server access logs                                            │ │
│ │   - Tokens potentially leaked through referrer headers                             │ │
│ │ 3. No CSRF Protection: Current implementation vulnerable to cross-site request     │ │
│ │ forgery                                                                            │ │
│ │   - Malicious sites can make authenticated requests on behalf of users             │ │
│ │   - No validation of request origin                                                │ │
│ │ 4. Client-Side Token Management: Insecure and error-prone                          │ │
│ │   - Tokens persist indefinitely in localStorage                                    │ │
│ │   - No server-side session invalidation capability                                 │ │
│ │   - Manual token attachment required for each request                              │ │
│ │                                                                                    │ │
│ │ Benefits of Cookie-Based Authentication                                            │ │
│ │                                                                                    │ │
│ │ 1. Enhanced Security:                                                              │ │
│ │   - HttpOnly cookies prevent JavaScript access (XSS mitigation)                    │ │
│ │   - Secure flag ensures HTTPS-only transmission                                    │ │
│ │   - SameSite attribute prevents CSRF attacks                                       │ │
│ │   - Server-controlled session lifecycle                                            │ │
│ │ 2. Better User Experience:                                                         │ │
│ │   - Automatic session persistence across browser restarts                          │ │
│ │   - No manual token management                                                     │ │
│ │   - Seamless authentication across tabs                                            │ │
│ │   - Server-side "remember me" functionality                                        │ │
│ │ 3. Remix/Next.js Best Practices:                                                   │ │
│ │   - Native SSR support - cookies sent with every request                           │ │
│ │   - Server-side authentication in loaders/actions                                  │ │
│ │   - No hydration mismatches                                                        │ │
│ │   - Better performance with server-side auth checks                                │ │
│ │                                                                                    │ │
│ │ 2. Detailed File Changes                                                           │ │
│ │                                                                                    │ │
│ │ Backend Changes                                                                    │ │
│ │                                                                                    │ │
│ │ A. New Files to Create                                                             │ │
│ │                                                                                    │ │
│ │ 1. /openhands/server/auth/cookie_backend.py                                        │ │
│ │ # Purpose: Implement cookie-based authentication transport                         │ │
│ │ # - CookieTransport class for FastAPI-Users                                        │ │
│ │ # - Secure cookie configuration                                                    │ │
│ │ # - Cookie parsing and validation                                                  │ │
│ │ # - CSRF token generation                                                          │ │
│ │                                                                                    │ │
│ │ 2. /openhands/server/auth/session_manager.py                                       │ │
│ │ # Purpose: Server-side session management                                          │ │
│ │ # - Session creation/validation/invalidation                                       │ │
│ │ # - Session storage in database                                                    │ │
│ │ # - Session fingerprinting for security                                            │ │
│ │ # - Concurrent session limiting                                                    │ │
│ │                                                                                    │ │
│ │ 3. /openhands/server/middleware/csrf.py                                            │ │
│ │ # Purpose: CSRF protection middleware                                              │ │
│ │ # - Double-submit cookie pattern implementation                                    │ │
│ │ # - CSRF token generation and validation                                           │ │
│ │ # - Exempt certain endpoints (GET, OPTIONS)                                        │ │
│ │ # - Integration with session management                                            │ │
│ │                                                                                    │ │
│ │ 4. /openhands/storage/database/migrations/add_sessions_table.py                    │ │
│ │ # Purpose: Database schema for sessions                                            │ │
│ │ # - sessions table: id, user_id, token, fingerprint, expires_at, created_at        │ │
│ │ # - csrf_tokens table: id, token, session_id, used, created_at                     │ │
│ │ # - Indexes for performance                                                        │ │
│ │                                                                                    │ │
│ │ 5. /openhands/server/routes/session.py                                             │ │
│ │ # Purpose: Session management endpoints                                            │ │
│ │ # - GET /api/auth/sessions - list active sessions                                  │ │
│ │ # - DELETE /api/auth/sessions/{id} - invalidate specific session                   │ │
│ │ # - POST /api/auth/sessions/invalidate-all - logout everywhere                     │ │
│ │                                                                                    │ │
│ │ B. Files to Modify                                                                 │ │
│ │                                                                                    │ │
│ │ 1. /openhands/server/auth/users.py                                                 │ │
│ │ # Changes:                                                                         │ │
│ │ # - Add CookieTransport alongside BearerTransport                                  │ │
│ │ # - Implement dual authentication (cookies + bearer for API)                       │ │
│ │ # - Add session-based JWT strategy                                                 │ │
│ │ # - Configure cookie settings (domain, path, secure, httpOnly, sameSite)           │ │
│ │ # - Add refresh token support                                                      │ │
│ │                                                                                    │ │
│ │ 2. /openhands/server/routes/auth.py                                                │ │
│ │ # Changes:                                                                         │ │
│ │ # - Update OAuth callback to set secure cookie instead of URL redirect             │ │
│ │ # - Add CSRF token endpoint: GET /api/auth/csrf-token                              │ │
│ │ # - Modify login/logout to handle cookies                                          │ │
│ │ # - Add session invalidation on logout                                             │ │
│ │ # - Implement refresh token endpoint                                               │ │
│ │                                                                                    │ │
│ │ 3. /openhands/server/app.py                                                        │ │
│ │ # Changes:                                                                         │ │
│ │ # - Add CSRF middleware to the application                                         │ │
│ │ # - Configure CORS to include credentials                                          │ │
│ │ # - Add session cleanup background task                                            │ │
│ │ # - Update security headers                                                        │ │
│ │                                                                                    │ │
│ │ 4. /openhands/server/middleware.py                                                 │ │
│ │ # Changes:                                                                         │ │
│ │ # - Update CORS middleware to support credentials                                  │ │
│ │ # - Add SameSite cookie support                                                    │ │
│ │ # - Configure allowed origins properly                                             │ │
│ │ # - Add security headers middleware                                                │ │
│ │                                                                                    │ │
│ │ 5. /openhands/server/dependencies.py                                               │ │
│ │ # Changes:                                                                         │ │
│ │ # - Update authentication dependencies to check cookies first                      │ │
│ │ # - Add CSRF validation to protected endpoints                                     │ │
│ │ # - Implement session validation                                                   │ │
│ │                                                                                    │ │
│ │ 6. /.env.saas                                                                      │ │
│ │ # New environment variables:                                                       │ │
│ │ # - JWT_SECRET (move from hardcoded)                                               │ │
│ │ # - SESSION_LIFETIME=3600                                                          │ │
│ │ # - REMEMBER_ME_LIFETIME=2592000                                                   │ │
│ │ # - CSRF_SECRET                                                                    │ │
│ │ # - COOKIE_DOMAIN                                                                  │ │
│ │ # - COOKIE_SECURE=true                                                             │ │
│ │                                                                                    │ │
│ │ Frontend Changes                                                                   │ │
│ │                                                                                    │ │
│ │ A. Files to Modify                                                                 │ │
│ │                                                                                    │ │
│ │ 1. /frontend/src/context/auth-context.tsx                                          │ │
│ │ # Major Changes:                                                                   │ │
│ │ # - Remove ALL localStorage operations                                             │ │
│ │ # - Remove TOKEN_KEY constant                                                      │ │
│ │ # - Update login() to not store tokens                                             │ │
│ │ # - Remove manual Authorization header setting                                     │ │
│ │ # - Add CSRF token management                                                      │ │
│ │ # - Update logout to call server endpoint                                          │ │
│ │ # - Add session refresh logic                                                      │ │
│ │ # - Handle cookie-based auth state                                                 │ │
│ │                                                                                    │ │
│ │ 2. /frontend/src/api/open-hands-axios.ts                                           │ │
│ │ # Changes:                                                                         │ │
│ │ # - Remove Authorization header interceptor                                        │ │
│ │ # - Add withCredentials: true to all requests                                      │ │
│ │ # - Add CSRF token to request headers                                              │ │
│ │ # - Update error handling for 401/403                                              │ │
│ │ # - Remove localStorage checks                                                     │ │
│ │                                                                                    │ │
│ │ 3. /frontend/src/routes/auth-callback.tsx                                          │ │
│ │ # Changes:                                                                         │ │
│ │ # - Remove token extraction from URL                                               │ │
│ │ # - Simply redirect after OAuth (cookie already set)                               │ │
│ │ # - Remove login() call with token                                                 │ │
│ │ # - Add success verification via API call                                          │ │
│ │                                                                                    │ │
│ │ 4. /frontend/src/utils/auth.client.ts                                              │ │
│ │ # Changes:                                                                         │ │
│ │ # - Remove isAuthenticated localStorage check                                      │ │
│ │ # - Add cookie-based auth check                                                    │ │
│ │ # - Update to use server-side auth state                                           │ │
│ │                                                                                    │ │
│ │ 5. /frontend/src/routes/root-layout.tsx                                            │ │
│ │ # Changes:                                                                         │ │
│ │ # - Remove localStorage auth checks                                                │ │
│ │ # - Add CSRF token initialization                                                  │ │
│ │ # - Update auth loading state logic                                                │ │
│ │                                                                                    │ │
│ │ 6. /frontend/src/hooks/use-auth.ts (NEW)                                           │ │
│ │ # Purpose: Centralized auth hook                                                   │ │
│ │ # - Server-side auth state                                                         │ │
│ │ # - CSRF token management                                                          │ │
│ │ # - Session refresh logic                                                          │ │
│ │                                                                                    │ │
│ │ 7. /frontend/src/components/auth/github-login-button.tsx                           │ │
│ │ # Changes:                                                                         │ │
│ │ # - Include CSRF token in OAuth initiation                                         │ │
│ │ # - Update redirect handling                                                       │ │
│ │                                                                                    │ │
│ │ B. Files to Delete/Deprecate                                                       │ │
│ │                                                                                    │ │
│ │ 1. Remove localStorage auth logic from:                                            │ │
│ │ - /frontend/src/utils/local-storage.ts - Remove auth-related functions             │ │
│ │ - Any components directly checking localStorage for auth                           │ │
│ │                                                                                    │ │
│ │ 3. Implementation Phases with Dependencies                                         │ │
│ │                                                                                    │ │
│ │ Phase 1: Backend Foundation (Days 1-3)                                             │ │
│ │                                                                                    │ │
│ │ 1. Create session database schema                                                  │ │
│ │ 2. Implement CookieTransport and session management                                │ │
│ │ 3. Add dual auth support (maintain backward compatibility)                         │ │
│ │ 4. Test with Postman/curl                                                          │ │
│ │                                                                                    │ │
│ │ Phase 2: Security Layer (Days 4-5)                                                 │ │
│ │                                                                                    │ │
│ │ 1. Implement CSRF protection                                                       │ │
│ │ 2. Add security headers                                                            │ │
│ │ 3. Configure secure cookie settings                                                │ │
│ │ 4. Add rate limiting to auth endpoints                                             │ │
│ │                                                                                    │ │
│ │ Phase 3: Frontend Migration (Days 6-8)                                             │ │
│ │                                                                                    │ │
│ │ 1. Update auth context to remove localStorage                                      │ │
│ │ 2. Modify axios configuration                                                      │ │
│ │ 3. Update all auth-dependent components                                            │ │
│ │ 4. Add CSRF token handling                                                         │ │
│ │                                                                                    │ │
│ │ Phase 4: Testing & Rollout (Days 9-10)                                             │ │
│ │                                                                                    │ │
│ │ 1. Comprehensive testing suite                                                     │ │
│ │ 2. Migration script for existing users                                             │ │
│ │ 3. Gradual rollout with feature flags                                              │ │
│ │ 4. Monitor for issues                                                              │ │
│ │                                                                                    │ │
│ │ 4. Technical Specifications                                                        │ │
│ │                                                                                    │ │
│ │ Cookie Configuration                                                               │ │
│ │                                                                                    │ │
│ │ cookie_settings = {                                                                │ │
│ │     "key": "openhands_session",                                                    │ │
│ │     "httponly": True,                                                              │ │
│ │     "secure": True,  # HTTPS only                                                  │ │
│ │     "samesite": "lax",  # CSRF protection                                          │ │
│ │     "max_age": 3600,  # 1 hour default                                             │ │
│ │     "domain": None,  # Current domain only                                         │ │
│ │     "path": "/"                                                                    │ │
│ │ }                                                                                  │ │
│ │                                                                                    │ │
│ │ CSRF Protection                                                                    │ │
│ │                                                                                    │ │
│ │ # Double-submit cookie pattern                                                     │ │
│ │ # 1. Server generates CSRF token                                                   │ │
│ │ # 2. Token sent as cookie AND must be in request header                            │ │
│ │ # 3. Server validates both match                                                   │ │
│ │                                                                                    │ │
│ │ Session Schema                                                                     │ │
│ │                                                                                    │ │
│ │ CREATE TABLE sessions (                                                            │ │
│ │     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                                 │ │
│ │     user_id UUID REFERENCES users(id) ON DELETE CASCADE,                           │ │
│ │     token_hash VARCHAR(255) NOT NULL,                                              │ │
│ │     fingerprint VARCHAR(255),                                                      │ │
│ │     ip_address INET,                                                               │ │
│ │     user_agent TEXT,                                                               │ │
│ │     expires_at TIMESTAMP NOT NULL,                                                 │ │
│ │     last_activity TIMESTAMP DEFAULT NOW(),                                         │ │
│ │     created_at TIMESTAMP DEFAULT NOW()                                             │ │
│ │ );                                                                                 │ │
│ │                                                                                    │ │
│ │ CREATE INDEX idx_sessions_user_id ON sessions(user_id);                            │ │
│ │ CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);                      │ │
│ │ CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);                      │ │
│ │                                                                                    │ │
│ │ 5. Migration Strategy                                                              │ │
│ │                                                                                    │ │
│ │ Backward Compatibility                                                             │ │
│ │                                                                                    │ │
│ │ 1. Keep Bearer token support for API clients                                       │ │
│ │ 2. Check cookies first, fall back to Authorization header                          │ │
│ │ 3. Gradual migration with feature flags                                            │ │
│ │ 4. Deprecation warnings for localStorage usage                                     │ │
│ │                                                                                    │ │
│ │ Data Migration                                                                     │ │
│ │                                                                                    │ │
│ │ # Script to migrate existing JWT tokens to sessions                                │ │
│ │ # 1. Decode existing JWTs                                                          │ │
│ │ # 2. Create session records                                                        │ │
│ │ # 3. Set migration flag for users                                                  │ │
│ │                                                                                    │ │
│ │ Rollback Plan                                                                      │ │
│ │                                                                                    │ │
│ │ 1. Feature flag to disable cookie auth                                             │ │
│ │ 2. Maintain dual auth for transition period                                        │ │
│ │ 3. Database migrations are reversible                                              │ │
│ │ 4. Frontend changes behind feature flags                                           │ │
│ │                                                                                    │ │
│ │ 6. Security Considerations                                                         │ │
│ │                                                                                    │ │
│ │ Additional Security Measures                                                       │ │
│ │                                                                                    │ │
│ │ 1. IP Address Validation: Optional session binding to IP                           │ │
│ │ 2. Device Fingerprinting: Detect token theft                                       │ │
│ │ 3. Concurrent Session Limits: Prevent account sharing                              │ │
│ │ 4. Activity Monitoring: Track suspicious patterns                                  │ │
│ │ 5. Session Timeout: Idle and absolute timeouts                                     │ │
│ │                                                                                    │ │
│ │ Compliance                                                                         │ │
│ │                                                                                    │ │
│ │ - OWASP Authentication Guidelines                                                  │ │
│ │ - GDPR compliance for session data                                                 │ │
│ │ - SOC2 requirements for session management                                         │ │
│ │                                                                                    │ │
│ │ 7. Testing Plan                                                                    │ │
│ │                                                                                    │ │
│ │ Unit Tests                                                                         │ │
│ │                                                                                    │ │
│ │ - Cookie parsing and validation                                                    │ │
│ │ - CSRF token generation/validation                                                 │ │
│ │ - Session CRUD operations                                                          │ │
│ │ - Auth state management                                                            │ │
│ │                                                                                    │ │
│ │ Integration Tests                                                                  │ │
│ │                                                                                    │ │
│ │ - Full auth flow with cookies                                                      │ │
│ │ - OAuth with cookie setting                                                        │ │
│ │ - CSRF protection scenarios                                                        │ │
│ │ - Session invalidation                                                             │ │
│ │                                                                                    │ │
│ │ E2E Tests                                                                          │ │
│ │                                                                                    │ │
│ │ - Login/logout flows                                                               │ │
│ │ - Remember me functionality                                                        │ │
│ │ - Multi-tab authentication                                                         │ │
│ │ - Session timeout handling                                                         │ │
│ │                                                                                    │ │
│ │ 8. Performance Impact                                                              │ │
│ │                                                                                    │ │
│ │ Improvements                                                                       │ │
│ │                                                                                    │ │
│ │ - No localStorage access (faster)                                                  │ │
│ │ - Server-side auth (cached)                                                        │ │
│ │ - Reduced JavaScript bundle size                                                   │ │
│ │                                                                                    │ │
│ │ Considerations                                                                     │ │
│ │                                                                                    │ │
│ │ - Additional database queries for sessions                                         │ │
│ │ - CSRF token validation overhead                                                   │ │
│ │ - Cookie size limits (4KB)                                                         │ │
│ │                                                                                    │ │
│ │ 9. Monitoring & Metrics                                                            │ │
│ │                                                                                    │ │
│ │ Key Metrics                                                                        │ │
│ │                                                                                    │ │
│ │ - Authentication success/failure rates                                             │ │
│ │ - Session duration statistics                                                      │ │
│ │ - CSRF attack attempts                                                             │ │
│ │ - Cookie rejection rates                                                           │ │
│ │ - Performance impact                                                               │ │
│ │                                                                                    │ │
│ │ Logging                                                                            │ │
│ │                                                                                    │ │
│ │ - Auth events with session IDs                                                     │ │
│ │ - CSRF validation failures                                                         │ │
│ │ - Session lifecycle events                                                         │ │
│ │ - Security anomalies                                                               │ │
│ │                                                                                    │ │
│ │ This comprehensive plan ensures a secure, scalable migration from localStorage to  │ │
│ │ cookie-based authentication while maintaining system stability and user            │ │
│ │ experience.
