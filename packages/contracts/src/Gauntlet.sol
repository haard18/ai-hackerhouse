// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// Minimal ERC-20 surface we need (USDC).
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * Gauntlet — on-chain escrow for betting USDC on competing AI models.
 *
 * Per epoch (default 1 hour), each model has its own USDC pool. Bettors deposit
 * USDC into a model's pool and receive LP-style shares. After the epoch ends,
 * the oracle settles it by reallocating the pot across pools by each model's
 * trading performance (computed off-chain): USDC flows from pools backing weak
 * models into pools backing strong ones. Settlement is CONSERVATION-CHECKED —
 * the new balances must sum to exactly the pot, so the oracle can never mint or
 * burn USDC. Bettors then claim their share of their model's settled pool.
 *
 * Epochs are time-derived: epochId = block.timestamp / epochDuration. Bets land
 * in the current epoch; settlement is allowed once that epoch's window closes.
 */
contract Gauntlet {
    IERC20 public immutable usdc;
    address public owner;
    address public oracle;
    uint256 public immutable epochDuration; // seconds

    // epochId => modelId => pool USDC balance
    mapping(uint256 => mapping(bytes32 => uint256)) public poolBalance;
    // epochId => modelId => total shares
    mapping(uint256 => mapping(bytes32 => uint256)) public poolShares;
    // epochId => modelId => bettor => shares
    mapping(uint256 => mapping(bytes32 => mapping(address => uint256))) public userShares;
    // epochId => total USDC across all pools (invariant the settle must preserve)
    mapping(uint256 => uint256) public epochTotal;
    // epochId => list of models that received bets (for settle coverage)
    mapping(uint256 => bytes32[]) private epochModels;
    mapping(uint256 => mapping(bytes32 => bool)) private modelSeen;
    // epochId => settled?
    mapping(uint256 => bool) public settled;

    uint256 private locked = 1;

    event BetPlaced(uint256 indexed epochId, bytes32 indexed modelId, address indexed bettor, uint256 amount, uint256 shares);
    event EpochSettled(uint256 indexed epochId, uint256 pot);
    event Claimed(uint256 indexed epochId, bytes32 indexed modelId, address indexed bettor, uint256 payout);
    event OracleChanged(address indexed oracle);

    modifier onlyOracle() {
        require(msg.sender == oracle, "not oracle");
        _;
    }

    modifier nonReentrant() {
        require(locked == 1, "reentrant");
        locked = 2;
        _;
        locked = 1;
    }

    constructor(IERC20 _usdc, address _oracle, uint256 _epochDuration) {
        require(address(_usdc) != address(0) && _oracle != address(0), "zero addr");
        require(_epochDuration > 0, "bad duration");
        usdc = _usdc;
        oracle = _oracle;
        owner = msg.sender;
        epochDuration = _epochDuration;
    }

    function setOracle(address _oracle) external {
        require(msg.sender == owner, "not owner");
        require(_oracle != address(0), "zero addr");
        oracle = _oracle;
        emit OracleChanged(_oracle);
    }

    /// The epoch currently open for betting.
    function currentEpoch() public view returns (uint256) {
        return block.timestamp / epochDuration;
    }

    /// Unix timestamp at which `epochId` closes (and can be settled).
    function epochEnd(uint256 epochId) public view returns (uint256) {
        return (epochId + 1) * epochDuration;
    }

    function models(uint256 epochId) external view returns (bytes32[] memory) {
        return epochModels[epochId];
    }

    /// Deposit `amount` USDC onto `modelId` for the current epoch; mint shares.
    function bet(bytes32 modelId, uint256 amount) external nonReentrant returns (uint256 shares) {
        require(amount > 0, "amount=0");
        uint256 epochId = currentEpoch();
        require(!settled[epochId], "epoch settled");

        // Pull USDC first (checks-effects-interactions: external call before we
        // trust the amount; balances updated from the verified transfer).
        uint256 received = _pull(msg.sender, amount);

        uint256 bal = poolBalance[epochId][modelId];
        uint256 ts = poolShares[epochId][modelId];
        // First depositor sets 1 share == 1 USDC unit; later deposits pro-rata.
        shares = ts == 0 ? received : (received * ts) / bal;
        require(shares > 0, "shares=0");

        poolBalance[epochId][modelId] = bal + received;
        poolShares[epochId][modelId] = ts + shares;
        userShares[epochId][modelId][msg.sender] += shares;
        epochTotal[epochId] += received;

        if (!modelSeen[epochId][modelId]) {
            modelSeen[epochId][modelId] = true;
            epochModels[epochId].push(modelId);
        }

        emit BetPlaced(epochId, modelId, msg.sender, received, shares);
    }

    /**
     * Settle a finished epoch by reallocating the pot. `modelIds` must be every
     * model that took a bet this epoch, and `newBalances[i]` its post-redistribution
     * USDC — their sum MUST equal the untouched pot (conservation).
     */
    function settle(uint256 epochId, bytes32[] calldata modelIds, uint256[] calldata newBalances)
        external
        onlyOracle
    {
        require(block.timestamp >= epochEnd(epochId), "epoch live");
        require(!settled[epochId], "already settled");
        require(modelIds.length == newBalances.length, "length mismatch");
        require(modelIds.length == epochModels[epochId].length, "must cover all models");

        uint256 sum;
        for (uint256 i = 0; i < modelIds.length; i++) {
            require(modelSeen[epochId][modelIds[i]], "unknown model");
            poolBalance[epochId][modelIds[i]] = newBalances[i];
            sum += newBalances[i];
        }
        // Zero-sum: no USDC created or destroyed.
        require(sum == epochTotal[epochId], "not conserved");

        settled[epochId] = true;
        emit EpochSettled(epochId, sum);
    }

    /// Redeem all your shares of `modelId` in a settled epoch for USDC.
    function claim(uint256 epochId, bytes32 modelId) external nonReentrant returns (uint256 payout) {
        require(settled[epochId], "not settled");
        uint256 shares = userShares[epochId][modelId][msg.sender];
        require(shares > 0, "no shares");

        uint256 ts = poolShares[epochId][modelId];
        uint256 bal = poolBalance[epochId][modelId];
        payout = (shares * bal) / ts;

        userShares[epochId][modelId][msg.sender] = 0;
        poolShares[epochId][modelId] = ts - shares;
        poolBalance[epochId][modelId] = bal - payout;

        if (payout > 0) require(usdc.transfer(msg.sender, payout), "transfer failed");
        emit Claimed(epochId, modelId, msg.sender, payout);
    }

    /// Pull tokens and return the actual amount received (handles fee-on-transfer).
    function _pull(address from, uint256 amount) private returns (uint256) {
        uint256 before = usdc.balanceOf(address(this));
        require(usdc.transferFrom(from, address(this), amount), "transferFrom failed");
        return usdc.balanceOf(address(this)) - before;
    }
}
