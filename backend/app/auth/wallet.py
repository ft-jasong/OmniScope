import secrets
import string
import base58
import base64
import binascii
from solders.pubkey import Pubkey
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError
from typing import Optional

def generate_nonce(length: int = 32) -> str:
    """
    Generate a random nonce for wallet authentication
    """
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def create_auth_message(wallet_address: str, nonce: str) -> str:
    """
    Create a message to be signed by the wallet
    """
    return f"Sign this message to authenticate with HashScope API\n\nWallet: {wallet_address}\nNonce: {nonce}"

def verify_signature(message: str, signature: str, wallet_address: str) -> bool:
    """
    Verify that the signature was signed by the Solana wallet address
    """
    try:
        # Try multiple decoding methods to handle different signature formats
        signature_bytes = None
        
        # Method 1: Try standard base64 decoding
        try:
            # Remove any padding if present
            if signature.endswith('='):
                signature = signature.rstrip('=')
            signature_bytes = base64.b64decode(signature)
            print("Successfully decoded using standard base64")
        except Exception as e1:
            print(f"Standard base64 decoding failed: {e1}")
            
            # Method 2: Try URL-safe base64 decoding
            try:
                # Replace URL-safe characters with standard base64 characters
                url_safe_signature = signature.replace('-', '+').replace('_', '/')
                # Add padding if needed
                padding = 4 - (len(url_safe_signature) % 4)
                if padding < 4:
                    url_safe_signature += '=' * padding
                signature_bytes = base64.b64decode(url_safe_signature)
                print("Successfully decoded using URL-safe base64")
            except Exception as e2:
                print(f"URL-safe base64 decoding failed: {e2}")
                
                # Method 3: Try base58 decoding
                try:
                    signature_bytes = base58.b58decode(signature)
                    print("Successfully decoded using base58")
                except Exception as e3:
                    print(f"Base58 decoding failed: {e3}")
                    
                    # Method 4: Try hex decoding
                    try:
                        if signature.startswith('0x'):
                            signature = signature[2:]
                        signature_bytes = binascii.unhexlify(signature)
                        print("Successfully decoded using hex")
                    except Exception as e4:
                        print(f"Hex decoding failed: {e4}")
                        raise ValueError("Failed to decode signature with any method")
        
        if signature_bytes is None:
            raise ValueError("Failed to decode signature")
        
        # Get the public key from the wallet address
        public_key = Pubkey.from_string(wallet_address)
        
        # Create a VerifyKey from the public key
        verify_key = VerifyKey(bytes(public_key))
        
        # Verify the signature against the message
        verify_key.verify(message.encode('utf-8'), signature_bytes)
        
        return True
    except (BadSignatureError, ValueError, Exception) as e:
        print(f"Signature verification error: {e}")
        return False
