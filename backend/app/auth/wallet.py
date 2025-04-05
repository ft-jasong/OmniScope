import secrets
import string
import base58
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
        # Convert the signature from base64 to bytes
        signature_bytes = base58.b58decode(signature)
        
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
