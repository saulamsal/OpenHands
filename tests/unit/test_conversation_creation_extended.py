"""Test conversation creation with extended parameters (mode, framework, attachments)."""
import json
import uuid
from datetime import datetime, timezone
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from openhands.server.data_models.conversation_info import ConversationInfo
from openhands.storage.data_models.conversation_metadata import (
    ConversationMetadata,
    ConversationTrigger,
)
from openhands.storage.data_models.conversation_status import ConversationStatus
from openhands.server.auth.dependencies import require_auth
from openhands.server.user_auth import (
    get_auth_type,
    get_provider_tokens,
    get_user_id,
    get_user_secrets,
    get_team_id,
)
from openhands.storage.database.session import get_async_session


@pytest.fixture
def mock_dependencies():
    """Set up common mocks for authentication and dependencies."""
    # This fixture is kept for backward compatibility but tests now use dependency_overrides
    return {}


@pytest.mark.asyncio
async def test_create_conversation_with_mode_and_framework(mock_dependencies):
    """Test creating a conversation with mode and framework parameters."""
    from openhands.server.routes.manage_conversations import app
    from fastapi import FastAPI
    
    test_app = FastAPI()
    test_app.include_router(app)
    
    # Override dependencies
    test_app.dependency_overrides[require_auth] = lambda: 'test-user-id'
    test_app.dependency_overrides[get_user_id] = lambda: 'test-user-id'
    test_app.dependency_overrides[get_auth_type] = lambda: 'jwt'
    test_app.dependency_overrides[get_provider_tokens] = lambda: {'github': 'fake-token'}
    test_app.dependency_overrides[get_user_secrets] = lambda: MagicMock(custom_secrets={})
    test_app.dependency_overrides[get_team_id] = lambda: 'test-team-id'
    test_app.dependency_overrides[get_async_session] = lambda: MagicMock()
    
    with patch('openhands.server.routes.manage_conversations.create_new_conversation') as mock_create:
        # Set up the mock to return a successful response
        conversation_id = uuid.uuid4().hex
        mock_create.return_value = MagicMock(
            conversation_id=conversation_id,
            status=ConversationStatus.RUNNING,
        )
        
        # Create test client
        client = TestClient(test_app)
        
        # Test data with new parameters
        request_data = {
            'initial_user_msg': 'Build an Expo app',
            'mode': 'AGENTIC',
            'agentic_qa_test': True,
            'framework': 'expo',
        }
        
        # Make request
        response = client.post('/api/conversations', json=request_data)
        
        # Verify response
        assert response.status_code == 200
        response_data = response.json()
        assert response_data['status'] == 'ok'
        assert 'conversation_id' in response_data
        
        # Verify the create_new_conversation was called with correct parameters
        mock_create.assert_called_once()
        call_args = mock_create.call_args[1]
        assert call_args['initial_user_msg'] == 'Build an Expo app'
        assert call_args['user_id'] == 'test-user-id'


@pytest.mark.asyncio
async def test_create_conversation_with_attachments():
    """Test creating a conversation with file attachments."""
    from openhands.server.routes.manage_conversations import app
    from fastapi import FastAPI
    
    test_app = FastAPI()
    test_app.include_router(app)
    
    # Override dependencies
    test_app.dependency_overrides[require_auth] = lambda: 'test-user-id'
    test_app.dependency_overrides[get_user_id] = lambda: 'test-user-id'
    test_app.dependency_overrides[get_auth_type] = lambda: 'jwt'
    test_app.dependency_overrides[get_provider_tokens] = lambda: {'github': 'fake-token'}
    test_app.dependency_overrides[get_user_secrets] = lambda: MagicMock(custom_secrets={})
    test_app.dependency_overrides[get_team_id] = lambda: 'test-team-id'
    test_app.dependency_overrides[get_async_session] = lambda: MagicMock()
    
    with patch('openhands.server.routes.manage_conversations.create_new_conversation') as mock_create:
        
        # Set up create_new_conversation mock
        conversation_id = uuid.uuid4().hex
        mock_create.return_value = MagicMock(
            conversation_id=conversation_id,
            status=ConversationStatus.RUNNING,
        )
        
        # Create test client
        client = TestClient(test_app)
        
        # Create test files
        files = [
            ('attachments', ('test1.txt', BytesIO(b'test content 1'), 'text/plain')),
            ('attachments', ('test2.png', BytesIO(b'fake image data'), 'image/png')),
        ]
        
        # Test data
        data = {
            'initial_user_msg': 'Process these files',
            'mode': 'AGENTIC',
            'agentic_qa_test': True,
        }
        
        # Make request with multipart/form-data
        response = client.post('/api/conversations', data=data, files=files)
        
        # Verify response
        assert response.status_code == 200
        response_data = response.json()
        assert response_data['status'] == 'ok'
        assert 'conversation_id' in response_data


@pytest.mark.asyncio
async def test_create_conversation_with_all_parameters(mock_dependencies):
    """Test creating a conversation with all new parameters."""
    from openhands.server.routes.manage_conversations import app
    from fastapi import FastAPI
    
    test_app = FastAPI()
    test_app.include_router(app)
    
    with patch('openhands.server.routes.manage_conversations.create_new_conversation') as mock_create:
        # Set up the mock
        conversation_id = uuid.uuid4().hex
        mock_create.return_value = MagicMock(
            conversation_id=conversation_id,
            status=ConversationStatus.RUNNING,
        )
        
        # Create test client
        client = TestClient(test_app)
        
        # Test data with all parameters
        request_data = {
            'initial_user_msg': 'Build a complete app',
            'repository': 'user/project',
            'git_provider': 'github',
            'selected_branch': 'develop',
            'mode': 'AGENTIC',
            'agentic_qa_test': True,
            'framework': 'expo',
            'conversation_instructions': 'Use TypeScript and follow best practices',
        }
        
        # Make request
        response = client.post('/api/conversations', json=request_data)
        
        # Verify response
        assert response.status_code == 200
        response_data = response.json()
        assert response_data['status'] == 'ok'
        assert 'conversation_id' in response_data
        
        # Verify the create_new_conversation was called
        mock_create.assert_called_once()
        call_args = mock_create.call_args[1]
        assert call_args['initial_user_msg'] == 'Build a complete app'
        assert call_args['selected_repository'] == 'user/project'
        assert call_args['git_provider'] == 'github'
        assert call_args['selected_branch'] == 'develop'
        assert call_args['conversation_instructions'] == 'Use TypeScript and follow best practices'


@pytest.mark.asyncio
async def test_create_conversation_chat_mode():
    """Test creating a conversation in CHAT mode."""
    from openhands.server.routes.manage_conversations import app
    from fastapi import FastAPI
    
    test_app = FastAPI()
    test_app.include_router(app)
    
    # Override dependencies
    test_app.dependency_overrides[require_auth] = lambda: 'test-user-id'
    test_app.dependency_overrides[get_user_id] = lambda: 'test-user-id'
    test_app.dependency_overrides[get_auth_type] = lambda: 'jwt'
    test_app.dependency_overrides[get_provider_tokens] = lambda: {}
    test_app.dependency_overrides[get_user_secrets] = lambda: MagicMock(custom_secrets={})
    test_app.dependency_overrides[get_team_id] = lambda: 'test-team-id'
    test_app.dependency_overrides[get_async_session] = lambda: MagicMock()
    
    with patch('openhands.server.routes.manage_conversations.create_new_conversation') as mock_create:
        
        # Set up create_new_conversation mock
        conversation_id = uuid.uuid4().hex
        mock_create.return_value = MagicMock(
            conversation_id=conversation_id,
            status=ConversationStatus.RUNNING,
        )
        
        # Create test client
        client = TestClient(test_app)
        
        # Test data for CHAT mode
        request_data = {
            'initial_user_msg': 'Hello, let\'s chat',
            'mode': 'CHAT',
            'agentic_qa_test': False,
        }
        
        # Make request
        response = client.post('/api/conversations', json=request_data)
        
        # Verify response
        assert response.status_code == 200
        response_data = response.json()
        assert response_data['status'] == 'ok'
        assert 'conversation_id' in response_data


@pytest.mark.asyncio
async def test_create_conversation_without_initial_message():
    """Test creating a conversation without initial message should succeed (except for API key auth)."""
    from openhands.server.routes.manage_conversations import app
    from fastapi import FastAPI
    
    test_app = FastAPI()
    test_app.include_router(app)
    
    # Override dependencies
    test_app.dependency_overrides[require_auth] = lambda: 'test-user-id'
    test_app.dependency_overrides[get_user_id] = lambda: 'test-user-id'
    test_app.dependency_overrides[get_auth_type] = lambda: 'jwt'
    test_app.dependency_overrides[get_provider_tokens] = lambda: {}
    test_app.dependency_overrides[get_user_secrets] = lambda: MagicMock(custom_secrets={})
    test_app.dependency_overrides[get_team_id] = lambda: 'test-team-id'
    test_app.dependency_overrides[get_async_session] = lambda: MagicMock()
    
    with patch('openhands.server.routes.manage_conversations.create_new_conversation') as mock_create:
        
        # Set up create_new_conversation mock
        conversation_id = uuid.uuid4().hex
        mock_create.return_value = MagicMock(
            conversation_id=conversation_id,
            status=ConversationStatus.RUNNING,
        )
        
        # Create test client
        client = TestClient(test_app)
        
        # Test data without initial message
        request_data = {
            'mode': 'AGENTIC',
            'framework': 'expo',
        }
        
        # Make request
        response = client.post('/api/conversations', json=request_data)
        
        # Should succeed with JWT auth
        assert response.status_code == 200
        response_data = response.json()
        assert response_data['status'] == 'ok'


@pytest.mark.asyncio
async def test_create_conversation_with_team_id():
    """Test creating a conversation with team_id in request body."""
    from openhands.server.routes.manage_conversations import app
    from fastapi import FastAPI
    
    test_app = FastAPI()
    test_app.include_router(app)
    
    # Override dependencies
    test_app.dependency_overrides[require_auth] = lambda: 'test-user-id'
    test_app.dependency_overrides[get_user_id] = lambda: 'test-user-id'
    test_app.dependency_overrides[get_auth_type] = lambda: 'jwt'
    test_app.dependency_overrides[get_provider_tokens] = lambda: {}
    test_app.dependency_overrides[get_user_secrets] = lambda: MagicMock(custom_secrets={})
    test_app.dependency_overrides[get_team_id] = lambda: None  # No team ID from header
    test_app.dependency_overrides[get_async_session] = lambda: MagicMock()
    
    with patch('openhands.server.routes.manage_conversations.create_new_conversation') as mock_create:
        
        # Set up create_new_conversation mock
        conversation_id = uuid.uuid4().hex
        mock_create.return_value = MagicMock(
            conversation_id=conversation_id,
            status=ConversationStatus.RUNNING,
        )
        
        # Create test client
        client = TestClient(test_app)
        
        # Test data with team_id
        request_data = {
            'initial_user_msg': 'Test with team',
            'team_id': 'request-team-id',
        }
        
        # Make request
        response = client.post('/api/conversations', json=request_data)
        
        # Verify response
        assert response.status_code == 200
        
        # Verify team_id was passed
        mock_create.assert_called_once()
        call_args = mock_create.call_args[1]
        assert call_args['team_id'] == 'request-team-id'