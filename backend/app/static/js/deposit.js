// HSK Token Deposit Helper
class HSKDepositHelper {
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl || '';
        this.token = localStorage.getItem('auth_token');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    // Get deposit information
    async getDepositInfo() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/users/deposit/info`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get deposit info:', error);
            throw error;
        }
    }

    // Get user balance
    async getUserBalance() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/users/balance`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get user balance:', error);
            throw error;
        }
    }

    // Notify backend of deposit
    async notifyDeposit(transactionHash, amount) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/users/deposit/notify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transaction_hash: transactionHash,
                    amount: amount
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to notify deposit:', error);
            throw error;
        }
    }

    // Get deposit history
    async getDepositHistory() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/users/deposit/history`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get deposit history:', error);
            throw error;
        }
    }

    // Helper method to connect to MetaMask
    async connectWallet() {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                return accounts[0];
            } catch (error) {
                console.error('User denied account access', error);
                throw new Error('Please connect to MetaMask to continue');
            }
        } else {
            throw new Error('MetaMask is not installed. Please install it to continue');
        }
    }

    // Helper method to deposit tokens using web3
    async depositTokens(amount) {
        if (!window.ethereum || !window.Web3) {
            throw new Error('Web3 is not available. Please install MetaMask');
        }

        try {
            // Get deposit info
            const depositInfo = await this.getDepositInfo();
            const depositContractAddress = depositInfo.deposit_contract_address;
            
            // Connect to wallet
            const walletAddress = await this.connectWallet();
            
            // Check if connected wallet matches user wallet
            if (walletAddress.toLowerCase() !== depositInfo.wallet_address.toLowerCase()) {
                throw new Error('Connected wallet does not match your registered wallet');
            }
            
            // Create Web3 instance
            const web3 = new Web3(window.ethereum);
            
            // Get contract ABI (this should be provided by your backend or stored in your frontend)
            const depositContractABI = [
                {
                    "constant": false,
                    "inputs": [{"name": "amount", "type": "uint256"}],
                    "name": "deposit",
                    "outputs": [],
                    "type": "function"
                }
            ];
            
            // Create contract instance
            const depositContract = new web3.eth.Contract(depositContractABI, depositContractAddress);
            
            // Convert amount to wei (assuming 18 decimals, adjust if different)
            const amountInWei = web3.utils.toWei(amount.toString(), 'ether');
            
            // Send transaction
            const tx = await depositContract.methods.deposit(amountInWei).send({
                from: walletAddress
            });
            
            // Notify backend
            const notifyResult = await this.notifyDeposit(tx.transactionHash, amount);
            
            return {
                transactionHash: tx.transactionHash,
                notifyResult: notifyResult
            };
        } catch (error) {
            console.error('Failed to deposit tokens:', error);
            throw error;
        }
    }
}

// Example usage:
// const depositHelper = new HSKDepositHelper('http://localhost:8000/api/v1');
// depositHelper.setToken('your_jwt_token');
// 
// // Get deposit info
// depositHelper.getDepositInfo().then(info => console.log(info));
// 
// // Deposit tokens
// depositHelper.depositTokens(10).then(result => console.log(result));
