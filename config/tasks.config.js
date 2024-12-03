export const tasksConfig = {
    PROGRAM_ID: '28AgonRFAayxQRozCYBeRCWJCM3kPq3iNoz99q6ATTHY',
    TOKEN_DECIMALS: 9,
    DEX_PAIR_ADDRESS: 'cz51zdrzmcptdhyks13cckzykvqzzk6u1if1ikojv1fj',
    MIN_TRADE_AMOUNT: 0.1,
    TRON_USDT_CONTRACT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    MIN_DEPOSIT_AMOUNT: 100,
    TASK_REWARDS: {
        1: 100,  // Social Media
        2: 200,  // Blofin Signup
        3: 200,  // OKX Signup
        4: 500,  // Blofin Deposit
        5: 500,  // OKX Deposit
        6: 1000  // DEX Trading
    },
    REFRESH_INTERVAL: 30000,
    ERROR_MESSAGES: {
        NO_WALLET: 'Please install Phantom wallet',
        CONNECTION_ERROR: 'Failed to connect to Solana network',
        INVALID_TRON_ADDRESS: 'Invalid TRON address provided',
        INVALID_DEPOSIT: 'Deposit amount below minimum requirement',
        VERIFICATION_FAILED: 'Task verification failed',
        REWARD_FAILED: 'Failed to distribute reward'
    }
};
