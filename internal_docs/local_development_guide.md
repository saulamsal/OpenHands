# Local Development Guide

This guide will help you set up OpenHands for local development with hot reload and live editing.

## Prerequisites

### 1. Check Python Version
```bash
python3 --version
```
You need Python 3.11 or higher. If not installed, use Homebrew:
```bash
brew install python@3.13
```

### 2. Install Poetry (Python Package Manager)

**Option A: If you have pipx (Recommended)**
```bash
pipx install poetry
```

**Option B: If you don't have pipx**
```bash
# Install pipx first
brew install pipx
pipx ensurepath

# Then install poetry
pipx install poetry
```

**Option C: Direct installation**
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

### 3. Add Poetry to your PATH
Add this to your `~/.zshrc` or `~/.bashrc`:
```bash
export PATH="$HOME/.local/bin:$PATH"
```

Then reload:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

Verify Poetry is working:
```bash
poetry --version
```

## Setup Instructions

### 1. Clone the Repository (if not already done)
```bash
git clone <repository-url>
cd qlurplatform
```

### 2. Install Backend Dependencies
```bash
poetry install
```
This will install all Python dependencies in a virtual environment.

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

## Running the Development Environment

You need two terminal windows:

### Terminal 1: Backend Server
```bash
export SERVE_FRONTEND=false
poetry run python -m openhands.server
```

The backend will run on **http://localhost:3000**

### Terminal 2: Frontend Development Server
```bash
cd frontend
npm run dev
```

The frontend will run on **http://localhost:3001**

## 🎯 Access the Application

Open your browser and go to: **http://localhost:3001**

- ✅ Hot reload is enabled - changes reflect instantly
- ✅ Edit any file and save to see changes
- ✅ No Docker needed for development

## Making Changes

### Frontend Changes
- Edit files in `frontend/src/`
- Changes appear instantly (hot reload)
- Main entry: `frontend/src/root.tsx`
- Components: `frontend/src/components/`
- Routes: `frontend/src/routes/`

### Backend Changes
- Edit files in `openhands/`
- Server auto-restarts on save
- API endpoints: `openhands/server/`
- Agents: `openhands/agenthub/`

### Example: Changing UI Text
1. Edit `frontend/src/i18n/translation.json`
2. Find the text you want to change
3. Save the file
4. See changes instantly in browser

## Troubleshooting

### "poetry: command not found"
```bash
export PATH="$HOME/.local/bin:$PATH"
# Or use the full path: 
/Users/saul_sharma/.local/bin/poetry
```

### "ECONNREFUSED 127.0.0.1:3000"
Backend isn't running. Make sure to:
1. Set `export SERVE_FRONTEND=false`
2. Run `poetry run python -m openhands.server`

### Port already in use
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Frontend build errors
```bash
cd frontend
rm -rf node_modules
npm install
```

## Environment Variables (Optional)

Create a `.env` file in the root directory:
```bash
# Optional - for LLM configuration
LLM_MODEL=anthropic/claude-3-5-sonnet
LLM_API_KEY=your-api-key

# Development settings
SERVE_FRONTEND=false
LOG_LEVEL=DEBUG
```

## Quick Commands

### Start Everything
```bash
# Backend (Terminal 1)
export SERVE_FRONTEND=false && poetry run python -m openhands.server

# Frontend (Terminal 2)
cd frontend && npm run dev
```

### Run Tests
```bash
# Backend tests
poetry run pytest

# Frontend tests
cd frontend && npm test
```

### Format Code
```bash
# Backend
poetry run black .
poetry run ruff check --fix

# Frontend
cd frontend && npm run format
```

## VS Code Setup (Optional)

1. Install Python extension
2. Select Poetry interpreter: `Cmd+Shift+P` → "Python: Select Interpreter" → Choose the one with `openhands-ai`
3. Install recommended extensions when prompted

## Notes

- **No database required** - OpenHands uses file-based storage
- **No Docker needed** for development
- **Hot reload** works out of the box
- All data stored in `~/.openhands/`

## Next Steps

1. Read the [Architecture Guide](./architecture_guide.md) to understand the codebase
2. Check the [PHP/React Developer Guide](./guide_for_php_react_developers.md) if coming from PHP/Laravel
3. Start coding! 🚀