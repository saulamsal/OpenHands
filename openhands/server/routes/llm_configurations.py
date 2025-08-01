"""API routes for LLM configuration management."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.core.logger import openhands_logger as logger
from openhands.server.auth.dependencies import require_auth
from openhands.server.dependencies import get_dependencies
from openhands.storage.database.session import get_async_session
from openhands.storage.database.stores.llm_configurations import LLMConfigurationService
from openhands.storage.encryption import mask_api_key


app = APIRouter(prefix='/api/llm-configurations', dependencies=get_dependencies())


class LLMConfigurationCreate(BaseModel):
    """Request model for creating an LLM configuration."""
    name: str = Field(..., description="Configuration name")
    provider: str = Field(..., description="Provider (openai, anthropic, etc.)")
    model: str = Field(..., description="Model name")
    api_key: str = Field(..., description="API key")
    base_url: Optional[str] = Field(None, description="Custom base URL")
    is_default: bool = Field(False, description="Set as default configuration")


class LLMConfigurationUpdate(BaseModel):
    """Request model for updating an LLM configuration."""
    name: Optional[str] = Field(None, description="Configuration name")
    model: Optional[str] = Field(None, description="Model name")
    api_key: Optional[str] = Field(None, description="API key")
    base_url: Optional[str] = Field(None, description="Custom base URL")


class LLMConfigurationResponse(BaseModel):
    """Response model for LLM configuration."""
    id: UUID
    name: str
    provider: str
    model: str
    base_url: Optional[str]
    is_default: bool
    is_active: bool
    test_status: Optional[str]
    test_message: Optional[str]
    last_used_at: Optional[str]
    created_at: str
    updated_at: str
    api_key_masked: str


class LLMConfigurationTest(BaseModel):
    """Request model for testing an LLM configuration."""
    provider: str
    model: str
    api_key: str
    base_url: Optional[str] = None


@app.get(
    '',
    response_model=List[LLMConfigurationResponse],
    responses={
        401: {'description': 'Unauthorized', 'model': dict},
    },
)
async def list_llm_configurations(
    user_id: str = Depends(require_auth),
    db_session: AsyncSession = Depends(get_async_session),
    include_inactive: bool = False,
) -> List[LLMConfigurationResponse]:
    """List all LLM configurations for the authenticated user."""
    try:
        service = LLMConfigurationService(db_session)
        configs = await service.list_configurations(user_id, include_inactive)
        
        return [
            LLMConfigurationResponse(
                id=config.id,
                name=config.name,
                provider=config.provider,
                model=config.model,
                base_url=config.base_url,
                is_default=config.is_default,
                is_active=config.is_active,
                test_status=config.test_status,
                test_message=config.test_message,
                last_used_at=config.last_used_at.isoformat() if config.last_used_at else None,
                created_at=config.created_at.isoformat(),
                updated_at=config.updated_at.isoformat(),
                api_key_masked=service.get_masked_api_key(config),
            )
            for config in configs
        ]
    except Exception as e:
        logger.error(f"Error listing LLM configurations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list configurations"
        )


@app.post(
    '',
    response_model=LLMConfigurationResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {'description': 'Configuration created', 'model': LLMConfigurationResponse},
        400: {'description': 'Invalid request', 'model': dict},
        401: {'description': 'Unauthorized', 'model': dict},
    },
)
async def create_llm_configuration(
    data: LLMConfigurationCreate,
    user_id: str = Depends(require_auth),
    db_session: AsyncSession = Depends(get_async_session),
) -> LLMConfigurationResponse:
    """Create a new LLM configuration."""
    try:
        service = LLMConfigurationService(db_session)
        config = await service.create_configuration(
            user_id=user_id,
            name=data.name,
            provider=data.provider,
            model=data.model,
            api_key=data.api_key,
            base_url=data.base_url,
            is_default=data.is_default,
        )
        
        return LLMConfigurationResponse(
            id=config.id,
            name=config.name,
            provider=config.provider,
            model=config.model,
            base_url=config.base_url,
            is_default=config.is_default,
            is_active=config.is_active,
            test_status=config.test_status,
            test_message=config.test_message,
            last_used_at=config.last_used_at.isoformat() if config.last_used_at else None,
            created_at=config.created_at.isoformat(),
            updated_at=config.updated_at.isoformat(),
            api_key_masked=service.get_masked_api_key(config),
        )
    except Exception as e:
        logger.error(f"Error creating LLM configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create configuration"
        )


@app.get(
    '/{config_id}',
    response_model=LLMConfigurationResponse,
    responses={
        404: {'description': 'Configuration not found', 'model': dict},
        401: {'description': 'Unauthorized', 'model': dict},
    },
)
async def get_llm_configuration(
    config_id: UUID,
    user_id: str = Depends(require_auth),
    db_session: AsyncSession = Depends(get_async_session),
) -> LLMConfigurationResponse:
    """Get a specific LLM configuration."""
    try:
        service = LLMConfigurationService(db_session)
        config = await service.get_configuration(str(config_id), user_id)
        
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Configuration not found"
            )
        
        return LLMConfigurationResponse(
            id=config.id,
            name=config.name,
            provider=config.provider,
            model=config.model,
            base_url=config.base_url,
            is_default=config.is_default,
            is_active=config.is_active,
            test_status=config.test_status,
            test_message=config.test_message,
            last_used_at=config.last_used_at.isoformat() if config.last_used_at else None,
            created_at=config.created_at.isoformat(),
            updated_at=config.updated_at.isoformat(),
            api_key_masked=service.get_masked_api_key(config),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting LLM configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get configuration"
        )


@app.put(
    '/{config_id}',
    response_model=LLMConfigurationResponse,
    responses={
        404: {'description': 'Configuration not found', 'model': dict},
        401: {'description': 'Unauthorized', 'model': dict},
    },
)
async def update_llm_configuration(
    config_id: UUID,
    data: LLMConfigurationUpdate,
    user_id: str = Depends(require_auth),
    db_session: AsyncSession = Depends(get_async_session),
) -> LLMConfigurationResponse:
    """Update an existing LLM configuration."""
    try:
        service = LLMConfigurationService(db_session)
        config = await service.update_configuration(
            config_id=str(config_id),
            user_id=user_id,
            name=data.name,
            model=data.model,
            api_key=data.api_key,
            base_url=data.base_url,
        )
        
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Configuration not found"
            )
        
        return LLMConfigurationResponse(
            id=config.id,
            name=config.name,
            provider=config.provider,
            model=config.model,
            base_url=config.base_url,
            is_default=config.is_default,
            is_active=config.is_active,
            test_status=config.test_status,
            test_message=config.test_message,
            last_used_at=config.last_used_at.isoformat() if config.last_used_at else None,
            created_at=config.created_at.isoformat(),
            updated_at=config.updated_at.isoformat(),
            api_key_masked=service.get_masked_api_key(config),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating LLM configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update configuration"
        )


@app.delete(
    '/{config_id}',
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        204: {'description': 'Configuration deleted'},
        404: {'description': 'Configuration not found', 'model': dict},
        401: {'description': 'Unauthorized', 'model': dict},
    },
)
async def delete_llm_configuration(
    config_id: UUID,
    user_id: str = Depends(require_auth),
    db_session: AsyncSession = Depends(get_async_session),
) -> None:
    """Delete an LLM configuration."""
    try:
        service = LLMConfigurationService(db_session)
        deleted = await service.delete_configuration(str(config_id), user_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Configuration not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting LLM configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete configuration"
        )


@app.put(
    '/{config_id}/set-default',
    response_model=dict,
    responses={
        200: {'description': 'Default set successfully', 'model': dict},
        404: {'description': 'Configuration not found', 'model': dict},
        401: {'description': 'Unauthorized', 'model': dict},
    },
)
async def set_default_configuration(
    config_id: UUID,
    user_id: str = Depends(require_auth),
    db_session: AsyncSession = Depends(get_async_session),
) -> dict:
    """Set a configuration as the default."""
    try:
        service = LLMConfigurationService(db_session)
        success = await service.set_default(str(config_id), user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Configuration not found"
            )
        
        return {"message": "Default configuration set successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting default configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set default configuration"
        )


@app.post(
    '/test',
    response_model=dict,
    responses={
        200: {'description': 'Test successful', 'model': dict},
        400: {'description': 'Invalid configuration', 'model': dict},
        401: {'description': 'Unauthorized', 'model': dict},
    },
)
async def test_llm_configuration(
    data: LLMConfigurationTest,
    user_id: str = Depends(require_auth),
    db_session: AsyncSession = Depends(get_async_session),
) -> dict:
    """Test an LLM configuration without saving it."""
    try:
        from openhands.storage.database.models import LLMConfiguration
        from datetime import datetime, timezone
        
        # Create a temporary configuration object for testing
        temp_config = LLMConfiguration(
            user_id=user_id,
            name="Test Configuration",
            provider=data.provider,
            model=data.model,
            api_key_encrypted="",  # Will be encrypted by service
            base_url=data.base_url,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        
        # Encrypt the API key
        service = LLMConfigurationService(db_session)
        temp_config.api_key_encrypted = service.encryption.encrypt(data.api_key)
        
        # Test the configuration
        result = await service.test_configuration(temp_config)
        
        return result
    except Exception as e:
        logger.error(f"Error testing LLM configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test configuration: {str(e)}"
        )