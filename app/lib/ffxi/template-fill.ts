import { WS_BY_NAME } from './constants';
import { luaItemValue } from './lua-export';
import { SLOTS, type BuffTier, type GearDB, type GearSet, type OptimizedSet, type Slot } from './types';

/**
 * Template-driven GearSwap generation.
 *
 * A template is a complete Mote-Include job file (e.g. from Masin-M/Gearswap_generator) whose `sets.*`
 * tables contain commented-out slot lines:
 *
 *     sets.engaged = {
 *         --main="",
 *         --head="",
 *         ...
 *     }
 *
 * `fillTemplate` finds every such block, decides which optimizer result it corresponds to (TP, hybrid, idle,
 * weapon skill, fast cast, ...) and rewrites the slot lines with the chosen gear. Everything else in the file
 * (state definitions, hooks, job abilities, buff sets) is left untouched.
 */

export type TemplateBlock = {
  /** Full set path as written, e.g. `sets.precast.WS['Tachi: Fudo']`. */
  path: string;
  /** 0-based line index of the header line and of the closing brace line. */
  start: number;
  end: number;
  /** Indentation of the slot lines inside the block. */
  indent: string;
};

export type SetTarget =
  | { kind: 'tp' | 'hybrid' | 'idle' | 'fastcast' | 'healing' | 'magic' | 'th'; acc?: boolean; note?: string }
  | { kind: 'ws'; wsName: string | null; acc?: boolean; note?: string };

export type FillEntry = { path: string; source: string; slots: number; note?: string };
export type SkipEntry = { path: string; reason: string; /** Set when the block wants a known weapon skill that was simply not optimized yet. */ missingWs?: string };

export type FillReport = {
  text: string;
  filled: FillEntry[];
  skipped: SkipEntry[];
  blocks: number;
};

export type FillOptions = {
  /** Buff tier to pull sets from (default `high`). */
  tier?: BuffTier;
  /** Results optimized against a harder target, used for `.Acc` variants when present. */
  accResults?: OptimizedSet[];
  /** Weapon skill used for the generic `sets.precast.WS` block (falls back to the first WS result). */
  primaryWs?: string | null;
  /** Header comment inserted at the top of the file (omit to leave the file header alone). */
  banner?: string[];
  /** Overwrite slot lines that the template already filled in (default true). */
  overwrite?: boolean;
};

const SLOT_ALIASES: Record<string, Slot> = {
  main: 'main', sub: 'sub', range: 'range', ranged: 'range', ammo: 'ammo', head: 'head', neck: 'neck', body: 'body', hands: 'hands',
  back: 'back', waist: 'waist', legs: 'legs', feet: 'feet',
  ear1: 'left_ear', ear2: 'right_ear', left_ear: 'left_ear', right_ear: 'right_ear', lear: 'left_ear', rear: 'right_ear',
  ring1: 'left_ring', ring2: 'right_ring', left_ring: 'left_ring', right_ring: 'right_ring', lring: 'left_ring', rring: 'right_ring',
};

const DEFAULT_KEY: Record<Slot, string> = {
  main: 'main', sub: 'sub', range: 'range', ammo: 'ammo', head: 'head', body: 'body', hands: 'hands', legs: 'legs', feet: 'feet',
  neck: 'neck', waist: 'waist', left_ear: 'ear1', right_ear: 'ear2', left_ring: 'ring1', right_ring: 'ring2', back: 'back',
};
const MOTE_KEY: Record<Slot, string> = { ...DEFAULT_KEY, left_ear: 'left_ear', right_ear: 'right_ear', left_ring: 'left_ring', right_ring: 'right_ring' };

const HEADER_RE = /^(\s*)(sets(?:\.[A-Za-z_]\w*|\[[^\]]*\])+)\s*=\s*(set_combine\s*\(\s*[^,]+,\s*)?\{\s*(?:--.*)?$/;
/** `sets.precast.WS['Camlann's Torment']` is invalid Lua (unescaped apostrophe); rewrite such keys with double quotes. */
const BAD_QUOTE_RE = /\['([^\]]*'[^\]]*)'\]/g;
function fixHeaderQuotes(line: string): string {
  return line.replace(BAD_QUOTE_RE, (_m, inner: string) => `["${inner.replace(/"/g, '\\"')}"]`);
}
const SLOT_LINE_RE = /^(\s*)(--\s*)?([A-Za-z_]+\d?)\s*=\s*(.*?)\s*$/;

function stripComment(line: string): string {
  // remove a trailing `-- comment` (ignoring `--` that appears inside a string)
  let inStr: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === inStr) inStr = null;
    } else if (c === '"' || c === "'") inStr = c;
    else if (c === '-' && line[i + 1] === '-') return line.slice(0, i);
  }
  return line;
}

function braceDelta(line: string): number {
  const code = stripComment(line);
  let d = 0;
  let inStr: string | null = null;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === inStr) inStr = null;
    } else if (c === '"' || c === "'") inStr = c;
    else if (c === '{') d++;
    else if (c === '}') d--;
  }
  return d;
}

/** Locate every `sets.X = {` / `sets.X = set_combine(sets.Y, {` block in the template. */
export function parseTemplateBlocks(text: string): TemplateBlock[] {
  const lines = (text ?? '').split(/\r?\n/);
  const blocks: TemplateBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = HEADER_RE.exec(lines[i] ?? '');
    if (!m) continue;
    let depth = 1;
    let end = -1;
    let indent: string | null = null;
    for (let j = i + 1; j < lines.length; j++) {
      depth += braceDelta(lines[j] ?? '');
      if (indent == null) {
        const sm = SLOT_LINE_RE.exec(lines[j] ?? '');
        if (sm && SLOT_ALIASES[sm[3].toLowerCase()]) indent = sm[1];
      }
      if (depth <= 0) { end = j; break; }
    }
    if (end < 0) continue;
    blocks.push({ path: m[2], start: i, end, indent: indent ?? `${m[1]}    ` });
    i = end;
  }
  return blocks;
}

/** Split `sets.precast.WS['Tachi: Fudo'].Acc` into lower-cased segments: ['precast','ws','tachi: fudo','acc']. */
export function pathSegments(path: string): string[] {
  const segs: string[] = [];
  const re = /\.([A-Za-z_]\w*)|\[\s*(?:'(.*?)'|"(.*?)")\s*\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) != null) segs.push((m[1] ?? m[2] ?? m[3] ?? '').toLowerCase());
  return segs;
}

const DT_TOKENS = new Set(['dt', 'pdt', 'mdt', 'hybrid', 'def', 'defense', 'tank', 'turtle', 'dtacc', 'accdt']);
const ACC_TOKENS = new Set(['acc', 'accuracy', 'highacc', 'acc2', 'fullacc', 'midacc', 'lowacc']);
const IDLE_TOKENS = new Set(['idle', 'kiting', 'resting', 'defense', 'town', 'weak', 'field']);
const HEAL_TOKENS = new Set(['cure', 'curaga', 'cureself', 'cures', 'curesolace', 'curaga', 'healing magic', 'healingmagic', 'cureweather', 'cureclaudo']);
const NUKE_TOKENS = new Set(['elemental magic', 'nuke', 'nuking', 'mb', 'magicburst', 'burst', 'elementalmagic', 'ninjutsu', 'elementalninjutsu', 'dark magic', 'blue magic']);
const FC_MIDCAST_TOKENS = new Set(['fastrecast', 'fc', 'utsusemi', 'spellinterrupt']);

/** Decide which optimizer result a set path should be filled from; null = leave the block alone. */
export function classifySetPath(path: string): SetTarget | null {
  const segs = pathSegments(path);
  if (!segs.length) return null;
  const [root, ...rest] = segs;
  const has = (set: Set<string>) => rest.some((s) => set.has(s));
  const extra = (known: Set<string>[]) => rest.filter((s) => !known.some((k) => k.has(s)));
  const modeNote = (ex: string[]) => (ex.length ? `mode "${ex.join('.')}" is not modeled; filled from the base set` : undefined);

  if (root === 'engaged' || root === 'melee' || root === 'tp') {
    if (rest.includes('th') || rest.includes('treasurehunter')) return { kind: 'th' };
    if (has(DT_TOKENS)) return { kind: 'hybrid', acc: has(ACC_TOKENS), note: modeNote(extra([DT_TOKENS, ACC_TOKENS, new Set(['stp', 'normal'])])) };
    return { kind: 'tp', acc: has(ACC_TOKENS), note: modeNote(extra([ACC_TOKENS, new Set(['stp', 'normal', 'crit', 'da'])])) };
  }
  if (root === 'idle' || root === 'kiting' || root === 'defense' || root === 'resting') {
    return { kind: 'idle', note: modeNote(extra([DT_TOKENS, IDLE_TOKENS, new Set(['regen', 'refresh', 'normal', 'pdt', 'mdt'])])) };
  }
  if (root === 'treasurehunter' || root === 'th') return { kind: 'th' };
  if (root === 'precast') {
    const sub = rest[0] ?? '';
    if (sub === 'fc' || sub === 'fastcast') return { kind: 'fastcast' };
    if (sub === 'ws' || sub === 'weaponskill') {
      const name = rest[1] && !ACC_TOKENS.has(rest[1]) && !DT_TOKENS.has(rest[1]) ? rest[1] : null;
      const tail = rest.slice(name ? 2 : 1);
      const acc = tail.some((s) => ACC_TOKENS.has(s));
      const ex = tail.filter((s) => !ACC_TOKENS.has(s));
      return { kind: 'ws', wsName: name, acc, note: modeNote(ex) };
    }
    return null; // job abilities, items, etc.
  }
  if (root === 'midcast') {
    if (has(FC_MIDCAST_TOKENS)) return { kind: 'fastcast', note: 'recast/interruption set filled from the Fast Cast result' };
    if (has(HEAL_TOKENS) || rest.some((s) => s.startsWith('cure') || s.startsWith('curaga'))) return { kind: 'healing' };
    if (has(NUKE_TOKENS)) return { kind: 'magic', note: modeNote(extra([NUKE_TOKENS, new Set(['resistant', 'futae', 'normal', 'seidr', 'burst'])])) };
    return null;
  }
  if (root === 'buff' || root === 'weapons' || root === 'gear') return null;
  return null;
}

function wsKey(name: string): string | null {
  const lower = name.toLowerCase();
  const hit = Object.keys(WS_BY_NAME).find((k) => k.toLowerCase() === lower);
  return hit ?? null;
}

function findResult(results: OptimizedSet[], baseKey: string, tier: BuffTier): OptimizedSet | null {
  return results.find((r) => r?.key === `${baseKey}:${tier}`) ?? results.find((r) => (r?.key ?? '').startsWith(`${baseKey}:`)) ?? null;
}

function resolveTarget(
  target: SetTarget,
  results: OptimizedSet[],
  opts: FillOptions,
): { set: OptimizedSet; source: string; note?: string } | { error: string; missingWs?: string } {
  const tier = opts.tier ?? 'high';
  const pool = target.acc && opts.accResults?.length ? opts.accResults : results;
  const accNote = target.acc ? (opts.accResults?.length ? 'accuracy variant (optimized against a harder target)' : 'no accuracy pass available; filled from the normal set') : undefined;
  const note = [target.note, accNote].filter(Boolean).join('; ') || undefined;
  if (target.kind === 'ws') {
    let key: string | null = null;
    if (target.wsName) {
      key = wsKey(target.wsName);
      if (!key) return { error: `weapon skill "${target.wsName}" is not in the optimizer's weapon skill table` };
      if (!findResult(pool, `ws:${key}`, tier)) return { error: `"${key}" was not optimized — add it to your weapon skill list and run the optimizer again`, missingWs: key };
    } else {
      const preferred = opts.primaryWs && findResult(pool, `ws:${opts.primaryWs}`, tier) ? opts.primaryWs : null;
      const first = pool.find((r) => (r?.key ?? '').startsWith('ws:') && (r.key ?? '').endsWith(`:${tier}`)) ?? pool.find((r) => (r?.key ?? '').startsWith('ws:'));
      key = preferred ?? first?.context?.wsName ?? null;
      if (!key) return { error: 'no weapon skill results available' };
    }
    const set = findResult(pool, `ws:${key}`, tier);
    if (!set) return { error: `no result for ${key}` };
    return { set, source: `${set.label} (${set.tier})`, note };
  }
  const set = findResult(pool, target.kind, tier);
  if (!set) return { error: `no ${target.kind} result — run the optimizer first` };
  return { set, source: `${set.label} (${set.tier})`, note };
}

function detectKeyStyle(lines: string[], blocks: TemplateBlock[]): Record<Slot, string> {
  for (const b of blocks) {
    for (let i = b.start + 1; i < b.end; i++) {
      const m = SLOT_LINE_RE.exec(lines[i] ?? '');
      if (!m) continue;
      const k = m[3].toLowerCase();
      if (k === 'left_ear' || k === 'left_ring') return MOTE_KEY;
      if (k === 'ear1' || k === 'ring1') return DEFAULT_KEY;
    }
  }
  return DEFAULT_KEY;
}

/** Rewrite the slot lines of one block with `gear`; returns the new body lines and how many slots were written. */
function fillBlockLines(body: string[], indent: string, gear: GearSet, db: GearDB, keyStyle: Record<Slot, string>, overwrite: boolean): { lines: string[]; slots: number } {
  const remaining = new Set<Slot>(SLOTS.filter((s) => gear?.[s] != null && !!db?.[String(gear[s])]));
  const out: string[] = [];
  let slots = 0;
  let lastSlotIdx = -1;
  for (const line of body) {
    const m = SLOT_LINE_RE.exec(line);
    const slot = m ? SLOT_ALIASES[m[3].toLowerCase()] : undefined;
    if (!m || !slot) { out.push(line); continue; }
    const commented = !!m[2];
    const id = gear?.[slot];
    const item = id != null ? db?.[String(id)] : undefined;
    if (item && remaining.has(slot) && (commented || overwrite)) {
      out.push(`${m[1]}${m[3]}=${luaItemValue(item, db)},`);
      remaining.delete(slot);
      slots++;
    } else if (item && remaining.has(slot)) {
      remaining.delete(slot); // template pre-filled this slot and overwrite is off
      out.push(line);
    } else if (!commented && overwrite) {
      out.push(`${m[1]}--${m[3]}="",`); // optimizer left this slot empty: comment the old value out
    } else {
      out.push(line);
    }
    lastSlotIdx = out.length - 1;
  }
  // slots the optimizer filled but the template had no line for
  const extras: string[] = [];
  for (const slot of SLOTS) {
    if (!remaining.has(slot)) continue;
    const item = db[String(gear[slot])];
    extras.push(`${indent}${keyStyle[slot]}=${luaItemValue(item, db)},`);
    slots++;
  }
  if (extras.length) out.splice(lastSlotIdx + 1, 0, ...extras);
  return { lines: out, slots };
}

export function fillTemplate(text: string, results: OptimizedSet[], db: GearDB, opts: FillOptions = {}): FillReport {
  const lines = (text ?? '').split(/\r?\n/);
  const blocks = parseTemplateBlocks(text);
  const keyStyle = detectKeyStyle(lines, blocks);
  const overwrite = opts.overwrite ?? true;
  const filled: FillEntry[] = [];
  const skipped: SkipEntry[] = [];
  const out: string[] = [];
  let cursor = 0;
  for (const b of blocks) {
    out.push(...lines.slice(cursor, b.start));
    out.push(fixHeaderQuotes(lines[b.start] ?? ''));
    const body = lines.slice(b.start + 1, b.end);
    const target = classifySetPath(b.path);
    if (!target) {
      skipped.push({ path: b.path, reason: 'job-specific set the optimizer does not model (left exactly as in the template)' });
      out.push(...body);
    } else {
      const res = resolveTarget(target, results ?? [], opts);
      if ('error' in res) {
        skipped.push({ path: b.path, reason: res.error, missingWs: res.missingWs });
        out.push(...body);
      } else {
        const r = fillBlockLines(body, b.indent, res.set.gear ?? {}, db, keyStyle, overwrite);
        out.push(...r.lines);
        filled.push({ path: b.path, source: res.source, slots: r.slots, note: res.note });
      }
    }
    out.push(lines[b.end] ?? '');
    cursor = b.end + 1;
  }
  out.push(...lines.slice(cursor));
  let result = out.join('\n');
  if (opts.banner?.length) {
    const banner = opts.banner.map((l) => `-- ${l}`).join('\n');
    result = `${banner}\n${result}`;
  }
  return { text: result, filled, skipped, blocks: blocks.length };
}

/** Job abbreviation from a template's file name or contents (`WAR_Template.lua`, `-- Job: WAR`, `sets.precast.JA['Berserk']`). */
export function guessTemplateJob(fileName: string, text: string, jobs: string[]): string | null {
  const upper = (fileName ?? '').toUpperCase();
  for (const j of jobs) if (new RegExp(`(^|[^A-Z])${j}([^A-Z]|$)`).test(upper)) return j;
  const m = /--\s*(?:job|main job)\s*:\s*([A-Za-z]{3})/i.exec(text ?? '');
  if (m && jobs.includes(m[1].toUpperCase())) return m[1].toUpperCase();
  return null;
}
