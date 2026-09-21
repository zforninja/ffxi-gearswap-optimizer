'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GearDB, OptimizedSet, OptimizerConfig } from '@/lib/ffxi/types';

export type OptimizerProgress = { done: number; total: number; label: string };

export function useOptimizer(db: GearDB | null) {
  const workerRef = useRef<Worker | null>(null);
  const dbLoadedRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<OptimizerProgress | null>(null);
  const resolverRef = useRef<{ resolve: (r: OptimizedSet[]) => void; reject: (e: Error) => void } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !db) return;
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../../lib/ffxi/optimizer.worker.ts', import.meta.url));
      worker.onmessage = (ev: MessageEvent) => {
        const msg = ev?.data ?? {};
        if (msg.type === 'dbLoaded') dbLoadedRef.current = true;
        else if (msg.type === 'progress') setProgress({ done: msg.done ?? 0, total: msg.total ?? 1, label: msg.label ?? '' });
        else if (msg.type === 'result') {
          resolverRef.current?.resolve?.(msg.results ?? []);
          resolverRef.current = null;
          setRunning(false);
        } else if (msg.type === 'error') {
          resolverRef.current?.reject?.(new Error(msg.error ?? 'Optimizer error'));
          resolverRef.current = null;
          setRunning(false);
        }
      };
      worker.onerror = (e: ErrorEvent) => {
        console.error('worker error', e);
        resolverRef.current?.reject?.(new Error(e?.message ?? 'Worker failed'));
        resolverRef.current = null;
        setRunning(false);
      };
      worker.postMessage({ type: 'loadDb', db });
      workerRef.current = worker;
    } catch (e) {
      console.error('Web worker unavailable, falling back to main thread', e);
      workerRef.current = null;
    }
    return () => {
      worker?.terminate?.();
      workerRef.current = null;
      dbLoadedRef.current = false;
    };
  }, [db]);

  const optimize = useCallback(
    async (config: OptimizerConfig): Promise<OptimizedSet[]> => {
      if (!db) throw new Error('Gear database not loaded');
      setRunning(true);
      setProgress({ done: 0, total: 1, label: 'Starting' });
      const worker = workerRef.current;
      if (worker) {
        return new Promise<OptimizedSet[]>((resolve, reject) => {
          resolverRef.current = { resolve, reject };
          worker.postMessage({ type: 'optimize', config, requestId: Date.now() });
        });
      }
      // main-thread fallback
      try {
        const mod = await import('@/lib/ffxi/optimizer');
        const res = mod.optimizeAll(db, config, (done: number, total: number, label: string) => setProgress({ done, total, label }));
        return res ?? [];
      } finally {
        setRunning(false);
      }
    },
    [db],
  );

  return { optimize, running, progress };
}
