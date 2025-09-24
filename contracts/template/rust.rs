// CastPay Stylus Paymaster Contract
use alloy_primitives::{Address, U256, B256, Bytes};
use alloy_sol_types::{sol, SolCall, SolError, SolEvent};
use stylus_sdk::{
    alloy_primitives::FixedBytes,
    call::Call,
    contract, evm, msg,
    prelude::*,
    storage::{StorageAddress, StorageU256, StorageMap},
};

// Import ERC-20 interface for USDC operations
sol! {
    interface IERC20 {
        function balanceOf(address account) external view returns (uint256);
        function transfer(address to, uint256 amount) external returns (bool);
        function transferFrom(address from, address to, uint256 amount) external returns (bool);
        function approve(address spender, uint256 amount) external returns (bool);
    }

    // ERC-4337 UserOperation struct
    struct UserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        uint256 callGasLimit;
        uint256 verificationGasLimit;
        uint256 preVerificationGas;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        bytes paymasterAndData;
        bytes signature;
    }

    // ERC-4337 ValidationData
    struct ValidationData {
        address aggregator;
        uint48 validAfter;
        uint48 validUntil;
    }

    // Events
    event PaymasterDeposit(address indexed sender, uint256 amount);
    event PaymasterWithdraw(address indexed sender, uint256 amount);
    event UserOperationSponsored(address indexed user, uint256 gasCost, uint256 usdcDeducted);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
}

// Error types
#[derive(SolError)]
pub enum PaymasterError {
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Insufficient USDC balance")]
    InsufficientBalance,
    #[error("Invalid user operation")]
    InvalidUserOperation,
    #[error("Transfer failed")]
    TransferFailed,
    #[error("Already initialized")]
    AlreadyInitialized,
}

#[storage]
#[entrypoint]
pub struct CastPayPaymaster {
    /// Contract owner
    owner: StorageAddress,
    
    /// Entry Point contract address
    entry_point: StorageAddress,
    
    /// USDC token contract address
    usdc_token: StorageAddress,
    
    /// User USDC balances deposited for gas payments
    user_balances: StorageMap<Address, StorageU256>,
    
    /// Gas price oracle (ETH/USD price in 6 decimals)
    eth_usd_price: StorageU256,
    
    /// Fee surcharge (basis points, e.g., 1000 = 10%)
    fee_surcharge: StorageU256,
    
    /// Paused state
    paused: stylus_sdk::storage::StorageBool,
    
    /// Initialized state
    initialized: stylus_sdk::storage::StorageBool,
}

#[public]
impl CastPayPaymaster {
    /// Initialize the contract
    pub fn initialize(
        &mut self,
        entry_point: Address,
        usdc_token: Address,
        initial_eth_price: U256,
    ) -> Result<(), PaymasterError> {
        if self.initialized.get() {
            return Err(PaymasterError::AlreadyInitialized);
        }
        
        self.owner.set(msg::sender());
        self.entry_point.set(entry_point);
        self.usdc_token.set(usdc_token);
        self.eth_usd_price.set(initial_eth_price);
        self.fee_surcharge.set(U256::from(1000)); // 10% default
        self.initialized.set(true);
        
        Ok(())
    }

    /// Deposit USDC for gas sponsorship
    pub fn deposit_usdc(&mut self, amount: U256) -> Result<(), PaymasterError> {
        let user = msg::sender();
        let usdc = IERC20::new(self.usdc_token.get());
        
        // Transfer USDC from user to this contract
        let transfer_result = usdc.transfer_from(Call::new_in(self), user, contract::address(), amount);
        if !transfer_result {
            return Err(PaymasterError::TransferFailed);
        }
        
        // Update user balance
        let current_balance = self.user_balances.get(user).unwrap_or_default();
        self.user_balances.insert(user, current_balance + amount);
        
        // Emit event
        evm::log(PaymasterDeposit {
            sender: user,
            amount,
        });
        
        Ok(())
    }

    /// Withdraw unused USDC balance
    pub fn withdraw_usdc(&mut self, amount: U256) -> Result<(), PaymasterError> {
        let user = msg::sender();
        let current_balance = self.user_balances.get(user).unwrap_or_default();
        
        if current_balance < amount {
            return Err(PaymasterError::InsufficientBalance);
        }
        
        // Update balance
        self.user_balances.insert(user, current_balance - amount);
        
        // Transfer USDC back to user
        let usdc = IERC20::new(self.usdc_token.get());
        let transfer_result = usdc.transfer(Call::new_in(self), user, amount);
        if !transfer_result {
            return Err(PaymasterError::TransferFailed);
        }
        
        // Emit event
        evm::log(PaymasterWithdraw {
            sender: user,
            amount,
        });
        
        Ok(())
    }

    /// ERC-4337 validation function - called by EntryPoint
    pub fn validate_paymaster_user_op(
        &mut self,
        user_op: UserOperation,
        user_op_hash: B256,
        max_cost: U256,
    ) -> Result<(Bytes, U256), PaymasterError> {
        // Only EntryPoint can call this
        if msg::sender() != self.entry_point.get() {
            return Err(PaymasterError::Unauthorized);
        }
        
        let user = user_op.sender;
        let user_balance = self.user_balances.get(user).unwrap_or_default();
        
        // Calculate required USDC amount (convert from ETH cost)
        let usdc_cost = self.calculate_usdc_cost(max_cost)?;
        
        // Check if user has sufficient USDC balance
        if user_balance < usdc_cost {
            return Err(PaymasterError::InsufficientBalance);
        }
        
        // Deduct the cost from user's balance immediately
        self.user_balances.insert(user, user_balance - usdc_cost);
        
        // Emit event
        evm::log(UserOperationSponsored {
            user,
            gasCost: max_cost,
            usdcDeducted: usdc_cost,
        });
        
        // Return validation data (success) and validation result
        let validation_data = ValidationData {
            aggregator: Address::ZERO,
            validAfter: 0,
            validUntil: u48::MAX,
        };
        
        // Pack validation data into bytes
        let packed_validation = self.pack_validation_data(validation_data);
        
        Ok((packed_validation, U256::from(0))) // 0 means valid until
    }

    /// ERC-4337 post-operation function - called after execution
    pub fn post_op(
        &mut self,
        mode: u8,
        context: Bytes,
        actual_gas_cost: U256,
    ) -> Result<(), PaymasterError> {
        // Only EntryPoint can call this
        if msg::sender() != self.entry_point.get() {
            return Err(PaymasterError::Unauthorized);
        }
        
        // If operation failed, we could potentially refund some gas
        // For simplicity, we'll keep the deducted amount regardless
        // In production, you might want to implement partial refunds
        
        Ok(())
    }

    /// Get user's USDC balance available for gas payments
    pub fn get_user_balance(&self, user: Address) -> U256 {
        self.user_balances.get(user).unwrap_or_default()
    }

    /// Check if user can afford a transaction with estimated gas cost
    pub fn can_sponsor(&self, user: Address, estimated_gas_cost: U256) -> bool {
        let user_balance = self.user_balances.get(user).unwrap_or_default();
        match self.calculate_usdc_cost(estimated_gas_cost) {
            Ok(usdc_cost) => user_balance >= usdc_cost,
            Err(_) => false,
        }
    }

    // Owner-only functions
    
    /// Update ETH/USD price (owner only)
    pub fn update_eth_price(&mut self, new_price: U256) -> Result<(), PaymasterError> {
        if msg::sender() != self.owner.get() {
            return Err(PaymasterError::Unauthorized);
        }
        
        self.eth_usd_price.set(new_price);
        Ok(())
    }

    /// Update fee surcharge (owner only)
    pub fn update_fee_surcharge(&mut self, new_surcharge: U256) -> Result<(), PaymasterError> {
        if msg::sender() != self.owner.get() {
            return Err(PaymasterError::Unauthorized);
        }
        
        self.fee_surcharge.set(new_surcharge);
        Ok(())
    }

    /// Emergency pause (owner only)
    pub fn pause(&mut self) -> Result<(), PaymasterError> {
        if msg::sender() != self.owner.get() {
            return Err(PaymasterError::Unauthorized);
        }
        
        self.paused.set(true);
        Ok(())
    }

    /// Unpause (owner only)
    pub fn unpause(&mut self) -> Result<(), PaymasterError> {
        if msg::sender() != self.owner.get() {
            return Err(PaymasterError::Unauthorized);
        }
        
        self.paused.set(false);
        Ok(())
    }

    /// Transfer ownership (owner only)
    pub fn transfer_ownership(&mut self, new_owner: Address) -> Result<(), PaymasterError> {
        if msg::sender() != self.owner.get() {
            return Err(PaymasterError::Unauthorized);
        }
        
        let old_owner = self.owner.get();
        self.owner.set(new_owner);
        
        evm::log(OwnershipTransferred {
            previousOwner: old_owner,
            newOwner: new_owner,
        });
        
        Ok(())
    }

    /// Withdraw contract's ETH balance (for received gas payments)
    pub fn withdraw_eth(&mut self, to: Address, amount: U256) -> Result<(), PaymasterError> {
        if msg::sender() != self.owner.get() {
            return Err(PaymasterError::Unauthorized);
        }
        
        // Transfer ETH to specified address
        let _ = Call::new_in(self).value(amount).call(to, &[]);
        Ok(())
    }

    // View functions