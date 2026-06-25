/**
 * BinanceKlineStream — live 5m kline WebSocket ingestion for all 5 assets.
 *
 * Connects to Binance's combined stream and emits a CandleEvent on every update
 * (Binance pushes the forming candle ~1–2s and a final event with isClosed=true
 * when the 5m window closes). Consumers (a persistence sink, an in-memory
 * buffer) subscribe via onCandle().
 *
 * Resilience (CLAUDE.md): auto-reconnect with capped exponential backoff; the
 * socket is torn down and rebuilt on error/close. Uses Node's global WebSocket
 * (stable in Node 22+), so no extra dependency.
 *
 * Stream docs: wss://stream.binance.com:9443/stream?streams=btcusdt@kline_5m/...
 */

import {
  ASSETS,
  CANDLE_INTERVAL,
  type AssetSymbol,
  type Candle,
} from "@ai-trading/shared";

/** A candle update from the stream. `closed` marks the final, immutable candle. */
export interface CandleEvent {
  candle: Candle;
  closed: boolean;
}

export type CandleListener = (event: CandleEvent) => void;

const SYMBOL_MAP: Record<AssetSymbol, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
  XRP: "XRPUSDT",
};

/** Reverse map "BTCUSDT" -> "BTC" for incoming messages. */
const REVERSE_MAP: Record<string, AssetSymbol> = Object.fromEntries(
  ASSETS.map((a) => [SYMBOL_MAP[a], a]),
) as Record<string, AssetSymbol>;

interface RawKlineMessage {
  stream?: string;
  data?: {
    e?: string;
    s?: string;
    k?: {
      t: number; // open time
      o: string;
      h: string;
      l: string;
      c: string;
      v: string;
      x: boolean; // is this kline closed?
    };
  };
}

export interface StreamOptions {
  /** WS base, e.g. wss://stream.binance.com:9443. Use stream.binance.us for geo. */
  wsBase?: string;
  /** Max backoff between reconnect attempts (ms). */
  maxBackoffMs?: number;
}

export class BinanceKlineStream {
  private ws: WebSocket | null = null;
  private listeners = new Set<CandleListener>();
  private readonly wsBase: string;
  private readonly maxBackoffMs: number;
  private backoffMs = 1_000;
  private stopped = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: StreamOptions = {}) {
    this.wsBase =
      opts.wsBase ??
      process.env.MARKET_DATA_WS_BASE ??
      "wss://stream.binance.com:9443";
    this.maxBackoffMs = opts.maxBackoffMs ?? 30_000;
  }

  /** Subscribe to candle events. Returns an unsubscribe fn. */
  onCandle(listener: CandleListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
  }

  private streamUrl(): string {
    const streams = ASSETS.map(
      (a) => `${SYMBOL_MAP[a].toLowerCase()}@kline_${CANDLE_INTERVAL}`,
    ).join("/");
    return `${this.wsBase}/stream?streams=${streams}`;
  }

  private connect(): void {
    if (this.stopped) return;
    const ws = new WebSocket(this.streamUrl());
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.backoffMs = 1_000; // reset backoff on a healthy connection
      console.log(`[stream] connected: ${ASSETS.join(",")} ${CANDLE_INTERVAL}`);
    });

    ws.addEventListener("message", (ev: MessageEvent) => {
      this.handleMessage(typeof ev.data === "string" ? ev.data : String(ev.data));
    });

    ws.addEventListener("error", () => {
      // 'close' fires after 'error'; reconnect is scheduled there.
    });

    ws.addEventListener("close", () => {
      this.ws = null;
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
    console.warn(`[stream] disconnected — reconnecting in ${delay}ms`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private handleMessage(raw: string): void {
    let msg: RawKlineMessage;
    try {
      msg = JSON.parse(raw) as RawKlineMessage;
    } catch {
      return; // ignore non-JSON / control frames
    }
    const k = msg.data?.k;
    const symbol = msg.data?.s;
    if (!k || !symbol) return;
    const asset = REVERSE_MAP[symbol];
    if (!asset) return;

    const candle: Candle = {
      asset,
      openTime: Number(k.t),
      open: Number(k.o),
      high: Number(k.h),
      low: Number(k.l),
      close: Number(k.c),
      volume: Number(k.v),
    };
    // Validate before emitting (CLAUDE.md: never trust external payloads).
    const nums = [candle.openTime, candle.open, candle.high, candle.low, candle.close, candle.volume];
    if (nums.some((n) => !Number.isFinite(n)) || candle.close <= 0) return;

    const event: CandleEvent = { candle, closed: Boolean(k.x) };
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (err) {
        console.error("[stream] listener error", err);
      }
    }
  }
}
