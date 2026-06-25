import { notFound } from "next/navigation";
import { Shell } from "../../../components/layout/Shell";
import { ModelDetailView } from "../../../components/models/ModelDetailView";
import { api } from "../../../lib/api";

export default async function ModelPage({ params }: { params: { id: string } }) {
  let model: Awaited<ReturnType<typeof api.model>> | null = null;
  let models: Awaited<ReturnType<typeof api.leaderboard>> = [];
  let cycle: Awaited<ReturnType<typeof api.latestCycle>> | null = null;

  try {
    [model, models, cycle] = await Promise.all([
      api.model(params.id),
      api.leaderboard(),
      api.latestCycle().catch(() => null),
    ]);
  } catch {
    notFound();
  }

  if (!model) notFound();

  const rank = models.findIndex((m) => m.id === model!.id) + 1;

  return (
    <Shell activeNav="models" cycle={cycle?.cycle ?? 0} selectedModelId={model.id}>
      <ModelDetailView model={model} cycle={cycle} rank={rank || 1} />
    </Shell>
  );
}
