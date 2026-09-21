import type { GearDB } from './types';

let cache: GearDB | null = null;
let pending: Promise<GearDB> | null = null;

export async function loadGearDb(): Promise<GearDB> {
  if (cache) return cache;
  if (pending) return pending;
  pending = fetch('/data/gear_database.json?v=4')
    .then(async (r: Response) => {
      if (!r?.ok) throw new Error(`Failed to load gear database (${r?.status})`);
      const data = (await r.json()) as GearDB;
      cache = data ?? {};
      return cache;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function getCachedDb(): GearDB | null {
  return cache;
}
