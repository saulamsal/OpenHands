"""Agent session with token tracking integration."""

from openhands.server.session.agent_session import AgentSession
from openhands.controller.agent import Agent
from openhands.core.config import AgentConfig, LLMConfig, OpenHandsConfig
from openhands.llm.token_tracking_llm import TokenTrackingLLM, InsufficientTokensError
from openhands.server.services.token_service import TokenService
from openhands.storage.database.session import get_async_session_context
from openhands.events.action import MessageAction
from openhands.events.event import Event


class TokenTrackingAgentSession(AgentSession):
    """Agent session that tracks token usage for billing."""
    
    def __init__(self, *args, conversation_id: str | None = None, **kwargs):
        super().__init__(*args, **kwargs)
        self.conversation_id = conversation_id
        self.original_llm = None
        self.token_service = None
    
    async def start(
        self,
        runtime_name: str,
        config: OpenHandsConfig,
        agent: Agent,
        max_iterations: int,
        git_provider_tokens=None,
        custom_secrets=None,
        max_budget_per_task: float | None = None,
        agent_to_llm_config: dict[str, LLMConfig] | None = None,
        agent_configs: dict[str, AgentConfig] | None = None,
        selected_repository: str | None = None,
        selected_branch: str | None = None,
        initial_message: MessageAction | None = None,
        conversation_instructions: str | None = None,
        replay_json: str | None = None,
        conversation_id: str | None = None,
    ) -> None:
        """Start the agent session with token tracking."""
        # Store conversation ID if provided
        if conversation_id:
            self.conversation_id = conversation_id
        
        # Wrap the agent's LLM with token tracking
        if self.user_id:
            try:
                async with get_async_session_context() as db:
                    self.token_service = TokenService(db)
                    self.original_llm = agent.llm
                    agent.llm = TokenTrackingLLM(
                        llm=agent.llm,
                        token_service=self.token_service,
                        user_id=self.user_id,
                        conversation_id=self.conversation_id
                    )
                    self.logger.info(f"Token tracking enabled for user {self.user_id}")
            except Exception as e:
                self.logger.error(f"Failed to initialize token tracking: {e}")
                # Continue without token tracking if initialization fails
        
        # Call parent start method
        await super().start(
            runtime_name=runtime_name,
            config=config,
            agent=agent,
            max_iterations=max_iterations,
            git_provider_tokens=git_provider_tokens,
            custom_secrets=custom_secrets,
            max_budget_per_task=max_budget_per_task,
            agent_to_llm_config=agent_to_llm_config,
            agent_configs=agent_configs,
            selected_repository=selected_repository,
            selected_branch=selected_branch,
            initial_message=initial_message,
            conversation_instructions=conversation_instructions,
            replay_json=replay_json,
        )
    
    def _create_controller(
        self,
        agent: Agent,
        confirmation_mode: bool,
        max_iterations: int,
        max_budget_per_task: float | None = None,
        agent_to_llm_config: dict[str, LLMConfig] | None = None,
        agent_configs: dict[str, AgentConfig] | None = None,
        replay_events: list[Event] | None = None,
    ):
        """Create controller with token-tracked agents."""
        # If we have agent_to_llm_config, we need to wrap those LLMs too
        if agent_to_llm_config and self.user_id and self.token_service:
            # For delegate agents, wrap their LLMs too
            for agent_name, llm_config in agent_to_llm_config.items():
                # This is a simplified approach - in production you'd need to handle
                # the actual LLM creation and wrapping for delegate agents
                pass
        
        return super()._create_controller(
            agent=agent,
            confirmation_mode=confirmation_mode,
            max_iterations=max_iterations,
            max_budget_per_task=max_budget_per_task,
            agent_to_llm_config=agent_to_llm_config,
            agent_configs=agent_configs,
            replay_events=replay_events,
        )
    
    async def close(self) -> None:
        """Close the session and restore original LLM if wrapped."""
        # Restore original LLM if we wrapped it
        if self.original_llm and self.controller and self.controller.agent:
            self.controller.agent.llm = self.original_llm
        
        await super().close()