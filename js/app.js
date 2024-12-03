import { walletManager } from './wallet-manager.js';
import { config } from './config.js';

// Solana connection and program variables
let connection;
const STAKING_PROGRAM_ID = config.STAKING_PROGRAM_ID;
const STAKING_TOKEN = config.STAKING_TOKEN; 
const REWARD_RATE = config.REWARD_RATE; 
const LOCK_PERIOD = config.LOCK_PERIOD; 
const TOKEN_DECIMALS = config.TOKEN_DECIMALS;

// Token ratio configuration (5:1 devnet to mainnet)
const DEVNET_RATIO = config.DEVNET_RATIO;

// Token distribution constants
const AIRDROP_AMOUNT = config.AIRDROP_AMOUNT; 

// Convert devnet amount to mainnet equivalent
function convertToMainnetAmount(devnetAmount) {
    return devnetAmount / DEVNET_RATIO;
}

// Convert mainnet amount to devnet equivalent
function convertToDevnetAmount(mainnetAmount) {
    return mainnetAmount * DEVNET_RATIO;
}

// Format token amount with proper ratio and decimals
function formatTokenAmount(devnetAmount) {
    const mainnetEquivalent = convertToMainnetAmount(devnetAmount);
    return {
        devnet: devnetAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        mainnet: mainnetEquivalent.toLocaleString(undefined, { maximumFractionDigits: 2 })
    };
}

// Initialize Solana connection to devnet
async function initializeSolana() {
    try {
        // Get selected network from dropdown or use default
        const networkSelect = document.getElementById('networkSelect');
        const selectedNetwork = networkSelect ? networkSelect.value : config.DEFAULT_NETWORK;
        
        connection = new solanaWeb3.Connection(
            config.NETWORKS[selectedNetwork].url,
            'confirmed'
        );
        console.log(`Connected to Solana ${selectedNetwork}`);
        
        // Show/hide devnet features
        const isDevnet = selectedNetwork === 'devnet';
        const airdropBtn = document.getElementById('airdropBtn');
        if (airdropBtn) {
            airdropBtn.style.display = isDevnet ? 'block' : 'none';
        }
        
        // Update UI with network info
        const networkInfo = document.getElementById('networkInfo');
        if (networkInfo) {
            networkInfo.textContent = `Connected to ${config.NETWORKS[selectedNetwork].name}`;
        }
        
        return true;
    } catch (error) {
        console.error('Failed to connect to Solana:', error);
        showError('Failed to connect to Solana network');
        return false;
    }
}

// Initialize UI components
function initializeUI() {
    // Network selector
    const networkSelect = document.getElementById('networkSelect');
    if (networkSelect) {
        networkSelect.value = walletManager.getNetwork();
        networkSelect.addEventListener('change', async (e) => {
            try {
                await walletManager.switchNetwork(e.target.value);
                updateUI();
            } catch (error) {
                console.error('Failed to switch network:', error);
                showError('Failed to switch network. Please try again.');
                // Revert selection
                networkSelect.value = walletManager.getNetwork();
            }
        });
    }

    // Update UI when wallet connects/disconnects
    walletManager.onWalletConnect(() => {
        updateWalletUI();
        updateUI();
    });

    walletManager.onWalletDisconnect(() => {
        updateWalletUI();
        updateUI();
    });
}

// Update wallet-specific UI elements
function updateWalletUI() {
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const networkInfo = document.getElementById('networkInfo');
    
    if (walletManager.isConnected()) {
        const walletAddress = walletManager.getShortAddress();
        connectWalletBtn.innerHTML = `<span class="wallet-address">${walletAddress}</span>`;
        connectWalletBtn.classList.remove('btn-primary');
        connectWalletBtn.classList.add('btn-success');
        
        // Show wallet-dependent UI elements
        document.querySelectorAll('.wallet-dependent').forEach(el => {
            el.classList.remove('disabled');
        });
    } else {
        connectWalletBtn.textContent = 'Connect Wallet';
        connectWalletBtn.classList.remove('btn-success');
        connectWalletBtn.classList.add('btn-primary');
        
        // Hide wallet-dependent UI elements
        document.querySelectorAll('.wallet-dependent').forEach(el => {
            el.classList.add('disabled');
        });
    }
    
    if (networkInfo) {
        const network = walletManager.getNetwork();
        networkInfo.textContent = network.charAt(0).toUpperCase() + network.slice(1);
    }
}

// Show error message
function showError(message, duration = 5000) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, duration);
    }
}

// Connect wallet and initialize pool if needed
async function connectWallet() {
    try {
        const response = await walletManager.connect();
        const walletAddress = response.publicKey.toString();
        
        updateWalletUI(walletAddress);
        await updateUI();
        
        // Initialize pool after successful connection
        await initializePool();
        
        showSuccess('Wallet connected successfully!');
        return true;
    } catch (error) {
        console.error('Wallet connection error:', error);
        showError('Failed to connect wallet. Please make sure Phantom is installed and try again.');
        return false;
    }
}

// Initialize staking pool
async function initializePool() {
    try {
        const provider = walletManager.getProvider();
        if (!provider) return;

        const transaction = new solanaWeb3.Transaction();
        
        // Create pool token account if needed
        const poolTokenAccount = await createAssociatedTokenAccountIfNeeded(
            provider,
            new solanaWeb3.PublicKey(STAKING_TOKEN)
        );

        // Initialize pool instruction
        const initializePoolIx = await program.methods
            .initializePool(new BN(REWARD_RATE), new BN(LOCK_PERIOD))
            .accounts({
                stakingPoolAccount: await getStakingPoolAddress(),
                stakingPoolTokenAccount: poolTokenAccount,
                authority: provider.publicKey,
                systemProgram: solanaWeb3.SystemProgram.programId,
            })
            .instruction();

        transaction.add(initializePoolIx);

        // Send and confirm transaction
        const signature = await provider.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signature.signature);
        console.log('Pool initialized');
    } catch (error) {
        console.error('Error initializing pool:', error);
        showError('Failed to initialize staking pool');
    }
}

// Stake tokens
async function stakeTokens() {
    try {
        if (!walletManager.isConnected()) {
            throw new Error('Wallet not connected');
        }

        const amount = document.getElementById('stakeAmount').value;
        if (!amount || isNaN(amount) || amount <= 0) {
            throw new Error('Invalid stake amount');
        }

        // Add loading state
        const stakeButton = document.getElementById('stakeButton');
        stakeButton.disabled = true;
        stakeButton.innerHTML = 'Staking...';

        const provider = walletManager.getProvider();
        if (!provider) {
            showError('Please connect your wallet first');
            return;
        }

        const transaction = new solanaWeb3.Transaction();
        
        // Get necessary accounts
        const userTokenAccount = await getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(STAKING_TOKEN),
            provider.publicKey
        );
        
        const poolTokenAccount = await getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(STAKING_TOKEN),
            await getStakingPoolAddress()
        );

        const userStakeAccount = await getUserStakeAddress(provider.publicKey);

        // Create stake instruction
        const stakeIx = await program.methods
            .stakeDeposit(new BN(amount))
            .accounts({
                userAccount: userStakeAccount,
                stakingPoolAccount: await getStakingPoolAddress(),
                userTokenAccount: userTokenAccount,
                stakingPoolTokenAccount: poolTokenAccount,
                user: provider.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: solanaWeb3.SystemProgram.programId,
            })
            .instruction();

        transaction.add(stakeIx);

        // Send and confirm transaction
        const signature = await provider.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signature.signature);
        
        console.log('Stake successful');
        await updateUI();
        showSuccess('Tokens staked successfully!');
    } catch (error) {
        console.error('Staking error:', error);
        showError(error.message || 'Failed to stake tokens. Please try again.');
    } finally {
        // Reset button state
        const stakeButton = document.getElementById('stakeButton');
        stakeButton.disabled = false;
        stakeButton.innerHTML = 'Stake';
    }
}

// Unstake tokens
async function unstake() {
    try {
        const amount = document.getElementById('unstakeAmount').value;
        if (!amount || amount <= 0) {
            showError('Please enter a valid amount');
            return;
        }

        const provider = walletManager.getProvider();
        if (!provider) {
            showError('Please connect your wallet first');
            return;
        }

        const transaction = new solanaWeb3.Transaction();
        
        // Get necessary accounts
        const userTokenAccount = await getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(STAKING_TOKEN),
            provider.publicKey
        );
        
        const poolTokenAccount = await getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(STAKING_TOKEN),
            await getStakingPoolAddress()
        );

        const userStakeAccount = await getUserStakeAddress(provider.publicKey);

        // Create unstake instruction
        const unstakeIx = await program.methods
            .stakeWithdraw(new BN(amount))
            .accounts({
                userAccount: userStakeAccount,
                stakingPoolAccount: await getStakingPoolAddress(),
                userTokenAccount: userTokenAccount,
                stakingPoolTokenAccount: poolTokenAccount,
                user: provider.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .instruction();

        transaction.add(unstakeIx);

        // Send and confirm transaction
        const signature = await provider.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signature.signature);
        
        console.log('Unstake successful');
        await updateUI();
    } catch (error) {
        console.error('Error unstaking tokens:', error);
        showError('Failed to unstake tokens: ' + error.message);
    }
}

// Helper function to get user stake account address
async function getUserStakeAddress(walletAddress) {
    return await solanaWeb3.PublicKey.findProgramAddress(
        [
            Buffer.from('user-stake'),
            walletAddress.toBuffer()
        ],
        new solanaWeb3.PublicKey(STAKING_PROGRAM_ID)
    );
}

// Helper function to get staking pool address
async function getStakingPoolAddress() {
    return await solanaWeb3.PublicKey.findProgramAddress(
        [Buffer.from('staking-pool')],
        new solanaWeb3.PublicKey(STAKING_PROGRAM_ID)
    );
}

// Update UI with current data
async function updateUI() {
    try {
        if (!walletManager.isConnected()) return;

        const userStakeAccount = await program.account.userAccount.fetch(
            await getUserStakeAddress(walletManager.getProvider().publicKey)
        );

        const poolAccount = await program.account.stakingPoolAccount.fetch(
            await getStakingPoolAddress()
        );

        // Update staked amount
        document.getElementById('stakedAmount').textContent = 
            (userStakeAccount.balance / Math.pow(10, TOKEN_DECIMALS)).toFixed(2);

        // Update rewards
        document.getElementById('rewards').textContent = 
            (userStakeAccount.rewardsClaimed / Math.pow(10, TOKEN_DECIMALS)).toFixed(2);

        // Update total staked
        document.getElementById('totalStaked').textContent = 
            (poolAccount.totalStaked / Math.pow(10, TOKEN_DECIMALS)).toFixed(2);

        // Update APY
        document.getElementById('currentAPY').textContent = 
            (poolAccount.rewardRate / 100).toFixed(2) + '%';

        // Update lock period
        document.getElementById('lockPeriod').textContent = 
            (poolAccount.lockPeriod / (60 * 60 * 24)).toFixed(0) + ' days';
    } catch (error) {
        console.error('Error updating UI:', error);
    }
}

// Add success notification function
function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-success';
    notification.role = 'alert';
    notification.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(notification, container.firstChild);
    
    setTimeout(() => notification.remove(), 5000);
}

// Initialize app
async function initialize() {
    try {
        await walletManager.initialize();
        initializeUI();
        updateWalletUI();
        await initializeSolana();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Failed to initialize app. Please refresh the page.');
    }
}

// Export necessary functions and objects
export {
    walletManager,
    initialize,
    updateUI,
    showError
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);

// Event listeners
document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);
document.getElementById('airdropBtn').addEventListener('click', distributeDevnetTokens);
document.getElementById('stakeButton').addEventListener('click', stakeTokens);
document.getElementById('unstakeButton').addEventListener('click', unstake);

// Distribute devnet tokens
async function distributeDevnetTokens() {
    try {
        if (!walletManager.isConnected()) {
            showError('Please connect your wallet first');
            return;
        }

        const networkSelect = document.getElementById('networkSelect');
        const selectedNetwork = networkSelect ? networkSelect.value : config.DEFAULT_NETWORK;
        
        if (selectedNetwork !== 'devnet') {
            showError('Airdrop is only available on devnet');
            return;
        }

        showSuccess('Requesting devnet tokens...');
        
        // Request SOL airdrop first
        const signature = await connection.requestAirdrop(
            walletManager.getProvider().publicKey,
            solanaWeb3.LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(signature);
        
        // Create token account if it doesn't exist
        const tokenAccount = await createTokenAccountIfNeeded();
        
        // Mint devnet tokens
        if (tokenAccount) {
            await mintDevnetTokens(tokenAccount, config.AIRDROP_AMOUNT);
            showSuccess('Successfully received devnet tokens!');
            await updateUI();
        }
    } catch (error) {
        console.error('Failed to distribute devnet tokens:', error);
        showError('Failed to distribute devnet tokens');
    }
}

// Create token account if needed
async function createTokenAccountIfNeeded() {
    try {
        const tokenMint = new solanaWeb3.PublicKey(config.STAKING_TOKEN);
        const tokenAccounts = await connection.getTokenAccountsByOwner(
            walletManager.getProvider().publicKey,
            { mint: tokenMint }
        );
        
        if (tokenAccounts.value.length > 0) {
            return tokenAccounts.value[0].pubkey;
        }
        
        // Create new token account
        const transaction = new solanaWeb3.Transaction();
        transaction.add(
            splToken.Token.createAssociatedTokenAccountInstruction(
                tokenMint,
                walletManager.getProvider().publicKey,
                walletManager.getProvider().publicKey
            )
        );
        
        const signature = await walletManager.getProvider().signAndSendTransaction(transaction);
        await connection.confirmTransaction(signature);
        
        return await splToken.Token.getAssociatedTokenAddress(
            tokenMint,
            walletManager.getProvider().publicKey
        );
    } catch (error) {
        console.error('Failed to create token account:', error);
        throw error;
    }
}

// Mint devnet tokens
async function mintDevnetTokens(tokenAccount, amount) {
    try {
        const transaction = new solanaWeb3.Transaction();
        transaction.add(
            splToken.Token.createMintToInstruction(
                new solanaWeb3.PublicKey(config.STAKING_TOKEN),
                tokenAccount,
                walletManager.getProvider().publicKey,
                [],
                amount
            )
        );
        
        const signature = await walletManager.getProvider().signAndSendTransaction(transaction);
        await connection.confirmTransaction(signature);
    } catch (error) {
        console.error('Failed to mint devnet tokens:', error);
        throw error;
    }
}
