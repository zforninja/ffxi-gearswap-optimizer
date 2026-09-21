'use client';
import { useMemo } from 'react';
import { Sparkles, Lock, Unlock } from 'lucide-react';
import { WEAPONSKILLS, type WeaponSkillDef } from '@/lib/ffxi/constants';
import type { GearDB, GearItem, Inventory } from '@/lib/ffxi/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function WsPanel({ db, inventory, mainJob, wsNames, primaryWs, lockedMain, lockedSub, onWsNames, onPrimary, onLockMain, onLockSub }: {
  db: GearDB | null; inventory: Inventory; mainJob: string; wsNames: string[]; primaryWs: string | null; lockedMain: number | null; lockedSub: number | null;
  onWsNames: (n: string[]) => void; onPrimary: (n: string | null) => void; onLockMain: (id: number | null) => void; onLockSub: (id: number | null) => void;
}) {
  const ownedWeapons = useMemo(() => {
    if (!db) return { mains: [] as GearItem[], subs: [] as GearItem[], skills: new Set<string>() };
    const mains: GearItem[] = [];
    const subs: GearItem[] = [];
    const skills = new Set<string>();
    for (const id of Object.keys(inventory ?? {})) {
      const it = db[id];
      if (!it || !(it.jobs ?? []).includes(mainJob)) continue;
      if (it.slots?.includes('Main')) { mains.push(it); if (it.weapon?.skill) skills.add(it.weapon.skill); }
      if (it.slots?.includes('Ranged') && it.weapon?.skill) skills.add(it.weapon.skill);
      if (it.slots?.includes('Sub')) subs.push(it);
    }
    mains.sort((a: GearItem, b: GearItem) => (a.displayName ?? '').localeCompare(b.displayName ?? ''));
    subs.sort((a: GearItem, b: GearItem) => (a.displayName ?? '').localeCompare(b.displayName ?? ''));
    return { mains, subs, skills };
  }, [db, inventory, mainJob]);

  const grouped = useMemo(() => {
    const m: Record<string, WeaponSkillDef[]> = {};
    for (const ws of WEAPONSKILLS) (m[ws.skill] ??= []).push(ws);
    const order = Object.keys(m).sort((a, b) => Number(ownedWeapons.skills.has(b)) - Number(ownedWeapons.skills.has(a)) || a.localeCompare(b));
    return order.map((k) => ({ skill: k, list: m[k] ?? [], owned: ownedWeapons.skills.has(k) }));
  }, [ownedWeapons]);

  const toggle = (name: string) => {
    const cur = new Set(wsNames ?? []);
    if (cur.has(name)) cur.delete(name); else cur.add(name);
    const next = [...cur];
    onWsNames?.(next);
    if (!primaryWs || !cur.has(primaryWs)) onPrimary?.(next[0] ?? null);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> Primary weapon skill (drives TP set)</Label>
        <Select value={primaryWs ?? '__none'} onValueChange={(v: string) => onPrimary?.(v === '__none' ? null : v)}>
          <SelectTrigger className="bg-secondary/60"><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="__none">None (pure melee DPS)</SelectItem>
            {(wsNames ?? []).map((n: string) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Weapon skills to build sets for</Label>
        <div className="max-h-64 overflow-y-auto rounded-md bg-secondary/40 p-2 space-y-2">
          {grouped.map((g) => (
            <div key={g.skill}>
              <div className={cn('text-[11px] font-semibold uppercase tracking-wide mb-1', g.owned ? 'text-primary' : 'text-muted-foreground/60')}>{g.skill}{g.owned ? '' : ' (no weapon owned)'}</div>
              <div className="flex flex-wrap gap-1">
                {g.list.map((ws: WeaponSkillDef) => {
                  const on = (wsNames ?? []).includes(ws.name);
                  return (
                    <button key={ws.name} type="button" onClick={() => toggle(ws.name)}
                      className={cn('rounded px-2 py-1 text-xs transition-colors', on ? 'bg-primary text-primary-foreground shadow' : 'bg-card hover:bg-accent text-foreground')}>
                      {ws.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">{lockedMain != null ? <Lock className="h-3.5 w-3.5 text-primary" /> : <Unlock className="h-3.5 w-3.5" />} Lock main weapon</Label>
          <Select value={lockedMain != null ? String(lockedMain) : '__auto'} onValueChange={(v: string) => onLockMain?.(v === '__auto' ? null : Number(v))}>
            <SelectTrigger className="bg-secondary/60"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="__auto">Auto (optimizer picks)</SelectItem>
              {ownedWeapons.mains.map((w: GearItem) => <SelectItem key={w.id} value={String(w.id)}>{w.displayName} <Badge variant="outline" className="ml-1 text-[10px]">{w.weapon?.skill ?? ''}</Badge></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">{lockedSub != null ? <Lock className="h-3.5 w-3.5 text-primary" /> : <Unlock className="h-3.5 w-3.5" />} Lock sub / offhand</Label>
          <Select value={lockedSub != null ? String(lockedSub) : '__auto'} onValueChange={(v: string) => onLockSub?.(v === '__auto' ? null : Number(v))}>
            <SelectTrigger className="bg-secondary/60"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="__auto">Auto (optimizer picks)</SelectItem>
              {ownedWeapons.subs.map((w: GearItem) => <SelectItem key={w.id} value={String(w.id)}>{w.displayName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
