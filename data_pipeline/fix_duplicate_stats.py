#!/usr/bin/env python3
"""Remove description-derived alias stats that duplicate an LSB stat already on the item.

    python3 fix_duplicate_stats.py <gear_database.json> [out.json]

Currently: "Weapon skill damage +N%" on gear applies to the first hit only in retail. LSB stores it as
WEAPONSKILL_DAMAGE_BASE (mapped to allWsdmgAllHits) and the description parser added allWsdmgFirstHit on top, so
21 items (Thrud Earring, Ishvara Earring, Ratri set, ...) were counted twice AND on every hit. This folds the LSB
value into allWsdmgFirstHit (single, first-hit-only entry) so those items match the other ~185 WSD pieces.
"""
import json
import sys

ALIAS_GROUPS = [('allWsdmgFirstHit', 'allWsdmgAllHits')]  # (keep, fold-into-keep-and-remove)


def main():
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else src
    db = json.load(open(src, encoding='utf-8'))
    fixed = []
    for g in db.values():
        st = g.get('stats') or {}
        for keep, dup in ALIAS_GROUPS:
            if dup in st:
                st[keep] = max(st.get(keep, 0), st[dup])
                del st[dup]
                fixed.append(g.get('displayName'))
    json.dump(db, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'folded alias stats on {len(fixed)} items: {fixed}')


if __name__ == '__main__':
    main()
