import giftsJson from './job-gifts.json';

/** [total job points spent, engine stat key, value, gift name] — cumulative gifts per job (BG-Wiki Job Points). */
export type JobGift = [number, string, number, string];

const GIFTS = giftsJson as unknown as Record<string, JobGift[]>;

export const MAX_JOB_POINTS = 2100;
export const MAX_MASTER_LEVEL = 50;
/** Level 99 A+ combat skill (424) plus 16 skill merits; each Master Level adds +1 to every skill cap. */
export const BASE_SKILL_99 = 440;

export const clampJobPoints = (v: number) => Math.min(MAX_JOB_POINTS, Math.max(0, Math.round(Number.isFinite(v) ? v : 0)));
export const clampMasterLevel = (v: number) => Math.min(MAX_MASTER_LEVEL, Math.max(0, Math.round(Number.isFinite(v) ? v : 0)));

/** All stat-affecting gifts a job has unlocked with `jobPoints` total job points spent. */
export function unlockedGifts(job: string, jobPoints: number): JobGift[] {
  const list = GIFTS[job] ?? [];
  const jp = clampJobPoints(jobPoints ?? 0);
  return list.filter((g) => g[0] <= jp);
}

/** Sum of gift bonuses keyed by engine stat (ATT, ACC, doubleAttack, storetp, ...). */
export function jobPointBonuses(job: string, jobPoints: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [, key, value] of unlockedGifts(job, jobPoints)) out[key] = (out[key] ?? 0) + value;
  return out;
}

/** Master Levels: +1 to every base attribute per level (skill caps are handled by `combatSkill`). */
export function masterLevelBonuses(masterLevel: number): Record<string, number> {
  const ml = clampMasterLevel(masterLevel ?? 0);
  if (ml <= 0) return {};
  return { STR: ml, DEX: ml, VIT: ml, AGI: ml, INT: ml, MND: ml, CHR: ml, HP: ml * 7, MP: ml * 2 };
}

/** Effective weapon-skill level used for accuracy/attack (A+ skill, merited, plus master levels). */
export function combatSkill(masterLevel: number | undefined): number {
  return BASE_SKILL_99 + clampMasterLevel(masterLevel ?? MAX_MASTER_LEVEL);
}

/** Total job points needed for the next gift (or null when everything is unlocked). */
export function nextGift(job: string, jobPoints: number): JobGift | null {
  const list = GIFTS[job] ?? [];
  const jp = clampJobPoints(jobPoints ?? 0);
  return list.find((g) => g[0] > jp) ?? null;
}
