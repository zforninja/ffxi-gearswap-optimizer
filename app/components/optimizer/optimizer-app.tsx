'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Sword, Package, LogIn, LogOut, Play, Loader2, Sparkles, Settings2, Target as TargetIcon, Wand2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { loadGearDb } from '@/lib/ffxi/gear-loader';
import { evaluateSet } from '@/lib/ffxi/optimizer';
import { buildAugmentedItem } from '@/lib/ffxi/augments';
import type { GearDB, GearSet, OptimizedSet, Slot, BuffTier } from '@/lib/ffxi/types';
import { useAppStore, resolveTarget } from '@/lib/store';
import { useOptimizer } from './use-optimizer';
import { JobSelector } from './job-selector';
import { BuffPanel } from './buff-panel';
import { MobPanel } from './mob-panel';
import { WsPanel } from './ws-panel';
import { GearGrid } from './gear-grid';
import { StatPanel } from './stat-panel';
import { ExportPanel } from './export-panel';
import { InventoryDialog, type ParsedExport } from './inventory-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type User = { name: string | null; email: string | null } | null;

export function OptimizerApp({ user }: { user: User }) {
  const s = useAppStore();
  const [baseDb, setDb] = useState<GearDB | null>(null);
  // Merge augmented virtual items (ids >= 1,000,000) from the import into the base database
  const db = useMemo<GearDB | null>(() => {
    if (!baseDb) return null;
    const extra = s.extraItems ?? {};
    if (!Object.keys(extra).length) return baseDb;
    // Re-derive every augmented copy from the current base row + augment parser, so imports saved before a parser or
    // path-table improvement pick up the new stats without re-importing.
    const rebuilt: GearDB = {};
    for (const [k, it] of Object.entries(extra)) {
      const base = it.baseId !== undefined ? baseDb[String(it.baseId)] : undefined;
      rebuilt[k] = base ? buildAugmentedItem(base, it.augments ?? [], it.id) : it;
    }
    return { ...baseDb, ...rebuilt };
  }, [baseDb, s.extraItems]);
  const [dbError, setDbError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'setup' | 'buffs' | 'target'>('setup');
  const [activeKey, setActiveKey] = useState<string>('tp');
  const [tier, setTier] = useState<BuffTier>('high');
  const [overrides, setOverrides] = useState<Record<string, GearSet>>({});
  const { optimize, running, progress } = useOptimizer(db);

  useEffect(() => {
    setMounted(true);
    loadGearDb().then(setDb).catch((e: Error) => { console.error(e); setDbError(e?.message ?? 'Failed to load gear database'); });
  }, []);

  const target = resolveTarget(s);
  const invCount = Object.keys(s.inventory ?? {}).length;
  const results = s.results ?? [];

  const baseKeys = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of results) {
      const base = (r?.key ?? '').split(':').slice(0, -1).join(':');
      if (base && !seen.has(base)) seen.set(base, r.label);
    }
    return [...seen.entries()];
  }, [results]);

  const current: OptimizedSet | null = useMemo(() => results.find((r: OptimizedSet) => r?.key === `${activeKey}:${tier}`) ?? null, [results, activeKey, tier]);
  const currentGear: GearSet | null = current ? overrides[current.key] ?? current.gear : null;

  const evaluation = useMemo(() => {
    if (!db || !current || !currentGear) return null;
    if (!overrides[current.key]) return current.evaluation;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return evaluateSet(db, cfg(), current.tier, current.context, currentGear);
    } catch (e) { console.error(e); return current.evaluation; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, current, currentGear, overrides]);

  function cfg() {
    return { mainJob: s.mainJob, subJob: s.subJob, inventory: s.inventory ?? {}, buffIds: s.buffIds ?? [], target, lockedMain: s.lockedMain, lockedSub: s.lockedSub, primaryWs: s.primaryWs, dtThreshold: s.dtThreshold, wsNames: s.wsNames ?? [], unityRank: s.unityRank ?? 1 };
  }

  const run = async () => {
    if (!db) return;
    if (!invCount) { toast.error('Import or add some gear first'); setInvOpen(true); return; }
    try {
      const res = await optimize(cfg());
      s.setResults(res);
      setOverrides({});
      if (!res.some((r: OptimizedSet) => r.key === `${activeKey}:${tier}`)) setActiveKey('tp');
      toast.success(`Built ${res.length} sets for ${s.mainJob}/${s.subJob}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Optimization failed');
    }
  };

  const onImport = (p: ParsedExport) => {
    s.setInventory(p.inventory, p.characterName || undefined, p.extraItems ?? {});
    if (p.mainJob && p.mainJob !== s.mainJob) s.setMainJob(p.mainJob);
    if (p.subJob) s.setSubJob(p.subJob);
  };

  const changeSlot = (slot: Slot, id: number | null) => {
    if (!current) return;
    const g: GearSet = { ...(currentGear ?? {}) };
    if (id == null) delete g[slot]; else g[slot] = id;
    setOverrides((o) => ({ ...o, [current.key]: g }));
  };

  if (!mounted) return <div className="min-h-screen" />;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/70 shadow-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/15 flex items-center justify-center"><Sword className="h-5 w-5 text-primary" /></div>
            <div>
              <h1 className="font-display text-lg font-semibold leading-tight">Vana&apos;diel Gear Optimizer</h1>
              <p className="text-[11px] text-muted-foreground">Optimal GearSwap sets from the gear you own</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setInvOpen(true)}><Package className="h-4 w-4 mr-2" /> Inventory <Badge variant="outline" className="ml-2 font-mono border-primary/40 text-primary">{invCount}</Badge></Button>
            {user ? (
              <Button variant="ghost" onClick={() => void signOut({ redirectTo: '/' })} title={user.email ?? ''}><LogOut className="h-4 w-4 mr-2" /> {user.name || 'Sign out'}</Button>
            ) : (
              <Button variant="ghost" asChild><Link href="/login"><LogIn className="h-4 w-4 mr-2" /> Sign in</Link></Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-5 grid gap-4 lg:grid-cols-[300px_1fr_300px]">
        {/* Left sidebar */}
        <motion.aside initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="rounded-lg bg-card p-4 shadow-lg space-y-4 h-fit lg:sticky lg:top-20">
          <Tabs value={sidebarTab} onValueChange={(v: string) => setSidebarTab(v as typeof sidebarTab)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="setup"><Settings2 className="h-3.5 w-3.5 mr-1" />Job</TabsTrigger>
              <TabsTrigger value="buffs"><Wand2 className="h-3.5 w-3.5 mr-1" />Buffs</TabsTrigger>
              <TabsTrigger value="target"><TargetIcon className="h-3.5 w-3.5 mr-1" />Target</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1 space-y-4">
            {sidebarTab === 'setup' && (
              <>
                <JobSelector mainJob={s.mainJob} subJob={s.subJob} onMain={s.setMainJob} onSub={s.setSubJob} />
                <WsPanel db={db} inventory={s.inventory ?? {}} mainJob={s.mainJob} wsNames={s.wsNames ?? []} primaryWs={s.primaryWs} lockedMain={s.lockedMain} lockedSub={s.lockedSub}
                  onWsNames={s.setWsNames} onPrimary={s.setPrimaryWs} onLockMain={s.setLockedMain} onLockSub={s.setLockedSub} />
              </>
            )}
            {sidebarTab === 'buffs' && <BuffPanel buffIds={s.buffIds ?? []} onToggle={s.toggleBuff} unityRank={s.unityRank ?? 1} onUnityRank={s.setUnityRank} />}
            {sidebarTab === 'target' && <MobPanel tier={s.mobTier} custom={s.customTarget} dtThreshold={s.dtThreshold} onTier={s.setMobTier} onCustom={s.setCustomTarget} onDt={s.setDtThreshold} />}
          </div>
          <Button className="w-full" size="lg" onClick={() => void run()} disabled={!db || running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            {running ? `Optimizing… ${progress?.label ?? ''}` : 'Optimize all sets'}
          </Button>
          {running && progress ? <Progress value={(progress.done / Math.max(1, progress.total)) * 100} /> : null}
          {!db && !dbError ? <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading gear database (15,000+ items)…</p> : null}
          {dbError ? <p className="text-xs text-destructive">{dbError}</p> : null}
        </motion.aside>

        {/* Main */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg bg-card p-4 shadow-lg space-y-4">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 space-y-3">
              <Sparkles className="h-10 w-10 text-primary" />
              <h2 className="font-display text-xl font-semibold">Build your <span className="gold-text">best</span> sets</h2>
              <p className="max-w-md text-sm text-muted-foreground">Import your GearExport inventory, pick a job, buffs and a target, then press <strong>Optimize all sets</strong>. You will get TP, weapon skill, hybrid, magic, healing, idle/DT, fast cast and treasure hunter sets in Low and High buff variants, ready to export to GearSwap Lua.</p>
              {invCount === 0 ? <Button onClick={() => setInvOpen(true)}><Package className="h-4 w-4 mr-2" /> Import inventory</Button> : <Button onClick={() => void run()} disabled={!db || running}><Play className="h-4 w-4 mr-2" /> Optimize all sets</Button>}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {baseKeys.map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setActiveKey(k)}
                    className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors shadow-sm', activeKey === k ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 hover:bg-secondary')}>{label}</button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold">{current?.label ?? 'Set'}</h2>
                  <p className="text-xs text-muted-foreground">{s.mainJob}/{s.subJob} · {target.name} · click any slot to swap items manually</p>
                </div>
                <div className="flex items-center gap-1 rounded-md bg-secondary/60 p-1">
                  {(['low', 'high'] as BuffTier[]).map((t) => (
                    <button key={t} type="button" onClick={() => setTier(t)} className={cn('rounded px-3 py-1 text-xs font-semibold', tier === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>{t === 'low' ? 'Low buff' : 'High buff'}</button>
                  ))}
                </div>
              </div>
              {current && currentGear ? (
                <GearGrid db={db} gear={currentGear} inventory={s.inventory ?? {}} mainJob={s.mainJob} onChange={changeSlot} />
              ) : <p className="text-sm text-muted-foreground">This set was not generated. Run the optimizer again.</p>}
              {current && overrides[current.key] ? (
                <Button variant="ghost" size="sm" onClick={() => setOverrides((o) => { const n = { ...o }; delete n[current.key]; return n; })}><RotateCcw className="h-3.5 w-3.5 mr-2" /> Reset manual changes</Button>
              ) : null}
            </>
          )}
        </motion.section>

        {/* Right panel */}
        <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="rounded-lg bg-card p-4 shadow-lg space-y-6 h-fit lg:sticky lg:top-20 max-h-[calc(100vh-100px)] overflow-y-auto">
          <StatPanel current={current} evaluation={evaluation} results={results} />
          <ExportPanel db={db} results={results.map((r: OptimizedSet) => (overrides[r.key] ? { ...r, gear: overrides[r.key] } : r))} current={current} currentGear={currentGear} mainJob={s.mainJob} subJob={s.subJob}
            characterName={s.characterName} targetName={target.name} loggedIn={!!user} onLoadSaved={(g: GearSet) => { if (current) setOverrides((o) => ({ ...o, [current.key]: g })); }} />
        </motion.aside>
      </main>

      <footer className="mx-auto max-w-[1200px] px-4 py-6 text-center text-[11px] text-muted-foreground">All calculations run in your browser. Gear stats parsed from the game resources; combat math is an approximation of Vana&apos;diel formulas.</footer>

      <InventoryDialog open={invOpen} onOpenChange={setInvOpen} db={db} inventory={s.inventory ?? {}} characterName={s.characterName} mainJob={s.mainJob} subJob={s.subJob} loggedIn={!!user} extraItems={s.extraItems ?? {}}
        onImport={onImport} onAdd={s.addItem} onRemove={s.removeItem} onClear={s.clearInventory} />
    </div>
  );
}
