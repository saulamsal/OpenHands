"""Database configuration for OpenHands."""

import os
from typing import Optional

from pydantic import BaseModel, PostgresDsn, computed_field


class DatabaseConfig(BaseModel):
    """Database configuration settings."""
    
    # Database connection settings
    db_connection: str = os.getenv('DB_CONNECTION', 'postgresql')
    db_host: str = os.getenv('DB_HOST', '127.0.0.1')
    db_port: int = int(os.getenv('DB_PORT', '5432'))
    db_database: str = os.getenv('DB_DATABASE', 'qlurplatform')
    db_username: str = os.getenv('DB_USERNAME', 'postgres')
    db_password: str = os.getenv('DB_PASSWORD', 'postgres')
    
    # Connection pool settings
    db_pool_size: int = int(os.getenv('DB_POOL_SIZE', '20'))
    db_max_overflow: int = int(os.getenv('DB_MAX_OVERFLOW', '40'))
    db_pool_timeout: int = int(os.getenv('DB_POOL_TIMEOUT', '30'))
    
    # Always use database storage
    use_database_storage: bool = True
    
    @computed_field
    @property
    def database_url(self) -> str:
        """Construct the database URL from components."""
        if self.db_connection == 'pgsql':
            # Handle Laravel-style pgsql to postgresql mapping
            connection = 'postgresql'
        else:
            connection = self.db_connection
            
        # Use psycopg (v3) for async
        return f"{connection}+psycopg://{self.db_username}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_database}"
    
    @computed_field
    @property
    def sync_database_url(self) -> str:
        """Construct the synchronous database URL for Alembic migrations."""
        if self.db_connection == 'pgsql':
            connection = 'postgresql'
        else:
            connection = self.db_connection
            
        # Use psycopg (v3) for sync as well
        return f"{connection}+psycopg://{self.db_username}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_database}"


# Global database configuration instance
db_config = DatabaseConfig()