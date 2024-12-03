class WalletManager {
    constructor() {
        this.connection = null;
        this.wallet = null;
        this.network = 'devnet';
    }

    async initialize() {
        // Initialize network selection
        const networkSelect = document.getElementById('networkSelect');
        networkSelect.addEventListener('change', (e) => this.handleNetworkChange(e));
        
        // Initialize wallet connection button
        const connectButton = document.getElementById('connectWalletBtn');
        connectButton.addEventListener('click', () => this.connectWallet());
        
        // Initialize Solana connection
        this.updateConnection();
        
        // Check if wallet is already connected
        if (window.solana && window.solana.isPhantom) {
            window.solana.on('connect', () => this.handleConnect());
            window.solana.on('disconnect', () => this.handleDisconnect());
            
            if (window.solana.isConnected) {
                await this.handleConnect();
            }
        }
    }

    updateConnection() {
        const endpoint = this.network === 'devnet' 
            ? 'https://api.devnet.solana.com'
            : 'https://api.mainnet-beta.solana.com';
        this.connection = new solanaWeb3.Connection(endpoint);
    }

    async handleNetworkChange(event) {
        this.network = event.target.value;
        this.updateConnection();
        
        // Update UI based on network change
        this.showNotification('Network changed to ' + this.network, 'success');
        
        // Reconnect wallet if already connected
        if (this.wallet) {
            await this.handleConnect();
        }
    }

    async connectWallet() {
        try {
            if (!window.solana) {
                throw new Error('Phantom wallet not found! Please install Phantom wallet.');
            }

            const resp = await window.solana.connect();
            this.wallet = resp;
            await this.handleConnect();
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async handleConnect() {
        try {
            document.getElementById('connectWalletBtn').textContent = 'Connected';
            document.getElementById('walletPrompt').style.display = 'none';
            document.getElementById('stakingContent').style.display = 'block';
            
            // Get wallet balance
            const balance = await this.connection.getBalance(this.wallet.publicKey);
            this.showNotification(`Wallet connected! Balance: ${balance / solanaWeb3.LAMPORTS_PER_SOL} SOL`, 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    handleDisconnect() {
        this.wallet = null;
        document.getElementById('connectWalletBtn').textContent = 'Connect Wallet';
        document.getElementById('walletPrompt').style.display = 'block';
        document.getElementById('stakingContent').style.display = 'none';
        this.showNotification('Wallet disconnected', 'success');
    }

    showNotification(message, type) {
        const toast = document.getElementById(type === 'error' ? 'errorMessage' : 'successMessage');
        const toastBody = toast.querySelector('.toast-body');
        toastBody.textContent = message;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

export const walletManager = new WalletManager();
