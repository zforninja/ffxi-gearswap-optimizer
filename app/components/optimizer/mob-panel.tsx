'use client';
import { Target as TargetIcon, ShieldAlert } from 'lucide-react';
import { MOB_TIERS } from '@/lib/ffxi/constants';
import type { Target } from '@/lib/ffxi/types';
import type { MobTier } from '@/lib/store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

const TIERS: { key: MobTier; label: string; hint: string }[] = [
  { key: 'easy', label: 'Easy', hint: 'Ambuscade N' },
  { key: 'medium', label: 'Medium', hint: 'Ambuscade D' },
  { key: 'hard', label: 'Hard', hint: 'Ambuscade VD' },
  { key: 'extreme', label: 'Extreme', hint: 'Odyssey / Sortie' },
  { key: 'custom', label: 'Custom', hint: 'Enter stats' },
];

const FIELDS: { key: keyof Target; label: string }[] = [
  { key: 'level', label: 'Level' }, { key: 'DEF', label: 'Defense' }, { key: 'EVA', label: 'Evasion' }, { key: 'VIT', label: 'VIT' },
  { key: 'INT', label: 'INT' }, { key: 'MEVA', label: 'Magic Eva' }, { key: 'MDB', label: 'Magic Def' },
];

export function MobPanel({ tier, custom, dtThreshold, onTier, onCustom, onDt }: {
  tier: MobTier; custom: Target; dtThreshold: number;
  onTier: (t: MobTier) => void; onCustom: (t: Partial<Target>) => void; onDt: (v: number) => void;
}) {
  const active = tier === 'custom' ? custom : MOB_TIERS[tier] ?? MOB_TIERS.medium;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-1">
        {TIERS.map((t) => (
          <button key={t.key} type="button" onClick={() => onTier?.(t.key)}
            className={cn('rounded-md px-1 py-2 text-xs font-semibold transition-colors shadow-sm', tier === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 hover:bg-secondary text-foreground')}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-md bg-secondary/40 p-3 text-xs">
        <div className="flex items-center gap-2 mb-2 font-semibold text-primary"><TargetIcon className="h-3.5 w-3.5" />{active?.name ?? 'Target'}</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{f.label}</span>
              {tier === 'custom' ? (
                <Input type="number" className="h-7 w-20 text-right text-xs" value={Number(custom?.[f.key] ?? 0)} onChange={(e) => onCustom?.({ [f.key]: Number(e.target.value ?? 0) } as Partial<Target>)} />
              ) : (
                <span className="font-mono">{String(active?.[f.key] ?? '')}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 text-primary" /> Hybrid DT target</span>
          <span className="font-mono text-foreground">-{dtThreshold}%</span>
        </Label>
        <Slider min={10} max={50} step={5} value={[dtThreshold]} onValueChange={(v: number[]) => onDt?.(v?.[0] ?? 30)} />
        <p className="text-[11px] text-muted-foreground">The hybrid set keeps as much DPS as possible while reaching at least this much damage taken reduction.</p>
      </div>
    </div>
  );
}
