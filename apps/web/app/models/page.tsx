import { Shell } from "../../components/layout/Shell";
import { ModelCard } from "../../components/models/ModelCard";
import { api } from "../../lib/api";

export default async function ModelsPage() {
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
    <Shell activeNav="models" cycle={cycle}>
      <h1 className="page-title">Models</h1>
      <p className="page-subtitle">
        Each model runs its own strategy prompt against the same market snapshot every 5 minutes.
      </p>
      {error && <div className="error-banner">API offline ({error})</div>}
      <div className="model-grid">
        {models.map((m, i) => (
          <ModelCard key={m.id} model={m} rank={i + 1} />
        ))}
      </div>
    </Shell>
  );
}
