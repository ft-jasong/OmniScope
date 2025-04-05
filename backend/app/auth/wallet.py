import secrets
import string
from eth_account.messages import encode_defunct
from web3 import Web3
from eth_account import Account
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
    Verify that the signature was signed by the wallet address
    """
    try:
        # Convert wallet address to checksum address
        wallet_address = Web3.to_checksum_address(wallet_address)
        
        # Create the message hash that was signed
        message_hash = encode_defunct(text=message)
        
        # Recover the address from the signature
        recovered_address = Account.recover_message(message_hash, signature=signature)
        
        # Check if the recovered address matches the provided wallet address
        return recovered_address.lower() == wallet_address.lower()
    except Exception as e:
        print(f"Signature verification error: {e}")
        return False
