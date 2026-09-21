'use client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Sword, Shield, Crosshair, Circle, HardHat, Shirt, Hand, Footprints, Gem, Wind, RectangleVertical } from 'lucide-react';
import { SLOTS, SLOT_LABELS, DB_SLOT_TO_SLOTS, blockedSlots, type GearDB, type GearItem, type GearSet, type Inventory, type Slot } from '@/lib/ffxi/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const ICONS: Record<Slot, React.ReactNode> = {
  main: <Sword className="h-4 w-4" />, sub: <Shield className="h-4 w-4" />, range: <Crosshair className="h-4 w-4" />, ammo: <Circle className="h-4 w-4" />,
  head: <HardHat className="h-4 w-4" />, body: <Shirt className="h-4 w-4" />, hands: <Hand className="h-4 w-4" />, legs: <RectangleVertical className="h-4 w-4" />,
  feet: <Footprints className="h-4 w-4" />, neck: <Gem className="h-4 w-4" />, waist: <Wind className="h-4 w-4" />, left_ear: <Gem className="h-4 w-4" />,
  right_ear: <Gem className="h-4 w-4" />, left_ring: <Circle className="h-4 w-4" />, right_ring: <Circle className="h-4 w-4" />, back: <Wind className="h-4 w-4" />,
};

// FFXI equipment screen layout (4x4)
const LAYOUT: Slot[] = ['main', 'sub', 'range', 'ammo', 'head', 'neck', 'left_ear', 'right_ear', 'body', 'hands', 'left_ring', 'right_ring', 'back', 'waist', 'legs', 'feet'];

const STAT_ORDER = ['DEF', 'HP', 'MP', 'STR', 'DEX', 'VIT', 'AGI', 'INT', 'MND', 'CHR', 'ACC', 'ATT', 'RACC', 'RATT', 'MACC', 'MATT', 'hasteGear', 'storetp', 'doubleAttack', 'tripleAttack', 'quadAttack', 'dualWield', 'crithitrate', 'critDmgIncrease', 'allWsdmgAllHits', 'allWsdmgFirstHit', 'tpBonus', 'wsacc', 'fastcast', 'curePotency', 'curePotencyIi', 'enmity', 'refresh', 'regen', 'dmg', 'dmgphys', 'dmgmagic', 'MEVA', 'MDEF', 'EVA', 'treasureHunter', 'subtleBlow', 'magicDamage', 'magicBurstBonusCapped', 'moveSpeedGearBonus', 'martialArts'];
const STAT_LABEL: Record<string, string> = {
  hasteGear: 'Haste', storetp: 'Store TP', doubleAttack: 'Double Atk', tripleAttack: 'Triple Atk', quadAttack: 'Quad Atk', dualWield: 'Dual Wield', crithitrate: 'Crit Rate',
  critDmgIncrease: 'Crit Dmg', allWsdmgAllHits: 'WS Dmg', allWsdmgFirstHit: 'WS Dmg (1st)', tpBonus: 'TP Bonus', wsacc: 'WS Acc', fastcast: 'Fast Cast', curePotency: 'Cure Pot.',
  curePotencyIi: 'Cure Pot. II', enmity: 'Enmity', refresh: 'Refresh', regen: 'Regen', dmg: 'DT', dmgphys: 'PDT', dmgmagic: 'MDT', MEVA: 'M.Eva', MDEF: 'M.Def', treasureHunter: 'TH',
  subtleBlow: 'Subtle Blow', magicDamage: 'Magic Dmg', magicBurstBonusCapped: 'MB Bonus', moveSpeedGearBonus: 'Movement', martialArts: 'Martial Arts', MACC: 'M.Acc', MATT: 'M.Atk',
};
const PCT_100 = new Set(['hasteGear', 'dmg', 'dmgphys', 'dmgmagic']);
const PCT = new Set(['doubleAttack', 'tripleAttack', 'quadAttack', 'dualWield', 'crithitrate', 'critDmgIncrease', 'allWsdmgAllHits', 'allWsdmgFirstHit', 'fastcast', 'curePotency', 'curePotencyIi', 'enmity', 'magicBurstBonusCapped', 'moveSpeedGearBonus', 'subtleBlow']);

export function formatStat(key: string, v: number): string {
  const label = STAT_LABEL[key] ?? key;
  if (PCT_100.has(key)) return `${label} ${v > 0 ? '+' : ''}${(v / 100).toFixed(v % 100 ? 1 : 0)}%`;
  if (PCT.has(key)) return `${label} ${v > 0 ? '+' : ''}${v}%`;
  return `${label} ${v > 0 ? '+' : ''}${v}`;
}

export function itemStatList(item: GearItem | undefined): string[] {
  if (!item) return [];
  const stats = item.stats ?? {};
  const keys = Object.keys(stats).sort((a, b) => {
    const ia = STAT_ORDER.indexOf(a); const ib = STAT_ORDER.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
  });
  const out: string[] = [];
  if (item.weapon && item.weapon.skill !== 'None') {
    const isH2H = item.weapon.skill === 'Hand To Hand';
    out.push(`DMG ${item.weapon.damage ?? 0}  Delay ${isH2H ? (item.weapon.delay ?? 0) - 480 : item.weapon.delay ?? 0}  (${item.weapon.skill})`);
  }
  for (const k of keys) {
    const v = stats[k];
    if (typeof v !== 'number' || v === 0) continue;
    out.push(formatStat(k, v));
  }
  return out;
}

export function GearGrid({ db, gear, inventory, mainJob, onChange, highlight }: {
  db: GearDB | null; gear: GearSet; inventory: Inventory; mainJob: string; onChange?: (slot: Slot, id: number | null) => void; highlight?: Partial<Record<Slot, boolean>>;
}) {
  const [pickSlot, setPickSlot] = useState<Slot | null>(null);
  const blocked = useMemo(() => (db ? blockedSlots(gear ?? {}, db) : {}), [db, gear]);
  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-4 gap-2">
        {LAYOUT.map((slot: Slot, i: number) => {
          const id = gear?.[slot];
          const blocker = blocked[slot];
          const item = id != null && !blocker ? db?.[String(id)] : undefined;
          if (blocker) {
            return (
              <Tooltip key={slot}>
                <TooltipTrigger asChild>
                  <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}
                    className="slot-cell relative flex min-h-[84px] flex-col rounded-md p-2 text-left shadow-md bg-secondary/20 opacity-60">
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">{ICONS[slot]}{SLOT_LABELS[slot]}</span>
                    <span className="mt-1 text-xs italic text-muted-foreground">Hidden by {SLOT_LABELS[blocker]}</span>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">This slot cannot be used while {db?.[String(gear?.[blocker])]?.displayName ?? 'the equipped item'} is worn in the {SLOT_LABELS[blocker]} slot.</TooltipContent>
              </Tooltip>
            );
          }
          return (
            <Tooltip key={slot}>
              <TooltipTrigger asChild>
                <motion.button type="button" onClick={() => setPickSlot(slot)}
                  initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}
                  className={cn('slot-cell relative flex min-h-[84px] flex-col rounded-md p-2 text-left shadow-md', item ? 'bg-accent/70' : 'bg-secondary/40', highlight?.[slot] ? 'ring-2 ring-primary/70' : '')}>
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">{ICONS[slot]}{SLOT_LABELS[slot]}</span>
                  <span className={cn('mt-1 text-sm font-medium leading-tight', item ? 'text-foreground' : 'text-muted-foreground/60 italic')}>{item?.displayName ?? 'Empty'}</span>
                  {item?.iLevel ? <span className="absolute right-1.5 top-1.5 rounded bg-primary/20 px-1 text-[10px] font-mono text-primary">i{item.iLevel}</span> : null}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {item ? (
                  <div>
                    <div className="font-semibold text-primary mb-1">{item.displayName}</div>
                    {item.augments?.length ? <div className="mb-1 text-muted-foreground">Augments: {item.augments.join(', ')}</div> : null}
                    <div className="grid grid-cols-2 gap-x-3">{itemStatList(item).map((s: string, idx: number) => <div key={idx}>{s}</div>)}</div>
                    {(item.stats && Object.keys(item.stats).length === 0) ? <div className="text-muted-foreground">No parsed stats (augment-only item)</div> : null}
                  </div>
                ) : <div>Click to choose an item for this slot</div>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <SlotPicker db={db} slot={pickSlot} inventory={inventory} mainJob={mainJob} current={pickSlot ? gear?.[pickSlot] ?? null : null}
        onClose={() => setPickSlot(null)} onPick={(id: number | null) => { if (pickSlot) onChange?.(pickSlot, id); setPickSlot(null); }} />
    </TooltipProvider>
  );
}

function SlotPicker({ db, slot, inventory, mainJob, current, onClose, onPick }: {
  db: GearDB | null; slot: Slot | null; inventory: Inventory; mainJob: string; current: number | null; onClose: () => void; onPick: (id: number | null) => void;
}) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    if (!db || !slot) return [] as GearItem[];
    const out: GearItem[] = [];
    for (const id of Object.keys(inventory ?? {})) {
      const it = db[id];
      if (!it || !(it.jobs ?? []).includes(mainJob)) continue;
      const fits = (it.slots ?? []).some((s: string) => (DB_SLOT_TO_SLOTS[s] ?? []).includes(slot));
      if (!fits) continue;
      if (q && !(it.displayName ?? '').toLowerCase().includes(q.toLowerCase())) continue;
      out.push(it);
    }
    return out.sort((a: GearItem, b: GearItem) => (b.iLevel ?? 0) - (a.iLevel ?? 0) || (a.displayName ?? '').localeCompare(b.displayName ?? '')).slice(0, 200);
  }, [db, slot, inventory, mainJob, q]);

  return (
    <Dialog open={!!slot} onOpenChange={(o: boolean) => { if (!o) onClose?.(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-display">Choose {slot ? SLOT_LABELS[slot] : ''} item</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search owned items for this slot…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="max-h-[50vh] overflow-y-auto space-y-1 pr-1">
          <button type="button" onClick={() => onPick?.(null)} className="w-full rounded-md bg-secondary/50 px-3 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"><X className="h-4 w-4" /> Leave empty</button>
          {list.map((it: GearItem) => (
            <button key={it.id} type="button" onClick={() => onPick?.(it.id)} className={cn('w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent', current === it.id ? 'bg-primary/20' : 'bg-secondary/40')}>
              <div className="flex items-center justify-between"><span className="font-medium">{it.displayName}</span>{it.iLevel ? <span className="font-mono text-[10px] text-primary">i{it.iLevel}</span> : null}</div>
              <div className="text-[11px] text-muted-foreground line-clamp-2">{itemStatList(it).join(' · ') || 'No parsed stats'}</div>
            </button>
          ))}
          {list.length === 0 ? <p className="text-sm text-muted-foreground p-3">No owned items fit this slot for {mainJob}. Import your inventory or add items manually.</p> : null}
        </div>
        <div className="flex justify-end"><Button variant="secondary" onClick={onClose}>Close</Button></div>
      </DialogContent>
    </Dialog>
  );
}
