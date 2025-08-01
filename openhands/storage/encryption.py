"""API Key encryption module using cryptography library."""

import base64
import os
from typing import Optional

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from openhands.core.logger import openhands_logger as logger


class APIKeyEncryption:
    """Handles encryption and decryption of API keys using Fernet symmetric encryption."""
    
    def __init__(self, master_key: Optional[str] = None):
        """Initialize encryption with a master key.
        
        Args:
            master_key: Base64-encoded master key. If not provided, uses environment variable.
        """
        if master_key is None:
            master_key = os.environ.get('OPENHANDS_ENCRYPTION_KEY')
            if not master_key:
                # Generate a new key if none exists
                master_key = Fernet.generate_key().decode()
                logger.warning(
                    f"No encryption key found. Generated new key: {master_key[:8]}... "
                    "Please set OPENHANDS_ENCRYPTION_KEY environment variable."
                )
        
        try:
            # Ensure the key is properly formatted
            if isinstance(master_key, str):
                master_key = master_key.encode()
            self.cipher = Fernet(master_key)
        except Exception as e:
            logger.error(f"Failed to initialize encryption: {e}")
            raise ValueError("Invalid encryption key format")
    
    def encrypt(self, api_key: str) -> str:
        """Encrypt an API key.
        
        Args:
            api_key: The plain text API key to encrypt
            
        Returns:
            Base64-encoded encrypted string
        """
        if not api_key:
            return ""
        
        try:
            encrypted = self.cipher.encrypt(api_key.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Failed to encrypt API key: {e}")
            raise
    
    def decrypt(self, encrypted_key: str) -> str:
        """Decrypt an API key.
        
        Args:
            encrypted_key: Base64-encoded encrypted string
            
        Returns:
            The decrypted API key
        """
        if not encrypted_key:
            return ""
        
        try:
            decoded = base64.urlsafe_b64decode(encrypted_key.encode())
            decrypted = self.cipher.decrypt(decoded)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Failed to decrypt API key: {e}")
            raise
    
    @staticmethod
    def generate_key_from_password(password: str, salt: Optional[bytes] = None) -> bytes:
        """Generate an encryption key from a password.
        
        Args:
            password: The password to derive a key from
            salt: Optional salt bytes. If not provided, generates a new one.
            
        Returns:
            Tuple of (key, salt) where key is base64-encoded
        """
        if salt is None:
            salt = os.urandom(16)
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key, salt


def mask_api_key(api_key: str) -> str:
    """Mask an API key for display purposes.
    
    Shows only the first 4 and last 4 characters of the key.
    
    Args:
        api_key: The API key to mask
        
    Returns:
        Masked API key string
    """
    if not api_key or len(api_key) <= 8:
        return "****"
    return f"{api_key[:4]}...{api_key[-4:]}"