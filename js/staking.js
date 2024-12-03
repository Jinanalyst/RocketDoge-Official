import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';

class StakingManager {
    constructor() {
        // Devnet RDOGE token mint address
        this.tokenMintAddress = new PublicKey('5f6tdW7tNMpaMWuNSQ7cD9qubHBRdB4qmRuLM1oBDKzc');
        this.stakingAuthority = new PublicKey('HYrnznkvTWvX2fRdnKq6f3b5yxDWpju7oXjGCZhgtDBN');
        this.connection = new Connection('https://api.devnet.solana.com');
        this.wallet = null;
        this.token = null;
        this.tokenAccount = null;
        this.stakingAccount = null;
        
        // Initialize UI elements
        this.initializeUI();
    }

    async initializeUI() {
        // Show staking content when wallet is connected
        document.addEventListener('walletConnected', async (e) => {
            this.wallet = e.detail;
            await this.initializeToken();
            document.getElementById('walletPrompt').style.display = 'none';
            document.getElementById('stakingContent').style.display = 'block';
            await this.updateBalances();
        });

        // Update UI when network changes
        document.getElementById('networkSelect').addEventListener('change', async (e) => {
            if (this.wallet) {
                await this.updateBalances();
            }
        });
    }

    async initializeToken() {
        try {
            this.token = new Token(
                this.connection,
                this.tokenMintAddress,
                TOKEN_PROGRAM_ID,
                this.wallet.publicKey
            );

            // Get or create associated token account
            this.tokenAccount = await this.token.getOrCreateAssociatedAccountInfo(
                this.wallet.publicKey
            );

            // Get or create staking account
            const [stakingAccount] = await PublicKey.findProgramAddress(
                [
                    Buffer.from('staking'),
                    this.wallet.publicKey.toBuffer(),
                    this.tokenMintAddress.toBuffer()
                ],
                this.stakingAuthority
            );
            this.stakingAccount = stakingAccount;

        } catch (error) {
            console.error('Error initializing token:', error);
            this.showError('Failed to initialize token account');
        }
    }

    async updateBalances() {
        try {
            if (!this.tokenAccount) return;

            // Get token balance
            const balance = await this.token.getAccountInfo(this.tokenAccount.address);
            document.getElementById('tokenBalance').textContent = 
                (balance.amount.toNumber() / Math.pow(10, balance.decimals)).toFixed(2);

            // Get staking info
            const stakingInfo = await this.connection.getAccountInfo(this.stakingAccount);
            if (stakingInfo) {
                const stakedAmount = stakingInfo.data.readBigUInt64LE(0);
                const rewards = stakingInfo.data.readBigUInt64LE(8);
                
                document.getElementById('stakedAmount').textContent = 
                    (Number(stakedAmount) / Math.pow(10, balance.decimals)).toFixed(2);
                document.getElementById('rewardsEarned').textContent = 
                    (Number(rewards) / Math.pow(10, balance.decimals)).toFixed(2);
            }

            // Get total value locked
            const tvl = await this.getTotalValueLocked();
            document.getElementById('totalValueLocked').textContent = tvl.toFixed(2);

        } catch (error) {
            console.error('Error updating balances:', error);
            this.showError('Failed to update balances');
        }
    }

    async getTotalValueLocked() {
        try {
            const stakingAccounts = await this.connection.getProgramAccounts(this.stakingAuthority);
            let total = 0;
            for (const account of stakingAccounts) {
                const stakedAmount = account.account.data.readBigUInt64LE(0);
                total += Number(stakedAmount);
            }
            return total / Math.pow(10, 9); // Assuming 9 decimals for RDOGE
        } catch (error) {
            console.error('Error getting TVL:', error);
            return 0;
        }
    }

    async handleStake() {
        try {
            const amount = document.getElementById('stakeAmount').value;
            if (!amount || amount <= 0) {
                this.showError('Please enter a valid amount');
                return;
            }

            const transaction = new Transaction();
            
            // Create stake instruction
            const stakeInstruction = Token.createApproveInstruction(
                TOKEN_PROGRAM_ID,
                this.tokenAccount.address,
                this.stakingAccount,
                this.wallet.publicKey,
                [],
                amount * Math.pow(10, 9) // Convert to raw amount
            );
            
            transaction.add(stakeInstruction);

            // Sign and send transaction
            const signature = await this.wallet.signAndSendTransaction(transaction);
            await this.connection.confirmTransaction(signature);

            this.showSuccess('Tokens staked successfully');
            await this.updateBalances();

        } catch (error) {
            console.error('Staking error:', error);
            this.showError('Failed to stake tokens');
        }
    }

    async handleClaim() {
        try {
            const transaction = new Transaction();
            
            // Create claim instruction
            const claimInstruction = Token.createRevokeInstruction(
                TOKEN_PROGRAM_ID,
                this.tokenAccount.address,
                this.wallet.publicKey,
                []
            );
            
            transaction.add(claimInstruction);

            // Sign and send transaction
            const signature = await this.wallet.signAndSendTransaction(transaction);
            await this.connection.confirmTransaction(signature);

            this.showSuccess('Rewards claimed successfully');
            await this.updateBalances();

        } catch (error) {
            console.error('Claim error:', error);
            this.showError('Failed to claim rewards');
        }
    }

    showError(message) {
        const toast = document.getElementById('errorMessage');
        toast.querySelector('.toast-body').textContent = message;
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    showSuccess(message) {
        const toast = document.getElementById('successMessage');
        toast.querySelector('.toast-body').textContent = message;
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

// Create and export staking manager instance
export const stakingManager = new StakingManager();
