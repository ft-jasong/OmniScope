// lib.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("6yUy54QMKPVx8iGVid1EoqCBGizzf7JRvKEseQb4usFu");

#[program]
pub mod adr_token {
    use super::*;

    // ADR 토큰 발행 - 최적화된 버전
    pub fn initialize_token(
        ctx: Context<InitializeToken>,
        name: String,
        symbol: String,
        decimals: u8,
        total_supply: u64,
    ) -> Result<()> {
        // 문자열 길이 제한 검증
        require!(name.len() <= 32, ErrorCode::NameTooLong);
        require!(symbol.len() <= 8, ErrorCode::SymbolTooLong);
        
        // 토큰 메타데이터 설정
        let token_info = &mut ctx.accounts.token_info;
        token_info.name = name;
        token_info.symbol = symbol;
        token_info.decimals = decimals;
        token_info.total_supply = total_supply;
        token_info.authority = ctx.accounts.authority.key();

        // 초기 토큰 공급량을 발행자 계정으로 전송
        let cpi_accounts = token::MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::mint_to(cpi_ctx, total_supply)?;
        
        Ok(())
    }

    // 스테이킹 풀 초기화
    pub fn initialize_staking_pool(ctx: Context<InitializeStakingPool>, reward_rate: u64) -> Result<()> {
        let staking_pool = &mut ctx.accounts.staking_pool;
        staking_pool.authority = ctx.accounts.authority.key();
        staking_pool.token_mint = ctx.accounts.token_mint.key();
        staking_pool.staking_vault = ctx.accounts.staking_vault.key();
        staking_pool.reward_rate = reward_rate;
        staking_pool.total_staked = 0;
        
        Ok(())
    }

    // 토큰 스테이킹
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        let staker = &mut ctx.accounts.staker_info;
        let staking_pool = &mut ctx.accounts.staking_pool;
        
        // 현재 시간 기록
        staker.last_update_time = Clock::get()?.unix_timestamp;
        staker.staked_amount = staker.staked_amount.checked_add(amount).unwrap();
        
        // 스테이킹 풀의 총 스테이킹 양 업데이트
        staking_pool.total_staked = staking_pool.total_staked.checked_add(amount).unwrap();
        
        // 사용자의 토큰을 스테이킹 볼트로 전송
        let cpi_accounts = Transfer {
            from: ctx.accounts.staker_token_account.to_account_info(),
            to: ctx.accounts.staking_vault.to_account_info(),
            authority: ctx.accounts.staker.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, amount)?;
        
        Ok(())
    }

    // 스테이킹된 자산에서 차감
    pub fn deduct(ctx: Context<Deduct>, amount: u64) -> Result<()> {
        let staker = &mut ctx.accounts.staker_info;
        let staking_pool = &mut ctx.accounts.staking_pool;
        
        // 충분한 스테이킹 양이 있는지 확인
        require!(staker.staked_amount >= amount, ErrorCode::InsufficientStakedAmount);
        
        // 스테이킹 금액 차감
        staker.staked_amount = staker.staked_amount.checked_sub(amount).unwrap();
        staking_pool.total_staked = staking_pool.total_staked.checked_sub(amount).unwrap();
        
        // 차감된 토큰을 관리자 계정으로 전송
        let seeds = &[
            staking_pool.to_account_info().key.as_ref(),
            &[*ctx.bumps.get("staking_pool").unwrap()],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.staking_vault.to_account_info(),
            to: ctx.accounts.admin_token_account.to_account_info(),
            authority: ctx.accounts.staking_pool.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        token::transfer(cpi_ctx, amount)?;
        
        Ok(())
    }

    // 스테이킹 해제 (인출)
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        let staker = &mut ctx.accounts.staker_info;
        let staking_pool = &mut ctx.accounts.staking_pool;
        
        // 충분한 스테이킹 양이 있는지 확인
        require!(staker.staked_amount >= amount, ErrorCode::InsufficientStakedAmount);
        
        // 스테이킹 금액 차감
        staker.staked_amount = staker.staked_amount.checked_sub(amount).unwrap();
        staking_pool.total_staked = staking_pool.total_staked.checked_sub(amount).unwrap();
        
        // 스테이킹된 토큰을 사용자 계정으로 반환
        let seeds = &[
            staking_pool.to_account_info().key.as_ref(),
            &[*ctx.bumps.get("staking_pool").unwrap()],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.staking_vault.to_account_info(),
            to: ctx.accounts.staker_token_account.to_account_info(),
            authority: ctx.accounts.staking_pool.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        token::transfer(cpi_ctx, amount)?;
        
        Ok(())
    }
}

// 계정 구조체 및 컨텍스트 정의 - 최적화된 버전
#[derive(Accounts)]
#[instruction(name: String, symbol: String, decimals: u8, total_supply: u64)]
pub struct InitializeToken<'info> {
    // 공간 계산 방식 최적화: 8(discriminator) + 36(name) + 12(symbol) + 1(decimals) + 8(total_supply) + 32(authority)
    #[account(
        init,
        payer = authority,
        space = 8 + 36 + 12 + 1 + 8 + 32
    )]
    pub token_info: Account<'info, TokenInfo>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = decimals,
        mint::authority = authority.key(),
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = authority,
    )]
    pub token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(reward_rate: u64)]
pub struct InitializeStakingPool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 8 + 8, // 최적화된 공간 계산
        seeds = [token_mint.key().as_ref()],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,
    
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        token::mint = token_mint,
        token::authority = staking_pool,
    )]
    pub staking_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct Stake<'info> {
    #[account(
        init_if_needed,
        payer = staker,
        space = 8 + 32 + 32 + 8 + 8, // 최적화된 공간 계산
        seeds = [staker.key().as_ref(), staking_pool.key().as_ref()],
        bump
    )]
    pub staker_info: Account<'info, StakerInfo>,
    
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,
    
    #[account(
        mut,
        constraint = staker_token_account.mint == staking_pool.token_mint,
        constraint = staker_token_account.owner == staker.key()
    )]
    pub staker_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = staking_vault.key() == staking_pool.staking_vault
    )]
    pub staking_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub staker: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct Deduct<'info> {
    #[account(
        mut,
        seeds = [staker.key().as_ref(), staking_pool.key().as_ref()],
        bump,
        constraint = staker_info.staker == staker.key(),
        constraint = staker_info.staking_pool == staking_pool.key()
    )]
    pub staker_info: Account<'info, StakerInfo>,
    
    #[account(
        mut,
        seeds = [token_mint.key().as_ref()],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,
    
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = staking_vault.key() == staking_pool.staking_vault
    )]
    pub staking_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = admin_token_account.mint == token_mint.key(),
        constraint = admin_token_account.owner == admin.key()
    )]
    pub admin_token_account: Account<'info, TokenAccount>,
    
    pub staker: AccountInfo<'info>,
    
    #[account(
        constraint = admin.key() == staking_pool.authority
    )]
    pub admin: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct Unstake<'info> {
    #[account(
        mut,
        seeds = [staker.key().as_ref(), staking_pool.key().as_ref()],
        bump,
        constraint = staker_info.staker == staker.key(),
        constraint = staker_info.staking_pool == staking_pool.key()
    )]
    pub staker_info: Account<'info, StakerInfo>,
    
    #[account(
        mut,
        seeds = [token_mint.key().as_ref()],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,
    
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = staking_vault.key() == staking_pool.staking_vault
    )]
    pub staking_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = staker_token_account.mint == token_mint.key(),
        constraint = staker_token_account.owner == staker.key()
    )]
    pub staker_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub staker: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

// 데이터 구조체 - 최적화된 버전
#[account]
pub struct TokenInfo {
    pub name: String,      // 최대 32자로 제한
    pub symbol: String,    // 최대 8자로 제한
    pub decimals: u8,
    pub total_supply: u64,
    pub authority: Pubkey,
}

#[account]
pub struct StakingPool {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub staking_vault: Pubkey,
    pub reward_rate: u64,
    pub total_staked: u64,
}

#[account]
pub struct StakerInfo {
    pub staker: Pubkey,
    pub staking_pool: Pubkey,
    pub staked_amount: u64,
    pub last_update_time: i64,
}

// 에러 코드 - 최적화된 버전
#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient staked amount")]
    InsufficientStakedAmount,
    #[msg("Name too long, maximum 32 characters")]
    NameTooLong,
    #[msg("Symbol too long, maximum 8 characters")]
    SymbolTooLong,
}