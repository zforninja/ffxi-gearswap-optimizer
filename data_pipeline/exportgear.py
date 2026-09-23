import requests
from bs4 import BeautifulSoup
import re
import json
import time

API_URL = "https://www.bg-wiki.com/api.php"
HEADERS = {"User-Agent": "GearswapOptimizerScraper/3.1 (your_email@example.com)"}

def get_page_html(page_title):
    params = {
        "action": "parse",
        "page": page_title,
        "prop": "text",
        "format": "json"
    }
    print(f"Fetching {page_title}...")
    try:
        response = requests.get(API_URL, params=params, headers=HEADERS, timeout=15)
        data = response.json()
        if 'parse' in data:
            return data['parse']['text']['*']
        else:
            print(f"  -> API Error/No parse data: {data}")
    except Exception as e:
        print(f"  -> Network/Decode Error: {e}")

    # Polite delay to prevent rate limiting
    time.sleep(1)
    return None

def build_database():
    database = {}

    # --- 1. UNITY ITEMS (ODYSSEY AUGMENTS) ---
    unity_pages = [
        "Category:Unity_Weapons",
        "Category:Unity_Armor",
        "Category:Unity_Accessories"
    ]

    for page in unity_pages:
        html = get_page_html(page)
        if not html: continue
        soup = BeautifulSoup(html, 'html.parser')

        # Search all tables, dropping the strict class requirement
        for table in soup.find_all('table'):
            for row in table.find_all('tr'):
                # Using separator=" " to safely parse <br> tags between stats
                cols = [col.get_text(separator=" ", strip=True) for col in row.find_all(['th', 'td'])]

                for col in cols:
                    if "[1]" in col and ("[2]" in col or "Accuracy" in col or "DMG" in col):
                        stats = [s.strip() for s in re.split(r'\[\d+\]', col) if s.strip()]

                        # Dynamically find the item name (usually the first substantial string in the row)
                        item_name = None
                        for c in cols:
                            if len(c) > 3 and c not in ["Melee", "Mage", "Ranged", "Shields"] and "]" not in c and "x50" not in c and "Lustreless" not in c:
                                item_name = c
                                break

                        if item_name:
                            database[item_name] = {"Odyssey": stats}
                        break

    # --- 2. DYNAMIS DIVERGENCE WEAPONS ---
    html = get_page_html("Dynamis Divergence Weapon Augments")
    if html:
        soup = BeautifulSoup(html, 'html.parser')
        for table in soup.find_all('table'):
            path_indices = {}
            for row in table.find_all('tr'):
                cols = [col.get_text(separator=" ", strip=True) for col in row.find_all(['th', 'td'])]

                # Detect which columns represent which paths dynamically
                if not path_indices and any("Path A" in c for c in cols):
                    path_indices = {c: i for i, c in enumerate(cols) if "Path" in c}
                    continue

                if path_indices:
                    item_name = None
                    for c in cols:
                        # Skip typical metadata columns to isolate the weapon name
                        if len(c) > 3 and "]" not in c and "DMG:" not in c and "Path" not in c and c not in ["WAR","MNK","WHM","BLM","RDM","THF","PLD","DRK","BST","BRD","RNG","SAM","NIN","DRG","SMN","BLU","COR","PUP","DNC","SCH","GEO","RUN"]:
                            item_name = c
                            break

                    if item_name:
                        for path_name, idx in path_indices.items():
                            if idx < len(cols):
                                aug_string = cols[idx]
                                if "[1]" in aug_string:
                                    stats = [s.strip() for s in re.split(r'\[\d+\]', aug_string) if s.strip()]
                                    if item_name not in database:
                                        database[item_name] = {}
                                    database[item_name][path_name] = stats

    # --- 3. DYNAMIS JSE NECKS ---
    html = get_page_html("Category:JSE_Necks")
    if html:
        soup = BeautifulSoup(html, 'html.parser')
        last_item_name = None
        for table in soup.find_all('table'):
            for row in table.find_all('tr'):
                cols = [col.get_text(separator=" ", strip=True) for col in row.find_all(['th', 'td']) if col.get_text(strip=True)]
                if not cols: continue

                # Check for NQ items (Matches FFXI neck naming conventions)
                if len(cols) >= 4 and any(kw in cols[0] for kw in ["Necklace", "Gorget", "Collar", "Nodowa", "Medal", "Muffler", "Torque", "Choker", "Scarf"]):
                    item_name = cols[0]
                    last_item_name = item_name
                    # Augments are usually the last 3 valid elements in the row
                    stats = [c for c in cols[-3:] if c and c != "-" and len(c) > 2 and "Rank" not in c]
                    if stats:
                        database[item_name] = {"Path A": stats}

                # Check for HQ items (+1, +2 variants directly beneath the NQ row)
                elif last_item_name and cols[0] in ["+1", "+2"]:
                    item_name = f"{last_item_name} {cols[0]}"
                    stats = [c for c in cols[-3:] if c and c != "-" and len(c) > 2 and "Rank" not in c]
                    if stats:
                        database[item_name] = {"Path A": stats}

    return database

def export_to_json(db, filename="augments_db.json"):
    with open(filename, 'w') as f:
        json.dump(db, f, indent=4)
    print(f"\nSaved raw JSON database to {filename}")

def export_to_lua(db, filename="augments_db.lua"):
    with open(filename, 'w') as f:
        f.write("augment_db = {\n")
        # Sort items alphabetically for a clean Lua file
        for item in sorted(db.keys()):
            paths = db[item]
            f.write(f'    ["{item}"] = {{\n')
            for path, stats in paths.items():
                stats_str = ", ".join([f'[[{stat}]]' for stat in stats])
                f.write(f'        ["{path}"] = {{{stats_str}}},\n')
            f.write("    },\n")
        f.write("}\n")
    print(f"Saved Gearswap file to {filename}")

if __name__ == "__main__":
    print("Starting BG-Wiki Table Scraper v3...")
    db = build_database()

    if db:
        print(f"\nSuccessfully scraped {len(db)} augmented items!")
        export_to_json(db)
        export_to_lua(db)
    else:
        print("\nDatabase is empty. Check output logs above for API errors.")
