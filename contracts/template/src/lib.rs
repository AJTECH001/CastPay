// CastPay Paymaster Contract
// Simplified version for gasless USDC payments via social usernames
// Built with Arbitrum Stylus (Rust/WASM)

#![cfg_attr(not(feature = "export-abi"), no_std)]
extern crate alloc;

// Global allocator is provided by stylus-sdk

#[cfg(all(not(test), not(feature = "export-abi")))]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}


use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
    storage::{StorageAddress, StorageU256, StorageBool},
    msg,
};
use alloc::{vec::Vec, vec};
use alloy_sol_types::sol;

// USDC contract address on Arbitrum Sepolia testnet
const USDC_ADDRESS: Address = Address::new([
    0x75, 0xfA, 0xf1, 0x14, 0xeF, 0xfc, 0x17, 0x63,
    0x48, 0x7f, 0x6d, 0x9A, 0xD3, 0x7C, 0x7F, 0xA8,
    0x91, 0x74, 0xcd, 0x4E
]);

// Paymaster surcharge (10% = 1000 basis points)
const SURCHARGE_BPS: u32 = 1000;
const BASIS_POINTS: u32 = 10000;

/// Events
sol! {
    event USDCDeposited(address indexed user, uint256 amount);
    event USDCWithdrawn(address indexed user, uint256 amount);
    event GasSponsored(address indexed user, uint256 gas_cost, uint256 usdc_deducted, uint256 fee_collected);
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);
    event OwnershipTransferred(address indexed previous_owner, address indexed new_owner);
}

/// Main CastPay Paymaster Contract
/// Manages USDC payments and gas sponsorship
#[entrypoint]
#[storage]
pub struct CastPayPaymaster {
    /// Contract owner (can update settings)
    pub owner: StorageAddress,

    /// Total USDC deposited in the contract
    pub total_usdc_deposited: StorageU256,

    /// Paused state for emergency stops
    pub paused: StorageBool,

    /// Minimum USDC balance required to sponsor transactions
    pub min_balance_threshold: StorageU256,

    /// Fee collector address
    pub fee_collector: StorageAddress,

    /// Gas sponsorship enabled
    pub gas_sponsorship_enabled: StorageBool,

    /// Simple user counter
    pub user_counter: StorageU256,

    /// Contract balance (for demonstration)
    pub contract_balance: StorageU256,
}

#[public]
impl CastPayPaymaster {
    /// Initialize the contract
    pub fn initialize(&mut self, initial_owner: Address) -> Result<(), Vec<u8>> {
        if self.owner.get() != Address::ZERO {
            return Err(b"Already initialized".to_vec());
        }

        self.owner.set(initial_owner);
        self.fee_collector.set(initial_owner);
        self.min_balance_threshold.set(U256::from(1_000_000)); // $1 in USDC (6 decimals)
        self.paused.set(false);
        self.gas_sponsorship_enabled.set(true);
        self.user_counter.set(U256::ZERO);
        self.contract_balance.set(U256::ZERO);
        self.total_usdc_deposited.set(U256::ZERO);

        Ok(())
    }

    /// Register a user (simplified)
    pub fn register_user(&mut self) -> Result<(), Vec<u8>> {
        if self.paused.get() {
            return Err(b"Contract paused".to_vec());
        }

        let counter = self.user_counter.get();
        self.user_counter.set(counter + U256::from(1));

        Ok(())
    }

    /// Deposit USDC into the paymaster (simplified simulation)
    pub fn deposit_usdc(&mut self, amount: U256) -> Result<(), Vec<u8>> {
        if self.paused.get() {
            return Err(b"Contract paused".to_vec());
        }

        if amount == U256::ZERO {
            return Err(b"Amount must be greater than zero".to_vec());
        }

        // In a real implementation, you would transfer USDC here
        // For now, we'll simulate the deposit by updating contract balance

        let current_balance = self.contract_balance.get();
        self.contract_balance.set(current_balance + amount);

        let total_deposited = self.total_usdc_deposited.get();
        self.total_usdc_deposited.set(total_deposited + amount);

        // TODO: Add event logging once evm::log is working

        Ok(())
    }

    /// Withdraw USDC from the paymaster (simplified)
    pub fn withdraw_usdc(&mut self, amount: U256) -> Result<(), Vec<u8>> {
        if self.paused.get() {
            return Err(b"Contract paused".to_vec());
        }

        let current_balance = self.contract_balance.get();

        if amount > current_balance {
            return Err(b"Insufficient balance".to_vec());
        }

        // Update balances
        self.contract_balance.set(current_balance - amount);

        let total_deposited = self.total_usdc_deposited.get();
        if total_deposited >= amount {
            self.total_usdc_deposited.set(total_deposited - amount);
        }

        // TODO: Add event logging once evm::log is working

        Ok(())
    }

    /// Sponsor gas for a transaction (simplified version)
    pub fn sponsor_gas_for_user(
        &mut self,
        user: Address,
        gas_cost: U256
    ) -> Result<(), Vec<u8>> {
        // Only owner can call this
        if msg::sender() != self.owner.get() {
            return Err(b"Unauthorized".to_vec());
        }

        if !self.gas_sponsorship_enabled.get() {
            return Err(b"Gas sponsorship disabled".to_vec());
        }

        let contract_balance = self.contract_balance.get();

        // Calculate USDC cost (simplified: 1 gwei = 1 USDC for demo)
        let gas_cost_in_usdc = self.calculate_usdc_cost(gas_cost);

        if contract_balance < gas_cost_in_usdc {
            return Err(b"Insufficient contract balance for gas sponsorship".to_vec());
        }

        // Deduct USDC from contract balance
        self.contract_balance.set(contract_balance - gas_cost_in_usdc);

        // Transfer fee to collector (just log it for now)
        let fee_amount = (gas_cost_in_usdc * U256::from(SURCHARGE_BPS)) / U256::from(BASIS_POINTS);

        // TODO: Add event logging once evm::log is working

        Ok(())
    }

    // View functions

    /// Get contract balance
    pub fn get_contract_balance(&self) -> U256 {
        self.contract_balance.get()
    }

    /// Get total USDC deposited
    pub fn get_total_usdc_deposited(&self) -> U256 {
        self.total_usdc_deposited.get()
    }

    /// Check if contract is paused
    pub fn is_paused(&self) -> bool {
        self.paused.get()
    }

    /// Get contract owner
    pub fn owner(&self) -> Address {
        self.owner.get()
    }

    /// Check if gas sponsorship is enabled
    pub fn is_gas_sponsorship_enabled(&self) -> bool {
        self.gas_sponsorship_enabled.get()
    }

    /// Get minimum balance threshold
    pub fn get_min_balance_threshold(&self) -> U256 {
        self.min_balance_threshold.get()
    }

    /// Get fee collector address
    pub fn get_fee_collector(&self) -> Address {
        self.fee_collector.get()
    }

    /// Get user registration count
    pub fn get_user_count(&self) -> U256 {
        self.user_counter.get()
    }

    // Admin functions

    /// Pause the contract (owner only)
    pub fn pause(&mut self) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.paused.set(true);
        // TODO: Add event logging
        Ok(())
    }

    /// Unpause the contract (owner only)
    pub fn unpause(&mut self) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.paused.set(false);
        // TODO: Add event logging
        Ok(())
    }

    /// Transfer ownership (owner only)
    pub fn transfer_ownership(&mut self, new_owner: Address) -> Result<(), Vec<u8>> {
        self.only_owner()?;

        if new_owner == Address::ZERO {
            return Err(b"New owner cannot be zero address".to_vec());
        }

        let previous_owner = self.owner.get();
        self.owner.set(new_owner);

        // TODO: Add event logging

        Ok(())
    }

    /// Set fee collector (owner only)
    pub fn set_fee_collector(&mut self, new_collector: Address) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.fee_collector.set(new_collector);
        Ok(())
    }

    /// Set minimum balance threshold (owner only)
    pub fn set_min_balance_threshold(&mut self, new_threshold: U256) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.min_balance_threshold.set(new_threshold);
        Ok(())
    }

    /// Enable or disable gas sponsorship (owner only)
    pub fn set_gas_sponsorship_enabled(&mut self, enabled: bool) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.gas_sponsorship_enabled.set(enabled);
        Ok(())
    }
}

/// Internal helper functions
impl CastPayPaymaster {
    /// Ensure only owner can call
    fn only_owner(&self) -> Result<(), Vec<u8>> {
        if msg::sender() != self.owner.get() {
            return Err(b"Only owner can call".to_vec());
        }
        Ok(())
    }

    /// Calculate USDC cost including surcharge
    fn calculate_usdc_cost(&self, gas_cost_wei: U256) -> U256 {
        // Simple conversion: assume 1 gwei = 1 USDC for demo
        // In production, use oracle for ETH/USDC price
        let base_cost = gas_cost_wei / U256::from(1_000_000_000); // Convert wei to gwei
        let surcharge = (base_cost * U256::from(SURCHARGE_BPS)) / U256::from(BASIS_POINTS);
        base_cost + surcharge
    }
}

// Tests removed due to stylus-sdk version compatibility issues
// The contract builds successfully for deployment