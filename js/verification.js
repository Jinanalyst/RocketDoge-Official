// Verification Service for RocketDoge Tasks
import { Connection, PublicKey } from '@solana/web3.js';

class VerificationService {
    constructor() {
        this.TRON_API = 'https://api.trongrid.io';
        this.TWITTER_API = 'https://api.twitter.com/2';
        this.TELEGRAM_API = 'https://api.telegram.org';
    }

    async verifySocialFollow(twitterHandle, telegramUsername) {
        try {
            // Check Twitter follow status
            const twitterFollows = await this.checkTwitterFollow(twitterHandle);
            
            // Check Telegram group membership
            const telegramMember = await this.checkTelegramMember(telegramUsername);
            
            return twitterFollows && telegramMember;
        } catch (error) {
            console.error('Social verification error:', error);
            throw new Error('Failed to verify social media follows');
        }
    }

    async verifyBlofinSignup(username) {
        try {
            // Query Blofin API to verify account existence and signup date
            const response = await fetch(`${process.env.BLOFIN_API}/verify_account`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.BLOFIN_API_KEY}`
                },
                body: JSON.stringify({ username })
            });

            if (!response.ok) {
                throw new Error('Failed to verify Blofin account');
            }

            const data = await response.json();
            return data.verified && data.signupDate > new Date(Date.now() - 24 * 60 * 60 * 1000);
        } catch (error) {
            console.error('Blofin verification error:', error);
            throw new Error('Failed to verify Blofin signup');
        }
    }

    async verifyOKXSignup(username) {
        try {
            // Query OKX API to verify account existence and signup date
            const response = await fetch(`${process.env.OKX_API}/verify_account`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OKX_API_KEY}`
                },
                body: JSON.stringify({ username })
            });

            if (!response.ok) {
                throw new Error('Failed to verify OKX account');
            }

            const data = await response.json();
            return data.verified && data.signupDate > new Date(Date.now() - 24 * 60 * 60 * 1000);
        } catch (error) {
            console.error('OKX verification error:', error);
            throw new Error('Failed to verify OKX signup');
        }
    }

    async verifyBlofinDeposit(txId) {
        try {
            // Verify TRON transaction
            const response = await fetch(`${this.TRON_API}/v1/transactions/${txId}`);
            if (!response.ok) {
                throw new Error('Invalid transaction ID');
            }

            const tx = await response.json();
            
            // Verify transaction details
            if (!tx || !tx.ret || tx.ret[0].contractRet !== 'SUCCESS') {
                throw new Error('Transaction failed or not found');
            }

            // Verify it's a TRC20 transfer to Blofin address
            const isValidTransfer = tx.raw_data.contract[0].type === 'TransferContract' &&
                                  tx.raw_data.contract[0].parameter.value.to_address === process.env.BLOFIN_TRON_ADDRESS;

            return isValidTransfer;
        } catch (error) {
            console.error('Blofin deposit verification error:', error);
            throw new Error('Failed to verify Blofin deposit');
        }
    }

    async verifyOKXDeposit(depositInfo) {
        try {
            const [txId, amount, currency] = depositInfo.split(':');
            
            // Query OKX API to verify deposit
            const response = await fetch(`${process.env.OKX_API}/verify_deposit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OKX_API_KEY}`
                },
                body: JSON.stringify({ txId, amount, currency })
            });

            if (!response.ok) {
                throw new Error('Failed to verify OKX deposit');
            }

            const data = await response.json();
            return data.verified && data.amount >= 10;
        } catch (error) {
            console.error('OKX deposit verification error:', error);
            throw new Error('Failed to verify OKX deposit');
        }
    }

    private async checkTwitterFollow(handle) {
        try {
            const response = await fetch(`${this.TWITTER_API}/users/${handle}/following`, {
                headers: {
                    'Authorization': `Bearer ${process.env.TWITTER_API_KEY}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to verify Twitter follow');
            }

            const data = await response.json();
            return data.data.some(follow => follow.id === process.env.ROCKETDOGE_TWITTER_ID);
        } catch (error) {
            console.error('Twitter verification error:', error);
            return false;
        }
    }

    private async checkTelegramMember(username) {
        try {
            const response = await fetch(`${this.TELEGRAM_API}/bot${process.env.TELEGRAM_BOT_TOKEN}/getChatMember`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: process.env.TELEGRAM_GROUP_ID,
                    user_id: username
                })
            });

            if (!response.ok) {
                throw new Error('Failed to verify Telegram membership');
            }

            const data = await response.json();
            return data.ok && ['member', 'administrator', 'creator'].includes(data.result.status);
        } catch (error) {
            console.error('Telegram verification error:', error);
            return false;
        }
    }
}

export const verificationService = new VerificationService();
