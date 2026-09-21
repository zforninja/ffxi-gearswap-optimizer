import type { Target } from './types';

export const JOBS = [
  'WAR', 'MNK', 'WHM', 'BLM', 'RDM', 'THF', 'PLD', 'DRK', 'BST', 'BRD', 'RNG',
  'SAM', 'NIN', 'DRG', 'SMN', 'BLU', 'COR', 'PUP', 'DNC', 'SCH', 'GEO', 'RUN',
] as const;
export type Job = (typeof JOBS)[number];

export const JOB_NAMES: Record<string, string> = {
  WAR: 'Warrior', MNK: 'Monk', WHM: 'White Mage', BLM: 'Black Mage', RDM: 'Red Mage', THF: 'Thief',
  PLD: 'Paladin', DRK: 'Dark Knight', BST: 'Beastmaster', BRD: 'Bard', RNG: 'Ranger', SAM: 'Samurai',
  NIN: 'Ninja', DRG: 'Dragoon', SMN: 'Summoner', BLU: 'Blue Mage', COR: 'Corsair', PUP: 'Puppetmaster',
  DNC: 'Dancer', SCH: 'Scholar', GEO: 'Geomancer', RUN: 'Rune Fencer',
};

/** Stat grades per job: [STR, DEX, VIT, AGI, INT, MND, CHR] */
const GRADES: Record<string, string> = {
  WAR: 'ACCDFEE', MNK: 'BCADGDE', WHM: 'EECDEAB', BLM: 'FDFCADE', RDM: 'DDEEBBD', THF: 'DADBDFE',
  PLD: 'BDAEFCC', DRK: 'ACCDCGF', BST: 'BCCDEEA', BRD: 'DDDDDCA', RNG: 'DDCADEE', SAM: 'BCCCEED',
  NIN: 'CBCADFD', DRG: 'BCBCEED', SMN: 'FEDDBBC', BLU: 'CCCDCCC', COR: 'DCDBCED', PUP: 'CBDCDED',
  DNC: 'CBDBEEC', SCH: 'EEDDBBD', GEO: 'EDDDABC', RUN: 'BCBCCDD',
};
const GRADE_MAIN: Record<string, number> = { A: 100, B: 94, C: 88, D: 82, E: 76, F: 70, G: 64 };
const GRADE_SUB: Record<string, number> = { A: 24, B: 22, C: 20, D: 18, E: 16, F: 14, G: 12 };
const STAT_ORDER = ['STR', 'DEX', 'VIT', 'AGI', 'INT', 'MND', 'CHR'];

export function jobBaseStats(main: string, sub: string): Record<string, number> {
  const out: Record<string, number> = { HP: 1250, MP: 350 };
  const mg = GRADES[main] ?? 'DDDDDDD';
  const sg = GRADES[sub] ?? 'DDDDDDD';
  STAT_ORDER.forEach((s, i) => {
    out[s] = (GRADE_MAIN[mg[i]] ?? 82) + (GRADE_SUB[sg[i]] ?? 18);
  });
  return out;
}

/** Innate job traits at level 99 (approximate, includes typical job points). Values in % / points. */
export type Traits = {
  doubleAttack: number; tripleAttack: number; storetp: number; dualWield: number; crithitrate: number;
  fastcast: number; martialArts: number; treasureHunter: number; MATT: number; attackBonus: number; subtleBlow: number;
};
const ZERO: Traits = { doubleAttack: 0, tripleAttack: 0, storetp: 0, dualWield: 0, crithitrate: 0, fastcast: 0, martialArts: 0, treasureHunter: 0, MATT: 0, attackBonus: 0, subtleBlow: 0 };
const MAIN_TRAITS: Record<string, Partial<Traits>> = {
  WAR: { doubleAttack: 15, attackBonus: 0 },
  MNK: { martialArts: 80, crithitrate: 0, subtleBlow: 20 },
  THF: { tripleAttack: 8, treasureHunter: 3, crithitrate: 5 },
  SAM: { storetp: 40 },
  NIN: { dualWield: 35, subtleBlow: 25 },
  DNC: { dualWield: 35 },
  DRK: { attackBonus: 45 },
  DRG: { attackBonus: 22 },
  RDM: { fastcast: 30, MATT: 20 },
  SCH: { fastcast: 15 },
  BLM: { MATT: 55 },
  GEO: { MATT: 40 },
  BLU: { doubleAttack: 5, dualWield: 15 },
  RUN: { tripleAttack: 5 },
  PUP: { martialArts: 60 },
  BST: { doubleAttack: 5 },
  COR: { tripleAttack: 5 },
  RNG: { tripleAttack: 0 },
  WHM: { fastcast: 0 },
};
const SUB_TRAITS: Record<string, Partial<Traits>> = {
  WAR: { doubleAttack: 10 },
  SAM: { storetp: 10 },
  NIN: { dualWield: 25 },
  DNC: { dualWield: 15 },
  THF: { treasureHunter: 1 },
  RDM: { fastcast: 15 },
  SCH: { fastcast: 10 },
  DRK: { attackBonus: 10 },
  DRG: { attackBonus: 10 },
};

export function jobTraits(main: string, sub: string): Traits {
  const t: Traits = { ...ZERO };
  const m = MAIN_TRAITS[main] ?? {};
  const s = SUB_TRAITS[sub] ?? {};
  (Object.keys(t) as (keyof Traits)[]).forEach((k) => {
    t[k] = (m[k] ?? 0) + (s[k] ?? 0);
  });
  return t;
}

export const TWO_HANDED_SKILLS = new Set(['Great Sword', 'Great Axe', 'Scythe', 'Polearm', 'Great Katana', 'Staff']);
export const RANGED_SKILLS = new Set(['Archery', 'Marksmanship', 'Throwing']);
export const MELEE_SKILLS = new Set(['Hand To Hand', 'Dagger', 'Sword', 'Great Sword', 'Axe', 'Great Axe', 'Scythe', 'Polearm', 'Katana', 'Great Katana', 'Club', 'Staff']);

/** fTP triples are [1000, 2000, 3000] TP. Values are community approximations. */
export type WeaponSkillDef = {
  name: string;
  skill: string;
  hits: number;
  mods: Record<string, number>; // stat -> fraction
  ftp: [number, number, number];
  ftpTransfers: boolean;
  crit?: [number, number, number];
  accBonus?: number;
  attMult?: number;
  ranged?: boolean;
};

export const WEAPONSKILLS: WeaponSkillDef[] = [
  // Sword
  { name: 'Savage Blade', skill: 'Sword', hits: 2, mods: { STR: 0.5, MND: 0.5 }, ftp: [4.0, 10.25, 13.75], ftpTransfers: false },
  { name: 'Chant du Cygne', skill: 'Sword', hits: 3, mods: { DEX: 0.8 }, ftp: [1.1, 1.1, 1.1], ftpTransfers: true, crit: [15, 20, 25] },
  { name: 'Requiescat', skill: 'Sword', hits: 5, mods: { MND: 0.73 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true, attMult: 0.85 },
  { name: 'Expiacion', skill: 'Sword', hits: 2, mods: { STR: 0.3, INT: 0.3 }, ftp: [3.75, 4.75, 6.0], ftpTransfers: false },
  { name: 'Knights of Round', skill: 'Sword', hits: 1, mods: { STR: 0.4, MND: 0.4 }, ftp: [2.5, 3.0, 3.5], ftpTransfers: false, accBonus: 50 },
  // Dagger
  { name: "Rudra's Storm", skill: 'Dagger', hits: 1, mods: { DEX: 0.8 }, ftp: [5.0, 10.19, 13.75], ftpTransfers: false },
  { name: 'Evisceration', skill: 'Dagger', hits: 5, mods: { DEX: 0.5 }, ftp: [1.25, 1.25, 1.25], ftpTransfers: true, crit: [10, 25, 50] },
  { name: 'Exenterator', skill: 'Dagger', hits: 4, mods: { AGI: 0.73 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true, accBonus: 50 },
  { name: 'Mandalic Stab', skill: 'Dagger', hits: 1, mods: { DEX: 0.6 }, ftp: [3.0, 3.5, 4.0], ftpTransfers: false },
  // Great Sword
  { name: 'Resolution', skill: 'Great Sword', hits: 5, mods: { STR: 0.73 }, ftp: [0.71875, 1.5, 2.25], ftpTransfers: true, attMult: 0.85 },
  { name: 'Torcleaver', skill: 'Great Sword', hits: 1, mods: { VIT: 0.8 }, ftp: [4.75, 7.5, 9.765625], ftpTransfers: false },
  { name: 'Dimidiation', skill: 'Great Sword', hits: 2, mods: { DEX: 0.8 }, ftp: [2.75, 4.25, 5.75], ftpTransfers: false, accBonus: 25 },
  { name: 'Scourge', skill: 'Great Sword', hits: 1, mods: { STR: 0.4, VIT: 0.4 }, ftp: [3.5, 4.5, 5.5], ftpTransfers: false },
  // Great Axe
  { name: 'Upheaval', skill: 'Great Axe', hits: 4, mods: { VIT: 0.73 }, ftp: [1.0, 3.5, 6.5], ftpTransfers: true },
  { name: "Ukko's Fury", skill: 'Great Axe', hits: 2, mods: { STR: 0.8 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true, crit: [20, 35, 65] },
  { name: 'Steel Cyclone', skill: 'Great Axe', hits: 1, mods: { STR: 0.3, VIT: 0.3 }, ftp: [2.5, 3.5, 4.5], ftpTransfers: false },
  { name: 'Fell Cleave', skill: 'Great Axe', hits: 1, mods: { STR: 0.6 }, ftp: [1.0, 1.5, 2.0], ftpTransfers: false, accBonus: 50 },
  // Axe
  { name: 'Ruinator', skill: 'Axe', hits: 4, mods: { STR: 0.6 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true, accBonus: 40 },
  { name: 'Decimation', skill: 'Axe', hits: 3, mods: { STR: 0.5 }, ftp: [1.75, 1.75, 1.75], ftpTransfers: true },
  { name: 'Mistral Axe', skill: 'Axe', hits: 1, mods: { STR: 0.5 }, ftp: [3.0, 4.0, 5.0], ftpTransfers: false },
  { name: 'Rampage', skill: 'Axe', hits: 5, mods: { STR: 0.5 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true, crit: [10, 25, 40] },
  // Scythe
  { name: 'Entropy', skill: 'Scythe', hits: 4, mods: { INT: 0.73 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true },
  { name: 'Cross Reaper', skill: 'Scythe', hits: 2, mods: { STR: 0.6 }, ftp: [2.25, 3.25, 4.25], ftpTransfers: false },
  { name: 'Insurgency', skill: 'Scythe', hits: 4, mods: { STR: 0.2, INT: 0.2 }, ftp: [1.5, 2.0, 2.5], ftpTransfers: false, accBonus: 25 },
  { name: 'Spiral Hell', skill: 'Scythe', hits: 1, mods: { STR: 0.3, INT: 0.3 }, ftp: [2.5, 3.5, 4.5], ftpTransfers: false },
  // Polearm
  { name: 'Stardiver', skill: 'Polearm', hits: 4, mods: { STR: 0.73 }, ftp: [0.75, 1.75, 2.75], ftpTransfers: true },
  { name: 'Impulse Drive', skill: 'Polearm', hits: 2, mods: { STR: 1.0 }, ftp: [1.0, 3.0, 5.5], ftpTransfers: false, crit: [0, 0, 0] },
  { name: "Camlann's Torment", skill: 'Polearm', hits: 2, mods: { STR: 0.6, VIT: 0.6 }, ftp: [2.75, 3.5, 4.25], ftpTransfers: false },
  { name: 'Drakesbane', skill: 'Polearm', hits: 4, mods: { STR: 0.5 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true, crit: [10, 25, 40] },
  // Katana
  { name: 'Blade: Shun', skill: 'Katana', hits: 5, mods: { DEX: 0.73 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true, attMult: 1.0 },
  { name: 'Blade: Ten', skill: 'Katana', hits: 1, mods: { STR: 0.3, DEX: 0.3 }, ftp: [4.5, 6.25, 8.0], ftpTransfers: false },
  { name: 'Blade: Hi', skill: 'Katana', hits: 1, mods: { AGI: 0.8 }, ftp: [5.0, 5.0, 5.0], ftpTransfers: false, crit: [15, 20, 25] },
  { name: 'Blade: Metsu', skill: 'Katana', hits: 1, mods: { DEX: 0.8 }, ftp: [3.5, 4.5, 5.5], ftpTransfers: false },
  // Great Katana
  { name: 'Tachi: Fudo', skill: 'Great Katana', hits: 1, mods: { STR: 0.8 }, ftp: [3.75, 5.75, 7.5], ftpTransfers: false },
  { name: 'Tachi: Shoha', skill: 'Great Katana', hits: 2, mods: { STR: 0.73 }, ftp: [1.375, 2.1875, 2.75], ftpTransfers: false },
  { name: 'Tachi: Kasha', skill: 'Great Katana', hits: 1, mods: { STR: 0.75 }, ftp: [1.5, 2.5, 3.5], ftpTransfers: false },
  { name: 'Tachi: Rana', skill: 'Great Katana', hits: 3, mods: { STR: 0.5 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true },
  // Hand-to-Hand
  { name: 'Victory Smite', skill: 'Hand To Hand', hits: 4, mods: { STR: 0.8 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true, crit: [15, 20, 25] },
  { name: 'Shijin Spiral', skill: 'Hand To Hand', hits: 5, mods: { DEX: 0.73 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true },
  { name: 'Asuran Fists', skill: 'Hand To Hand', hits: 8, mods: { STR: 0.15, VIT: 0.15 }, ftp: [1.0, 1.5, 2.0], ftpTransfers: false },
  { name: 'Howling Fist', skill: 'Hand To Hand', hits: 2, mods: { STR: 0.5, VIT: 0.2 }, ftp: [2.5, 3.5, 4.5], ftpTransfers: false },
  { name: 'Raging Fists', skill: 'Hand To Hand', hits: 5, mods: { STR: 0.3, DEX: 0.3 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true },
  // Club
  { name: 'Black Halo', skill: 'Club', hits: 2, mods: { STR: 0.3, MND: 0.7 }, ftp: [3.0, 7.25, 9.75], ftpTransfers: false },
  { name: 'Realmrazer', skill: 'Club', hits: 7, mods: { MND: 0.73 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true },
  { name: 'Judgment', skill: 'Club', hits: 1, mods: { STR: 0.5, MND: 0.3 }, ftp: [2.5, 4.0, 5.0], ftpTransfers: false },
  { name: 'Hexa Strike', skill: 'Club', hits: 6, mods: { STR: 0.2, MND: 0.2 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true, crit: [10, 15, 25] },
  // Staff
  { name: 'Shattersoul', skill: 'Staff', hits: 4, mods: { INT: 0.8 }, ftp: [1.0, 1.0, 1.0], ftpTransfers: true },
  { name: 'Retribution', skill: 'Staff', hits: 1, mods: { STR: 0.3, MND: 0.3 }, ftp: [3.0, 4.0, 5.0], ftpTransfers: false },
  // Ranged
  { name: 'Last Stand', skill: 'Marksmanship', hits: 2, mods: { AGI: 0.5, STR: 0.5 }, ftp: [2.0, 2.75, 3.5], ftpTransfers: false, ranged: true },
  { name: 'Detonator', skill: 'Marksmanship', hits: 1, mods: { AGI: 0.85 }, ftp: [2.75, 3.5, 4.25], ftpTransfers: false, ranged: true },
  { name: 'Jishnu\'s Radiance', skill: 'Archery', hits: 3, mods: { DEX: 0.8 }, ftp: [1.75, 1.75, 1.75], ftpTransfers: true, crit: [15, 25, 40], ranged: true },
  { name: 'Apex Arrow', skill: 'Archery', hits: 1, mods: { AGI: 0.85 }, ftp: [2.75, 3.5, 4.25], ftpTransfers: false, ranged: true },
];

export const WS_BY_NAME: Record<string, WeaponSkillDef> = Object.fromEntries(WEAPONSKILLS.map((w) => [w.name, w]));

/** Buff effect keys are aggregate keys (see math.ts). targetDefMult multiplies target DEF; targetEvaFlat adds to EVA. */
export type BuffCategory = 'BRD' | 'GEO' | 'COR' | 'Food' | 'Haste' | 'JA' | 'Debuff';
export type BuffDef = {
  id: string;
  name: string;
  category: BuffCategory;
  effects: Record<string, number>;
  description: string;
  /** "personal" buffs count towards the Low buff tier; party buffs only in High tier */
  personal?: boolean;
  exclusiveGroup?: string;
};

export const BUFFS: BuffDef[] = [
  // BRD (values approximate max-potency songs)
  { id: 'minuet5', name: 'Valor Minuet V', category: 'BRD', effects: { ATT: 124 }, description: 'Attack +124' },
  { id: 'minuet4', name: 'Valor Minuet IV', category: 'BRD', effects: { ATT: 112 }, description: 'Attack +112' },
  { id: 'madrigal', name: 'Blade Madrigal', category: 'BRD', effects: { ACC: 60 }, description: 'Accuracy +60' },
  { id: 'honor_march', name: 'Honor March', category: 'BRD', effects: { magicHaste: 16.6, ATT: 16, ACC: 8 }, description: 'Haste 16.6%, ATT/ACC bonus' },
  { id: 'victory_march', name: 'Victory March', category: 'BRD', effects: { magicHaste: 16.4 }, description: 'Haste 16.4%' },
  { id: 'prelude', name: 'Hunter\'s Prelude', category: 'BRD', effects: { RACC: 60 }, description: 'Ranged Accuracy +60' },
  { id: 'etude_str', name: 'Herculean Etude', category: 'BRD', effects: { STR: 25 }, description: 'STR +25' },
  { id: 'etude_int', name: 'Sage Etude', category: 'BRD', effects: { INT: 25 }, description: 'INT +25' },
  // GEO
  { id: 'geo_fury', name: 'Geo-Fury', category: 'GEO', effects: { attPct: 28 }, description: 'Attack +28%' },
  { id: 'geo_frailty', name: 'Geo-Frailty', category: 'GEO', effects: { targetDefMult: -0.24 }, description: 'Target Defense -24%' },
  { id: 'geo_torpor', name: 'Geo-Torpor', category: 'GEO', effects: { targetEvaFlat: -80 }, description: 'Target Evasion down' },
  { id: 'indi_haste', name: 'Indi-Haste', category: 'GEO', effects: { magicHaste: 29.9 }, description: 'Haste 29.9%' },
  { id: 'geo_precision', name: 'Geo-Precision', category: 'GEO', effects: { ACC: 60, RACC: 60 }, description: 'Accuracy +60' },
  { id: 'geo_malaise', name: 'Geo-Malaise', category: 'GEO', effects: { targetMdbFlat: -30 }, description: 'Target Magic Defense down' },
  { id: 'geo_acumen', name: 'Geo-Acumen', category: 'GEO', effects: { MATT: 40 }, description: 'Magic Attack +40' },
  { id: 'geo_focus', name: 'Geo-Focus', category: 'GEO', effects: { MACC: 60 }, description: 'Magic Accuracy +60' },
  { id: 'geo_languor', name: 'Geo-Languor', category: 'GEO', effects: { targetMevaFlat: -60 }, description: 'Target Magic Evasion down' },
  // COR
  { id: 'chaos', name: 'Chaos Roll', category: 'COR', effects: { attPct: 25 }, description: 'Attack +25% (good roll)' },
  { id: 'hunters', name: 'Hunter\'s Roll', category: 'COR', effects: { ACC: 40, RACC: 40 }, description: 'Accuracy +40' },
  { id: 'samurai', name: 'Samurai Roll', category: 'COR', effects: { storetp: 25 }, description: 'Store TP +25' },
  { id: 'fighters', name: 'Fighter\'s Roll', category: 'COR', effects: { doubleAttack: 10 }, description: 'Double Attack +10%' },
  { id: 'rogues', name: 'Rogue\'s Roll', category: 'COR', effects: { crithitrate: 10 }, description: 'Critical Hit Rate +10%' },
  { id: 'wizards', name: 'Wizard\'s Roll', category: 'COR', effects: { MATT: 30 }, description: 'Magic Attack +30' },
  { id: 'warlocks', name: 'Warlock\'s Roll', category: 'COR', effects: { MACC: 30 }, description: 'Magic Accuracy +30' },
  // Food (personal)
  { id: 'food_daifuku', name: 'Grape Daifuku', category: 'Food', effects: { ATT: 130, STR: 6, VIT: 6 }, description: 'Attack +130 (cap), STR/VIT +6', personal: true, exclusiveGroup: 'food' },
  { id: 'food_sushi', name: 'Sublime Sushi +1', category: 'Food', effects: { ACC: 113, STR: 7, DEX: 7, AGI: 7, VIT: 6, RACC: 113 }, description: 'Accuracy +113 (cap), stats +7', personal: true, exclusiveGroup: 'food' },
  { id: 'food_curry', name: 'Red Curry Bun', category: 'Food', effects: { ATT: 165, STR: 7, RATT: 165 }, description: 'Attack +165 (cap), STR +7', personal: true, exclusiveGroup: 'food' },
  { id: 'food_ramen', name: 'Miso Ramen +1', category: 'Food', effects: { ACC: 85, STR: 5, dmg: -500 }, description: 'Accuracy +85, DT -5%', personal: true, exclusiveGroup: 'food' },
  { id: 'food_stewpot', name: 'Marine Stewpot', category: 'Food', effects: { ACC: 70, HP: 150 }, description: 'Accuracy +70, HP +150', personal: true, exclusiveGroup: 'food' },
  { id: 'food_crepe', name: 'Pear Crepe', category: 'Food', effects: { INT: 5, MACC: 40, MATT: 15 }, description: 'Magic Accuracy +40, MAB +15', personal: true, exclusiveGroup: 'food' },
  // Haste spells (personal)
  { id: 'haste1', name: 'Haste', category: 'Haste', effects: { magicHaste: 15 }, description: 'Magic haste 15%', personal: true, exclusiveGroup: 'hastespell' },
  { id: 'haste2', name: 'Haste II', category: 'Haste', effects: { magicHaste: 30 }, description: 'Magic haste 30%', personal: true, exclusiveGroup: 'hastespell' },
  { id: 'flutter', name: 'Erratic Flutter', category: 'Haste', effects: { magicHaste: 30 }, description: 'Magic haste 30%', personal: true, exclusiveGroup: 'hastespell' },
  // Job abilities (personal)
  { id: 'hasso', name: 'Hasso', category: 'JA', effects: { jaHaste: 10, STR: 5, ACC: 10 }, description: 'JA haste 10%, ACC/STR (2H only)', personal: true },
  { id: 'haste_samba', name: 'Haste Samba', category: 'JA', effects: { jaHaste: 5.1 }, description: 'JA haste 5.1%', personal: true },
  { id: 'last_resort', name: 'Last Resort', category: 'JA', effects: { jaHaste: 25, attPct: 25 }, description: 'JA haste 25%, Attack +25%', personal: true },
  { id: 'berserk', name: 'Berserk', category: 'JA', effects: { attPct: 25 }, description: 'Attack +25%', personal: true },
  { id: 'aggressor', name: 'Aggressor', category: 'JA', effects: { ACC: 25 }, description: 'Accuracy +25', personal: true },
  { id: 'footwork', name: 'Impetus', category: 'JA', effects: { crithitrate: 10, ATT: 100 }, description: 'Crit rate/ATT (partial stacks)', personal: true },
  // Debuffs on target (personal-ish)
  { id: 'dia2', name: 'Dia II', category: 'Debuff', effects: { targetDefMult: -0.1 }, description: 'Target Defense -10%', personal: true, exclusiveGroup: 'dia' },
  { id: 'dia3', name: 'Dia III', category: 'Debuff', effects: { targetDefMult: -0.15 }, description: 'Target Defense -15%', personal: true, exclusiveGroup: 'dia' },
  { id: 'armor_break', name: 'Armor Break', category: 'Debuff', effects: { targetDefMult: -0.25 }, description: 'Target Defense -25%' },
  { id: 'distract3', name: 'Distract III', category: 'Debuff', effects: { targetEvaFlat: -85 }, description: 'Target Evasion -85' },
];
export const BUFF_BY_ID: Record<string, BuffDef> = Object.fromEntries(BUFFS.map((b) => [b.id, b]));

export const MOB_TIERS: Record<string, Target> = {
  easy: { name: 'Easy (Ambuscade Normal)', level: 129, DEF: 950, EVA: 860, VIT: 220, INT: 200, MEVA: 900, MDB: 30, AGI: 200 },
  medium: { name: 'Medium (Ambuscade Difficult)', level: 135, DEF: 1150, EVA: 980, VIT: 250, INT: 230, MEVA: 1020, MDB: 40, AGI: 230 },
  hard: { name: 'Hard (Ambuscade Very Difficult)', level: 140, DEF: 1380, EVA: 1090, VIT: 280, INT: 260, MEVA: 1150, MDB: 50, AGI: 260 },
  extreme: { name: 'Extreme (Odyssey / Sortie boss)', level: 145, DEF: 1650, EVA: 1200, VIT: 310, INT: 300, MEVA: 1300, MDB: 60, AGI: 300 },
};
