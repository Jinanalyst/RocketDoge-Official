use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("J5u7yWDj6qjW6kWLYqxXZ6Ht2Z2JDjtRjJGwUNhR62VV");

#[program]
pub mod staking_pool {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        reward_rate: u64,
        lock_period: i64,
    ) -> Result<()> {
        let staking_pool = &mut ctx.accounts.staking_pool_account;
        staking_pool.authority = ctx.accounts.authority.key();
        staking_pool.total_staked = 0;
        staking_pool.reward_rate = reward_rate;
        staking_pool.lock_period = lock_period;
        staking_pool.token_account = ctx.accounts.staking_pool_token_account.key();
        Ok(())
    }

    pub fn stake_deposit(ctx: Context<StakeDeposit>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let user_account = &mut ctx.accounts.user_account;
        let staking_pool_account = &mut ctx.accounts.staking_pool_account;
        let clock = Clock::get()?;

        if user_account.balance == 0 {
            user_account.owner = ctx.accounts.user.key();
            user_account.token_account = ctx.accounts.user_token_account.key();
            user_account.last_stake_timestamp = clock.unix_timestamp;
        }

        user_account.balance += amount;
        user_account.last_stake_timestamp = clock.unix_timestamp;
        staking_pool_account.total_staked += amount;

        // Transfer tokens from user to pool
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.staking_pool_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn stake_withdraw(ctx: Context<StakeWithdraw>, amount: u64) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let staking_pool_account = &mut ctx.accounts.staking_pool_account;
        let clock = Clock::get()?;

        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(user_account.balance >= amount, ErrorCode::InsufficientFunds);
        
        let time_staked = clock.unix_timestamp - user_account.last_stake_timestamp;
        require!(
            time_staked >= staking_pool_account.lock_period,
            ErrorCode::StakeLocked
        );

        // Calculate rewards
        let rewards = calculate_rewards(
            user_account.balance,
            staking_pool_account.reward_rate,
            time_staked as u64,
        )?;

        if rewards > 0 {
            user_account.rewards_claimed += rewards;
        }

        user_account.balance -= amount;
        staking_pool_account.total_staked -= amount;

        // Transfer tokens from pool to user
        let cpi_accounts = Transfer {
            from: ctx.accounts.staking_pool_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.staking_pool_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    // Advanced staking features
    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let staking_pool_account = &mut ctx.accounts.staking_pool_account;
        
        require!(user_account.balance > 0, ErrorCode::InsufficientFunds);
        
        let amount = user_account.balance;
        user_account.balance = 0;
        staking_pool_account.total_staked -= amount;

        // Emergency withdrawal has a penalty
        let penalty = amount * 10 / 100; // 10% penalty
        let withdraw_amount = amount - penalty;

        // Transfer tokens from pool to user
        let cpi_accounts = Transfer {
            from: ctx.accounts.staking_pool_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.staking_pool_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, withdraw_amount)?;

        Ok(())
    }

    pub fn update_reward_multiplier(
        ctx: Context<UpdateRewardMultiplier>,
        new_multiplier: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.staking_pool_account.authority,
            ErrorCode::Unauthorized
        );
        
        let user_account = &mut ctx.accounts.user_account;
        require!(user_account.balance >= 1000000000, ErrorCode::InsufficientStake); // Minimum 1000 tokens for multiplier
        
        user_account.reward_multiplier = new_multiplier;
        Ok(())
    }

    pub fn compound_rewards(ctx: Context<CompoundRewards>) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let staking_pool_account = &mut ctx.accounts.staking_pool_account;
        let clock = Clock::get()?;

        let time_staked = clock.unix_timestamp - user_account.last_stake_timestamp;
        let rewards = calculate_rewards(
            user_account.balance,
            staking_pool_account.reward_rate,
            time_staked as u64,
        )?;

        require!(rewards > 0, ErrorCode::NoRewardsAvailable);

        user_account.balance += rewards;
        user_account.last_stake_timestamp = clock.unix_timestamp;
        staking_pool_account.total_staked += rewards;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + 8 + 32
    )]
    pub staking_pool_account: Account<'info, StakingPoolAccount>,
    #[account(mut)]
    pub staking_pool_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeDeposit<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8 + 32 + 8 + 8 + 8,
        seeds = [b"user-stake", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub staking_pool_account: Account<'info, StakingPoolAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub staking_pool_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeWithdraw<'info> {
    #[account(
        mut,
        seeds = [b"user-stake", user.key().as_ref()],
        bump,
        constraint = user_account.owner == user.key()
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub staking_pool_account: Account<'info, StakingPoolAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub staking_pool_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(mut)]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub staking_pool_account: Account<'info, StakingPoolAccount>,
    #[account(mut)]
    pub staking_pool_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateRewardMultiplier<'info> {
    #[account(mut)]
    pub user_account: Account<'info, UserAccount>,
    pub staking_pool_account: Account<'info, StakingPoolAccount>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CompoundRewards<'info> {
    #[account(mut)]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub staking_pool_account: Account<'info, StakingPoolAccount>,
    pub user: Signer<'info>,
}

#[account]
pub struct UserAccount {
    pub owner: Pubkey,
    pub balance: u64,
    pub token_account: Pubkey,
    pub last_stake_timestamp: i64,
    pub rewards_claimed: u64,
    pub reward_multiplier: u64,
}

#[account]
pub struct StakingPoolAccount {
    pub authority: Pubkey,
    pub total_staked: u64,
    pub reward_rate: u64,
    pub lock_period: i64,
    pub token_account: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds in the user account.")]
    InsufficientFunds,
    #[msg("Invalid amount specified.")]
    InvalidAmount,
    #[msg("Stake is still locked.")]
    StakeLocked,
    #[msg("Unauthorized access.")]
    Unauthorized,
    #[msg("Insufficient stake for this operation.")]
    InsufficientStake,
    #[msg("No rewards available for compound.")]
    NoRewardsAvailable,
    #[msg("Mathematics operation failed.")]
    MathError,
}

// Helper function to calculate rewards
fn calculate_rewards(
    staked_amount: u64,
    reward_rate: u64,
    time_staked: u64,
) -> Result<u64> {
    // Basic reward calculation: (staked_amount * reward_rate * time_staked) / (100 * 24 * 60 * 60)
    // This gives a daily reward rate percentage
    staked_amount
        .checked_mul(reward_rate)
        .ok_or(ErrorCode::MathError)?
        .checked_mul(time_staked)
        .ok_or(ErrorCode::MathError)?
        .checked_div(100 * 24 * 60 * 60)
        .ok_or(ErrorCode::MathError.into())
}