# Vana'diel Gear Optimizer (FFXI GearSwap set optimizer)

Builds near-BiS GearSwap sets for Final Fantasy XI from your actual inventory and exports them as Windower GearSwap Lua.

Live app: https://gsoptimizer.abacusai.app

## Layout

| Folder | What it is |
|---|---|
| `app/` | The web application (Next.js 16, TypeScript). Optimizer engine lives in `app/lib/ffxi/` (`math.ts`, `optimizer.ts`, `constants.ts`, `types.ts`, `augments.ts`, `lua-export.ts`). Gear database ships in `app/public/data/gear_database.json`. |
| `data_pipeline/` | Python scripts that build and enrich the gear database from LandSandBoat SQL + Windower resources (`build_gear_database.py`, `enrich_gear_database.py`). |
| `addon/GearExport/` | Windower addon that exports your inventory (with augments) to JSON for import into the app. |

## Features
- All jobs / subjobs, Low/High buff tiers, target difficulty tiers, Unity Ranking bonus selector
- Set contexts: TP, per-weapon-skill, Magic, Healing, Idle/DT, Fast Cast, Hybrid DT, Treasure Hunter
- Joint TP + WS weapon search; slot-blocking gear (suits) handled; augmented items treated as distinct pieces
- GearSwap Lua export with augments

## Running the app locally
```bash
cd app
cp .env.example .env   # fill in values
yarn install
yarn prisma generate
yarn dev
```

## Rebuilding the gear database
See `data_pipeline/README.md`.

Combat math is an approximation; predicted numbers have not yet been validated against in-game parses.
