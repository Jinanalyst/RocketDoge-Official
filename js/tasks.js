// Task Manager for RocketDoge DEX
import { walletManager } from './app.js';
import { 
    TOKEN_PROGRAM_ID, 
    createAssociatedTokenAccountInstruction, 
    getAssociatedTokenAddress,
    createMintToInstruction
} from '@solana/spl-token';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

export class TaskManager {
    constructor() {
        // RDOGE token mint address on devnet
        this.RDOGE_MINT = new PublicKey('5f6tdW7tNMpaMWuNSQ7cD9qubHBRdB4qmRuLM1oBDKzc');
        // Token authority
        this.TOKEN_AUTHORITY = new PublicKey('HYrnznkvTWvX2fRdnKq6f3b5yxDWpju7oXjGCZhgtDBN');
        
        // Constants
        this.CLAIM_AMOUNT = 1000; // 1000 RDOGE tokens
        this.DECIMALS = 9; // Token decimals
        
        this.connection = walletManager.connection;
        this.claimedAddresses = new Set(); // Track claimed addresses
    }

    async initialize() {
        await this.loadTaskData();
        this.setupEventListeners();
    }

    async loadTaskData() {
        if (!walletManager.isConnected()) return;

        try {
            const walletAddress = walletManager.publicKey;
            
            // Get user's token account
            const tokenAccount = await getAssociatedTokenAddress(
                this.RDOGE_MINT,
                walletAddress
            );

            // Get token balance
            try {
                const balance = await this.connection.getTokenAccountBalance(tokenAccount);
                document.getElementById('tokenBalance').textContent = 
                    `${balance.value.uiAmount || 0} RDOGE`;
            } catch (e) {
                console.log('Token account not found');
                document.getElementById('tokenBalance').textContent = '0 RDOGE';
            }

            // Update claim status
            const hasClaimed = this.claimedAddresses.has(walletAddress.toBase58());
            document.getElementById('claimStatus').textContent = 
                hasClaimed ? 'Claimed' : 'Not Claimed';
            document.getElementById('claimStatus').className = 
                hasClaimed ? 'text-success' : 'text-warning';
            
            // Update button state
            const claimButton = document.getElementById('claimButton');
            if (claimButton) {
                claimButton.disabled = hasClaimed;
                claimButton.textContent = hasClaimed ? 'Already Claimed' : 'Claim 1000 RDOGE';
            }

        } catch (error) {
            console.error('Error loading task data:', error);
        }
    }

    setupEventListeners() {
        // Claim button
        const claimButton = document.getElementById('claimButton');
        if (claimButton) {
            claimButton.addEventListener('click', () => this.claimTokens());
        }

        // Listen for wallet connection changes
        document.addEventListener('walletConnectionChanged', () => {
            this.loadTaskData();
        });
    }

    async claimTokens() {
        if (!walletManager.isConnected()) {
            alert('Please connect your wallet first');
            return;
        }

        const walletAddress = walletManager.publicKey;
        if (this.claimedAddresses.has(walletAddress.toBase58())) {
            alert('You have already claimed your tokens');
            return;
        }

        try {
            // Create transaction
            const transaction = new Transaction();
            
            // Get user's token account
            const tokenAccount = await getAssociatedTokenAddress(
                this.RDOGE_MINT,
                walletAddress
            );

            // Check if token account exists
            const tokenAccountInfo = await this.connection.getAccountInfo(tokenAccount);
            if (!tokenAccountInfo) {
                // Create associated token account if it doesn't exist
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        walletAddress,
                        tokenAccount,
                        walletAddress,
                        this.RDOGE_MINT
                    )
                );
            }

            // Add mint instruction
            transaction.add(
                createMintToInstruction(
                    this.RDOGE_MINT,
                    tokenAccount,
                    this.TOKEN_AUTHORITY,
                    this.CLAIM_AMOUNT * (10 ** this.DECIMALS) // Convert to raw amount
                )
            );

            // Send transaction
            const signature = await walletManager.sendTransaction(transaction);
            await this.connection.confirmTransaction(signature);

            // Update claimed status
            this.claimedAddresses.add(walletAddress.toBase58());

            // Update UI
            await this.loadTaskData();
            alert('Successfully claimed 1000 RDOGE tokens! Head to the Staking page to start earning rewards.');

        } catch (error) {
            console.error('Error claiming tokens:', error);
            alert('Failed to claim tokens: ' + error.message);
        }
    }
}

// Export singleton instance
export const taskManager = new TaskManager();

// Initialize task manager when document loads
document.addEventListener('DOMContentLoaded', async () => {
    await taskManager.initialize();
});
