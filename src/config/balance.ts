import type { TerrainType, UnitClass } from '@/types';

export const CLASS_ADVANTAGE: Record<UnitClass, Partial<Record<UnitClass, number>>> = {
  infantry: { archer: 1.5, cavalry: 0.75 },
  cavalry: { infantry: 1.5, archer: 0.75 },
  archer: { cavalry: 1.5, infantry: 0.75 },
  strategist: { guard: 1.25 },
  guard: { strategist: 1.25, assassin: 1.5 },
  assassin: { strategist: 1.5, lord: 1.25, guard: 0.75 },
  lord: {},
};

export const TERRAIN: Record<
  TerrainType,
  { moveCost: Partial<Record<UnitClass, number>>; avoid: number; defBonus: number; passable: boolean }
> = {
  plain: { moveCost: {}, avoid: 0, defBonus: 0, passable: true },
  road: { moveCost: {}, avoid: 0, defBonus: 0, passable: true },
  forest: {
    moveCost: { cavalry: 3 },
    avoid: 15,
    defBonus: 2,
    passable: true,
  },
  mountain: {
    moveCost: { infantry: 3, cavalry: 99, archer: 2, strategist: 3, guard: 3, lord: 3, assassin: 2 },
    avoid: 25,
    defBonus: 4,
    passable: true,
  },
  river: {
    moveCost: { infantry: 99, cavalry: 99, archer: 99, strategist: 99, guard: 99, lord: 99, assassin: 99 },
    avoid: 0,
    defBonus: 0,
    passable: false,
  },
  bridge: { moveCost: {}, avoid: -10, defBonus: -2, passable: true },
  wall: { moveCost: {}, avoid: 0, defBonus: 0, passable: false },
  gate: { moveCost: {}, avoid: 0, defBonus: 0, passable: true },
  camp: { moveCost: {}, avoid: 5, defBonus: 1, passable: true },
};

export function terrainMoveCost(t: TerrainType, cls: UnitClass): number {
  if (!TERRAIN[t].passable) return 99;
  return TERRAIN[t].moveCost[cls] ?? 1;
}

export function classAdvantageMultiplier(attacker: UnitClass, defender: UnitClass): number {
  return CLASS_ADVANTAGE[attacker]?.[defender] ?? 1.0;
}

export const DAMAGE = {
  MIN_MULT: 0.9,
  MAX_MULT: 1.1,
  DEF_REDUCTION: 0.55,
  CRIT_CHANCE_BASE: 0.04,
  CRIT_MULT: 1.75,
  RETALIATION_MULT: 0.85,
} as const;

export const EXP = {
  KILL_BASE: 40,
  HIT_BASE: 8,
  LEVEL_UP_THRESHOLD: 100,
  LEVEL_DIFF_BONUS_PER: 5,
  MAX_LEVEL: 30,
} as const;

export const AI_CONFIG = {
  AGGRO_RANGE: 6,
  PREFER_WEAK_THRESHOLD: 0.4,
  LORD_BOUNTY_MULT: 1.6,
} as const;

export const DIFFICULTY_MULTIPLIERS = {
  easy: { enemyHp: 0.8, enemyAtk: 0.85, expGain: 1.2 },
  normal: { enemyHp: 1.0, enemyAtk: 1.0, expGain: 1.0 },
  hard: { enemyHp: 1.35, enemyAtk: 1.2, expGain: 0.85 },
} as const;

export type Difficulty = keyof typeof DIFFICULTY_MULTIPLIERS;
