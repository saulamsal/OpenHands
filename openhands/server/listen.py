import os

import socketio

from openhands.server.app import app as base_app
from openhands.server.listen_socket import sio
from openhands.server.middleware import (
    CacheControlMiddleware,
    InMemoryRateLimiter,
    LocalhostCORSMiddleware,
    RateLimitMiddleware,
)
from openhands.server.middleware_auth.csrf import CSRFMiddleware
from openhands.server.static import SPAStaticFiles

if os.getenv('SERVE_FRONTEND', 'true').lower() == 'true':
    base_app.mount(
        '/', SPAStaticFiles(directory='./frontend/build', html=True), name='dist'
    )

# Configure middleware stack
# Note: Middleware is applied in reverse order (last added is first to process)
base_app.add_middleware(
    RateLimitMiddleware,
    rate_limiter=InMemoryRateLimiter(requests=10, seconds=1),
)
base_app.add_middleware(CacheControlMiddleware)

# Always add CSRF middleware for cookie-based auth
base_app.add_middleware(CSRFMiddleware)

# CORS middleware must be last (first to process) for proper cookie handling
base_app.add_middleware(LocalhostCORSMiddleware)

app = socketio.ASGIApp(sio, other_asgi_app=base_app)
