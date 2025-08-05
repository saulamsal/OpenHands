import contextlib
import warnings
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi.routing import Mount

with warnings.catch_warnings():
    warnings.simplefilter('ignore')

from fastapi import (
    FastAPI,
)

import openhands.agenthub  # noqa F401 (we import this to get the agents registered)
from openhands import __version__
from openhands.server.routes.conversation import app as conversation_api_router
from openhands.server.routes.feedback import app as feedback_api_router
from openhands.server.routes.files import app as files_api_router
from openhands.server.routes.git import app as git_api_router
from openhands.server.routes.health import add_health_endpoints
from openhands.server.routes.manage_conversations import (
    app as manage_conversation_api_router,
)
from openhands.server.routes.mcp import mcp_server
from openhands.server.routes.public import app as public_api_router
from openhands.server.routes.secrets import app as secrets_router
from openhands.server.routes.security import app as security_api_router
from openhands.server.routes.settings import app as settings_router
from openhands.server.routes.trajectory import app as trajectory_router
from openhands.server.routes.project_detection import app as project_detection_router
from openhands.server.routes.app_store import app as app_store_router
from openhands.server.shared import conversation_manager

# Always import auth routes - database is the only mode
from openhands.server.routes.auth import app as auth_router
from openhands.server.routes.teams import app as teams_router
from openhands.server.routes.session import app as session_router
from openhands.server.routes.api_keys import app as api_keys_router
from openhands.server.routes.llm_configurations import app as llm_configurations_router
from openhands.server.routes.billing import app as billing_router

mcp_app = mcp_server.http_app(path='/mcp')


def combine_lifespans(*lifespans):
    # Create a combined lifespan to manage multiple session managers
    @contextlib.asynccontextmanager
    async def combined_lifespan(app):
        async with contextlib.AsyncExitStack() as stack:
            for lifespan in lifespans:
                await stack.enter_async_context(lifespan(app))
            yield

    return combined_lifespan


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    async with conversation_manager:
        yield


app = FastAPI(
    title='OpenHands',
    description='OpenHands: Code Less, Make More',
    version=__version__,
    lifespan=combine_lifespans(_lifespan, mcp_app.lifespan),
    routes=[Mount(path='/mcp', app=mcp_app)],
)

# Add debug middleware to log all requests to /api/auth/users/me
from fastapi import Request
from openhands.core.logger import openhands_logger as logger

@app.middleware("http")
async def log_users_me_requests(request: Request, call_next):
    if request.url.path == "/api/auth/users/me":
        logger.info(f"MIDDLEWARE: Request to {request.url.path}")
        logger.info(f"MIDDLEWARE: Method: {request.method}")
        logger.info(f"MIDDLEWARE: Cookies: {dict(request.cookies)}")
    response = await call_next(request)
    if request.url.path == "/api/auth/users/me":
        logger.info(f"MIDDLEWARE: Response status: {response.status_code}")
    return response


# Always include auth routes - MUST come before public router
app.include_router(auth_router)
app.include_router(public_api_router)
app.include_router(teams_router)
app.include_router(session_router)

app.include_router(files_api_router)
app.include_router(security_api_router)
app.include_router(feedback_api_router)
app.include_router(conversation_api_router)
app.include_router(manage_conversation_api_router)
app.include_router(settings_router)
app.include_router(secrets_router)
app.include_router(git_api_router)
app.include_router(trajectory_router)
app.include_router(project_detection_router)
app.include_router(app_store_router)
app.include_router(api_keys_router)
app.include_router(llm_configurations_router)
app.include_router(billing_router)
add_health_endpoints(app)
