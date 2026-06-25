/**
 * Clean-launch reset: truncate all app data so the arena restarts pristine.
 * Models reseed at $10,000 / cycle 0 on the next API boot; users + stakes clear.
 *
 * Usage (DATABASE_URL must be set):
 *   pnpm --filter @ai-trading/api db:reset
 *
 * Destructive — wipes EquityPoint, Candle, OpenPosition, Stake, Decision,
 * Position, CycleLog, Model, and User.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TABLES = [
  "EquityPoint",
  "Candle",
  "OpenPosition",
  "Stake",
  "Decision",
  "Position",
  "CycleLog",
  "Model",
  "User",
];

const counts = {};
for (const t of TABLES) {
  const model = t.charAt(0).toLowerCase() + t.slice(1);
  counts[t] = await prisma[model].count();
}

await prisma.$executeRawUnsafe(
  `TRUNCATE ${TABLES.map((t) => `"${t}"`).join(",")} RESTART IDENTITY CASCADE`,
);

console.log("clean-launch reset complete — rows removed:");
for (const t of TABLES) console.log(`  ${t}: ${counts[t]}`);
console.log("Models reseed at $10,000 / cycle 0 on next API boot.");

await prisma.$disconnect();
