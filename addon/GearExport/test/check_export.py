import json, sys
d = json.load(open(sys.argv[1]))
c = d['character']
assert c['name'] == 'Testchar' and c['mainJob'] == 'WAR' and c['subJob'] == 'SAM'
assert c['mainJobLevel'] == 99 and c['mainJobId'] == 1 and c['subJobId'] == 12
assert isinstance(d['exportDate'], str) and 'T' in d['exportDate']
items = {(i['id'], i['bagId']): i for i in d['items']}
assert len(items) == 7, len(items)
n = items[(21621, 0)]
assert n == {'id': 21621, 'name': 'Naegling', 'bag': 'Inventory', 'bagId': 0, 'slotIndex': 1,
             'equipped': True, 'jobs': 2209777, 'slots': 3, 'level': 99, 'iLevel': 119, 'category': 'Weapon',
             'augments': [], 'stale': False}, n
assert items[(10240, 8)]['bag'] == 'Wardrobe' and items[(10240, 8)]['equipped'] is True
u = items[(99999, 8)]
assert u['name'] == 'Unknown (99999)' and u['category'] == 'Unknown'
r = items[(28540, 13)]
assert r['name'] == 'Ilabrat Ring' and r['bag'] == 'Wardrobe 5' and r['slotIndex'] == 5 and r['equipped'] is False
assert (4112, 0) not in items and (65535, 0) not in items
# Legacy Helm is in inventory slot 7 with slots=16 and no category: must be included as Armor
assert (12345, 0) in items, 'legacy item missing'
assert items[(12345, 0)]['category'] == 'Armor'
# Unity ring whose extdata is 24 zero bytes: flagged stale, still exported (not dropped).
stale = items[(10768, 8)]
assert stale['name'] == 'Gelatinous Ring' and stale['slotIndex'] == 3 and stale['stale'] is True
# Unity ring with a real (non-zero) extdata header: not flagged.
synced = items[(10770, 8)]
assert synced['name'] == 'Cacoethic Ring' and synced['slotIndex'] == 4 and synced['stale'] is False
bags = [b['name'] for b in d['bags']]
assert bags == ['Inventory', 'Wardrobe', 'Wardrobe 5'], bags
print('PYCHECK_OK')
