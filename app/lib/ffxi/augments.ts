import type { GearItem } from './types';

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
  { re: /^(attack|atk)$/, keys: ['ATT'] },
  { re: /^(rngacc|rangedaccuracy|racc)$/, keys: ['RACC'] },
  { re: /^(rngatk|rangedattack|ratk)$/, keys: ['RATT'] },
  { re: /^(magacc|magicaccuracy|macc)$/, keys: ['MACC'] },
  { re: /^(magatkbns|magicatkbns|magicattackbonus|mab)$/, keys: ['MATT'] },
  { re: /^(magicdamage|magdmg|magicdmg)$/, keys: ['magicDamage'] },
  { re: /^(magevasion|magicevasion|meva)$/, keys: ['MEVA'] },
  { re: /^(magdefbns|magicdefbns|magicdefensebonus|mdb)$/, keys: ['MDEF'] },
  { re: /^(evasion|eva)$/, keys: ['EVA'] },
  { re: /^storetp$/, keys: ['storetp'] },
  { re: /^(dblatk|doubleattack)$/, keys: ['doubleAttack'] },
  { re: /^(tripleatk|tripleattack)$/, keys: ['tripleAttack'] },
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
  { re: /^(enhamagskill|enhancingmagicskill)$/, keys: ['enhance'] },
  { re: /^(enfbmagskill|enfeeblingmagicskill)$/, keys: ['enfeeble'] },
  { re: /^(healingmagicskill|healmagskill)$/, keys: ['healing'] },
  { re: /^(elemmagicskill|elementalmagicskill)$/, keys: ['elem'] },
  { re: /^darkmagicskill$/, keys: ['dark'] },
  { re: /^divinemagicskill$/, keys: ['divine'] },
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
  const n = normalise(raw);
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

/** Parse a list of augment strings; returns merged deltas and the augments that could not be understood. */
export function parseAugments(augs: string[]): { stats: Record<string, number>; unknown: string[] } {
  const stats: Record<string, number> = {};
  const unknown: string[] = [];
  for (const a of augs ?? []) {
    const d = parseAugment(a);
    const keys = Object.keys(d);
    if (keys.length === 0) {
      const n = normalise(a);
      if (a && !n.startsWith('path:') && !n.startsWith('rank:') && !n.startsWith('none')) unknown.push(a);
      continue;
    }
    for (const k of keys) stats[k] = (stats[k] ?? 0) + (d[k] ?? 0);
  }
  return { stats, unknown };
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

/** Build a virtual GearItem: the base item with augment stats merged in. */
export function buildAugmentedItem(base: GearItem, augments: string[], id: number): GearItem {
  const clean = (augments ?? []).map((a: string) => (a ?? '').trim()).filter(Boolean);
  const { stats } = parseAugments(clean);
  const merged: Record<string, number> = { ...(base.stats ?? {}) };
  for (const [k, v] of Object.entries(stats)) merged[k] = (merged[k] ?? 0) + v;
  const short = clean.filter((a: string) => !/^(path|rank):/i.test(a)).slice(0, 2).join(', ');
  return {
    ...base,
    id,
    baseId: base.id,
    augments: clean,
    displayName: `${base.displayName}${short ? ` [${short}${clean.length > 2 ? ', …' : ''}]` : ' [aug]'}`,
    stats: merged,
  };
}
