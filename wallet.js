// Wallet connection functionality
class WalletManager {
    constructor() {
        this.connection = null;
        this.provider = null;
        this.connected = false;
        this.publicKey = null;
        this.tokenHelper = null;
        this.devnetToken = null;
        this.init();
    }

    async init() {
        try {
            // Initialize Solana connection (using devnet for development)
            const network = "https://api.devnet.solana.com";
            this.connection = new solanaWeb3.Connection(network);
            this.tokenHelper = new TokenHelper(this.connection);
        } catch (error) {
            console.error("Failed to initialize wallet manager:", error);
        }
    }

    async connectWallet() {
        try {
            // Check if Phantom wallet is installed
            const { solana } = window;
            
            if (!solana?.isPhantom) {
                throw new Error("Phantom wallet is not installed. Please install it from phantom.app");
            }

            // Request wallet connection
            const response = await solana.connect();
            this.publicKey = response.publicKey;
            this.provider = solana;
            this.connected = true;

            // Create devnet token if needed
            await this.initializeDevnetToken();

            // Update UI elements
            this.updateUI();
            
            // Setup disconnect event handler
            solana.on('disconnect', () => {
                this.connected = false;
                this.publicKey = null;
                this.devnetToken = null;
                this.updateUI();
            });

            return true;
        } catch (error) {
            console.error("Error connecting wallet:", error);
            this.showError(error.message);
            return false;
        }
    }

    async initializeDevnetToken() {
        try {
            if (!this.devnetToken) {
                this.devnetToken = await this.tokenHelper.createDevnetToken(this);
                console.log("Created devnet token:", this.devnetToken);
            }
        } catch (error) {
            console.error("Error initializing devnet token:", error);
            this.showError("Failed to initialize devnet token. Please try again.");
        }
    }

    async getDevnetTokenBalance() {
        if (!this.devnetToken?.tokenAccount) {
            return 0;
        }
        return await this.tokenHelper.getTokenBalance(this.devnetToken.tokenAccount);
    }

    updateUI() {
        const walletBtn = document.getElementById('walletBtn');
        if (!walletBtn) return;

        if (this.connected && this.publicKey) {
            const address = this.publicKey.toString();
            walletBtn.textContent = `${address.slice(0, 4)}...${address.slice(-4)}`;
            walletBtn.classList.add('connected');
            // Dispatch event for other components that might need to know about wallet connection
            window.dispatchEvent(new CustomEvent('walletConnected', { 
                detail: { publicKey: this.publicKey }
            }));
        } else {
            walletBtn.textContent = 'Connect Wallet';
            walletBtn.classList.remove('connected');
            window.dispatchEvent(new CustomEvent('walletDisconnected'));
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        } else {
            alert(message); // Fallback if error div doesn't exist
        }
    }

    isConnected() {
        return this.connected;
    }

    getPublicKey() {
        return this.publicKey;
    }

    getConnection() {
        return this.connection;
    }
}

// Initialize wallet manager
const walletManager = new WalletManager();

// Export for use in other files
window.walletManager = walletManager;
