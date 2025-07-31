"""Database-aware conversation validator that extracts user_id from cookies."""
import uuid
from datetime import datetime, timezone
from http.cookies import SimpleCookie

from openhands.core.config.utils import load_openhands_config
from openhands.core.logger import openhands_logger as logger
from openhands.server.config.server_config import ServerConfig
from openhands.storage.conversation.conversation_store import ConversationStore
from openhands.storage.conversation.conversation_validator import ConversationValidator
from openhands.storage.data_models.conversation_metadata import ConversationMetadata
from openhands.utils.conversation_summary import get_default_conversation_title
from openhands.utils.import_utils import get_impl


class DatabaseConversationValidator(ConversationValidator):
    """Conversation validator that extracts user_id from authentication cookies."""

    async def validate(
        self,
        conversation_id: str,
        cookies_str: str,
        authorization_header: str | None = None,
    ) -> str | None:
        # Extract user_id from cookies
        user_id = await self._extract_user_id_from_cookies(cookies_str)
        
        # Ensure metadata exists with the correct user_id
        metadata = await self._ensure_metadata_exists(conversation_id, user_id)
        return metadata.user_id

    async def _extract_user_id_from_cookies(self, cookies_str: str) -> str | None:
        """Extract user_id from openhands_session cookie."""
        if not cookies_str:
            return None
            
        try:
            # Parse cookies
            cookie = SimpleCookie()
            cookie.load(cookies_str)
            
            # Get openhands_session cookie
            session_cookie = cookie.get('openhands_session')
            if not session_cookie:
                logger.debug("No openhands_session cookie found")
                return None
                
            token = session_cookie.value
            
            # Decode JWT to get user ID
            from fastapi_users.jwt import decode_jwt
            from openhands.server.auth.users import SECRET
            
            payload = decode_jwt(token, SECRET, audience=["fastapi-users:auth"])
            user_id_str = payload.get("sub")
            
            if user_id_str:
                # Validate UUID format
                try:
                    uuid.UUID(user_id_str)
                    logger.debug(f"Extracted user_id from cookie: {user_id_str}")
                    return user_id_str
                except ValueError:
                    logger.error(f"Invalid user ID format: {user_id_str}")
                    return None
                    
        except Exception as e:
            logger.debug(f"Failed to extract user_id from cookies: {e}")
            
        return None

    async def _ensure_metadata_exists(
        self,
        conversation_id: str,
        user_id: str | None,
    ) -> ConversationMetadata:
        """Ensure conversation metadata exists in the database."""
        config = load_openhands_config()
        server_config = ServerConfig()

        conversation_store_class: type[ConversationStore] = get_impl(
            ConversationStore,
            server_config.conversation_store_class,
        )
        
        # Create conversation store with the extracted user_id
        conversation_store = await conversation_store_class.get_instance(
            config, user_id
        )

        try:
            metadata = await conversation_store.get_metadata(conversation_id)
            logger.debug(f"Found existing metadata for conversation {conversation_id}")
        except FileNotFoundError:
            logger.info(
                f'Creating new conversation metadata for {conversation_id}',
                extra={'session_id': conversation_id},
            )
            await conversation_store.save_metadata(
                ConversationMetadata(
                    conversation_id=conversation_id,
                    user_id=user_id,
                    title=get_default_conversation_title(conversation_id),
                    last_updated_at=datetime.now(timezone.utc),
                    selected_repository=None,
                )
            )
            metadata = await conversation_store.get_metadata(conversation_id)
            
        return metadata