import { 
    clusterApiUrl, 
    Connection, 
    Keypair, 
    LAMPORTS_PER_SOL, 
    PublicKey 
} from '@solana/web3.js';
import { 
    createMint, 
    getOrCreateAssociatedTokenAccount, 
    mintTo, 
    TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import fs from 'fs';

// Initialize connection to devnet
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// Create or load keypair
async function getOrCreateKeypair(path) {
    try {
        if (fs.existsSync(path)) {
            const keypairData = JSON.parse(fs.readFileSync(path, 'utf-8'));
            return Keypair.fromSecretKey(new Uint8Array(keypairData));
        } else {
            const keypair = Keypair.generate();
            fs.writeFileSync(path, JSON.stringify(Array.from(keypair.secretKey)));
            return keypair;
        }
    } catch (error) {
        console.error('Error managing keypair:', error);
        throw error;
    }
}

// Request airdrop of SOL
async function requestAirdrop(publicKey, amount = 2) {
    try {
        const signature = await connection.requestAirdrop(
            publicKey,
            amount * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(signature);
        console.log(`Airdropped ${amount} SOL to ${publicKey.toString()}`);
    } catch (error) {
        console.error('Error requesting airdrop:', error);
        throw error;
    }
}

// Create a new token mint
async function createTestToken(authority, decimals, name) {
    try {
        console.log(`Creating ${name} token...`);
        const mint = await createMint(
            connection,
            authority,
            authority.publicKey,
            authority.publicKey,
            decimals,
            undefined,
            undefined,
            TOKEN_PROGRAM_ID
        );
        console.log(`Created ${name} token mint: ${mint.toString()}`);
        return mint;
    } catch (error) {
        console.error(`Error creating ${name} token:`, error);
        throw error;
    }
}

// Create token account and mint tokens
async function mintTestTokens(mint, authority, recipient, amount, decimals) {
    try {
        // Create token account for recipient
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            authority,
            mint,
            recipient
        );
        console.log(`Token account: ${tokenAccount.address.toString()}`);

        // Mint tokens
        const mintAmount = amount * (10 ** decimals);
        await mintTo(
            connection,
            authority,
            mint,
            tokenAccount.address,
            authority,
            mintAmount
        );
        console.log(`Minted ${amount} tokens to ${recipient.toString()}`);
        return tokenAccount;
    } catch (error) {
        console.error('Error minting tokens:', error);
        throw error;
    }
}

// Main function to set up test tokens
async function main() {
    try {
        // Get or create authority keypair
        const authority = await getOrCreateKeypair('./authority-keypair.json');
        console.log('Authority pubkey:', authority.publicKey.toString());

        // Request SOL airdrop if needed
        const balance = await connection.getBalance(authority.publicKey);
        if (balance < LAMPORTS_PER_SOL) {
            await requestAirdrop(authority.publicKey);
        }

        // Create RDOGE token
        const rdogeMint = await createTestToken(authority, 9, 'RDOGE');
        
        // Create test wallet (you'll transfer tokens to your actual wallet)
        const testWallet = await getOrCreateKeypair('./test-wallet-keypair.json');
        console.log('Test wallet pubkey:', testWallet.publicKey.toString());
        
        // Mint RDOGE tokens to test wallet
        await mintTestTokens(rdogeMint, authority, testWallet.publicKey, 1000000, 9);

        // Save token information
        const tokenInfo = {
            rdogeMint: rdogeMint.toString(),
            authority: authority.publicKey.toString(),
            testWallet: testWallet.publicKey.toString()
        };
        fs.writeFileSync('./token-info.json', JSON.stringify(tokenInfo, null, 2));
        console.log('Token information saved to token-info.json');

    } catch (error) {
        console.error('Error in main:', error);
    }
}

main();
