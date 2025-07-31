This repository contains the code for OpenHands, an automated AI software engineer. It has a Python backend
(in the `openhands` directory) and React frontend (in the `frontend` directory).

## General Setup:
To set up the entire repo, including frontend and backend, run `make build`.
You don't need to do this unless the user asks you to, or if you're trying to run the entire application.

## Running OpenHands with OpenHands:
To run the full application to debug issues:
```bash
export INSTALL_DOCKER=0
export RUNTIME=local
make build && make run FRONTEND_PORT=12000 FRONTEND_HOST=0.0.0.0 BACKEND_HOST=0.0.0.0 &> /tmp/openhands-log.txt &
```

IMPORTANT: Before making any changes to the codebase, ALWAYS run `make install-pre-commit-hooks` to ensure pre-commit hooks are properly installed.

Before pushing any changes, you MUST ensure that any lint errors or simple test errors have been fixed.

* If you've made changes to the backend, you should run `pre-commit run --config ./dev_config/python/.pre-commit-config.yaml` (this will run on staged files).
* If you've made changes to the frontend, you should run `cd frontend && npm run lint:fix && npm run build ; cd ..`
* If you've made changes to the VSCode extension, you should run `cd openhands/integrations/vscode && npm run lint:fix && npm run compile ; cd ../../..`

The pre-commit hooks MUST pass successfully before pushing any changes to the repository. This is a mandatory requirement to maintain code quality and consistency.

If either command fails, it may have automatically fixed some issues. You should fix any issues that weren't automatically fixed,
then re-run the command to ensure it passes. Common issues include:
- Mypy type errors
- Ruff formatting issues
- Trailing whitespace
- Missing newlines at end of files

## Git Best Practices

- Prefer specific `git add <filename>` instead of `git add .` to avoid accidentally staging unintended files
- Be especially careful with `git reset --hard` after staging files, as it will remove accidentally staged files
- When remote has new changes, use `git fetch upstream && git rebase upstream/<branch>` on the same branch

## Repository Structure
Backend:
- Located in the `openhands` directory
- Testing:
  - All tests are in `tests/unit/test_*.py`
  - To test new code, run `poetry run pytest tests/unit/test_xxx.py` where `xxx` is the appropriate file for the current functionality
  - Write all tests with pytest

Frontend:
- Located in the `frontend` directory
- Prerequisites: A recent version of NodeJS / NPM
- Setup: Run `npm install` in the frontend directory
- Testing:
  - Run tests: `npm run test`
  - To run specific tests: `npm run test -- -t "TestName"`
  - Our test framework is vitest
- Building:
  - Build for production: `npm run build`
- Environment Variables:
  - Set in `frontend/.env` or as environment variables
  - Available variables: VITE_BACKEND_HOST, VITE_USE_TLS, VITE_INSECURE_SKIP_VERIFY, VITE_FRONTEND_PORT
- Internationalization:
  - Generate i18n declaration file: `npm run make-i18n`
- Data Fetching & Cache Management:
  - We use TanStack Query (fka React Query) for data fetching and cache management
  - Data Access Layer: API client methods are located in `frontend/src/api` and should never be called directly from UI components - they must always be wrapped with TanStack Query
  - Custom hooks are located in `frontend/src/hooks/query/` and `frontend/src/hooks/mutation/`
  - Query hooks should follow the pattern use[Resource] (e.g., `useConversationMicroagents`)
  - Mutation hooks should follow the pattern use[Action] (e.g., `useDeleteConversation`)
  - Architecture rule: UI components → TanStack Query hooks → Data Access Layer (`frontend/src/api`) → API endpoints

VSCode Extension:
- Located in the `openhands/integrations/vscode` directory
- Setup: Run `npm install` in the extension directory
- Linting:
  - Run linting with fixes: `npm run lint:fix`
  - Check only: `npm run lint`
  - Type checking: `npm run typecheck`
- Building:
  - Compile TypeScript: `npm run compile`
  - Package extension: `npm run package-vsix`
- Testing:
  - Run tests: `npm run test`
- Development Best Practices:
  - Use `vscode.window.createOutputChannel()` for debug logging instead of `showErrorMessage()` popups
  - Pre-commit process runs both frontend and backend checks when committing extension changes

## Template for Github Pull Request

If you are starting a pull request (PR), please follow the template in `.github/pull_request_template.md`.

## Implementation Details

These details may or may not be useful for your current task.

### Microagents

Microagents are specialized prompts that enhance OpenHands with domain-specific knowledge and task-specific workflows. They are Markdown files that can include frontmatter for configuration.

#### Types:
- **Public Microagents**: Located in `microagents/`, available to all users
- **Repository Microagents**: Located in `.openhands/microagents/`, specific to this repository

#### Loading Behavior:
- **Without frontmatter**: Always loaded into LLM context
- **With triggers in frontmatter**: Only loaded when user's message matches the specified trigger keywords

#### Structure:
```yaml
---
triggers:
- keyword1
- keyword2
---
# Microagent Content
Your specialized knowledge and instructions here...
```

### Frontend

#### Action Handling:
- Actions are defined in `frontend/src/types/action-type.ts`
- The `HANDLED_ACTIONS` array in `frontend/src/state/chat-slice.ts` determines which actions are displayed as collapsible UI elements
- To add a new action type to the UI:
  1. Add the action type to the `HANDLED_ACTIONS` array
  2. Implement the action handling in `addAssistantAction` function in chat-slice.ts
  3. Add a translation key in the format `ACTION_MESSAGE$ACTION_NAME` to the i18n files
- Actions with `thought` property are displayed in the UI based on their action type:
  - Regular actions (like "run", "edit") display the thought as a separate message
  - Special actions (like "think") are displayed as collapsible elements only

#### Adding User Settings:
- To add a new user setting to OpenHands, follow these steps:
  1. Add the setting to the frontend:
     - Add the setting to the `Settings` type in `frontend/src/types/settings.ts`
     - Add the setting to the `ApiSettings` type in the same file
     - Add the setting with an appropriate default value to `DEFAULT_SETTINGS` in `frontend/src/services/settings.ts`
     - Update the `useSettings` hook in `frontend/src/hooks/query/use-settings.ts` to map the API response
     - Update the `useSaveSettings` hook in `frontend/src/hooks/mutation/use-save-settings.ts` to include the setting in API requests
     - Add UI components (like toggle switches) in the appropriate settings screen (e.g., `frontend/src/routes/app-settings.tsx`)
     - Add i18n translations for the setting name and any tooltips in `frontend/src/i18n/translation.json`
     - Add the translation key to `frontend/src/i18n/declaration.ts`
  2. Add the setting to the backend:
     - Add the setting to the `Settings` model in `openhands/storage/data_models/settings.py`
     - Update any relevant backend code to apply the setting (e.g., in session creation)

### Adding New LLM Models

To add a new LLM model to OpenHands, you need to update multiple files across both frontend and backend:

#### Model Configuration Procedure:

1. **Frontend Model Arrays** (`frontend/src/utils/verified-models.ts`):
   - Add the model to `VERIFIED_MODELS` array (main list of all verified models)
   - Add to provider-specific arrays based on the model's provider:
     - `VERIFIED_OPENAI_MODELS` for OpenAI models
     - `VERIFIED_ANTHROPIC_MODELS` for Anthropic models
     - `VERIFIED_MISTRAL_MODELS` for Mistral models
     - `VERIFIED_OPENHANDS_MODELS` for models available through OpenHands provider

2. **Backend CLI Integration** (`openhands/cli/utils.py`):
   - Add the model to the appropriate `VERIFIED_*_MODELS` arrays
   - This ensures the model appears in CLI model selection

3. **Backend Model List** (`openhands/utils/llm.py`):
   - **CRITICAL**: Add the model to the `openhands_models` list (lines 57-66) if using OpenHands provider
   - This is required for the model to appear in the frontend model selector
   - Format: `'openhands/model-name'` (e.g., `'openhands/o3'`)

4. **Backend LLM Configuration** (`openhands/llm/llm.py`):
   - Add to feature-specific arrays based on model capabilities:
     - `FUNCTION_CALLING_SUPPORTED_MODELS` if the model supports function calling
     - `REASONING_EFFORT_SUPPORTED_MODELS` if the model supports reasoning effort parameters
     - `CACHE_PROMPT_SUPPORTED_MODELS` if the model supports prompt caching
     - `MODELS_WITHOUT_STOP_WORDS` if the model doesn't support stop words

5. **Validation**:
   - Run backend linting: `pre-commit run --config ./dev_config/python/.pre-commit-config.yaml`
   - Run frontend linting: `cd frontend && npm run lint:fix`
   - Run frontend build: `cd frontend && npm run build`

#### Model Verification Arrays:

- **VERIFIED_MODELS**: Main array of all verified models shown in the UI
- **VERIFIED_OPENAI_MODELS**: OpenAI models (LiteLLM doesn't return provider prefix)
- **VERIFIED_ANTHROPIC_MODELS**: Anthropic models (LiteLLM doesn't return provider prefix)
- **VERIFIED_MISTRAL_MODELS**: Mistral models (LiteLLM doesn't return provider prefix)
- **VERIFIED_OPENHANDS_MODELS**: Models available through OpenHands managed provider

#### Model Feature Support Arrays:

- **FUNCTION_CALLING_SUPPORTED_MODELS**: Models that support structured function calling
- **REASONING_EFFORT_SUPPORTED_MODELS**: Models that support reasoning effort parameters (like o1, o3)
- **CACHE_PROMPT_SUPPORTED_MODELS**: Models that support prompt caching for efficiency
- **MODELS_WITHOUT_STOP_WORDS**: Models that don't support stop word parameters

#### Frontend Model Integration:

- Models are automatically available in the model selector UI once added to verified arrays
- The `extractModelAndProvider` utility automatically detects provider from model arrays
- Provider-specific models are grouped and prioritized in the UI selection

#### CLI Model Integration:

- Models appear in CLI provider selection based on the verified arrays
- The `organize_models_and_providers` function groups models by provider
- Default model selection prioritizes verified models for each provider



## Glossary

# OpenHands Glossary

### Agent
The core AI entity in OpenHands that can perform software development tasks by interacting with tools, browsing the web, and modifying code.

#### Agent Controller
A component that manages the agent's lifecycle, handles its state, and coordinates interactions between the agent and various tools.

#### Agent Delegation
The ability of an agent to hand off specific tasks to other specialized agents for better task completion.

#### Agent Hub
A central registry of different agent types and their capabilities, allowing for easy agent selection and instantiation.

#### Agent Skill
A specific capability or function that an agent can perform, such as file manipulation, web browsing, or code editing.

#### Agent State
The current context and status of an agent, including its memory, active tools, and ongoing tasks.

#### CodeAct Agent
[A generalist agent in OpenHands](https://arxiv.org/abs/2407.16741) designed to perform tasks by editing and executing code.

### Browser
A system for web-based interactions and tasks.

#### Browser Gym
A testing and evaluation environment for browser-based agent interactions and tasks.

#### Web Browser Tool
A tool that enables agents to interact with web pages and perform web-based tasks.

### Commands
Terminal and execution related functionality.

#### Bash Session
A persistent terminal session that maintains state and history for bash command execution.
This uses tmux under the hood.

### Configuration
System-wide settings and options.

#### Agent Configuration
Settings that define an agent's behavior, capabilities, and limitations, including available tools and runtime settings.

#### Configuration Options
Settings that control various aspects of OpenHands behavior, including runtime, security, and agent settings.

#### LLM Config
Configuration settings for language models used by agents, including model selection and parameters.

#### LLM Draft Config
Settings for draft mode operations with language models, typically used for faster, lower-quality responses.

#### Runtime Configuration
Settings that define how the runtime environment should be set up and operated.

#### Security Options
Configuration settings that control security features and restrictions.

### Conversation
A sequence of interactions between a user and an agent, including messages, actions, and their results.

#### Conversation Info
Metadata about a conversation, including its status, participants, and timeline.

#### Conversation Manager
A component that handles the creation, storage, and retrieval of conversations.

#### Conversation Metadata
Additional information about conversations, such as tags, timestamps, and related resources.

#### Conversation Status
The current state of a conversation, including whether it's active, completed, or failed.

#### Conversation Store
A storage system for maintaining conversation history and related data.

### Events

#### Event
Every Conversation comprises a series of Events. Each Event is either an Action or an Observation.

#### Event Stream
A continuous flow of events that represents the ongoing activities and interactions in the system.

#### Action
A specific operation or command that an agent executes through available tools, such as running a command or editing a file.

#### Observation
The response or result returned by a tool after an agent's action, providing feedback about the action's outcome.

### Interface
Different ways to interact with OpenHands.

#### CLI Mode
A command-line interface mode for interacting with OpenHands agents without a graphical interface.

#### GUI Mode
A graphical user interface mode for interacting with OpenHands agents through a web interface.

#### Headless Mode
A mode of operation where OpenHands runs without a user interface, suitable for automation and scripting.

### Agent Memory
The system that decides which parts of the Event Stream (i.e. the conversation history) should be passed into each LLM prompt.

#### Memory Store
A storage system for maintaining agent memory and context across sessions.

#### Condenser
A component that processes and summarizes conversation history to maintain context while staying within token limits.

#### Truncation
A very simple Condenser strategy. Reduces conversation history or content to stay within token limits.

### Microagent
A specialized prompt that enhances OpenHands with domain-specific knowledge, repository-specific context, and task-specific workflows.

#### Microagent Registry
A central repository of available microagents and their configurations.

#### Public Microagent
A general-purpose microagent available to all OpenHands users, triggered by specific keywords. Located in `microagents/`.

#### Repository Microagent
A type of microagent that provides repository-specific context and guidelines, stored in the `.openhands/microagents/` directory.

### Prompt
Components for managing and processing prompts.

#### Prompt Caching
A system for caching and reusing common prompts to improve performance.

#### Prompt Manager
A component that handles the loading, processing, and management of prompts used by agents, including microagents.

#### Response Parsing
The process of interpreting and structuring responses from language models and tools.

### Runtime
The execution environment where agents perform their tasks, which can be local, remote, or containerized.

#### Action Execution Server
A REST API that receives agent actions (e.g. bash commands, python code, browsing actions), executes them in the runtime environment, and returns the results.

#### Action Execution Client
A component that handles the execution of actions in the runtime environment, managing the communication between the agent and the runtime.

#### Docker Runtime
A containerized runtime environment that provides isolation and reproducibility for agent operations.

#### E2B Runtime
A specialized runtime environment built on E2B for secure and isolated code execution.

#### Local Runtime
A runtime environment that executes on the local machine, suitable for development and testing.

#### Modal Runtime
A runtime environment built on Modal for scalable and distributed agent operations.

#### Remote Runtime
A sandboxed environment that executes code and commands remotely, providing isolation and security for agent operations.

#### Runtime Builder
A component that builds a Docker image for the Action Execution Server based on a user-specified base image.

### Security
Security-related components and features.

#### Security Analyzer
A component that checks agent actions for potential security risks.


