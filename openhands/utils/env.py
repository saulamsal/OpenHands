"""Laravel-style environment helper functions for OpenHands.

Provides Laravel-like env() function and configuration utilities.
"""

import os
from typing import Any, Union


def env(key: str, default: Any = None) -> Any:
    """Laravel-style env() helper function.
    
    Retrieves environment variables with optional default values,
    similar to Laravel's env() helper.
    
    Args:
        key: The environment variable name
        default: Default value if the environment variable is not set
        
    Returns:
        The environment variable value or default
        
    Examples:
        >>> env('FILE_STORE', 'local')
        's3'
        >>> env('DEBUG', False)
        True
        >>> env('MAX_ITERATIONS', 100)
        100
    """
    value = os.getenv(key, default)
    
    # Convert string boolean values to actual booleans (like Laravel)
    if isinstance(value, str):
        if value.lower() in ('true', '1', 'yes', 'on'):
            return True
        elif value.lower() in ('false', '0', 'no', 'off'):
            return False
        elif value.isdigit():
            return int(value)
        elif _is_float(value):
            return float(value)
    
    return value


def env_bool(key: str, default: bool = False) -> bool:
    """Get environment variable as boolean.
    
    Args:
        key: The environment variable name
        default: Default boolean value
        
    Returns:
        Boolean value
    """
    value = env(key, default)
    if isinstance(value, str):
        return value.lower() in ('true', '1', 'yes', 'on')
    return bool(value)


def env_int(key: str, default: int = 0) -> int:
    """Get environment variable as integer.
    
    Args:
        key: The environment variable name
        default: Default integer value
        
    Returns:
        Integer value
    """
    value = env(key, default)
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def env_float(key: str, default: float = 0.0) -> float:
    """Get environment variable as float.
    
    Args:
        key: The environment variable name
        default: Default float value
        
    Returns:
        Float value
    """
    value = env(key, default)
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def _is_float(value: str) -> bool:
    """Check if string can be converted to float."""
    try:
        float(value)
        return True
    except ValueError:
        return False


# Laravel-style configuration shortcuts
def config(key: str, default: Any = None) -> Any:
    """Laravel-style config() helper.
    
    Maps common Laravel config keys to OpenHands environment variables.
    
    Args:
        key: Configuration key (e.g., 'filesystems.default')
        default: Default value
        
    Returns:
        Configuration value
    """
    # Map Laravel-style config keys to OpenHands env vars
    config_map = {
        'filesystems.default': 'FILE_STORE',
        'filesystems.disks.s3.bucket': 'AWS_S3_BUCKET',
        'filesystems.disks.s3.key': 'AWS_ACCESS_KEY_ID',
        'filesystems.disks.s3.secret': 'AWS_SECRET_ACCESS_KEY',
        'filesystems.disks.s3.endpoint': 'AWS_S3_ENDPOINT',
        'app.debug': 'DEBUG',
        'app.name': 'APP_NAME',
    }
    
    env_key = config_map.get(key, key.upper().replace('.', '_'))
    return env(env_key, default)


# Convenience functions for common OpenHands config
def storage_disk() -> str:
    """Get the default storage disk (like Laravel's Storage facade)."""
    return env('FILE_STORE', 'local')


def is_debug() -> bool:
    """Check if debug mode is enabled."""
    return env_bool('DEBUG', False)


def max_iterations() -> int:
    """Get max iterations setting."""
    return env_int('MAX_ITERATIONS', 100)