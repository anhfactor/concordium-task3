//! # A Concordium V1 smart contract
use concordium_std::*;
use core::fmt::Debug;

/// The state of donation
#[derive(Debug, Serialize, PartialEq, Eq, Clone, Copy)]
enum DonationState {
    /// Allows for CCD to be donate.
    Active,
    /// The donation closed, preventing further CCD to be donated.
    Closed,
}

/// Setup a active donation
#[init(contract = "donation")]
fn init<S: HasStateApi>(
    _ctx: &impl HasInitContext,
    _state_builder: &mut StateBuilder<S>,
) -> InitResult<DonationState> {
    // Always succeeds
    Ok(DonationState::Active)
}

/// Insert some CCD into a donation, allowed by anyone.
#[receive(contract = "donation", name = "give", payable)]
fn donation_give<S: HasStateApi>(
    _ctx: &impl HasReceiveContext,
    host: &impl HasHost<DonationState, StateApiType = S>,
    _amount: Amount,
) -> ReceiveResult<()> {
    // Ensure state is active for CCD to donate
    ensure!(*host.state() == DonationState::Active);
    Ok(())
}

/// Closed donation, only allowed by the owner.
#[receive(contract = "donation", name = "closed", mutable)]
fn donation_closed<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &mut impl HasHost<DonationState, StateApiType = S>,
) -> Result<(), Error> {

    let owner = ctx.owner();
    let sender = ctx.sender();

    // Ensure only the owner can close.
    ensure!(sender.matches_account(&owner), Error::NotOwner);
    // Ensure the donation has not been closed already.
    ensure!(*host.state() == DonationState::Active, Error::AlreadyClosed);
    // Set the state to be closed.
    *host.state_mut() = DonationState::Closed;

    // Get the current balance of the smart contract.
    let balance = host.self_balance();

    // Transfer the whole balance to the contract owner.
    let transfer_result = host.invoke_transfer(&owner, balance);
    // The transfer can never fail, since the owner is known to exist, and the
    // contract has sufficient balance.
    ensure!(transfer_result.is_ok(), Error::TransferError);

    Ok(())
}

/// View the state and balance of donation
#[receive(contract = "donation", name = "view")]
fn donation_view<S: HasStateApi>(
    _ctx: &impl HasReceiveContext,
    host: &impl HasHost<DonationState, StateApiType = S>,
) -> ReceiveResult<(DonationState, Amount)> {
    let current_state = *host.state();
    let current_balance = host.self_balance();
    Ok((current_state, current_balance))
}

// Smart contract errors.
#[derive(Debug, PartialEq, Eq, Reject, Serial)]
enum Error {
    NotOwner,
    AlreadyClosed,
    TransferError, 
}

// Unit tests
#[concordium_cfg_test]
mod tests {
    use super::*;
    // Pulling in the testing utils found in concordium_std.
    use test_infrastructure::*;

    // Running the initialization ensuring nothing fails and the state of the
    #[concordium_test]
    fn test_init() {
        // Setup
        let ctx = TestInitContext::empty();
        let mut state_builder = TestStateBuilder::new();

        // Call the init function
        let state_result = init(&ctx, &mut state_builder);

        // Inspect the result
        let state = state_result.expect_report("Contract initialization results in error.");

        claim_eq!(
            state,
            DonationState::Active,
            "Donation state should be active after initialization."
        );
    }

    #[concordium_test]
    fn test_give_active() {
        // Setup
        let ctx = TestReceiveContext::empty();
        let host = TestHost::new(DonationState::Active, TestStateBuilder::new());
        let amount = Amount::from_micro_ccd(10);

        // Trigger the give
        let result = donation_give(&ctx, &host, amount);

        claim!(result.is_ok(), "Give CCD results in error");
        assert_eq!(
            *host.state(),
            DonationState::Active,
            "Donation state should still be active."
        );
    }

    #[concordium_test]
    fn test_give_closed() {
        // Setup
        let ctx = TestReceiveContext::empty();
        let amount = Amount::from_micro_ccd(100);
        let host = TestHost::new(DonationState::Closed, TestStateBuilder::new());

        // Trigger the give
        let result = donation_give(&ctx, &host, amount);

        // Inspect the result
        claim!(result.is_err(), "Should fail when donation is closed.");
    }

    #[concordium_test]
    fn test_closed() {
        // Setup the context

        let mut ctx = TestReceiveContext::empty();
        let owner = AccountAddress([0u8; 32]);
        ctx.set_owner(owner);
        let sender = Address::Account(owner);
        ctx.set_sender(sender);
        let mut host = TestHost::new(DonationState::Active, TestStateBuilder::new());
        let balance = Amount::from_micro_ccd(10);
        host.set_self_balance(balance);

        // Trigger closed
        let result = donation_closed(&ctx, &mut host);

        // Inspect the result
        claim!(result.is_ok(), "Close donation results in error.");
        claim_eq!(*host.state(), DonationState::Closed, "Donation should be closed.");
        claim_eq!(
            host.get_transfers(),
            [(owner, balance)],
            "Closed did not produce the correct transfers."
        );
    }

    #[concordium_test]
    fn test_closed_not_owner() {
        // Setup the context

        let mut ctx = TestReceiveContext::empty();
        let owner = AccountAddress([0u8; 32]);
        ctx.set_owner(owner);
        let sender = Address::Account(AccountAddress([1u8; 32]));
        ctx.set_sender(sender);
        let mut host = TestHost::new(DonationState::Active, TestStateBuilder::new());
        let balance = Amount::from_micro_ccd(10);
        host.set_self_balance(balance);

        // Trigger the close
        let result = donation_closed(&ctx, &mut host);

        claim_eq!(result, Err(Error::NotOwner), "Expected to fail with error NotOwner.");
    }

    #[concordium_test]
    fn test_close_closed() {
        // Setup the context
        let mut ctx = TestReceiveContext::empty();
        let owner = AccountAddress([0u8; 32]);
        ctx.set_owner(owner);
        let sender = Address::Account(owner);
        ctx.set_sender(sender);
        let mut host = TestHost::new(DonationState::Closed, TestStateBuilder::new());
        let balance = Amount::from_micro_ccd(10);
        host.set_self_balance(balance);

        // Trigger the close
        let result = donation_closed(&ctx, &mut host);

        claim_eq!(
            result,
            Err(Error::AlreadyClosed),
            "Expected to fail with error AlreadyClosed."
        );
    }

    #[concordium_test]
    fn test_view() {
        // Setup the context.
        let ctx = TestReceiveContext::empty();
        let mut host = TestHost::new(DonationState::Active, TestStateBuilder::new());
        let self_balance = Amount::from_ccd(100);
        host.set_self_balance(self_balance);

        // Call the view function.
        let result = donation_view(&ctx, &host);

        // Check the result.
        claim_eq!(result, Ok((DonationState::Active, self_balance)));
    }
}