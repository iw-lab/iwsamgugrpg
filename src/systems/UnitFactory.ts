import type { General, RuntimeUnit } from '@/types';
import { DataRegistry } from './DataRegistry';
import { DIFFICULTY_MULTIPLIERS, type Difficulty, EXP } from '@/config/balance';
import { gameRng } from '@/utils/rng';

let uidSeq = 1;

function nextUid(prefix: string): string {
  return `${prefix}_${uidSeq++}`;
}

function applyGrowth(
  general: General,
  level: number,
): { hp: number; atk: number; def: number; intel: number } {
  const lv = Math.max(1, level - 1);
  const pickGrowth = (range: [number, number]): number => {
    let total = 0;
    for (let i = 0; i < lv; i++) {
      total += gameRng.int(range[0], range[1] + 1);
    }
    return total;
  };
  return {
    hp: general.base.hp + pickGrowth(general.growth.hp),
    atk: general.base.atk + pickGrowth(general.growth.atk),
    def: general.base.def + pickGrowth(general.growth.def),
    intel: general.base.intel + pickGrowth(general.growth.intel),
  };
}

function applyItemStats(
  base: { hp: number; atk: number; def: number; intel: number; mov: number },
  itemIds: string[],
): { hp: number; atk: number; def: number; intel: number; mov: number } {
  const reg = DataRegistry.get();
  const out = { ...base };
  for (const id of itemIds) {
    try {
      const item = reg.getItem(id);
      if (item.type === 'consumable') continue;
      if (item.stats.hp) out.hp += item.stats.hp;
      if (item.stats.atk) out.atk += item.stats.atk;
      if (item.stats.def) out.def += item.stats.def;
      if (item.stats.intel) out.intel += item.stats.intel;
      if (item.stats.mov) out.mov += item.stats.mov;
    } catch {
      /* unknown item, ignore */
    }
  }
  return out;
}

export function createRuntimeUnit(opts: {
  generalId: string;
  side: 'player' | 'enemy';
  level: number;
  x: number;
  y: number;
  items?: string[];
  ai?: RuntimeUnit['ai'];
  difficulty?: Difficulty;
}): RuntimeUnit {
  const general = DataRegistry.get().getGeneral(opts.generalId);
  const lv = Math.max(1, Math.min(EXP.MAX_LEVEL, opts.level));
  const stats = applyGrowth(general, lv);
  const items = opts.items ?? [];
  const withItems = applyItemStats(
    { ...stats, mov: general.base.mov },
    items,
  );

  let hpMax = withItems.hp;
  let atk = withItems.atk;
  if (opts.side === 'enemy' && opts.difficulty) {
    const mult = DIFFICULTY_MULTIPLIERS[opts.difficulty];
    hpMax = Math.floor(hpMax * mult.enemyHp);
    atk = Math.floor(atk * mult.enemyAtk);
  }

  return {
    uid: nextUid(opts.side),
    generalId: opts.generalId,
    side: opts.side,
    level: lv,
    exp: 0,
    hp: hpMax,
    hpMax,
    atk,
    def: withItems.def,
    intel: withItems.intel,
    mov: withItems.mov,
    morale: general.base.morale,
    moraleMax: general.base.morale,
    x: opts.x,
    y: opts.y,
    hasMoved: false,
    hasActed: false,
    items,
    ai: opts.ai,
    statusEffects: [],
  };
}

export function gainExp(unit: RuntimeUnit, amount: number): boolean {
  unit.exp += amount;
  let leveled = false;
  while (unit.exp >= EXP.LEVEL_UP_THRESHOLD && unit.level < EXP.MAX_LEVEL) {
    unit.exp -= EXP.LEVEL_UP_THRESHOLD;
    unit.level++;
    leveled = true;
    const general = DataRegistry.get().getGeneral(unit.generalId);
    const hpGain = gameRng.int(general.growth.hp[0], general.growth.hp[1] + 1);
    const atkGain = gameRng.int(general.growth.atk[0], general.growth.atk[1] + 1);
    const defGain = gameRng.int(general.growth.def[0], general.growth.def[1] + 1);
    const intelGain = gameRng.int(general.growth.intel[0], general.growth.intel[1] + 1);
    unit.hpMax += hpGain;
    unit.hp = Math.min(unit.hpMax, unit.hp + hpGain);
    unit.atk += atkGain;
    unit.def += defGain;
    unit.intel += intelGain;
  }
  return leveled;
}
