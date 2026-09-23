'use client';
import { useMemo } from 'react';
import { Music, Compass, Dice5, Utensils, Zap, Flame, Skull, Users, GraduationCap } from 'lucide-react';
import { BUFFS, type BuffCategory, type BuffDef } from '@/lib/ffxi/constants';
import { UNITY_MAX_RANK } from '@/lib/ffxi/types';
import { MAX_JOB_POINTS, MAX_MASTER_LEVEL, nextGift, unlockedGifts } from '@/lib/ffxi/job-points';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const CATS: { key: BuffCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'Food', label: 'Food', icon: <Utensils className="h-3.5 w-3.5" /> },
  { key: 'Haste', label: 'Haste spells', icon: <Zap className="h-3.5 w-3.5" /> },
  { key: 'JA', label: 'Job abilities', icon: <Flame className="h-3.5 w-3.5" /> },
  { key: 'BRD', label: 'Bard songs', icon: <Music className="h-3.5 w-3.5" /> },
  { key: 'GEO', label: 'Geomancy', icon: <Compass className="h-3.5 w-3.5" /> },
  { key: 'COR', label: 'Corsair rolls', icon: <Dice5 className="h-3.5 w-3.5" /> },
  { key: 'Debuff', label: 'Target debuffs', icon: <Skull className="h-3.5 w-3.5" /> },
];

export function BuffPanel({
  buffIds,
  onToggle,
  unityRank = 1,
  onUnityRank,
  mainJob = '',
  jobPoints = MAX_JOB_POINTS,
  masterLevel = MAX_MASTER_LEVEL,
  onJobPoints,
  onMasterLevel,
}: {
  buffIds: string[];
  onToggle: (id: string, group?: string, groupIds?: string[]) => void;
  unityRank?: number;
  onUnityRank?: (rank: number) => void;
  mainJob?: string;
  jobPoints?: number;
  masterLevel?: number;
  onJobPoints?: (v: number) => void;
  onMasterLevel?: (v: number) => void;
}) {
  const gifts = useMemo(() => unlockedGifts(mainJob, jobPoints), [mainJob, jobPoints]);
  const upcoming = useMemo(() => nextGift(mainJob, jobPoints), [mainJob, jobPoints]);
  const selected = useMemo(() => new Set(buffIds ?? []), [buffIds]);
  const groups = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const b of BUFFS) if (b.exclusiveGroup) (m[b.exclusiveGroup] ??= []).push(b.id);
    return m;
  }, []);
  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="text-xs text-muted-foreground">
          <Badge variant="outline" className="mr-1 border-primary/40 text-primary">Low</Badge> sets use only personal buffs (food, JA, self haste).
          <Badge variant="outline" className="mx-1 border-primary/40 text-primary">High</Badge> sets add every party buff selected below.
        </div>
        <div className="rounded-md bg-secondary/40 p-3">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide text-primary"><GraduationCap className="h-3.5 w-3.5" />Job Points &amp; Master Level</div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground space-y-1">
              <Tooltip>
                <TooltipTrigger asChild><span className="cursor-help">{mainJob || 'Job'} job points</span></TooltipTrigger>
                <TooltipContent side="right" className="text-xs max-w-[260px]">
                  Total job points spent on your main job (0-2100). Gifts such as Physical Attack/Accuracy Bonus, Double Attack Effect, Store TP Effect and Weapon Skill Damage are added to the math once you pass their threshold.
                </TooltipContent>
              </Tooltip>
              <Input type="number" inputMode="numeric" min={0} max={MAX_JOB_POINTS} step={5} value={jobPoints} aria-label="Job points"
                onChange={(e) => onJobPoints?.(Number(e.target.value))} className="h-8 text-xs" />
            </label>
            <label className="text-xs text-muted-foreground space-y-1">
              <Tooltip>
                <TooltipTrigger asChild><span className="cursor-help">Master Level</span></TooltipTrigger>
                <TooltipContent side="right" className="text-xs max-w-[260px]">
                  Each Master Level adds +1 to every base attribute and +1 to your weapon skill caps (0-50).
                </TooltipContent>
              </Tooltip>
              <Input type="number" inputMode="numeric" min={0} max={MAX_MASTER_LEVEL} value={masterLevel} aria-label="Master level"
                onChange={(e) => onMasterLevel?.(Number(e.target.value))} className="h-8 text-xs" />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {gifts.length} stat gift{gifts.length === 1 ? '' : 's'} unlocked{upcoming ? ` · next: ${upcoming[3]} +${upcoming[2]} at ${upcoming[0]} JP` : ' · all gifts unlocked'}
          </p>
        </div>
        <div className="rounded-md bg-secondary/40 p-3">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide text-primary"><Users className="h-3.5 w-3.5" />Unity Ranking</div>
          <div className="flex items-center justify-between gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm cursor-help">Your Unity&apos;s weekly rank</span>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs max-w-[240px]">
                Unity gear (Gelatinous Ring +1, Warder&apos;s Charm +1, Ambuscade Unity pieces, etc.) has &quot;Unity Ranking:&quot; bonuses that scale from the low value at rank 11 to the full value at rank 1. The optimizer uses this rank when scoring those items.
              </TooltipContent>
            </Tooltip>
            <Select value={String(unityRank ?? 1)} onValueChange={(v: string) => onUnityRank?.(Number(v))}>
              <SelectTrigger className="h-8 w-[112px] text-xs" aria-label="Unity Ranking"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: UNITY_MAX_RANK }, (_, i) => i + 1).map((r) => (
                  <SelectItem key={r} value={String(r)} className="text-xs">Rank {r}{r === 1 ? ' (max)' : r === UNITY_MAX_RANK ? ' (min)' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {CATS.map((cat) => {
          const items = BUFFS.filter((b: BuffDef) => b.category === cat.key);
          if (!items.length) return null;
          return (
            <div key={cat.key} className="rounded-md bg-secondary/40 p-3">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{cat.icon}{cat.label}</div>
              <div className="space-y-1.5">
                {items.map((b: BuffDef) => (
                  <div key={b.id} className="flex items-center justify-between gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm truncate cursor-help">{b.name}{b.personal ? <span className="ml-1 text-[10px] text-muted-foreground">(personal)</span> : null}</span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">{b.description}</TooltipContent>
                    </Tooltip>
                    <Switch checked={selected.has(b.id)} onCheckedChange={() => onToggle?.(b.id, b.exclusiveGroup, b.exclusiveGroup ? groups[b.exclusiveGroup] : undefined)} aria-label={b.name} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
