import { 
    Token,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { 
    PublicKey, 
    Transaction, 
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { TokenSwap, TOKEN_SWAP_PROGRAM_ID } from '@solana/spl-token-swap';

export class SwapManager {
    constructor(connection, wallet) {
        this.connection = connection;
        this.wallet = wallet;
    }

    async findAssociatedTokenAddress(walletAddress, tokenMintAddress) {
        return (await PublicKey.findProgramAddress(
            [
                walletAddress.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                tokenMintAddress.toBuffer(),
            ],
            ASSOCIATED_TOKEN_PROGRAM_ID
        ))[0];
    }

    async createAssociatedTokenAccount(tokenMint) {
        const walletAddress = this.wallet.publicKey;
        const associatedTokenAddress = await this.findAssociatedTokenAddress(
            walletAddress,
            tokenMint
        );

        const transaction = new Transaction().add(
            Token.createAssociatedTokenAccountInstruction(
                ASSOCIATED_TOKEN_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                tokenMint,
                associatedTokenAddress,
                walletAddress,
                walletAddress
            )
        );

        return { transaction, associatedTokenAddress };
    }

    async getTokenBalance(tokenAccountAddress) {
        try {
            const balance = await this.connection.getTokenAccountBalance(
                new PublicKey(tokenAccountAddress)
            );
            return balance.value.uiAmount;
        } catch (error) {
            console.error('Error getting token balance:', error);
            return 0;
        }
    }

    async getTokenAccount(tokenMint) {
        const walletAddress = this.wallet.publicKey;
        const associatedTokenAddress = await this.findAssociatedTokenAddress(
            walletAddress,
            new PublicKey(tokenMint)
        );

        try {
            const tokenAccount = await this.connection.getAccountInfo(associatedTokenAddress);
            if (!tokenAccount) {
                const { transaction, associatedTokenAddress: newAddress } = 
                    await this.createAssociatedTokenAccount(new PublicKey(tokenMint));
                
                await this.wallet.sendTransaction(transaction, this.connection);
                return newAddress;
            }
            return associatedTokenAddress;
        } catch (error) {
            console.error('Error getting token account:', error);
            throw error;
        }
    }

    async swap(
        poolAddress,
        fromTokenMint,
        toTokenMint,
        fromAmount,
        minAmountOut,
        slippageTolerance = 0.5
    ) {
        try {
            // Get pool data
            const poolData = await TokenSwap.load(
                this.connection,
                new PublicKey(poolAddress),
                TOKEN_SWAP_PROGRAM_ID,
                this.wallet.publicKey
            );

            // Get user's token accounts
            const fromTokenAccount = await this.getTokenAccount(fromTokenMint);
            const toTokenAccount = await this.getTokenAccount(toTokenMint);

            // Calculate minimum amount out with slippage tolerance
            const calculatedMinAmountOut = minAmountOut * (1 - slippageTolerance / 100);

            // Create swap instruction
            const swapInstruction = TokenSwap.swapInstruction(
                poolData.tokenSwap,
                poolData.authority,
                this.wallet.publicKey,
                fromTokenAccount,
                poolData.tokenAccountA,
                poolData.tokenAccountB,
                toTokenAccount,
                poolData.poolToken,
                poolData.feeAccount,
                null,
                TOKEN_SWAP_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                fromAmount * (10 ** poolData.tokenA.decimals),
                calculatedMinAmountOut * (10 ** poolData.tokenB.decimals)
            );

            // Create and send transaction
            const transaction = new Transaction().add(swapInstruction);
            const signature = await this.wallet.sendTransaction(transaction, this.connection);
            
            // Wait for confirmation
            await this.connection.confirmTransaction(signature);
            
            return {
                signature,
                fromAmount,
                toAmount: minAmountOut,
                fromToken: fromTokenMint,
                toToken: toTokenMint
            };
        } catch (error) {
            console.error('Swap failed:', error);
            throw error;
        }
    }

    async getPoolData(poolAddress) {
        try {
            const poolData = await TokenSwap.load(
                this.connection,
                new PublicKey(poolAddress),
                TOKEN_SWAP_PROGRAM_ID,
                this.wallet.publicKey
            );

            const tokenABalance = await this.connection.getTokenAccountBalance(poolData.tokenAccountA);
            const tokenBBalance = await this.connection.getTokenAccountBalance(poolData.tokenAccountB);

            return {
                tokenABalance: tokenABalance.value.uiAmount,
                tokenBBalance: tokenBBalance.value.uiAmount,
                tokenAMint: poolData.tokenA.toString(),
                tokenBMint: poolData.tokenB.toString(),
                fee: poolData.tradeFeeNumerator.toNumber() / poolData.tradeFeeDenominator.toNumber()
            };
        } catch (error) {
            console.error('Error getting pool data:', error);
            throw error;
        }
    }

    async calculateAmountOut(
        poolAddress,
        fromTokenMint,
        toTokenMint,
        amountIn
    ) {
        try {
            const poolData = await this.getPoolData(poolAddress);
            
            // Determine if we're going from A to B or B to A
            const isAtoB = fromTokenMint === poolData.tokenAMint;
            const fromBalance = isAtoB ? poolData.tokenABalance : poolData.tokenBBalance;
            const toBalance = isAtoB ? poolData.tokenBBalance : poolData.tokenABalance;
            
            // Calculate amount out using constant product formula (x * y = k)
            // and accounting for fees
            const fee = poolData.fee;
            const amountInWithFee = amountIn * (1 - fee);
            const amountOut = (amountInWithFee * toBalance) / (fromBalance + amountInWithFee);
            
            // Calculate price impact
            const priceImpact = (amountOut / toBalance) * 100;
            
            return {
                amountOut,
                priceImpact,
                fee: amountIn * fee
            };
        } catch (error) {
            console.error('Error calculating amount out:', error);
            throw error;
        }
    }
}

// Token configurations for RocketDoge DEX
export const TOKEN_CONFIGS = {
    SOL: {
        mint: 'So11111111111111111111111111111111111111112', // Native SOL wrapped address
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana'
    },
    RDOGE: {
        mint: '5f6tdW7tNMpaMWuNSQ7cD9qubHBRdB4qmRuLM1oBDKzc', // Our devnet RDOGE token
        decimals: 9,
        symbol: 'RDOGE',
        name: 'RocketDoge'
    },
    USDC: {
        mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
        decimals: 6,
        symbol: 'USDC',
        name: 'USD Coin'
    }
};

// Pool configurations for devnet
export const POOL_CONFIGS = {
    SOL_RDOGE: {
        address: null, // We'll create this pool next
        tokenA: TOKEN_CONFIGS.SOL,
        tokenB: TOKEN_CONFIGS.RDOGE
    },
    RDOGE_USDC: {
        address: null, // We'll create this pool next
        tokenA: TOKEN_CONFIGS.RDOGE,
        tokenB: TOKEN_CONFIGS.USDC
    },
    SOL_USDC: {
        address: null, // We'll create this pool next
        tokenA: TOKEN_CONFIGS.SOL,
        tokenB: TOKEN_CONFIGS.USDC
    }
};
