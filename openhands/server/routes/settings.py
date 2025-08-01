from typing import Optional

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from openhands.core.logger import openhands_logger as logger
from openhands.integrations.provider import (
    PROVIDER_TOKEN_TYPE,
    ProviderType,
)
from openhands.server.auth.dependencies import require_auth
from openhands.server.dependencies import get_dependencies
from openhands.server.routes.secrets import invalidate_legacy_secrets_store
from openhands.server.settings import (
    GETSettingsModel,
)
from openhands.server.shared import config
from openhands.server.user_auth import (
    get_provider_tokens,
    get_secrets_store,
    get_user_settings,
    get_user_settings_store,
)
from openhands.storage.data_models.settings import Settings
from openhands.storage.secrets.secrets_store import SecretsStore
from openhands.storage.settings.settings_store import SettingsStore
from openhands.llm import LLM

app = APIRouter(prefix='/api', dependencies=get_dependencies())


@app.get(
    '/settings',
    response_model=GETSettingsModel,
    responses={
        404: {'description': 'Settings not found', 'model': dict},
        401: {'description': 'Invalid token', 'model': dict},
    },
)
async def load_settings(
    _user_id: Optional[str] = Depends(require_auth),
    provider_tokens: PROVIDER_TOKEN_TYPE | None = Depends(get_provider_tokens),
    settings_store: SettingsStore = Depends(get_user_settings_store),
    settings: Settings = Depends(get_user_settings),
    secrets_store: SecretsStore = Depends(get_secrets_store),
) -> GETSettingsModel | JSONResponse:
    try:
        if not settings:
            # Create default settings for new users
            settings = Settings(
                has_completed_billing_setup=False,
                language='en',
                enable_default_condenser=True,
                enable_sound_notifications=False,
                enable_proactive_conversation_starters=True,
                llm_model='gpt-4o-mini',  # Default model
                agent='CodeActAgent',  # Default agent
                max_iterations=50
            )
            # Store the default settings
            await settings_store.store(settings)

        # On initial load, user secrets may not be populated with values migrated from settings store
        user_secrets = await invalidate_legacy_secrets_store(
            settings, settings_store, secrets_store
        )

        # If invalidation is successful, then the returned user secrets holds the most recent values
        git_providers = (
            user_secrets.provider_tokens if user_secrets else provider_tokens
        )

        provider_tokens_set: dict[ProviderType, str | None] = {}
        if git_providers:
            for provider_type, provider_token in git_providers.items():
                if provider_token.token or provider_token.user_id:
                    provider_tokens_set[provider_type] = provider_token.host

        settings_with_token_data = GETSettingsModel(
            **settings.model_dump(exclude={'secrets_store'}),
            llm_api_key_set=settings.llm_api_key is not None
            and bool(settings.llm_api_key),
            search_api_key_set=settings.search_api_key is not None
            and bool(settings.search_api_key),
            provider_tokens_set=provider_tokens_set,
            IS_NEW_USER=not settings.has_completed_billing_setup,  # Show billing modal if not completed
        )
        settings_with_token_data.llm_api_key = None
        settings_with_token_data.search_api_key = None
        settings_with_token_data.sandbox_api_key = None
        return settings_with_token_data
    except Exception as e:
        logger.warning(f'Invalid token: {e}')
        # Get user_id from settings if available
        user_id = getattr(settings, 'user_id', 'unknown') if settings else 'unknown'
        logger.info(
            f'Returning 401 Unauthorized - Invalid token for user_id: {user_id}'
        )
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={'error': 'Invalid token'},
        )


@app.post(
    '/reset-settings',
    responses={
        410: {
            'description': 'Reset settings functionality has been removed',
            'model': dict,
        }
    },
)
async def reset_settings() -> JSONResponse:
    """
    Resets user settings. (Deprecated)
    """
    logger.warning('Deprecated endpoint /api/reset-settings called by user')
    return JSONResponse(
        status_code=status.HTTP_410_GONE,
        content={'error': 'Reset settings functionality has been removed.'},
    )


async def store_llm_settings(
    settings: Settings, settings_store: SettingsStore
) -> Settings:
    existing_settings = await settings_store.load()
    
    logger.info(f"store_llm_settings: Processing settings update")
    logger.info(f"  - incoming llm_configuration_id: {settings.llm_configuration_id}")
    logger.info(f"  - incoming has_api_key: {bool(settings.llm_api_key)}")

    # Convert to Settings model and merge with existing settings
    if existing_settings:
        logger.info(f"  - existing has_api_key: {bool(existing_settings.llm_api_key)}")
        logger.info(f"  - existing llm_configuration_id: {existing_settings.llm_configuration_id}")
        
        # If we have a configuration ID, clear the API key (using configuration mode)
        # If we don't have a configuration ID but have an API key, keep it (advanced mode)
        if settings.llm_configuration_id:
            logger.info(f"  - Configuration mode: clearing API key")
            settings.llm_api_key = None
        elif settings.llm_api_key:
            logger.info(f"  - Advanced mode: keeping API key")
            # Clear configuration ID if using direct API key
            settings.llm_configuration_id = None
        else:
            # No new API key provided, keep existing
            if settings.llm_api_key is None and existing_settings.llm_api_key:
                settings.llm_api_key = existing_settings.llm_api_key
                
        if settings.llm_model is None:
            settings.llm_model = existing_settings.llm_model
        if settings.llm_base_url is None:
            settings.llm_base_url = existing_settings.llm_base_url
        if settings.llm_configuration_id is None:
            settings.llm_configuration_id = existing_settings.llm_configuration_id
        # Keep existing search API key if not provided
        if settings.search_api_key is None:
            settings.search_api_key = existing_settings.search_api_key
    
    logger.info(f"  - final has_api_key: {bool(settings.llm_api_key)}")
    logger.info(f"  - final llm_configuration_id: {settings.llm_configuration_id}")

    return settings


# NOTE: We use response_model=None for endpoints that return JSONResponse directly.
# This is because FastAPI's response_model expects a Pydantic model, but we're returning
# a response object directly. We document the possible responses using the 'responses'
# parameter and maintain proper type annotations for mypy.
@app.post(
    '/settings',
    response_model=None,
    responses={
        200: {'description': 'Settings stored successfully', 'model': dict},
        500: {'description': 'Error storing settings', 'model': dict},
    },
)
async def store_settings(
    settings: Settings,
    _user_id: Optional[str] = Depends(require_auth),
    settings_store: SettingsStore = Depends(get_user_settings_store),
) -> JSONResponse:
    # Check provider tokens are valid
    try:
        existing_settings = await settings_store.load()

        # Convert to Settings model and merge with existing settings
        if existing_settings:
            settings = await store_llm_settings(settings, settings_store)

            # Keep existing analytics consent if not provided
            if settings.user_consents_to_analytics is None:
                settings.user_consents_to_analytics = (
                    existing_settings.user_consents_to_analytics
                )

        # Update sandbox config with new settings
        if settings.remote_runtime_resource_factor is not None:
            config.sandbox.remote_runtime_resource_factor = (
                settings.remote_runtime_resource_factor
            )

        settings = convert_to_settings(settings)
        await settings_store.store(settings)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={'message': 'Settings stored'},
        )
    except Exception as e:
        logger.warning(f'Something went wrong storing settings: {e}')
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={'error': 'Something went wrong storing settings'},
        )


def convert_to_settings(settings_with_token_data: Settings) -> Settings:
    settings_data = settings_with_token_data.model_dump()

    # Filter out additional fields from `SettingsWithTokenData`
    filtered_settings_data = {
        key: value
        for key, value in settings_data.items()
        if key in Settings.model_fields  # Ensures only `Settings` fields are included
    }

    # Convert the API keys to `SecretStr` instances
    filtered_settings_data['llm_api_key'] = settings_with_token_data.llm_api_key
    filtered_settings_data['search_api_key'] = settings_with_token_data.search_api_key

    # Create a new Settings instance
    settings = Settings(**filtered_settings_data)
    return settings


@app.post(
    '/settings/test-llm',
    response_model=None,
    responses={
        200: {'description': 'LLM test successful', 'model': dict},
        400: {'description': 'Invalid settings', 'model': dict},
        500: {'description': 'Test failed', 'model': dict},
    },
)
async def test_llm_settings(
    settings: Settings,
    _user_id: Optional[str] = Depends(require_auth),
    settings_store: SettingsStore = Depends(get_user_settings_store),
) -> JSONResponse:
    """Test LLM configuration by making a simple API call."""
    try:
        # Log the incoming request data
        logger.info(f'===== LLM TEST START =====')
        logger.info(f'User ID: {_user_id}')
        logger.info(f'Received test request:')
        logger.info(f'  - llm_model: {settings.llm_model}')
        logger.info(f'  - llm_base_url: {settings.llm_base_url}')
        logger.info(f'  - has_api_key: {bool(settings.llm_api_key)}')
        logger.info(f'  - llm_configuration_id: {settings.llm_configuration_id}')
        
        # Load existing settings to get API key if not provided
        existing_settings = await settings_store.load()
        if existing_settings:
            logger.info(f'Existing settings loaded:')
            logger.info(f'  - has stored API key: {bool(existing_settings.llm_api_key)}')
            if existing_settings.llm_api_key:
                logger.info(f'  - stored API key starts with: {str(existing_settings.llm_api_key)[:10]}...')
        
        from openhands.core.config.llm_config import LLMConfig
        from openhands.llm.llm_configuration_resolver import LLMConfigurationResolver
        from openhands.storage.database.session import get_async_session_context
        
        # Check if we're in advanced mode with direct API key
        if settings.llm_api_key and not settings.llm_configuration_id:
            logger.info(f'Advanced mode: Using direct API key')
            model = settings.llm_model or 'gpt-4o-mini'
            api_key = settings.llm_api_key
            base_url = settings.llm_base_url
        elif settings.llm_configuration_id:
            # Use LLM configuration
            logger.info(f'Using LLM Configuration ID: {settings.llm_configuration_id}')
            async with get_async_session_context() as db_session:
                model, api_key, base_url = await LLMConfigurationResolver.resolve_llm_config(
                    settings, _user_id, db_session
                )
            logger.info(f'Resolved from configuration:')
            logger.info(f'  - model: {model}')
            logger.info(f'  - base_url: {base_url}')
            logger.info(f'  - api_key starts with: {str(api_key)[:10] if api_key else "None"}...')
            logger.info(f'  - api_key source: LLM Configuration Table')
        else:
            # No configuration ID and no API key
            logger.error(f'No LLM configuration ID or API key provided')
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    'status': 'error',
                    'message': 'Please select an API key configuration or provide an API key',
                }
            )
        
        # Check if we have an API key
        if not api_key:
            logger.error(f'No API key found in either configuration or settings')
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    'status': 'error',
                    'message': 'No API key provided or saved',
                }
            )
        
        # Log the test parameters (but not the full API key for security)
        logger.info(f'Final test parameters:')
        logger.info(f'  - model: {model}')
        logger.info(f'  - base_url: {base_url}')
        logger.info(f'  - api_key length: {len(str(api_key)) if api_key else 0}')
        logger.info(f'  - api_key starts with: {str(api_key)[:10] if api_key else "None"}...')
        
        # Create LLM config from settings
        llm_config = LLMConfig(
            model=model,
            api_key=api_key,
            base_url=base_url,
            temperature=0.7,
            max_output_tokens=100,  # Small token limit for test
        )
        
        # Initialize LLM
        llm = LLM(llm_config)
        
        # Make a simple test call
        test_messages = [
            {'role': 'system', 'content': 'You are a helpful assistant. Respond with exactly: "LLM connection successful"'},
            {'role': 'user', 'content': 'Test message'}
        ]
        
        response = llm.completion(messages=test_messages)
        
        # Check if we got a valid response
        if response and response.choices and len(response.choices) > 0:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    'status': 'success',
                    'message': 'LLM configuration is valid',
                    'model': settings.llm_model or 'gpt-4o-mini',
                }
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    'status': 'error',
                    'message': 'LLM returned an invalid response',
                }
            )
            
    except Exception as e:
        logger.error(f'LLM test failed: {str(e)}')
        
        # Extract user-friendly error message
        error_message = str(e)
        if 'AuthenticationError' in error_message or 'Invalid API key' in error_message:
            error_message = 'Invalid API key'
        elif 'Connection' in error_message or 'Network' in error_message:
            error_message = 'Connection error - please check your network'
        elif 'rate limit' in error_message.lower():
            error_message = 'Rate limit exceeded - please try again later'
        elif 'model' in error_message.lower() and 'not found' in error_message.lower():
            error_message = 'Model not found - please check the model name'
        else:
            # Keep the original error but truncate if too long
            if len(error_message) > 200:
                error_message = error_message[:200] + '...'
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                'status': 'error',
                'message': f'LLM test failed: {error_message}',
            }
        )
