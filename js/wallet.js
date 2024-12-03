// Wallet connection functionality
class WalletManager {
    constructor() {
        this.connection = null;
        this.provider = null;
        this.connected = false;
        this.publicKey = null;
        this.balanceRefreshInterval = null;
        this.eventListeners = new Map();
        this.network = localStorage.getItem('solanaNetwork') || 'devnet';
        this.init();
    }

    init() {
        try {
            // Initialize Solana connection based on selected network
            this.updateConnection();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check existing connection
            this.checkExistingConnection();

            // Setup auto-reconnect
            window.addEventListener('focus', () => {
                this.checkExistingConnection();
            });
        } catch (error) {
            console.error('Wallet initialization error:', error);
        }
    }

    updateConnection() {
        const endpoint = this.network === 'mainnet' 
            ? 'https://api.mainnet-beta.solana.com'
            : solanaWeb3.clusterApiUrl('devnet');
        
        this.connection = new solanaWeb3.Connection(endpoint, 'confirmed');
        
        // Update network display
        this.updateNetworkDisplay();
    }

    updateNetworkDisplay() {
        const networkDisplays = document.querySelectorAll('.network-display');
        networkDisplays.forEach(display => {
            if (display) {
                display.textContent = this.network.toUpperCase();
                display.className = 'network-display ' + this.network;
            }
        });
    }

    async switchNetwork(network) {
        if (network === this.network) return;
        
        this.network = network;
        localStorage.setItem('solanaNetwork', network);
        
        // Update connection
        this.updateConnection();
        
        // Refresh wallet connection
        if (this.connected) {
            await this.checkExistingConnection();
        }
        
        // Show success message
        this.showSuccess(`Switched to ${network.toUpperCase()}`);
    }

    setupEventListeners() {
        if (window.solana) {
            // Remove any existing listeners
            window.solana.removeAllListeners('connect');
            window.solana.removeAllListeners('disconnect');
            window.solana.removeAllListeners('accountChanged');

            // Add new listeners
            window.solana.on('connect', () => this.handleConnect());
            window.solana.on('disconnect', () => this.handleDisconnect());
            window.solana.on('accountChanged', () => this.checkExistingConnection());
        }
    }

    async connectWallet() {
        try {
            const provider = this.getProvider();
            if (!provider) {
                throw new Error("Please install Phantom wallet!");
            }

            // Update UI to loading state
            this.updateButtonsLoading(true);

            // Connect to wallet
            const response = await provider.connect();
            this.publicKey = response.publicKey;
            this.provider = provider;
            this.connected = true;

            // Store connection state
            localStorage.setItem('walletAutoConnect', 'true');

            // Update UI and start balance refresh
            await this.handleConnect();
            
            return true;
        } catch (error) {
            console.error("Error connecting wallet:", error);
            this.showError(error.message);
            this.updateButtonsLoading(false);
            return false;
        }
    }

    async handleConnect() {
        if (this.publicKey) {
            // Update UI
            this.updateUI();
            
            // Show task section if on tasks page
            this.showTaskSection();
            
            // Update and start balance refresh
            await this.updateBalance();
            this.startBalanceRefresh();
            
            this.showSuccess('Wallet connected successfully!');
        }
    }

    handleDisconnect() {
        this.connected = false;
        this.publicKey = null;
        this.stopBalanceRefresh();
        this.updateUI();
        this.hideTaskSection();
        
        // Clear auto-connect setting
        localStorage.removeItem('walletAutoConnect');
        
        this.showSuccess('Wallet disconnected');
    }

    async checkExistingConnection() {
        const provider = this.getProvider();
        const shouldAutoConnect = localStorage.getItem('walletAutoConnect') === 'true';
        
        if (provider) {
            try {
                if (shouldAutoConnect && !this.connected) {
                    await this.connectWallet();
                } else if (provider.isConnected && provider.publicKey) {
                    this.provider = provider;
                    this.publicKey = provider.publicKey;
                    this.connected = true;
                    await this.handleConnect();
                }
            } catch (error) {
                console.error('Error checking connection:', error);
                localStorage.removeItem('walletAutoConnect');
            }
        }
    }

    getProvider() {
        if ('phantom' in window) {
            const provider = window.phantom?.solana;
            if (provider?.isPhantom) {
                return provider;
            }
        }
        window.open('https://phantom.app/', '_blank');
        return null;
    }

    updateUI() {
        const walletBtns = document.querySelectorAll('[id^="walletBtn"], [id^="connectWalletBtn"]');
        const walletInfos = document.querySelectorAll('.wallet-info');
        
        if (this.connected && this.publicKey) {
            const address = this.publicKey.toString();
            const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
            
            walletBtns.forEach(btn => {
                btn.textContent = shortAddress;
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-success');
                btn.disabled = false;
            });
            
            walletInfos.forEach(info => {
                if (info) {
                    info.style.display = 'block';
                    const addressElem = info.querySelector('.wallet-address');
                    if (addressElem) {
                        addressElem.textContent = shortAddress;
                    }
                }
            });
        } else {
            walletBtns.forEach(btn => {
                btn.textContent = 'Connect Wallet';
                btn.classList.remove('btn-success');
                btn.classList.add('btn-primary');
                btn.disabled = false;
            });
            
            walletInfos.forEach(info => {
                if (info) {
                    info.style.display = 'none';
                }
            });
        }
    }

    updateButtonsLoading(loading) {
        const walletBtns = document.querySelectorAll('[id^="walletBtn"], [id^="connectWalletBtn"]');
        walletBtns.forEach(btn => {
            btn.disabled = loading;
            btn.innerHTML = loading ? 
                '<span class="spinner-border spinner-border-sm"></span> Connecting...' : 
                'Connect Wallet';
        });
    }

    async updateBalance() {
        if (!this.connected || !this.publicKey || !this.connection) return;
        
        try {
            const balance = await this.connection.getBalance(this.publicKey);
            const solBalance = (balance / solanaWeb3.LAMPORTS_PER_SOL).toFixed(4);
            
            const balanceElements = document.querySelectorAll('[id^="walletBalance"]');
            balanceElements.forEach(elem => {
                if (elem) elem.textContent = solBalance;
            });
        } catch (error) {
            console.error('Error updating balance:', error);
        }
    }

    startBalanceRefresh() {
        this.stopBalanceRefresh();
        this.balanceRefreshInterval = setInterval(() => this.updateBalance(), 30000);
    }

    stopBalanceRefresh() {
        if (this.balanceRefreshInterval) {
            clearInterval(this.balanceRefreshInterval);
            this.balanceRefreshInterval = null;
        }
    }

    showTaskSection() {
        const taskSection = document.getElementById('taskSection');
        if (taskSection) {
            taskSection.style.display = 'block';
            taskSection.style.opacity = '0';
            void taskSection.offsetWidth;
            taskSection.style.opacity = '1';
            taskSection.style.transform = 'translateY(0)';
            taskSection.classList.add('visible');
        }
    }

    hideTaskSection() {
        const taskSection = document.getElementById('taskSection');
        if (taskSection) {
            taskSection.style.opacity = '0';
            taskSection.style.transform = 'translateY(20px)';
            taskSection.classList.remove('visible');
            setTimeout(() => {
                taskSection.style.display = 'none';
            }, 500);
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
        }
    }

    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 5000);
        }
    }

    isConnected() {
        return this.connected;
    }

    getPublicKey() {
        return this.publicKey;
    }

    getNetwork() {
        return this.network;
    }
}

// Initialize wallet manager
const walletManager = new WalletManager();

// Export for use in other files
export default walletManager;
