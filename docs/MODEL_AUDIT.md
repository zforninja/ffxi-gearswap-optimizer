# Model & data audit (what is verified vs. what still needs ground truth)

Run `cd app && npx tsx scripts/audit.ts <JOB> "<WS>"` to reproduce the numbers below.

## Fixed in this change (verified by running it)
- **Search stuck in local optima.** Per-slot greedy left ~6% WS damage on the table on full inventories
  (SAM Tachi: Fudo 11878 -> 12720, WAR Upheaval 23979 -> 25530). `refineSet()` re-searches slot pairs jointly and is
  now applied to every result in `optimizeAll` (`cfg.refine = false` disables it).
- **WSD counted twice.** 21 items (Thrud, Ishvara, Ratri set, Karieyh, Epaminondas...) had WSD in both
  `allWsdmgAllHits` (LSB) and `allWsdmgFirstHit` (description parser). Fixed in the pipeline (`ALIAS_GROUPS`) and in the shipped JSON.
- **Augments silently dropped.** `Path:`/`Rank:` strings, `DMG:+N`/`Delay:-N` weapon augments and `"Magic Def. Bonus"` were
  ignored without any signal. Weapon DMG/Delay now apply; unparsed strings and path/rank pieces are recorded on the item and the import shows a warning.
- **Unity rank curve** is now one table (`UNITY_RANK_FRACTION`) instead of an inline formula.

## Needs ground truth (I could not verify these offline - do not trust either the code or my memory)
1. Weapon skill table (`constants.ts`) is labelled "community approximations". Regenerate from LSB `scripts/actions/weaponskills/*.lua`
   (numHits, fTP, WSC mods, replicating fTP, crit, accuracy/attack modifiers).
2. `allWsdmgFirstHit`-only items (164) and augment WSD (`weaponskilldamage` -> first hit): confirm whether retail applies WSD to all hits.
3. Double/Triple/Quad Attack are added to WS hit counts (`evaluateWeaponskill`). Confirm this is retail behaviour.
4. Dual Wield delay reduction is multiplied with haste (`evaluateMelee`); confirm whether retail adds it under the 80% cap.
5. Stats present in the DB but never read by the math: Fotia (`anyFtpBonus`, `dayFtpBonus`), `addsWeaponskill`, `aftermath`,
   `damageLimitp`, `dmgphysIi`/`dmgmagicIi`, `tripleAttackDmg`/`doubleAttackDmg`, `regain`, per-WS `wsdmg*` keys.
6. Unity Ranking: per-rank values are still a placeholder (linear between the two printed numbers). This *is* the community's
   own uncertainty, not just mine - even long-running FFXI forum threads on this ask for a verified per-rank table and get
   none; most players just assume rank 1. LSB itself doesn't implement per-rank scaling as data (`item_mods.sql` has a fixed
   value, and `getUnityRank()` is only used for the accolade-rate bonus in `roe.lua`), so there's no server-side ground truth
   to check against either. See docs/STALE_EXTDATA_IMPORT.md for a separate, confirmed bug in getting Unity data into the optimizer
   at all: it was often importing with zero bonus regardless of rank.
7. Path/Rank gear (Nyame, Sakpata's, Unity NPC path augments, ...): stats depend on the chosen path/rank; the DB
   has one row per item id. For Unity specifically this is worse than a missing lookup table - the standard
   Windower extdata library cannot decode these augments to text *at all*, confirmed via two independent
   sources. See docs/UNITY_PATH_AUGMENTS.md for what's confirmed, what's still unverified, and what's needed
   next.
8. Magic model uses a generic tier-V nuke (V=500, M=2.0); target DEF/EVA/MEVA tiers are guesses, not mob data.
9. Validation: add 5-10 real parses (set + buffs + target + observed average damage) as regression tests.
