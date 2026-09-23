'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Copy, FileText, Loader2, Upload, Wand2, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { BuffTier, GearDB, OptimizedSet } from '@/lib/ffxi/types';
import { JOBS, WS_BY_NAME } from '@/lib/ffxi/constants';
import { downloadText } from '@/lib/ffxi/lua-export';
import { fillTemplate, guessTemplateJob, parseTemplateBlocks, type FillReport } from '@/lib/ffxi/template-fill';
import { buildSkeleton, hasVendoredTemplate, vendoredTemplateUrl } from '@/lib/ffxi/template-skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Source = 'builtin' | 'generic' | 'upload';

export function TemplatePanel({ db, results, mainJob, subJob, characterName, targetName, wsNames, onWsNames, onRunOptimizer, optimizerRunning }: {
  db: GearDB | null;
  results: OptimizedSet[];
  mainJob: string;
  subJob: string;
  characterName: string;
  targetName: string;
  wsNames: string[];
  onWsNames: (names: string[]) => void;
  onRunOptimizer: () => void;
  optimizerRunning: boolean;
}) {
  const vendored = hasVendoredTemplate(mainJob);
  const [source, setSource] = useState<Source>(vendored ? 'builtin' : 'generic');
  const [tier, setTier] = useState<BuffTier>('high');
  const [uploaded, setUploaded] = useState<{ name: string; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<FillReport | null>(null);
  const [preview, setPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Switch back to a sensible default when the job changes.
  useEffect(() => { setSource(hasVendoredTemplate(mainJob) ? 'builtin' : 'generic'); setReport(null); }, [mainJob]);

  const uploadedJob = useMemo(() => (uploaded ? guessTemplateJob(uploaded.name, uploaded.text, JOBS as unknown as string[]) : null), [uploaded]);
  const uploadedBlocks = useMemo(() => (uploaded ? parseTemplateBlocks(uploaded.text).length : 0), [uploaded]);

  const onFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      if (!parseTemplateBlocks(text).length) { toast.error('No `sets.* = {` blocks found in that file'); return; }
      setUploaded({ name: file.name, text });
      setSource('upload');
      setReport(null);
      toast.success(`Loaded ${file.name}`);
    };
    reader.onerror = () => toast.error('Could not read that file');
    reader.readAsText(file);
  };

  const loadTemplateText = async (): Promise<{ text: string; attribution: string | null }> => {
    if (source === 'upload') {
      if (!uploaded) throw new Error('Upload a GearSwap .lua file first');
      return { text: uploaded.text, attribution: null };
    }
    if (source === 'builtin') {
      const r = await fetch(vendoredTemplateUrl(mainJob));
      if (!r.ok) throw new Error(`Built-in template for ${mainJob} could not be loaded`);
      return { text: await r.text(), attribution: 'Template: Masin-M/Gearswap_generator (MIT License)' };
    }
    const generated = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC';
    return { text: buildSkeleton(mainJob, { wsNames, player: characterName || undefined, generated }), attribution: null };
  };

  const fill = async () => {
    if (!db) return;
    if (!results?.length) { toast.error('Run the optimizer first so there are sets to fill in'); return; }
    setLoading(true);
    try {
      const { text, attribution } = await loadTemplateText();
      const stamp = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC';
      const banner = [
        `Vana'diel Gear Optimizer — sets filled ${stamp}`,
        `Job ${mainJob}/${subJob || '—'} · buff tier ${tier === 'high' ? 'High' : 'Low'} · target ${targetName}${characterName ? ` · ${characterName}` : ''}`,
        'Sets the optimizer does not model (job abilities, buffs, etc.) were left exactly as in the template.',
      ];
      if (attribution) banner.push(attribution);
      const rep = fillTemplate(text, results, db, { tier, primaryWs: wsNames[0] ?? null, banner });
      setReport(rep);
      if (!rep.filled.length) toast.warning('No sets could be filled — check that the optimizer results match this job');
      else toast.success(`Filled ${rep.filled.length} of ${rep.blocks} sets`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Could not fill the template');
    } finally { setLoading(false); }
  };

  const fileName = `${mainJob}.lua`;
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success('Copied to clipboard'); } catch { toast.error('Clipboard unavailable'); }
  };

  const missingWs = useMemo(() => {
    const names = new Set<string>();
    for (const s of report?.skipped ?? []) if (s.missingWs && WS_BY_NAME[s.missingWs] && !wsNames.includes(s.missingWs)) names.add(s.missingWs);
    return Array.from(names);
  }, [report, wsNames]);

  const addMissingWs = () => {
    if (!missingWs.length) return;
    onWsNames([...wsNames, ...missingWs]);
    toast.info(`Added ${missingWs.join(', ')} — run the optimizer again, then fill the template`);
  };

  const sourceLabel: Record<Source, string> = {
    builtin: `Built-in ${mainJob} template (Masin-M)`,
    generic: `Generic ${mainJob} skeleton (all WS in your list)`,
    upload: uploaded ? `Uploaded: ${uploaded.name}` : 'Upload your own .lua',
  };

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Complete job file (template)</h3>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Start from a blank Mote-Include job file, and the optimizer fills every TP, weapon skill, idle, hybrid, fast cast and magic set with your gear.
        Job-specific sets it does not model stay untouched, so the file loads in GearSwap as-is.
      </p>
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-14 shrink-0">Template</span>
          <Select value={source} onValueChange={(v) => setSource(v as Source)}>
            <SelectTrigger className="h-8 text-xs" aria-label="Template source"><SelectValue>{sourceLabel[source]}</SelectValue></SelectTrigger>
            <SelectContent>
              {vendored ? <SelectItem value="builtin" className="text-xs">{sourceLabel.builtin}</SelectItem> : null}
              <SelectItem value="generic" className="text-xs">{sourceLabel.generic}</SelectItem>
              <SelectItem value="upload" className="text-xs">{sourceLabel.upload}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-14 shrink-0">Buffs</span>
          <Select value={tier} onValueChange={(v) => setTier(v as BuffTier)}>
            <SelectTrigger className="h-8 text-xs" aria-label="Buff tier for the filled sets"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high" className="text-xs">High buff tier sets</SelectItem>
              <SelectItem value="low" className="text-xs">Low buff tier sets</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {source === 'upload' ? (
          <div className="rounded-md border border-dashed border-border/70 p-2 text-xs space-y-1">
            <input ref={fileRef} type="file" accept=".lua,text/plain" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            <Button size="sm" variant="secondary" className="w-full" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5 mr-2" /> {uploaded ? 'Choose another .lua' : 'Choose a GearSwap .lua'}</Button>
            {uploaded ? (
              <div className="text-muted-foreground">
                {uploaded.name} · {uploadedBlocks} set blocks
                {uploadedJob && uploadedJob !== mainJob ? <span className="text-amber-400"> · looks like a {uploadedJob} file, but {mainJob} is selected</span> : null}
              </div>
            ) : <div className="text-muted-foreground">Any Mote-Include style file works, e.g. one generated by Masin-M&apos;s Gearswap_generator. Existing gear in the recognized sets is replaced.</div>}
          </div>
        ) : null}
        <Button onClick={() => void fill()} disabled={!db || loading || !results?.length || (source === 'upload' && !uploaded)}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />} Fill template with optimized sets
        </Button>
        {!results?.length ? <p className="text-[11px] text-muted-foreground">Run the optimizer first — the template is filled from its results.</p> : null}
      </div>

      {report ? (
        <div className="rounded-md bg-secondary/40 p-2 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium"><CheckCircle2 className="inline h-3.5 w-3.5 mr-1 text-emerald-400" />{report.filled.length} of {report.blocks} sets filled</span>
            <span className="flex gap-1">
              <Button size="sm" variant="secondary" onClick={() => setPreview(true)}><FileText className="h-3.5 w-3.5 mr-1" /> Preview</Button>
              <Button size="sm" onClick={() => downloadText(fileName, report.text)}><Download className="h-3.5 w-3.5 mr-1" /> {fileName}</Button>
            </span>
          </div>
          {missingWs.length ? (
            <div className="rounded bg-amber-500/10 border border-amber-500/30 p-2 space-y-1">
              <div className="text-amber-300"><AlertTriangle className="inline h-3.5 w-3.5 mr-1" />The template has weapon skill sets you have not optimized yet: {missingWs.join(', ')}</div>
              <Button size="sm" variant="secondary" onClick={addMissingWs}><Plus className="h-3.5 w-3.5 mr-1" /> Add to weapon skill list</Button>
              <Button size="sm" variant="ghost" onClick={onRunOptimizer} disabled={optimizerRunning}>{optimizerRunning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null} Re-run optimizer</Button>
            </div>
          ) : null}
          <details>
            <summary className="cursor-pointer text-muted-foreground">Filled sets ({report.filled.length})</summary>
            <ul className="mt-1 space-y-0.5 max-h-40 overflow-auto">
              {report.filled.map((f) => (
                <li key={f.path} className="flex gap-2"><code className="text-primary/90 shrink-0">{f.path}</code><span className="text-muted-foreground truncate">← {f.source}, {f.slots} slots{f.note ? ` · ${f.note}` : ''}</span></li>
              ))}
            </ul>
          </details>
          {report.skipped.length ? (
            <details>
              <summary className="cursor-pointer text-muted-foreground">Left as in the template ({report.skipped.length})</summary>
              <ul className="mt-1 space-y-0.5 max-h-40 overflow-auto">
                {report.skipped.map((s) => (
                  <li key={s.path} className="flex gap-2"><code className="shrink-0">{s.path}</code><span className="text-muted-foreground truncate">{s.reason}</span></li>
                ))}
              </ul>
            </details>
          ) : null}
          {source === 'builtin' ? <p className="text-[10px] text-muted-foreground">Built-in template © Masin-M (Gearswap_generator, MIT License).</p> : null}
        </div>
      ) : null}

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle className="font-display">{fileName} preview</DialogTitle></DialogHeader>
          <pre className="max-h-[65vh] overflow-auto rounded-md bg-background p-4 text-xs font-mono leading-relaxed">{report?.text ?? ''}</pre>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => void copy(report?.text ?? '')}><Copy className="h-4 w-4 mr-2" /> Copy all</Button>
            <Button onClick={() => report && downloadText(fileName, report.text)}><Download className="h-4 w-4 mr-2" /> Download</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
