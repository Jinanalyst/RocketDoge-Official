import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    SolletWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
    ConnectionProvider,
    WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

export const network = WalletAdapterNetwork.Devnet;
export const endpoint = clusterApiUrl(network);

export const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new SolletWalletAdapter({ network }),
];

export class WalletConnection {
    static async connect() {
        const wallet = window.solana;
        if (!wallet) {
            throw new Error('No wallet found! Please install a Solana wallet');
        }
        
        try {
            await wallet.connect();
            return wallet;
        } catch (err) {
            console.error('Error connecting to wallet:', err);
            throw err;
        }
    }

    static async disconnect() {
        const wallet = window.solana;
        if (wallet) {
            await wallet.disconnect();
        }
    }

    static async signTransaction(transaction) {
        const wallet = window.solana;
        if (!wallet) {
            throw new Error('No wallet connected');
        }
        
        try {
            const signedTransaction = await wallet.signTransaction(transaction);
            return signedTransaction;
        } catch (err) {
            console.error('Error signing transaction:', err);
            throw err;
        }
    }

    static async getBalance(connection, publicKey) {
        try {
            const balance = await connection.getBalance(publicKey);
            return balance / 1e9; // Convert lamports to SOL
        } catch (err) {
            console.error('Error getting balance:', err);
            throw err;
        }
    }
}
