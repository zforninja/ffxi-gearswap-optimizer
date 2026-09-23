# Unity NPC path augments (not the always-on Unity Ranking line)

**Clarification that prompted this doc:** the always-on `Unity Ranking: "Store TP"+4~8` line printed on every
Unity item is a different thing from what's covered here. That line is already modeled (`unity` field on the
gear DB item, scaled by `unityRank` in `types.ts` - still a placeholder curve, see `docs/MODEL_AUDIT.md` #6).

This doc is about the **separate, optional augments a player chooses and ranks up through the Unity NPC**
(Tatenashi Gote +1's Path A: `Accuracy+40 All Attr.+10 "Triple Attack"+4%` at rank 15, in this example) - real,
additional stats on top of the base item and the Ranking line, that the optimizer had no way to see at all.

## What's actually happening (confirmed, not guessed)

This class of augment - Unity NPC path augments, Dynamis-D, Su5, and newer JSE necks - is what the community
calls "Augment System 4". Two independent sources confirm the standard Windower `extdata` library (used by both
`GearExport` and every other plain-Lua inventory addon, including invdump) **cannot decode these to text at
all**, on any Windower build:
- Windower/Issues#1032 on GitHub ("Extdata.decode doesnt work for new JSE necks... I assume this is also the
  case for the augmented rema weapons")
- ffxiah.com forum thread "JSE neck augments cant be decoded by Extdata.decod[e]"

At best, `extdata.decode()` returns the `Path: A` / `Rank: 15` markers - never the stat line itself. That's not
a parsing bug in anything built here; there was never a string to parse.

## What I could and couldn't verify

- **Verified:** the limitation above, from two independent sources.
- **Not verified:** a third-party addon (BalladOfWorms/OmniWatch on GitHub) claims that on newer Windower
  builds, `windower.ffxi.get_item_augments()` asks the client itself to resolve these to the exact lines the
  in-game item window shows. I could not find this function in Windower's own published function list (the
  `Windower/Lua` wiki's FFXI Functions page), only in that addon's README. I don't know if it exists on your
  Windower build, what arguments it takes, or what shape it returns - so I have not hard-coded a guess about it
  and called it fixed.

## What I built

- **`GearExport.lua` (v1.3.0):** if `windower.ffxi.get_item_augments` exists, tries calling it (both `(item_id)`
  and `(item)`, whichever doesn't error) and pulls any string values out of whatever it returns, merging them
  into the item's augment list the same way a normal random augment would be. Falls back to the existing
  `Path: A` / `Rank: 15` markers only when that didn't resolve anything, so you don't get a stale "stats are
  approximate" warning on an item that actually did resolve.
- **`//ge probe <bagId> <slot>`:** a new diagnostic command. Point it at an item with a real Path/Rank augment
  applied (e.g. your Tatenashi Gote +1) and it writes everything the addon can see about that one item - raw
  extdata hex, what `extdata.decode()` returns, and what `get_item_augments()` returns (or that it doesn't
  exist) - to `data/probe.txt` and prints it to chat. Writes nothing to your actual export.
- **`app/lib/ffxi/augments.ts`:** added a rule for `All Attr.+N` (applies to all 7 base stats at once) - the one
  parsing gap this specific example (`Accuracy+40 All Attr.+10 "Triple Attack"+4%`) would have hit even if the
  text does come through.

## What I need from you

Run `//ge probe <bagId> <slot>` on Tatenashi Gote +1 (or any item with a Unity Path augment applied) and paste
back `data/probe.txt`. Two outcomes:
1. `get_item_augments` doesn't exist, or returns nothing useful → confirmed dead end via the native API; the
   only way to get real numbers is a hand-built per-item table (item + path + rank -> stats), sourced from
   BG-Wiki's own per-item Augment Path tables (exactly the table in your screenshot). That's a lot of manual
   population - I'd want to know which jobs'/items' Unity gear you actually use before spending scraping effort
   on all ~100 eligible items.
2. `get_item_augments` returns something real → I use your probe.txt to nail the exact shape, tighten
   `strings_from()`/`try_native_augments()` to that shape precisely instead of the current best-effort scan, and
   the fix is close to done for every Unity/Dynamis-D/Su5/JSE-neck item at once.

Until then, an item with a Path/Rank augment your client can't resolve imports honestly: the optimizer values it
at its base stats plus the always-on Ranking line, with a warning that a chosen Path/Rank bonus exists and isn't
counted - not silently wrong, but not the full picture either.

## Implemented: table-based resolution (v1.3)

Outcome 1 is now covered without waiting on the probe. `data_pipeline/build_augment_paths.py` builds
`app/lib/ffxi/augment-paths.json` (240 items, keyed by gear-database item id) from:

- `data_pipeline/augments_db.json` — Unity NPC "+1" (Odyssey-material) augments scraped by `exportgear.py` (109 items, max Rank 15);
- BG-Wiki `Category:JSE Necks` — every Dynamis-D job neck, NQ / +1 / +2 (max Rank 15 / 20 / 25);
- BG-Wiki `Dynamis Divergence Weapon Augments` — Route A / B / C for NQ / +1 / +2 weapons (max Rank 15 / 20 / 25, +2 DMG cell included).

At import, `resolvePathAugments()` in `app/lib/ffxi/augments.ts` turns `Path: X` + `Rank: N` into the table's
max-rank lines, scaled linearly by `N / maxRank` (rounded). Items with a single known path (Unity +1 pieces,
JSE necks) resolve whatever letter extdata reports. The synthesized lines are stored on the virtual item as
`resolvedAugments` (the original extdata strings stay in `augments`, so the Lua export is unchanged) and are
counted in its stats; the import toast reports how many Path/Rank pieces resolved and how many are still
missing from the table. Saved imports are re-derived from the table on every load, so older imports pick up
the numbers without re-importing.

The parser also learned the compound forms BG-Wiki uses (`Accuracy & Magic Accuracy +45`, `STR/DEX +10`,
`All Base Stats +10`, `Physical Damage Limit +8%`, `Kick Attacks +20`, `Daken`, `Magic Burst ACC`, `DMG:+33`)
and ignores `Pet:` / `Avatar:` / `Wyvern:` / `Automaton:` lines. Route A/B "Chance of double damage" and
"follow-up attack" on Dynamis-D weapons are still not modeled (no stat key); their DMG:+N and Store TP /
Subtle Blow II lines are.

If the `//ge probe` output shows `get_item_augments` returning real text, that path takes precedence in the
addon and the table remains the fallback for clients where it does not.
