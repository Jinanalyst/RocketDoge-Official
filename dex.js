// Token Constants
const TOKENS = {
    SOL: {
        symbol: 'SOL',
        decimals: 9,
        address: 'So11111111111111111111111111111111111111112',
        name: 'Solana',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
    },
    USDC: {
        symbol: 'USDC',
        decimals: 6,
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        name: 'USD Coin',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
    },
    USDT: {
        symbol: 'USDT',
        decimals: 6,
        address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        name: 'USDT',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png'
    },
    BONK: {
        symbol: 'BONK',
        decimals: 5,
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        name: 'Bonk',
        logoURI: 'https://arweave.net/hQB7PMqF_GBxaiJWZqJGCXKyqBN-7Ob8_FZz4RhJQnM'
    },
    ORCA: {
        symbol: 'ORCA',
        decimals: 6,
        address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
        name: 'Orca',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png'
    },
    RAY: {
        symbol: 'RAY',
        decimals: 6,
        address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        name: 'Raydium',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png'
    },
    MNGO: {
        symbol: 'MNGO',
        decimals: 6,
        address: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
        name: 'Mango',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac/logo.png'
    }
};

// Raydium Pool Constants
const POOLS = {
    'SOL/USDC': {
        address: '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2',
        tokens: ['SOL', 'USDC']
    },
    'SOL/USDT': {
        address: '7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX',
        tokens: ['SOL', 'USDT']
    }
};

// Constants
const FEE_RECEIVER = '6zkf4DviZZkpWVEh53MrcQV6vGXGpESnNXgAvU6KpBUH';
const FEE_PERCENTAGE = 0.3; // 0.3% fee
const PLATFORM_FEE = 0.003; // 0.3%

import { dexConfig } from './config/dex.config.js';

// Global variables
let wallet = null;
let connection = null;
let provider = null;
let jupiter = null;

// Initialize Solana connection
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
        showError(dexConfig.ERROR_MESSAGES.CONNECTION_ERROR);
        return false;
    }
}

// Connect wallet
async function connectWallet() {
    try {
        const provider = getProvider();
        if (!provider) {
            throw new Error(dexConfig.ERROR_MESSAGES.NO_WALLET);
        }

        await provider.connect();
        wallet = provider;
        
        const walletAddress = wallet.publicKey.toString();
        updateWalletUI(walletAddress);
        await updateUI();
        
        // Enable swap interface
        document.getElementById('swapInterface').classList.remove('disabled');
    } catch (error) {
        console.error('Wallet connection error:', error);
        showError(error.message || dexConfig.ERROR_MESSAGES.CONNECTION_ERROR);
        document.getElementById('swapInterface').classList.add('disabled');
    }
}

// Tab switching functionality
function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all nav links
    document.querySelectorAll('.menu-nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected tab content
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to selected nav link
    const selectedLink = document.querySelector(`[href="#${tabId}"]`);
    if (selectedLink) {
        selectedLink.classList.add('active');
    }

    // Update URL hash without scrolling
    history.pushState(null, null, `#${tabId}`);
}

// Handle initial tab on page load
document.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.slice(1) || 'swap';
    switchTab(hash);
});

// Initialize when page loads
window.addEventListener('load', async function() {
    await initializeSolana();
    await initializeWallet();
    await initializeJupiter();
    setupEventListeners();
    populateTokenLists();
});

async function initializeWallet() {
    try {
        // Connect to Solana mainnet
        connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed');
        
        // Check if Phantom Wallet is installed
        if (window.solana && window.solana.isPhantom) {
            wallet = window.solana;
            if (wallet.isConnected) {
                await handleWalletConnection(true);
            }
        } else {
            console.error('Phantom wallet is not installed');
            alert('Please install Phantom Wallet to use the DEX!');
        }
    } catch (error) {
        console.error('Failed to initialize wallet:', error);
    }
}

async function initializeJupiter() {
    try {
        // Load Jupiter SDK
        const response = await fetch('https://price.jup.ag/v4/price');
        if (!response.ok) {
            throw new Error('Failed to initialize Jupiter');
        }
        console.log('Jupiter initialized');
    } catch (error) {
        console.error('Error initializing Jupiter:', error);
    }
}

function setupEventListeners() {
    document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);
    document.getElementById('swapDirection').addEventListener('click', swapTokenPair);
    document.getElementById('fromAmount').addEventListener('input', handleAmountChange);
    document.getElementById('fromToken').addEventListener('change', handleTokenChange);
    document.getElementById('toToken').addEventListener('change', handleTokenChange);
    document.getElementById('swapButton').addEventListener('click', executeSwap);
    
    // Slippage settings
    document.getElementById('customSlippage').addEventListener('input', handleCustomSlippage);
    document.getElementById('transactionDeadline').addEventListener('input', handleDeadlineChange);
}

async function connectWallet() {
    try {
        if (!wallet) {
            window.open('https://phantom.app/', '_blank');
            return;
        }

        const connectButton = document.getElementById('connectWalletBtn');
        connectButton.disabled = true;
        connectButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Connecting...';

        try {
            await wallet.connect();
            await handleWalletConnection(true);
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

async function handleWalletConnection(connected) {
    const walletSection = document.getElementById('walletSection');
    const walletInfo = walletSection.querySelector('.wallet-info');
    const portfolioSection = document.querySelector('.portfolio-section');
    
    if (connected) {
        walletInfo.style.display = 'block';
        portfolioSection.style.display = 'block';
        document.getElementById('walletAddress').textContent = 
            `${wallet.publicKey.toString().slice(0, 4)}...${wallet.publicKey.toString().slice(-4)}`;
        await updateWalletBalance();
        await updateTokenBalances();
        await refreshPortfolio();
    } else {
        walletInfo.style.display = 'none';
        portfolioSection.style.display = 'none';
        document.getElementById('walletAddress').textContent = '';
        document.getElementById('walletBalance').textContent = '0';
    }
}

function handleWalletDisconnect() {
    wallet = null;
    document.getElementById('walletInfo').style.display = 'none';
    document.getElementById('swapInterface').style.display = 'none';
    updateWalletButton(false);
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
        const solBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;
        
        document.getElementById('walletBalance').textContent = solBalance.toFixed(4);
    } catch (error) {
        console.error('Error updating wallet balance:', error);
    }
}

async function updateTokenBalances() {
    try {
        if (!wallet || !wallet.publicKey) return;

        // Update SOL balance
        const solBalance = await connection.getBalance(wallet.publicKey);
        document.getElementById('fromBalance').textContent = 
            `Balance: ${(solBalance / solanaWeb3.LAMPORTS_PER_SOL).toFixed(4)} SOL`;

        // Update other token balances
        for (const token of Object.values(TOKENS)) {
            if (token.symbol === 'SOL') continue;

            const tokenMint = new solanaWeb3.PublicKey(token.address);
            const tokenAccount = await connection.getTokenAccountsByOwner(wallet.publicKey, { mint: tokenMint });
            
            if (tokenAccount.value.length > 0) {
                const accountInfo = await connection.getTokenAccountBalance(tokenAccount.value[0].pubkey);
                const balance = accountInfo.value.uiAmount;
                if (document.getElementById('fromToken').value === token.symbol) {
                    document.getElementById('fromBalance').textContent = 
                        `Balance: ${balance.toFixed(token.decimals)} ${token.symbol}`;
                }
                if (document.getElementById('toToken').value === token.symbol) {
                    document.getElementById('toBalance').textContent = 
                        `Balance: ${balance.toFixed(token.decimals)} ${token.symbol}`;
                }
            }
        }
    } catch (error) {
        console.error('Error updating token balances:', error);
    }
}

function populateTokenLists() {
    const fromSelect = document.getElementById('fromToken');
    const toSelect = document.getElementById('toToken');
    
    // Clear existing options
    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';
    
    // Add tokens to selects
    Object.values(TOKENS).forEach(token => {
        const option = document.createElement('option');
        option.value = token.symbol;
        option.text = `${token.name} (${token.symbol})`;
        option.setAttribute('data-address', token.address);
        option.setAttribute('data-decimals', token.decimals);
        
        const optionClone = option.cloneNode(true);
        fromSelect.appendChild(option);
        toSelect.appendChild(optionClone);
    });
}

function swapTokenPair() {
    const fromToken = document.getElementById('fromToken');
    const toToken = document.getElementById('toToken');
    const fromAmount = document.getElementById('fromAmount');
    const toAmount = document.getElementById('toAmount');

    // Swap token selections
    const temp = fromToken.value;
    fromToken.value = toToken.value;
    toToken.value = temp;

    // Clear amounts
    fromAmount.value = '';
    toAmount.value = '';

    // Update price impact and minimum received
    updatePriceImpact();
    updateTokenBalances();
}

async function handleAmountChange() {
    const fromAmount = document.getElementById('fromAmount').value;
    if (!fromAmount || isNaN(fromAmount) || fromAmount <= 0) {
        document.getElementById('toAmount').value = '';
        updatePriceImpact();
        return;
    }

    try {
        const fromToken = document.getElementById('fromToken').value;
        const toToken = document.getElementById('toToken').value;
        
        // Get price from Jupiter
        const price = await getJupiterPrice(fromToken, toToken, fromAmount);
        if (price) {
            document.getElementById('toAmount').value = price.toFixed(6);
            updatePriceImpact(price, fromAmount);
        }
    } catch (error) {
        console.error('Error calculating swap amount:', error);
        document.getElementById('toAmount').value = '';
    }
}

async function getJupiterPrice(inputToken, outputToken, amount) {
    try {
        const inputMint = TOKENS[inputToken].address;
        const outputMint = TOKENS[outputToken].address;
        const inputDecimals = TOKENS[inputToken].decimals;
        
        // Convert amount to proper decimals
        const adjustedAmount = amount * Math.pow(10, inputDecimals);
        
        // Get price from Jupiter API
        const response = await fetch(
            `https://price.jup.ag/v4/price?inputMint=${inputMint}&outputMint=${outputMint}&amount=${adjustedAmount}&slippage=0.5`
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch price');
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Convert price to proper decimals
        const outputDecimals = TOKENS[outputToken].decimals;
        return data.data.outAmount / Math.pow(10, outputDecimals);
    } catch (error) {
        console.error('Error fetching Jupiter price:', error);
        throw error;
    }
}

async function executeSwap() {
    try {
        if (!wallet || !wallet.publicKey) {
            throw new Error(dexConfig.ERROR_MESSAGES.NO_WALLET);
        }

        const fromAmount = document.getElementById('fromAmount').value;
        if (!fromAmount || isNaN(fromAmount) || fromAmount <= 0) {
            throw new Error(dexConfig.ERROR_MESSAGES.INVALID_AMOUNT);
        }

        const fromToken = document.getElementById('fromToken').value;
        const toToken = document.getElementById('toToken').value;

        // Disable swap button
        const swapButton = document.getElementById('swapButton');
        swapButton.disabled = true;
        swapButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Preparing Swap...';

        try {
            // Get swap quote from Jupiter
            const quote = await getJupiterQuote(fromToken, toToken, fromAmount);
            
            // Update UI with quote details
            document.getElementById('priceImpact').textContent = `${(quote.priceImpactPct * 100).toFixed(2)}%`;
            document.getElementById('minReceived').textContent = 
                `${(quote.outAmount * (1 - quote.slippage)).toFixed(6)} ${toToken}`;
            
            // Create and send transaction
            const transaction = await createSwapTransaction(quote);
            swapButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Confirming...';
            
            const signature = await wallet.signAndSendTransaction(transaction);
            await connection.confirmTransaction(signature);

            alert('Swap successful!');
            
            // Update balances
            await updateWalletBalance();
            await updateTokenBalances();
            
            // Clear input fields
            document.getElementById('fromAmount').value = '';
            document.getElementById('toAmount').value = '';
            updatePriceImpact();
        } catch (err) {
            console.error('Swap failed:', err);
            alert('Swap failed. Please try again.');
        }

        // Re-enable swap button
        swapButton.disabled = false;
        swapButton.textContent = 'Swap Tokens';
    } catch (error) {
        console.error('Error executing swap:', error);
        alert('Error executing swap. Please try again.');
    }
}

async function getJupiterQuote(inputToken, outputToken, amount) {
    try {
        const inputMint = TOKENS[inputToken].address;
        const outputMint = TOKENS[outputToken].address;
        const inputDecimals = TOKENS[inputToken].decimals;
        const adjustedAmount = amount * Math.pow(10, inputDecimals);

        // Get quote from Jupiter API with current slippage
        const response = await fetch(
            `https://quote-api.jup.ag/v4/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${adjustedAmount}&slippageBps=${currentSlippage * 100}`
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch quote');
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Convert price to proper decimals
        const outputDecimals = TOKENS[outputToken].decimals;
        return {
            ...data,
            priceImpactPct: data.priceImpactPct || 0,
            slippage: currentSlippage / 100
        };
    } catch (error) {
        console.error('Error fetching Jupiter quote:', error);
        throw error;
    }
}

async function createSwapTransaction(quote) {
    try {
        // Calculate deadline
        const currentTime = Math.floor(Date.now() / 1000);
        const deadlineTime = currentTime + (transactionDeadline * 60);

        // Calculate fee amount (0.3% of output amount)
        const outputAmount = quote.outAmount;
        const feeAmount = Math.floor(outputAmount * (FEE_PERCENTAGE / 100));

        // Get swap transaction from Jupiter API
        const response = await fetch('https://quote-api.jup.ag/v4/swap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: wallet.publicKey.toString(),
                wrapUnwrapSOL: true,
                validUntil: deadlineTime,
                // Add fee recipient
                feeAccount: FEE_RECEIVER,
                platformFeeBps: FEE_PERCENTAGE * 100 // Convert to basis points
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create swap transaction');
        }

        const { swapTransaction } = await response.json();
        
        // Deserialize the transaction
        const transaction = solanaWeb3.Transaction.from(
            Buffer.from(swapTransaction, 'base64')
        );

        return transaction;
    } catch (error) {
        console.error('Error creating swap transaction:', error);
        throw error;
    }
}

function updatePriceImpact(outputAmount, inputAmount) {
    if (!outputAmount || !inputAmount) {
        document.getElementById('priceImpact').textContent = '0.00%';
        document.getElementById('minReceived').textContent = '0';
        document.getElementById('networkFee').textContent = '~0.000005 SOL';
        return;
    }

    const fromToken = document.getElementById('fromToken').value;
    const toToken = document.getElementById('toToken').value;
    
    // Calculate minimum received using current slippage and including platform fee
    const feeAmount = outputAmount * (FEE_PERCENTAGE / 100);
    const afterFeeAmount = outputAmount - feeAmount;
    const minReceived = (afterFeeAmount * (1 - currentSlippage / 100)).toFixed(6);
    
    document.getElementById('minReceived').textContent = `${minReceived} ${toToken}`;
    
    // Show platform fee
    const platformFee = (feeAmount).toFixed(6);
    document.getElementById('networkFee').textContent = `~0.000005 SOL + ${platformFee} ${toToken} platform fee`;
}

function setSlippage(value) {
    currentSlippage = value;
    document.getElementById('currentSlippage').textContent = `${value}%`;
    document.getElementById('customSlippage').value = '';
    
    // Update UI
    const buttons = document.querySelectorAll('[onclick^="setSlippage"]');
    buttons.forEach(button => {
        if (parseFloat(button.textContent) === value) {
            button.classList.add('btn-primary');
            button.classList.remove('btn-outline-primary');
        } else {
            button.classList.remove('btn-primary');
            button.classList.add('btn-outline-primary');
        }
    });

    // Update minimum received if amount is entered
    handleAmountChange();
}

function handleCustomSlippage() {
    const input = document.getElementById('customSlippage');
    let value = parseFloat(input.value);
    
    // Validate input
    if (isNaN(value) || value < 0.1) {
        input.classList.add('is-invalid');
        return;
    }
    if (value > 100) {
        value = 100;
        input.value = 100;
    }
    
    input.classList.remove('is-invalid');
    currentSlippage = value;
    document.getElementById('currentSlippage').textContent = `${value}%`;
    
    // Reset preset buttons
    const buttons = document.querySelectorAll('[onclick^="setSlippage"]');
    buttons.forEach(button => {
        button.classList.remove('btn-primary');
        button.classList.add('btn-outline-primary');
    });

    // Update minimum received if amount is entered
    handleAmountChange();
}

function handleDeadlineChange() {
    const input = document.getElementById('transactionDeadline');
    let value = parseInt(input.value);
    
    // Validate input
    if (isNaN(value) || value < 1) {
        input.classList.add('is-invalid');
        return;
    }
    if (value > 180) {
        value = 180;
        input.value = 180;
    }
    
    input.classList.remove('is-invalid');
    transactionDeadline = value;
}

function handleTokenChange() {
    const fromToken = document.getElementById('fromToken').value;
    const toToken = document.getElementById('toToken').value;

    // Prevent same token selection
    if (fromToken === toToken) {
        const otherOptions = Array.from(document.getElementById('toToken').options)
            .map(option => option.value)
            .filter(value => value !== fromToken);
        document.getElementById('toToken').value = otherOptions[0];
    }

    // Clear amounts and update UI
    document.getElementById('fromAmount').value = '';
    document.getElementById('toAmount').value = '';
    updatePriceImpact();
    updateTokenBalances();
}

// Portfolio functionality
async function refreshPortfolio() {
    if (!wallet || !connection) return;

    const portfolioGrid = document.getElementById('portfolioGrid');
    portfolioGrid.innerHTML = '';

    try {
        // Get all token accounts for the wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
            programId: TOKEN_PROGRAM_ID
        });

        // Add native SOL balance
        const solBalance = await connection.getBalance(wallet.publicKey);
        addTokenToPortfolio('SOL', solBalance / LAMPORTS_PER_SOL, TOKENS.SOL.logoURI);

        // Add other token balances
        for (const { account } of tokenAccounts.value) {
            const tokenBalance = account.data.parsed.info.tokenAmount;
            const mintAddress = account.data.parsed.info.mint;
            
            // Find token info
            const tokenInfo = Object.values(TOKENS).find(token => token.address === mintAddress);
            if (tokenInfo) {
                const balance = tokenBalance.uiAmount;
                if (balance > 0) {
                    addTokenToPortfolio(tokenInfo.symbol, balance, tokenInfo.logoURI);
                }
            }
        }
    } catch (error) {
        console.error('Error refreshing portfolio:', error);
        showNotification('error', 'Failed to load portfolio');
    }
}

function addTokenToPortfolio(symbol, balance, logoUrl) {
    const portfolioGrid = document.getElementById('portfolioGrid');
    const tokenCard = document.createElement('div');
    tokenCard.className = 'portfolio-token';
    tokenCard.innerHTML = `
        <img src="${logoUrl}" alt="${symbol}" onerror="this.src='https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'">
        <div>
            <div class="fw-bold">${symbol}</div>
            <div class="text-secondary">${balance.toFixed(4)}</div>
        </div>
    `;
    
    // Add click event to use token in swap
    tokenCard.addEventListener('click', () => {
        document.getElementById('fromToken').value = symbol;
        document.getElementById('fromAmount').value = balance.toString();
        handleTokenChange();
    });
    
    portfolioGrid.appendChild(tokenCard);
}

// Add auto-refresh for balances
setInterval(updateWalletBalance, 30000);
setInterval(updateTokenBalances, 30000);

// Portfolio Functions
async function updatePortfolio() {
    if (!isWalletConnected()) {
        document.querySelector('#portfolio').innerHTML = `
            <div class="connect-prompt">
                <p>Connect your wallet to view your portfolio</p>
                <button onclick="connectWallet()" class="btn btn-primary">Connect Wallet</button>
            </div>
        `;
        return;
    }

    try {
        // Update portfolio stats
        const stats = await getPortfolioStats();
        document.getElementById('totalBalance').textContent = `$${formatNumber(stats.totalBalance)}`;
        document.getElementById('totalBalanceChange').textContent = `${stats.totalBalanceChange}%`;
        document.getElementById('dailyChange').textContent = `$${formatNumber(stats.dailyChange)}`;
        document.getElementById('dailyChangePercent').textContent = `${stats.dailyChangePercent}%`;
        document.getElementById('totalTrades').textContent = stats.totalTrades;

        // Update token list
        const tokenList = document.querySelector('.token-list');
        const tokens = await getTokenBalances();

        if (tokens.length === 0) {
            tokenList.innerHTML = '<div class="no-tokens">No tokens in portfolio</div>';
            return;
        }

        const tokensHTML = tokens.map(token => `
            <div class="token-item">
                <div class="token-info">
                    <img src="${token.logo}" alt="${token.symbol}" class="token-logo">
                    <div class="token-details">
                        <div class="token-name">${token.name}</div>
                        <div class="token-symbol">${token.symbol}</div>
                    </div>
                </div>
                <div class="token-balance">
                    <div class="balance-amount">${formatNumber(token.balance)} ${token.symbol}</div>
                    <div class="balance-value">$${formatNumber(token.value)}</div>
                </div>
                <div class="token-change ${token.priceChange >= 0 ? 'positive' : 'negative'}">
                    ${token.priceChange}%
                </div>
                <div class="token-actions">
                    <button onclick="selectTokenForSwap('${token.symbol}')" class="btn btn-primary btn-sm">Swap</button>
                </div>
            </div>
        `).join('');

        tokenList.innerHTML = tokensHTML;
    } catch (error) {
        console.error('Error updating portfolio:', error);
        document.querySelector('#portfolio').innerHTML = '<div class="error">Error loading portfolio. Please try again.</div>';
    }
}

// Transaction History Functions
async function updateTransactionHistory() {
    if (!isWalletConnected()) {
        document.querySelector('#history').innerHTML = `
            <div class="connect-prompt">
                <p>Connect your wallet to view your transaction history</p>
                <button onclick="connectWallet()" class="btn btn-primary">Connect Wallet</button>
            </div>
        `;
        return;
    }

    try {
        const historyContainer = document.getElementById('transactionHistory');
        const transactions = await getTransactionHistory();

        if (transactions.length === 0) {
            historyContainer.innerHTML = '<tr><td colspan="6" class="text-center">No transactions found</td></tr>';
            return;
        }

        const transactionsHTML = transactions.map(tx => `
            <tr>
                <td>${formatDate(tx.date)}</td>
                <td>
                    <span class="badge ${tx.type === 'Swap' ? 'bg-primary' : 'bg-success'}">${tx.type}</span>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${tx.fromToken.logo}" alt="${tx.fromToken.symbol}" class="token-logo me-2">
                        ${formatNumber(tx.fromAmount)} ${tx.fromToken.symbol}
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${tx.toToken.logo}" alt="${tx.toToken.symbol}" class="token-logo me-2">
                        ${formatNumber(tx.toAmount)} ${tx.toToken.symbol}
                    </div>
                </td>
                <td>$${formatNumber(tx.value)}</td>
                <td>
                    <span class="badge ${tx.status === 'Completed' ? 'bg-success' : 'bg-warning'}">${tx.status}</span>
                </td>
            </tr>
        `).join('');

        historyContainer.innerHTML = transactionsHTML;
    } catch (error) {
        console.error('Error updating transaction history:', error);
        document.getElementById('transactionHistory').innerHTML = 
            '<tr><td colspan="6" class="text-center text-danger">Error loading transactions. Please try again.</td></tr>';
    }
}

// Helper function to format dates
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Update displays when tab changes
document.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.slice(1) || 'swap';
    switchTab(hash);
    
    if (hash === 'portfolio') {
        updatePortfolio();
    } else if (hash === 'history') {
        updateTransactionHistory();
    }
});

// Refresh displays when wallet connection changes
window.addEventListener('walletConnectionChanged', () => {
    const currentTab = window.location.hash.slice(1);
    if (currentTab === 'portfolio') {
        updatePortfolio();
    } else if (currentTab === 'history') {
        updateTransactionHistory();
    }
});

// Token price calculation and swap functionality
async function calculateSwap(inputAmount, fromToken, toToken) {
    if (!inputAmount || !fromToken || !toToken) return;

    try {
        const response = await fetch(`https://api.rocketdoge.com/v1/swap/quote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputAmount,
                inputToken: fromToken,
                outputToken: toToken
            })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch swap quote');
        }

        const data = await response.json();
        return {
            outputAmount: data.outputAmount,
            priceImpact: data.priceImpact,
            minimumReceived: data.minimumReceived,
            fee: data.fee
        };
    } catch (error) {
        console.error('Error calculating swap:', error);
        return null;
    }
}

// Update swap interface when input changes
async function handleSwapInputChange() {
    const fromAmount = document.getElementById('fromAmount').value;
    const fromToken = document.getElementById('fromToken').value;
    const toToken = document.getElementById('toToken').value;

    if (!fromAmount || !fromToken || !toToken) {
        document.getElementById('toAmount').value = '';
        document.getElementById('priceImpact').textContent = '0.00%';
        document.getElementById('minReceived').textContent = '0';
        document.getElementById('platformFee').textContent = '-';
        return;
    }

    try {
        const swapDetails = await calculateSwap(fromAmount, fromToken, toToken);
        if (!swapDetails) return;

        document.getElementById('toAmount').value = swapDetails.outputAmount;
        document.getElementById('priceImpact').textContent = `${swapDetails.priceImpact}%`;
        document.getElementById('minReceived').textContent = `${swapDetails.minimumReceived} ${toToken}`;
        document.getElementById('platformFee').textContent = `${swapDetails.fee} ${fromToken}`;

        // Update swap button state
        updateSwapButtonState();
    } catch (error) {
        console.error('Error updating swap interface:', error);
    }
}

// Update swap button state
function updateSwapButtonState() {
    const swapButton = document.getElementById('swapButton');
    const fromAmount = document.getElementById('fromAmount').value;
    const fromToken = document.getElementById('fromToken').value;
    const toToken = document.getElementById('toToken').value;

    if (!isWalletConnected()) {
        swapButton.textContent = 'Connect Wallet';
        swapButton.disabled = true;
        return;
    }

    if (!fromAmount || !fromToken || !toToken) {
        swapButton.textContent = 'Enter an amount';
        swapButton.disabled = true;
        return;
    }

    const fromBalance = parseFloat(document.getElementById('fromBalance').textContent.split(': ')[1]);
    if (parseFloat(fromAmount) > fromBalance) {
        swapButton.textContent = 'Insufficient balance';
        swapButton.disabled = true;
        return;
    }

    swapButton.textContent = 'Swap';
    swapButton.disabled = false;
}

// Execute swap
async function executeSwap() {
    try {
        if (!wallet || !wallet.publicKey) {
            throw new Error(dexConfig.ERROR_MESSAGES.NO_WALLET);
        }

        const fromAmount = document.getElementById('fromAmount').value;
        if (!fromAmount || isNaN(fromAmount) || fromAmount <= 0) {
            throw new Error(dexConfig.ERROR_MESSAGES.INVALID_AMOUNT);
        }

        // Add loading state
        const swapButton = document.getElementById('swapButton');
        swapButton.disabled = true;
        swapButton.textContent = 'Swapping...';

        const fromToken = document.getElementById('fromToken').value;
        const toToken = document.getElementById('toToken').value;
        
        // Get quote and check price impact
        const quote = await getJupiterQuote(fromToken, toToken, fromAmount);
        const priceImpact = calculatePriceImpact(quote);
        
        if (priceImpact > dexConfig.MAX_SLIPPAGE) {
            throw new Error(dexConfig.ERROR_MESSAGES.PRICE_IMPACT_HIGH);
        }

        // Execute swap transaction
        const transaction = await createSwapTransaction(quote);
        const signature = await wallet.signAndSendTransaction(transaction);
        
        await connection.confirmTransaction(signature);
        showSuccess('Swap completed successfully!');
        
        // Update UI
        await updateBalances();
        await updateTokenPrices();
    } catch (error) {
        console.error('Swap error:', error);
        showError(error.message || dexConfig.ERROR_MESSAGES.SWAP_FAILED);
    } finally {
        // Reset button state
        const swapButton = document.getElementById('swapButton');
        swapButton.disabled = false;
        swapButton.textContent = 'Swap';
    }
}

// Event listeners for swap interface
document.getElementById('fromAmount').addEventListener('input', handleSwapInputChange);
document.getElementById('fromToken').addEventListener('change', handleSwapInputChange);
document.getElementById('toToken').addEventListener('change', handleSwapInputChange);
document.getElementById('swapButton').addEventListener('click', executeSwap);
document.getElementById('swapDirection').addEventListener('click', () => {
    // Swap token selections
    const fromToken = document.getElementById('fromToken');
    const toToken = document.getElementById('toToken');
    const fromAmount = document.getElementById('fromAmount');
    const toAmount = document.getElementById('toAmount');

    const tempToken = fromToken.value;
    fromToken.value = toToken.value;
    toToken.value = tempToken;

    const tempAmount = fromAmount.value;
    fromAmount.value = toAmount.value;
    toAmount.value = tempAmount;

    handleSwapInputChange();
});
