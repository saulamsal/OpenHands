# OpenHands Architecture Guide

A comprehensive guide to understanding and modifying the OpenHands codebase.

## Table of Contents
1. [System Overview](#system-overview)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Database & Storage](#database--storage)
5. [API & Communication](#api--communication)
6. [Development Guide](#development-guide)
7. [Customization Guide](#customization-guide)

## System Overview

OpenHands is a platform for AI-powered software development agents. It follows a modular, event-driven architecture with clear separation between frontend, backend, and runtime environments.

### High-Level Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│  FastAPI Backend│────▶│ Runtime Sandbox │
│  (TypeScript)   │     │    (Python)     │     │    (Docker)     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                        │
        └────── WebSocket ───────┴────── Event Bus ──────┘
```

## Backend Architecture

### Technology Stack
- **Framework**: FastAPI (Python 3.12)
- **Server**: Uvicorn ASGI server
- **Real-time**: Socket.IO for WebSocket communication
- **Task Queue**: Event-driven architecture with async processing

### Directory Structure
```
openhands/
├── server/          # FastAPI application
│   ├── app.py      # Main application setup
│   ├── listen.py   # WebSocket handlers
│   └── *.py        # API route handlers
├── controller/      # Agent orchestration
├── agenthub/       # Agent implementations
├── events/         # Event system
├── runtime/        # Execution environments
├── storage/        # Storage abstractions
└── llm/            # LLM integrations
```

### Key Backend Components

#### 1. Server Entry Point
- **File**: `openhands/server/__main__.py`
- **Port**: 3000 (default)
- **Configuration**: Environment variables and TOML files

#### 2. Event System
- **Location**: `openhands/events/`
- **Pattern**: Event sourcing with Action/Observation pairs
- **Storage**: Pluggable event stores (file, memory, etc.)

#### 3. Agent System
- **Location**: `openhands/agenthub/`
- **Available Agents**:
  - `CodeActAgent`: Main coding agent
  - `BrowsingAgent`: Web browsing capabilities
  - `ReadOnlyAgent`: Safe read-only operations
  - Custom agents can be added

#### 4. Runtime Environments
- **Location**: `openhands/runtime/`
- **Options**:
  - Docker (default)
  - Kubernetes
  - Local execution
  - Remote (E2B, Modal, etc.)

## Frontend Architecture

### Technology Stack
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **State Management**: Redux Toolkit + React Query
- **Styling**: Tailwind CSS v4
- **UI Components**: HeroUI React

### Directory Structure
```
frontend/
├── src/
│   ├── api/         # API client code
│   ├── components/  # Reusable components
│   ├── routes/      # Page components
│   ├── state/       # Redux slices
│   ├── hooks/       # Custom React hooks
│   └── services/    # Business logic
├── public/          # Static assets
└── package.json     # Dependencies
```

### Key Frontend Features

#### 1. Main Entry Points
- **App Entry**: `frontend/src/root.tsx`
- **Routes**: `frontend/src/routes.ts`
- **State Store**: `frontend/src/store.ts`

#### 2. Core Components
- **Chat Interface**: Real-time messaging with AI
- **Code Editor**: Monaco editor integration
- **Terminal**: xterm.js for command execution
- **File Browser**: Interactive file system view
- **Settings**: User preferences and configuration

#### 3. WebSocket Integration
- **File**: `frontend/src/context/ws-client-provider.tsx`
- **Events**: User actions, agent responses, system updates

## Database & Storage

### Storage Architecture

OpenHands uses an **abstract storage layer** with multiple implementations:

#### 1. Storage Interfaces
- **Location**: `openhands/storage/`
- **Base Class**: `FileStore` abstract interface

#### 2. Storage Implementations

##### Local File Storage (Default)
```python
# openhands/storage/local.py
LocalFileStore:
  - Path: ~/.openhands/
  - Stores: conversations, settings, events
```

##### Cloud Storage Options
- **S3**: `S3FileStore` for AWS S3
- **GCS**: `GoogleCloudStorage` for Google Cloud
- **Memory**: `MemoryStore` for testing

#### 3. Data Types Stored
- **Conversations**: Chat history and context
- **Settings**: User preferences
- **Secrets**: Encrypted credentials
- **Events**: Agent action history
- **Files**: Workspace files

### No Traditional Database

**Important**: OpenHands does NOT use a traditional SQL/NoSQL database. Instead:
- Data is stored as JSON files (local mode)
- Or in object storage (cloud mode)
- Event sourcing pattern for history

## API & Communication

### REST API Endpoints

#### Core Endpoints
```
GET  /api/models           # List available LLM models
GET  /api/agents           # List available agents
POST /api/conversations    # Create new conversation
GET  /api/conversations/:id # Get conversation details
POST /api/files/*          # File operations
GET  /api/settings         # User settings
POST /api/secrets          # Manage credentials
```

#### Git Integration
```
POST /api/github/*         # GitHub operations
POST /api/gitlab/*         # GitLab operations
POST /api/bitbucket/*      # Bitbucket operations
```

### WebSocket Events

#### Client to Server
```javascript
socket.emit('oh_user_action', {
  action: 'run',
  message: 'npm install',
  wait_for_response: true
});
```

#### Server to Client
```javascript
socket.on('oh_event', (event) => {
  // Handle agent responses, observations, etc.
});
```

### Communication Flow

```
User Input → Frontend → WebSocket → Backend → Agent Controller
                                                      ↓
Terminal ← Frontend ← WebSocket ← Backend ← Runtime Execution
```

## Development Guide

### Prerequisites
- Python 3.12+
- Node.js 18+
- Docker
- Poetry (Python package manager)

### Backend Development

#### 1. Install Dependencies
```bash
cd openhands
poetry install
```

#### 2. Run Development Server
```bash
poetry run python -m openhands.server
```

#### 3. Adding New API Endpoints
Create new route in `openhands/server/`:
```python
# openhands/server/my_feature.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/api/my-feature")
async def my_feature():
    return {"status": "ok"}
```

Register in `app.py`:
```python
app.include_router(my_feature.router)
```

### Frontend Development

#### 1. Install Dependencies
```bash
cd frontend
npm install
```

#### 2. Run Development Server
```bash
npm run dev
```

#### 3. Adding New Components
```typescript
// frontend/src/components/MyComponent.tsx
export function MyComponent() {
  return <div>Hello OpenHands!</div>;
}
```

## Customization Guide

### 1. Reskinning the UI

#### Change Colors/Theme
Edit `frontend/tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      primary: '#your-color',
      secondary: '#your-color'
    }
  }
}
```

#### Change Logo
Replace files in:
- `frontend/public/` (favicons)
- `docs/static/img/logo.png`

### 2. Adding Custom Agents

Create new agent in `openhands/agenthub/`:
```python
# openhands/agenthub/my_agent/my_agent.py
from openhands.controller.agent import Agent

class MyCustomAgent(Agent):
    def __init__(self, llm):
        super().__init__(llm)
    
    def step(self, state):
        # Implement agent logic
        return action
```

### 3. Adding Storage Providers

Implement `FileStore` interface:
```python
# openhands/storage/my_storage.py
from openhands.storage.files import FileStore

class MyCustomStore(FileStore):
    def write(self, path: str, data: str):
        # Implement write
    
    def read(self, path: str) -> str:
        # Implement read
```

### 4. Modifying Runtime Behavior

Edit runtime configuration in:
- `openhands/runtime/impl/` for runtime implementations
- `containers/` for Docker configurations

### 5. Adding LLM Providers

Configure in `openhands/llm/`:
- Add provider-specific code
- Update `llm_config.py` for configuration

## Environment Variables

Key environment variables:
```bash
# LLM Configuration
LLM_MODEL=anthropic/claude-3.5-sonnet
LLM_API_KEY=your-api-key

# Storage Configuration
FILE_STORE_TYPE=local  # or s3, gcs
FILE_STORE_PATH=/data

# Runtime Configuration
SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.50
DEFAULT_RUNTIME=docker  # or kubernetes, local

# Server Configuration
PORT=3000
HOST=0.0.0.0
```

## Deployment Considerations

### Docker Deployment
- Multi-stage build optimizes image size
- Non-root user for security
- Volume mounts for persistence

### Kubernetes Deployment
- Helm charts available in separate repo
- Supports multi-tenant with proper configuration
- Requires persistent volume claims

### Security Notes
- No built-in authentication (add reverse proxy)
- Isolate runtime environments
- Secure WebSocket connections with TLS
- Validate all file operations

## Contributing

1. **Code Style**:
   - Backend: Black + Ruff (Python)
   - Frontend: ESLint + Prettier

2. **Testing**:
   - Backend: pytest
   - Frontend: Vitest + Playwright

3. **Documentation**:
   - Update docs/ for user-facing changes
   - Add docstrings for new functions
   - Update this guide for architecture changes

## Useful Commands

### Development
```bash
# Full build
make build

# Run tests
make test

# Format code
make format

# Type checking
make lint
```

### Docker
```bash
# Build image
docker build -t openhands .

# Run container
docker run -p 3000:3000 openhands
```

## Architecture Diagrams

### Component Interaction
```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  Chat UI │ Code Editor │ Terminal │ File Browser │ Settings │
└────┬─────────────┬──────────┬──────────┬──────────┬────────┘
     │             │          │          │          │
     └─────────────┴──────────┴──────────┴──────────┘
                              │
                    ┌─────────▼─────────┐
                    │   WebSocket (WS)   │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                    Backend (FastAPI)                        │
├─────────────────────────────────────────────────────────────┤
│  API Routes │ Auth │ Event Handler │ Storage │ Agent Ctrl  │
└──────┬──────────┬────────┬─────────────┬──────────┬───────┘
       │          │        │             │          │
       └──────────┴────────┴─────────────┴──────────┘
                           │
                  ┌────────▼────────┐
                  │ Runtime Sandbox  │
                  │    (Docker)      │
                  └─────────────────┘
```

## Getting Started

- **For Development**: See the [Local Development Guide](./local_development_guide.md)
- **For Deployment**: See the [Deployment Guide](./deployment_guide.md)
- **For PHP/Laravel Developers**: See the [PHP React Developer Guide](./guide_for_php_react_developers.md)

This guide should help you understand and contribute to the OpenHands project. For more specific questions, refer to the source code or join the community channels!