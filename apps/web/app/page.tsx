import { api, type LeaderboardEntry } from "../lib/api";

// Server component: fetches the leaderboard. Falls back gracefully if the API
// isn't running yet so Aashwin can build UI without the backend up.
export default async function Home() {
  let board: LeaderboardEntry[] = [];
  let error: string | null = null;
  try {
    board = await api.leaderboard();
  } catch (e) {
    error = (e as Error).message;
  }

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
    </main>
  );
}
