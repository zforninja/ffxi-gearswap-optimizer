'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Activity, Crosshair, Swords, Gauge, Zap, ShieldCheck, Heart, Sparkles } from 'lucide-react';
import type { OptimizedSet, SetEvaluation } from '@/lib/ffxi/types';

const SetChart = dynamic(() => import('./set-chart').then((m) => m.SetChart), { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-md bg-secondary/40" /> });

function useCountUp(value: number, ms = 500) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = v;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return v;
}

function Stat({ icon, label, value, suffix = '', decimals = 0, accent }: { icon: React.ReactNode; label: string; value: number; suffix?: string; decimals?: number; accent?: boolean }) {
  const v = useCountUp(Number.isFinite(value) ? value : 0);
  return (
    <div className="rounded-md bg-secondary/50 p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className={`mt-1 font-mono text-lg font-semibold ${accent ? 'text-primary' : 'text-foreground'}`}>{v.toFixed(decimals)}{suffix}</div>
    </div>
  );
}

const n = (s: Record<string, number> | undefined, k: string) => s?.[k] ?? 0;

export function StatPanel({ current, evaluation, results }: { current: OptimizedSet | null; evaluation: SetEvaluation | null; results: OptimizedSet[] }) {
  const s = evaluation?.summary ?? current?.evaluation?.summary ?? {};
  const kind = current?.context?.kind ?? 'tp';
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Set summary</h3>
        <p className="text-xs text-muted-foreground">{current?.label ?? 'No set selected'} · {current?.tier === 'high' ? 'High buff' : 'Low buff'}</p>
      </div>
      <motion.div key={`${current?.key ?? 'none'}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-2">
        {(kind === 'tp' || kind === 'hybrid' || kind === 'th') && (
          <>
            <Stat icon={<Swords className="h-3.5 w-3.5" />} label="DPS" value={n(s, 'dps')} accent />
            <Stat icon={<Sparkles className="h-3.5 w-3.5" />} label="WS dmg" value={n(s, 'wsDamage')} />
            <Stat icon={<Crosshair className="h-3.5 w-3.5" />} label="Accuracy" value={n(s, 'acc')} />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Hit rate" value={n(s, 'hitRate')} suffix="%" />
            <Stat icon={<Swords className="h-3.5 w-3.5" />} label="Attack" value={n(s, 'att')} />
            <Stat icon={<Zap className="h-3.5 w-3.5" />} label="Haste (total)" value={n(s, 'haste')} suffix="%" decimals={1} />
            <Stat icon={<Zap className="h-3.5 w-3.5" />} label="Gear haste" value={n(s, 'gearHaste')} suffix="%" decimals={1} />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Store TP" value={n(s, 'storeTp')} />
            <Stat icon={<Swords className="h-3.5 w-3.5" />} label="Multi-attack" value={n(s, 'multiAttack')} suffix="%" decimals={1} />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Time to WS" value={n(s, 'secondsToWs')} suffix="s" decimals={1} />
            <Stat icon={<ShieldCheck className="h-3.5 w-3.5" />} label="DT" value={n(s, 'dt')} suffix="%" />
            {kind === 'th' ? <Stat icon={<Sparkles className="h-3.5 w-3.5" />} label="Treasure Hunter" value={n(s, 'th')} accent /> : <Stat icon={<Heart className="h-3.5 w-3.5" />} label="HP" value={n(s, 'hp')} />}
          </>
        )}
        {kind === 'ws' && (
          <>
            <Stat icon={<Sparkles className="h-3.5 w-3.5" />} label="WS damage" value={n(s, 'wsDamage')} accent />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Hit rate" value={n(s, 'hitRate')} suffix="%" />
            <Stat icon={<Crosshair className="h-3.5 w-3.5" />} label="Accuracy" value={n(s, 'acc')} />
            <Stat icon={<Swords className="h-3.5 w-3.5" />} label="Attack" value={n(s, 'att')} />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="fTP" value={n(s, 'ftp')} decimals={2} />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="TP at WS" value={n(s, 'tp')} />
            <Stat icon={<Swords className="h-3.5 w-3.5" />} label="Hits" value={n(s, 'hits')} decimals={1} />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Crit rate" value={n(s, 'critRate')} suffix="%" />
          </>
        )}
        {kind === 'magic' && (
          <>
            <Stat icon={<Sparkles className="h-3.5 w-3.5" />} label="Nuke damage" value={n(s, 'magicDamage')} accent />
            <Stat icon={<Crosshair className="h-3.5 w-3.5" />} label="Magic acc" value={n(s, 'macc')} />
            <Stat icon={<Swords className="h-3.5 w-3.5" />} label="MAB" value={n(s, 'mab')} />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="INT" value={n(s, 'int')} />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Resist factor" value={n(s, 'magicHitRate')} suffix="%" />
            <Stat icon={<Sparkles className="h-3.5 w-3.5" />} label="MB bonus" value={n(s, 'mbBonus')} suffix="%" />
          </>
        )}
        {kind === 'healing' && (
          <>
            <Stat icon={<Heart className="h-3.5 w-3.5" />} label="Cure IV est." value={n(s, 'cure')} accent />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Cure potency" value={n(s, 'curePotency')} suffix="%" />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Cure pot. II" value={n(s, 'curePotencyII')} suffix="%" />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="MND" value={n(s, 'mnd')} />
            <Stat icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Enmity" value={n(s, 'enmity')} />
            <Stat icon={<ShieldCheck className="h-3.5 w-3.5" />} label="DT" value={n(s, 'dt')} suffix="%" />
          </>
        )}
        {kind === 'idle' && (
          <>
            <Stat icon={<ShieldCheck className="h-3.5 w-3.5" />} label="DT" value={n(s, 'dt')} suffix="%" accent />
            <Stat icon={<ShieldCheck className="h-3.5 w-3.5" />} label="PDT" value={n(s, 'pdt')} suffix="%" />
            <Stat icon={<ShieldCheck className="h-3.5 w-3.5" />} label="MDT" value={n(s, 'mdt')} suffix="%" />
            <Stat icon={<Heart className="h-3.5 w-3.5" />} label="HP" value={n(s, 'hp')} />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Defense" value={n(s, 'def')} />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Magic eva" value={n(s, 'meva')} />
            <Stat icon={<Zap className="h-3.5 w-3.5" />} label="Refresh" value={n(s, 'refresh')} />
            <Stat icon={<Heart className="h-3.5 w-3.5" />} label="Regen" value={n(s, 'regen')} />
          </>
        )}
        {kind === 'fastcast' && (
          <>
            <Stat icon={<Zap className="h-3.5 w-3.5" />} label="Fast cast" value={n(s, 'fastcast')} suffix="%" accent />
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Effective (cap 80)" value={n(s, 'fastcastCapped')} suffix="%" />
            <Stat icon={<Heart className="h-3.5 w-3.5" />} label="HP" value={n(s, 'hp')} />
            <Stat icon={<ShieldCheck className="h-3.5 w-3.5" />} label="DT" value={n(s, 'dt')} suffix="%" />
          </>
        )}
      </motion.div>
      {results?.length ? (
        <div className="rounded-md bg-secondary/40 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Low vs High buff comparison</div>
          <div className="h-52"><SetChart results={results} /></div>
        </div>
      ) : null}
    </div>
  );
}
