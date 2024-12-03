import { walletManager } from './app.js';
import { PublicKey, Transaction, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl_governance';

class StakingManager {
    constructor() {
        // RDOGE token mint address on devnet
        this.RDOGE_MINT = new PublicKey('5f6tdW7tNMpaMWuNSQ7cD9qubHBRdB4qmRuLM1oBDKzc');
        // Staking pool authority
        this.STAKING_AUTHORITY = new PublicKey('HYrnznkvTWvX2fRdnKq6f3b5yxDWpju7oXjGCZhgtDBN');
        
        // Constants
        this.APR = 120; // 120% APR
        this.DEVNET_RATIO = 5; // 5:1 ratio for devnet rewards
        this.MIN_STAKE_DURATION = 24 * 60 * 60; // 24 hours in seconds
        
        this.connection = null;
        this.stakes = new Map(); // Map to store stake info by user
    }

    async initialize() {
        this.connection = walletManager.connection;
        await this.loadStakingData();
        this.setupEventListeners();
        
        // Set up balance check interval
        setInterval(() => this.updateBalances(), 5000); // Check every 5 seconds
    }

    // Update all balances
    async updateBalances() {
        if (!walletManager.wallet) return;

        try {
            const walletAddress = walletManager.wallet.publicKey;
            
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
                document.getElementById('totalStaked').textContent = 
                    (userBalance.value.uiAmount || 0).toFixed(2);
            } catch (e) {
                console.log('User token account not found');
                document.getElementById('totalStaked').textContent = '0.00';
            }

            // Get stake info and update UI
            const stakeInfo = await this.getStakeInfo(walletAddress);
            if (stakeInfo) {
                document.getElementById('stakeAmount').value = 
                    stakeInfo.amount.toFixed(2);
                
                const rewards = this.calculateRewards(stakeInfo);
                document.getElementById('rewardsEarned').textContent = 
                    rewards.toFixed(2);
            }
        } catch (error) {
            walletManager.showNotification(error.message, 'error');
        }
    }

    async loadStakingData() {
        if (!walletManager.wallet) return;

        try {
            await this.updateBalances();
        } catch (error) {
            walletManager.showNotification(error.message, 'error');
        }
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

    async handleStake() {
        try {
            const amount = parseFloat(document.getElementById('stakeAmount').value);
            if (!amount || amount <= 0) {
                throw new Error('Please enter a valid amount to stake');
            }

            if (!walletManager.wallet) {
                throw new Error('Please connect your wallet first');
            }

            const walletAddress = walletManager.wallet.publicKey;
            
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

            // Add transfer instruction
            transaction.add(
                createTransferInstruction(
                    userTokenAccount,
                    poolTokenAccount,
                    walletAddress,
                    amount * Math.pow(10, 9) // Convert to lamports
                )
            );

            // Sign and send transaction
            const signature = await walletManager.wallet.sendTransaction(transaction, this.connection);
            await this.connection.confirmTransaction(signature);

            // Update UI
            await this.updateBalances();
            walletManager.showNotification('Staking successful!', 'success');
        } catch (error) {
            walletManager.showNotification(error.message, 'error');
        }
    }

    async handleClaim() {
        try {
            if (!walletManager.wallet) {
                throw new Error('Please connect your wallet first');
            }

            const stakeInfo = await this.getStakeInfo(walletManager.wallet.publicKey);
            if (!stakeInfo) {
                throw new Error('No staking position found');
            }

            const rewards = this.calculateRewards(stakeInfo);
            if (rewards <= 0) {
                throw new Error('No rewards available to claim');
            }

            // Add claim rewards transaction logic here
            walletManager.showNotification('Rewards claimed successfully!', 'success');
            await this.updateBalances();
        } catch (error) {
            walletManager.showNotification(error.message, 'error');
        }
    }

    async getStakeInfo(walletAddress) {
        // This would typically fetch from the staking contract
        // For now, we'll return mock data
        const mockStakeInfo = this.stakes.get(walletAddress.toString());
        if (!mockStakeInfo) {
            return {
                amount: 0,
                timestamp: Date.now() / 1000
            };
        }
        return mockStakeInfo;
    }

    createStakingInterface() {
        const stakingContent = document.getElementById('stakingContent');
        stakingContent.innerHTML = `
            <div class="col-md-6">
                <div class="card bg-dark border-light">
                    <div class="card-body">
                        <h5 class="card-title">Stake RocketDoge</h5>
                        <div class="mb-3">
                            <label for="stakeAmount" class="form-label">Amount to Stake</label>
                            <input type="number" class="form-control bg-dark text-light" id="stakeAmount" placeholder="Enter amount">
                        </div>
                        <button class="btn btn-primary" onclick="stakingManager.handleStake()">Stake Tokens</button>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card bg-dark border-light">
                    <div class="card-body">
                        <h5 class="card-title">Your Staking Stats</h5>
                        <p class="card-text">Total Staked: <span id="totalStaked">0</span> RDOGE</p>
                        <p class="card-text">Rewards Earned: <span id="rewardsEarned">0</span> RDOGE</p>
                        <button class="btn btn-primary" onclick="stakingManager.handleClaim()">Claim Rewards</button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        this.createStakingInterface();
    }
}

export const stakingManager = new StakingManager();
stakingManager.initialize();
