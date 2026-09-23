'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Search, Plus, Trash2, Package, CloudUpload, CloudDownload, Loader2, Minus } from 'lucide-react';
import { toast } from 'sonner';
import type { GearDB, GearItem, Inventory } from '@/lib/ffxi/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { itemStatList } from './gear-grid';
import { augmentKey, augmentVirtualId, buildAugmentedItem, isAugmentedId } from '@/lib/ffxi/augments';
import { parseInvdumpCsv } from '@/lib/ffxi/csv-import';

export type ParsedExport = {
  characterName: string; mainJob?: string; subJob?: string; inventory: Inventory; raw: string; unknown: number;
  /** Virtual augmented items (id >= 1,000,000) referenced by `inventory`. */
  extraItems: GearDB;
  augmented: number;
  /** augment strings that were not understood, and path/rank pieces whose stats come from the base row only */
  unparsedAugments: string[];
  pathRankItems: number;
  /** Path/Rank pieces whose augments were resolved from the BG-Wiki path table (Unity +1, Dynamis-D necks/weapons). */
  pathResolvedItems?: number;
  /** Unity items invdump flagged as stale (all-zero extdata): their real bonus imported as zero. CSV import only. */
  staleUnityItems?: { id: number; name: string; container: string; slot: number }[];
};

function augmentList(it: any): string[] {
  const raw = Array.isArray(it?.augments) ? it.augments : [];
  return raw.map((a: unknown) => String(a ?? '').trim()).filter((a: string) => a && !/^none$/i.test(a));
}

export function parseGearExport(text: string, db: GearDB): ParsedExport | null {
  let data: any;
  try { data = JSON.parse(text ?? '{}'); } catch { return null; }
  const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  if (!items.length) return null;
  const inv: Inventory = {};
  const extraItems: GearDB = {};
  let unknown = 0;
  let augmented = 0;
  const unparsedAugments: string[] = [];
  let pathRankItems = 0;
  let pathResolvedItems = 0;
  const staleUnityItems: { id: number; name: string; container: string; slot: number }[] = [];
  for (const it of items) {
    const id = Number(it?.id ?? it?.itemId ?? it?.item_id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const base = db?.[String(id)];
    if (!base) { unknown++; continue; }
    const count = Math.max(1, Number(it?.count ?? 1) || 1);
    // GearExport addon v1.2+: `stale: true` means the item's extdata was present but all-zero, i.e. Windower
    // never actually synced that slot this session. For a known-Unity item that always carries a real bonus,
    // so surface it instead of silently importing at zero. See docs/STALE_EXTDATA_IMPORT.md.
    if (it?.stale === true && base.unity) {
      staleUnityItems.push({ id, name: base.displayName, container: String(it?.bag ?? ''), slot: Number(it?.slotIndex ?? 0) || 0 });
    }
    const augs = augmentList(it);
    if (augs.length === 0) {
      inv[id] = (inv[id] ?? 0) + count;
      continue;
    }
    // each distinct augment combination becomes its own virtual item so the optimizer can tell copies apart
    const key = augmentKey(id, augs);
    let vid = augmentVirtualId(key);
    while (extraItems[String(vid)] && extraItems[String(vid)]!.baseId !== id) vid++;
    if (!extraItems[String(vid)]) {
      const built = buildAugmentedItem(base, augs, vid);
      extraItems[String(vid)] = built;
      augmented++;
      for (const u of built.unparsedAugments ?? []) if (!unparsedAugments.includes(u)) unparsedAugments.push(u);
      if ((built.pathRank ?? []).length) pathRankItems++;
      if ((built.resolvedAugments ?? []).length) pathResolvedItems++;
    }
    inv[vid] = (inv[vid] ?? 0) + count;
  }
  return {
    characterName: String(data?.character?.name ?? data?.player ?? ''), mainJob: data?.character?.mainJob, subJob: data?.character?.subJob,
    inventory: inv, raw: text, unknown, extraItems, augmented, unparsedAugments, pathRankItems, pathResolvedItems, staleUnityItems,
  };
}

type Snapshot = { id: string; characterName: string | null; mainJob: string | null; subJob: string | null; itemCount: number; createdAt: string };

export function InventoryDialog({ open, onOpenChange, db, inventory, extraItems, characterName, mainJob, subJob, loggedIn, onImport, onAdd, onRemove, onClear }: {
  open: boolean; onOpenChange: (o: boolean) => void; db: GearDB | null; inventory: Inventory; extraItems?: GearDB; characterName: string; mainJob: string; subJob: string; loggedIn: boolean;
  onImport: (p: ParsedExport) => void; onAdd: (id: number, count?: number) => void; onRemove: (id: number) => void; onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [q, setQ] = useState('');
  const [ownedQ, setOwnedQ] = useState('');
  const [lastRaw, setLastRaw] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [busy, setBusy] = useState(false);

  const count = Object.keys(inventory ?? {}).length;

  const searchResults = useMemo(() => {
    if (!db || q.trim().length < 2) return [] as GearItem[];
    const needle = q.toLowerCase();
    const out: GearItem[] = [];
    for (const it of Object.values(db)) {
      if ((it.displayName ?? '').toLowerCase().includes(needle) || (it.name ?? '').includes(needle.replace(/ /g, '_'))) {
        out.push(it);
        if (out.length >= 60) break;
      }
    }
    return out.sort((a: GearItem, b: GearItem) => Number((b.jobs ?? []).includes(mainJob)) - Number((a.jobs ?? []).includes(mainJob)) || (b.iLevel ?? 0) - (a.iLevel ?? 0));
  }, [db, q, mainJob]);

  const owned = useMemo(() => {
    if (!db) return [] as GearItem[];
    const needle = ownedQ.toLowerCase();
    const out: GearItem[] = [];
    for (const id of Object.keys(inventory ?? {})) {
      const it = db[id];
      if (!it) continue;
      if (needle && !(it.displayName ?? '').toLowerCase().includes(needle)) continue;
      out.push(it);
    }
    return out.sort((a: GearItem, b: GearItem) => (a.displayName ?? '').localeCompare(b.displayName ?? '')).slice(0, 400);
  }, [db, inventory, ownedQ]);

  const handleFile = async (file: File | undefined) => {
    if (!file || !db) return;
    try {
      const text = await file.text();
      // The GearExport addon writes JSON; invdump (and similar inventory-dump addons) write CSV with an
      // item_id/extdata header. Try CSV first when the file extension says so or JSON parsing fails.
      const looksJson = /^\s*[[{]/.test(text);
      const parsed = (file.name.toLowerCase().endsWith('.csv') || !looksJson) ? (parseInvdumpCsv(text, db) ?? parseGearExport(text, db)) : (parseGearExport(text, db) ?? parseInvdumpCsv(text, db));
      if (!parsed) { toast.error('Could not read this file. Export with the GearExport or invdump addon and try again.'); return; }
      setLastRaw(text);
      onImport?.(parsed);
      if (parsed.unparsedAugments.length) toast.warning(`${parsed.unparsedAugments.length} augment string(s) were not understood and count as zero: ${parsed.unparsedAugments.slice(0, 5).join(' | ')}${parsed.unparsedAugments.length > 5 ? ' …' : ''}`);
      if (parsed.pathResolvedItems) toast.info(`${parsed.pathResolvedItems} Path/Rank piece(s) resolved to their Unity / Dynamis-D path augments (scaled by rank).`);
      if (parsed.pathRankItems) toast.warning(`${parsed.pathRankItems} Path/Rank piece(s) are not in the path table yet: stats come from the base database row, not your chosen path.`);
      if (parsed.staleUnityItems?.length) {
        const names = parsed.staleUnityItems.map((s) => `${s.name} (${s.container})`).slice(0, 5).join(', ');
        toast.warning(`${parsed.staleUnityItems.length} Unity item(s) had no augment data captured (Windower never synced that slot) and imported with zero bonus: ${names}${parsed.staleUnityItems.length > 5 ? ' …' : ''}. Open each bag in-game once, then re-export.`, { duration: 12000 });
      }
      toast.success(`Imported ${Object.keys(parsed.inventory).length} items${parsed.characterName ? ` for ${parsed.characterName}` : ''}${parsed.augmented ? `, ${parsed.augmented} augmented` : ''}${parsed.unknown ? ` (${parsed.unknown} unknown skipped)` : ''}`);
    } catch (e) {
      console.error(e);
      toast.error('Import failed');
    }
  };

  const loadSnapshots = async () => {
    if (!loggedIn) return;
    try {
      const r = await fetch('/api/inventories');
      const d = await r.json().catch(() => ({}));
      if (r.ok) setSnapshots(d?.inventories ?? []);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { if (open && loggedIn) void loadSnapshots(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, loggedIn]);

  const saveCloud = async () => {
    if (!count) { toast.error('Nothing to save yet'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/inventories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterName: characterName || 'Character', mainJob, subJob, itemIds: { ...inventory, __extraItems: extraItems ?? {} }, rawJson: lastRaw }) });
      if (!r.ok) throw new Error('save failed');
      toast.success('Inventory saved to your account');
      await loadSnapshots();
    } catch (e) { console.error(e); toast.error('Could not save inventory'); } finally { setBusy(false); }
  };
  const loadCloud = async (id: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/inventories/${id}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error('load failed');
      const stored = { ...((d?.inventory?.itemIds ?? {}) as Record<string, unknown>) };
      const extra = (stored.__extraItems ?? {}) as GearDB;
      delete stored.__extraItems;
      const inv = stored as unknown as Inventory;
      onImport?.({ characterName: d?.inventory?.characterName ?? '', inventory: inv, raw: '', unknown: 0, extraItems: extra, augmented: Object.keys(extra).length, unparsedAugments: [], pathRankItems: 0 });
      toast.success(`Loaded ${Object.keys(inv).length} items`);
    } catch (e) { console.error(e); toast.error('Could not load inventory'); } finally { setBusy(false); }
  };
  const deleteCloud = async (id: string) => {
    try {
      const r = await fetch(`/api/inventories/${id}`, { method: 'DELETE' });
      if (r.ok) { toast.success('Snapshot deleted'); await loadSnapshots(); }
    } catch (e) { console.error(e); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Inventory <Badge variant="secondary" className="ml-1 font-mono">{count} items</Badge></DialogTitle>
          <DialogDescription>Import the JSON file from the GearExport addon (v1.2+ flags stale Unity data) or a compatible CSV export, or add items by hand. Your inventory is stored in this browser{loggedIn ? ' and can be synced to your account' : ''}.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="import">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="add">Add items</TabsTrigger>
            <TabsTrigger value="owned">Owned</TabsTrigger>
          </TabsList>
          <TabsContent value="import" className="space-y-3">
            <div className="rounded-md bg-secondary/40 p-4 text-sm space-y-2">
              <p>In game run <code className="font-mono text-primary">//gearexport</code> (or <code className="font-mono text-primary">//ge</code>) with the addon loaded. The file is written to <code className="font-mono">Windower/addons/GearExport/data/&lt;Character&gt;.json</code>.</p>
              <input ref={fileRef} type="file" accept=".json,application/json,.csv,text/csv" className="hidden" onChange={(e) => void handleFile(e.target.files?.[0])} />
              <Button onClick={() => fileRef.current?.click()} disabled={!db}><Upload className="h-4 w-4 mr-2" /> Choose export file</Button>
              {count > 0 ? <Button variant="ghost" className="ml-2 text-destructive" onClick={() => { if (confirm('Clear the current inventory?')) onClear?.(); }}><Trash2 className="h-4 w-4 mr-2" /> Clear inventory</Button> : null}
            </div>
            <div className="rounded-md bg-secondary/40 p-4 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-2"><CloudUpload className="h-4 w-4 text-primary" /> Cloud snapshots</span>
                {loggedIn ? <Button size="sm" onClick={() => void saveCloud()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}<span className="ml-2">Save current</span></Button> : <span className="text-xs text-muted-foreground">Sign in to sync inventories across devices.</span>}
              </div>
              {loggedIn && (
                <div className="space-y-1">
                  {snapshots.length === 0 ? <p className="text-xs text-muted-foreground">No snapshots saved yet.</p> : null}
                  {snapshots.map((s: Snapshot) => (
                    <div key={s.id} className="flex items-center justify-between rounded bg-card px-3 py-2 text-xs">
                      <span><span className="font-semibold">{s.characterName ?? 'Character'}</span> · {s.mainJob ?? '?'}/{s.subJob ?? '?'} · {s.itemCount} items · {new Date(s.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                      <span className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => void loadCloud(s.id)} disabled={busy}><CloudDownload className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteCloud(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="add" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search the full gear database (e.g. Nyame, Sakpata, Malignance)…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="max-h-[45vh] overflow-y-auto space-y-1 pr-1">
              {searchResults.map((it: GearItem) => {
                const ok = (it.jobs ?? []).includes(mainJob);
                const have = inventory?.[it.id] ?? 0;
                return (
                  <div key={it.id} className="flex items-center justify-between gap-2 rounded-md bg-secondary/40 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><span className="font-medium truncate">{it.displayName}</span>{it.iLevel ? <span className="font-mono text-[10px] text-primary">i{it.iLevel}</span> : null}{!ok ? <Badge variant="outline" className="text-[10px]">not {mainJob}</Badge> : null}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">{(it.slots ?? []).join('/')} · {itemStatList(it).join(' · ') || 'No parsed stats'}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {have > 0 ? <Badge variant="secondary" className="font-mono">×{have}</Badge> : null}
                      <Button size="sm" variant="secondary" onClick={() => onAdd?.(it.id, 1)}><Plus className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                );
              })}
              {q.trim().length >= 2 && searchResults.length === 0 ? <p className="text-sm text-muted-foreground p-3">No items match.</p> : null}
              {q.trim().length < 2 ? <p className="text-sm text-muted-foreground p-3">Type at least two characters. Add rings and earrings twice if you own a pair.</p> : null}
            </div>
          </TabsContent>
          <TabsContent value="owned" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Filter owned items…" value={ownedQ} onChange={(e) => setOwnedQ(e.target.value)} />
            </div>
            <div className="max-h-[45vh] overflow-y-auto space-y-1 pr-1">
              {owned.map((it: GearItem) => (
                <div key={it.id} className="flex items-center justify-between gap-2 rounded-md bg-secondary/40 px-3 py-1.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{isAugmentedId(it.id) ? db?.[String(it.baseId)]?.displayName ?? it.displayName : it.displayName} <span className="text-[11px] text-muted-foreground">({(it.slots ?? []).join('/')})</span></span>
                    {it.augments?.length ? <span className="block truncate text-[11px] text-primary/80">{it.augments.join(' · ')}</span> : null}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary" className="font-mono">×{inventory?.[it.id] ?? 0}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => onAdd?.(it.id, 1)}><Plus className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => ((inventory?.[it.id] ?? 0) > 1 ? onAdd?.(it.id, -1) : onRemove?.(it.id))}><Minus className="h-3.5 w-3.5" /></Button>
                  </span>
                </div>
              ))}
              {owned.length === 0 ? <p className="text-sm text-muted-foreground p-3">No items yet.</p> : null}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
