# Deploying to Coolify

The platform ships two services — `api` (Express engine + live ingestion) and
`web` (Next.js) — wired together in `docker-compose.yml`. Postgres is external
(Neon), so there's no database container.

## 1. Create the resource

In Coolify: **New Resource → Docker Compose**, point it at this repo, and select
`docker-compose.yml`. Coolify builds both images and detects the two services.

## 2. Set environment variables

Add these in the Coolify **Environment Variables** tab (see `.env.deploy.example`):

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Neon Postgres connection string |
| `NEXT_PUBLIC_API_URL` | ✅ | **Public** URL of the `api` service (baked into the web build) |
| `OPENROUTER_API_KEY` | ✅ | Drives Claude/GLM/Mistral/Gemini |
| `OPENAI_API_KEY` | for ChatGPT | gpt-5.5 model |
| `MARKET_DATA_SOURCE` | default `binance` | use `stub` for offline |
| `OPENAI_REASONING_EFFORT` | default `medium` | low / medium / high / xhigh |

> `NEXT_PUBLIC_API_URL` is compiled into the browser bundle at build time. It must
> be the API's **public** domain (the browser calls it directly — not the internal
> `api:4000` hostname). Change it → rebuild the `web` service.

## 3. Domains

Assign a domain to each service in Coolify:
- `web` → your main domain (e.g. `arena.example.com`)
- `api` → an API subdomain (e.g. `api.example.com`) → set `NEXT_PUBLIC_API_URL` to it.

## 4. Database schema

The schema is pushed with Prisma. Once, from a machine with the prod `DATABASE_URL`:

```bash
cd apps/api && DATABASE_URL="<prod>" npx prisma db push
```

(or add it as a one-off Coolify command). The API auto-creates rows from then on.

## Run locally with the same setup

```bash
cp .env.deploy.example .env   # fill in values
docker compose up --build
# web → http://localhost:3000   api → http://localhost:4000
```

## Notes

- The `api` healthcheck hits `/api/health`; `web` waits for it before starting.
- The WebSocket feed auto-reconnects; cycles run every `CYCLE_INTERVAL_MS`.
- `binance.com` is geo-blocked in some regions — switch `MARKET_DATA_BASE_URL`
  to `https://api.binance.us` and `MARKET_DATA_WS_BASE` to
  `wss://stream.binance.us:9443` if the host can't reach it.
