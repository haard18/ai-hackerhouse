# @gauntlet/contracts

On-chain USDC betting for Gauntlet. Bettors stake USDC on competing AI models;
at each epoch's end the pot is redistributed across model pools by trading
performance, then redeemed. Built with Foundry, targeting **Base Sepolia**.

## Economic model (per-model pools + redistribution)

- Epoch = `epochDuration` seconds (default **1 hour**); `epochId = block.timestamp / epochDuration`.
- `bet(modelId, amount)` deposits USDC into a model's pool and mints LP-style shares.
- After the epoch closes, the oracle calls `settle(epochId, modelIds, newBalances)`
  with each pool's post-redistribution USDC. Off-chain the oracle computes
  `newPoolᵢ = T · (Pᵢ · gᵢ) / Σ(Pⱼ · gⱼ)`, where `T` = pot, `Pᵢ` = bets on model
  *i*, `gᵢ = max(0, 1 + epochReturnᵢ)`.
- The contract enforces **`Σ newBalances == pot`** — zero-sum; the oracle can
  never mint or burn USDC.
- `claim(epochId, modelId)` redeems shares for `shares / totalShares × poolBalance`.

`modelId` is the `bytes32` of the model id string (e.g. `"m_chatgpt"`).

## Develop

```bash
forge build
forge test -vv
```

## Deploy (Base Sepolia)

```bash
export ORACLE_ADDRESS=0x...        # backend signer that settles epochs
# export USDC_ADDRESS=0x...        # optional: real USDC; omit to deploy MockUSDC faucet
forge script script/Deploy.s.sol \
  --rpc-url "$BASE_SEPOLIA_RPC" --private-key "$DEPLOYER_KEY" --broadcast
```

- Omitting `USDC_ADDRESS` deploys `MockUSDC` — an **open faucet** (`mint(to, amount)`)
  so anyone can grab test USDC for the demo.
- Base Sepolia's real Circle USDC is `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
  if you'd rather use it.

## Wiring (next steps)

- **Backend oracle**: after each epoch, the engine computes per-model returns →
  call `settle(...)` from the `ORACLE_ADDRESS` key.
- **Auth**: SIWE — wallet address replaces the handle login.
- **Frontend**: `wagmi` + `viem` — connect, `approve` USDC, `bet`, `claim`.

> Testnet only. Real-money deployment is a separate compliance decision.
