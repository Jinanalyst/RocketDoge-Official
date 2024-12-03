// Staking Manager for RocketDoge DEX
import { walletManager } from './app.js';
import { 
    TOKEN_PROGRAM_ID, 
    createAssociatedTokenAccountInstruction, 
    getAssociatedTokenAddress,
    getAccount,
    createTransferInstruction
} from '@solana/spl_token';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

export class StakingManager {
    constructor() {
        // RDOGE token mint address on devnet
        this.RDOGE_MINT = new PublicKey('5f6tdW7tNMpaMWuNSQ7cD9qubHBRdB4qmRuLM1oBDKzc');
        // Staking pool authority
        this.STAKING_AUTHORITY = new PublicKey('HYrnznkvTWvX2fRdnKq6f3b5yxDWpju7oXjGCZhgtDBN');
        
        // Constants
        this.APR = 120; // 120% APR
        this.DEVNET_RATIO = 5; // 5:1 ratio for devnet rewards
        this.MIN_STAKE_DURATION = 24 * 60 * 60; // 24 hours in seconds
        
        this.connection = walletManager.connection;
        this.stakes = new Map(); // Map to store stake info by user
        
        // Set up balance check interval
        setInterval(() => this.updateBalances(), 5000); // Check every 5 seconds
    }

    async initialize() {
        await this.loadStakingData();
        this.setupEventListeners();
        await this.updateBalances();
    }

    // Update all balances
    async updateBalances() {
        if (!walletManager.isConnected()) return;

        try {
            const walletAddress = walletManager.publicKey;
            
            // Get user's token account
            const userTokenAccount = await getAssociatedTokenAddress(
                this.RDOGE_MINT,
                walletAddress
            );

            // Get staking pool's token account
            const poolTokenAccount = await getAssociatedTokenAddress(
                this.RDOGE_MINT,
                this.STAKING_AUTHORITY
            );

            // Get balances
            try {
                const userBalance = await this.connection.getTokenAccountBalance(userTokenAccount);
                document.getElementById('tokenBalance').textContent = 
                    (userBalance.value.uiAmount || 0).toFixed(2);
            } catch (e) {
                console.log('User token account not found');
                document.getElementById('tokenBalance').textContent = '0.00';
            }

            // Get stake info and update UI
            const stakeInfo = await this.getStakeInfo(walletAddress);
            if (stakeInfo) {
                document.getElementById('stakedAmount').textContent = 
                    stakeInfo.amount.toFixed(2);
                
                const rewards = this.calculateRewards(stakeInfo);
                document.getElementById('rewards').textContent = 
                    rewards.toFixed(2);
            } else {
                document.getElementById('stakedAmount').textContent = '0.00';
                document.getElementById('rewards').textContent = '0.00';
            }

            // Update total staked
            const totalStaked = await this.getTotalStaked();
            document.getElementById('totalStaked').textContent = 
                totalStaked.toFixed(2);

        } catch (error) {
            console.error('Error updating balances:', error);
        }
    }

    // Load staking data for connected wallet
    async loadStakingData() {
        if (!walletManager.isConnected()) return;

        try {
            // Update APR
            document.getElementById('currentAPY').textContent = 
                `${this.APR}%`;

            await this.updateBalances();
        } catch (error) {
            console.error('Error loading staking data:', error);
        }
    }

    setupEventListeners() {
        // Stake button
        const stakeButton = document.getElementById('stakeButton');
        if (stakeButton) {
            stakeButton.addEventListener('click', async () => {
                const amount = parseFloat(document.getElementById('stakeAmount').value);
                if (!amount || amount <= 0) {
                    alert('Please enter a valid amount');
                    return;
                }
                await this.stake(amount);
            });
        }

        // Unstake button
        const unstakeButton = document.getElementById('unstakeButton');
        if (unstakeButton) {
            unstakeButton.addEventListener('click', async () => {
                const amount = parseFloat(document.getElementById('unstakeAmount').value);
                if (!amount || amount <= 0) {
                    alert('Please enter a valid amount');
                    return;
                }
                await this.unstake(amount);
            });
        }

        // Add claim button if it doesn't exist
        if (!document.getElementById('claimButton')) {
            const claimButton = document.createElement('button');
            claimButton.id = 'claimButton';
            claimButton.className = 'btn btn-success w-100 mt-3';
            claimButton.textContent = 'Claim Rewards';
            claimButton.addEventListener('click', () => this.claimRewards());

            // Add it after the unstake button
            const actionsCard = document.querySelector('.card:last-child .card-body');
            if (actionsCard) {
                actionsCard.appendChild(claimButton);
            }
        }

        // Listen for wallet connection changes
        document.addEventListener('walletConnectionChanged', () => {
            this.loadStakingData();
        });
    }

    // Calculate rewards based on stake amount and time
    calculateRewards(stakeInfo) {
        if (!stakeInfo || !stakeInfo.amount || !stakeInfo.timestamp) return 0;

        const now = Date.now() / 1000;
        const stakeDuration = now - stakeInfo.timestamp;
        
        // Only calculate rewards if minimum stake duration is met
        if (stakeDuration < this.MIN_STAKE_DURATION) return 0;

        // Calculate rewards: (amount * APR * duration) / (365 days * 24 hours * 60 minutes * 60 seconds)
        const rewards = (stakeInfo.amount * this.APR * stakeDuration) / (365 * 24 * 60 * 60);
        
        // Apply devnet ratio
        return rewards * this.DEVNET_RATIO;
    }

    // Stake tokens
    async stake(amount) {
        if (!walletManager.isConnected()) {
            alert('Please connect your wallet first');
            return;
        }

        try {
            const walletAddress = walletManager.publicKey;
            
            // Create transaction
            const transaction = new Transaction();
            
            // Get token accounts
            const userTokenAccount = await getAssociatedTokenAddress(
                this.RDOGE_MINT,
                walletAddress
            );
            
            const poolTokenAccount = await getAssociatedTokenAddress(
                this.RDOGE_MINT,
                this.STAKING_AUTHORITY
            );

            // Check if user's token account exists
            const userAccountInfo = await this.connection.getAccountInfo(userTokenAccount);
            if (!userAccountInfo) {
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        walletAddress,
                        userTokenAccount,
                        walletAddress,
                        this.RDOGE_MINT
                    )
                );
            }

            // Check if pool's token account exists
            const poolAccountInfo = await this.connection.getAccountInfo(poolTokenAccount);
            if (!poolAccountInfo) {
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        walletAddress,
                        poolTokenAccount,
                        this.STAKING_AUTHORITY,
                        this.RDOGE_MINT
                    )
                );
            }

            // Add transfer instruction
            transaction.add(
                createTransferInstruction(
                    userTokenAccount,
                    poolTokenAccount,
                    walletAddress,
                    amount * (10 ** 9) // Convert to lamports
                )
            );

            // Send transaction
            const signature = await walletManager.sendTransaction(transaction);
            await this.connection.confirmTransaction(signature);

            // Update stake info
            this.stakes.set(walletAddress.toBase58(), {
                amount: amount,
                timestamp: Date.now() / 1000
            });

            // Update UI
            await this.updateBalances();
            
            // Clear input field
            document.getElementById('stakeAmount').value = '';
            
            alert('Staking successful!');

        } catch (error) {
            console.error('Error staking:', error);
            alert('Failed to stake: ' + error.message);
        }
    }

    // Unstake tokens
    async unstake(amount) {
        if (!walletManager.isConnected()) {
            alert('Please connect your wallet first');
            return;
        }

        const stakeInfo = await this.getStakeInfo(walletManager.publicKey);
        if (!stakeInfo || stakeInfo.amount < amount) {
            alert('Insufficient staked amount');
            return;
        }

        try {
            const walletAddress = walletManager.publicKey;
            
            // Create transaction
            const transaction = new Transaction();
            
            // Get token accounts
            const userTokenAccount = await getAssociatedTokenAddress(
                this.RDOGE_MINT,
                walletAddress
            );
            
            const poolTokenAccount = await getAssociatedTokenAddress(
                this.RDOGE_MINT,
                this.STAKING_AUTHORITY
            );

            // Add transfer instruction
            transaction.add(
                createTransferInstruction(
                    poolTokenAccount,
                    userTokenAccount,
                    this.STAKING_AUTHORITY,
                    amount * (10 ** 9) // Convert to lamports
                )
            );

            // Send transaction
            const signature = await walletManager.sendTransaction(transaction);
            await this.connection.confirmTransaction(signature);

            // Update stake info
            const newAmount = stakeInfo.amount - amount;
            if (newAmount > 0) {
                this.stakes.set(walletAddress.toBase58(), {
                    amount: newAmount,
                    timestamp: stakeInfo.timestamp
                });
            } else {
                this.stakes.delete(walletAddress.toBase58());
            }

            // Update UI
            await this.updateBalances();
            
            // Clear input field
            document.getElementById('unstakeAmount').value = '';
            
            alert('Unstaking successful!');

        } catch (error) {
            console.error('Error unstaking:', error);
            alert('Failed to unstake: ' + error.message);
        }
    }

    // Claim rewards
    async claimRewards() {
        if (!walletManager.isConnected()) {
            alert('Please connect your wallet first');
            return;
        }

        const stakeInfo = await this.getStakeInfo(walletManager.publicKey);
        if (!stakeInfo) {
            alert('No stakes found');
            return;
        }

        const rewards = this.calculateRewards(stakeInfo);
        if (rewards <= 0) {
            alert('No rewards available yet');
            return;
        }

        try {
            const walletAddress = walletManager.publicKey;
            
            // Create transaction
            const transaction = new Transaction();
            
            // Get token accounts
            const userTokenAccount = await getAssociatedTokenAddress(
                this.RDOGE_MINT,
                walletAddress
            );
            
            const poolTokenAccount = await getAssociatedTokenAddress(
                this.RDOGE_MINT,
                this.STAKING_AUTHORITY
            );

            // Add transfer instruction for rewards
            transaction.add(
                createTransferInstruction(
                    poolTokenAccount,
                    userTokenAccount,
                    this.STAKING_AUTHORITY,
                    Math.floor(rewards * (10 ** 9)) // Convert to lamports and round down
                )
            );

            // Send transaction
            const signature = await walletManager.sendTransaction(transaction);
            await this.connection.confirmTransaction(signature);

            // Reset stake timestamp
            this.stakes.set(walletAddress.toBase58(), {
                amount: stakeInfo.amount,
                timestamp: Date.now() / 1000
            });

            // Update UI
            await this.updateBalances();
            alert('Rewards claimed successfully!');

        } catch (error) {
            console.error('Error claiming rewards:', error);
            alert('Failed to claim rewards: ' + error.message);
        }
    }

    // Helper function to get stake info
    async getStakeInfo(walletAddress) {
        return this.stakes.get(walletAddress.toBase58());
    }

    // Helper function to get total staked
    async getTotalStaked() {
        let total = 0;
        for (const stake of this.stakes.values()) {
            total += stake.amount;
        }
        return total;
    }
}

// Export singleton instance
export const stakingManager = new StakingManager();
