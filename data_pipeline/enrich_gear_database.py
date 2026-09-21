#!/usr/bin/env python3
"""Post-process gear_database.json:
  1. rslotMask = rslot | rslotlook  (already done by builder; re-applied here from LSB SQL for safety)
  2. Fill / merge item stats parsed from Windower's item_descriptions.lua (the in-game description text),
     because LandSandBoat's item_mods.sql lacks mods for a large share of iL119 armor.

Usage: python3 enrich_gear_database.py <gear_database.json> <item_descriptions.lua> <item_equipment.sql> <out.json>
"""
import json
import re
import sys
from collections import Counter

STAT_RULES = [
    (r'Magic Critical hit rate\s*[+-]\d+%?', None, 0),
    (r'Enemy critical hit rate\s*[+-]\d+%?', None, 0),
    (r'\w+ Elemental Magic Accuracy\s*[+-]\d+', None, 0),
    (r'\w+ Elemental "Magic Atk\. Bonus"\s*[+-]\d+', None, 0),
    (r'Magic Accuracy skill\s*[+-]\d+', None, 0),
    # (regex, key, multiplier).  Applied in order; matched text is consumed so generic rules
    # (e.g. Accuracy) do not re-match the specific ones (Ranged Accuracy).
    (r'DEF:\s*(\d+)', 'DEF', 1),
    (r'\bHP([+-]\d+)(?!%)', 'HP', 1),
    (r'\bMP([+-]\d+)(?!%)', 'MP', 1),
    (r'\bSTR([+-]\d+)(?!%)', 'STR', 1),
    (r'\bDEX([+-]\d+)(?!%)', 'DEX', 1),
    (r'\bVIT([+-]\d+)(?!%)', 'VIT', 1),
    (r'\bAGI([+-]\d+)(?!%)', 'AGI', 1),
    (r'\bINT([+-]\d+)(?!%)', 'INT', 1),
    (r'\bMND([+-]\d+)(?!%)', 'MND', 1),
    (r'\bCHR([+-]\d+)(?!%)', 'CHR', 1),
    (r'Ranged Accuracy\s*([+-]\d+)(?!%)', 'RACC', 1),
    (r'Ranged Attack\s*([+-]\d+)(?!%)', 'RATT', 1),
    (r'Magic Accuracy\s*([+-]\d+)(?!\s*skill)', 'MACC', 1),
    (r'Weapon skill accuracy\s*([+-]\d+)(?!%)', 'wsacc', 1),
    (r'\bAccuracy\s*([+-]\d+)(?!%)', 'ACC', 1),
    (r'\bAttack\s*([+-]\d+)(?!%)', 'ATT', 1),
    (r'"Magic Atk\. Bonus"\s*([+-]\d+)(?!%)', 'MATT', 1),
    (r'Magic Evasion\s*([+-]\d+)(?!%)', 'MEVA', 1),
    (r'\bEvasion\s*([+-]\d+)(?!%)', 'EVA', 1),
    (r'"Magic Def\. Bonus"\s*([+-]\d+)(?!%)', 'MDEF', 1),
    (r'Physical damage taken\s*([+-]\d+)%', 'dmgphys', 100),
    (r'Magic damage taken\s*([+-]\d+)%', 'dmgmagic', 100),
    (r'Breath damage taken\s*([+-]\d+)%', 'dmgbreath', 100),
    (r'Ranged damage taken\s*([+-]\d+)%', 'dmgrange', 100),
    (r'Magic Damage\s*([+-]\d+)(?!%)', 'magicDamage', 1),
    (r'Haste\s*([+-]\d+)%', 'hasteGear', 100),
    (r'"Store TP"\s*([+-]\d+)(?!%)', 'storetp', 1),
    (r'"Double Attack"\s*([+-]\d+)%', 'doubleAttack', 1),
    (r'"Triple Attack"\s*([+-]\d+)%', 'tripleAttack', 1),
    (r'"Quadruple Attack"\s*([+-]\d+)%', 'quadAttack', 1),
    (r'Critical hit rate\s*([+-]\d+)%', 'crithitrate', 1),
    (r'Critical hit damage\s*([+-]\d+)%', 'critDmgIncrease', 1),
    (r'Weapon skill damage\s*([+-]\d+)%', 'allWsdmgFirstHit', 1),
    (r'\bDamage taken\s*([+-]\d+)%', 'dmg', 100),
    (r'"Fast Cast"\s*([+-]\d+)%?', 'fastcast', 1),
    (r'"Cure" potency\s*([+-]\d+)%', 'curePotency', 1),
    (r'"Cure" spellcasting time\s*([+-]\d+)%', 'cureCastTime', 1),
    (r'Potency of "Cure" effect received\s*([+-]\d+)%', 'curePotencyRcvd', 1),
    (r'\bEnmity\s*([+-]\d+)(?!%)', 'enmity', 1),
    (r'"Refresh"\s*([+-]\d+)(?!%)', 'refresh', 1),
    (r'"Regen"\s*([+-]\d+)(?!%)', 'regen', 1),
    (r'"Treasure Hunter"\s*([+-]\d+)(?!%)', 'treasureHunter', 1),
    (r'"Dual Wield"\s*([+-]\d+)(?!%)', 'dualWield', 1),
    (r'"Subtle Blow"\s*([+-]\d+)(?!%)', 'subtleBlow', 1),
    (r'"Subtle Blow II"\s*([+-]\d+)', 'subtleBlowIi', 1),
    (r'Magic burst damage\s*([+-]\d+)%?', 'magicBurstBonusCapped', 1),
    (r'"Conserve MP"\s*([+-]\d+)(?!%)', 'conserveMp', 1),
    (r'Skillchain damage\s*([+-]\d+)%', 'skillchaindmg', 1),
    (r'"TP Bonus"\s*([+-]\d+)(?!%)', 'tpBonus', 1),
    (r'"Resist Stun"\s*([+-]\d+)', 'stunres', 1),
    (r'"Resist Silence"\s*([+-]\d+)', 'silenceres', 1),
    (r'"Resist Paralyze"\s*([+-]\d+)', 'paralyzeres', 1),
    (r'Movement speed\s*([+-]\d+)%', 'moveSpeedGearBonus', 1),
    (r'"Martial Arts"\s*([+-]\d+)', 'martialArts', 1),
    (r'"Counter"\s*([+-]\d+)', 'counter', 1),
    (r'"Snapshot"\s*([+-]\d+)', 'snapshot', 1),
    (r'"Rapid Shot"\s*([+-]\d+)', 'rapidShot', 1),
    (r'"Zanshin"\s*([+-]\d+)', 'zanshin', 1),
    (r'"Recycle"\s*([+-]\d+)', 'recycle', 1),
    (r'Spell interruption rate down\s*([+-]?\d+)%', 'spellinterrupt', -1),
    (r'Enhancing magic skill\s*([+-]\d+)', 'enhance', 1),
    (r'Healing magic skill\s*([+-]\d+)', 'healing', 1),
    (r'Divine magic skill\s*([+-]\d+)', 'divine', 1),
    (r'Dark magic skill\s*([+-]\d+)', 'dark', 1),
    (r'Elemental magic skill\s*([+-]\d+)', 'elem', 1),
    (r'Enfeebling magic skill\s*([+-]\d+)', 'enfeeble', 1),
    (r'Singing skill\s*([+-]\d+)', 'singing', 1),
    (r'String instrument skill\s*([+-]\d+)', 'string', 1),
    (r'Wind instrument skill\s*([+-]\d+)', 'wind', 1),
    (r'Ninjutsu skill\s*([+-]\d+)', 'ninjutsu', 1),
    (r'Summoning magic skill\s*([+-]\d+)', 'summoning', 1),
    (r'Blue magic skill\s*([+-]\d+)', 'blue', 1),
    (r'Geomancy skill\s*([+-]\d+)', 'geomancy', 1),
    (r'Handbell skill\s*([+-]\d+)', 'handbell', 1),
    (r'Shield skill\s*([+-]\d+)', 'shield', 1),
    (r'Parrying skill\s*([+-]\d+)', 'parry', 1),
    (r'Magic Accuracy skill\s*([+-]\d+)', 'magicAccSkill', 1),
    (r'Physical damage limit\s*([+-]\d+)%', 'pdl', 1),
    (r'Pet: [^\n]*', None, 0),  # consumed, ignored
]

# Everything from one of these lines onward is conditional / set / pet / enchantment text: stop parsing.
TERMINAL_PREFIXES = (
    'Set:', 'Pet:', 'Latent effect:', 'Enchantment:', 'Unity Ranking:', 'Assault:', 'Campaign:', 'Dynamis:',
    'Salvage:', 'Nation control', 'Abyssea:', 'Besieged:', 'Voidwatch:', 'Reive:', 'Reives:', 'Chocobo:',
    'Automaton:', 'Avatar:', 'Wyvern:', 'Luopan:', 'Ambuscade:', 'Vagary:', 'Omen:', 'Odyssey:', 'Sortie:',
    'Trust:', 'Mog Garden', 'Full moon', 'New moon', 'Dusk to dawn', 'Dawn to dusk', 'Daytime', 'Nighttime',
)
# Single lines that describe conditional or non-numeric effects: skip the line, keep parsing the rest.
SKIP_PREFIXES = (
    'Additional effect:', 'Occasionally', 'Occ.', 'In areas', 'During', 'When', 'While', 'Enhances', 'Augments',
    'Increases', 'Reduces', 'Improves', 'Adds', 'Grants', 'Converts', 'Sneak Attack', 'Trick Attack',
    'Lv.', 'Rank', 'Furnishing', 'Synergy', 'Aftermath', 'Elemental Sforzo', 'Allows',
)

LABEL_RX = re.compile(r"(?<![\w\"])(?!DEF:|DMG:|Delay:)[A-Z][\w.'\- ]*?:")

COMPILED = [(re.compile(p, re.IGNORECASE), k, m) for p, k, m in STAT_RULES]


def apply_rules(body: str) -> dict:
    stats: dict = {}
    for rx, key, mult in COMPILED:
        def _sub(m, key=key, mult=mult):
            if key is not None:
                try:
                    v = int(m.group(1))
                except (IndexError, ValueError):
                    return ' '
                stats[key] = stats.get(key, 0) + v * mult
            return ' '
        body = rx.sub(_sub, body)
    return stats


def parse_description(text: str) -> dict:
    lines = text.replace('\r', '').split('\n')
    kept = []
    for ln in lines:
        s = ln.strip()
        if any(s.startswith(pfx) for pfx in TERMINAL_PREFIXES):
            break
        # "Label:" (Latent effect:, Sphere:, Legion:, Sunny weather:, In areas ...:) marks conditional text.
        m = LABEL_RX.search(s)
        if m:
            kept.append(s[:m.start()])
            break
        if any(s.startswith(pfx) for pfx in SKIP_PREFIXES):
            continue
        kept.append(s)
    return apply_rules(' '.join(kept))


UNITY_RANGE_RX = re.compile(r'([+-])(\d+)～(\d+)')


def parse_unity(text: str) -> dict:
    """'Unity Ranking: Accuracy+5～10' -> {'ACC': [5, 10]} (value at the lowest rank, value at rank 1)."""
    idx = text.find('Unity Ranking:')
    if idx < 0:
        return {}
    seg = text[idx + len('Unity Ranking:'):].replace('\r', '')
    kept = []
    for ln in seg.split('\n'):
        s = ln.strip()
        if not s:
            if kept:
                break
            continue
        if '～' not in s:
            break
        kept.append(s)
    body = ' '.join(kept)
    if not body:
        return {}
    lo = apply_rules(UNITY_RANGE_RX.sub(r'\1\2', body).replace('DEF:+', 'DEF:'))
    hi = apply_rules(UNITY_RANGE_RX.sub(r'\1\3', body).replace('DEF:+', 'DEF:'))
    out = {}
    for k in set(lo) | set(hi):
        if k in EQUIP_KEYS:
            out[k] = [lo.get(k, 0), hi.get(k, 0)]
    return out


def load_descriptions(path: str) -> dict:
    out = {}
    rx = re.compile(r'^\s*\[(\d+)\]\s*=\s*\{id=\d+,en="((?:[^"\\]|\\.)*)"')
    with open(path, encoding='utf-8', errors='replace') as f:
        for line in f:
            m = rx.match(line)
            if not m:
                continue
            en = m.group(2).replace('\\n', '\n').replace('\\"', '"')
            out[int(m.group(1))] = en
    return out


def load_names(path: str) -> dict:
    """Windower items.lua -> {id: in-game English name} (exact names GearSwap expects)."""
    out = {}
    rx = re.compile(r'^\s*\[(\d+)\]\s*=\s*\{id=\d+,en="((?:[^"\\]|\\.)*)"')
    with open(path, encoding='utf-8', errors='replace') as f:
        for line in f:
            m = rx.match(line)
            if m:
                out[int(m.group(1))] = m.group(2).replace('\\"', '"')
    return out


def load_rslot(path: str) -> dict:
    out = {}
    rx = re.compile(r'\((\d+),\s*\'(?:[^\'\\]|\\.)*\',\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)\)')
    with open(path, encoding='utf-8', errors='replace') as f:
        for line in f:
            if 'INSERT' not in line:
                continue
            m = rx.search(line)
            if m:
                out[int(m.group(1))] = int(m.group(9)) | int(m.group(10))
    return out


EQUIP_KEYS = ('DEF', 'HP', 'MP', 'STR', 'DEX', 'VIT', 'AGI', 'INT', 'MND', 'CHR', 'ACC', 'ATT', 'RACC', 'RATT',
              'MACC', 'MATT', 'EVA', 'MEVA', 'MDEF', 'hasteGear', 'storetp', 'doubleAttack', 'tripleAttack',
              'crithitrate', 'critDmgIncrease', 'allWsdmgFirstHit', 'dmg', 'dmgphys', 'dmgmagic', 'fastcast',
              'curePotency', 'enmity', 'refresh', 'regen', 'treasureHunter', 'dualWield', 'subtleBlow',
              'magicBurstBonusCapped', 'conserveMp', 'skillchaindmg', 'tpBonus', 'wsacc', 'magicDamage',
              'moveSpeedGearBonus', 'martialArts', 'quadAttack')

PERCENT_KEYS = {'doubleAttack', 'tripleAttack', 'quadAttack', 'crithitrate', 'critDmgIncrease', 'storetp', 'dualWield', 'fastcast', 'allWsdmgFirstHit', 'curePotency', 'enmity'}


def main():
    db_path, desc_path, eq_path, out_path = sys.argv[1:5]
    names = load_names(sys.argv[5]) if len(sys.argv) > 5 else {}
    db = json.load(open(db_path, encoding='utf-8'))
    renamed = 0
    for sid, g in db.items():
        nm = names.get(int(sid))
        if nm and nm != g.get('displayName'):
            g['displayName'] = nm
            renamed += 1
    print(f'display names corrected from Windower items.lua: {renamed}')
    descs = load_descriptions(desc_path)
    rslots = load_rslot(eq_path)
    print(f'descriptions: {len(descs)}  equipment rows: {len(rslots)}')

    filled = merged = rslot_fixed = unity_count = 0
    scale_fixed = []
    filled_examples = []
    for sid, g in db.items():
        iid = int(sid)
        # 1. slot blocking
        if iid in rslots and g.get('rslotMask', 0) != rslots[iid]:
            g['rslotMask'] = rslots[iid]
            rslot_fixed += 1
        # 2. stats from description
        text = descs.get(iid)
        if not text:
            continue
        unity = parse_unity(text)
        if unity:
            g['unity'] = unity
            unity_count += 1
        elif 'unity' in g:
            del g['unity']
        parsed = parse_description(text)
        if not parsed:
            continue
        stats = g.get('stats') or {}
        # weapons: LSB has damage/delay in weapon{}; description DMG/Delay are not in STAT_RULES so nothing clashes
        equip_parsed = {k: v for k, v in parsed.items() if k in EQUIP_KEYS}
        if not stats or all(k not in EQUIP_KEYS for k in stats):
            # LSB has nothing usable -> description is the source of truth
            for k, v in parsed.items():
                if k in EQUIP_KEYS or k not in stats:
                    stats[k] = v
            g['stats'] = stats
            g['statsSource'] = 'description'
            filled += 1
            if len(filled_examples) < 8:
                filled_examples.append((g['displayName'], dict(list(stats.items())[:6])))
        else:
            # LSB has mods: add any key the description has that LSB lacks entirely
            added = False
            for k, v in equip_parsed.items():
                if k not in stats:
                    stats[k] = v
                    added = True
                elif v != 0 and abs(stats[k]) == 100 * abs(v) and k in PERCENT_KEYS:
                    # LSB stored a plain-percent mod x100 (e.g. Skormoth Mask "Triple Attack"+4% as 400)
                    scale_fixed.append((g['displayName'], k, stats[k], v))
                    stats[k] = v
                    added = True
            if added:
                g['stats'] = stats
                g['statsSource'] = 'lsb+description'
                merged += 1

    # 3. items whose in-game stats only exist as fixed augments (not in any description)
    FIXED_AUGMENT_STATS = {
        11697: {'ACC': 4, 'tpBonus': 250},  # Moonshade Earring: always Accuracy+4 / TP Bonus +250
    }
    for iid, extra in FIXED_AUGMENT_STATS.items():
        g = db.get(str(iid))
        if g is None:
            continue
        stats = g.get('stats') or {}
        for k, v in extra.items():
            stats.setdefault(k, v)
        g['stats'] = stats
        g['statsSource'] = (g.get('statsSource') or 'lsb') + '+fixedaug'

    json.dump(db, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

    n119 = [g for g in db.values() if g.get('iLevel', 0) >= 119 and g.get('type') != 'weapon']
    empty119 = [g['displayName'] for g in n119 if not g.get('stats')]
    print(f'rslot fixed: {rslot_fixed}   stats filled from description: {filled}   merged keys into LSB items: {merged}   unity items: {unity_count}')
    print('x100 scale fixes:', scale_fixed)
    print(f'iL119 armor: {len(n119)}, still empty: {len(empty119)}')
    print('still empty sample:', empty119[:25])
    print('filled examples:', filled_examples)


if __name__ == '__main__':
    main()
