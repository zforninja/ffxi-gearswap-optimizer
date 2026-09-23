import type { GearItem } from './types';
import augmentPathTable from './augment-paths.json';

/**
 * Max-rank path augments for items whose extdata only exposes `Path: X` / `Rank: N` (Unity NPC +1 pieces, Dynamis-D
 * JSE necks and weapons). Built by data_pipeline/build_augment_paths.py from BG-Wiki; keyed by base item id.
 */
type PathEntry = { name: string; maxRank: number; paths: Record<string, string[]> };
const PATH_TABLE = augmentPathTable as Record<string, PathEntry>;

export function pathAugmentsFor(baseId: number): PathEntry | undefined {
  return PATH_TABLE[String(baseId)];
}

/** Virtual item ids for augmented copies start here (real FFXI item ids are < 65536). */
export const AUGMENT_ID_BASE = 1_000_000;

type Rule = { re: RegExp; keys: string[]; mult?: number };

// Keys are matched against a normalised augment string: lower-case, quotes/periods/spaces removed.
// e.g. '"Dbl.Atk."+3' -> 'dblatk+3', 'Weapon skill damage +5%' -> 'weaponskilldamage+5%'
const RULES: Rule[] = [
  { re: /^str$/, keys: ['STR'] },
  { re: /^dex$/, keys: ['DEX'] },
  { re: /^vit$/, keys: ['VIT'] },
  { re: /^agi$/, keys: ['AGI'] },
  { re: /^int$/, keys: ['INT'] },
  { re: /^mnd$/, keys: ['MND'] },
  { re: /^chr$/, keys: ['CHR'] },
  { re: /^hp$/, keys: ['HP'] },
  { re: /^mp$/, keys: ['MP'] },
  { re: /^def$/, keys: ['DEF'] },
  { re: /^(accuracy|acc)$/, keys: ['ACC', 'RACC'] },
  { re: /^(allattr|allbasestats|allstats)$/, keys: ['STR', 'DEX', 'VIT', 'AGI', 'INT', 'MND', 'CHR'] },
  { re: /^(attack|atk)$/, keys: ['ATT'] },
  { re: /^(rngacc|rangedaccuracy|racc)$/, keys: ['RACC'] },
  { re: /^(rngatk|rangedattack|ratk)$/, keys: ['RATT'] },
  { re: /^(magacc|magicaccuracy|macc)$/, keys: ['MACC'] },
  { re: /^(magatkbns|magicatkbns|magicattackbonus|mab)$/, keys: ['MATT'] },
  { re: /^(magicdamage|magdmg|magicdmg)$/, keys: ['magicDamage'] },
  { re: /^(magevasion|magicevasion|meva)$/, keys: ['MEVA'] },
  { re: /^(magdefbns|magdefbonus|magicdefbns|magicdefbonus|magicdefensebonus|mdb)$/, keys: ['MDEF'] },
  { re: /^(evasion|eva)$/, keys: ['EVA'] },
  { re: /^storetp$/, keys: ['storetp'] },
  { re: /^(dblatk|doubleattack)$/, keys: ['doubleAttack'] },
  { re: /^(tripleatk|tripatk|tripleattack)$/, keys: ['tripleAttack'] },
  { re: /^(quadatk|quadrupleattack|quadattack)$/, keys: ['quadAttack'] },
  { re: /^(crithitrate|criticalhitrate|critrate)$/, keys: ['crithitrate'] },
  { re: /^(crithitdamage|critdmg|criticalhitdamage|critdamage)$/, keys: ['critDmgIncrease'] },
  { re: /^(weaponskilldamage|wsdmg|wsdamage)$/, keys: ['allWsdmgFirstHit'] },
  { re: /^(weaponskillacc|weaponskillaccuracy|wsacc)$/, keys: ['wsacc'] },
  { re: /^tpbonus$/, keys: ['tpBonus'] },
  { re: /^fastcast$/, keys: ['fastcast'] },
  { re: /^haste$/, keys: ['hasteGear'], mult: 100 },
  { re: /^(damagetaken|dmgtaken|dt)$/, keys: ['dmg'], mult: 100 },
  { re: /^(physdmgtaken|physicaldamagetaken|pdt)$/, keys: ['dmgphys'], mult: 100 },
  { re: /^(magicdmgtaken|magdmgtaken|magicdamagetaken|mdt)$/, keys: ['dmgmagic'], mult: 100 },
  { re: /^dualwield$/, keys: ['dualWield'] },
  { re: /^treasurehunter$/, keys: ['treasureHunter'] },
  { re: /^curepotency$/, keys: ['curePotency'] },
  { re: /^refresh$/, keys: ['refresh'] },
  { re: /^regen$/, keys: ['regen'] },
  { re: /^enmity$/, keys: ['enmity'] },
  { re: /^subtleblow$/, keys: ['subtleBlow'] },
  { re: /^conservemp$/, keys: ['conserveMp'] },
  { re: /^(magicburstdmg|magicburstdamage|mbdmg)$/, keys: ['magicBurstBonusCapped'] },
  { re: /^(skillchainbonus|skillchaindmg|skillchaindamage)$/, keys: ['skillchaindmg'] },
  { re: /^(physicaldamagelimit|physdmglimit|pdl)$/, keys: ['pdl'] },
  { re: /^(magicburstacc|magicburstaccuracy)$/, keys: ['magicBurstAcc'] },
  { re: /^(kickattacks|kickattack)$/, keys: ['kickAttackRate'] },
  { re: /^daken$/, keys: ['daken'] },
  { re: /^zanshin$/, keys: ['zanshin'] },
  { re: /^(spellinterruptionrate|spellinterruptionratedown|sird)$/, keys: ['spellinterrupt'] },
  { re: /^shieldblockrate$/, keys: ['shieldblockrate'] },
  { re: /^shieldskill$/, keys: ['shield'] },
  { re: /^parryingskill$/, keys: ['parry'] },
  { re: /^(magicburstbonus)$/, keys: ['magicBurstBonusCapped'] },
  { re: /^(enhamagskill|enhancingmagicskill)$/, keys: ['enhance'] },
  { re: /^(enfbmagskill|enfeeblingmagicskill)$/, keys: ['enfeeble'] },
  { re: /^(healingmagicskill|healmagskill)$/, keys: ['healing'] },
  { re: /^(elemmagicskill|elementalmagicskill)$/, keys: ['elem'] },
  { re: /^darkmagicskill$/, keys: ['dark'] },
  { re: /^divinemagicskill$/, keys: ['divine'] },
  // Aligned with the equivalent keys enrich_gear_database.py derives from base-item description text, so an
  // augment and a printed stat line for the same bonus merge into one number instead of the augment being dropped.
  { re: /^movementspeed$/, keys: ['moveSpeedGearBonus'] },
  { re: /^snapshot$/, keys: ['snapshot'] },
  { re: /^potencyofcureeffectreceived$/, keys: ['curePotencyRcvd'] },
];

function normalise(s: string): string {
  return (s ?? '').toLowerCase().replace(/["'.\s]/g, '');
}

/** Parse a single augment string (Windower extdata format) into DB stat deltas. Unknown augments return {}. */
export function parseAugment(aug: string): Record<string, number> {
  const raw = (aug ?? '').trim();
  if (!raw) return {};
  // Some augments pack several stats into one string, e.g. 'Accuracy+20 Attack+20': split after each value.
  const parts = raw.split(/(?<=\d%?)\s+(?=\S)/);
  if (parts.length > 1) {
    const out: Record<string, number> = {};
    for (const p of parts) {
      for (const [k, v] of Object.entries(parseAugment(p))) out[k] = (out[k] ?? 0) + v;
    }
    return out;
  }
  // Compound stat names from path tables: 'Accuracy & Magic Accuracy +45', 'STR/DEX +10', 'DEX & MND +12',
  // 'Accuracy, Ranged Accuracy, & Magic Accuracy +15': every listed stat receives the value.
  // Pet-only lines carry nothing the player-side model uses.
  if (/^(pet|avatar|wyvern|automaton|luopan)\s*:/i.test(raw)) return {};
  const cm = raw.match(/^(.+?)\s*([+-]\d+%?)$/);
  if (cm && /[&/,]/.test(cm[1] ?? '')) {
    const names = (cm[1] ?? '').split(/\s*(?:&|\/|,|,\s*&)\s*/).map((x) => x.trim()).filter(Boolean);
    if (names.length > 1) {
      const out: Record<string, number> = {};
      for (const nm of names) {
        // max, not sum: 'Accuracy' already implies RACC, so 'Accuracy, Ranged Accuracy, & Magic Accuracy' must not double it
        for (const [k, v] of Object.entries(parseAugment(`${nm}${cm[2]}`))) out[k] = Math.abs(v) > Math.abs(out[k] ?? 0) ? v : (out[k] ?? v);
      }
      return out;
    }
  }
  const n = normalise(raw);
  // Weapon augments ("DMG:+15", "Delay:-8") change the weapon itself; buildAugmentedItem applies them to weapon.damage / delay.
  const wm = n.match(/^(dmg|delay):([+-]?\d+)$/);
  if (wm) return { [wm[1] === 'dmg' ? 'weaponDmg' : 'weaponDelay']: Number(wm[2]) };
  if (n.startsWith('path:') || n.startsWith('rank:') || n.startsWith('pet:') || n.startsWith('none')) return {};
  // <name><sign><number>[%]
  const m = n.match(/^([a-z]+?)([+-])(\d+)%?$/);
  if (!m) return {};
  const name = m[1] ?? '';
  const sign = m[2] === '-' ? -1 : 1;
  const value = Number(m[3] ?? 0) * sign;
  if (!Number.isFinite(value) || value === 0) return {};
  for (const rule of RULES) {
    if (rule.re.test(name)) {
      const out: Record<string, number> = {};
      for (const k of rule.keys) out[k] = value * (rule.mult ?? 1);
      return out;
    }
  }
  return {};
}

/** Scale a max-rank augment string to a lower rank: 'Accuracy+40' at rank 8/15 -> 'Accuracy+21'. */
function scaleAugment(aug: string, rank: number, maxRank: number): string {
  if (rank >= maxRank) return aug;
  const f = Math.max(0, rank) / Math.max(1, maxRank);
  return aug.replace(/([+-])(\d+)(%?)/g, (_m, sign: string, num: string, pct: string) => {
    const v = Math.round(Number(num) * f);
    return `${sign}${v}${pct}`;
  });
}

/**
 * Turn `Path: X` / `Rank: N` markers into the concrete augment lines the game applies, using the BG-Wiki path table.
 * Items with a single known path (Unity +1 pieces, JSE necks) resolve regardless of the letter extdata reports.
 */
export function resolvePathAugments(baseId: number, augs: string[]): { resolved: string[]; path?: string; rank?: number } {
  let path: string | undefined;
  let rank: number | undefined;
  for (const a of augs ?? []) {
    const n = normalise(a);
    const pm = n.match(/^path:([a-d])$/);
    if (pm) path = (pm[1] ?? '').toUpperCase();
    const rm = n.match(/^rank:(\d+)$/);
    if (rm) rank = Number(rm[1]);
  }
  if (path === undefined && rank === undefined) return { resolved: [] };
  const entry = pathAugmentsFor(baseId);
  if (!entry) return { resolved: [], path, rank };
  const letters = Object.keys(entry.paths);
  const chosen = path && entry.paths[path] ? entry.paths[path] : letters.length === 1 ? entry.paths[letters[0] ?? ''] : undefined;
  if (!chosen) return { resolved: [], path, rank };
  const r = rank ?? entry.maxRank;
  return { resolved: chosen.map((a: string) => scaleAugment(a, r, entry.maxRank)), path, rank: r };
}

/**
 * Parse a list of augment strings; returns merged deltas and the augments that could not be understood.
 * When `baseId` is given, `Path:`/`Rank:` markers are expanded through the path table; `pathRank` then only lists
 * markers that could NOT be resolved (so the UI can warn about under-valued pieces).
 */
export function parseAugments(
  augs: string[],
  baseId?: number,
): { stats: Record<string, number>; unknown: string[]; pathRank: string[]; resolved: string[] } {
  const stats: Record<string, number> = {};
  const unknown: string[] = [];
  const pathRank: string[] = [];
  const { resolved } = baseId !== undefined ? resolvePathAugments(baseId, augs ?? []) : { resolved: [] as string[] };
  for (const a of [...(augs ?? []), ...resolved]) {
    const d = parseAugment(a);
    const keys = Object.keys(d);
    if (keys.length === 0) {
      const n = normalise(a);
      if (n.startsWith('path:') || n.startsWith('rank:')) {
        if (resolved.length === 0) pathRank.push(a);
      } else if (a && !n.startsWith('none') && !/^(pet|avatar|wyvern|automaton|luopan):/.test(n)) unknown.push(a);
      continue;
    }
    for (const k of keys) stats[k] = (stats[k] ?? 0) + (d[k] ?? 0);
  }
  return { stats, unknown, pathRank, resolved };
}

/** Stable key for one specific augmented copy of an item. */
export function augmentKey(baseId: number, augments: string[]): string {
  return `${baseId}|${[...(augments ?? [])].map((a: string) => (a ?? '').trim()).filter(Boolean).sort().join('|')}`;
}

/** Deterministic virtual id derived from the augment key (>= AUGMENT_ID_BASE). */
export function augmentVirtualId(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return AUGMENT_ID_BASE + (h % 900_000_000);
}

export function isAugmentedId(id: number): boolean {
  return (id ?? 0) >= AUGMENT_ID_BASE;
}

/**
 * Build a virtual GearItem: the base item with augment stats merged in.
 * Anything that could not be turned into stats is recorded on the item (`unparsedAugments`, `pathRank`) instead of
 * silently counting as zero, so the UI can warn that this piece is under-valued.
 */
export function buildAugmentedItem(base: GearItem, augments: string[], id: number): GearItem {
  const clean = (augments ?? []).map((a: string) => (a ?? '').trim()).filter(Boolean);
  const { stats, unknown, pathRank, resolved } = parseAugments(clean, base.id);
  const { weaponDmg, weaponDelay, ...armorStats } = stats;
  const merged: Record<string, number> = { ...(base.stats ?? {}) };
  for (const [k, v] of Object.entries(armorStats)) merged[k] = (merged[k] ?? 0) + v;
  const pathTag = clean.filter((a: string) => /^(path|rank):/i.test(a)).map((a: string) => a.replace(/\s+/g, '')).join(' ');
  const shown = [...clean.filter((a: string) => !/^(path|rank):/i.test(a)), ...(resolved.length && pathTag ? [pathTag] : [])];
  const short = shown.slice(0, 2).join(', ');
  const weapon = base.weapon
    ? { ...base.weapon, damage: (base.weapon.damage ?? 0) + (weaponDmg ?? 0), delay: (base.weapon.delay ?? 0) + (weaponDelay ?? 0) }
    : base.weapon;
  return {
    ...base,
    id,
    baseId: base.id,
    augments: clean,
    unparsedAugments: unknown,
    pathRank,
    resolvedAugments: resolved.length ? resolved : undefined,
    weapon,
    displayName: `${base.displayName}${short ? ` [${short}${clean.length > 2 ? ', …' : ''}]` : ' [aug]'}`,
    stats: merged,
  };
}
