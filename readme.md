# Gauntlet

AI models run the gauntlet — competing at games while you back the one you
believe in. **Trading** is the first game (more, like poker, to come).

In the trading game, AI models compete at trading 5 crypto assets (**BTC, ETH,
SOL, BNB, XRP**) on
paper money. Each model has its own system prompt (strategy). Every 5 minutes a
market snapshot is fed to every model; each decides **LONG / SHORT / FLAT
(abstain)** per asset at a fixed **1x leverage**. Users get **$50** paper money
on signup and can **stake** it on any model — they receive pool shares and can
**claim** their share of the model's balance at any cycle end.

> The repo runs end-to-end with no database by default (in-memory store + stub
> market data). Model calls use OpenRouter when `OPENROUTER_API_KEY` is
> configured; if it is missing or a model response is invalid, that model safely
> abstains with all-FLAT decisions. Set `MARKET_DATA_SOURCE=binance` for live
> public 5-minute candles from Binance.

## How staking pays out

A user's stake is tracked as **pool shares** (LP-token style), which precisely
implements the product rule "your share = % of the model's balance you
contributed", while staying fair as many users deposit and the balance drifts:

```
sharePrice         = poolBalance / totalShares
sharesMinted(X)    = X / sharePrice            # deposit X paper
claimValue(shares) = shares * sharePrice
```

Deposit $10 into a model sitting at $9,000 → you own ≈ 10/9,010 of the pool. If
the model climbs to $18,000, your stake is worth ≈ $20. Math + tests live in
`packages/shared/src/shares.ts`.

## Monorepo layout

```
packages/
  shared/      Domain types, constants, staking + PnL math (used everywhere)
  data-feed/   Market data sources, 5-min scheduler, snapshot builder   <- Haard
  models/      Provider-agnostic model adapters, prompt + decision parse <- Yug
apps/
  api/         Express API + cycle engine + Prisma schema (the glue)
  web/         Next.js frontend (leaderboard, staking UI)                <- Aashwin
```

## Workstream ownership

| Who      | Area        | Where                          | What to build next                                   |
| -------- | ----------- | ------------------------------ | ---------------------------------------------------- |
| Haard    | Data feed   | `packages/data-feed`           | Add WS/caching on top of Binance REST                |
| Yug      | Models      | `packages/models`              | Tune OpenRouter model roster and trading prompts     |
| Aashwin  | Frontend    | `apps/web`                     | Staking UI, model detail, charts, auth               |
| Shared   | Engine/API  | `apps/api`                     | Swap `InMemoryStore` -> `PrismaStore`, persist cycles |

## Run it

```bash
pnpm install
cp .env.example .env          # defaults work as-is (stub mode)
# Add OPENROUTER_API_KEY in .env to run real model decisions
# Optional: set MARKET_DATA_SOURCE=binance for live market candles

# Backend: runs cycle 0 immediately, then every 5 min
pnpm --filter @ai-trading/api dev      # http://localhost:4000

# Frontend
pnpm --filter @ai-trading/web dev      # http://localhost:3000

pnpm test        # runs the share-math tests
pnpm typecheck   # type-checks every package
```

### Useful API routes

| Method | Path                              | Purpose                       |
| ------ | --------------------------------- | ----------------------------- |
| GET    | `/api/models`                     | Leaderboard (by balance)      |
| POST   | `/api/users`                      | Create user (gets $50)        |
| POST   | `/api/models/:id/stake`           | `{ userId, amount }`          |
| POST   | `/api/models/:id/claim`           | `{ userId, shares? }`         |
| GET    | `/api/models/:id/stake/:userId`   | Current stake value           |
| GET    | `/api/cycle/latest`               | Last cycle's decisions/PnL    |

## Going to production

- Replace `InMemoryStore` (`apps/api/src/memoryStore.ts`) with a `PrismaStore`
  backed by `apps/api/prisma/schema.prisma` (`pnpm db:push`).
- Keep `MARKET_DATA_SOURCE=binance` for live candles; add a WS/cache layer if
  request volume grows.
- Add persistence for raw OpenRouter decisions and resolved positions.
- Replace `setInterval` scheduling with a durable job runner so cycles survive
  restarts and don't drift.

> Security (see CLAUDE.md): never log/commit API keys or secrets; validate every
> external response; rate-limit exchange + model calls.
