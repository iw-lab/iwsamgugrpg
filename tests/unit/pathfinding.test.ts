import { describe, expect, it } from 'vitest';
import { parseMap } from '@/systems/MapLoader';
import { computeReachable, findPath, manhattan } from '@/utils/pathfinding';

describe('map parsing', () => {
  it('parses ASCII map', () => {
    const grid = parseMap({
      width: 5,
      height: 3,
      terrain: ['.....', '.MMM.', '.....'],
    });
    expect(grid.length).toBe(3);
    expect(grid[0].length).toBe(5);
    expect(grid[1][1].terrain).toBe('mountain');
    expect(grid[0][0].terrain).toBe('plain');
  });
});

describe('pathfinding', () => {
  const grid = parseMap({
    width: 6,
    height: 4,
    terrain: ['......', '.MMMM.', '......', '......'],
  });

  it('reachable expands within mov', () => {
    const r = computeReachable(grid, 0, 0, 3, 'infantry', 'player');
    expect(r.has('0,0')).toBe(true);
    expect(r.has('3,0')).toBe(true);
    expect(r.has('4,4')).toBe(false);
  });

  it('finds a path around walls', () => {
    const path = findPath(grid, 0, 1, 5, 1, 'infantry', 'player', 20);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
    expect(path![path!.length - 1]).toEqual({ x: 5, y: 1 });
  });

  it('manhattan distance', () => {
    expect(manhattan(0, 0, 3, 4)).toBe(7);
    expect(manhattan(5, 5, 5, 5)).toBe(0);
  });
});
