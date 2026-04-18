import type { RuntimeUnit, TerrainType } from '@/types';
import { classAdvantageMultiplier, DAMAGE, TERRAIN } from '@/config/balance';
import { gameRng } from './rng';

export interface DamageResult {
  damage: number;
  crit: boolean;
  missed: boolean;
  classAdvantage: number;
}

export function computeDamage(
  attacker: RuntimeUnit,
  defender: RuntimeUnit,
  attackerClass: string,
  defenderClass: string,
  defenderTerrain: TerrainType,
  skillPower: number = 1.0,
): DamageResult {
  const terrain = TERRAIN[defenderTerrain];
  const avoid = terrain.avoid / 100;
  const missed = gameRng.roll(Math.max(0, avoid - 0.05));
  if (missed) {
    return { damage: 0, crit: false, missed: true, classAdvantage: 1 };
  }

  const advantage = classAdvantageMultiplier(
    attackerClass as never,
    defenderClass as never,
  );
  const variance = gameRng.range(DAMAGE.MIN_MULT, DAMAGE.MAX_MULT);
  const rawAtk = attacker.atk * variance * advantage * skillPower;
  const defense = (defender.def + terrain.defBonus) * DAMAGE.DEF_REDUCTION;
  let damage = Math.max(1, Math.floor(rawAtk - defense));

  const critChance = DAMAGE.CRIT_CHANCE_BASE + attacker.intel * 0.005;
  const crit = gameRng.roll(critChance);
  if (crit) damage = Math.floor(damage * DAMAGE.CRIT_MULT);

  return { damage, crit, missed: false, classAdvantage: advantage };
}

export function canRetaliate(
  attacker: RuntimeUnit,
  defender: RuntimeUnit,
  atkRange: number,
  defRange: number,
): boolean {
  const dist =
    Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
  return dist <= defRange && dist <= atkRange && defender.hp > 0;
}
