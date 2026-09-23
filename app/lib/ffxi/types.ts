export type WeaponInfo = {
  skill: string;
  skillId: number;
  subskill: number;
  damage: number;
  delay: number;
  dmgType: string;
  dmgTypeId: number;
  hitCount: number;
  iLvlSkill: number;
  iLvlParry: number;
  iLvlMacc: number;
  unlockPoints: number;
};

export type GearItem = {
  id: number;
  name: string;
  displayName: string;
  nameJp?: string;
  type: 'weapon' | 'armor';
  level: number;
  iLevel: number;
  suLevel: number;
  jobs: string[];
  jobMask: number;
  slots: string[];
  slotMask: number;
  /** Bitmask of slots this item blocks while equipped (e.g. a full-body suit hides head/hands/legs/feet). */
  rslotMask?: number;
  shieldSize: number;
  flags: { rare: boolean; exclusive: boolean; canEquip: boolean; raw: number };
  weapon: WeaponInfo | null;
  stats: Record<string, number>;
  latents: unknown[];
  petStats: Record<string, Record<string, number>> | null;
  /** Set on virtual augmented copies (id >= 1,000,000): the real item id and the augment strings. */
  baseId?: number;
  augments?: string[];
  /** Augment strings the parser could not turn into stats (the piece is under-valued by their value). */
  unparsedAugments?: string[];
  /** Path/Rank augment strings (Nyame/Sakpata's/Odyssey-style gear): stats depend on the path, which the base DB row cannot express. */
  pathRank?: string[];
  /** Concrete augment lines expanded from `Path:`/`Rank:` via the BG-Wiki path table (already counted in stats). */
  resolvedAugments?: string[];
  /** Unity Ranking bonus: stat -> [value at the lowest rank, value at rank 1]. */
  unity?: Record<string, [number, number]>;
};

export const UNITY_MAX_RANK = 11;

/**
 * Fraction of the rank-1 (maximum) Unity Ranking bonus received at each rank (index 0 = rank 1 ... index 10 = rank 11).
 * PLACEHOLDER: linear, which is a guess. Replace with the verified per-rank values (BG-Wiki "Unity Concord" /
 * in-game item text at several ranks) - that is the only place the curve lives.
 */
export const UNITY_RANK_FRACTION: number[] = Array.from({ length: UNITY_MAX_RANK }, (_: unknown, i: number) => (UNITY_MAX_RANK - 1 - i) / (UNITY_MAX_RANK - 1));

/** Unity Ranking bonus for a given rank (1 = best, 11 = lowest): interpolates between the [lowest-rank, rank-1] values. */
export function unityBonus(range: [number, number] | undefined, rank: number): number {
  if (!range) return 0;
  const r = Math.min(UNITY_MAX_RANK, Math.max(1, Math.round(rank ?? 1)));
  const t = UNITY_RANK_FRACTION[r - 1] ?? 0;
  return Math.round(range[0] + (range[1] - range[0]) * t);
}

/** Slot bitmask used by slotMask / rslotMask. */
export const SLOT_BITS: Record<Slot, number> = {
  main: 1, sub: 2, range: 4, ammo: 8, head: 16, body: 32, hands: 64, legs: 128, feet: 256, neck: 512, waist: 1024,
  left_ear: 2048, right_ear: 4096, left_ring: 8192, right_ring: 16384, back: 32768,
};

/** Slots blocked by an item's rslotMask (ear/ring bits block both sides). */
export function blockedSlotsOf(item: GearItem | undefined | null): Slot[] {
  const mask = item?.rslotMask ?? 0;
  if (!mask) return [];
  const out: Slot[] = [];
  for (const slot of SLOTS) {
    if (mask & SLOT_BITS[slot]) out.push(slot);
  }
  if (mask & (2048 | 4096)) { if (!out.includes('left_ear')) out.push('left_ear'); if (!out.includes('right_ear')) out.push('right_ear'); }
  if (mask & (8192 | 16384)) { if (!out.includes('left_ring')) out.push('left_ring'); if (!out.includes('right_ring')) out.push('right_ring'); }
  return out;
}

/** Slots that are currently blocked by another equipped item, mapped to the blocking slot. */
export function blockedSlots(set: GearSet, db: GearDB): Partial<Record<Slot, Slot>> {
  const out: Partial<Record<Slot, Slot>> = {};
  for (const slot of Object.keys(set ?? {}) as Slot[]) {
    const id = set[slot];
    if (id == null) continue;
    const item = db?.[String(id)];
    for (const b of blockedSlotsOf(item)) {
      if (b !== slot) out[b] = slot;
    }
  }
  return out;
}

export type GearDB = Record<string, GearItem>;

export const SLOTS = [
  'main',
  'sub',
  'range',
  'ammo',
  'head',
  'body',
  'hands',
  'legs',
  'feet',
  'neck',
  'waist',
  'left_ear',
  'right_ear',
  'left_ring',
  'right_ring',
  'back',
] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_LABELS: Record<Slot, string> = {
  main: 'Main',
  sub: 'Sub',
  range: 'Ranged',
  ammo: 'Ammo',
  head: 'Head',
  body: 'Body',
  hands: 'Hands',
  legs: 'Legs',
  feet: 'Feet',
  neck: 'Neck',
  waist: 'Waist',
  left_ear: 'Ear 1',
  right_ear: 'Ear 2',
  left_ring: 'Ring 1',
  right_ring: 'Ring 2',
  back: 'Back',
};

/** Maps DB slot names to app slots (ear/ring items can go in either slot). */
export const DB_SLOT_TO_SLOTS: Record<string, Slot[]> = {
  Main: ['main'],
  Sub: ['sub'],
  Ranged: ['range'],
  Ammo: ['ammo'],
  Head: ['head'],
  Body: ['body'],
  Hands: ['hands'],
  Legs: ['legs'],
  Feet: ['feet'],
  Neck: ['neck'],
  Waist: ['waist'],
  Ear1: ['left_ear', 'right_ear'],
  Ear2: ['left_ear', 'right_ear'],
  Ring1: ['left_ring', 'right_ring'],
  Ring2: ['left_ring', 'right_ring'],
  Back: ['back'],
};

/** item id per slot */
export type GearSet = Partial<Record<Slot, number>>;

/** item id -> owned count */
export type Inventory = Record<number, number>;

export type Target = {
  name: string;
  level: number;
  DEF: number;
  EVA: number;
  VIT: number;
  INT: number;
  MEVA: number;
  MDB: number;
  /** Target AGI (drives the dDEX critical-hit bonus). */
  AGI?: number;
};

export type BuffTier = 'low' | 'high';

export type ContextKind =
  | 'tp' | 'ws' | 'magic' | 'healing' | 'idle' | 'fastcast' | 'hybrid' | 'th'
  // caster contexts (built for mage jobs / mage subjobs)
  | 'mb' | 'enhancing' | 'enfeebling' | 'curecast' | 'cursna' | 'regen' | 'mpidle';

/** Contexts that are only built when the player is (or subs) a spellcasting job. */
export const CASTER_CONTEXTS: ContextKind[] = ['mb', 'enhancing', 'enfeebling', 'curecast', 'cursna', 'regen', 'mpidle'];

export type OptimizeContext = {
  kind: ContextKind;
  wsName?: string;
  dtThreshold?: number; // e.g. 35 => at least -35% DT
  /** TP/hybrid: damage of the weapon skill fired from the (separate) WS set; the TP set is judged on white damage + how fast it reaches 1000 TP. */
  wsRefDamage?: number;
  /** WS: TP the weapon skill is fired at (from the TP set's overshoot). */
  wsTp?: number;
};

export type Aggregate = Record<string, number>;

export type SetEvaluation = {
  score: number;
  summary: Record<string, number>;
};

export type OptimizedSet = {
  key: string;
  label: string;
  context: OptimizeContext;
  tier: BuffTier;
  gear: GearSet;
  evaluation: SetEvaluation;
};

export type WeaponLock = { main: number | null; sub: number | null };

export type OptimizerConfig = {
  mainJob: string;
  subJob: string;
  inventory: Inventory;
  buffIds: string[];
  target: Target;
  lockedMain: number | null;
  lockedSub: number | null;
  /**
   * Weapon locks per weapon-skill category (keyed by combat skill, e.g. "Great Axe"). A category lock is
   * used for every weapon skill of that skill type; the main/sub locks above only apply to weapon skills
   * of the TP weapon's skill type.
   */
  weaponLocks?: Record<string, WeaponLock>;
  primaryWs: string | null;
  dtThreshold: number;
  wsNames: string[];
  /** Unity Ranking of the player's Unity (1 = best bonus ... 11). */
  unityRank?: number;
  /** Total job points spent on the main job (0-2100). Defaults to 2100. */
  jobPoints?: number;
  /** Master Level (0-50). Defaults to 50. */
  masterLevel?: number;
  /** Run the pairwise-swap refinement pass on every result (default true). */
  refine?: boolean;
};
