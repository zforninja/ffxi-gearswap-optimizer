import { optimizeAll } from './optimizer';
import type { GearDB, OptimizerConfig } from './types';

let db: GearDB | null = null;

self.onmessage = (ev: MessageEvent) => {
  const msg = ev?.data ?? {};
  try {
    if (msg.type === 'loadDb') {
      db = msg.db ?? null;
      self.postMessage({ type: 'dbLoaded' });
      return;
    }
    if (msg.type === 'optimize') {
      if (!db) {
        self.postMessage({ type: 'error', error: 'Gear database not loaded in worker' });
        return;
      }
      const cfg = msg.config as OptimizerConfig;
      const results = optimizeAll(db, cfg, (done: number, total: number, label: string) => {
        self.postMessage({ type: 'progress', done, total, label });
      });
      self.postMessage({ type: 'result', results, requestId: msg.requestId });
    }
  } catch (e: any) {
    self.postMessage({ type: 'error', error: e?.message ?? String(e), requestId: msg?.requestId });
  }
};
