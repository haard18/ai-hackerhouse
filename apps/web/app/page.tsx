import { LiveDashboard } from "../components/live/LiveDashboard";
import { api } from "../lib/api";

export default async function HomePage() {
  let models: Awaited<ReturnType<typeof api.leaderboard>> = [];
  let cycle: Awaited<ReturnType<typeof api.latestCycle>> | null = null;

  try {
    models = await api.leaderboard();
    cycle = await api.latestCycle().catch(() => null);
  } catch {
    // LiveDashboard shows offline banner
  }

  return <LiveDashboard initialModels={models} initialCycle={cycle} />;
}
