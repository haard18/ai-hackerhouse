import { api, type LatestCycle, type LeaderboardEntry } from "../lib/api";

// Server component: fetches the leaderboard. Falls back gracefully if the API
// isn't running yet so Aashwin can build UI without the backend up.
export default async function Home() {
  let board: LeaderboardEntry[] = [];
  let latest: LatestCycle | null = null;
  let error: string | null = null;
  try {
    [board, latest] = await Promise.all([
      api.leaderboard(),
      api.latestCycle().catch(() => null),
    ]);
  } catch (e) {
    error = (e as Error).message;
  }

  const modelName = new Map(board.map((m) => [m.id, m.name]));

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px" }}>
      <h1 style={{ fontSize: 32, marginBottom: 4 }}>AI Trading Arena</h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>
        Models trade BTC · ETH · SOL · BNB · XRP on paper. Stake on the ones you
        believe in.
      </p>

      {error && (
        <p style={{ color: "#ff7b72" }}>
          API offline ({error}). Start it with <code>pnpm --filter @ai-trading/api dev</code>.
        </p>
      )}

      <h2 style={{ marginTop: 32 }}>Leaderboard</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", opacity: 0.6 }}>
            <th style={{ padding: "8px 4px" }}>#</th>
            <th>Model</th>
            <th>Provider</th>
            <th style={{ textAlign: "right" }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {board.map((m, i) => (
            <tr key={m.id} style={{ borderTop: "1px solid #1c2230" }}>
              <td style={{ padding: "10px 4px" }}>{i + 1}</td>
              <td>{m.name}</td>
              <td style={{ opacity: 0.7 }}>{m.provider}</td>
              <td style={{ textAlign: "right" }}>
                ${m.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
            </tr>
          ))}
          {board.length === 0 && !error && (
            <tr>
              <td colSpan={4} style={{ padding: 16, opacity: 0.6 }}>
                No models yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ marginTop: 36 }}>Latest Cycle</h2>
      {!latest && !error && (
        <p style={{ opacity: 0.65 }}>Waiting for the first cycle to finish.</p>
      )}
      {latest && (
        <section>
          <p style={{ opacity: 0.65, marginTop: 0 }}>
            Cycle {latest.cycle} · {new Date(latest.timestamp).toLocaleString()}
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.6 }}>
                <th style={{ padding: "8px 4px" }}>Model</th>
                <th>Decisions</th>
                <th style={{ textAlign: "right" }}>PnL</th>
              </tr>
            </thead>
            <tbody>
              {latest.perModel.map((m) => (
                <tr key={m.modelId} style={{ borderTop: "1px solid #1c2230" }}>
                  <td style={{ padding: "10px 4px", whiteSpace: "nowrap" }}>
                    {modelName.get(m.modelId) ?? m.modelId}
                  </td>
                  <td>
                    {m.decision.decisions.map((d) => (
                      <span
                        key={`${m.modelId}-${d.asset}`}
                        style={{
                          display: "inline-block",
                          marginRight: 8,
                          color:
                            d.side === "LONG"
                              ? "#3fb950"
                              : d.side === "SHORT"
                                ? "#f85149"
                                : "#8b949e",
                        }}
                      >
                        {d.asset}:{d.side} {Math.round(d.confidence * 100)}%
                      </span>
                    ))}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    ${m.pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
