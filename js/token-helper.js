// Token helper functions for devnet
class TokenHelper {
    constructor(connection) {
        this.connection = connection;
    }

    async createDevnetToken(wallet) {
        try {
            if (!wallet.isConnected()) {
                throw new Error("Please connect your wallet first");
            }

            const mint = await this.createMint(wallet.publicKey);
            const tokenAccount = await this.createTokenAccount(mint, wallet.publicKey);
            
            // Mint some tokens to the account
            await this.mintTo(mint, tokenAccount, wallet.publicKey, 1000000000); // 1000 tokens with 6 decimals

            return {
                mint: mint.toBase58(),
                tokenAccount: tokenAccount.toBase58()
            };
        } catch (error) {
            console.error("Error creating devnet token:", error);
            throw error;
        }
    }

    async createMint(authority) {
        const mint = web3.Keypair.generate();
        const lamports = await this.connection.getMinimumBalanceForRentExemption(
            web3.MintLayout.span
        );

        const transaction = new web3.Transaction().add(
            web3.SystemProgram.createAccount({
                fromPubkey: authority,
                newAccountPubkey: mint.publicKey,
                space: web3.MintLayout.span,
                lamports,
                programId: web3.TOKEN_PROGRAM_ID,
            }),
            web3.TokenProgram.initializeMint({
                mint: mint.publicKey,
                decimals: 6,
                mintAuthority: authority,
            })
        );

        await this.connection.sendTransaction(transaction, [mint]);
        return mint.publicKey;
    }

    async createTokenAccount(mint, owner) {
        const tokenAccount = web3.Keypair.generate();
        const lamports = await this.connection.getMinimumBalanceForRentExemption(
            web3.AccountLayout.span
        );

        const transaction = new web3.Transaction().add(
            web3.SystemProgram.createAccount({
                fromPubkey: owner,
                newAccountPubkey: tokenAccount.publicKey,
                space: web3.AccountLayout.span,
                lamports,
                programId: web3.TOKEN_PROGRAM_ID,
            }),
            web3.TokenProgram.initializeAccount({
                account: tokenAccount.publicKey,
                mint,
                owner,
            })
        );

        await this.connection.sendTransaction(transaction, [tokenAccount]);
        return tokenAccount.publicKey;
    }

    async mintTo(mint, destination, authority, amount) {
        const transaction = new web3.Transaction().add(
            web3.TokenProgram.mintTo({
                mint,
                destination,
                authority,
                amount,
            })
        );

        await this.connection.sendTransaction(transaction, []);
    }

    async getTokenBalance(tokenAccount) {
        const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
        return accountInfo.value.uiAmount;
    }
}

// Export for use in other files
window.TokenHelper = TokenHelper;
