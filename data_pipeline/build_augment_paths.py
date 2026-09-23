#!/usr/bin/env python3
"""Build lib/ffxi/augment-paths.json: max-rank path augments for items whose extdata only exposes `Path: X` / `Rank: N`.

Sources
  1. Unity NPC (+1) "Odyssey" augments scraped from BG-Wiki by data_pipeline/exportgear.py -> augments_db.json (user upload)
  2. BG-Wiki Category:JSE_Necks table (Dynamis-D job necks NQ/+1/+2, Max Rank column)
  3. BG-Wiki Dynamis_Divergence_Weapon_Augments tables (Route A/B/C for NQ/+1/+2 weapons)

Output is keyed by gear-database item id:
  { "27149": { "name": "Tatena. Gote +1", "maxRank": 15, "paths": { "A": ["Accuracy+40", ...] } } }
Stats are the MAX-rank values; the app scales linearly by rank/maxRank.

usage: build_augment_paths.py gear_database.json augments_db.json Category_JSE_Necks.html Dynamis_Divergence_Weapon_Augments.html out.json
"""
import json
import re
import sys
from bs4 import BeautifulSoup


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9+]", "", s.lower())


def abbrev_match(display: str, full: str) -> bool:
    """'Tatena. Gote +1' matches 'Tatenashi Gote +1'; 'Ground. Mantle +1' matches 'Grounded Mantle +1'."""
    a, b = display.split(), full.split()
    if len(a) != len(b):
        return False
    for x, y in zip(a, b):
        if x.endswith('.'):
            if not y.lower().startswith(x[:-1].lower()):
                return False
        elif x.lower() != y.lower():
            return False
    return True


def clean_aug(a: str) -> str:
    a = re.sub(r"\s+", " ", a).strip()
    a = re.sub(r"^\[\d\]\s*", "", a)
    a = re.sub(r"^DMG:\s*\+", "DMG:+", a)
    a = re.sub(r"^DMG \+", "DMG:+", a)
    return a


def main():
    db_path, aug_path, necks_html, weapons_html, out_path = sys.argv[1:6]
    db = json.load(open(db_path))
    items = db['items'] if isinstance(db, dict) and 'items' in db else db
    by_display = {}
    for it in items.values():
        by_display.setdefault(it['displayName'], []).append(it)

    ALIASES = {"Paloma +1": "Paloma Bow +1", "Gazu Bracelet +1": "Gazu Bracelets +1"}

    def find(name: str):
        name = re.sub(r"\s+", " ", name).strip()
        name = ALIASES.get(name, name)
        if name in by_display:
            return by_display[name][0]
        for disp, lst in by_display.items():
            if abbrev_match(disp, name):
                return lst[0]
        # "+1"/"+2" grades are usually the next ids after the NQ item (e.g. Monk's Nodowa 25423 -> Mnk. Nodowa +1 25424)
        m = re.match(r"^(.*) \+([12])$", name)
        if m:
            nq = find(m.group(1))
            if nq:
                cand = items.get(str(nq['id'] + int(m.group(2))))
                if cand and cand['displayName'].endswith(f"+{m.group(2)}") and cand['slots'] == nq['slots']:
                    return cand
        return None

    out = {}
    missing = []

    def put(name, max_rank, paths):
        it = find(name)
        if not it:
            missing.append(name)
            return
        paths = {k: [clean_aug(a) for a in v if clean_aug(a)] for k, v in paths.items()}
        paths = {k: v for k, v in paths.items() if v}
        if not paths:
            return
        out[str(it['id'])] = {"name": it['displayName'], "maxRank": max_rank, "paths": paths}

    # 1. Unity NPC +1 augments (single path, R15 max)
    aug_db = json.load(open(aug_path))
    for name, entry in aug_db.items():
        if name == 'Item' or not isinstance(entry, dict):
            continue
        for path_key, augs in entry.items():
            if not isinstance(augs, list):
                continue
            if path_key == 'Odyssey':
                put(name, 15, {"A": augs})
            # 'Path A' JSE necks are rebuilt below from the full BG-Wiki table

    # 2. JSE necks
    soup = BeautifulSoup(open(necks_html).read(), 'html.parser')
    table = soup.find_all('table')[0]
    base = None
    for tr in table.find_all('tr'):
        cells = [c.get_text(' ', strip=True) for c in tr.find_all(['td', 'th'])]
        if len(cells) < 5 or cells[0] in ('Item', 'JSE Necks'):
            continue
        if cells[0] in ('+1', '+2'):
            if not base:
                continue
            name = f"{base} {cells[0]}"
            rank, augs = cells[2], cells[3:]
        else:
            base = cells[0]
            name = base
            rank, augs = cells[3], cells[4:]
        try:
            mr = int(rank)
        except ValueError:
            mr = 15
        put(name, mr, {"A": augs})

    # 3. Dynamis-D weapons
    soup = BeautifulSoup(open(weapons_html).read(), 'html.parser')
    tables = soup.find_all('table')
    for ti, mr in ((0, 15), (2, 20), (4, 25)):
        rows = tables[ti].find_all('tr')
        head = [c.get_text(' ', strip=True) for c in rows[0].find_all(['td', 'th'])]
        route_a = re.findall(r"\[\d\]\s*([^\[]+?)(?=\s*\[|$)", head[1])
        route_b = re.findall(r"\[\d\]\s*([^\[]+?)(?=\s*\[|$)", head[2])
        route_a = [a for a in route_a if 'See below' not in a]
        route_b = [a for a in route_b if 'See below' not in a]
        for tr in rows[1:]:
            cells = [c.get_text(' ', strip=True) for c in tr.find_all(['td', 'th'])]
            if len(cells) < 5 or cells[0] == 'Item':
                continue
            name = cells[0]
            extra = []
            if len(cells) >= 6:  # +2 table has a per-item Route A/B DMG cell
                extra = [clean_aug(cells[4])]
                route_c_cell = cells[5]
            else:
                route_c_cell = cells[4]
            route_c = re.findall(r"\[\d\]\s*([^\[]+?)(?=\s*\[|$)", route_c_cell)
            put(name, mr, {"A": route_a + extra, "B": route_b + extra, "C": route_c})

    json.dump(out, open(out_path, 'w'), indent=1, ensure_ascii=False)
    print(f"wrote {len(out)} items to {out_path}; unmatched: {len(missing)}")
    for m in missing:
        print('  missing:', m)


if __name__ == '__main__':
    main()
