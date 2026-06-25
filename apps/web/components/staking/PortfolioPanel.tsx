"use client";

import { useEffect, useState } from "react";
import type { UserWithStakes } from "../../lib/api";
import { formatUsd } from "../../lib/format";
import { useUser } from "../../lib/user-context";
import { SIGNUP_BONUS } from "@ai-trading/shared";
import Link from "next/link";

export function PortfolioPanel() {
  const { user, loading, signup, refresh } = useUser();
  const [handle, setHandle] = useState("");
  const [detail, setDetail] = useState<UserWithStakes | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadDetail = async () => {
    if (!user) return;
    const { api } = await import("../../lib/api");
    setDetail(await api.user(user.id));
  };

  useEffect(() => {
    loadDetail();
  }, [user]);

  const onSignup = async () => {
    setBusy(true);
    setErr(null);
    try {
      await signup(handle.trim());
      setHandle("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="prose-mono">Loading…</p>;

  if (!user) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <div className="card-header">Enter the Arena</div>
        <div className="card-body">
          <p className="prose-mono">
            Pick a handle. You get{" "}
            <strong style={{ color: "var(--text)" }}>{formatUsd(SIGNUP_BONUS)}</strong> paper
            money to stake on AI models. No wallet. No KYC. Just vibes and LP math.
          </p>
          {err && <div className="error-banner">{err}</div>}
          <label className="form-label">Handle</label>
          <div className="form-row">
            <input
              className="input"
              placeholder="monk_mode_trader"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSignup()}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !handle.trim()}
              onClick={onSignup}
            >
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="stat-row" style={{ maxWidth: 640 }}>
        <div className="stat-box">
          <div className="stat-label">Handle</div>
          <div className="stat-value" style={{ fontSize: 16 }}>{user.handle}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Free Balance</div>
          <div className="stat-value">{formatUsd(user.balance)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Active Stakes</div>
          <div className="stat-value">{detail?.stakes.length ?? 0}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">Your Stakes</div>
        {detail && detail.stakes.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th className="num">Shares</th>
                <th className="num">Contributed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {detail.stakes.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/models/${s.modelId}`} style={{ textDecoration: "underline" }}>
                      {s.modelId}
                    </Link>
                  </td>
                  <td className="num">{s.shares.toFixed(4)}</td>
                  <td className="num">{formatUsd(s.contributed, { decimals: 2 })}</td>
                  <td>
                    <Link
                      href={`/models/${s.modelId}`}
                      className="btn btn-ghost"
                      style={{ padding: "6px 12px", fontSize: 10 }}
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="card-body">
            <p className="prose-mono" style={{ margin: 0 }}>
              No stakes yet.{" "}
              <Link href="/models" style={{ textDecoration: "underline" }}>
                Pick a model
              </Link>{" "}
              and deploy your paper.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn btn-ghost"
        style={{ marginTop: 16 }}
        onClick={() => refresh().then(loadDetail)}
      >
        Refresh
      </button>
    </>
  );
}
