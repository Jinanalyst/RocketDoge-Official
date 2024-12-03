// Constants
const PROGRAM_ID = '28AgonRFAayxQRozCYBeRCWJCM3kPq3iNoz99q6ATTHY';
const TOKEN_DECIMALS = 9;
const DEX_PAIR_ADDRESS = 'cz51zdrzmcptdhyks13cckzykvqzzk6u1if1ikojv1fj';
const MIN_TRADE_AMOUNT = 0.1; // in SOL
const TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const MIN_DEPOSIT_AMOUNT = 100; // in USDT

// Wallet state
let wallet = null;
let connection = null;
let walletBalance = 0;

// Social media verification endpoints
const SOCIAL_VERIFY_ENDPOINTS = {
    twitter: 'https://api.twitter.com/2/users/by/username/',
    telegram: 'https://api.telegram.org/bot{bot_token}/getChatMember'
};

// Task status tracking
const taskStatus = {
    1: false, // Social Media
    2: false, // Blofin Signup
    3: false, // OKX Signup
    4: false, // Blofin Deposit
    5: false, // OKX Deposit
    6: false  // DEX Trading
};

// Reward amounts in ROCKET tokens
const taskRewards = {
    1: 100,  // Social Media
    2: 200,  // Blofin Signup
    3: 200,  // OKX Signup
    4: 500,  // Blofin Deposit
    5: 500,  // OKX Deposit
    6: 1000  // DEX Trading
};

// Initialize when page loads
window.addEventListener('load', function() {
    initializeWallet();
    document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);
});

async function initializeWallet() {
    try {
        connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');
        
        // Check if Phantom Wallet is installed
        if (window.solana && window.solana.isPhantom) {
            wallet = window.solana;
            // Check if wallet is already connected
            if (wallet.isConnected) {
                await handleWalletConnection();
            }
        } else {
            console.error('Phantom wallet is not installed');
            alert('Please install Phantom Wallet to participate in tasks!');
        }
    } catch (error) {
        console.error('Failed to initialize wallet:', error);
    }
}

async function connectWallet() {
    try {
        if (!wallet) {
            window.open('https://phantom.app/', '_blank');
            return;
        }

        const connectButton = document.getElementById('connectWalletBtn');
        connectButton.disabled = true;
        connectButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Connecting...';

        try {
            await wallet.connect();
            await handleWalletConnection();
        } catch (err) {
            console.error('Failed to connect wallet:', err);
            alert('Failed to connect wallet. Please try again.');
            updateWalletButton(false);
        }
    } catch (error) {
        console.error('Wallet connection error:', error);
        alert('Error connecting to wallet. Please try again.');
        updateWalletButton(false);
    }
}

async function handleWalletConnection() {
    try {
        const publicKey = wallet.publicKey;
        if (!publicKey) {
            throw new Error('Wallet not connected');
        }

        // Update UI
        document.getElementById('walletAddress').textContent = 
            `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`;
        document.getElementById('walletInfo').style.display = 'block';
        document.getElementById('taskSection').style.display = 'block';
        updateWalletButton(true);

        // Setup disconnect handler
        wallet.on('disconnect', handleWalletDisconnect);

        // Get and display balance
        await updateWalletBalance();

        // Enable all verify buttons
        document.querySelectorAll('.btn-verify').forEach(button => {
            button.disabled = false;
        });
    } catch (error) {
        console.error('Error handling wallet connection:', error);
        handleWalletDisconnect();
    }
}

function handleWalletDisconnect() {
    wallet = null;
    document.getElementById('walletInfo').style.display = 'none';
    document.getElementById('taskSection').style.display = 'none';
    updateWalletButton(false);

    // Disable all verify buttons
    document.querySelectorAll('.btn-verify').forEach(button => {
        button.disabled = true;
    });
}

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

// Utility function to validate TRON address
function isTronAddress(address) {
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
}

// Utility function to check minimum deposit amount (100 USDT)
function isValidDepositAmount(amount) {
    return parseFloat(amount) >= 100;
}

// Verification functions for each task
async function verifyTask(taskId) {
    if (!wallet || !wallet.isConnected) {
        alert('Please connect your wallet first!');
        return;
    }

    const statusElement = document.getElementById(`task${taskId}-status`);
    let verificationInput;
    let isValid = false;
    let errorMessage = '';

    try {
        switch(taskId) {
            case 1: // Social Media
                verificationInput = document.getElementById('socialVerification').value;
                isValid = await verifySocialMedia(verificationInput);
                errorMessage = 'Please enter both Twitter and Telegram usernames.';
                break;
            case 2: // Blofin Signup
                verificationInput = document.getElementById('blofinVerification').value;
                isValid = await verifyBlofin(verificationInput);
                errorMessage = 'Please enter a valid Blofin username.';
                break;
            case 3: // OKX Signup
                verificationInput = document.getElementById('okxVerification').value;
                isValid = await verifyOKX(verificationInput);
                errorMessage = 'Please enter a valid OKX username.';
                break;
            case 4: // Blofin Deposit
                verificationInput = document.getElementById('blofinDepositVerification').value;
                isValid = await verifyBlofinDeposit(verificationInput);
                errorMessage = 'Invalid TRON USDT transaction. Please ensure you deposited at least 100 USDT.';
                break;
            case 5: // OKX Deposit
                verificationInput = document.getElementById('okxDepositVerification').value;
                isValid = await verifyOKXDeposit(verificationInput);
                errorMessage = 'Invalid USDT deposit. Please ensure you deposited at least 100 USDT.';
                break;
            case 6: // DEX Trading
                verificationInput = document.getElementById('dexTradeVerification').value;
                isValid = await verifyDEXTrade(verificationInput);
                errorMessage = 'Invalid trade. Please ensure you traded at least 0.1 SOL on the correct DEX pair.';
                break;
        }

        if (isValid) {
            taskStatus[taskId] = true;
            const rewardDistributed = await distributeReward(taskId);
            updateTaskStatus(taskId, true);
        } else {
            updateTaskStatus(taskId, false, errorMessage);
        }
    } catch (error) {
        console.error('Task verification failed:', error);
        updateTaskStatus(taskId, false, 'Verification failed. Please try again.');
    }
}

// Individual verification functions
async function verifySocialMedia(usernames) {
    try {
        if (!usernames || typeof usernames !== 'string') {
            console.error('Invalid username input');
            return false;
        }

        const platforms = usernames.split(',').map(u => u.trim());
        
        // Check if both Twitter and Telegram usernames are provided
        if (platforms.length !== 2) {
            console.error('Both Twitter and Telegram usernames are required');
            return false;
        }

        const [twitter, telegram] = platforms;

        // Twitter username validation
        if (!twitter || !/^[A-Za-z0-9_]{4,15}$/.test(twitter)) {
            console.error('Invalid Twitter username format');
            return false;
        }

        // Telegram username validation
        if (!telegram || !/^[A-Za-z0-9_]{5,32}$/.test(telegram)) {
            console.error('Invalid Telegram username format');
            return false;
        }

        // In production, implement actual API calls to verify follows
        return true;
    } catch (error) {
        console.error('Social media verification failed:', error);
        return false;
    }
}

async function verifyBlofin(username) {
    try {
        // Basic username validation
        if (!username || username.length < 3 || username.length > 30) {
            console.error('Invalid username length');
            return false;
        }

        // Username format validation
        if (!/^[A-Za-z0-9_-]+$/.test(username)) {
            console.error('Invalid username format');
            return false;
        }

        // In production, implement Blofin API verification
        // For now, just check if the username meets the requirements
        return true;
    } catch (error) {
        console.error('Blofin verification failed:', error);
        return false;
    }
}

async function verifyOKX(username) {
    try {
        // Basic username validation
        if (!username || username.length < 3 || username.length > 30) {
            console.error('Invalid username length');
            return false;
        }

        // Username format validation
        if (!/^[A-Za-z0-9_-]+$/.test(username)) {
            console.error('Invalid username format');
            return false;
        }

        // In production, implement OKX API verification
        // For now, just check if the username meets the requirements
        return true;
    } catch (error) {
        console.error('OKX verification failed:', error);
        return false;
    }
}

async function verifyBlofinDeposit(txId) {
    try {
        // Check if transaction ID format is valid for TRON
        if (!txId || txId.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(txId)) {
            console.error('Invalid Blofin TRON transaction ID format');
            return false;
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
                return false;
            }

            const tx = data.data[0];

            // Verify it's a TRC20 (USDT) transaction
            if (tx.contract_type !== 'TriggerSmartContract' || 
                tx.contract_address !== TRON_USDT_CONTRACT) {
                console.error('Not a USDT transaction');
                return false;
            }

            // Verify amount is at least 100 USDT
            const amount = parseInt(tx.value) / 1e6; // USDT has 6 decimals
            if (amount < MIN_DEPOSIT_AMOUNT) {
                console.error('Deposit amount less than 100 USDT');
                return false;
            }

            // Verify transaction status
            if (!tx.confirmed || tx.ret[0].contractRet !== 'SUCCESS') {
                console.error('Transaction not confirmed or failed');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error verifying TRON transaction:', error);
            return false;
        }
    } catch (error) {
        console.error('Blofin deposit verification failed:', error);
        return false;
    }
}

async function verifyOKXDeposit(txInfo) {
    try {
        // Parse the transaction info (format: txId:amount:currency)
        const [txId, amount, currency] = txInfo.split(':');

        // Basic validation
        if (!txId || !amount || !currency) {
            console.error('Invalid OKX transaction info format');
            return false;
        }

        // Verify it's a USDT transaction
        if (currency.toUpperCase() !== 'USDT') {
            console.error('Not a USDT transaction');
            return false;
        }

        // Verify amount format and minimum
        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount) || depositAmount < MIN_DEPOSIT_AMOUNT) {
            console.error('Invalid or insufficient deposit amount');
            return false;
        }

        // Verify transaction ID format (OKX specific)
        if (!/^[0-9a-zA-Z]{24,}$/.test(txId)) {
            console.error('Invalid OKX transaction ID format');
            return false;
        }

        // In production, implement OKX API verification
        return true;
    } catch (error) {
        console.error('OKX deposit verification failed:', error);
        return false;
    }
}

async function verifyDEXTrade(signature) {
    try {
        // Validate signature format
        if (!signature || !/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{87,88}$/.test(signature)) {
            console.error('Invalid Solana transaction signature format');
            return false;
        }

        // Fetch transaction details
        const transaction = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!transaction) {
            console.error('Transaction not found');
            return false;
        }

        // Verify it's a trade on the correct DEX pair
        const isPairTransaction = transaction.transaction.message.accountKeys.some(
            key => key.toBase58() === DEX_PAIR_ADDRESS
        );

        if (!isPairTransaction) {
            console.error('Transaction is not for the correct DEX pair');
            return false;
        }

        // Verify transaction success
        if (transaction.meta.err) {
            console.error('Transaction failed');
            return false;
        }

        // Verify trade amount
        const preBalances = transaction.meta.preBalances;
        const postBalances = transaction.meta.postBalances;
        const tradeAmount = Math.abs(preBalances[0] - postBalances[0]) / solanaWeb3.LAMPORTS_PER_SOL;

        if (tradeAmount < MIN_TRADE_AMOUNT) {
            console.error('Trade amount less than minimum required');
            return false;
        }

        // Verify transaction timestamp (optional)
        if (transaction.blockTime) {
            const txTime = new Date(transaction.blockTime * 1000);
            const now = new Date();
            const hoursSinceTransaction = (now - txTime) / (1000 * 60 * 60);
            
            if (hoursSinceTransaction > 24) {
                console.error('Transaction is too old');
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('DEX trade verification failed:', error);
        return false;
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

// Reward distribution
async function distributeReward(taskId) {
    try {
        const amount = taskRewards[taskId];
        console.log(`Distributing ${amount} ROCKET tokens for task ${taskId}`);
        
        const programId = new solanaWeb3.PublicKey(PROGRAM_ID);
        const userPublicKey = wallet.publicKey;
        
        // Create the reward distribution instruction
        const rewardInstruction = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: userPublicKey, isSigner: true, isWritable: true },
                // Add other necessary account keys based on your program's requirements
            ],
            programId: programId,
            data: Buffer.from([
                1, // Instruction index for reward distribution
                ...new Uint8Array(new Float64Array([amount * Math.pow(10, TOKEN_DECIMALS)]).buffer)
            ])
        });

        const transaction = new solanaWeb3.Transaction().add(rewardInstruction);
        
        // Get recent blockhash
        const { blockhash } = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPublicKey;

        // Sign and send transaction
        try {
            const signed = await wallet.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signed.serialize());
            await connection.confirmTransaction(signature);
            
            console.log('Reward distributed successfully:', signature);
            return true;
        } catch (err) {
            console.error('Transaction failed:', err);
            alert('Failed to distribute reward. Please try again.');
            return false;
        }
    } catch (error) {
        console.error('Failed to distribute reward:', error);
        alert('Failed to distribute reward. Please try again later.');
        return false;
    }
}
