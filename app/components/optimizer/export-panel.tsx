'use client';
import { useEffect, useState } from 'react';
import { Download, Copy, Save, FileCode2, Loader2, Trash2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { GearDB, GearSet, OptimizedSet } from '@/lib/ffxi/types';
import { buildLuaExport, downloadText, gearSetToLua } from '@/lib/ffxi/lua-export';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Saved = { id: string; name: string; job: string; subJob: string | null; context: string; gear: GearSet; stats: Record<string, number> | null; updatedAt: string };

export function ExportPanel({ db, results, current, currentGear, mainJob, subJob, characterName, targetName, loggedIn, onLoadSaved }: {
  db: GearDB | null; results: OptimizedSet[]; current: OptimizedSet | null; currentGear: GearSet | null; mainJob: string; subJob: string; characterName: string; targetName: string; loggedIn: boolean;
  onLoadSaved: (gear: GearSet) => void;
}) {
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Saved[]>([]);

  const lua = db && results?.length ? buildLuaExport(results, db, { mainJob, subJob, character: characterName || undefined, targetName }) : '';

  const loadSaved = async () => {
    if (!loggedIn) return;
    try {
      const r = await fetch(`/api/gear-sets?job=${encodeURIComponent(mainJob)}`);
      const d = await r.json().catch(() => ({}));
      if (r.ok) setSaved(d?.gearSets ?? []);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { void loadSaved(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [loggedIn, mainJob]);

  const saveCurrent = async () => {
    if (!current || !currentGear) { toast.error('Select a set first'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/gear-sets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `${current.label} (${current.tier === 'high' ? 'High' : 'Low'})`, job: mainJob, subJob, context: current.key, gear: currentGear, stats: current.evaluation?.summary ?? null }) });
      if (!r.ok) throw new Error('save failed');
      toast.success('Set saved to your account');
      await loadSaved();
    } catch (e) { console.error(e); toast.error('Could not save set'); } finally { setSaving(false); }
  };
  const deleteSaved = async (id: string) => {
    try {
      const r = await fetch(`/api/gear-sets/${id}`, { method: 'DELETE' });
      if (r.ok) { toast.success('Deleted'); await loadSaved(); }
    } catch (e) { console.error(e); }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success('Copied to clipboard'); } catch { toast.error('Clipboard unavailable'); }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-semibold flex items-center gap-2"><FileCode2 className="h-4 w-4 text-primary" /> GearSwap export</h3>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => { if (!lua) { toast.error('Run the optimizer first'); return; } downloadText(`${(characterName || 'Character').replace(/\W+/g, '')}_${mainJob}_sets.lua`, lua); }} disabled={!lua}><Download className="h-4 w-4 mr-2" /> Download .lua</Button>
        <Button variant="secondary" onClick={() => setPreview(true)} disabled={!lua}><FileCode2 className="h-4 w-4 mr-2" /> Preview</Button>
        <Button variant="secondary" onClick={() => { if (current && currentGear && db) void copy(gearSetToLua(currentGear, db)); }} disabled={!current}><Copy className="h-4 w-4 mr-2" /> Copy this set</Button>
        <Button variant="secondary" onClick={() => void saveCurrent()} disabled={!current || !loggedIn || saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save to account</Button>
      </div>
      {!loggedIn ? <p className="text-[11px] text-muted-foreground">Sign in to save sets and inventories to your account.</p> : null}
      {loggedIn && saved.length > 0 ? (
        <div className="rounded-md bg-secondary/40 p-2 space-y-1">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-1">Saved {mainJob} sets</div>
          {saved.slice(0, 12).map((s: Saved) => (
            <div key={s.id} className="flex items-center justify-between rounded bg-card px-2 py-1.5 text-xs">
              <span className="truncate">{s.name}</span>
              <span className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => onLoadSaved?.(s.gear ?? {})} title="Load into current tab"><FolderOpen className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteSaved(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="font-display">GearSwap Lua preview</DialogTitle></DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-background p-4 text-xs font-mono leading-relaxed">{lua}</pre>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => void copy(lua)}><Copy className="h-4 w-4 mr-2" /> Copy all</Button>
            <Button onClick={() => downloadText(`${(characterName || 'Character').replace(/\W+/g, '')}_${mainJob}_sets.lua`, lua)}><Download className="h-4 w-4 mr-2" /> Download</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
