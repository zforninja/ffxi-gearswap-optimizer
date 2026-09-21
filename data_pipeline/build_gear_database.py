#!/usr/bin/env python3
"""
Build a comprehensive FFXI gear database from the LandSandBoat server SQL dumps
and enum YAML files.

Outputs:
  /home/ubuntu/ffxi_data/gear_database.json  - keyed by itemId (string)
  /home/ubuntu/ffxi_data/metadata.json       - lookup tables + summary stats

Usage:
  python3 build_gear_database.py [--server /path/to/LandSandBoat/server] [--out /path/to/out_dir]
"""

import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict

import yaml

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SERVER_DIR_DEFAULT = "/home/ubuntu/ffxi_research/server"
OUT_DIR_DEFAULT = "/home/ubuntu/ffxi_data"

ITEM_TYPE_EQUIPMENT = 6
ITEM_TYPE_WEAPON = 7

FLAG_CANEQUIP = 0x0800
FLAG_EX = 0x4000
FLAG_RARE = 0x8000

# SLOTTYPE enum from src/map/entities/battle_entity.h (bit index -> name)
SLOT_NAMES = [
    "Main", "Sub", "Ranged", "Ammo", "Head", "Body", "Hands", "Legs",
    "Feet", "Neck", "Waist", "Ear1", "Ear2", "Ring1", "Ring2", "Back",
]

# PetModType from src/map/modifier.h (item_mods_pet.petType)
PET_TYPES = {
    0: "All", 1: "Avatar", 2: "Wyvern", 3: "Automaton", 4: "Harlequin",
    5: "Valoredge", 6: "Sharpshot", 7: "Stormwaker", 8: "Luopan",
}

# Base stats that should stay uppercase in the "stats" object
UPPERCASE_MODS = {
    "def", "hp", "mp", "str", "dex", "vit", "agi", "int", "mnd", "chr",
    "att", "ratt", "acc", "racc", "eva", "rdef", "matt", "mdef", "macc", "meva",
    "hpp", "mpp",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def snake_to_camel(name: str) -> str:
    """haste_gear -> hasteGear ; str -> str"""
    parts = name.split("_")
    return parts[0] + "".join(p[:1].upper() + p[1:] for p in parts[1:])


def mod_display_name(mod_name: str) -> str:
    """Convert an LSB mod enum name to the key used in the stats object."""
    if mod_name in UPPERCASE_MODS:
        return mod_name.upper()
    return snake_to_camel(mod_name)


def title_case_name(sortname: str) -> str:
    """sortname 'seers_tunic_+1' -> 'Seers Tunic +1'"""
    words = sortname.replace("_", " ").split()
    out = []
    for w in words:
        if w and w[0].isalpha():
            out.append(w[0].upper() + w[1:])
        else:
            out.append(w)
    return " ".join(out)


def enum_display_name(enum_name: str) -> str:
    """hand_to_hand -> 'Hand To Hand', great_sword -> 'Great Sword', slashing -> 'Slashing'"""
    return " ".join(w.capitalize() for w in enum_name.split("_"))


def load_enum(path: str) -> dict:
    """Load an LSB enum YAML file and return {id: name}."""
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    values = data["values"]
    out = {}
    for name, val in values.items():
        if isinstance(val, str):
            # Some enums may use hex strings or expressions; handle simple hex
            val = int(val, 0)
        out[int(val)] = str(name)
    return out


def load_enum_name_to_id(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return {str(k): int(v) for k, v in data["values"].items()}


# ---------------------------------------------------------------------------
# SQL parsing
# ---------------------------------------------------------------------------

INSERT_RE = re.compile(r"^INSERT INTO `(\w+)` VALUES \((.*)\);\s*(?:--\s*(.*))?$")
SET_RE = re.compile(r"^SET @(\w+)\s*=\s*(-?\d+)\s*;")
VAR_RE = re.compile(r"@(\w+)")


def split_sql_values(s: str) -> list:
    """Split a comma-separated SQL VALUES tuple body, respecting single-quoted strings."""
    fields = []
    cur = []
    in_str = False
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if in_str:
            if c == "\\" and i + 1 < n:
                cur.append(s[i + 1])
                i += 2
                continue
            if c == "'":
                # Escaped quote as ''
                if i + 1 < n and s[i + 1] == "'":
                    cur.append("'")
                    i += 2
                    continue
                in_str = False
                i += 1
                continue
            cur.append(c)
            i += 1
            continue
        if c == "'":
            in_str = True
            i += 1
            continue
        if c == ",":
            fields.append("".join(cur).strip())
            cur = []
            i += 1
            continue
        cur.append(c)
        i += 1
    fields.append("".join(cur).strip())
    return fields


def eval_int_expr(expr: str, variables: dict) -> int:
    """Evaluate an integer expression like '@FLAG_A | @FLAG_B' or '6' or 'NULL'."""
    expr = expr.strip()
    if expr.upper() == "NULL":
        return 0

    def repl(m):
        name = m.group(1)
        if name not in variables:
            raise KeyError(f"Unknown SQL session variable @{name}")
        return str(variables[name])

    expr = VAR_RE.sub(repl, expr)
    # Only allow digits, whitespace, and bitwise/arith operators
    if not re.fullmatch(r"[\d\s|&+\-()]+", expr):
        raise ValueError(f"Unsafe expression: {expr!r}")
    return int(eval(expr, {"__builtins__": {}}, {}))  # noqa: S307 - sanitized above


def iter_insert_rows(path: str, table: str):
    """
    Yield (fields, comment) for every INSERT row of `table` in the file.
    Also resolves SET @VAR = N; session variables encountered in the file.
    """
    variables = {}
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.rstrip("\n")
            if line.startswith("SET @"):
                m = SET_RE.match(line)
                if m:
                    variables[m.group(1)] = int(m.group(2))
                continue
            if not line.startswith("INSERT INTO"):
                continue
            # Split off trailing comment safely: find the ");" that ends the tuple.
            # Comments can contain ");" rarely, so locate the first ");" occurring
            # outside a quoted string.
            m = INSERT_RE.match(line)
            if not m:
                # fallback: try locating the tuple end manually
                start = line.find("VALUES (")
                if start < 0:
                    continue
                body_start = start + len("VALUES (")
                end = _find_tuple_end(line, body_start)
                if end < 0:
                    continue
                tbl = re.search(r"INSERT INTO `(\w+)`", line).group(1)
                body = line[body_start:end]
                comment = line[end + 2:].strip()
                comment = comment[2:].strip() if comment.startswith("--") else comment
            else:
                tbl, body, comment = m.group(1), m.group(2), m.group(3) or ""
                # If the regex was greedy over a ");" inside a comment, fix it up
                if body.count("(") != body.count(")") or ");" in body:
                    end = _find_tuple_end(line, line.find("VALUES (") + 8)
                    body_start = line.find("VALUES (") + 8
                    body = line[body_start:end]
                    comment = line[end + 2:].strip()
                    comment = comment[2:].strip() if comment.startswith("--") else comment
            if tbl != table:
                continue
            yield split_sql_values(body), comment, variables


def _find_tuple_end(line: str, start: int) -> int:
    """Return index of the ')' closing the VALUES tuple that starts at `start`."""
    in_str = False
    i = start
    n = len(line)
    while i < n:
        c = line[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == "'":
                if i + 1 < n and line[i + 1] == "'":
                    i += 2
                    continue
                in_str = False
        elif c == "'":
            in_str = True
        elif c == ")":
            return i
        i += 1
    return -1


# ---------------------------------------------------------------------------
# Table parsers
# ---------------------------------------------------------------------------


def parse_item_basic(path: str) -> dict:
    items = {}
    for fields, _comment, variables in iter_insert_rows(path, "item_basic"):
        # (itemid, subid, name, sortname, name_jp, type, stackSize, flags, aH, BaseSell)
        item_id = int(fields[0])
        items[item_id] = {
            "id": item_id,
            "subid": int(fields[1]),
            "name": fields[2],
            "sortname": fields[3],
            "name_jp": fields[4],
            "type": eval_int_expr(fields[5], variables),
            "stackSize": int(fields[6]),
            "flags": eval_int_expr(fields[7], variables),
            "aH": eval_int_expr(fields[8], variables),
            "baseSell": int(fields[9]),
        }
    return items


def parse_item_equipment(path: str) -> dict:
    rows = {}
    for fields, _c, _v in iter_insert_rows(path, "item_equipment"):
        # (itemId, name, level, ilevel, jobs, MId, shieldSize, scriptType, slot, rslot, rslotlook, su_level)
        item_id = int(fields[0])
        rows[item_id] = {
            "name": fields[1],
            "level": int(fields[2]),
            "ilevel": int(fields[3]),
            "jobs": int(fields[4]),
            "MId": int(fields[5]),
            "shieldSize": int(fields[6]),
            "scriptType": int(fields[7]),
            "slot": int(fields[8]),
            "rslot": int(fields[9]),
            "rslotlook": int(fields[10]),
            "su_level": int(fields[11]),
        }
    return rows


def parse_item_weapon(path: str) -> dict:
    rows = {}
    for fields, _c, _v in iter_insert_rows(path, "item_weapon"):
        # (itemId, name, skill, subskill, ilvl_skill, ilvl_parry, ilvl_macc, dmgType, hit, delay, dmg, unlock_points)
        item_id = int(fields[0])
        rows[item_id] = {
            "name": fields[1],
            "skill": int(fields[2]),
            "subskill": int(fields[3]),
            "ilvl_skill": int(fields[4]),
            "ilvl_parry": int(fields[5]),
            "ilvl_macc": int(fields[6]),
            "dmgType": int(fields[7]),
            "hit": int(fields[8]),
            "delay": int(fields[9]),
            "dmg": int(fields[10]),
            "unlock_points": int(fields[11]),
        }
    return rows


def parse_item_mods(path: str) -> dict:
    """Return {itemId: [(modId, value), ...]}"""
    rows = defaultdict(list)
    for fields, _c, _v in iter_insert_rows(path, "item_mods"):
        item_id, mod_id, value = int(fields[0]), int(fields[1]), int(fields[2])
        rows[item_id].append((mod_id, value))
    return rows


def parse_item_latents(path: str) -> dict:
    """Return {itemId: [(modId, value, latentId, latentParam), ...]}"""
    rows = defaultdict(list)
    for fields, _c, _v in iter_insert_rows(path, "item_latents"):
        rows[int(fields[0])].append(
            (int(fields[1]), int(fields[2]), int(fields[3]), int(fields[4]))
        )
    return rows


def parse_item_mods_pet(path: str) -> dict:
    """Return {itemId: [(modId, value, petType), ...]}"""
    rows = defaultdict(list)
    for fields, _c, _v in iter_insert_rows(path, "item_mods_pet"):
        rows[int(fields[0])].append((int(fields[1]), int(fields[2]), int(fields[3])))
    return rows


# ---------------------------------------------------------------------------
# Decoding
# ---------------------------------------------------------------------------


def decode_jobs(mask: int, job_by_id: dict) -> list:
    jobs = []
    for job_id in range(1, 23):  # WAR(1) .. RUN(22); MON(23) is not a real job
        if mask & (1 << (job_id - 1)):
            jobs.append(job_by_id[job_id].upper())
    return jobs


def decode_slots(mask: int) -> list:
    return [SLOT_NAMES[i] for i in range(16) if mask & (1 << i)]


def mods_to_stats(mod_rows, mod_names: dict, unknown_mods: Counter) -> dict:
    """[(modId, value)] -> {"STR": 5, "hasteGear": 375, ...}. Duplicate modIds are summed."""
    stats = {}
    for mod_id, value in mod_rows:
        name = mod_names.get(mod_id)
        if name is None:
            unknown_mods[mod_id] += 1
            key = f"mod_{mod_id}"
        else:
            key = mod_display_name(name)
        stats[key] = stats.get(key, 0) + value
    return stats


# ---------------------------------------------------------------------------
# Main build
# ---------------------------------------------------------------------------


def build(server_dir: str, out_dir: str) -> None:
    sql_dir = os.path.join(server_dir, "sql")
    enum_dir = os.path.join(server_dir, "data", "enums")

    # 1. Enums -------------------------------------------------------------
    print("[1/9] Loading enum YAML files ...")
    mod_names = load_enum(os.path.join(enum_dir, "mod.yaml"))
    job_by_id = load_enum(os.path.join(enum_dir, "job.yaml"))
    skill_by_id = load_enum(os.path.join(enum_dir, "skill_type.yaml"))
    latent_by_id = load_enum(os.path.join(enum_dir, "latent.yaml"))
    dmgtype_by_id = load_enum(os.path.join(enum_dir, "damage_type.yaml"))
    print(f"      mods={len(mod_names)} jobs={len(job_by_id)} skills={len(skill_by_id)} "
          f"latents={len(latent_by_id)} dmgTypes={len(dmgtype_by_id)}")

    # 2-7. SQL tables ------------------------------------------------------
    print("[2/9] Parsing item_basic.sql ...")
    basic = parse_item_basic(os.path.join(sql_dir, "item_basic.sql"))
    print(f"      {len(basic)} items")

    print("[3/9] Parsing item_equipment.sql ...")
    equipment = parse_item_equipment(os.path.join(sql_dir, "item_equipment.sql"))
    print(f"      {len(equipment)} rows")

    print("[4/9] Parsing item_weapon.sql ...")
    weapons = parse_item_weapon(os.path.join(sql_dir, "item_weapon.sql"))
    print(f"      {len(weapons)} rows")

    print("[5/9] Parsing item_mods.sql ...")
    mods = parse_item_mods(os.path.join(sql_dir, "item_mods.sql"))
    n_mod_rows = sum(len(v) for v in mods.values())
    print(f"      {n_mod_rows} rows across {len(mods)} items")

    print("[6/9] Parsing item_latents.sql ...")
    latents = parse_item_latents(os.path.join(sql_dir, "item_latents.sql"))
    n_latent_rows = sum(len(v) for v in latents.values())
    print(f"      {n_latent_rows} rows across {len(latents)} items")

    print("[7/9] Parsing item_mods_pet.sql ...")
    pet_mods = parse_item_mods_pet(os.path.join(sql_dir, "item_mods_pet.sql"))
    n_pet_rows = sum(len(v) for v in pet_mods.values())
    print(f"      {n_pet_rows} rows across {len(pet_mods)} items")

    # 8-9. Join + filter ----------------------------------------------------
    print("[8/9] Joining tables and filtering to slot > 0 ...")
    unknown_mods = Counter()
    unknown_latents = Counter()
    skipped_slot0 = 0
    skipped_no_basic = 0
    skipped_bad_type = 0
    type_mismatch = 0
    weapons_without_weapon_row = 0

    gear = {}
    for item_id in sorted(equipment):
        eq = equipment[item_id]
        if eq["slot"] <= 0:
            skipped_slot0 += 1
            continue
        b = basic.get(item_id)
        if b is None:
            skipped_no_basic += 1
            continue
        w = weapons.get(item_id)

        # Item type: prefer item_basic.type; fall back to presence of weapon row
        if b["type"] == ITEM_TYPE_WEAPON:
            item_type = "weapon"
        elif b["type"] == ITEM_TYPE_EQUIPMENT:
            item_type = "armor"
        else:
            skipped_bad_type += 1
            continue
        if item_type == "weapon" and w is None:
            weapons_without_weapon_row += 1
        if item_type == "armor" and w is not None:
            type_mismatch += 1

        weapon_obj = None
        if w is not None:
            skill_name = skill_by_id.get(w["skill"], f"skill_{w['skill']}")
            dmg_name = dmgtype_by_id.get(w["dmgType"], f"dmgType_{w['dmgType']}")
            weapon_obj = {
                "skill": enum_display_name(skill_name),
                "skillId": w["skill"],
                "subskill": w["subskill"],
                "damage": w["dmg"],
                "delay": w["delay"],
                "dmgType": enum_display_name(dmg_name),
                "dmgTypeId": w["dmgType"],
                "hitCount": w["hit"],
                "iLvlSkill": w["ilvl_skill"],
                "iLvlParry": w["ilvl_parry"],
                "iLvlMacc": w["ilvl_macc"],
                "unlockPoints": w["unlock_points"],
            }

        stats = mods_to_stats(mods.get(item_id, []), mod_names, unknown_mods)

        latent_list = []
        for mod_id, value, latent_id, latent_param in latents.get(item_id, []):
            cond = latent_by_id.get(latent_id)
            if cond is None:
                unknown_latents[latent_id] += 1
                cond = f"latent_{latent_id}"
            mname = mod_names.get(mod_id)
            if mname is None:
                unknown_mods[mod_id] += 1
                mkey = f"mod_{mod_id}"
            else:
                mkey = mod_display_name(mname)
            latent_list.append({
                "condition": cond,
                "conditionId": latent_id,
                "param": latent_param,
                "modName": mkey,
                "modId": mod_id,
                "value": value,
            })

        pet_stats = None
        pet_rows = pet_mods.get(item_id)
        if pet_rows:
            # Grouped by pet type so "All Pets" vs "Avatar"-only bonuses are distinguishable
            pet_stats = {}
            for mod_id, value, pet_type in pet_rows:
                pt_name = PET_TYPES.get(pet_type, f"petType_{pet_type}")
                mname = mod_names.get(mod_id)
                if mname is None:
                    unknown_mods[mod_id] += 1
                    mkey = f"mod_{mod_id}"
                else:
                    mkey = mod_display_name(mname)
                bucket = pet_stats.setdefault(pt_name, {})
                bucket[mkey] = bucket.get(mkey, 0) + value

        gear[str(item_id)] = {
            "id": item_id,
            "name": b["name"],
            "displayName": title_case_name(b["sortname"]),
            "nameJp": b["name_jp"],
            "type": item_type,
            "level": eq["level"],
            "iLevel": eq["ilevel"],
            "suLevel": eq["su_level"],
            "jobs": decode_jobs(eq["jobs"], job_by_id),
            "jobMask": eq["jobs"],
            "slots": decode_slots(eq["slot"]),
            "slotMask": eq["slot"],
            "rslotMask": eq["rslot"] | eq["rslotlook"],
            "shieldSize": eq["shieldSize"],
            "modelId": eq["MId"],
            "flags": {
                "rare": bool(b["flags"] & FLAG_RARE),
                "exclusive": bool(b["flags"] & FLAG_EX),
                "canEquip": bool(b["flags"] & FLAG_CANEQUIP),
                "raw": b["flags"],
            },
            "ahCategory": b["aH"],
            "baseSell": b["baseSell"],
            "weapon": weapon_obj,
            "stats": stats,
            "latents": latent_list,
            "petStats": pet_stats,
        }

    # 10. Summary statistics -----------------------------------------------
    n_total = len(gear)
    n_weapons = sum(1 for g in gear.values() if g["type"] == "weapon")
    n_armor = n_total - n_weapons
    n_with_stats = sum(1 for g in gear.values() if g["stats"])
    n_with_latents = sum(1 for g in gear.values() if g["latents"])
    n_with_pet = sum(1 for g in gear.values() if g["petStats"])
    n_ilvl = sum(1 for g in gear.values() if g["iLevel"] > 0)
    n_rare = sum(1 for g in gear.values() if g["flags"]["rare"])
    n_ex = sum(1 for g in gear.values() if g["flags"]["exclusive"])
    slot_counts = Counter()
    for g in gear.values():
        for s in g["slots"]:
            slot_counts[s] += 1
    job_counts = Counter()
    for g in gear.values():
        for j in g["jobs"]:
            job_counts[j] += 1
    mod_usage = Counter()
    for g in gear.values():
        for k in g["stats"]:
            mod_usage[k] += 1
    weapon_skill_counts = Counter(
        g["weapon"]["skill"] for g in gear.values() if g["weapon"] is not None
    )
    level_dist = Counter(g["level"] for g in gear.values())
    ilevel_dist = Counter(g["iLevel"] for g in gear.values() if g["iLevel"] > 0)

    summary = {
        "totalItems": n_total,
        "weapons": n_weapons,
        "armor": n_armor,
        "itemsWithStats": n_with_stats,
        "itemsWithoutStats": n_total - n_with_stats,
        "itemsWithLatents": n_with_latents,
        "itemsWithPetStats": n_with_pet,
        "itemLevelGear": n_ilvl,
        "rareItems": n_rare,
        "exclusiveItems": n_ex,
        "weaponsWithoutWeaponRow": weapons_without_weapon_row,
        "armorWithWeaponRow": type_mismatch,
        "skipped": {
            "slotZero": skipped_slot0,
            "noItemBasicRow": skipped_no_basic,
            "nonEquipmentType": skipped_bad_type,
        },
        "sourceRowCounts": {
            "item_basic": len(basic),
            "item_equipment": len(equipment),
            "item_weapon": len(weapons),
            "item_mods": n_mod_rows,
            "item_latents": n_latent_rows,
            "item_mods_pet": n_pet_rows,
        },
        "bySlot": dict(sorted(slot_counts.items(), key=lambda kv: SLOT_NAMES.index(kv[0]))),
        "byJob": dict(sorted(job_counts.items(), key=lambda kv: -kv[1])),
        "byWeaponSkill": dict(sorted(weapon_skill_counts.items(), key=lambda kv: -kv[1])),
        "topMods": dict(mod_usage.most_common(40)),
        "levelDistribution": {str(k): v for k, v in sorted(level_dist.items())},
        "itemLevelDistribution": {str(k): v for k, v in sorted(ilevel_dist.items())},
        "unknownModIds": dict(unknown_mods),
        "unknownLatentIds": dict(unknown_latents),
    }

    # Metadata -------------------------------------------------------------
    metadata = {
        "source": {
            "repo": "LandSandBoat/server",
            "path": server_dir,
            "files": [
                "sql/item_basic.sql", "sql/item_equipment.sql", "sql/item_weapon.sql",
                "sql/item_mods.sql", "sql/item_latents.sql", "sql/item_mods_pet.sql",
                "data/enums/mod.yaml", "data/enums/job.yaml", "data/enums/skill_type.yaml",
                "data/enums/latent.yaml", "data/enums/damage_type.yaml",
            ],
        },
        "jobs": [
            {"id": jid, "abbr": name.upper(), "bit": 1 << (jid - 1)}
            for jid, name in sorted(job_by_id.items()) if 1 <= jid <= 22
        ],
        "slots": [
            {"id": i, "name": SLOT_NAMES[i], "bit": 1 << i} for i in range(16)
        ],
        "weaponSkillTypes": [
            {"id": sid, "name": enum_display_name(name), "enumName": name}
            for sid, name in sorted(skill_by_id.items())
        ],
        "damageTypes": [
            {"id": did, "name": enum_display_name(name), "enumName": name}
            for did, name in sorted(dmgtype_by_id.items())
        ],
        "latentConditions": [
            {"id": lid, "name": name} for lid, name in sorted(latent_by_id.items())
        ],
        "petTypes": [{"id": k, "name": v} for k, v in sorted(PET_TYPES.items())],
        "itemFlags": {
            "canEquip": FLAG_CANEQUIP, "exclusive": FLAG_EX, "rare": FLAG_RARE,
        },
        "mods": {
            str(mid): {"enumName": name, "statKey": mod_display_name(name)}
            for mid, name in sorted(mod_names.items())
        },
        "statKeyToModId": {
            mod_display_name(name): mid for mid, name in sorted(mod_names.items())
        },
        "valueEncodingNotes": {
            "hasteGear": "1/100 of a percent (375 = 3.75%; 10000 = 100%)",
            "attp/defp": "percent",
            "regain": "x10 (30 = +3 TP/tick)",
            "curePotency": "percent",
            "dmg/dmgphys/dmgbreath/dmgmagic/dmgrange": "1/100 of a percent damage taken (-500 = -5%)",
            "delay(weapon)": "Hand-to-hand weapons store delay + 480",
            "equipmentOnlyRace": "race bitmask restriction (mod 276); 0/absent = all races",
        },
        "summary": summary,
    }

    # Write ----------------------------------------------------------------
    print("[9/9] Writing output files ...")
    os.makedirs(out_dir, exist_ok=True)
    gear_path = os.path.join(out_dir, "gear_database.json")
    meta_path = os.path.join(out_dir, "metadata.json")
    with open(gear_path, "w", encoding="utf-8") as f:
        json.dump(gear, f, ensure_ascii=False, separators=(",", ":"))
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    # Print summary --------------------------------------------------------
    print()
    print("=" * 64)
    print("FFXI GEAR DATABASE BUILD SUMMARY")
    print("=" * 64)
    print(f"Output:                  {gear_path} ({os.path.getsize(gear_path) / 1024 / 1024:.1f} MB)")
    print(f"Metadata:                {meta_path}")
    print(f"Total equipment items:   {n_total}")
    print(f"  Weapons:               {n_weapons}")
    print(f"  Armor:                 {n_armor}")
    print(f"Items with stats:        {n_with_stats}  (without: {n_total - n_with_stats})")
    print(f"Items with latents:      {n_with_latents}")
    print(f"Items with pet stats:    {n_with_pet}")
    print(f"Item-level (iLvl) gear:  {n_ilvl}")
    print(f"Rare / Ex items:         {n_rare} / {n_ex}")
    print(f"Skipped slot=0 rows:     {skipped_slot0}")
    print(f"Skipped no item_basic:   {skipped_no_basic}")
    print(f"Skipped non-equip type:  {skipped_bad_type}")
    print(f"Weapons w/o weapon row:  {weapons_without_weapon_row}")
    print(f"Armor with weapon row:   {type_mismatch}")
    print(f"Unknown mod ids:         {dict(unknown_mods) or 'none'}")
    print(f"Unknown latent ids:      {dict(unknown_latents) or 'none'}")
    print()
    print("Items per slot:")
    for s, c in summary["bySlot"].items():
        print(f"  {s:<8} {c}")
    print()
    print("Weapons per skill type:")
    for s, c in summary["byWeaponSkill"].items():
        print(f"  {s:<16} {c}")
    print()
    print("Top 15 stats by item count:")
    for s, c in list(summary["topMods"].items())[:15]:
        print(f"  {s:<20} {c}")
    print("=" * 64)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--server", default=SERVER_DIR_DEFAULT, help="Path to LandSandBoat server repo")
    ap.add_argument("--out", default=OUT_DIR_DEFAULT, help="Output directory")
    args = ap.parse_args()
    if not os.path.isdir(os.path.join(args.server, "sql")):
        sys.exit(f"ERROR: {args.server}/sql not found")
    build(args.server, args.out)


if __name__ == "__main__":
    main()
