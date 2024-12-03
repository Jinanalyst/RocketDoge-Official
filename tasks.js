import { tasksConfig } from './config/tasks.config.js';

// Constants
const PROGRAM_ID = tasksConfig.PROGRAM_ID;
const TOKEN_DECIMALS = tasksConfig.TOKEN_DECIMALS;
const DEX_PAIR_ADDRESS = tasksConfig.DEX_PAIR_ADDRESS;
const MIN_TRADE_AMOUNT = tasksConfig.MIN_TRADE_AMOUNT; // in SOL
const TRON_USDT_CONTRACT = tasksConfig.TRON_USDT_CONTRACT;
const MIN_DEPOSIT_AMOUNT = tasksConfig.MIN_DEPOSIT_AMOUNT; // in USDT

// Wallet state
let wallet = null;
let connection = null;
let walletBalance = 0;

// Social media verification endpoints
const SOCIAL_VERIFY_ENDPOINTS = tasksConfig.SOCIAL_VERIFY_ENDPOINTS;

// Task status tracking
const taskStatus = tasksConfig.TASK_STATUS;

// Reward amounts in ROCKET tokens
const taskRewards = tasksConfig.TASK_REWARDS;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    await initializeWallet();
    setupEventListeners();
    checkWalletConnection();
});

// Setup all event listeners
function setupEventListeners() {
    // Wallet connection buttons
    const walletBtn = document.getElementById('walletBtn');
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    
    if (walletBtn) {
        walletBtn.addEventListener('click', connectWallet);
    }
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', connectWallet);
    }

    // Handle Phantom wallet events
    window.solana?.on('connect', handleWalletConnect);
    window.solana?.on('disconnect', handleWalletDisconnect);
    window.solana?.on('accountChanged', handleAccountChanged);
}

// Check if wallet is already connected
async function checkWalletConnection() {
    try {
        const provider = getProvider();
        if (provider && provider.isConnected) {
            const publicKey = provider.publicKey.toString();
            wallet = provider;
            
            // Update UI
            updateWalletDisplay(publicKey);
            showTaskSection();
            await updateWalletBalance();
        }
    } catch (error) {
        console.error('Error checking wallet connection:', error);
    }
}

// Handle wallet connect event
async function handleWalletConnect(publicKey) {
    if (publicKey) {
        updateWalletDisplay(publicKey.toString());
        showTaskSection();
        await updateWalletBalance();
        showSuccess('Wallet connected successfully!');
    }
}

// Handle wallet disconnect event
function handleWalletDisconnect() {
    wallet = null;
    updateWalletDisplay(null);
    hideTaskSection();
    showSuccess('Wallet disconnected');
}

// Handle account change event
async function handleAccountChanged(publicKey) {
    if (publicKey) {
        updateWalletDisplay(publicKey.toString());
        await updateWalletBalance();
    } else {
        handleWalletDisconnect();
    }
}

// Update wallet display
function updateWalletDisplay(publicKey) {
    const walletBtn = document.getElementById('walletBtn');
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const walletInfo = document.querySelector('.wallet-info');
    const walletAddressElem = document.getElementById('walletAddress');

    if (publicKey) {
        // Connected state
        if (walletBtn) {
            walletBtn.textContent = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
        }
        if (connectWalletBtn) {
            connectWalletBtn.style.display = 'none';
        }
        if (walletInfo) {
            walletInfo.style.display = 'block';
        }
        if (walletAddressElem) {
            walletAddressElem.textContent = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
        }
    } else {
        // Disconnected state
        if (walletBtn) {
            walletBtn.textContent = 'Connect Wallet';
        }
        if (connectWalletBtn) {
            connectWalletBtn.style.display = 'block';
            connectWalletBtn.textContent = 'Connect Wallet';
        }
        if (walletInfo) {
            walletInfo.style.display = 'none';
        }
        if (walletAddressElem) {
            walletAddressElem.textContent = '';
        }
    }
}

async function initializeWallet() {
    try {
        connection = new solanaWeb3.Connection(
            solanaWeb3.clusterApiUrl('devnet'),
            'confirmed'
        );
        
        // Check if Phantom Wallet is installed
        if (!window.solana || !window.solana.isPhantom) {
            throw new Error(tasksConfig.ERROR_MESSAGES.NO_WALLET);
        }

        console.log('Solana connection initialized');
        return true;
    } catch (error) {
        console.error('Wallet initialization error:', error);
        showError(error.message || tasksConfig.ERROR_MESSAGES.CONNECTION_ERROR);
        return false;
    }
}

// Get Phantom wallet provider
function getProvider() {
    if ('phantom' in window) {
        const provider = window.phantom?.solana;
        if (provider?.isPhantom) {
            return provider;
        }
    }
    return null;
}

async function connectWallet() {
    try {
        const provider = getProvider();
        if (!provider) {
            throw new Error('Please install Phantom wallet to continue');
        }

        // Update button states to loading
        const walletBtn = document.getElementById('walletBtn');
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        const walletInfo = document.querySelector('.wallet-info');
        
        if (walletBtn) {
            walletBtn.disabled = true;
            walletBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Connecting...';
        }
        if (connectWalletBtn) {
            connectWalletBtn.disabled = true;
            connectWalletBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Connecting...';
        }

        const response = await provider.connect();
        wallet = provider;
        const walletAddress = response.publicKey.toString();

        // Update wallet display
        const walletAddressElem = document.getElementById('walletAddress');
        if (walletInfo) walletInfo.style.display = 'block';
        if (walletAddressElem) walletAddressElem.textContent = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        
        // Update buttons
        if (walletBtn) {
            walletBtn.disabled = false;
            walletBtn.textContent = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        }
        if (connectWalletBtn) {
            connectWalletBtn.style.display = 'none';
        }

        // Show task section with animation
        showTaskSection();

        // Enable verification buttons
        document.querySelectorAll('.verify-task-btn').forEach(btn => {
            btn.disabled = false;
        });

        // Update wallet balance
        await updateWalletBalance();
        
        showSuccess('Wallet connected successfully!');
        return true;
    } catch (err) {
        console.error('Failed to connect wallet:', err);
        showError('Failed to connect wallet. Please try again.');
        
        // Reset button states
        const walletBtn = document.getElementById('walletBtn');
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        
        if (walletBtn) {
            walletBtn.disabled = false;
            walletBtn.textContent = 'Connect Wallet';
        }
        if (connectWalletBtn) {
            connectWalletBtn.disabled = false;
            connectWalletBtn.textContent = 'Connect Wallet';
        }

        // Hide task section
        hideTaskSection();
        
        return false;
    }
}

// Verify task completion
async function verifyTask(taskId) {
    try {
        if (!wallet) {
            throw new Error(tasksConfig.ERROR_MESSAGES.NO_WALLET);
        }

        const verifyButton = document.querySelector(`#verifyTask${taskId}`);
        verifyButton.disabled = true;
        verifyButton.innerHTML = 'Verifying...';

        let isValid = false;
        let message = '';

        switch(taskId) {
            case 1: // Social Media
                const twitter = document.getElementById('twitterUsername').value;
                const telegram = document.getElementById('telegramUsername').value;
                if (!twitter || !telegram) {
                    throw new Error('Please enter both Twitter and Telegram usernames');
                }
                const result = await verifySocialMedia({ twitter, telegram });
                isValid = result.isValid;
                message = result.message;
                break;

            case 2: // Blofin Signup
                const blofinUsername = document.getElementById('blofinUsername').value;
                if (!blofinUsername) {
                    throw new Error('Please enter your Blofin username');
                }
                const blofinResult = await verifyBlofin(blofinUsername);
                isValid = blofinResult.isValid;
                message = blofinResult.message;
                break;

            // Add other cases...
        }

        if (isValid) {
            await distributeReward(taskId);
            showSuccess(message || 'Task verified successfully!');
        } else {
            throw new Error(message || tasksConfig.ERROR_MESSAGES.VERIFICATION_FAILED);
        }

    } catch (error) {
        console.error('Task verification error:', error);
        showError(error.message || tasksConfig.ERROR_MESSAGES.VERIFICATION_FAILED);
    } finally {
        const verifyButton = document.querySelector(`#verifyTask${taskId}`);
        verifyButton.disabled = false;
        verifyButton.innerHTML = 'Verify';
    }
}

// Distribute reward for completed task
async function distributeReward(taskId) {
    try {
        if (!wallet) {
            throw new Error(tasksConfig.ERROR_MESSAGES.NO_WALLET);
        }

        const rewardAmount = tasksConfig.TASK_REWARDS[taskId];
        if (!rewardAmount) {
            throw new Error('Invalid task ID');
        }

        // Add loading state
        const rewardButton = document.querySelector(`#claimReward${taskId}`);
        if (rewardButton) {
            rewardButton.disabled = true;
            rewardButton.innerHTML = 'Claiming...';
        }

        // Implement reward distribution logic here
        // This is a placeholder for the actual implementation
        await new Promise(resolve => setTimeout(resolve, 2000));

        showSuccess(`Claimed ${rewardAmount} ROCKET tokens successfully!`);
        updateTaskStatus(taskId, true, 'Task completed and reward claimed');
        
    } catch (error) {
        console.error('Reward distribution error:', error);
        showError(error.message || tasksConfig.ERROR_MESSAGES.REWARD_FAILED);
    } finally {
        const rewardButton = document.querySelector(`#claimReward${taskId}`);
        if (rewardButton) {
            rewardButton.disabled = false;
            rewardButton.innerHTML = 'Claim Reward';
        }
    }
}

// Show success notification
function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-success';
    notification.role = 'alert';
    notification.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(notification, container.firstChild);
    
    setTimeout(() => notification.remove(), 5000);
}

// Show error notification
function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-danger';
    notification.role = 'alert';
    notification.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(notification, container.firstChild);
    
    setTimeout(() => notification.remove(), 5000);
}

// Utility function to validate TRON address
function isTronAddress(address) {
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
}

// Utility function to check minimum deposit amount (100 USDT)
function isValidDepositAmount(amount) {
    return parseFloat(amount) >= 100;
}

// Verification functions for each task
async function verifySocialMedia(usernames) {
    try {
        if (!usernames || typeof usernames !== 'object') {
            console.error('Invalid username input');
            return { isValid: false, message: 'Invalid username input' };
        }

        const platforms = Object.values(usernames);
        
        // Check if both Twitter and Telegram usernames are provided
        if (platforms.length !== 2) {
            console.error('Both Twitter and Telegram usernames are required');
            return { isValid: false, message: 'Both Twitter and Telegram usernames are required' };
        }

        const [twitter, telegram] = platforms;

        // Twitter username validation
        if (!twitter || !/^[A-Za-z0-9_]{4,15}$/.test(twitter)) {
            console.error('Invalid Twitter username format');
            return { isValid: false, message: 'Invalid Twitter username format' };
        }

        // Telegram username validation
        if (!telegram || !/^[A-Za-z0-9_]{5,32}$/.test(telegram)) {
            console.error('Invalid Telegram username format');
            return { isValid: false, message: 'Invalid Telegram username format' };
        }

        // In production, implement actual API calls to verify follows
        return { isValid: true, message: 'Social media verification successful' };
    } catch (error) {
        console.error('Social media verification failed:', error);
        return { isValid: false, message: 'Social media verification failed' };
    }
}

async function verifyBlofin(username) {
    try {
        // Basic username validation
        if (!username || username.length < 3 || username.length > 30) {
            console.error('Invalid username length');
            return { isValid: false, message: 'Invalid username length' };
        }

        // Username format validation
        if (!/^[A-Za-z0-9_-]+$/.test(username)) {
            console.error('Invalid username format');
            return { isValid: false, message: 'Invalid username format' };
        }

        // In production, implement Blofin API verification
        // For now, just check if the username meets the requirements
        return { isValid: true, message: 'Blofin verification successful' };
    } catch (error) {
        console.error('Blofin verification failed:', error);
        return { isValid: false, message: 'Blofin verification failed' };
    }
}

async function verifyOKX(username) {
    try {
        // Basic username validation
        if (!username || username.length < 3 || username.length > 30) {
            console.error('Invalid username length');
            return { isValid: false, message: 'Invalid username length' };
        }

        // Username format validation
        if (!/^[A-Za-z0-9_-]+$/.test(username)) {
            console.error('Invalid username format');
            return { isValid: false, message: 'Invalid username format' };
        }

        // In production, implement OKX API verification
        // For now, just check if the username meets the requirements
        return { isValid: true, message: 'OKX verification successful' };
    } catch (error) {
        console.error('OKX verification failed:', error);
        return { isValid: false, message: 'OKX verification failed' };
    }
}

async function verifyBlofinDeposit(txId) {
    try {
        // Check if transaction ID format is valid for TRON
        if (!txId || txId.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(txId)) {
            console.error('Invalid Blofin TRON transaction ID format');
            return { isValid: false, message: 'Invalid Blofin TRON transaction ID format' };
        }

        // Fetch transaction details from TRON network
        const tronApiUrl = `https://api.trongrid.io/v1/transactions/${txId}`;
        try {
            const response = await fetch(tronApiUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch transaction data');
            }

            const data = await response.json();

            if (!data || !data.data || data.data.length === 0) {
                console.error('Transaction not found on TRON network');
                return { isValid: false, message: 'Transaction not found on TRON network' };
            }

            const tx = data.data[0];

            // Verify it's a TRC20 (USDT) transaction
            if (tx.contract_type !== 'TriggerSmartContract' || 
                tx.contract_address !== TRON_USDT_CONTRACT) {
                console.error('Not a USDT transaction');
                return { isValid: false, message: 'Not a USDT transaction' };
            }

            // Verify amount is at least 100 USDT
            const amount = parseInt(tx.value) / 1e6; // USDT has 6 decimals
            if (amount < MIN_DEPOSIT_AMOUNT) {
                console.error('Deposit amount less than 100 USDT');
                return { isValid: false, message: 'Deposit amount less than 100 USDT' };
            }

            // Verify transaction status
            if (!tx.confirmed || tx.ret[0].contractRet !== 'SUCCESS') {
                console.error('Transaction not confirmed or failed');
                return { isValid: false, message: 'Transaction not confirmed or failed' };
            }

            return { isValid: true, message: 'Blofin deposit verification successful' };
        } catch (error) {
            console.error('Error verifying TRON transaction:', error);
            return { isValid: false, message: 'Error verifying TRON transaction' };
        }
    } catch (error) {
        console.error('Blofin deposit verification failed:', error);
        return { isValid: false, message: 'Blofin deposit verification failed' };
    }
}

async function verifyOKXDeposit(txInfo) {
    try {
        // Parse the transaction info (format: txId:amount:currency)
        const [txId, amount, currency] = txInfo.split(':');

        // Basic validation
        if (!txId || !amount || !currency) {
            console.error('Invalid OKX transaction info format');
            return { isValid: false, message: 'Invalid OKX transaction info format' };
        }

        // Verify it's a USDT transaction
        if (currency.toUpperCase() !== 'USDT') {
            console.error('Not a USDT transaction');
            return { isValid: false, message: 'Not a USDT transaction' };
        }

        // Verify amount format and minimum
        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount) || depositAmount < MIN_DEPOSIT_AMOUNT) {
            console.error('Invalid or insufficient deposit amount');
            return { isValid: false, message: 'Invalid or insufficient deposit amount' };
        }

        // Verify transaction ID format (OKX specific)
        if (!/^[0-9a-zA-Z]{24,}$/.test(txId)) {
            console.error('Invalid OKX transaction ID format');
            return { isValid: false, message: 'Invalid OKX transaction ID format' };
        }

        // In production, implement OKX API verification
        return { isValid: true, message: 'OKX deposit verification successful' };
    } catch (error) {
        console.error('OKX deposit verification failed:', error);
        return { isValid: false, message: 'OKX deposit verification failed' };
    }
}

async function verifyDEXTrade(signature) {
    try {
        // Validate signature format
        if (!signature || !/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{87,88}$/.test(signature)) {
            console.error('Invalid Solana transaction signature format');
            return { isValid: false, message: 'Invalid Solana transaction signature format' };
        }

        // Fetch transaction details
        const transaction = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!transaction) {
            console.error('Transaction not found');
            return { isValid: false, message: 'Transaction not found' };
        }

        // Verify it's a trade on the correct DEX pair
        const isPairTransaction = transaction.transaction.message.accountKeys.some(
            key => key.toBase58() === DEX_PAIR_ADDRESS
        );

        if (!isPairTransaction) {
            console.error('Transaction is not for the correct DEX pair');
            return { isValid: false, message: 'Transaction is not for the correct DEX pair' };
        }

        // Verify transaction success
        if (transaction.meta.err) {
            console.error('Transaction failed');
            return { isValid: false, message: 'Transaction failed' };
        }

        // Verify trade amount
        const preBalances = transaction.meta.preBalances;
        const postBalances = transaction.meta.postBalances;
        const tradeAmount = Math.abs(preBalances[0] - postBalances[0]) / solanaWeb3.LAMPORTS_PER_SOL;

        if (tradeAmount < MIN_TRADE_AMOUNT) {
            console.error('Trade amount less than minimum required');
            return { isValid: false, message: 'Trade amount less than minimum required' };
        }

        // Verify transaction timestamp (optional)
        if (transaction.blockTime) {
            const txTime = new Date(transaction.blockTime * 1000);
            const now = new Date();
            const hoursSinceTransaction = (now - txTime) / (1000 * 60 * 60);
            
            if (hoursSinceTransaction > 24) {
                console.error('Transaction is too old');
                return { isValid: false, message: 'Transaction is too old' };
            }
        }

        return { isValid: true, message: 'DEX trade verification successful' };
    } catch (error) {
        console.error('DEX trade verification failed:', error);
        return { isValid: false, message: 'DEX trade verification failed' };
    }
}

// Update the task verification UI feedback
function updateTaskStatus(taskId, isValid, message) {
    const statusElement = document.getElementById(`task${taskId}-status`);
    if (isValid) {
        statusElement.textContent = 'Task completed! Rewards will be distributed shortly.';
        statusElement.className = 'task-status status-completed';
    } else {
        statusElement.textContent = message || 'Verification failed. Please try again.';
        statusElement.className = 'task-status status-pending';
    }
}

// Update wallet button state
function updateWalletButton(connected) {
    const button = document.getElementById('connectWalletBtn');
    button.disabled = false;
    
    if (connected) {
        button.innerHTML = 'Wallet Connected';
        button.classList.remove('btn-primary');
        button.classList.add('btn-success');
    } else {
        button.innerHTML = 'Connect Wallet';
        button.classList.remove('btn-success');
        button.classList.add('btn-primary');
    }
}

// Update wallet balance
async function updateWalletBalance() {
    try {
        if (!wallet || !wallet.publicKey) return;

        const balance = await connection.getBalance(wallet.publicKey);
        walletBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;
        
        document.getElementById('walletBalance').textContent = walletBalance.toFixed(4);
    } catch (error) {
        console.error('Error updating wallet balance:', error);
    }
}

// Add auto-refresh for balance
setInterval(updateWalletBalance, 30000); // Update every 30 seconds

// Show task section with animation
function showTaskSection() {
    const taskSection = document.getElementById('taskSection');
    if (taskSection) {
        taskSection.style.display = 'block';
        // Trigger reflow
        void taskSection.offsetWidth;
        taskSection.classList.add('visible');
    }
}

// Hide task section
function hideTaskSection() {
    const taskSection = document.getElementById('taskSection');
    if (taskSection) {
        taskSection.classList.remove('visible');
        setTimeout(() => {
            taskSection.style.display = 'none';
        }, 500); // Match the CSS transition duration
    }
}
