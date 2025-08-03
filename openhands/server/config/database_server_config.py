"""Database-enabled server configuration for OpenHands SaaS mode.

This configuration enables database storage and multi-tenant authentication,
similar to Laravel's approach with database-backed sessions and auth.
"""

import os

from openhands.server.config.server_config import ServerConfig


class DatabaseServerConfig(ServerConfig):
    """Server configuration for database-backed SaaS mode."""

    # Override storage classes to use database implementations
    settings_store_class: str = os.environ.get(
        'SETTINGS_STORE_CLASS',
        'openhands.storage.database.stores.DatabaseSettingsStore'
    )

    secret_store_class: str = os.environ.get(
        'SECRET_STORE_CLASS',
        'openhands.storage.database.stores.DatabaseSecretsStore'
    )

    conversation_store_class: str = os.environ.get(
        'CONVERSATION_STORE_CLASS',
        'openhands.storage.database.stores.DatabaseConversationStore'
    )

    # Use database user authentication
    user_auth_class: str = os.environ.get(
        'USER_AUTH_CLASS',
        'openhands.server.user_auth.database_user_auth.DatabaseUserAuth'
    )

    # Enable features for SaaS mode
    enable_billing = os.environ.get('ENABLE_BILLING', 'true') == 'true'
    hide_microagent_management = False  # Show microagent management in SaaS mode

    def verify_config(self):
        """Override to allow this custom config."""
        pass  # We don't need the base class verification

    def get_config(self):
        """Get configuration with SaaS-specific settings."""
        config = super().get_config()

        # Add GitHub App slug for repository installation
        config['APP_SLUG'] = os.environ.get('GITHUB_APP_SLUG', 'qlur-com')

        # Add database-specific feature flags
        config['FEATURE_FLAGS'].update({
            'ENABLE_TEAMS': True,
            'ENABLE_DATABASE_AUTH': True,
            'ENABLE_MULTI_TENANT': True,
        })

        return config
