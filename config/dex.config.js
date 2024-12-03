export const dexConfig = {
    TOKENS: {
        SOL: {
            symbol: 'SOL',
            decimals: 9,
            address: 'So11111111111111111111111111111111111111112',
            name: 'Solana',
            logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
        },
        USDC: {
            symbol: 'USDC',
            decimals: 6,
            address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            name: 'USD Coin',
            logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
        },
        // ... other tokens
    },
    DEFAULT_SLIPPAGE: 0.5,
    MAX_SLIPPAGE: 5,
    DEFAULT_DEADLINE: 20, // minutes
    REFRESH_RATE: 30000, // 30 seconds
    ERROR_MESSAGES: {
        NO_WALLET: 'Please install Phantom wallet',
        CONNECTION_ERROR: 'Failed to connect to Solana network',
        INSUFFICIENT_BALANCE: 'Insufficient balance for swap',
        SWAP_FAILED: 'Swap transaction failed',
        INVALID_AMOUNT: 'Please enter a valid amount',
        PRICE_IMPACT_HIGH: 'Price impact too high'
    }
};
