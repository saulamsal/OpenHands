"""Tests for the API key encryption module."""

import os
import pytest
from openhands.storage.encryption import APIKeyEncryption, mask_api_key


class TestAPIKeyEncryption:
    """Test the API key encryption functionality."""
    
    def test_encrypt_decrypt(self):
        """Test basic encryption and decryption."""
        encryption = APIKeyEncryption()
        
        # Test encrypting and decrypting a simple API key
        api_key = "sk-test-1234567890abcdef"
        encrypted = encryption.encrypt(api_key)
        
        # Ensure encrypted is different from original
        assert encrypted != api_key
        assert len(encrypted) > 0
        
        # Ensure we can decrypt back to original
        decrypted = encryption.decrypt(encrypted)
        assert decrypted == api_key
    
    def test_encrypt_decrypt_empty_string(self):
        """Test handling of empty strings."""
        encryption = APIKeyEncryption()
        
        # Empty string should return empty string
        assert encryption.encrypt("") == ""
        assert encryption.decrypt("") == ""
    
    def test_different_keys_produce_different_results(self):
        """Test that different encryption keys produce different results."""
        # Generate proper Fernet keys
        from cryptography.fernet import Fernet
        key1 = Fernet.generate_key().decode()
        key2 = Fernet.generate_key().decode()
        
        # Create two instances with different keys
        encryption1 = APIKeyEncryption(key1)
        encryption2 = APIKeyEncryption(key2)
        
        api_key = "sk-test-1234567890abcdef"
        
        encrypted1 = encryption1.encrypt(api_key)
        encrypted2 = encryption2.encrypt(api_key)
        
        # Different keys should produce different encrypted values
        assert encrypted1 != encrypted2
        
        # Each should decrypt correctly with its own key
        assert encryption1.decrypt(encrypted1) == api_key
        assert encryption2.decrypt(encrypted2) == api_key
    
    def test_mask_api_key(self):
        """Test API key masking for display."""
        # Normal key
        assert mask_api_key("sk-test-1234567890abcdef") == "sk-t...cdef"
        
        # Short key
        assert mask_api_key("short") == "****"
        assert mask_api_key("12345678") == "****"
        
        # Empty key
        assert mask_api_key("") == "****"
        assert mask_api_key(None) == "****"
    
    def test_environment_key_loading(self):
        """Test loading encryption key from environment."""
        from cryptography.fernet import Fernet
        
        # Save current env value
        original_key = os.environ.get('OPENHANDS_ENCRYPTION_KEY')
        
        try:
            # Set a test key
            test_key = Fernet.generate_key().decode()
            os.environ['OPENHANDS_ENCRYPTION_KEY'] = test_key
            
            # Create instance without explicit key
            encryption = APIKeyEncryption()
            
            # Test it works
            api_key = "sk-test-environment"
            encrypted = encryption.encrypt(api_key)
            decrypted = encryption.decrypt(encrypted)
            assert decrypted == api_key
            
        finally:
            # Restore original env value
            if original_key is not None:
                os.environ['OPENHANDS_ENCRYPTION_KEY'] = original_key
            elif 'OPENHANDS_ENCRYPTION_KEY' in os.environ:
                del os.environ['OPENHANDS_ENCRYPTION_KEY']