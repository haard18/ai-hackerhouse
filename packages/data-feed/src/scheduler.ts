/**
 * CycleScheduler — fires a callback every CYCLE_INTERVAL_MS (default 5 min),
 * incrementing the cycle counter. The API's cycle runner subscribes to this to
 * feed data into models and resolve positions.
 *
 * Intentionally simple (setInterval). For production, consider a durable job
 * runner so cycles survive restarts and don't drift.
 */

import { CYCLE_INTERVAL_MS } from "@ai-trading/shared";

export type CycleHandler = (cycle: number, timestamp: number) => void | Promise<void>;

export interface SchedulerOptions {
  intervalMs?: number;
  /** Cycle index to start from (e.g. restored from DB). */
  startCycle?: number;
  /** Provide a clock for tests. Defaults to Date.now. */
  now?: () => number;
}

export class CycleScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private cycle: number;
  private readonly intervalMs: number;
  private readonly now: () => number;
  private running = false;

  constructor(
    private readonly handler: CycleHandler,
    opts: SchedulerOptions = {},
  ) {
    this.intervalMs = opts.intervalMs ?? CYCLE_INTERVAL_MS;
    this.cycle = opts.startCycle ?? 0;
    this.now = opts.now ?? Date.now;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Run one cycle immediately. Guards against overlapping runs. */
  async tick(): Promise<void> {
    if (this.running) return; // skip if previous cycle still resolving
    this.running = true;
    const current = this.cycle++;
    try {
      await this.handler(current, this.now());
    } finally {
      this.running = false;
    }
  }
}
