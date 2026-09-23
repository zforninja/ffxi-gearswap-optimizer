# GearExport

A small [Windower 4](https://www.windower.net/) addon for Final Fantasy XI that
exports every piece of equipment you own — across all accessible bags — to a
JSON file, together with your current jobs. The file is meant to be imported
into the GearSwap gear-set optimizer web app.

GearExport **only reads**. It never moves, equips, drops or sorts anything.

## Installation

1. Copy the `GearExport` folder into your Windower addons directory:

   ```
   <Windower>/addons/GearExport/
       GearExport.lua
       README.md
       data/            (created automatically on first export)
   ```

2. In game, load the addon:

   ```
   //lua load gearexport
   ```

3. (Optional) To load it automatically, add this line to
   `<Windower>/scripts/init.txt`:

   ```
   lua load gearexport
   ```

## Usage

| Command | What it does |
|---|---|
| `//gearexport` or `//ge` | Scan all accessible bags and write `data/<CharName>.json` |
| `//ge help` | Show the command list |

After a successful run you will see something like:

```
GearExport: Exported 312 equipment items for Nekomata (WAR/SAM)
GearExport: Scanned 12 bag(s). File: .../addons/GearExport/data/Nekomata.json
```

Then upload `data/<CharName>.json` to the optimizer.

If a Unity Ranking item comes back with no augment data (see "Stale Unity items"
below), you'll instead see something like:

```
GearExport: 1 Unity item(s) had no augment data this session (stale cache), their bonus exported as zero: Grounded Mantle (Wardrobe 7 slot 34). Open each bag in your in-game Items menu once, then //ge again.
GearExport: Exported 312 equipment items for Nekomata (WAR/SAM)
GearExport: Scanned 12 bag(s). File: .../addons/GearExport/data/Nekomata.json
```

The file is still written and still usable - just re-export after opening the
named bag(s) once, so that item's Unity bonus isn't optimized as zero.

### Bags scanned

| Bag id | Bag | Readable |
|---|---|---|
| 0 | Inventory | always |
| 8, 10–16 | Wardrobe 1–8 | anywhere |
| 5 | Satchel | anywhere |
| 6 | Sack | anywhere |
| 7 | Case | anywhere |
| 1 | Safe | **Mog House only** |
| 9 | Safe 2 | **Mog House only** |
| 4 | Locker | **Mog House only** |

Run the export from inside your Mog House if you want Safe / Safe 2 / Locker
gear included. Bags that are not accessible at the moment are skipped
silently; a bag that *should* be readable but fails produces a warning in chat
and the rest of the export continues.

Only equippable items are exported (anything with an equip-slot mask, or a
`Weapon` / `Armor` category in Windower's resources). Consumables, crystals,
currency and furniture are ignored.

## Output format

`data/<CharName>.json`:

```json
{
  "character": {
    "name": "CharName",
    "mainJob": "WAR",
    "subJob": "SAM",
    "mainJobLevel": 99,
    "subJobLevel": 49,
    "mainJobId": 1,
    "subJobId": 12
  },
  "exportDate": "2026-09-20T12:00:00",
  "addonVersion": "1.3.0",
  "bags": [
    { "name": "Inventory", "bagId": 0, "max": 80, "itemCount": 54, "equipmentCount": 21 }
  ],
  "items": [
    {
      "id": 21621,
      "name": "Naegling",
      "bag": "Wardrobe",
      "bagId": 8,
      "slotIndex": 1,
      "equipped": true,
      "jobs": 2209777,
      "slots": 3,
      "level": 99,
      "iLevel": 119,
      "category": "Weapon",
      "augments": [],
      "stale": false
    },
    {
      "id": 26857,
      "name": "Herculean Helm",
      "bag": "Wardrobe 2",
      "bagId": 10,
      "slotIndex": 4,
      "equipped": false,
      "jobs": 4194303,
      "slots": 16,
      "level": 99,
      "iLevel": 119,
      "category": "Armor",
      "augments": ["Accuracy+25", "\"Triple Atk.\"+3", "STR+8", "Weapon skill damage +4%"],
      "stale": false
    }
  ]
}
```

Field notes:

- `id` — retail item id; identical to the ids in the LandSandBoat-derived gear database.
- `jobs` — job bitmask, bit `(jobId - 1)`; WAR = bit 0 (1), SAM = bit 11 (2048).
- `slots` — equip-slot bitmask: Main=1, Sub=2, Ranged=4, Ammo=8, Head=16, Body=32,
  Hands=64, Legs=128, Feet=256, Neck=512, Waist=1024, Ear=2048/4096, Ring=8192/16384, Back=32768.
- `equipped` — `true` when the game reports the item's status as *equipped*.
- `slotIndex` — 1-based index inside the bag (shifts whenever items move; re-export after sorting).
- `mainJobId` / `subJobId` — 1 = WAR … 22 = RUN, 0 = none.
- `augments` — augment strings decoded with Windower's bundled `extdata` library
  (Herculean/Odyssey/Ambuscade/Reisenjima gear, JSE capes, Path/Rank for Odyssey gear).
  Empty for un-augmented items. The optimizer parses these strings and adds them to
  the item's base stats, so two copies of the same item with different augments are
  treated as different pieces.
- Items in a Wardrobe with no entry in your Windower `resources` build are still
  exported, with `name` = `Unknown (<id>)` and `category` = `Unknown`. Update
  Windower resources if you see these.
- `stale` — `true` when this item's extdata blob was present but every byte was
  zero: Windower's cache never actually received this slot's data this session
  (see "Stale Unity items" below). `false`, including for ordinary items with
  no extdata at all, is the normal case.

### Stale Unity items

Windower populates each item's `extdata` (the augment/Path/Rank blob) from
whatever the client has cached; GearExport only reads that cache, it never
requests fresh data from the server. On some servers a bag's items don't get
their full data pushed until you've opened that bag's tab in the in-game Items
menu at least once in the current session - wardrobes 3 and up are the usual
culprits, since most players rarely open them. When that happens the item's
extdata comes back as 50 zero bytes instead of real data. A genuinely
un-augmented item still carries a non-zero extdata header (creator/serial
bytes), so all-zero is a reliable "this wasn't actually synced" signal - and
since a real Unity Ranking item can never have a zero bonus, GearExport flags
any known Unity item (`res.items` matched against the gear database's own
Unity list) that comes back that way, both as a chat warning and as
`"stale": true` on that item in the JSON. **Fix:** open the named bag(s) in
your in-game Items menu once, then run `//ge` again.

## Unity NPC path augments

If a Unity item has an *optional* augment applied through the Unity NPC (not the always-on
`Unity Ranking: "Store TP"+4~8` line - that one's always captured), this addon may not be able to see it. See
`docs/UNITY_PATH_AUGMENTS.md` in the repo root for why, and run `//ge probe <bagId> <slot>` on that item to help
pin down whether your Windower build can resolve it.

## Compatibility notes

- Written for Windower 4's Lua 5.1: no bitwise operators (bitmask decoding uses
  `math.floor` / modulo), and every Windower API call is wrapped in `pcall`.
- The `enabled` flag returned by `get_bag_info` is known to lag for Wardrobes
  5–8; any bag reporting `count > 0` is treated as available regardless.
- Item names are read as `en`, falling back to `english` / `name`, so older
  resources builds still work.

## Development / tests

The `test/` folder contains a mock Windower environment and a Lua 5.1 test
suite that exercises the addon (bag scanning, equipped detection, unknown
items, unreadable bags, job-id fallback, JSON structure). It is not needed in
game. Run it with Python + [lupa](https://pypi.org/project/lupa/):

```
pip install lupa
python test/run.py
```
