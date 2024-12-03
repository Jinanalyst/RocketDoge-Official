use anchor_lang::prelude::*;
use crate::staking_pool::StakingPool; // Import the staking pool logic

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = StakingPool::LEN)]
    pub staking_pool: Account<'info, StakingPool>,
    #[account(signer)]
    pub user: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,
    #[account(mut)]
    pub user: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,
    #[account(mut)]
    pub user: AccountInfo<'info>,
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;
    staking_pool.total_staked = 0;
    staking_pool.reward_rate = 1000; // Example reward rate
    Ok(())
}

pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;
    staking_pool.total_staked += amount;
    Ok(())
}

pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;
    let user = &mut ctx.accounts.user;
    // Implement reward logic here (e.g., distribute tokens based on staked amount)
    Ok(())
}
