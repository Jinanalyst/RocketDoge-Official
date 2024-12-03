import { config } from './config.js';

// Solana connection and program variables
let connection;
let wallet;
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
        connection = new solanaWeb3.Connection(
            solanaWeb3.clusterApiUrl('devnet'),
            'confirmed'
        );
        console.log('Connected to Solana devnet');
        return true;
    } catch (error) {
        console.error('Failed to connect to Solana:', error);
        showError('Failed to connect to Solana network. Please try again.');
        return false;
    }
}

// Check if Phantom Wallet is installed
const getProvider = () => {
    if ('phantom' in window) {
        const provider = window.phantom?.solana;

        if (provider?.isPhantom) {
            return provider;
        }
    }
    window.open('https://phantom.app/', '_blank');
};

// Connect wallet and initialize pool if needed
async function connectWallet() {
    try {
        const provider = getProvider();
        if (!provider) {
            throw new Error('No provider found');
        }

        await provider.connect();
        wallet = provider.publicKey;
        
        const walletAddress = wallet.toString();
        updateWalletUI(walletAddress);
        await updateUI();
    } catch (error) {
        console.error('Wallet connection error:', error);
        showError('Failed to connect wallet. Please make sure Phantom is installed and try again.');
    }
}

// Initialize staking pool
async function initializePool() {
    try {
        const provider = getProvider();
        if (!provider || !wallet) return;

        const transaction = new solanaWeb3.Transaction();
        
        // Create pool token account if needed
        const poolTokenAccount = await createAssociatedTokenAccountIfNeeded(
            wallet,
            new solanaWeb3.PublicKey(STAKING_TOKEN)
        );

        // Initialize pool instruction
        const initializePoolIx = await program.methods
            .initializePool(new BN(REWARD_RATE), new BN(LOCK_PERIOD))
            .accounts({
                stakingPoolAccount: await getStakingPoolAddress(),
                stakingPoolTokenAccount: poolTokenAccount,
                authority: wallet,
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
        if (!wallet || !wallet.toString()) {
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

        const provider = getProvider();
        if (!provider || !wallet) {
            showError('Please connect your wallet first');
            return;
        }

        const transaction = new solanaWeb3.Transaction();
        
        // Get necessary accounts
        const userTokenAccount = await getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(STAKING_TOKEN),
            wallet
        );
        
        const poolTokenAccount = await getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(STAKING_TOKEN),
            await getStakingPoolAddress()
        );

        const userStakeAccount = await getUserStakeAddress(wallet);

        // Create stake instruction
        const stakeIx = await program.methods
            .stakeDeposit(new BN(amount))
            .accounts({
                userAccount: userStakeAccount,
                stakingPoolAccount: await getStakingPoolAddress(),
                userTokenAccount: userTokenAccount,
                stakingPoolTokenAccount: poolTokenAccount,
                user: wallet,
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

        const provider = getProvider();
        if (!provider || !wallet) {
            showError('Please connect your wallet first');
            return;
        }

        const transaction = new solanaWeb3.Transaction();
        
        // Get necessary accounts
        const userTokenAccount = await getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(STAKING_TOKEN),
            wallet
        );
        
        const poolTokenAccount = await getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(STAKING_TOKEN),
            await getStakingPoolAddress()
        );

        const userStakeAccount = await getUserStakeAddress(wallet);

        // Create unstake instruction
        const unstakeIx = await program.methods
            .stakeWithdraw(new BN(amount))
            .accounts({
                userAccount: userStakeAccount,
                stakingPoolAccount: await getStakingPoolAddress(),
                userTokenAccount: userTokenAccount,
                stakingPoolTokenAccount: poolTokenAccount,
                user: wallet,
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
        if (!wallet) return;

        const userStakeAccount = await program.account.userAccount.fetch(
            await getUserStakeAddress(wallet)
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

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
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

// Update wallet button and display wallet address
function updateWalletUI(walletAddress = null) {
    const walletBtn = document.getElementById('walletBtn');
    const walletAddressElement = document.getElementById('walletAddress');
    const airdropBtn = document.getElementById('airdropBtn');
    
    if (walletAddress) {
        // Connected state
        walletBtn.textContent = 'Wallet Connected';
        walletBtn.disabled = true;
        walletAddressElement.style.display = 'inline-block';
        walletAddressElement.textContent = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        airdropBtn.style.display = 'inline-block';
        
        // Show staking interface
        document.querySelectorAll('.staking-interface').forEach(el => {
            el.style.display = 'block';
        });
    } else {
        // Disconnected state
        walletBtn.textContent = 'Connect Wallet';
        walletBtn.disabled = false;
        walletAddressElement.style.display = 'none';
        walletAddressElement.textContent = '';
        airdropBtn.style.display = 'none';
        
        // Hide staking interface
        document.querySelectorAll('.staking-interface').forEach(el => {
            el.style.display = 'none';
        });
    }
}

// Distribute devnet tokens
async function distributeDevnetTokens() {
    try {
        if (!wallet) {
            alert('Please connect your wallet first');
            return;
        }

        const airdropBtn = document.getElementById('airdropBtn');
        airdropBtn.disabled = true;
        airdropBtn.textContent = 'Processing...';

        // Create associated token account if needed
        const associatedTokenAddress = await createAssociatedTokenAccountIfNeeded(
            wallet,
            new solanaWeb3.PublicKey(STAKING_TOKEN)
        );

        // Request airdrop from your distribution server or contract
        // This is a placeholder - you'll need to implement the actual distribution logic
        const amount = AIRDROP_AMOUNT * Math.pow(10, TOKEN_DECIMALS);
        
        // Example transaction structure (modify according to your token distribution program)
        const transaction = new solanaWeb3.Transaction().add(
            // Add your token transfer instruction here
            solanaWeb3.Token.createTransferInstruction(
                new solanaWeb3.Token.TOKEN_PROGRAM_ID,
                new solanaWeb3.PublicKey(STAKING_TOKEN),
                associatedTokenAddress,
                wallet,
                [],
                amount
            )
        );

        const provider = getProvider();
        const signature = await provider.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signature.signature);

        alert(`Successfully airdropped ${AIRDROP_AMOUNT} devnet RDOGE tokens!`);
        updateUI();
    } catch (error) {
        console.error('Error distributing tokens:', error);
        alert('Failed to distribute tokens. Please try again.');
    } finally {
        const airdropBtn = document.getElementById('airdropBtn');
        airdropBtn.disabled = false;
        airdropBtn.textContent = 'Get Test Tokens';
    }
}

// Initialize
window.onload = async function() {
    await initializeSolana();
    const provider = getProvider();
    if (provider?.isConnected) {
        wallet = provider.publicKey;
        await updateUI();
        updateWalletUI(wallet.toString());
    }
};

// Event listeners
document.getElementById('walletBtn').addEventListener('click', connectWallet);
document.getElementById('airdropBtn').addEventListener('click', distributeDevnetTokens);
document.getElementById('stakeButton').addEventListener('click', stakeTokens);
document.getElementById('unstakeButton').addEventListener('click', unstake);
