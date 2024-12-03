export const poolsConfig = {
    FEE_RECIPIENT: '6zkf4DviZZkpWVEh53MrcQV6vGXGpESnNXgAvU6KpBUH',
    PLATFORM_FEE: 0.003, // 0.3%
    MIN_LIQUIDITY: 0.1, // Minimum liquidity in SOL
    MAX_SLIPPAGE: 1, // 1%
    REFRESH_INTERVAL: 30000, // 30 seconds
    ERROR_MESSAGES: {
        NO_WALLET: 'Please install Phantom wallet',
        CONNECTION_ERROR: 'Failed to connect to Solana network',
        INSUFFICIENT_BALANCE: 'Insufficient balance for liquidity',
        POOL_CREATE_FAILED: 'Failed to create pool',
        INVALID_AMOUNT: 'Please enter a valid amount',
        MIN_LIQUIDITY_ERROR: 'Amount below minimum liquidity requirement'
    }
};
