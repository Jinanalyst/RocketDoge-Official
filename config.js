import dotenv from 'dotenv';

dotenv.config();

export const config = {
    STAKING_PROGRAM_ID: process.env.STAKING_PROGRAM_ID,
    STAKING_TOKEN: process.env.STAKING_TOKEN,
    REWARD_RATE: parseInt(process.env.REWARD_RATE || '10'),
    LOCK_PERIOD: parseInt(process.env.LOCK_PERIOD || '86400'),
    TOKEN_DECIMALS: parseInt(process.env.TOKEN_DECIMALS || '9'),
    DEVNET_RATIO: parseInt(process.env.DEVNET_RATIO || '5'),
    AIRDROP_AMOUNT: parseInt(process.env.AIRDROP_AMOUNT || '1000')
};
