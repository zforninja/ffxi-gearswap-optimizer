'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GearDB, Inventory, OptimizedSet, Target } from './ffxi/types';
import { MOB_TIERS } from './ffxi/constants';

export type MobTier = 'easy' | 'medium' | 'hard' | 'extreme' | 'custom';

export type AppState = {
  mainJob: string;
  subJob: string;
  inventory: Inventory;
  /** Virtual augmented items (id >= 1,000,000) created from a GearExport import; merged over the base gear DB. */
  extraItems: GearDB;
  characterName: string;
  buffIds: string[];
  mobTier: MobTier;
  customTarget: Target;
  dtThreshold: number;
  /** Unity Ranking (1 = highest bonus ... 11 = lowest) used to scale "Unity Ranking:" gear bonuses. */
  unityRank: number;
  /** Total job points spent on the main job (0-2100). */
  jobPoints: number;
  /** Master Level (0-50). */
  masterLevel: number;
  wsNames: string[];
  primaryWs: string | null;
  lockedMain: number | null;
  lockedSub: number | null;
  results: OptimizedSet[];
  resultsStamp: string | null;
  setMainJob: (j: string) => void;
  setSubJob: (j: string) => void;
  setInventory: (inv: Inventory, characterName?: string, extraItems?: GearDB) => void;
  addItem: (id: number, count?: number) => void;
  removeItem: (id: number) => void;
  clearInventory: () => void;
  toggleBuff: (id: string, exclusiveGroup?: string, groupIds?: string[]) => void;
  setBuffIds: (ids: string[]) => void;
  setMobTier: (t: MobTier) => void;
  setCustomTarget: (t: Partial<Target>) => void;
  setDtThreshold: (v: number) => void;
  setUnityRank: (v: number) => void;
  setJobPoints: (v: number) => void;
  setMasterLevel: (v: number) => void;
  setWsNames: (names: string[]) => void;
  setPrimaryWs: (n: string | null) => void;
  setLockedMain: (id: number | null) => void;
  setLockedSub: (id: number | null) => void;
  setResults: (r: OptimizedSet[]) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      mainJob: 'WAR',
      subJob: 'SAM',
      inventory: {},
      extraItems: {},
      characterName: '',
      buffIds: ['haste2', 'food_daifuku'],
      mobTier: 'medium',
      customTarget: { ...MOB_TIERS.medium, name: 'Custom target' },
      dtThreshold: 30,
      unityRank: 1,
      jobPoints: 2100,
      masterLevel: 50,
      wsNames: ['Savage Blade'],
      primaryWs: 'Savage Blade',
      lockedMain: null,
      lockedSub: null,
      results: [],
      resultsStamp: null,
      setMainJob: (j: string) => set({ mainJob: j, lockedMain: null, lockedSub: null, results: [] }),
      setSubJob: (j: string) => set({ subJob: j }),
      setInventory: (inv: Inventory, characterName?: string, extraItems?: GearDB) =>
        set({ inventory: inv ?? {}, characterName: characterName ?? get().characterName, extraItems: extraItems ?? {} }),
      addItem: (id: number, count = 1) => {
        const inv = { ...(get().inventory ?? {}) };
        inv[id] = Math.max(1, (inv[id] ?? 0) + (count ?? 1));
        set({ inventory: inv });
      },
      removeItem: (id: number) => {
        const inv = { ...(get().inventory ?? {}) };
        delete inv[id];
        const extra = { ...(get().extraItems ?? {}) };
        delete extra[String(id)];
        set({ inventory: inv, extraItems: extra });
      },
      clearInventory: () => set({ inventory: {}, extraItems: {}, characterName: '', results: [] }),
      toggleBuff: (id: string, exclusiveGroup?: string, groupIds?: string[]) => {
        const cur = new Set(get().buffIds ?? []);
        if (cur.has(id)) cur.delete(id);
        else {
          if (exclusiveGroup) (groupIds ?? []).forEach((g: string) => cur.delete(g));
          cur.add(id);
        }
        set({ buffIds: [...cur] });
      },
      setBuffIds: (ids: string[]) => set({ buffIds: ids ?? [] }),
      setMobTier: (t: MobTier) => set({ mobTier: t }),
      setCustomTarget: (t: Partial<Target>) => set({ customTarget: { ...(get().customTarget ?? MOB_TIERS.medium), ...(t ?? {}) } }),
      setDtThreshold: (v: number) => set({ dtThreshold: v }),
      setUnityRank: (v: number) => set({ unityRank: Math.min(11, Math.max(1, Math.round(v ?? 1))) }),
      setJobPoints: (v: number) => set({ jobPoints: Math.min(2100, Math.max(0, Math.round(Number.isFinite(v) ? v : 0))) }),
      setMasterLevel: (v: number) => set({ masterLevel: Math.min(50, Math.max(0, Math.round(Number.isFinite(v) ? v : 0))) }),
      setWsNames: (names: string[]) => set({ wsNames: names ?? [] }),
      setPrimaryWs: (n: string | null) => set({ primaryWs: n }),
      setLockedMain: (id: number | null) => set({ lockedMain: id }),
      setLockedSub: (id: number | null) => set({ lockedSub: id }),
      setResults: (r: OptimizedSet[]) => set({ results: r ?? [], resultsStamp: new Date().toISOString() }),
    }),
    {
      name: 'vanadiel-gear-optimizer',
      storage: createJSONStorage(() => localStorage),
      partialize: (s: AppState) => ({
        mainJob: s.mainJob, subJob: s.subJob, inventory: s.inventory, extraItems: s.extraItems, characterName: s.characterName, buffIds: s.buffIds, mobTier: s.mobTier,
        customTarget: s.customTarget, dtThreshold: s.dtThreshold, unityRank: s.unityRank, jobPoints: s.jobPoints, masterLevel: s.masterLevel, wsNames: s.wsNames, primaryWs: s.primaryWs, lockedMain: s.lockedMain, lockedSub: s.lockedSub,
        results: s.results, resultsStamp: s.resultsStamp,
      }) as unknown as AppState,
    },
  ),
);

export function resolveTarget(s: Pick<AppState, 'mobTier' | 'customTarget'>): Target {
  if (s?.mobTier === 'custom') return s.customTarget ?? MOB_TIERS.medium;
  return MOB_TIERS[s?.mobTier ?? 'medium'] ?? MOB_TIERS.medium;
}
