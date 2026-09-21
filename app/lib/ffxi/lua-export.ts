import { SLOTS, type GearDB, type GearSet, type OptimizedSet, type Slot } from './types';

const LUA_SLOT: Record<Slot, string> = {
  main: 'main', sub: 'sub', range: 'range', ammo: 'ammo', head: 'head', body: 'body', hands: 'hands', legs: 'legs', feet: 'feet',
  neck: 'neck', waist: 'waist', left_ear: 'left_ear', right_ear: 'right_ear', left_ring: 'left_ring', right_ring: 'right_ring', back: 'back',
};

function luaStr(s: string) {
  return `"${(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function gearSetToLua(set: GearSet, db: GearDB, indent = '    '): string {
  const lines: string[] = [];
  for (const slot of SLOTS) {
    const id = set?.[slot];
    if (id == null) continue;
    const item = db?.[String(id)];
    if (!item) continue;
    const augs = (item.augments ?? []).filter((a) => a && !/^(path|rank)\s*:/i.test(a));
    if (augs.length) {
      // GearSwap matches augmented items by base name + augments list
      const baseName = (item.baseId != null ? db?.[String(item.baseId)]?.displayName : undefined) ?? item.name ?? item.displayName ?? '';
      lines.push(`${indent}${LUA_SLOT[slot]}={ name=${luaStr(baseName)}, augments={${augs.map(luaStr).join(',')}} },`);
    } else {
      lines.push(`${indent}${LUA_SLOT[slot]}=${luaStr(item.displayName ?? item.name ?? '')},`);
    }
  }
  return `{\n${lines.join('\n')}\n${indent.slice(0, -4)}}`;
}

function setPath(s: OptimizedSet): string | null {
  const k = s?.context?.kind;
  switch (k) {
    case 'tp': return 'sets.engaged';
    case 'ws': return `sets.precast.WS[${luaStr(s.context.wsName ?? 'Unknown')}]`;
    case 'hybrid': return 'sets.engaged.Hybrid';
    case 'magic': return `sets.midcast['Elemental Magic']`;
    case 'healing': return 'sets.midcast.Cure';
    case 'idle': return 'sets.idle.DT';
    case 'fastcast': return 'sets.precast.FC';
    case 'th': return 'sets.TreasureHunter';
    default: return null;
  }
}

export function buildLuaExport(sets: OptimizedSet[], db: GearDB, meta: { mainJob: string; subJob: string; character?: string; targetName?: string }): string {
  const out: string[] = [];
  out.push(`-- Vana'diel Gear Optimizer export`);
  out.push(`-- Job: ${meta?.mainJob ?? '???'}/${meta?.subJob ?? '???'}${meta?.character ? `  Character: ${meta.character}` : ''}`);
  if (meta?.targetName) out.push(`-- Optimized against: ${meta.targetName}`);
  out.push(`-- Sets ending in .LowBuff assume only personal buffs (food/JA/self haste).`);
  out.push(`-- Sets ending in .HighBuff assume the full party buff configuration.`);
  out.push(`-- Paste into your GearSwap init_gear_sets() or include this file.`);
  out.push('');
  out.push(`sets.precast = sets.precast or {}`);
  out.push(`sets.precast.WS = sets.precast.WS or {}`);
  out.push(`sets.midcast = sets.midcast or {}`);
  out.push(`sets.idle = sets.idle or {}`);
  out.push(`sets.engaged = sets.engaged or {}`);
  out.push('');

  // group by path; emit High as the default table, then Low/High sub-tables
  const byPath = new Map<string, { label: string; low?: OptimizedSet; high?: OptimizedSet }>();
  for (const s of sets ?? []) {
    const path = setPath(s);
    if (!path) continue;
    const entry = byPath.get(path) ?? { label: s.label };
    if (s.tier === 'high') entry.high = s; else entry.low = s;
    byPath.set(path, entry);
  }
  for (const [path, entry] of byPath) {
    const base = entry.high ?? entry.low;
    if (!base) continue;
    out.push(`-- ${entry.label} (default = ${entry.high ? 'High' : 'Low'} buff)`);
    out.push(`${path} = ${gearSetToLua(base.gear, db)}`);
    if (entry.low) out.push(`${path}.LowBuff = ${gearSetToLua(entry.low.gear, db)}`);
    if (entry.high) out.push(`${path}.HighBuff = ${gearSetToLua(entry.high.gear, db)}`);
    out.push('');
  }
  return out.join('\n');
}

export function downloadText(filename: string, text: string) {
  try {
    const blob = new Blob([text ?? ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? 'export.lua';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.error('download failed', e);
  }
}
