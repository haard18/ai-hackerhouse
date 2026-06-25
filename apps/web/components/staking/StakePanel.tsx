"use client";

import { useEffect, useState } from "react";
import type { ModelRecord } from "../../lib/api";
import { api } from "../../lib/api";
import { formatUsd } from "../../lib/format";
import { useUser } from "../../lib/user-context";
import { MIN_STAKE } from "@ai-trading/shared";

interface StakePanelProps {
  model: ModelRecord;
}

export function StakePanel({ model }: StakePanelProps) {
  const { user, refresh } = useUser();
  const [amount, setAmount] = useState("10");
  const [claimShares, setClaimShares] = useState("");
  const [stakeValue, setStakeValue] = useState<{
    shares: number;
    value: number;
    contributed: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadStake = async () => {
    if (!user) return;
    try {
      const v = await api.stakeValue(model.id, user.id);
      setStakeValue(v.shares > 0 ? v : null);
    } catch {
      setStakeValue(null);
    }
  };

  useEffect(() => {
    loadStake();
  }, [user, model.id]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await fn();
      await refresh();
      await loadStake();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="card">
        <div className="card-header">Stake</div>
        <div className="card-body">
          <p className="prose-mono" style={{ margin: 0 }}>
            <a href="/portfolio" style={{ textDecoration: "underline" }}>
              Create an account
            </a>{" "}
            to stake on {model.name}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">Stake on {model.name.split(" ")[0]}</div>
      <div className="card-body">
        <div className="stat-row">
          <div className="stat-box">
            <div className="stat-label">Your Balance</div>
            <div className="stat-value">{formatUsd(user.balance)}</div>
          </div>
          {stakeValue && (
            <div className="stat-box">
              <div className="stat-label">Staked Value</div>
              <div className="stat-value">{formatUsd(stakeValue.value, { decimals: 2 })}</div>
            </div>
          )}
        </div>

        {err && <div className="error-banner">{err}</div>}
        {msg && (
          <p className="prose-mono" style={{ color: "var(--green)", margin: "0 0 12px" }}>
            {msg}
          </p>
        )}

        <label className="form-label">Stake amount (min ${MIN_STAKE})</label>
        <div className="form-row">
          <input
            className="input"
            type="number"
            min={MIN_STAKE}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() =>
              act(async () => {
                await api.stake(model.id, user.id, Number(amount));
                setMsg(`Staked ${formatUsd(Number(amount))} on ${model.name}.`);
              })
            }
          >
            Stake
          </button>
        </div>

        {stakeValue && stakeValue.shares > 0 && (
          <>
            <label className="form-label" style={{ marginTop: 20 }}>
              Claim shares (leave empty for all)
            </label>
            <div className="form-row">
              <input
                className="input"
                type="number"
                placeholder={String(stakeValue.shares)}
                value={claimShares}
                onChange={(e) => setClaimShares(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    const r = await api.claim(
                      model.id,
                      user.id,
                      claimShares ? Number(claimShares) : undefined,
                    );
                    setMsg(`Claimed ${formatUsd(r.payout, { decimals: 2 })}.`);
                    setClaimShares("");
                  })
                }
              >
                Claim
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
