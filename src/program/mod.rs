pub mod staking_contract;
pub mod staking_pool;

use anchor_lang::prelude::*;

// Program entry point
#[program]
pub mod staking_contract {
    use super::*;
    
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        staking_contract::initialize(ctx)
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        staking_contract::stake(ctx, amount)
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        staking_contract::claim_rewards(ctx)
    }
}
