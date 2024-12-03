export const config = {
    // Solana Program IDs
    STAKING_PROGRAM_ID: 'YOUR_STAKING_PROGRAM_ID',
    STAKING_TOKEN: 'YOUR_TOKEN_MINT_ADDRESS',
    
    // Staking Configuration
    REWARD_RATE: 0.1, // 10% APY
    LOCK_PERIOD: 7 * 24 * 60 * 60, // 7 days in seconds
    TOKEN_DECIMALS: 9,
    
    // Devnet Configuration
    DEVNET_RATIO: 5, // 5:1 ratio for devnet:mainnet tokens
    AIRDROP_AMOUNT: 100 * 1e9, // 100 tokens with 9 decimals
    
    // Network Configuration
    NETWORKS: {
        devnet: {
            url: 'https://api.devnet.solana.com',
            name: 'Devnet'
        },
        mainnet: {
            url: 'https://api.mainnet-beta.solana.com',
            name: 'Mainnet'
        }
    },
    
    // Default Network
    DEFAULT_NETWORK: 'devnet',
    
    // Wallet configurations
    SUPPORTED_WALLETS: {
        phantom: {
            name: 'Phantom',
            icon: 'assets/phantom.png',
            url: 'https://phantom.app/',
            adapter: 'PhantomWalletAdapter'
        },
        solflare: {
            name: 'Solflare',
            icon: 'assets/solflare.png',
            url: 'https://solflare.com/',
            adapter: 'SolflareWalletAdapter'
        },
        walletconnect: {
            name: 'WalletConnect',
            icon: 'assets/walletconnect.png',
            url: 'https://walletconnect.org/',
            adapter: 'WalletConnectAdapter'
        }
    }
};
