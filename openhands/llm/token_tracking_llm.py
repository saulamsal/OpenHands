"""Token tracking wrapper for LLM to integrate with subscription system."""

from typing import Any, Optional
from litellm.types.utils import ModelResponse

from openhands.core.logger import openhands_logger as logger
from openhands.llm.llm import LLM
from openhands.server.services.token_service import TokenService, calculate_tokens_to_deduct


class InsufficientTokensError(Exception):
    """Raised when user doesn't have enough tokens."""
    pass


class TokenTrackingLLM:
    """Wrapper for LLM that tracks token usage and deducts from user balance."""
    
    def __init__(self, llm: LLM, token_service: TokenService, user_id: str, conversation_id: Optional[str] = None):
        self.llm = llm
        self.token_service = token_service
        self.user_id = user_id
        self.conversation_id = conversation_id
    
    def __getattr__(self, name: str) -> Any:
        """Delegate all other attributes to the wrapped LLM."""
        return getattr(self.llm, name)
    
    async def completion_async(self, **kwargs: Any) -> ModelResponse:
        """Async version of completion with token tracking."""
        # Estimate tokens before making the call
        messages = kwargs.get('messages', [])
        model = self.llm.config.model
        
        # Rough estimation of input tokens (can be improved with proper tokenizer)
        input_tokens = self._estimate_input_tokens(messages)
        estimated_output_tokens = min(input_tokens * 2, self.llm.config.max_output_tokens)
        
        # Calculate cost and check balance
        tokens_needed, _ = calculate_tokens_to_deduct(
            model=model,
            input_tokens=input_tokens,
            output_tokens=estimated_output_tokens
        )
        
        # Pre-check balance (optional, for better UX)
        balance = await self.token_service.get_balance(self.user_id)
        if balance['total_available'] < tokens_needed * 1.5:  # 1.5x buffer for safety
            raise InsufficientTokensError(
                f"Insufficient tokens. Need ~{tokens_needed:,}, have {balance['total_available']:,}"
            )
        
        try:
            # Make the actual LLM call
            response: ModelResponse = await self.llm.completion_async(**kwargs)
            
            # Extract actual token usage from response
            usage = response.get('usage', {})
            actual_input_tokens = usage.get('prompt_tokens', input_tokens)
            actual_output_tokens = usage.get('completion_tokens', 0)
            
            # Calculate actual tokens to deduct
            tokens_to_deduct, _ = calculate_tokens_to_deduct(
                model=model,
                input_tokens=actual_input_tokens,
                output_tokens=actual_output_tokens
            )
            
            # Deduct tokens
            success, message, usage_details = await self.token_service.deduct_tokens(
                user_id=self.user_id,
                tokens_to_deduct=tokens_to_deduct,
                model=model,
                conversation_id=self.conversation_id,
                input_tokens=actual_input_tokens,
                output_tokens=actual_output_tokens
            )
            
            if not success:
                # This should rarely happen due to pre-check
                logger.error(f"Token deduction failed after LLM call: {message}")
                # We still return the response since the LLM call succeeded
            else:
                # Log usage for visibility
                logger.info(
                    f"Token usage - User: {self.user_id}, "
                    f"Model: {model}, "
                    f"Input: {actual_input_tokens}, "
                    f"Output: {actual_output_tokens}, "
                    f"Deducted: {usage_details['tokens_deducted']}, "
                    f"Cost: ${usage_details['charged_cost_cents']/100:.3f}"
                )
            
            return response
            
        except Exception as e:
            # Log error but don't charge for failed requests
            logger.error(f"LLM execution error: {str(e)}")
            raise
    
    def completion(self, **kwargs: Any) -> ModelResponse:
        """Synchronous version of completion with token tracking."""
        # For sync version, we need to handle the async token service calls
        # This is a simplified version - in production, you might want to handle this differently
        import asyncio
        
        # Get or create event loop
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Estimate tokens before making the call
        messages = kwargs.get('messages', [])
        model = self.llm.config.model
        
        # Rough estimation of input tokens
        input_tokens = self._estimate_input_tokens(messages)
        estimated_output_tokens = min(input_tokens * 2, self.llm.config.max_output_tokens)
        
        # Calculate cost and check balance
        tokens_needed, _ = calculate_tokens_to_deduct(
            model=model,
            input_tokens=input_tokens,
            output_tokens=estimated_output_tokens
        )
        
        # Pre-check balance
        balance = loop.run_until_complete(self.token_service.get_balance(self.user_id))
        if balance['total_available'] < tokens_needed * 1.5:  # 1.5x buffer for safety
            raise InsufficientTokensError(
                f"Insufficient tokens. Need ~{tokens_needed:,}, have {balance['total_available']:,}"
            )
        
        try:
            # Make the actual LLM call
            response: ModelResponse = self.llm.completion(**kwargs)
            
            # Extract actual token usage from response
            usage = response.get('usage', {})
            actual_input_tokens = usage.get('prompt_tokens', input_tokens)
            actual_output_tokens = usage.get('completion_tokens', 0)
            
            # Calculate actual tokens to deduct
            tokens_to_deduct, _ = calculate_tokens_to_deduct(
                model=model,
                input_tokens=actual_input_tokens,
                output_tokens=actual_output_tokens
            )
            
            # Deduct tokens
            success, message, usage_details = loop.run_until_complete(
                self.token_service.deduct_tokens(
                    user_id=self.user_id,
                    tokens_to_deduct=tokens_to_deduct,
                    model=model,
                    conversation_id=self.conversation_id,
                    input_tokens=actual_input_tokens,
                    output_tokens=actual_output_tokens
                )
            )
            
            if not success:
                logger.error(f"Token deduction failed after LLM call: {message}")
            else:
                logger.info(
                    f"Token usage - User: {self.user_id}, "
                    f"Model: {model}, "
                    f"Input: {actual_input_tokens}, "
                    f"Output: {actual_output_tokens}, "
                    f"Deducted: {usage_details['tokens_deducted']}, "
                    f"Cost: ${usage_details['charged_cost_cents']/100:.3f}"
                )
            
            return response
            
        except Exception as e:
            logger.error(f"LLM execution error: {str(e)}")
            raise
    
    def _estimate_input_tokens(self, messages: list[dict[str, Any]]) -> int:
        """Rough estimation of input tokens from messages."""
        # This is a very rough estimation
        # In production, you'd use a proper tokenizer
        total_chars = 0
        for msg in messages:
            if isinstance(msg, dict):
                content = msg.get('content', '')
                if isinstance(content, str):
                    total_chars += len(content)
                elif isinstance(content, list):
                    # Handle multi-part messages
                    for part in content:
                        if isinstance(part, dict) and 'text' in part:
                            total_chars += len(part['text'])
        
        # Rough estimation: ~4 chars per token
        return max(100, total_chars // 4)