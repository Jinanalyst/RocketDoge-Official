use anchor_lang::prelude::*;

#[account]
pub struct StakingPool {
    pub total_staked: u64,
    pub reward_rate: u64,
}
