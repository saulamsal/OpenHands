import os

from openhands.core.logger import openhands_logger as logger
from openhands.server.types import ServerConfigInterface
from openhands.utils.import_utils import get_impl


class ServerConfig(ServerConfigInterface):
    config_cls = os.environ.get('OPENHANDS_CONFIG_CLS', None)
    posthog_client_key = 'phc_3ESMmY9SgqEAGBB6sMGK5ayYHkeUuknH2vP6FmWH9RA'
    github_client_id = os.environ.get('GITHUB_CLIENT_ID', '')
    enable_billing = os.environ.get('ENABLE_BILLING', 'true') == 'true'  # Enable by default
    hide_llm_settings = os.environ.get('HIDE_LLM_SETTINGS', 'false') == 'true'
    # Enable microagent management by default
    hide_microagent_management = os.environ.get('HIDE_MICROAGENT_MANAGEMENT', 'false') == 'true'
    # Default to database storage
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
    conversation_manager_class: str = os.environ.get(
        'CONVERSATION_MANAGER_CLASS',
        'openhands.server.conversation_manager.standalone_conversation_manager.StandaloneConversationManager',
    )
    monitoring_listener_class: str = 'openhands.server.monitoring.MonitoringListener'
    # Default to database user authentication
    user_auth_class: str = os.environ.get(
        'USER_AUTH_CLASS',
        'openhands.server.user_auth.database_user_auth.DatabaseUserAuth'
    )

    def verify_config(self):
        if self.config_cls:
            raise ValueError('Unexpected config path provided')

    def get_config(self):
        config = {
            'GITHUB_CLIENT_ID': self.github_client_id,
            'POSTHOG_CLIENT_KEY': self.posthog_client_key,
            'FEATURE_FLAGS': {
                'ENABLE_BILLING': self.enable_billing,
                'ENABLE_TEAMS': True,  # Always enable teams
                'ENABLE_DATABASE_AUTH': True,  # Always enable database auth
                'ENABLE_MULTI_TENANT': True,  # Always enable multi-tenant
                'HIDE_LLM_SETTINGS': self.hide_llm_settings,
                'HIDE_MICROAGENT_MANAGEMENT': self.hide_microagent_management,
            },
            'PROVIDERS_CONFIGURED': ['github'],  # Always include GitHub as configured
            # APP_MODE removed - always assume SAAS/auth-based mode
        }

        return config


def load_server_config() -> ServerConfig:
    config_cls = os.environ.get('OPENHANDS_CONFIG_CLS', None)
    logger.info(f'Using config class {config_cls}')

    server_config_cls = get_impl(ServerConfig, config_cls)
    server_config: ServerConfig = server_config_cls()
    server_config.verify_config()

    return server_config
