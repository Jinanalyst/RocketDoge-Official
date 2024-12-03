import { poolsConfig } from './config/pools.config.js';

// Constants
const FEE_RECIPIENT = '6zkf4DviZZkpWVEh53MrcQV6vGXGpESnNXgAvU6KpBUH';
const PLATFORM_FEE = 0.003; // 0.3%

// Global variables
let wallet = null;
let connection = null;
let pools = [];
let myPools = [];

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
        showError(poolsConfig.ERROR_MESSAGES.CONNECTION_ERROR);
        return false;
    }
}

// Connect wallet
async function connectWallet() {
    try {
        if (!window.solana) {
            throw new Error(poolsConfig.ERROR_MESSAGES.NO_WALLET);
        }

        const response = await window.solana.connect();
        wallet = response;
        
        document.getElementById('connectWalletBtn').style.display = 'none';
        document.getElementById('walletInfo').style.display = 'block';
        document.getElementById('walletAddress').textContent = 
            `${wallet.publicKey.toString().slice(0, 4)}...${wallet.publicKey.toString().slice(-4)}`;
        
        await updateBalances();
        await updateStats();
        await updateMyPools();
        await updateAllPools();
    } catch (error) {
        console.error('Failed to connect wallet:', error);
        showError(error.message || poolsConfig.ERROR_MESSAGES.CONNECTION_ERROR);
    }
}

// Update token balances
async function updateBalances() {
    if (!wallet) return;
    
    try {
        const balance = await connection.getBalance(wallet.publicKey);
        document.getElementById('walletBalance').textContent = (balance / solanaWeb3.LAMPORTS_PER_SOL).toFixed(4);
        
        // Update token balances for pool creation
        const tokenA = document.getElementById('poolTokenA').value;
        const tokenB = document.getElementById('poolTokenB').value;
        
        // Placeholder for token balance fetching
        document.getElementById('balanceA').textContent = `Balance: 0.00 ${tokenA}`;
        document.getElementById('balanceB').textContent = `Balance: 0.00 ${tokenB}`;
    } catch (error) {
        console.error('Error updating balances:', error);
        showError(error.message || poolsConfig.ERROR_MESSAGES.BALANCE_UPDATE_FAILED);
    }
}

// Update platform stats
async function updateStats() {
    try {
        // Placeholder for actual stats calculation
        document.getElementById('totalValueLocked').textContent = '$1,234,567.89';
        document.getElementById('dailyVolume').textContent = '$456,789.12';
        document.getElementById('dailyFees').textContent = '$1,370.37';
    } catch (error) {
        console.error('Error updating stats:', error);
        showError(error.message || poolsConfig.ERROR_MESSAGES.STATS_UPDATE_FAILED);
    }
}

// Create new pool
async function handleCreatePool() {
    try {
        if (!wallet) {
            throw new Error(poolsConfig.ERROR_MESSAGES.NO_WALLET);
        }

        const tokenA = document.getElementById('poolTokenA').value;
        const tokenB = document.getElementById('poolTokenB').value;
        const amountA = parseFloat(document.getElementById('poolAmountA').value);
        const amountB = parseFloat(document.getElementById('poolAmountB').value);

        if (!amountA || !amountB || amountA <= 0 || amountB <= 0) {
            throw new Error(poolsConfig.ERROR_MESSAGES.INVALID_AMOUNT);
        }

        if (amountA < poolsConfig.MIN_LIQUIDITY || amountB < poolsConfig.MIN_LIQUIDITY) {
            throw new Error(poolsConfig.ERROR_MESSAGES.MIN_LIQUIDITY_ERROR);
        }

        if (tokenA === tokenB) {
            throw new Error(poolsConfig.ERROR_MESSAGES.SAME_TOKENS_ERROR);
        }

        // Add loading state
        const createButton = document.getElementById('createPoolBtn');
        createButton.disabled = true;
        createButton.textContent = 'Creating Pool...';

        // Create pool logic here
        const poolData = {
            id: Date.now().toString(),
            tokenA,
            tokenB,
            amountA,
            amountB,
            creator: wallet.publicKey.toString(),
            tvl: `$${(amountA * 20 + amountB).toFixed(2)}`,
            volume: '$0.00',
            apr: '0.00%',
            myShare: '100%'
        };

        pools.push(poolData);
        myPools.push(poolData);
        
        await updateMyPools();
        await updateAllPools();
        await updateStats();

        showSuccess('Pool created successfully!');
    } catch (error) {
        console.error('Failed to create pool:', error);
        showError(error.message || poolsConfig.ERROR_MESSAGES.POOL_CREATE_FAILED);
    } finally {
        const createButton = document.getElementById('createPoolBtn');
        createButton.disabled = false;
        createButton.textContent = 'Create Pool';
    }
}

// Update my pools list
async function updateMyPools() {
    const myPoolsList = document.getElementById('myPoolsList');
    myPoolsList.innerHTML = '';

    if (myPools.length === 0) {
        myPoolsList.innerHTML = '<div class="text-center text-muted">No pools available</div>';
        return;
    }

    myPools.forEach(pool => {
        const poolElement = document.createElement('div');
        poolElement.className = 'pool-item';
        poolElement.innerHTML = `
            <div class="pool-info">
                <span>${pool.tokenA}/${pool.tokenB}</span>
                <span>Liquidity: ${pool.amountA} ${pool.tokenA} + ${pool.amountB} ${pool.tokenB}</span>
                <span>TVL: ${pool.tvl}</span>
                <div class="pool-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="addLiquidity('${pool.id}')">
                        <i class="fas fa-plus"></i> Add
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeLiquidity('${pool.id}')">
                        <i class="fas fa-minus"></i> Remove
                    </button>
                </div>
            </div>
        `;
        myPoolsList.appendChild(poolElement);
    });
}

// Update all pools list
async function updateAllPools() {
    const allPoolsList = document.getElementById('allPoolsList');
    allPoolsList.innerHTML = '';

    if (pools.length === 0) {
        allPoolsList.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">No pools available</td>
            </tr>
        `;
        return;
    }

    pools.forEach(pool => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${pool.tokenA}/${pool.tokenB}</td>
            <td>${pool.tvl}</td>
            <td>${pool.volume}</td>
            <td>${pool.apr}</td>
            <td>${pool.myShare}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="showPoolDetails('${pool.id}')">
                    <i class="fas fa-info-circle"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary" onclick="addLiquidity('${pool.id}')">
                    <i class="fas fa-plus"></i>
                </button>
            </td>
        `;
        allPoolsList.appendChild(row);
    });
}

// Show pool details
function showPoolDetails(poolId) {
    const pool = pools.find(p => p.id === poolId);
    if (!pool) return;

    const details = document.getElementById('poolDetails');
    details.innerHTML = `
        <div class="pool-details">
            <div class="mb-3">
                <h6>Pool Information</h6>
                <div>Pair: ${pool.tokenA}/${pool.tokenB}</div>
                <div>TVL: ${pool.tvl}</div>
                <div>Volume (24h): ${pool.volume}</div>
                <div>APR: ${pool.apr}</div>
            </div>
            <div class="mb-3">
                <h6>My Position</h6>
                <div>Share: ${pool.myShare}</div>
                <div>Value: ${pool.tvl}</div>
                <div>Earned Fees: $0.00</div>
            </div>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('poolDetailsModal'));
    modal.show();
}

// Add liquidity to pool
async function addLiquidity(poolId) {
    alert('Add liquidity feature coming soon!');
}

// Remove liquidity from pool
async function removeLiquidity(poolId) {
    alert('Remove liquidity feature coming soon!');
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
    const hash = window.location.hash.slice(1) || 'overview';
    switchTab(hash);
});

// Token selection handlers
document.getElementById('poolTokenA').addEventListener('change', function() {
    document.getElementById('tokenASymbol').textContent = this.value;
    updateBalances();
});

document.getElementById('poolTokenB').addEventListener('change', function() {
    document.getElementById('tokenBSymbol').textContent = this.value;
    updateBalances();
});

// Search pools
document.getElementById('poolSearch').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredPools = pools.filter(pool => 
        `${pool.tokenA}/${pool.tokenB}`.toLowerCase().includes(searchTerm)
    );
    
    const allPoolsList = document.getElementById('allPoolsList');
    allPoolsList.innerHTML = '';
    
    if (filteredPools.length === 0) {
        allPoolsList.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">No pools found</td>
            </tr>
        `;
        return;
    }
    
    filteredPools.forEach(pool => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${pool.tokenA}/${pool.tokenB}</td>
            <td>${pool.tvl}</td>
            <td>${pool.volume}</td>
            <td>${pool.apr}</td>
            <td>${pool.myShare}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="showPoolDetails('${pool.id}')">
                    <i class="fas fa-info-circle"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary" onclick="addLiquidity('${pool.id}')">
                    <i class="fas fa-plus"></i>
                </button>
            </td>
        `;
        allPoolsList.appendChild(row);
    });
});

// Initialize
window.addEventListener('load', async () => {
    await initializeSolana();
    
    // Connect wallet button
    document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);
    
    // Update initial data
    await updateStats();
    await updateMyPools();
    await updateAllPools();
});

// Function to fetch and display all pools
async function displayAllPools() {
    try {
        const poolsList = document.querySelector('#all-pools .pools-list');
        if (!poolsList) return;

        // Clear existing content
        poolsList.innerHTML = '<div class="loading">Loading pools...</div>';

        // Fetch pools data from Solana network
        const pools = await getAllPools();
        
        if (pools.length === 0) {
            poolsList.innerHTML = '<div class="no-pools">No pools available</div>';
            return;
        }

        // Create HTML for each pool
        const poolsHTML = pools.map(pool => `
            <div class="pool-card">
                <div class="pool-header">
                    <div class="pool-tokens">
                        <img src="${pool.token1.logo}" alt="${pool.token1.symbol}" class="token-logo">
                        <img src="${pool.token2.logo}" alt="${pool.token2.symbol}" class="token-logo">
                        <span>${pool.token1.symbol}/${pool.token2.symbol}</span>
                    </div>
                    <div class="pool-fee">${pool.fee}% fee</div>
                </div>
                <div class="pool-stats">
                    <div class="stat">
                        <span class="label">TVL</span>
                        <span class="value">$${formatNumber(pool.tvl)}</span>
                    </div>
                    <div class="stat">
                        <span class="label">Volume 24h</span>
                        <span class="value">$${formatNumber(pool.volume24h)}</span>
                    </div>
                    <div class="stat">
                        <span class="label">APR</span>
                        <span class="value">${pool.apr}%</span>
                    </div>
                </div>
                <div class="pool-actions">
                    <button onclick="addLiquidity('${pool.address}')" class="btn btn-primary btn-sm">Add Liquidity</button>
                    <button onclick="removeLiquidity('${pool.address}')" class="btn btn-outline-primary btn-sm">Remove</button>
                </div>
            </div>
        `).join('');

        poolsList.innerHTML = poolsHTML;
    } catch (error) {
        console.error('Error displaying pools:', error);
        poolsList.innerHTML = '<div class="error">Error loading pools. Please try again.</div>';
    }
}

// Function to display user's liquidity positions
async function displayUserLiquidity() {
    if (!isWalletConnected()) {
        document.querySelector('#my-liquidity').innerHTML = `
            <div class="connect-prompt">
                <p>Connect your wallet to view your liquidity positions</p>
                <button onclick="connectWallet()" class="btn btn-primary">Connect Wallet</button>
            </div>
        `;
        return;
    }

    try {
        const liquidityContainer = document.querySelector('#my-liquidity .my-pools');
        if (!liquidityContainer) return;

        liquidityContainer.innerHTML = '<div class="loading">Loading your positions...</div>';

        // Fetch user's liquidity positions
        const positions = await getUserLiquidityPositions();

        if (positions.length === 0) {
            liquidityContainer.innerHTML = `
                <div class="no-liquidity">
                    <p>You haven't provided liquidity to any pools yet</p>
                    <button onclick="switchTab('all-pools')" class="btn btn-primary">View Available Pools</button>
                </div>
            `;
            return;
        }

        // Create HTML for each position
        const positionsHTML = positions.map(position => `
            <div class="liquidity-position">
                <div class="position-header">
                    <div class="pool-tokens">
                        <img src="${position.token1.logo}" alt="${position.token1.symbol}" class="token-logo">
                        <img src="${position.token2.logo}" alt="${position.token2.symbol}" class="token-logo">
                        <span>${position.token1.symbol}/${position.token2.symbol}</span>
                    </div>
                    <div class="position-value">$${formatNumber(position.value)}</div>
                </div>
                <div class="position-details">
                    <div class="token-amounts">
                        <div>${formatNumber(position.token1Amount)} ${position.token1.symbol}</div>
                        <div>${formatNumber(position.token2Amount)} ${position.token2.symbol}</div>
                    </div>
                    <div class="position-stats">
                        <div class="stat">
                            <span class="label">Pool Share</span>
                            <span class="value">${position.sharePercent}%</span>
                        </div>
                        <div class="stat">
                            <span class="label">Earned Fees</span>
                            <span class="value">$${formatNumber(position.earnedFees)}</span>
                        </div>
                    </div>
                </div>
                <div class="position-actions">
                    <button onclick="addLiquidity('${position.poolAddress}')" class="btn btn-primary btn-sm">Add</button>
                    <button onclick="removeLiquidity('${position.poolAddress}')" class="btn btn-outline-primary btn-sm">Remove</button>
                </div>
            </div>
        `).join('');

        liquidityContainer.innerHTML = positionsHTML;
    } catch (error) {
        console.error('Error displaying liquidity positions:', error);
        liquidityContainer.innerHTML = '<div class="error">Error loading your positions. Please try again.</div>';
    }
}

// Helper function to format numbers
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
}

// Update displays when tab changes
document.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.slice(1) || 'overview';
    switchTab(hash);
    
    if (hash === 'all-pools') {
        displayAllPools();
    } else if (hash === 'my-liquidity') {
        displayUserLiquidity();
    }
});

// Refresh displays when wallet connection changes
window.addEventListener('walletConnectionChanged', () => {
    const currentTab = window.location.hash.slice(1);
    if (currentTab === 'my-liquidity') {
        displayUserLiquidity();
    }
});

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

// Show error message
function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-danger';
    notification.role = 'alert';
    notification.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(notification, container.firstChild);
    
    setTimeout(() => notification.remove(), 5000);
}
