import { config } from './config.js';

class WalletManager {
    constructor() {
        this.connection = null;
        this.wallet = null;
        this.walletType = null;
        this.network = config.DEFAULT_NETWORK;
        this.onConnectCallbacks = [];
        this.onDisconnectCallbacks = [];
        this.walletModal = null;
    }

    async initialize() {
        try {
            this.connection = new solanaWeb3.Connection(
                config.NETWORKS[this.network].url,
                'confirmed'
            );

            // Initialize Bootstrap modal
            this.walletModal = new bootstrap.Modal(document.getElementById('walletModal'));
            
            // Setup wallet buttons
            this.setupWalletButtons();
            
            // Check for existing connections
            await this.checkExistingConnection();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize wallet manager:', error);
            return false;
        }
    }

    setupWalletButtons() {
        // Connect wallet button
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        if (connectWalletBtn) {
            connectWalletBtn.addEventListener('click', () => {
                this.walletModal.show();
            });
        }

        // Phantom
        const phantomBtn = document.getElementById('connectPhantomBtn');
        if (phantomBtn) {
            phantomBtn.addEventListener('click', () => this.connectPhantom());
        }

        // Solflare
        const solflareBtn = document.getElementById('connectSolflareBtn');
        if (solflareBtn) {
            solflareBtn.addEventListener('click', () => this.connectSolflare());
        }

        // WalletConnect
        const walletConnectBtn = document.getElementById('connectWalletConnectBtn');
        if (walletConnectBtn) {
            walletConnectBtn.addEventListener('click', () => this.connectWalletConnect());
        }
    }

    async checkExistingConnection() {
        // Check Phantom
        if (window.solana?.isPhantom) {
            try {
                const resp = await window.solana.connect({ onlyIfTrusted: true });
                await this.handleWalletConnection(window.solana, 'phantom', resp.publicKey);
            } catch (error) {
                // Not auto-connected, ignore
            }
        }

        // Check Solflare
        if (window.solflare?.isSolflare) {
            try {
                const resp = await window.solflare.connect({ onlyIfTrusted: true });
                await this.handleWalletConnection(window.solflare, 'solflare', resp.publicKey);
            } catch (error) {
                // Not auto-connected, ignore
            }
        }
    }

    async connectPhantom() {
        try {
            if (!window.solana) {
                throw new Error('Phantom wallet not installed');
            }

            const resp = await window.solana.connect();
            await this.handleWalletConnection(window.solana, 'phantom', resp.publicKey);
            this.walletModal.hide();
        } catch (error) {
            console.error('Phantom connection error:', error);
            if (error.message.includes('not installed')) {
                window.open('https://phantom.app/', '_blank');
            }
            throw error;
        }
    }

    async connectSolflare() {
        try {
            if (!window.solflare) {
                throw new Error('Solflare wallet not installed');
            }

            const resp = await window.solflare.connect();
            await this.handleWalletConnection(window.solflare, 'solflare', resp.publicKey);
            this.walletModal.hide();
        } catch (error) {
            console.error('Solflare connection error:', error);
            if (error.message.includes('not installed')) {
                window.open('https://solflare.com/', '_blank');
            }
            throw error;
        }
    }

    async connectWalletConnect() {
        try {
            // Initialize WalletConnect
            const provider = new WalletConnectProvider({
                network: this.network
            });

            await provider.enable();
            await this.handleWalletConnection(provider, 'walletconnect', provider.publicKey);
            this.walletModal.hide();
        } catch (error) {
            console.error('WalletConnect error:', error);
            throw error;
        }
    }

    async handleWalletConnection(walletInstance, type, publicKey) {
        this.wallet = walletInstance;
        this.walletType = type;
        this.publicKey = publicKey;

        // Setup disconnect listener
        this.wallet.on('disconnect', () => {
            this.handleDisconnect();
        });

        // Setup network change listener
        this.wallet.on('networkChanged', (network) => {
            this.handleNetworkChange(network);
        });

        // Notify connection
        this.onConnectCallbacks.forEach(callback => callback(publicKey));
    }

    handleDisconnect() {
        this.wallet = null;
        this.walletType = null;
        this.publicKey = null;
        this.onDisconnectCallbacks.forEach(callback => callback());
    }

    async handleNetworkChange(network) {
        this.network = network;
        this.connection = new solanaWeb3.Connection(
            config.NETWORKS[this.network].url,
            'confirmed'
        );
        // Notify network change if needed
    }

    async switchNetwork(network) {
        if (!config.NETWORKS[network]) {
            throw new Error('Invalid network');
        }

        this.network = network;
        this.connection = new solanaWeb3.Connection(
            config.NETWORKS[network].url,
            'confirmed'
        );

        // Request wallet to switch network if supported
        if (this.wallet?.switchNetwork) {
            await this.wallet.switchNetwork(network);
        }
    }

    isConnected() {
        return !!this.wallet;
    }

    getNetwork() {
        return this.network;
    }

    getConnection() {
        return this.connection;
    }

    getWallet() {
        return this.wallet;
    }

    getPublicKey() {
        return this.publicKey;
    }

    getShortAddress() {
        if (!this.publicKey) return '';
        const addr = this.publicKey.toString();
        return addr.slice(0, 4) + '...' + addr.slice(-4);
    }

    onWalletConnect(callback) {
        this.onConnectCallbacks.push(callback);
    }

    onWalletDisconnect(callback) {
        this.onDisconnectCallbacks.push(callback);
    }
}

export const walletManager = new WalletManager();
