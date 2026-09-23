import type { GearDB, Inventory } from './types';
import { augmentKey, augmentVirtualId, buildAugmentedItem } from './augments';
import type { ParsedExport } from '@/components/optimizer/inventory-dialog';

/** One row of `invdump`'s CSV, after minimal parsing. */
type InvRow = {
  containerId: number;
  containerName: string;
  slot: number;
  itemId: number;
  itemName?: string;
  count: number;
  status: number;
  rank: string;
  augments: string; // ';'-joined, invdump escapes literal ';' as '\;'
  extdata: string;
  stale: boolean; // v1.4+ column: 1 when invdump detected all-zero extdata on an id>0 item
};

/** Split a CSV line on commas, respecting double-quoted fields (RFC4180-ish, matches invdump's escape_csv). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** invdump joins augment strings with ';' and escapes literal ';' inside a stat string as '\;'. */
function splitAugments(field: string): string[] {
  if (!field) return [];
  const parts = field.split(/(?<!\\);/).map((s) => s.replace(/\\;/g, ';').trim());
  return parts.filter(Boolean);
}

/**
 * Returns null when `text` doesn't look like an invdump CSV (so callers can fall back to the JSON GearExport
 * format), not when the CSV happens to be empty of usable rows.
 */
export function parseInvdumpCsv(text: string, db: GearDB): ParsedExport | null {
  const lines = (text ?? '').split(/\r?\n/).filter((l) => l.length > 0);
  if (!lines.length) return null;
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  if (!header.includes('item_id') || !header.includes('extdata')) return null; // not this format
  const col = (name: string) => header.indexOf(name);
  const iContainerId = col('container_id');
  const iContainerName = col('container_name');
  const iSlot = col('slot');
  const iItemId = col('item_id');
  const iItemName = col('item_name'); // -1 unless "full" mode
  const iCount = col('count');
  const iStatus = col('status');
  const iRank = col('rank');
  const iAugments = col('augments');
  const iExtdata = col('extdata');
  const iStale = col('stale'); // -1 on invdump < 1.4, which has no explicit flag

  const rows: InvRow[] = [];
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line);
    const itemId = Number(c[iItemId]);
    if (!Number.isFinite(itemId) || itemId <= 0) continue;
    const extdata = (c[iExtdata] ?? '').trim();
    const stale = iStale >= 0 ? c[iStale]?.trim() === '1' : extdata.length > 0 && /^0*$/.test(extdata);
    rows.push({
      containerId: Number(c[iContainerId] ?? 0) || 0,
      containerName: c[iContainerName] ?? '',
      slot: Number(c[iSlot] ?? 0) || 0,
      itemId,
      itemName: iItemName >= 0 ? c[iItemName] : undefined,
      count: Math.max(1, Number(c[iCount] ?? 1) || 1),
      status: Number(c[iStatus] ?? 0) || 0,
      rank: (c[iRank] ?? '').trim(),
      augments: c[iAugments] ?? '',
      extdata,
      stale,
    });
  }

  const inv: Inventory = {};
  const extraItems: GearDB = {};
  let unknown = 0;
  let augmented = 0;
  const unparsedAugments: string[] = [];
  let pathRankItems = 0;
  let pathResolvedItems = 0;
  const staleUnityItems: { id: number; name: string; container: string; slot: number }[] = [];

  for (const r of rows) {
    const base = db?.[String(r.itemId)];
    if (!base) { unknown++; continue; }

    // A stale row (invdump found all-zero extdata on this slot - see docs/STALE_EXTDATA_IMPORT.md) is not "no augments":
    // Windower never actually saw this item's data this session, so any Unity Ranking or random-augment bonus
    // it may genuinely carry would silently import as zero. Surface it instead of guessing.
    if (r.stale && base.unity) {
      staleUnityItems.push({ id: r.itemId, name: base.displayName, container: r.containerName, slot: r.slot });
    }

    const augStrings = splitAugments(r.augments);
    // invdump's `rank` column (from extdata.decode(item).rank) is the Path/Rank number for Nyame/Sakpata's/
    // Odyssey-style gear; fold it in as a synthetic "Rank: N" augment string so buildAugmentedItem records it
    // in `pathRank` exactly like a "Rank:" augment string parsed out of the augments list would.
    if (r.rank && !augStrings.some((a) => /^rank\s*:/i.test(a))) augStrings.push(`Rank: ${r.rank}`);

    if (augStrings.length === 0) {
      inv[r.itemId] = (inv[r.itemId] ?? 0) + r.count;
      continue;
    }
    const key = augmentKey(r.itemId, augStrings);
    let vid = augmentVirtualId(key);
    while (extraItems[String(vid)] && extraItems[String(vid)]!.baseId !== r.itemId) vid++;
    if (!extraItems[String(vid)]) {
      const built = buildAugmentedItem(base, augStrings, vid);
      extraItems[String(vid)] = built;
      augmented++;
      for (const u of built.unparsedAugments ?? []) if (!unparsedAugments.includes(u)) unparsedAugments.push(u);
      if ((built.pathRank ?? []).length) pathRankItems++;
      if ((built.resolvedAugments ?? []).length) pathResolvedItems++;
    }
    inv[vid] = (inv[vid] ?? 0) + r.count;
  }

  return {
    characterName: '', inventory: inv, raw: text, unknown, extraItems, augmented, unparsedAugments, pathRankItems, pathResolvedItems,
    staleUnityItems,
  } as ParsedExport;
}
