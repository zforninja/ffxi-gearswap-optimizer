import { BUFF_BY_ID, TWO_HANDED_SKILLS, WS_BY_NAME, jobBaseStats, jobTraits, type WeaponSkillDef } from './constants';
import { blockedSlots, unityBonus, type Aggregate, type GearDB, type GearItem, type GearSet, type Slot, type Target } from './types';

export const GEAR_HASTE_CAP = 0.25;
export const MAGIC_HASTE_CAP = 0.4375;
export const JA_HASTE_CAP = 0.25;
export const TOTAL_DELAY_REDUCTION_CAP = 0.8;
export const DT_CAP = -50;
export const FAST_CAST_CAP = 80;
export const BASE_COMBAT_SKILL = 480; // level 99 A+ skill incl. merits & master levels
const WS_ALPHA = 0.83;
const WS_ANIMATION_DELAY = 1.6;

export type PlayerContext = {
  mainJob: string;
  subJob: string;
  buffIds: string[];
  target: Target;
  /** Unity Ranking (1 = best ... 11); defaults to 1 when omitted. */
  unityRank?: number;
};

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v ?? 0));
const g = (a: Aggregate, k: string) => a?.[k] ?? 0;

/** Sum base stats + traits + buffs + all gear stats into one aggregate. */
export function aggregate(set: GearSet, db: GearDB, ctx: PlayerContext): Aggregate {
  const agg: Aggregate = { ...(jobBaseStats(ctx?.mainJob, ctx?.subJob) ?? {}) };
  const traits = jobTraits(ctx?.mainJob, ctx?.subJob);
  Object.entries(traits ?? {}).forEach(([k, v]) => {
    agg[k] = (agg[k] ?? 0) + (v ?? 0);
  });
  for (const id of ctx?.buffIds ?? []) {
    const b = BUFF_BY_ID[id];
    if (!b) continue;
    Object.entries(b.effects ?? {}).forEach(([k, v]) => {
      agg[k] = (agg[k] ?? 0) + (v ?? 0);
    });
  }
  // items sitting in a slot hidden by another equipped piece (e.g. a full-body suit) contribute nothing
  const blocked = blockedSlots(set, db);
  for (const slot of Object.keys(set ?? {}) as Slot[]) {
    const id = set[slot];
    if (id == null) continue;
    if (blocked[slot]) continue;
    const item = db?.[String(id)];
    if (!item) continue;
    Object.entries(item.stats ?? {}).forEach(([k, v]) => {
      agg[k] = (agg[k] ?? 0) + (v ?? 0);
    });
    // Unity Ranking bonus ("Accuracy+5~10" etc.) scaled by the player's Unity rank
    if (item.unity) {
      const rank = ctx?.unityRank ?? 1;
      Object.entries(item.unity).forEach(([k, range]) => {
        agg[k] = (agg[k] ?? 0) + unityBonus(range, rank);
      });
    }
  }
  return agg;
}

export function isTwoHanded(w: GearItem | undefined | null) {
  return !!w?.weapon && TWO_HANDED_SKILLS.has(w.weapon.skill ?? '');
}
export function isH2H(w: GearItem | undefined | null) {
  return !!w?.weapon && w.weapon.skill === 'Hand To Hand';
}

export function skillAccuracy(skill: number) {
  return skill <= 200 ? skill : 200 + Math.floor((skill - 200) * 0.9);
}

export function computeAccuracy(agg: Aggregate, ranged = false) {
  const stat = ranged ? g(agg, 'AGI') : g(agg, 'DEX');
  return skillAccuracy(BASE_COMBAT_SKILL) + Math.floor(stat * 0.75) + g(agg, ranged ? 'RACC' : 'ACC');
}

export function computeAttack(agg: Aggregate, ranged = false) {
  const base = 8 + BASE_COMBAT_SKILL + Math.floor(g(agg, 'STR') * 0.75) + g(agg, ranged ? 'RATT' : 'ATT') + g(agg, 'attackBonus');
  const pct = 1 + (g(agg, 'attPct') + g(agg, 'attp')) / 100;
  return Math.floor(base * pct);
}

export function hitRate(acc: number, eva: number, capPct = 95) {
  return clamp(75 + Math.floor((acc - eva) * 0.5), 20, capPct) / 100;
}

/** fSTR (1H and 2H variants). */
export function fSTR(dSTR: number, weaponDmg: number, twoHanded: boolean) {
  let f: number;
  if (dSTR >= 12) f = (dSTR + 4) / 4;
  else if (dSTR >= 6) f = (dSTR + 6) / 4;
  else if (dSTR >= 1) f = (dSTR + 7) / 4;
  else if (dSTR >= -2) f = (dSTR + 8) / 4;
  else if (dSTR >= -7) f = (dSTR + 9) / 4;
  else if (dSTR >= -15) f = (dSTR + 10) / 4;
  else if (dSTR >= -21) f = (dSTR + 12) / 4;
  else f = (dSTR + 13) / 4;
  f = Math.floor(f);
  const rank = Math.floor((weaponDmg ?? 0) / 9);
  if (twoHanded) {
    f = Math.floor(f * 2);
    return clamp(f, -rank * 2, rank * 2 + 8);
  }
  return clamp(f, -rank, rank + 8);
}

export function pdifRange(cRatio: number): [number, number] {
  const r = cRatio;
  let max: number;
  if (r < 0.5) max = r + 0.5;
  else if (r < 0.7) max = 1;
  else if (r < 1.2) max = r + 0.3;
  else if (r < 1.5) max = r * 1.25;
  else if (r < 2.625) max = r + 0.375;
  else if (r < 3.25) max = 3;
  else max = r - 0.25;
  let min: number;
  if (r < 0.38) min = 0;
  else if (r < 1.25) min = (r * 1176) / 1024 - 448 / 1024;
  else if (r < 1.51) min = 1;
  else if (r < 2.44) min = (r * 1176) / 1024 - 775 / 1024;
  else min = r - 0.375;
  return [Math.max(0, min), Math.max(min, max)];
}

/** Critical hit rate bonus from dDEX (DEX - target AGI). */
export function critFromDex(dDEX: number) {
  if (dDEX >= 50) return 15;
  if (dDEX >= 40) return 5;
  if (dDEX >= 30) return 4;
  if (dDEX >= 20) return 3;
  if (dDEX >= 14) return 2;
  if (dDEX >= 7) return 1;
  return 0;
}

/** Expected pDIF including crit blend and the 1.0-1.05 random multiplier. `pdlPct` = "Physical damage limit +n%". */
export function expectedPdif(att: number, def: number, critRate: number, critDmgBonusPct: number, twoHanded: boolean, pdlPct = 0) {
  const cap = (twoHanded ? 3.5 : 3.25) * (1 + clamp(pdlPct, 0, 100) / 100);
  const ratio = clamp(att / Math.max(1, def), 0, cap);
  const [nMin, nMax] = pdifRange(ratio);
  const [cMin, cMax] = pdifRange(clamp(ratio + 1, 0, cap + 1));
  const normal = ((nMin + nMax) / 2) * 1.025;
  const crit = ((cMin + cMax) / 2) * 1.025 * (1 + critDmgBonusPct / 100);
  const cr = clamp(critRate, 0, 1);
  return normal * (1 - cr) + crit * cr;
}

export function baseTpPerHit(delay: number) {
  const d = Math.max(1, delay);
  if (d <= 180) return 61 + ((d - 180) * 63) / 360;
  if (d <= 540) return 61 + ((d - 180) * 88) / 360;
  if (d <= 630) return 149 + ((d - 540) * 20) / 360;
  if (d <= 720) return 154 + ((d - 630) * 28) / 360;
  if (d <= 900) return 161 + ((d - 720) * 24) / 360;
  return 173 + ((d - 900) * 28) / 360;
}

export function hasteBreakdown(agg: Aggregate) {
  const gear = clamp(g(agg, 'hasteGear') / 10000, 0, GEAR_HASTE_CAP);
  const magic = clamp(g(agg, 'magicHaste') / 100, 0, MAGIC_HASTE_CAP);
  const ja = clamp(g(agg, 'jaHaste') / 100, 0, JA_HASTE_CAP);
  const total = clamp(gear + magic + ja, 0, TOTAL_DELAY_REDUCTION_CAP);
  return { gear, magic, ja, total };
}

export function multiAttackHitsPerSwing(agg: Aggregate) {
  const qa = clamp(g(agg, 'quadAttack') / 100, 0, 1);
  const ta = clamp(g(agg, 'tripleAttack') / 100, 0, 1);
  const da = clamp(g(agg, 'doubleAttack') / 100, 0, 1);
  return 1 + qa * 3 + (1 - qa) * (ta * 2 + (1 - ta) * da);
}

/**
 * Weapons whose data lists more than one hit ("Occasionally attacks twice / 2-3 times", Kraken Club 2-8)
 * do NOT hit that many times every swing: the extra hits are an occasional proc (~40% for "attacks twice",
 * ~60% for the 2-3 variants) checked before Double/Triple Attack, and the two never stack on one swing.
 * Returns the expected hits per swing for that weapon given the gear multi-attack rate.
 */
export function occasionalHitsPerSwing(w: GearItem | undefined, maHitsPerSwing: number) {
  const hc = w?.weapon?.hitCount ?? 1;
  if (hc <= 1) return maHitsPerSwing;
  const pProc = hc === 2 ? 0.4 : 0.6;
  const extraOnProc = hc === 2 ? 1 : hc === 3 ? 1.33 : (hc - 1) / 2;
  return 1 + pProc * extraOnProc + (1 - pProc) * (maHitsPerSwing - 1);
}

export function effectiveTarget(agg: Aggregate, target: Target): Target {
  const defMult = clamp(1 + g(agg, 'targetDefMult'), 0.3, 1);
  return {
    ...target,
    DEF: Math.floor((target?.DEF ?? 1000) * defMult),
    EVA: Math.max(0, (target?.EVA ?? 1000) + g(agg, 'targetEvaFlat')),
    MDB: Math.max(-50, (target?.MDB ?? 0) + g(agg, 'targetMdbFlat')),
    MEVA: Math.max(0, (target?.MEVA ?? 0) + g(agg, 'targetMevaFlat')),
  };
}

function weaponDelay(w: GearItem | undefined, agg: Aggregate) {
  if (!w?.weapon) return 240; // unarmed-ish fallback
  if (isH2H(w)) return Math.max(96, (w.weapon.delay ?? 480) - g(agg, 'martialArts'));
  return w.weapon.delay ?? 240;
}

export type MeleeResult = {
  dps: number;
  meleeDps: number;
  wsDps: number;
  wsDamage: number;
  acc: number;
  att: number;
  hitRate: number;
  haste: number;
  gearHaste: number;
  delay: number;
  tpPerHit: number;
  hitsPerRound: number;
  roundsToWs: number;
  secondsToWs: number;
  critRate: number;
  pdif: number;
  dualWield: number;
  storeTp: number;
  multiAttack: number;
  tpAtWs: number;
};

/**
 * Full melee TP-phase model including WS frequency.
 * In game the weapon skill is fired from a separate WS set (GearSwap swaps for it), so when `wsRefDamage`
 * is given the TP set is judged on its white damage plus how quickly it reaches 1000 TP, with the WS
 * contributing a fixed amount of damage per cycle. Without it the WS is evaluated in the TP gear itself.
 */
export function evaluateMelee(set: GearSet, db: GearDB, ctx: PlayerContext, agg: Aggregate, wsName: string | null, wsRefDamage?: number): MeleeResult {
  const main = set?.main != null ? db?.[String(set.main)] : undefined;
  const sub = set?.sub != null ? db?.[String(set.sub)] : undefined;
  const target = effectiveTarget(agg, ctx?.target);
  const twoH = isTwoHanded(main);
  const dualWield = !!sub?.weapon && !twoH && !isH2H(main) && !isH2H(sub) && (sub.weapon.skill ?? '') !== 'None' && sub.type === 'weapon';
  const dwPct = dualWield ? clamp(g(agg, 'dualWield'), 0, 80) / 100 : 0;

  const mainD = main?.weapon?.damage ?? 10;
  const subD = dualWield ? (sub?.weapon?.damage ?? 0) : 0;
  const mainDelay = weaponDelay(main, agg);
  const subDelay = dualWield ? weaponDelay(sub, agg) : 0;
  const baseDelay = mainDelay + subDelay;
  const haste = hasteBreakdown(agg);
  const reduction = clamp(1 - (1 - haste.total) * (1 - dwPct), 0, TOTAL_DELAY_REDUCTION_CAP);
  const effDelay = baseDelay * (1 - reduction);
  const roundTime = effDelay / 60;

  const acc = computeAccuracy(agg);
  const att = computeAttack(agg);
  const hr = hitRate(acc, target.EVA, 95);
  const critRate = clamp(5 + g(agg, 'crithitrate') + critFromDex(g(agg, 'DEX') - (target.AGI ?? 0)), 0, 100) / 100;
  const pdif = expectedPdif(att, target.DEF, critRate, g(agg, 'critDmgIncrease'), twoH, g(agg, 'pdl'));
  const dSTR = g(agg, 'STR') - (target.VIT ?? 0);
  const mainHit = (mainD + fSTR(dSTR, mainD, twoH)) * pdif;
  const subHit = dualWield ? (subD + fSTR(dSTR, subD, false)) * pdif : 0;

  const ma = multiAttackHitsPerSwing(agg);
  const h2h = isH2H(main);
  const mainHits = occasionalHitsPerSwing(main, ma);
  // hand-to-hand swings both fists every round (same D on each); dual wield swings the off-hand weapon
  const offHits = dualWield ? occasionalHitsPerSwing(sub, ma) : h2h ? mainHits : 0;
  const offHit = dualWield ? subHit : h2h ? mainHit : 0;
  const hitsPerRound = Math.min(8, mainHits + offHits);
  const dmgPerRound = (mainHit * mainHits + offHit * offHits) * hr;
  const meleeDps = roundTime > 0 ? dmgPerRound / roundTime : 0;

  const stp = g(agg, 'storetp');
  const tpDelay = dualWield ? baseDelay * (1 - dwPct) : baseDelay;
  const tpPerHit = Math.floor(baseTpPerHit(tpDelay) * (1 + stp / 100));
  const tpPerRound = Math.max(1, hitsPerRound * hr * tpPerHit);
  const roundsToWs = 1000 / tpPerRound;
  const secondsToWs = roundsToWs * roundTime;

  let wsDamage = 0;
  const ws = wsName ? WS_BY_NAME[wsName] : undefined;
  const tpAtWs = clamp(1000 + tpPerRound / 2, 1000, 3000);
  if (ws) {
    wsDamage = wsRefDamage != null ? wsRefDamage : evaluateWeaponskill(set, db, ctx, agg, ws, tpAtWs).damage;
  }
  const cycle = secondsToWs + (ws ? WS_ANIMATION_DELAY : 0);
  const dps = cycle > 0 ? (dmgPerRound * roundsToWs + wsDamage) / cycle : meleeDps;
  return {
    dps,
    meleeDps,
    wsDps: cycle > 0 ? wsDamage / cycle : 0,
    wsDamage,
    acc,
    att,
    hitRate: hr,
    haste: haste.total,
    gearHaste: haste.gear,
    delay: effDelay,
    tpPerHit,
    hitsPerRound,
    roundsToWs,
    secondsToWs,
    critRate,
    pdif,
    dualWield: dwPct * 100,
    storeTp: stp,
    multiAttack: (ma - 1) * 100,
    tpAtWs,
  };
}

function lerpFtp(v: [number, number, number], tp: number) {
  const t = clamp(tp, 1000, 3000);
  if (t <= 2000) return v[0] + ((v[1] - v[0]) * (t - 1000)) / 1000;
  return v[1] + ((v[2] - v[1]) * (t - 2000)) / 1000;
}

export type WsResult = { damage: number; acc: number; att: number; hitRate: number; hits: number; ftp: number; wsc: number; pdif: number; tp: number; critRate: number };

export function evaluateWeaponskill(set: GearSet, db: GearDB, ctx: PlayerContext, agg: Aggregate, ws: WeaponSkillDef, tp: number): WsResult {
  const main = set?.main != null ? db?.[String(set.main)] : undefined;
  const sub = set?.sub != null ? db?.[String(set.sub)] : undefined;
  const range = set?.range != null ? db?.[String(set.range)] : undefined;
  const ammo = set?.ammo != null ? db?.[String(set.ammo)] : undefined;
  const target = effectiveTarget(agg, ctx?.target);
  const ranged = !!ws?.ranged;
  const twoH = isTwoHanded(main);
  const dualWield = !ranged && !!sub?.weapon && sub.type === 'weapon' && !twoH && !isH2H(main) && !isH2H(sub);

  const effTp = clamp(tp + g(agg, 'tpBonus'), 1000, 3000);
  const ftp = lerpFtp(ws?.ftp ?? [1, 1, 1], effTp);
  const critBonus = ws?.crit ? lerpFtp(ws.crit, effTp) : 0;

  let wsc = 0;
  Object.entries(ws?.mods ?? {}).forEach(([stat, frac]) => {
    wsc += g(agg, stat) * (frac ?? 0);
  });
  wsc = Math.floor(Math.floor(wsc) * WS_ALPHA);

  const D = ranged ? (range?.weapon?.damage ?? 0) + (ammo?.weapon?.damage ?? 0) : (main?.weapon?.damage ?? 10);
  const dSTR = g(agg, 'STR') - (target.VIT ?? 0);
  const base = D + fSTR(dSTR, D, twoH) + wsc;
  const offBase = dualWield ? (sub?.weapon?.damage ?? 0) + fSTR(dSTR, sub?.weapon?.damage ?? 0, false) + wsc : 0;

  const acc = computeAccuracy(agg, ranged) + (ws?.accBonus ?? 0) + g(agg, 'wsacc');
  const att = Math.floor(computeAttack(agg, ranged) * (ws?.attMult ?? 1));
  const hr = hitRate(acc, target.EVA, 99);
  const critRate = clamp(5 + g(agg, 'crithitrate') + critBonus + critFromDex(g(agg, 'DEX') - (target.AGI ?? 0)), 0, 100) / 100;
  const pdif = expectedPdif(att, target.DEF, critRate, g(agg, 'critDmgIncrease'), twoH, g(agg, 'pdl'));

  const ma = ranged ? 1 : multiAttackHitsPerSwing(agg);
  const totalHits = Math.min(8, (ws?.hits ?? 1) + (dualWield ? 1 : 0) + (ma - 1) * (dualWield ? 2 : 1));
  const wsdAll = 1 + g(agg, 'allWsdmgAllHits') / 100;
  const wsdFirst = 1 + (g(agg, 'allWsdmgAllHits') + g(agg, 'allWsdmgFirstHit')) / 100;

  const firstHit = base * ftp * pdif * wsdFirst * hr;
  const otherFtp = ws?.ftpTransfers ? ftp : 1;
  const otherHits = Math.max(0, totalHits - 1);
  const offHits = dualWield ? 1 : 0;
  const mainOther = Math.max(0, otherHits - offHits);
  const others = (mainOther * base + offHits * offBase) * otherFtp * pdif * wsdAll * hr;
  return { damage: Math.floor(firstHit + others), acc, att, hitRate: hr, hits: totalHits, ftp, wsc, pdif, tp: effTp, critRate };
}

export function magicHitRate(macc: number, meva: number) {
  const d = macc - meva;
  const rate = d >= 0 ? 50 + d * 0.5 : 50 + d;
  return clamp(rate, 5, 95) / 100;
}

export type MagicResult = { damage: number; macc: number; mab: number; int: number; resistMult: number; base: number; mbBonus: number };

/** Generic tier-V nuke model. */
export function evaluateMagic(agg: Aggregate, target: Target): MagicResult {
  const t = effectiveTarget(agg, target);
  const int = g(agg, 'INT');
  const dINT = int - (t.INT ?? 0);
  const V = 500;
  const M = 2.0;
  const base = V + g(agg, 'magicDamage') + clamp(dINT, -100, 300) * M;
  const mab = g(agg, 'MATT');
  const mabMult = (100 + mab) / (100 + (t.MDB ?? 0));
  const macc = 380 + Math.floor(int * 0.5) + g(agg, 'MACC');
  const p = magicHitRate(macc, t.MEVA ?? 0);
  // expected resist multiplier across tiers (full, 1/2, 1/4, 1/8)
  const resistMult = p + (1 - p) * (p * 0.5 + (1 - p) * (p * 0.25 + (1 - p) * 0.125));
  const mbBonus = clamp(g(agg, 'magicBurstBonusCapped'), 0, 40);
  return { damage: Math.floor(base * mabMult * resistMult), macc, mab, int, resistMult, base, mbBonus };
}

export type HealResult = { cure: number; curePotency: number; curePotencyII: number; enmity: number; mnd: number };
export function evaluateHealing(agg: Aggregate): HealResult {
  const cp = clamp(g(agg, 'curePotency'), 0, 50);
  const cp2 = clamp(g(agg, 'curePotencyIi'), 0, 30);
  const mnd = g(agg, 'MND');
  const power = Math.floor(mnd / 2) + Math.floor(g(agg, 'VIT') / 4) + Math.floor((g(agg, 'healing') ?? 0) * 0.6) + 300;
  const cure = Math.floor((650 + power * 0.9) * (1 + cp / 100) * (1 + cp2 / 100));
  return { cure, curePotency: cp, curePotencyII: cp2, enmity: g(agg, 'enmity'), mnd };
}

export type DefenseResult = { dt: number; pdt: number; mdt: number; hp: number; def: number; meva: number; refresh: number; regen: number; move: number };
export function evaluateDefense(agg: Aggregate): DefenseResult {
  const dt = g(agg, 'dmg') / 100;
  const pdt = clamp(dt + g(agg, 'dmgphys') / 100, DT_CAP, 100);
  const mdt = clamp(dt + g(agg, 'dmgmagic') / 100, DT_CAP, 100);
  return {
    dt: clamp(dt, DT_CAP, 100),
    pdt,
    mdt,
    hp: g(agg, 'HP'),
    def: g(agg, 'DEF'),
    meva: g(agg, 'MEVA'),
    refresh: g(agg, 'refresh'),
    regen: g(agg, 'regen'),
    move: g(agg, 'moveSpeedGearBonus'),
  };
}

export { SLOTS } from './types';
export type { Slot };
