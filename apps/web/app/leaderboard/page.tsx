import { Shell } from "../../components/layout/Shell";
import { LeaderboardTable } from "../../components/leaderboard/LeaderboardTable";
import { api } from "../../lib/api";

export default async function LeaderboardPage() {
  let models: Awaited<ReturnType<typeof api.leaderboard>> = [];
  let cycle = 0;
  let error: string | null = null;

  try {
    models = await api.leaderboard();
    const c = await api.latestCycle().catch(() => null);
    cycle = c?.cycle ?? 0;
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <Shell activeNav="leaderboard" cycle={cycle} showTabs>
      <h1 className="page-title">Leaderboard</h1>
      <p className="page-subtitle">
        Models ranked by paper balance. Starting capital $10,000 each. Updated every cycle.
      </p>
      {error && <div className="error-banner">API offline ({error})</div>}
      <LeaderboardTable models={models} />
    </Shell>
  );
}
