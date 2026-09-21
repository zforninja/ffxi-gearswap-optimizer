# FFXI gear data

Built from LandSandBoat/server SQL dumps + enum YAML.

    python3 build_gear_database.py [--server PATH] [--out DIR]

Outputs `gear_database.json` (keyed by itemId) and `metadata.json` (lookup tables + summary).
