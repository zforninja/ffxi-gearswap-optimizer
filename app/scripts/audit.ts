/**
 * Model/data audit. Run:  npx tsx scripts/audit.ts [JOB] [WS name]
 * 1. alias stats that double count   2. WS/weapon data that is only an approximation
 * 3. greedy vs pair-swap search gap  4. DB stat keys the math never reads
 */
import fs from 'fs';
import path from 'path';
import { buildCandidates, optimizeContext, refineSet } from '../lib/ffxi/optimizer';
import { MOB_TIERS } from '../lib/ffxi/constants';
import type { GearDB, OptimizeContext } from '../lib/ffxi/types';

const db: GearDB = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/gear_database.json'), 'utf8'));
const job = process.argv[2] ?? 'SAM';
const ws = process.argv[3] ?? 'Tachi: Fudo';

const dup = Object.values(db).filter((g) => g.stats?.allWsdmgAllHits && g.stats?.allWsdmgFirstHit);
console.log(`[1] items with WSD counted under both allWsdmgAllHits and allWsdmgFirstHit: ${dup.length}`);

const firstOnly = Object.values(db).filter((g) => g.stats?.allWsdmgFirstHit && !g.stats?.allWsdmgAllHits);
console.log(`[1b] items whose WSD is first-hit only (multi-hit WS get no benefit on hits 2+): ${firstOnly.length}  <- verify against retail`);

const src = fs.readFileSync(path.join(__dirname, '../lib/ffxi/math.ts'), 'utf8');
const read = new Set([...src.matchAll(/g\(agg,\s*'(\w+)'\)/g)].map((m) => m[1]));
const KEYS = ['anyFtpBonus', 'dayFtpBonus', 'addsWeaponskill', 'aftermath', 'damageLimitp', 'dmgphysIi', 'dmgmagicIi', 'tripleAttackDmg', 'doubleAttackDmg', 'delayp', 'regain', 'skillchaindmg'];
const unread = KEYS.filter((k) => !read.has(k)).map((k) => `${k} (${Object.values(db).filter((g) => (g.stats ?? {})[k]).length} items)`);
console.log(`[4] present in DB, never read by math.ts: ${unread.join(', ')}`);

const inv: Record<number, number> = {};
for (const [id, it] of Object.entries(db)) if ((it.jobs ?? []).includes(job) && ((it.iLevel ?? 0) >= 119 || (it.level ?? 0) >= 99)) inv[Number(id)] = 1;
const cfg: any = { mainJob: job, subJob: 'WAR', inventory: inv, buffIds: ['haste2', 'food_sushi', 'minuet5', 'geo_fury'], target: MOB_TIERS.hard, wsNames: [ws], primaryWs: ws, dtThreshold: 35, unityRank: 6, lockedMain: null, lockedSub: null };
const ctx: any = { mainJob: job, subJob: 'WAR', buffIds: cfg.buffIds, target: cfg.target, unityRank: 6 };
const cands = buildCandidates(db, inv, job);
const oc: OptimizeContext = { kind: 'ws', wsName: ws, wsTp: 1500 };
const greedy = optimizeContext(db, cands, cfg, ctx, oc);
const refined = refineSet(db, cands, cfg, ctx, oc, greedy);
console.log(`[3] ${job} ${ws}: greedy ${Math.round(greedy.evaluation.score)} -> pair-swap ${Math.round(refined.evaluation.score)} (+${((refined.evaluation.score / greedy.evaluation.score - 1) * 100).toFixed(1)}%)`);
