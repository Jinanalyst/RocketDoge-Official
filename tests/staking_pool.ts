import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { StakingPool } from "../target/types/staking_pool";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";

describe("staking_pool", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.StakingPool as Program<StakingPool>;
  let mint: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let poolTokenAccount: anchor.web3.PublicKey;
  let stakingPoolAccount: anchor.web3.Keypair;
  let userAccount: anchor.web3.PublicKey;
  
  before(async () => {
    // Create mint
    mint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      9
    );

    // Create user token account
    userTokenAccount = await createAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      provider.wallet.publicKey
    );

    // Create pool token account
    poolTokenAccount = await createAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      provider.wallet.publicKey
    );

    // Mint some tokens to user
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      userTokenAccount,
      provider.wallet.publicKey,
      1000000000 // 1000 tokens
    );

    stakingPoolAccount = anchor.web3.Keypair.generate();
    
    // Derive PDA for user account
    [userAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("user-stake"),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );
  });

  it("Initializes the staking pool", async () => {
    await program.methods
      .initializePool(new anchor.BN(10), new anchor.BN(86400)) // 10% daily, 1 day lock
      .accounts({
        authority: provider.wallet.publicKey,
        stakingPoolAccount: stakingPoolAccount.publicKey,
        stakingPoolTokenAccount: poolTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  });

  it("Stakes tokens", async () => {
    await program.methods
      .stakeDeposit(new anchor.BN(500000000)) // Stake 500 tokens
      .accounts({
        user: provider.wallet.publicKey,
        userAccount,
        stakingPoolAccount: stakingPoolAccount.publicKey,
        userTokenAccount,
        stakingPoolTokenAccount: poolTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  });

  it("Updates reward multiplier", async () => {
    await program.methods
      .updateRewardMultiplier(new anchor.BN(2)) // 2x multiplier
      .accounts({
        userAccount,
        stakingPoolAccount: stakingPoolAccount.publicKey,
        authority: provider.wallet.publicKey,
      })
      .rpc();
  });

  it("Compounds rewards", async () => {
    // Wait for some time to accrue rewards
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await program.methods
      .compoundRewards()
      .accounts({
        userAccount,
        stakingPoolAccount: stakingPoolAccount.publicKey,
        user: provider.wallet.publicKey,
      })
      .rpc();
  });

  it("Emergency withdraws with penalty", async () => {
    await program.methods
      .emergencyWithdraw()
      .accounts({
        user: provider.wallet.publicKey,
        userAccount,
        stakingPoolAccount: stakingPoolAccount.publicKey,
        userTokenAccount,
        stakingPoolTokenAccount: poolTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  });
});
