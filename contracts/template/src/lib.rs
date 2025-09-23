// Stylus smart contract for the Farcaster + Arbitrum Mini-App Starter.
// Implements a minimal ERC721 NFT contract with metadata and minting logic.
// Use this file as a template for your own Stylus-based NFT contracts.

#![cfg_attr(not(any(feature = "export-abi", test)), no_std, no_main)]
extern crate alloc;

use stylus_sdk::{alloy_primitives::U256, prelude::*, storage::StorageU256};
use alloc::{string::String, vec::Vec};
use alloc::vec;
use alloc::format;

use openzeppelin_stylus::token::erc721::Erc721;

/// Main contract struct for the Farcaster MiniApp Starter NFT
/// - Inherits ERC721 logic from OpenZeppelin Stylus
/// - Tracks token supply for minting unique token IDs
#[entrypoint]
#[storage]
pub struct FarcasterMiniAppStarterContract {
    /// ERC721 implementation (OpenZeppelin Stylus)
    #[borrow]
    pub erc721: Erc721,
    /// Counter for minted tokens
    pub token_supply: StorageU256,
}

/// Public interface for the contract
/// Implements minting, name, symbol, and tokenURI logic
#[public]
#[inherit(Erc721)]
impl FarcasterMiniAppStarterContract {
    pub fn mint(&mut self) -> Result<(), Vec<u8>> {
        let to = self.vm().msg_sender();
        let token_id = self.token_supply.get() + U256::from(1);
        self.token_supply.set(token_id);
        Ok(self.erc721._mint(to, token_id)?)
    }

    pub fn name(&self) -> Result<String, Vec<u8>> {
        Ok(String::from("Farcaster MiniApp Starter NFT"))
    }

    pub fn symbol(&self) -> Result<String, Vec<u8>> {
        Ok(String::from("FMAS"))
    }

    #[selector(name = "tokenURI")]
    pub fn token_uri(&self, token_id: U256) -> Result<String, Vec<u8>> {
        let image = "/nft.png";
        let metadata = format!(
            r#"{{"name":"Farcaster MiniApp Starter NFT #{}","description":"NFT minted from the Farcaster + Arbitrum Mini-App Starter.","image":"{}"}}"#,
            token_id,
            image
        );
        Ok(metadata)
    }
}

#[cfg(test)]
mod tests {
    use crate::FarcasterMiniAppStarterContract;
    use openzeppelin_stylus::token::erc721::IErc721;
    use stylus_sdk::alloy_primitives::{address, uint};

    #[motsu::test]
    fn initial_balance_is_zero(contract: FarcasterMiniAppStarterContract) {
        let test_address = address!("1234567891234567891234567891234567891234");
        let token_id = uint!(10_U256);

        let _ = contract.erc721._mint(test_address, token_id);
        let owner = contract.erc721.owner_of(token_id).unwrap();
        assert_eq!(owner, test_address);
    }
}