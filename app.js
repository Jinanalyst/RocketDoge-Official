// Solana connection and program variables
let connection;
let wallet;
const STAKING_TOKEN = '255Tez4EL5Kv36fMwbWCZDMkPCGLZRtM46qLyxWaTZaa'; // RocketDoge devnet token
const REWARDS_PER_EPOCH = 100; // Rewards per epoch in tokens
const EPOCH_DURATION = 24 * 60 * 60; // 24 hours in seconds
const TOKEN_DECIMALS = 9;

// Token ratio configuration (5:1 devnet to mainnet)
const DEVNET_RATIO = 5;

// Token distribution constants
const AIRDROP_AMOUNT = 1000; // Amount in devnet tokens

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
function initializeSolana() {
    connection = new solanaWeb3.Connection(
        solanaWeb3.clusterApiUrl('devnet'),
        'confirmed'
    );
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

// Connect to Phantom Wallet
async function connectWallet() {
    try {
        const provider = getProvider();
        
        if (provider) {
            try {
                const response = await provider.connect();
                wallet = response.publicKey;
                console.log('Connected with Public Key:', wallet.toString());
                
                // Update UI after successful connection
                updateWalletUI(wallet.toString());
                updateUI();
                
                // Listen for wallet disconnection
                provider.on('disconnect', () => {
                    console.log('Wallet disconnected');
                    wallet = null;
                    updateWalletUI();
                });
                
                return;
            } catch (error) {
                console.error('User rejected the connection:', error);
                updateWalletUI();
            }
        }
    } catch (error) {
        console.error('Error connecting to Phantom wallet:', error);
        alert('Failed to connect wallet. Please try again.');
        updateWalletUI();
    }
}

// Update UI with user's data
async function updateUI() {
    try {
        if (!wallet) {
            console.log('Wallet not connected');
            return;
        }

        // Get token balance
        const tokenBalance = await getTokenBalance();
        const formattedBalance = formatTokenAmount(tokenBalance);
        document.getElementById('userBalance').textContent = `${formattedBalance.devnet} RDOGE (${formattedBalance.mainnet} mainnet)`;
        
        // Get staked amount
        const stakedAmount = await getStakedAmount();
        const formattedStaked = formatTokenAmount(stakedAmount);
        document.getElementById('stakedAmount').textContent = `${formattedStaked.devnet} RDOGE (${formattedStaked.mainnet} mainnet)`;
        
        // Get rewards earned
        const rewards = await getRewards();
        const formattedRewards = formatTokenAmount(rewards);
        document.getElementById('rewardsEarned').textContent = `${formattedRewards.devnet} RDOGE (${formattedRewards.mainnet} mainnet)`;
        
        // Update staking details
        updateStakingDetails();
    } catch (error) {
        console.error('Error updating UI:', error);
    }
}

// Get token balance
async function getTokenBalance() {
    try {
        const tokenAccount = await connection.getParsedTokenAccountsByOwner(wallet, {
            mint: new solanaWeb3.PublicKey(STAKING_TOKEN)
        });
        
        if (tokenAccount.value.length > 0) {
            const balance = tokenAccount.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            return balance;
        }
        return 0;
    } catch (error) {
        console.error('Error getting token balance:', error);
        return 0;
    }
}

// Calculate rewards based on staked amount and time
function calculateRewards(stakedAmount, stakingDuration) {
    const epochs = stakingDuration / EPOCH_DURATION;
    return (stakedAmount * REWARDS_PER_EPOCH * epochs) / 100; // 100% APR base rate
}

// Stake tokens
async function stakeTokens() {
    try {
        const amount = document.getElementById('stakeAmount').value;
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount to stake');
            return;
        }

        // Convert input amount considering decimals
        const stakingAmount = amount * Math.pow(10, TOKEN_DECIMALS);
        
        // Get the associated token account
        const stakingTokenAccount = await createAssociatedTokenAccountIfNeeded(
            wallet,
            STAKING_TOKEN
        );

        // Create staking instruction
        const stakingInstruction = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: wallet, isSigner: true, isWritable: true },
                { pubkey: stakingTokenAccount, isSigner: false, isWritable: true },
                { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: solanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
                { pubkey: solanaWeb3.SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
            ],
            programId: new solanaWeb3.PublicKey(STAKING_TOKEN),
            data: Buffer.from([
                1, // Instruction index for stake
                ...new Uint8Array(new BigUint64Array([BigInt(stakingAmount)]).buffer)
            ])
        });

        const transaction = new solanaWeb3.Transaction().add(stakingInstruction);
        
        const provider = getProvider();
        const signature = await provider.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signature.signature);
        
        alert('Staking successful! Your tokens are now earning rewards.');
        updateUI();
    } catch (error) {
        console.error('Error staking tokens:', error);
        alert('Failed to stake tokens. Please try again.');
    }
}

// Unstake tokens
async function unstake(stakeId) {
    try {
        const stakingTokenAccount = await createAssociatedTokenAccountIfNeeded(
            wallet,
            STAKING_TOKEN
        );

        // Create unstaking instruction
        const unstakingInstruction = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: wallet, isSigner: true, isWritable: true },
                { pubkey: stakingTokenAccount, isSigner: false, isWritable: true },
                { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: solanaWeb3.SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
            ],
            programId: new solanaWeb3.PublicKey(STAKING_TOKEN),
            data: Buffer.from([
                2, // Instruction index for unstake
                ...new Uint8Array(new BigUint64Array([BigInt(stakeId)]).buffer)
            ])
        });

        const transaction = new solanaWeb3.Transaction().add(unstakingInstruction);
        
        const provider = getProvider();
        const signature = await provider.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signature.signature);
        
        alert('Unstaking successful! Your tokens and rewards have been returned.');
        updateUI();
    } catch (error) {
        console.error('Error unstaking tokens:', error);
        alert('Failed to unstake tokens. Please try again.');
    }
}

// Get staked amount
async function getStakedAmount() {
    try {
        const stakingAccount = await connection.getAccountInfo(
            await getStakingAccountAddress(wallet)
        );

        if (!stakingAccount) return 0;

        // Parse the staking account data to get staked amount
        const stakedAmount = stakingAccount.data.readBigUInt64LE(8) / BigInt(Math.pow(10, TOKEN_DECIMALS));
        return Number(stakedAmount);
    } catch (error) {
        console.error('Error getting staked amount:', error);
        return 0;
    }
}

// Get rewards
async function getRewards() {
    try {
        const stakingAccount = await connection.getAccountInfo(
            await getStakingAccountAddress(wallet)
        );

        if (!stakingAccount) return 0;

        // Get staking timestamp and amount
        const stakingTimestamp = stakingAccount.data.readBigUInt64LE(0);
        const stakedAmount = stakingAccount.data.readBigUInt64LE(8);
        
        // Calculate duration in seconds
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const stakingDuration = Number(currentTime - stakingTimestamp);
        
        // Calculate rewards
        return calculateRewards(
            Number(stakedAmount) / Math.pow(10, TOKEN_DECIMALS),
            stakingDuration
        );
    } catch (error) {
        console.error('Error getting rewards:', error);
        return 0;
    }
}

// Helper function to get staking account address
async function getStakingAccountAddress(walletAddress) {
    const seed = Buffer.from('staking');
    return solanaWeb3.PublicKey.createWithSeed(
        walletAddress,
        seed.toString(),
        new solanaWeb3.PublicKey(STAKING_TOKEN)
    );
}

// Create associated token account if it doesn't exist
async function createAssociatedTokenAccountIfNeeded(wallet, tokenMint) {
    try {
        const associatedTokenAddress = await solanaWeb3.Token.getAssociatedTokenAddress(
            new solanaWeb3.AssociatedTokenProgram.ASSOCIATED_TOKEN_PROGRAM_ID,
            new solanaWeb3.Token.TOKEN_PROGRAM_ID,
            new solanaWeb3.PublicKey(tokenMint),
            wallet
        );

        // Check if the account exists
        const account = await connection.getAccountInfo(associatedTokenAddress);
        
        if (!account) {
            const transaction = new solanaWeb3.Transaction().add(
                solanaWeb3.Token.createAssociatedTokenAccountInstruction(
                    new solanaWeb3.AssociatedTokenProgram.ASSOCIATED_TOKEN_PROGRAM_ID,
                    new solanaWeb3.Token.TOKEN_PROGRAM_ID,
                    new solanaWeb3.PublicKey(tokenMint),
                    associatedTokenAddress,
                    wallet,
                    wallet
                )
            );

            const provider = getProvider();
            const signature = await provider.signAndSendTransaction(transaction);
            await connection.confirmTransaction(signature.signature);
        }

        return associatedTokenAddress;
    } catch (error) {
        console.error('Error creating associated token account:', error);
        throw error;
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
            STAKING_TOKEN
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

// Update staking details table
async function updateStakingDetails() {
    try {
        // Implement getting staking details from your program
        const tableBody = document.getElementById('stakingDetails');
        tableBody.innerHTML = '';
        
        // Example row structure with ratio conversion:
        /*
        stakingInfo.forEach(info => {
            const formattedAmount = formatTokenAmount(info.amount);
            const formattedReward = formatTokenAmount(info.expectedReward);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formattedAmount.devnet} RDOGE (${formattedAmount.mainnet} mainnet)</td>
                <td>${new Date(info.startTime * 1000).toLocaleDateString()}</td>
                <td>${new Date(info.endTime * 1000).toLocaleDateString()}</td>
                <td>${formattedReward.devnet} RDOGE (${formattedReward.mainnet} mainnet)</td>
                <td>${info.isActive ? 'Active' : 'Ended'}</td>
                <td>
                    ${info.isActive ? 
                        `<button class="btn btn-sm btn-primary" onclick="unstake('${info.stakeId}')">Unstake</button>` :
                        'Completed'}
                </td>
            `;
            tableBody.appendChild(row);
        });
        */
    } catch (error) {
        console.error('Error updating staking details:', error);
    }
}

// Event listeners
document.getElementById('walletBtn').addEventListener('click', connectWallet);
document.getElementById('airdropBtn').addEventListener('click', distributeDevnetTokens);
document.getElementById('stakeButton').addEventListener('click', stakeTokens);

// Initialize Solana connection on page load
window.addEventListener('load', () => {
    initializeSolana();
    updateWalletUI();
    
    // Auto-connect if wallet is already authorized
    const provider = getProvider();
    if (provider && provider.isConnected) {
        connectWallet();
    }
});
