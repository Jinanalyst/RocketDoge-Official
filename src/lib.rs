use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

declare_id!("2NYZ6qZqng3nAvpetdPQxGSn3yrdif7PPCmHZu281iGB"); // Replace with your generated Program ID

#[program]
pub mod staking_pool {
    use super::*;

    // Stake Deposit
    pub fn stake_deposit(ctx: Context<StakeDeposit>, amount: u64) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let staking_pool_account = &mut ctx.accounts.staking_pool_account;

        // Modify user balance first
        user_account.balance += amount;
        staking_pool_account.total_staked += amount;

        // Now that the mutable borrow is finished, create the transfer context immutably
        let transfer_ctx = ctx.accounts.into_transfer_to_staking_pool(); // Prepare transfer context after mutable borrow
        token::transfer(transfer_ctx, amount)?;

        Ok(())
    }

    // Stake Withdrawal
    pub fn stake_withdraw(ctx: Context<StakeWithdraw>, amount: u64) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let staking_pool_account = &mut ctx.accounts.staking_pool_account;

        // Ensure the user has enough balance to withdraw
        if user_account.balance < amount {
            return Err(ErrorCode::InsufficientFunds.into());
        }

        // Modify user balance first
        user_account.balance -= amount;
        staking_pool_account.total_staked -= amount;

        // Now that the mutable borrow is finished, create the transfer context immutably
        let transfer_ctx = ctx.accounts.into_transfer_to_user(); // Prepare transfer context after mutable borrow
        token::transfer(transfer_ctx, amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct StakeDeposit<'info> {
    #[account(mut)]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub staking_pool_account: Account<'info, StakingPoolAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>, // User's token account
    #[account(mut)]
    pub staking_pool_token_account: Account<'info, TokenAccount>, // Staking pool's token account
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct StakeWithdraw<'info> {
    #[account(mut)]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub staking_pool_account: Account<'info, StakingPoolAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>, // User's token account
    #[account(mut)]
    pub staking_pool_token_account: Account<'info, TokenAccount>, // Staking pool's token account
    pub token_program: Program<'info, Token>,
}

impl<'info> StakeDeposit<'info> {
    fn into_transfer_to_staking_pool(&self) -> CpiContext<'_, '_, '_, 'info, token::Transfer<'info>> {
        let cpi_accounts = token::Transfer {
            from: self.user_token_account.to_account_info(),
            to: self.staking_pool_token_account.to_account_info(),
            authority: self.user_account.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

impl<'info> StakeWithdraw<'info> {
    fn into_transfer_to_user(&self) -> CpiContext<'_, '_, '_, 'info, token::Transfer<'info>> {
        let cpi_accounts = token::Transfer {
            from: self.staking_pool_token_account.to_account_info(),
            to: self.user_token_account.to_account_info(),
            authority: self.staking_pool_account.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

#[account]
pub struct UserAccount {
    pub balance: u64,
    pub token_account: Pubkey,
}

#[account]
pub struct StakingPoolAccount {
    pub total_staked: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds in the user account.")]
    InsufficientFunds,
}