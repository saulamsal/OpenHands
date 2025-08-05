import asyncio
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Dict, List, Optional, Set

import openhands
from openhands.core.config.mcp_config import MCPConfig
from openhands.core.logger import openhands_logger as logger
from openhands.events.action.agent import RecallAction
from openhands.events.event import Event, EventSource, RecallType
from openhands.events.observation.agent import (
    MicroagentKnowledge,
    RecallObservation,
)
from openhands.events.observation.empty import NullObservation
from openhands.events.stream import EventStream, EventStreamSubscriber
from openhands.microagent import (
    BaseMicroagent,
    KnowledgeMicroagent,
    RepoMicroagent,
    load_microagents_from_dir,
)
from openhands.runtime.base import Runtime
from openhands.runtime.runtime_status import RuntimeStatus
from openhands.utils.prompt import (
    ConversationInstructions,
    RepositoryInfo,
    RuntimeInfo,
)

GLOBAL_MICROAGENTS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(openhands.__file__)),
    'microagents',
)

USER_MICROAGENTS_DIR = Path.home() / '.openhands' / 'microagents'

# Framework-specific microagent sets for auto-loading
FRAMEWORK_MICROAGENT_SETS = {
    'expo': [
        'expo',
        'expo_routing', 
        'expo_styling',
        'expo_components',
        'expo_boilerplate',
        'expo_state',
        'expo_deployment'
    ],
    'nextjs': [
        'nextjs',
        'nextjs_routing',
        'nextjs_styling',
        'nextjs_components'
    ],
    'laravel': [
        'laravel',
        'laravel_routing',
        'laravel_eloquent',
        'laravel_blade'
    ]
}


class Memory:
    """
    Memory is a component that listens to the EventStream for information retrieval actions
    (a RecallAction) and publishes observations with the content (such as RecallObservation).
    """

    sid: str
    event_stream: EventStream
    status_callback: Callable | None
    loop: asyncio.AbstractEventLoop | None
    repo_microagents: dict[str, RepoMicroagent]
    knowledge_microagents: dict[str, KnowledgeMicroagent]
    
    # Framework-specific auto-loading
    detected_framework: Optional[str]
    auto_loaded_microagents: Set[str]
    force_load_framework: Optional[str]  # For Expo-only mode

    def __init__(
        self,
        event_stream: EventStream,
        sid: str,
        status_callback: Callable | None = None,
        force_load_framework: Optional[str] = None,
    ):
        self.event_stream = event_stream
        self.sid = sid if sid else str(uuid.uuid4())
        self.status_callback = status_callback
        self.loop = None

        self.event_stream.subscribe(
            EventStreamSubscriber.MEMORY,
            self.on_event,
            self.sid,
        )

        # Additional placeholders to store user workspace microagents
        self.repo_microagents = {}
        self.knowledge_microagents = {}
        
        # Framework-specific auto-loading
        self.detected_framework = None
        self.auto_loaded_microagents = set()
        self.force_load_framework = force_load_framework

        # Store repository / runtime info to send them to the templating later
        self.repository_info: RepositoryInfo | None = None
        self.runtime_info: RuntimeInfo | None = None
        self.conversation_instructions: ConversationInstructions | None = None

        # Load global microagents (Knowledge + Repo)
        # from typically OpenHands/microagents (i.e., the PUBLIC microagents)
        self._load_global_microagents()

        # Load user microagents from ~/.openhands/microagents/
        self._load_user_microagents()
        
        # Auto-load framework microagents if specified
        if self.force_load_framework:
            self.load_framework_microagents(self.force_load_framework)

    def on_event(self, event: Event):
        """Handle an event from the event stream."""
        asyncio.get_event_loop().run_until_complete(self._on_event(event))

    async def _on_event(self, event: Event):
        """Handle an event from the event stream asynchronously."""
        try:
            if isinstance(event, RecallAction):
                # if this is a workspace context recall (on first user message)
                # create and add a RecallObservation
                # with info about repo, runtime, instructions, etc. including microagent knowledge if any
                if (
                    event.source == EventSource.USER
                    and event.recall_type == RecallType.WORKSPACE_CONTEXT
                ):
                    logger.debug('Workspace context recall')
                    workspace_obs: RecallObservation | NullObservation | None = None

                    workspace_obs = self._on_workspace_context_recall(event)
                    if workspace_obs is None:
                        workspace_obs = NullObservation(content='')

                    # important: this will release the execution flow from waiting for the retrieval to complete
                    workspace_obs._cause = event.id  # type: ignore[union-attr]

                    self.event_stream.add_event(workspace_obs, EventSource.ENVIRONMENT)
                    return

                # Handle knowledge recall (triggered microagents)
                # Allow triggering from both user and agent messages
                elif (
                    event.source == EventSource.USER
                    or event.source == EventSource.AGENT
                ) and event.recall_type == RecallType.KNOWLEDGE:
                    logger.debug(
                        f'Microagent knowledge recall from {event.source} message'
                    )
                    microagent_obs: RecallObservation | NullObservation | None = None
                    microagent_obs = self._on_microagent_recall(event)
                    if microagent_obs is None:
                        microagent_obs = NullObservation(content='')

                    # important: this will release the execution flow from waiting for the retrieval to complete
                    microagent_obs._cause = event.id  # type: ignore[union-attr]

                    self.event_stream.add_event(microagent_obs, EventSource.ENVIRONMENT)
                    return
        except Exception as e:
            error_str = f'Error: {str(e.__class__.__name__)}'
            logger.error(error_str)
            self.set_runtime_status(RuntimeStatus.ERROR_MEMORY, error_str)
            return

    def _on_workspace_context_recall(
        self, event: RecallAction
    ) -> RecallObservation | None:
        """Add repository and runtime information to the stream as a RecallObservation.

        This method collects information from all available repo microagents and concatenates their contents.
        Multiple repo microagents are supported, and their contents will be concatenated with newlines between them.
        """

        # Create WORKSPACE_CONTEXT info:
        # - repository_info
        # - runtime_info
        # - repository_instructions
        # - microagent_knowledge

        # Collect raw repository instructions
        repo_instructions = ''

        # Retrieve the context of repo instructions from all repo microagents
        for microagent in self.repo_microagents.values():
            if repo_instructions:
                repo_instructions += '\n\n'
            repo_instructions += microagent.content

        # Find any matched microagents based on the query (includes auto-loaded)
        microagent_knowledge = self._enhanced_find_microagent_knowledge(event.query)

        # Create observation if we have anything
        if (
            self.repository_info
            or self.runtime_info
            or repo_instructions
            or microagent_knowledge
            or self.conversation_instructions
        ):
            obs = RecallObservation(
                recall_type=RecallType.WORKSPACE_CONTEXT,
                repo_name=self.repository_info.repo_name
                if self.repository_info and self.repository_info.repo_name is not None
                else '',
                repo_directory=self.repository_info.repo_directory
                if self.repository_info
                and self.repository_info.repo_directory is not None
                else '',
                repo_instructions=repo_instructions if repo_instructions else '',
                runtime_hosts=self.runtime_info.available_hosts
                if self.runtime_info and self.runtime_info.available_hosts is not None
                else {},
                additional_agent_instructions=self.runtime_info.additional_agent_instructions
                if self.runtime_info
                and self.runtime_info.additional_agent_instructions is not None
                else '',
                microagent_knowledge=microagent_knowledge,
                content='Added workspace context',
                date=self.runtime_info.date if self.runtime_info is not None else '',
                custom_secrets_descriptions=self.runtime_info.custom_secrets_descriptions
                if self.runtime_info is not None
                else {},
                conversation_instructions=self.conversation_instructions.content
                if self.conversation_instructions is not None
                else '',
                working_dir=self.runtime_info.working_dir if self.runtime_info else '',
            )
            return obs
        return None

    def _on_microagent_recall(
        self,
        event: RecallAction,
    ) -> RecallObservation | None:
        """When a microagent action triggers microagents, create a RecallObservation with structured data."""

        # Find any matched microagents based on the query (includes auto-loaded)
        microagent_knowledge = self._enhanced_find_microagent_knowledge(event.query)

        # Create observation if we have anything
        if microagent_knowledge:
            obs = RecallObservation(
                recall_type=RecallType.KNOWLEDGE,
                microagent_knowledge=microagent_knowledge,
                content='Retrieved knowledge from microagents',
            )
            return obs
        return None

    def _find_microagent_knowledge(self, query: str) -> list[MicroagentKnowledge]:
        """Find microagent knowledge based on a query.

        Args:
            query: The query to search for microagent triggers

        Returns:
            A list of MicroagentKnowledge objects for matched triggers
        """
        recalled_content: list[MicroagentKnowledge] = []

        # skip empty queries
        if not query:
            return recalled_content

        # Search for microagent triggers in the query
        for name, microagent in self.knowledge_microagents.items():
            trigger = microagent.match_trigger(query)
            if trigger:
                logger.info("Microagent '%s' triggered by keyword '%s'", name, trigger)
                recalled_content.append(
                    MicroagentKnowledge(
                        name=microagent.name,
                        trigger=trigger,
                        content=microagent.content,
                    )
                )
        return recalled_content
    
    def load_framework_microagents(self, framework: str) -> None:
        """Auto-load framework-specific microagents without requiring triggers.
        
        Args:
            framework: Framework name (e.g., 'expo', 'nextjs', 'laravel')
        """
        framework_lower = framework.lower()
        if framework_lower not in FRAMEWORK_MICROAGENT_SETS:
            logger.warning(f"Unknown framework for auto-loading: {framework}")
            return
            
        microagent_names = FRAMEWORK_MICROAGENT_SETS[framework_lower]
        loaded_count = 0
        
        for agent_name in microagent_names:
            if agent_name in self.knowledge_microagents and agent_name not in self.auto_loaded_microagents:
                # Mark as auto-loaded to track and avoid duplicates
                self.auto_loaded_microagents.add(agent_name)
                loaded_count += 1
                logger.info(f"Auto-loaded framework microagent: {agent_name} for {framework}")
            elif agent_name not in self.knowledge_microagents:
                logger.debug(f"Framework microagent not found: {agent_name} for {framework}")
                
        self.detected_framework = framework_lower
        logger.info(f"Auto-loaded {loaded_count} microagents for framework: {framework}")
    
    def get_auto_loaded_microagents(self, include_repo: bool = True) -> List[MicroagentKnowledge]:
        """Get all auto-loaded framework microagents as MicroagentKnowledge objects.
        
        Args:
            include_repo: Whether to include always-active repo microagents
            
        Returns:
            List of MicroagentKnowledge objects for auto-loaded microagents
        """
        auto_loaded_content: List[MicroagentKnowledge] = []
        
        # Add auto-loaded knowledge microagents
        for agent_name in self.auto_loaded_microagents:
            if agent_name in self.knowledge_microagents:
                microagent = self.knowledge_microagents[agent_name]
                auto_loaded_content.append(
                    MicroagentKnowledge(
                        name=microagent.name,
                        trigger="auto-loaded",  # Special trigger for auto-loaded
                        content=microagent.content,
                    )
                )
        
        # Add repo microagents (always active) if requested
        if include_repo:
            for agent_name, microagent in self.repo_microagents.items():
                auto_loaded_content.append(
                    MicroagentKnowledge(
                        name=microagent.name,
                        trigger="always-active",  # Special trigger for repo microagents
                        content=microagent.content,
                    )
                )
                
        return auto_loaded_content
    
    def _enhanced_find_microagent_knowledge(self, query: str) -> List[MicroagentKnowledge]:
        """Enhanced microagent knowledge finder that combines trigger-based and auto-loaded microagents.
        
        Args:
            query: The query to search for microagent triggers
            
        Returns:
            A list of MicroagentKnowledge objects for both triggered and auto-loaded microagents
        """
        # Get trigger-based microagents (existing functionality)
        triggered_content = self._find_microagent_knowledge(query)
        
        # Get auto-loaded framework microagents
        auto_loaded_content = self.get_auto_loaded_microagents(include_repo=False)  # Repo handled separately
        
        # Combine and deduplicate by name
        all_content = {}
        
        # Add triggered content (higher priority)
        for content in triggered_content:
            all_content[content.name] = content
            
        # Add auto-loaded content (only if not already triggered)
        for content in auto_loaded_content:
            if content.name not in all_content:
                all_content[content.name] = content
                
        return list(all_content.values())

    def load_user_workspace_microagents(
        self, user_microagents: list[BaseMicroagent]
    ) -> None:
        """
        This method loads microagents from a user's cloned repo or workspace directory.

        This is typically called from agent_session or setup once the workspace is cloned.
        """
        logger.info(
            'Loading user workspace microagents: %s', [m.name for m in user_microagents]
        )
        for user_microagent in user_microagents:
            if isinstance(user_microagent, KnowledgeMicroagent):
                self.knowledge_microagents[user_microagent.name] = user_microagent
            elif isinstance(user_microagent, RepoMicroagent):
                self.repo_microagents[user_microagent.name] = user_microagent

    def _load_global_microagents(self) -> None:
        """
        Loads microagents from the global microagents_dir
        """
        repo_agents, knowledge_agents = load_microagents_from_dir(
            GLOBAL_MICROAGENTS_DIR
        )
        for name, agent_knowledge in knowledge_agents.items():
            self.knowledge_microagents[name] = agent_knowledge
        for name, agent_repo in repo_agents.items():
            self.repo_microagents[name] = agent_repo

    def _load_user_microagents(self) -> None:
        """
        Loads microagents from the user's home directory (~/.openhands/microagents/)
        Creates the directory if it doesn't exist.
        """
        try:
            # Create the user microagents directory if it doesn't exist
            os.makedirs(USER_MICROAGENTS_DIR, exist_ok=True)

            # Load microagents from user directory
            repo_agents, knowledge_agents = load_microagents_from_dir(
                USER_MICROAGENTS_DIR
            )

            for name, agent_knowledge in knowledge_agents.items():
                self.knowledge_microagents[name] = agent_knowledge
            for name, agent_repo in repo_agents.items():
                self.repo_microagents[name] = agent_repo
        except Exception as e:
            logger.warning(
                f'Failed to load user microagents from {USER_MICROAGENTS_DIR}: {str(e)}'
            )

    def get_microagent_mcp_tools(self) -> list[MCPConfig]:
        """
        Get MCP tools from all repo microagents (always active)

        Returns:
            A list of MCP tools configurations from microagents
        """
        mcp_configs: list[MCPConfig] = []

        # Check all repo microagents for MCP tools (always active)
        for agent in self.repo_microagents.values():
            if agent.metadata.mcp_tools:
                mcp_configs.append(agent.metadata.mcp_tools)
                logger.debug(
                    f'Found MCP tools in repo microagent {agent.name}: {agent.metadata.mcp_tools}'
                )

        return mcp_configs

    def set_repository_info(self, repo_name: str, repo_directory: str) -> None:
        """Store repository info so we can reference it in an observation."""
        if repo_name or repo_directory:
            self.repository_info = RepositoryInfo(repo_name, repo_directory)
        else:
            self.repository_info = None

    def set_runtime_info(
        self,
        runtime: Runtime,
        custom_secrets_descriptions: dict[str, str],
        working_dir: str,
    ) -> None:
        """Store runtime info (web hosts, ports, etc.)."""
        # e.g. { '127.0.0.1': 8080 }
        utc_now = datetime.now(timezone.utc)
        date = str(utc_now.date())

        if runtime.web_hosts or runtime.additional_agent_instructions:
            self.runtime_info = RuntimeInfo(
                available_hosts=runtime.web_hosts,
                additional_agent_instructions=runtime.additional_agent_instructions,
                date=date,
                custom_secrets_descriptions=custom_secrets_descriptions,
                working_dir=working_dir,
            )
        else:
            self.runtime_info = RuntimeInfo(
                date=date,
                custom_secrets_descriptions=custom_secrets_descriptions,
                working_dir=working_dir,
            )

    def set_conversation_instructions(
        self, conversation_instructions: str | None
    ) -> None:
        """
        Set contextual information for conversation
        This is information the agent may require
        """
        self.conversation_instructions = ConversationInstructions(
            content=conversation_instructions or ''
        )

    def set_runtime_status(self, status: RuntimeStatus, message: str):
        """Sends an error message if the callback function was provided."""
        if self.status_callback:
            try:
                if self.loop is None:
                    self.loop = asyncio.get_running_loop()
                asyncio.run_coroutine_threadsafe(
                    self._set_runtime_status('error', status, message), self.loop
                )
            except (RuntimeError, KeyError) as e:
                logger.error(
                    f'Error sending status message: {e.__class__.__name__}',
                    stack_info=False,
                )

    async def _set_runtime_status(
        self, msg_type: str, runtime_status: RuntimeStatus, message: str
    ):
        """Sends a status message to the client."""
        if self.status_callback:
            self.status_callback(msg_type, runtime_status, message)
