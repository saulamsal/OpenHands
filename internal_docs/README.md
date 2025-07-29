# OpenHands Internal Documentation

Welcome to the OpenHands internal documentation. This folder contains guides for developers working on the OpenHands project.

## 📚 Documentation Structure

### Core Guides

1. **[Local Development Guide](./local_development_guide.md)** 🚀
   - Start here if you want to develop OpenHands locally
   - Includes setup instructions with Poetry and npm
   - Hot reload enabled for rapid development
   - Step-by-step troubleshooting

2. **[Deployment Guide](./deployment_guide.md)** 🐳
   - For running OpenHands in production or demos
   - Docker-based deployment instructions
   - Security considerations
   - Cloud deployment options

3. **[Architecture Guide](./architecture_guide.md)** 🏗️
   - Deep dive into the codebase structure
   - Backend (FastAPI) and Frontend (React) architecture
   - How components communicate
   - Where to find and modify features

### Specialized Guides

4. **[PHP/React Developer Guide](./guide_for_php_react_developers.md)** 🔄
   - For developers coming from Laravel/PHP backgrounds
   - Maps Laravel concepts to OpenHands/FastAPI
   - Familiar patterns and approaches

5. **[Git Management Guide](./git_management_guide.md)** 🌿
   - How we manage our fork and custom modifications
   - Branching strategy (main vs sl-custom)
   - Syncing with upstream OpenHands
   - **IMPORTANT**: Read this before making any Git operations

## 🎯 Quick Start

- **Want to develop?** → [Local Development Guide](./local_development_guide.md)
- **Want to deploy?** → [Deployment Guide](./deployment_guide.md)
- **Want to understand the code?** → [Architecture Guide](./architecture_guide.md)

## 📝 Key Points

- **Local Development** = Hot reload, live editing, instant feedback
- **Docker Deployment** = Production-ready, but NOT for development
- **No database required** = File-based storage
- **Two servers needed** = Backend (port 3000) + Frontend (port 3001)

## 🛠️ Common Commands

```bash
# Start development environment
export SERVE_FRONTEND=false
poetry run python -m openhands.server  # Terminal 1
cd frontend && npm run dev             # Terminal 2

# Deploy with Docker
docker run -it --rm --pull=always \
    -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.50-nikolaik \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v ~/.openhands:/.openhands \
    -p 3000:3000 \
    docker.all-hands.dev/all-hands-ai/openhands:0.50
```

Choose the right guide for your needs and happy coding! 🎉