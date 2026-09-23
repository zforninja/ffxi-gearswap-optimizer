import { WS_BY_NAME, jobTraits, MELEE_SKILLS, RANGED_SKILLS } from './constants';
import {
  aggregate,
  evaluateDefense,
  evaluateHealing,
  evaluateMagic,
  evaluateMelee,
  evaluateWeaponskill,
  isH2H,
  isTwoHanded,
  clamp,
  DT_CAP,
  FAST_CAST_CAP,
  type PlayerContext,
} from './math';
import { BUFF_BY_ID } from './constants';
import {
  DB_SLOT_TO_SLOTS,
  SLOTS,
  blockedSlots,
  blockedSlotsOf,
  type BuffTier,
  type GearDB,
  type GearItem,
  type GearSet,
  type Inventory,
  type OptimizeContext,
  type OptimizedSet,
  type OptimizerConfig,
  type SetEvaluation,
  type Slot,
} from './types';

export type Candidates = Record<Slot, GearItem[]>;

const NON_WEAPON_SLOTS: Slot[] = SLOTS.filter((s: Slot) => s !== 'main' && s !== 'sub' && s !== 'range' && s !== 'ammo');

/** Build candidate lists per slot: owned, equippable by main job, and slot-compatible. */
export function buildCandidates(db: GearDB, inventory: Inventory, mainJob: string): Candidates {
  const out = Object.fromEntries(SLOTS.map((s: Slot) => [s, [] as GearItem[]])) as Candidates;
  for (const idStr of Object.keys(inventory ?? {})) {
    const count = inventory?.[Number(idStr)] ?? 0;
    if (count <= 0) continue;
    const item = db?.[idStr];
    if (!item) continue;
    if (!(item.jobs ?? []).includes(mainJob)) continue;
    const seen = new Set<Slot>();
    for (const dbSlot of item.slots ?? []) {
      for (const slot of DB_SLOT_TO_SLOTS[dbSlot] ?? []) {
        if (seen.has(slot)) continue;
        seen.add(slot);
        out[slot]?.push(item);
      }
    }
  }
  return out;
}

function subAllowed(main: GearItem | undefined, sub: GearItem, traits: { dualWield: number }): boolean {
  if (!main) return false;
  const twoH = isTwoHanded(main);
  const h2h = isH2H(main);
  if (h2h) return false;
  const isGrip = sub?.type === 'weapon' && sub?.weapon?.skill === 'None';
  const isWeapon = sub?.type === 'weapon' && !isGrip;
  if (twoH) return isGrip;
  if (isGrip) return false;
  if (isWeapon) return (traits?.dualWield ?? 0) > 0 && !RANGED_SKILLS.has(sub?.weapon?.skill ?? '') && sub?.weapon?.skill !== 'Hand To Hand';
  return true; // shields & other sub armor
}

function wsUsable(ws: { skill: string } | undefined, main: GearItem | undefined, range: GearItem | undefined): boolean {
  if (!ws) return false;
  if (RANGED_SKILLS.has(ws.skill)) return (range?.weapon?.skill ?? '') === ws.skill;
  return (main?.weapon?.skill ?? '') === ws.skill;
}

export function tierBuffIds(buffIds: string[], tier: BuffTier): string[] {
  if (tier === 'high') return [...(buffIds ?? [])];
  return (buffIds ?? []).filter((id: string) => !!BUFF_BY_ID[id]?.personal);
}

/** Score a set for the given context; higher is better. */
export function scoreSet(set: GearSet, db: GearDB, ctx: PlayerContext, oc: OptimizeContext, primaryWs: string | null): SetEvaluation {
  const agg = aggregate(set, db, ctx);
  const main = set?.main != null ? db?.[String(set.main)] : undefined;
  const range = set?.range != null ? db?.[String(set.range)] : undefined;
  const def = evaluateDefense(agg);
  switch (oc?.kind) {
    case 'tp':
    case 'th': {
      const ws = primaryWs && wsUsable(WS_BY_NAME[primaryWs], main, range) ? primaryWs : null;
      const m = evaluateMelee(set, db, ctx, agg, ws, ws ? oc.wsRefDamage : undefined);
      const th = agg?.treasureHunter ?? 0;
      const score = oc.kind === 'th' ? th * 100000 + m.dps : m.dps;
      return {
        score,
        summary: {
          dps: m.dps, meleeDps: m.meleeDps, wsDps: m.wsDps, wsDamage: m.wsDamage, acc: m.acc, att: m.att, hitRate: m.hitRate * 100,
          haste: m.haste * 100, gearHaste: m.gearHaste * 100, storeTp: m.storeTp, multiAttack: m.multiAttack, tpPerHit: m.tpPerHit,
          secondsToWs: m.secondsToWs, critRate: m.critRate * 100, dualWield: m.dualWield, delay: m.delay, dt: def.dt, hp: def.hp, th, tpAtWs: m.tpAtWs,
        },
      };
    }
    case 'ws': {
      const ws = WS_BY_NAME[oc.wsName ?? ''];
      if (!ws || !wsUsable(ws, main, range)) return { score: -1, summary: { wsDamage: 0 } };
      const r = evaluateWeaponskill(set, db, ctx, agg, ws, oc.wsTp ?? 1500);
      return {
        score: r.damage,
        summary: { wsDamage: r.damage, acc: r.acc, att: r.att, hitRate: r.hitRate * 100, hits: r.hits, ftp: r.ftp, wsc: r.wsc, pdif: r.pdif, tp: r.tp, critRate: r.critRate * 100, str: agg?.STR ?? 0, dt: def.dt },
      };
    }
    case 'magic': {
      const r = evaluateMagic(agg, ctx.target);
      return { score: r.damage, summary: { magicDamage: r.damage, macc: r.macc, mab: r.mab, int: r.int, magicHitRate: r.resistMult * 100, mbBonus: r.mbBonus, dt: def.dt } };
    }
    case 'healing': {
      const r = evaluateHealing(agg);
      return { score: r.cure - r.enmity * 3, summary: { cure: r.cure, curePotency: r.curePotency, curePotencyII: r.curePotencyII, enmity: r.enmity, mnd: r.mnd, dt: def.dt, hp: def.hp } };
    }
    case 'idle': {
      // DT to the -50% cap is worth the most; then HP, refresh, regen, meva.
      const dtScore = -clamp(def.dt, DT_CAP, 0) * 100;
      const pdtScore = -clamp(def.pdt, DT_CAP, 0) * 20;
      const mdtScore = -clamp(def.mdt, DT_CAP, 0) * 20;
      const score = dtScore + pdtScore + mdtScore + def.hp * 0.5 + def.refresh * 60 + def.regen * 20 + def.meva * 0.5 + def.def * 0.1 + (def.move > 0 ? 40 : 0);
      return { score, summary: { dt: def.dt, pdt: def.pdt, mdt: def.mdt, hp: def.hp, def: def.def, meva: def.meva, refresh: def.refresh, regen: def.regen, move: def.move } };
    }
    case 'fastcast': {
      const fc = agg?.fastcast ?? 0;
      const capped = clamp(fc, 0, FAST_CAST_CAP);
      const score = capped * 1000 + def.hp * 0.2 - clamp(def.dt, DT_CAP, 0) * 10 + (agg?.MP ?? 0) * 0.05;
      return { score, summary: { fastcast: fc, fastcastCapped: capped, hp: def.hp, dt: def.dt, mp: agg?.MP ?? 0 } };
    }
    case 'hybrid': {
      const ws = primaryWs && wsUsable(WS_BY_NAME[primaryWs], main, range) ? primaryWs : null;
      const m = evaluateMelee(set, db, ctx, agg, ws, ws ? oc.wsRefDamage : undefined);
      const threshold = -(oc.dtThreshold ?? 30);
      const meets = def.dt <= threshold ? 1 : 0;
      const shortfall = Math.max(0, def.dt - threshold);
      const score = m.dps - shortfall * 200;
      return {
        score,
        summary: {
          dps: m.dps, meleeDps: m.meleeDps, wsDps: m.wsDps, acc: m.acc, att: m.att, hitRate: m.hitRate * 100, haste: m.haste * 100, gearHaste: m.gearHaste * 100,
          storeTp: m.storeTp, multiAttack: m.multiAttack, tpPerHit: m.tpPerHit, secondsToWs: m.secondsToWs, dt: def.dt, pdt: def.pdt, mdt: def.mdt, hp: def.hp, meetsThreshold: meets, tpAtWs: m.tpAtWs,
        },
      };
    }
    default:
      return { score: 0, summary: {} };
  }
}

/** A real main-hand melee weapon (not a grip, pet food, or damage-less trinket). */
const isRealMeleeWeapon = (m: GearItem | undefined) =>
  !!m?.weapon && MELEE_SKILLS.has(m.weapon.skill ?? '') && (m.weapon.damage ?? 0) > 0;

/**
 * Main-hand candidates for damage contexts. Only real melee weapons compete, the weapon skill's
 * skill type wins when the player owns one, and once any item-level 119 weapon is owned the
 * pre-iLevel weapons (level 75-99 relic stages, leveling gear) are dropped: they cannot be
 * competitive and only cost search time / produce nonsense picks.
 */
function pickWeaponCandidates(cands: Candidates, oc: OptimizeContext, primaryWs: string | null): GearItem[] {
  let mains = cands.main ?? [];
  const real = mains.filter(isRealMeleeWeapon);
  if (real.length > 0) mains = real;
  const wsName = oc.kind === 'ws' ? oc.wsName : primaryWs;
  const ws = wsName ? WS_BY_NAME[wsName] : undefined;
  if (ws && !RANGED_SKILLS.has(ws.skill)) {
    const filtered = mains.filter((m: GearItem) => m?.weapon?.skill === ws.skill);
    if (filtered.length > 0) mains = filtered;
  }
  const il119 = mains.filter((m: GearItem) => (m?.iLevel ?? 0) >= 119);
  if (il119.length > 0) mains = il119;
  return mains;
}

function usesAvailable(set: GearSet, id: number, slot: Slot, inventory: Inventory): boolean {
  const owned = inventory?.[id] ?? 0;
  let used = 0;
  for (const s of Object.keys(set ?? {}) as Slot[]) {
    if (s !== slot && set[s] === id) used++;
  }
  return used < owned;
}

const isBlockingItem = (item: GearItem | undefined) => blockedSlotsOf(item).length > 0;

/**
 * Optimize a context. Pieces that hide other slots (full-body suits such as Onca Suit / Chocobo Suit) are
 * NOT allowed to compete slot-by-slot inside the greedy search: a suit tried early beats an empty
 * hands/legs/feet and then permanently blocks those slots, so the search never sees "body + 3 pieces".
 * Instead the best suit-free set is built first, then each owned suit is forced in and the remaining
 * slots re-optimized; the suit only wins if its complete set out-scores the complete suit-free set.
 */
export function optimizeContext(
  db: GearDB,
  cands: Candidates,
  cfg: OptimizerConfig,
  ctx: PlayerContext,
  oc: OptimizeContext,
  seed?: GearSet,
): { gear: GearSet; evaluation: SetEvaluation } {
  const plain: Candidates = {} as Candidates;
  const suits: { slot: Slot; item: GearItem }[] = [];
  for (const slot of Object.keys(cands ?? {}) as Slot[]) {
    const list = cands[slot] ?? [];
    plain[slot] = list.filter((i: GearItem) => !isBlockingItem(i));
    for (const i of list) if (isBlockingItem(i)) suits.push({ slot, item: i });
  }
  // seed may itself contain a suit (e.g. hybrid polishing); strip its hidden slots but keep it as a suit candidate
  const cleanSeed: GearSet = { ...(seed ?? {}) };
  for (const slot of Object.keys(cleanSeed) as Slot[]) {
    const it = cleanSeed[slot] != null ? db?.[String(cleanSeed[slot])] : undefined;
    if (isBlockingItem(it)) {
      delete cleanSeed[slot];
      if (it && !suits.some((s) => s.item.id === it.id)) suits.push({ slot, item: it });
    }
  }

  let best = optimizeContextInner(db, plain, cfg, ctx, oc, cleanSeed);
  for (const { slot, item } of suits) {
    if (slot === 'main' && cfg.lockedMain != null) continue;
    if (slot === 'sub' && cfg.lockedSub != null) continue;
    const hides = blockedSlotsOf(item);
    if ((hides.includes('main') && cfg.lockedMain != null) || (hides.includes('sub') && cfg.lockedSub != null)) continue;
    if ((cfg.inventory?.[item.id] ?? 0) <= 0) continue;
    const withSuit: GearSet = { ...best.gear, [slot]: item.id };
    for (const h of hides) delete withSuit[h];
    const r = optimizeContextInner(db, plain, cfg, ctx, oc, withSuit, slot);
    if (r.evaluation.score > best.evaluation.score) best = r;
  }
  return best;
}

/** Greedy per-slot coordinate ascent. `forcedSlot` is never re-evaluated (holds a suit under test). */
function optimizeContextInner(
  db: GearDB,
  cands: Candidates,
  cfg: OptimizerConfig,
  ctx: PlayerContext,
  oc: OptimizeContext,
  seed?: GearSet,
  forcedSlot?: Slot,
): { gear: GearSet; evaluation: SetEvaluation } {
  const traits = jobTraits(cfg.mainJob, cfg.subJob);
  const set: GearSet = { ...(seed ?? {}) };
  const isDamageCtx = oc.kind === 'tp' || oc.kind === 'ws' || oc.kind === 'hybrid' || oc.kind === 'th';

  // --- weapons ---
  if (cfg.lockedMain != null && db?.[String(cfg.lockedMain)]) set.main = cfg.lockedMain;
  if (cfg.lockedSub != null && db?.[String(cfg.lockedSub)]) set.sub = cfg.lockedSub;

  const mainCands = cfg.lockedMain != null ? [] : isDamageCtx ? pickWeaponCandidates(cands, oc, cfg.primaryWs) : (cands.main ?? []);
  const evalNow = () => scoreSet(set, db, ctx, oc, cfg.primaryWs);

  if (set.main == null && mainCands.length > 0 && forcedSlot !== 'main') set.main = mainCands[0]?.id;
  {
    // a seeded off-hand may be illegal for this main (shield under a two-hander, weapon without dual wield)
    const main = set.main != null ? db?.[String(set.main)] : undefined;
    const sub = set.sub != null ? db?.[String(set.sub)] : undefined;
    if (sub && cfg.lockedSub == null && (isH2H(main) || !subAllowed(main, sub, traits))) delete set.sub;
  }
  let best = evalNow();

  /** Remove anything sitting in a slot hidden by the piece just equipped (e.g. full-body suits cover head/hands/legs/feet). */
  const clearBlocked = () => {
    const blocked = blockedSlots(set, db);
    for (const s of Object.keys(blocked) as Slot[]) {
      if (s === 'main' && cfg.lockedMain != null) continue;
      if (s === 'sub' && cfg.lockedSub != null) continue;
      if (s === forcedSlot) continue;
      delete set[s];
    }
  };

  const trySlot = (slot: Slot, list: GearItem[], allowEmpty: boolean) => {
    // slot hidden by another equipped piece: must stay empty
    if (blockedSlots(set, db)[slot]) {
      delete set[slot];
      best = evalNow();
      return;
    }
    const current = set[slot];
    let bestId: number | undefined = current;
    let bestScore = best.score;
    let bestEval = best;
    if (allowEmpty) {
      delete set[slot];
      const e = evalNow();
      if (e.score > bestScore) { bestScore = e.score; bestId = undefined; bestEval = e; }
    }
    for (const item of list ?? []) {
      if (item?.id == null || item.id === current) continue;
      if (!usesAvailable(set, item.id, slot, cfg.inventory)) continue;
      if (slot === 'sub') {
        const main = set.main != null ? db?.[String(set.main)] : undefined;
        if (!subAllowed(main, item, traits)) continue;
      }
      // a piece that hides other slots may not be worn if one of those slots is locked
      const hides = blockedSlotsOf(item);
      if (hides.length && ((hides.includes('main') && cfg.lockedMain != null) || (hides.includes('sub') && cfg.lockedSub != null))) continue;
      set[slot] = item.id;
      const e = evalNow();
      if (e.score > bestScore) { bestScore = e.score; bestId = item.id; bestEval = e; }
    }
    if (bestId == null) delete set[slot]; else set[slot] = bestId;
    if (bestId != null && blockedSlotsOf(db?.[String(bestId)]).length) clearBlocked();
    // re-evaluate current (in case list empty / restored)
    if (bestId === current) {
      best = evalNow();
    } else {
      best = bestEval;
    }
  };

  const slotOrder: Slot[] = ['main', 'sub', 'range', 'ammo', ...NON_WEAPON_SLOTS];
  for (let pass = 0; pass < 6; pass++) {
    const before = JSON.stringify(set);
    for (const slot of slotOrder) {
      if (slot === forcedSlot) continue;
      if (slot === 'main') {
        if (cfg.lockedMain != null) continue;
        trySlot('main', mainCands, false);
        // sub may be invalid after main swap
        const main = set.main != null ? db?.[String(set.main)] : undefined;
        const sub = set.sub != null ? db?.[String(set.sub)] : undefined;
        if (sub && !subAllowed(main, sub, traits) && cfg.lockedSub == null) delete set.sub;
        if (isH2H(main)) delete set.sub;
        continue;
      }
      if (slot === 'sub') {
        if (cfg.lockedSub != null) continue;
        const main = set.main != null ? db?.[String(set.main)] : undefined;
        if (isH2H(main)) { delete set.sub; best = evalNow(); continue; }
        trySlot('sub', cands.sub ?? [], true);
        continue;
      }
      if (slot === 'range') {
        const list = (cands.range ?? []).filter((i: GearItem) => {
          if (oc.kind === 'ws') return true;
          return true;
        });
        trySlot('range', list, true);
        continue;
      }
      trySlot(slot, cands[slot] ?? [], true);
    }
    clearBlocked();
    best = evalNow();
    if (JSON.stringify(set) === before) break;
  }
  return { gear: set, evaluation: best };
}

/** Hybrid: start from TP set, swap in DT pieces with least DPS loss until threshold reached. */
export function optimizeHybrid(db: GearDB, cands: Candidates, cfg: OptimizerConfig, ctx: PlayerContext, tpSet: GearSet, wsRefDamage?: number): { gear: GearSet; evaluation: SetEvaluation } {
  const oc: OptimizeContext = { kind: 'hybrid', dtThreshold: cfg.dtThreshold, wsRefDamage };
  const threshold = -(cfg.dtThreshold ?? 30);
  const set: GearSet = { ...(tpSet ?? {}) };
  const dpsOf = (s: GearSet) => scoreSet(s, db, ctx, { kind: 'tp', wsRefDamage }, cfg.primaryWs).summary?.dps ?? 0;
  const dtOf = (s: GearSet) => evaluateDefense(aggregate(s, db, ctx)).dt;

  let guard = 0;
  while (dtOf(set) > threshold && guard++ < 40) {
    let bestMove: { slot: Slot; id: number; ratio: number } | null = null;
    const curDps = dpsOf(set);
    const curDt = dtOf(set);
    for (const slot of NON_WEAPON_SLOTS) {
      for (const item of cands[slot] ?? []) {
        if (item?.id == null || item.id === set[slot]) continue;
        if (isBlockingItem(item)) continue; // suits are judged as whole sets in the polish step
        const itemDt = ((item.stats?.dmg ?? 0) + Math.min(item.stats?.dmgphys ?? 0, item.stats?.dmgmagic ?? 0) * 0) / 100;
        if (itemDt >= 0) continue;
        if (!usesAvailable(set, item.id, slot, cfg.inventory)) continue;
        if (blockedSlots(set, db)[slot]) continue;
        const trial: GearSet = { ...set, [slot]: item.id };
        const dtGain = curDt - dtOf(trial);
        if (dtGain <= 0) continue;
        const dpsLoss = Math.max(0.01, curDps - dpsOf(trial));
        const ratio = dtGain / dpsLoss;
        if (!bestMove || ratio > bestMove.ratio) bestMove = { slot, id: item.id, ratio };
      }
    }
    if (!bestMove) break;
    set[bestMove.slot] = bestMove.id;
  }
  // polish: re-run greedy with hybrid scoring from this seed
  const polished = optimizeContext(db, cands, { ...cfg, lockedMain: set.main ?? cfg.lockedMain, lockedSub: set.sub ?? cfg.lockedSub }, ctx, oc, set);
  return polished;
}


/** True when no item id is used more often than the player owns it. */
function withinInventory(set: GearSet, inventory: Inventory): boolean {
  const used = new Map<number, number>();
  for (const s of Object.keys(set ?? {}) as Slot[]) {
    const id = set[s];
    if (id == null) continue;
    used.set(id, (used.get(id) ?? 0) + 1);
  }
  for (const [id, n] of used) if (n > (inventory?.[id] ?? 0)) return false;
  return true;
}

/**
 * Pairwise-swap refinement. Per-slot coordinate ascent (optimizeContext) stops at a local optimum whenever two
 * slots only pay off together (e.g. a piece that lifts STR past a WS-modifier breakpoint plus an accuracy piece
 * elsewhere that keeps the hit rate at its cap). Every pair of non-weapon slots is re-searched jointly over a
 * short list of promising items per slot, until no pair improves the score. Weapons and suits are left alone.
 * On full-inventory tests (SAM Tachi: Fudo, WAR Upheaval) the greedy WS set was 6% below the pair-swap result.
 */
export function refineSet(
  db: GearDB,
  cands: Candidates,
  cfg: OptimizerConfig,
  ctx: PlayerContext,
  oc: OptimizeContext,
  start: { gear: GearSet; evaluation: SetEvaluation },
  topK = 15,
  maxPasses = 5,
): { gear: GearSet; evaluation: SetEvaluation } {
  const evalOf = (g: GearSet) => scoreSet(g, db, ctx, oc, cfg.primaryWs);
  let gear: GearSet = { ...start.gear };
  let evaluation = start.evaluation;
  const slots = SLOTS.filter((s: Slot) => s !== 'main' && s !== 'sub');

  for (let pass = 0; pass < maxPasses; pass++) {
    const blocked = blockedSlots(gear, db);
    const open = slots.filter((s: Slot) => !blocked[s]);
    // shortlist: current item, empty, and the topK items by single-swap score
    const short = new Map<Slot, (GearItem | undefined)[]>();
    for (const slot of open) {
      const scored: { item: GearItem; score: number }[] = [];
      for (const item of cands[slot] ?? []) {
        if (item?.id == null || isBlockingItem(item)) continue;
        const trial: GearSet = { ...gear, [slot]: item.id };
        if (!withinInventory(trial, cfg.inventory)) continue;
        scored.push({ item, score: evalOf(trial).score });
      }
      scored.sort((a, b) => b.score - a.score);
      const list: (GearItem | undefined)[] = scored.slice(0, topK).map((x) => x.item);
      const cur = gear[slot] != null ? db?.[String(gear[slot])] : undefined;
      if (cur && !list.some((i) => i?.id === cur.id)) list.push(cur);
      list.push(undefined);
      short.set(slot, list);
    }
    let improved = false;
    for (let i = 0; i < open.length; i++) {
      for (let j = i + 1; j < open.length; j++) {
        const si = open[i] as Slot;
        const sj = open[j] as Slot;
        for (const a of short.get(si) ?? []) {
          for (const b of short.get(sj) ?? []) {
            const trial: GearSet = { ...gear };
            if (a) trial[si] = a.id; else delete trial[si];
            if (b) trial[sj] = b.id; else delete trial[sj];
            if (trial[si] === gear[si] && trial[sj] === gear[sj]) continue;
            if (!withinInventory(trial, cfg.inventory)) continue;
            const e = evalOf(trial);
            if (e.score > evaluation.score + 1e-6) { gear = trial; evaluation = e; improved = true; }
          }
        }
      }
    }
    if (!improved) break;
  }
  return { gear, evaluation };
}

export type ProgressFn = (done: number, total: number, label: string) => void;

export function optimizeAll(db: GearDB, cfg: OptimizerConfig, onProgress?: ProgressFn): OptimizedSet[] {
  const cands = buildCandidates(db, cfg.inventory, cfg.mainJob);
  const results: OptimizedSet[] = [];
  const tiers: BuffTier[] = ['low', 'high'];
  const wsList = (cfg.wsNames ?? []).filter((n: string) => !!WS_BY_NAME[n]);
  const total = tiers.length * (6 + wsList.length + 1);
  let done = 0;
  const step = (label: string) => onProgress?.(++done, total, label);

  for (const tier of tiers) {
    const ctx: PlayerContext = { mainJob: cfg.mainJob, subJob: cfg.subJob, buffIds: tierBuffIds(cfg.buffIds, tier), target: cfg.target, unityRank: cfg.unityRank ?? 1, jobPoints: cfg.jobPoints, masterLevel: cfg.masterLevel };
    const push = (key: string, label: string, oc: OptimizeContext, r0: { gear: GearSet; evaluation: SetEvaluation }) => {
      const r = cfg.refine === false ? r0 : refineSet(db, cands, cfg, ctx, oc, r0);
      results.push({ key: `${key}:${tier}`, label, context: oc, tier, gear: r.gear, evaluation: r.evaluation });
    };

    // Two-stage TP/WS coupling, the way GearSwap actually plays: the weapon skill is fired from its own
    // set, so the TP set must not be judged on WS damage dealt in TP gear (that made WS-damage pieces
    // and high-D weapons win the TP set). Stage 1: a first-pass TP set fixes the main weapon. Stage 2:
    // the primary WS set is built with that weapon and yields the reference WS damage. Stage 3: the TP
    // set is rebuilt scoring white damage + time-to-1000 TP with the WS contributing that fixed damage.
    const primaryWs = cfg.primaryWs && WS_BY_NAME[cfg.primaryWs] ? cfg.primaryWs : null;
    // weapon skills are fired with the TP set's weapon(s) equipped (main, and the off-hand when dual wielding)
    const weaponLock = (tpGear: GearSet): OptimizerConfig => ({
      ...cfg,
      lockedMain: cfg.lockedMain ?? tpGear.main ?? null,
      lockedSub: cfg.lockedSub ?? (tpGear.sub != null && db?.[String(tpGear.sub)]?.type === 'weapon' ? tpGear.sub : null),
    });
    type TpResult = { tp: { gear: GearSet; evaluation: SetEvaluation }; wsRefDamage?: number; wsTp?: number };
    /** Build the coupled TP + reference-WS pair for one weapon choice (or free choice when `lockMain` is null). */
    const buildTp = (lockMain: number | null, seed?: GearSet): TpResult => {
      const baseCfg: OptimizerConfig = lockMain != null ? { ...cfg, lockedMain: lockMain } : cfg;
      let tp = optimizeContext(db, cands, baseCfg, ctx, { kind: 'tp' }, seed);
      let wsRefDamage: number | undefined;
      let wsTp: number | undefined;
      if (primaryWs) {
        // iterate until the TP set's weapons and the reference WS damage agree (usually 1-2 rounds)
        for (let round = 0; round < 3; round++) {
          const wsPass = optimizeContext(db, cands, weaponLock(tp.gear), ctx, { kind: 'ws', wsName: primaryWs, wsTp: tp.evaluation.summary?.tpAtWs ?? 1500 });
          if ((wsPass.evaluation.summary?.wsDamage ?? 0) <= 0) break;
          wsRefDamage = wsPass.evaluation.summary.wsDamage;
          const next = optimizeContext(db, cands, baseCfg, ctx, { kind: 'tp', wsRefDamage }, tp.gear);
          const sameWeapons = next.gear.main === tp.gear.main && next.gear.sub === tp.gear.sub;
          tp = next;
          wsTp = tp.evaluation.summary?.tpAtWs;
          if (sameWeapons) break;
        }
      }
      return { tp, wsRefDamage, wsTp };
    };

    // The main weapon decides both the TP rate and the WS damage, so it cannot be judged inside the greedy
    // slot loop with a WS reference taken from another weapon: every serious candidate gets its own
    // coupled TP + WS build and the weapon whose complete cycle deals the most damage wins.
    let chosen = buildTp(null);
    if (cfg.lockedMain == null && primaryWs) {
      const weaponCands = pickWeaponCandidates(cands, { kind: 'tp' }, primaryWs).filter((w: GearItem) => w.id !== chosen.tp.gear.main);
      // cheap pre-ranking: swap each weapon into the current TP set, keep the strongest few for a full build
      const ranked = weaponCands
        .map((w: GearItem) => ({ w, s: scoreSet({ ...chosen.tp.gear, main: w.id }, db, ctx, { kind: 'tp', wsRefDamage: chosen.wsRefDamage }, primaryWs).score }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 5);
      for (const { w } of ranked) {
        const alt = buildTp(w.id, { ...chosen.tp.gear, main: w.id });
        if (alt.tp.evaluation.score > chosen.tp.evaluation.score) chosen = alt;
      }
    }
    const { tp, wsRefDamage, wsTp } = chosen;
    push('tp', 'TP / Engaged', { kind: 'tp', wsRefDamage }, tp);
    step('TP set');

    const wsCfg = weaponLock(tp.gear);
    const tpMainSkill = tp.gear.main != null ? db?.[String(tp.gear.main)]?.weapon?.skill ?? '' : '';
    for (const ws of wsList) {
      const oc: OptimizeContext = { kind: 'ws', wsName: ws, wsTp };
      const def = WS_BY_NAME[ws];
      // a weapon skill of another weapon type (e.g. Upheaval while the TP weapon is a sword) is built with
      // its own best weapon instead of being impossible under the TP weapon lock
      const useTpWeapons = !def || RANGED_SKILLS.has(def.skill) || def.skill === tpMainSkill;
      const r = optimizeContext(db, cands, useTpWeapons ? wsCfg : cfg, ctx, oc);
      push(`ws:${ws}`, `WS: ${ws}`, oc, r);
      step(ws);
    }

    const hybrid = optimizeHybrid(db, cands, cfg, ctx, tp.gear, wsRefDamage);
    push('hybrid', `Hybrid (DT -${cfg.dtThreshold}%)`, { kind: 'hybrid', dtThreshold: cfg.dtThreshold, wsRefDamage }, hybrid);
    step('Hybrid');

    const magic = optimizeContext(db, cands, cfg, ctx, { kind: 'magic' });
    push('magic', 'Magic Nuke', { kind: 'magic' }, magic);
    step('Magic');

    const heal = optimizeContext(db, cands, cfg, ctx, { kind: 'healing' });
    push('healing', 'Healing', { kind: 'healing' }, heal);
    step('Healing');

    const idle = optimizeContext(db, cands, cfg, ctx, { kind: 'idle' });
    push('idle', 'Idle / DT', { kind: 'idle' }, idle);
    step('Idle');

    const fc = optimizeContext(db, cands, cfg, ctx, { kind: 'fastcast' });
    push('fastcast', 'Fast Cast', { kind: 'fastcast' }, fc);
    step('Fast Cast');

    const th = optimizeContext(db, cands, cfg, ctx, { kind: 'th', wsRefDamage });
    push('th', 'Treasure Hunter', { kind: 'th', wsRefDamage }, th);
    step('Treasure Hunter');
  }
  return results;
}

/** Evaluate an arbitrary (possibly hand-edited) set for display. */
export function evaluateSet(db: GearDB, cfg: OptimizerConfig, tier: BuffTier, oc: OptimizeContext, set: GearSet): SetEvaluation {
  const ctx: PlayerContext = { mainJob: cfg.mainJob, subJob: cfg.subJob, buffIds: tierBuffIds(cfg.buffIds, tier), target: cfg.target, unityRank: cfg.unityRank ?? 1, jobPoints: cfg.jobPoints, masterLevel: cfg.masterLevel };
  return scoreSet(set, db, ctx, oc, cfg.primaryWs);
}
