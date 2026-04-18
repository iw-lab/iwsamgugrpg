import type { RuntimeUnit } from '@/types';
import type { GridCell } from '@/utils/pathfinding';
import { computeReachable, manhattan } from '@/utils/pathfinding';
import { DataRegistry } from './DataRegistry';
import { AI_CONFIG } from '@/config/balance';

export interface AIDecision {
  move: { x: number; y: number } | null;
  attack: RuntimeUnit | null;
}

export function decideEnemyTurn(
  enemy: RuntimeUnit,
  grid: GridCell[][],
  players: RuntimeUnit[],
): AIDecision {
  if (players.length === 0) return { move: null, attack: null };

  const reg = DataRegistry.get();
  const general = reg.getGeneral(enemy.generalId);
  const attackRange = general.class === 'archer' ? 2 : 1;

  const ai = enemy.ai ?? 'aggressive';

  if (ai === 'passive' || ai === 'lord') {
    const threat = findClosest(enemy, players, 2);
    if (threat && manhattan(enemy.x, enemy.y, threat.x, threat.y) <= attackRange) {
      return { move: null, attack: threat };
    }
    if (ai === 'passive') return { move: null, attack: null };
  }

  if (ai === 'guard') {
    const nearby = findClosest(enemy, players, 3);
    if (!nearby) return { move: null, attack: null };
    if (manhattan(enemy.x, enemy.y, nearby.x, nearby.y) <= attackRange) {
      return { move: null, attack: nearby };
    }
    const reachable = computeReachable(grid, enemy.x, enemy.y, enemy.mov, general.class, 'enemy');
    const target = findBestMoveTowards(enemy, nearby, reachable, grid, attackRange);
    return { move: target, attack: null };
  }

  const target = pickPreferredTarget(enemy, players);
  if (!target) return { move: null, attack: null };

  if (manhattan(enemy.x, enemy.y, target.x, target.y) <= attackRange) {
    return { move: null, attack: target };
  }

  const reachable = computeReachable(grid, enemy.x, enemy.y, enemy.mov, general.class, 'enemy');
  const bestMove = findBestMoveTowards(enemy, target, reachable, grid, attackRange);

  if (!bestMove) return { move: null, attack: null };

  const targetAfterMove = players.find(
    (p) =>
      p.hp > 0 && manhattan(bestMove.x, bestMove.y, p.x, p.y) <= attackRange,
  );
  return { move: bestMove, attack: targetAfterMove ?? null };
}

function findClosest(from: RuntimeUnit, units: RuntimeUnit[], maxDist: number): RuntimeUnit | null {
  let best: RuntimeUnit | null = null;
  let bestDist = Infinity;
  for (const u of units) {
    if (u.hp <= 0) continue;
    const d = manhattan(from.x, from.y, u.x, u.y);
    if (d <= maxDist && d < bestDist) {
      best = u;
      bestDist = d;
    }
  }
  return best;
}

function pickPreferredTarget(enemy: RuntimeUnit, players: RuntimeUnit[]): RuntimeUnit | null {
  const alive = players.filter((p) => p.hp > 0);
  if (alive.length === 0) return null;

  const lord = alive.find((p) => p.generalId === 'liubei');
  if (lord && manhattan(enemy.x, enemy.y, lord.x, lord.y) <= AI_CONFIG.AGGRO_RANGE * 1.5) {
    return lord;
  }

  const weak = alive
    .filter((p) => p.hp / p.hpMax <= AI_CONFIG.PREFER_WEAK_THRESHOLD)
    .sort((a, b) => manhattan(enemy.x, enemy.y, a.x, a.y) - manhattan(enemy.x, enemy.y, b.x, b.y))[0];
  if (weak) return weak;

  alive.sort((a, b) => manhattan(enemy.x, enemy.y, a.x, a.y) - manhattan(enemy.x, enemy.y, b.x, b.y));
  return alive[0] ?? null;
}

function findBestMoveTowards(
  enemy: RuntimeUnit,
  target: RuntimeUnit,
  reachable: Map<string, number>,
  grid: GridCell[][],
  attackRange: number,
): { x: number; y: number } | null {
  let best: { x: number; y: number; score: number } | null = null;
  for (const [k] of reachable) {
    const [sx, sy] = k.split(',').map(Number);
    const cell = grid[sy][sx];
    if (cell.occupant && !(cell.occupant.uid === enemy.uid)) continue;
    const dist = manhattan(sx, sy, target.x, target.y);
    const score = -dist + (dist <= attackRange ? 100 : 0);
    if (!best || score > best.score) best = { x: sx, y: sy, score };
  }
  return best ? { x: best.x, y: best.y } : null;
}
