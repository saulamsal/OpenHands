import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from typing import List, Dict, Any

from openhands.llm.token_tracking_llm import TokenTrackingLLM
from openhands.server.services.token_service import TokenService
from openhands.server.services.rate_limiter import RateLimiter


@pytest.fixture
def mock_base_llm():
    """Create a mock base LLM."""
    mock_llm = AsyncMock()
    mock_llm.model = "gpt-4"
    mock_llm.cost_per_1k_input_tokens = 0.03
    mock_llm.cost_per_1k_output_tokens = 0.06
    return mock_llm


@pytest.fixture
def mock_token_service():
    """Create a mock token service."""
    return AsyncMock(spec=TokenService)


@pytest.fixture
def mock_rate_limiter():
    """Create a mock rate limiter."""
    return AsyncMock(spec=RateLimiter)


@pytest.fixture
def token_tracking_llm(mock_base_llm, mock_token_service, mock_rate_limiter):
    """Create a TokenTrackingLLM instance with mock dependencies."""
    with patch("openhands.llm.token_tracking_llm.get_db") as mock_get_db:
        mock_db = AsyncMock()
        mock_get_db.return_value = mock_db
        
        llm = TokenTrackingLLM(
            base_llm=mock_base_llm,
            user_id="test_user",
            conversation_id="conv_123",
        )
        
        # Inject mocked services
        llm._token_service = mock_token_service
        llm._rate_limiter = mock_rate_limiter
        
        return llm


class TestTokenTrackingLLM:
    """Test cases for TokenTrackingLLM."""

    @pytest.mark.asyncio
    async def test_completion_success(self, token_tracking_llm, mock_base_llm, mock_token_service, mock_rate_limiter):
        """Test successful completion with token tracking."""
        # Mock rate limit check
        mock_rate_limiter.check_rate_limit.return_value = (True, 10, None)
        
        # Mock base LLM response
        mock_response = {
            "choices": [{"message": {"content": "Hello, world!"}}],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 5,
                "total_tokens": 15,
            },
        }
        mock_base_llm.completion.return_value = mock_response
        
        # Mock token deduction
        mock_token_service.deduct_tokens.return_value = (
            True,
            "Successfully deducted 15 tokens",
            {"remaining_balance": 1000},
        )
        
        # Call the method
        messages = [{"role": "user", "content": "Hello"}]
        result = await token_tracking_llm.completion(
            messages=messages,
            temperature=0.7,
        )
        
        # Assert results
        assert result == mock_response
        
        # Verify rate limit was checked
        mock_rate_limiter.check_rate_limit.assert_called_once_with(
            action="llm_completion",
            user_id="test_user",
            ip_address=None,
            has_subscription=True,  # Assumes user has tokens
        )
        
        # Verify tokens were deducted
        mock_token_service.deduct_tokens.assert_called_once_with(
            user_id="test_user",
            tokens_to_deduct=15,
            model="gpt-4",
            conversation_id="conv_123",
            input_tokens=10,
            output_tokens=5,
        )
        
        # Verify base LLM was called
        mock_base_llm.completion.assert_called_once_with(
            messages=messages,
            temperature=0.7,
        )

    @pytest.mark.asyncio
    async def test_completion_insufficient_tokens(self, token_tracking_llm, mock_base_llm, mock_token_service, mock_rate_limiter):
        """Test completion failure due to insufficient tokens."""
        # Mock rate limit check
        mock_rate_limiter.check_rate_limit.return_value = (True, 10, None)
        
        # Mock base LLM response
        mock_response = {
            "usage": {"total_tokens": 1000},
        }
        mock_base_llm.completion.return_value = mock_response
        
        # Mock token deduction failure
        mock_token_service.deduct_tokens.return_value = (
            False,
            "Insufficient tokens",
            {"tokens_required": 1000, "tokens_available": 100},
        )
        
        # Call the method and expect error
        messages = [{"role": "user", "content": "Long prompt"}]
        with pytest.raises(Exception, match="Insufficient tokens"):
            await token_tracking_llm.completion(messages=messages)
        
        # Verify base LLM was called for estimation
        mock_base_llm.completion.assert_called_once()
        
        # Verify token deduction was attempted
        mock_token_service.deduct_tokens.assert_called_once()

    @pytest.mark.asyncio
    async def test_completion_rate_limited(self, token_tracking_llm, mock_rate_limiter):
        """Test completion blocked by rate limiting."""
        # Mock rate limit check - blocked
        mock_rate_limiter.check_rate_limit.return_value = (
            False,
            0,
            "2024-01-01T12:00:00Z",
        )
        
        # Mock rate limit log
        mock_rate_limiter.log_action = AsyncMock()
        
        # Call the method and expect error
        messages = [{"role": "user", "content": "Hello"}]
        with pytest.raises(Exception, match="Rate limit exceeded"):
            await token_tracking_llm.completion(messages=messages)
        
        # Verify rate limit was checked
        mock_rate_limiter.check_rate_limit.assert_called_once()
        
        # Verify action was logged
        mock_rate_limiter.log_action.assert_called_once_with(
            action="llm_completion",
            user_id="test_user",
            ip_address=None,
            allowed=False,
            reason="Rate limit exceeded",
        )

    @pytest.mark.asyncio
    async def test_streaming_completion(self, token_tracking_llm, mock_base_llm, mock_token_service, mock_rate_limiter):
        """Test streaming completion with token tracking."""
        # Mock rate limit check
        mock_rate_limiter.check_rate_limit.return_value = (True, 10, None)
        
        # Mock streaming response
        async def mock_stream():
            yield {"choices": [{"delta": {"content": "Hello"}}]}
            yield {"choices": [{"delta": {"content": " world"}}]}
            yield {
                "choices": [{"delta": {"content": "!"}}],
                "usage": {
                    "prompt_tokens": 5,
                    "completion_tokens": 3,
                    "total_tokens": 8,
                },
            }
        
        mock_base_llm.stream.return_value = mock_stream()
        
        # Mock token deduction
        mock_token_service.deduct_tokens.return_value = (
            True,
            "Successfully deducted 8 tokens",
            {"remaining_balance": 1000},
        )
        
        # Call the method
        messages = [{"role": "user", "content": "Hi"}]
        chunks = []
        async for chunk in token_tracking_llm.stream(messages=messages):
            chunks.append(chunk)
        
        # Assert results
        assert len(chunks) == 3
        assert chunks[0]["choices"][0]["delta"]["content"] == "Hello"
        assert chunks[1]["choices"][0]["delta"]["content"] == " world"
        assert chunks[2]["choices"][0]["delta"]["content"] == "!"
        
        # Verify tokens were deducted after streaming
        mock_token_service.deduct_tokens.assert_called_once_with(
            user_id="test_user",
            tokens_to_deduct=8,
            model="gpt-4",
            conversation_id="conv_123",
            input_tokens=5,
            output_tokens=3,
        )

    @pytest.mark.asyncio
    async def test_get_token_usage(self, token_tracking_llm, mock_token_service):
        """Test getting token usage statistics."""
        # Mock token balance
        mock_token_service.get_balance.return_value = {
            "subscription_tokens_available": 2000000,
            "topup_tokens_available": 500000,
            "free_tier_tokens_available": 0,
            "total_available": 2500000,
        }
        
        # Mock usage history
        mock_token_service.get_usage_history.return_value = [
            {
                "timestamp": "2024-01-01T10:00:00Z",
                "model": "gpt-4",
                "tokens_deducted": 150,
                "cost_cents": 30,
            },
            {
                "timestamp": "2024-01-01T11:00:00Z",
                "model": "gpt-3.5-turbo",
                "tokens_deducted": 300,
                "cost_cents": 15,
            },
        ]
        
        # Call the method
        usage = await token_tracking_llm.get_token_usage()
        
        # Assert results
        assert usage["balance"]["total_available"] == 2500000
        assert len(usage["recent_usage"]) == 2
        assert usage["recent_usage"][0]["model"] == "gpt-4"

    @pytest.mark.asyncio
    async def test_model_property(self, token_tracking_llm, mock_base_llm):
        """Test model property delegation."""
        assert token_tracking_llm.model == "gpt-4"

    @pytest.mark.asyncio
    async def test_cost_properties(self, token_tracking_llm, mock_base_llm):
        """Test cost property delegation."""
        assert token_tracking_llm.cost_per_1k_input_tokens == 0.03
        assert token_tracking_llm.cost_per_1k_output_tokens == 0.06

    @pytest.mark.asyncio
    async def test_completion_with_tools(self, token_tracking_llm, mock_base_llm, mock_token_service, mock_rate_limiter):
        """Test completion with tool usage."""
        # Mock rate limit check
        mock_rate_limiter.check_rate_limit.return_value = (True, 10, None)
        
        # Mock base LLM response with tool call
        mock_response = {
            "choices": [{
                "message": {
                    "content": None,
                    "tool_calls": [{
                        "function": {
                            "name": "search",
                            "arguments": '{"query": "test"}',
                        }
                    }],
                }
            }],
            "usage": {
                "prompt_tokens": 50,
                "completion_tokens": 20,
                "total_tokens": 70,
            },
        }
        mock_base_llm.completion.return_value = mock_response
        
        # Mock token deduction
        mock_token_service.deduct_tokens.return_value = (
            True,
            "Successfully deducted 70 tokens",
            {"remaining_balance": 5000},
        )
        
        # Define tools
        tools = [{
            "type": "function",
            "function": {
                "name": "search",
                "description": "Search for information",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                    },
                },
            },
        }]
        
        # Call the method
        messages = [{"role": "user", "content": "Search for test"}]
        result = await token_tracking_llm.completion(
            messages=messages,
            tools=tools,
        )
        
        # Assert results
        assert result == mock_response
        assert result["choices"][0]["message"]["tool_calls"] is not None
        
        # Verify tokens were tracked
        mock_token_service.deduct_tokens.assert_called_once_with(
            user_id="test_user",
            tokens_to_deduct=70,
            model="gpt-4",
            conversation_id="conv_123",
            input_tokens=50,
            output_tokens=20,
        )

    @pytest.mark.asyncio
    async def test_completion_error_handling(self, token_tracking_llm, mock_base_llm, mock_token_service, mock_rate_limiter):
        """Test error handling in completion."""
        # Mock rate limit check
        mock_rate_limiter.check_rate_limit.return_value = (True, 10, None)
        
        # Mock base LLM error
        mock_base_llm.completion.side_effect = Exception("API Error")
        
        # Call the method and expect error propagation
        messages = [{"role": "user", "content": "Hello"}]
        with pytest.raises(Exception, match="API Error"):
            await token_tracking_llm.completion(messages=messages)
        
        # Verify no tokens were deducted on error
        mock_token_service.deduct_tokens.assert_not_called()

    @pytest.mark.asyncio
    async def test_streaming_error_handling(self, token_tracking_llm, mock_base_llm, mock_token_service, mock_rate_limiter):
        """Test error handling in streaming completion."""
        # Mock rate limit check
        mock_rate_limiter.check_rate_limit.return_value = (True, 10, None)
        
        # Mock streaming error
        async def mock_stream_error():
            yield {"choices": [{"delta": {"content": "Start"}}]}
            raise Exception("Stream interrupted")
        
        mock_base_llm.stream.return_value = mock_stream_error()
        
        # Call the method and expect error
        messages = [{"role": "user", "content": "Hi"}]
        chunks = []
        
        with pytest.raises(Exception, match="Stream interrupted"):
            async for chunk in token_tracking_llm.stream(messages=messages):
                chunks.append(chunk)
        
        # Verify partial response was received
        assert len(chunks) == 1
        assert chunks[0]["choices"][0]["delta"]["content"] == "Start"
        
        # Verify no tokens were deducted on error
        mock_token_service.deduct_tokens.assert_not_called()

    @pytest.mark.asyncio
    async def test_free_tier_user(self, token_tracking_llm, mock_base_llm, mock_token_service, mock_rate_limiter):
        """Test completion for free tier user."""
        # Mock token balance check showing only free tier tokens
        mock_token_service.get_balance.return_value = {
            "subscription_tokens_available": 0,
            "topup_tokens_available": 0,
            "free_tier_tokens_available": 50000,
            "total_available": 50000,
        }
        
        # Mock rate limit check
        mock_rate_limiter.check_rate_limit.return_value = (True, 1, None)
        
        # Mock base LLM response
        mock_response = {
            "choices": [{"message": {"content": "Hello!"}}],
            "usage": {"total_tokens": 10},
        }
        mock_base_llm.completion.return_value = mock_response
        
        # Mock token deduction
        mock_token_service.deduct_tokens.return_value = (
            True,
            "Successfully deducted 10 tokens",
            {"remaining_balance": 49990},
        )
        
        # Call the method
        messages = [{"role": "user", "content": "Hi"}]
        result = await token_tracking_llm.completion(messages=messages)
        
        # Assert results
        assert result == mock_response
        
        # Verify rate limit was checked with free tier status
        mock_rate_limiter.check_rate_limit.assert_called_once()
        call_args = mock_rate_limiter.check_rate_limit.call_args
        assert call_args[1]["has_subscription"] is False  # Free tier user

    @pytest.mark.asyncio
    async def test_completion_with_metadata(self, token_tracking_llm, mock_base_llm, mock_token_service, mock_rate_limiter):
        """Test completion with additional metadata tracking."""
        # Mock rate limit check
        mock_rate_limiter.check_rate_limit.return_value = (True, 10, None)
        
        # Mock base LLM response
        mock_response = {
            "id": "chatcmpl-123",
            "object": "chat.completion",
            "created": 1234567890,
            "model": "gpt-4",
            "choices": [{"message": {"content": "Response"}}],
            "usage": {
                "prompt_tokens": 20,
                "completion_tokens": 10,
                "total_tokens": 30,
            },
        }
        mock_base_llm.completion.return_value = mock_response
        
        # Mock token deduction
        mock_token_service.deduct_tokens.return_value = (
            True,
            "Successfully deducted 30 tokens",
            {"remaining_balance": 2000},
        )
        
        # Call the method with metadata
        messages = [{"role": "user", "content": "Test"}]
        result = await token_tracking_llm.completion(
            messages=messages,
            temperature=0.5,
            max_tokens=100,
        )
        
        # Assert results include all metadata
        assert result["id"] == "chatcmpl-123"
        assert result["model"] == "gpt-4"
        assert result["usage"]["total_tokens"] == 30
        
        # Verify base LLM received all parameters
        mock_base_llm.completion.assert_called_once()
        call_args = mock_base_llm.completion.call_args
        assert call_args[1]["temperature"] == 0.5
        assert call_args[1]["max_tokens"] == 100