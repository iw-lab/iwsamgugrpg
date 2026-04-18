import type { RuntimeUnit, TerrainType, UnitClass } from '@/types';
import { terrainMoveCost, TERRAIN } from '@/config/balance';

export interface GridCell {
  x: number;
  y: number;
  terrain: TerrainType;
  occupant?: RuntimeUnit;
}

export interface PathNode {
  x: number;
  y: number;
  g: number;
  parent?: PathNode;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

export function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function inBounds(
  grid: GridCell[][],
  x: number,
  y: number,
): boolean {
  return y >= 0 && y < grid.length && x >= 0 && x < grid[0].length;
}

export function computeReachable(
  grid: GridCell[][],
  startX: number,
  startY: number,
  mov: number,
  cls: UnitClass,
  side: 'player' | 'enemy',
): Map<string, number> {
  const costs = new Map<string, number>();
  costs.set(key(startX, startY), 0);

  const frontier: PathNode[] = [{ x: startX, y: startY, g: 0 }];

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.g - b.g);
    const cur = frontier.shift()!;
    const k = key(cur.x, cur.y);

    if ((costs.get(k) ?? Infinity) < cur.g) continue;

    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    for (const { dx, dy } of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!inBounds(grid, nx, ny)) continue;
      const cell = grid[ny][nx];
      if (!TERRAIN[cell.terrain].passable) continue;
      if (cell.occupant && cell.occupant.side !== side) continue;

      const cost = terrainMoveCost(cell.terrain, cls);
      const newG = cur.g + cost;
      if (newG > mov) continue;

      const nk = key(nx, ny);
      const prev = costs.get(nk) ?? Infinity;
      if (newG < prev) {
        costs.set(nk, newG);
        frontier.push({ x: nx, y: ny, g: newG, parent: cur });
      }
    }
  }

  return costs;
}

export function findPath(
  grid: GridCell[][],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  cls: UnitClass,
  side: 'player' | 'enemy',
  maxCost: number,
): Array<{ x: number; y: number }> | null {
  const open = new Map<string, PathNode>();
  const closed = new Set<string>();
  const start: PathNode = { x: fromX, y: fromY, g: 0 };
  open.set(key(fromX, fromY), start);

  while (open.size > 0) {
    let best: PathNode | null = null;
    for (const [, n] of open) {
      const h = manhattan(n.x, n.y, toX, toY);
      if (!best || n.g + h < best.g + manhattan(best.x, best.y, toX, toY)) {
        best = n;
      }
    }
    if (!best) return null;

    if (best.x === toX && best.y === toY) {
      const path: Array<{ x: number; y: number }> = [];
      let cur: PathNode | undefined = best;
      while (cur) {
        path.unshift({ x: cur.x, y: cur.y });
        cur = cur.parent;
      }
      return path;
    }

    open.delete(key(best.x, best.y));
    closed.add(key(best.x, best.y));

    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    for (const { dx, dy } of dirs) {
      const nx = best.x + dx;
      const ny = best.y + dy;
      if (!inBounds(grid, nx, ny)) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const cell = grid[ny][nx];
      if (!TERRAIN[cell.terrain].passable) continue;
      if (cell.occupant && cell.occupant.side !== side && !(cell.x === toX && cell.y === toY))
        continue;
      const cost = terrainMoveCost(cell.terrain, cls);
      const newG = best.g + cost;
      if (newG > maxCost) continue;

      const existing = open.get(nk);
      if (!existing || newG < existing.g) {
        open.set(nk, { x: nx, y: ny, g: newG, parent: best });
      }
    }
  }

  return null;
}

export function computeAttackRange(
  grid: GridCell[][],
  reachable: Map<string, number>,
  attackRange: number,
): Set<string> {
  const attacks = new Set<string>();
  for (const [k] of reachable) {
    const [sxStr, syStr] = k.split(',');
    const sx = Number(sxStr);
    const sy = Number(syStr);
    for (let dy = -attackRange; dy <= attackRange; dy++) {
      for (let dx = -attackRange; dx <= attackRange; dx++) {
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist === 0 || dist > attackRange) continue;
        const tx = sx + dx;
        const ty = sy + dy;
        if (!inBounds(grid, tx, ty)) continue;
        attacks.add(`${tx},${ty}`);
      }
    }
  }
  return attacks;
}
