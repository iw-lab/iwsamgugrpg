import type { TerrainType, MapLayer } from '@/types';
import type { GridCell } from '@/utils/pathfinding';

const CHAR_TO_TERRAIN: Record<string, TerrainType> = {
  '.': 'plain',
  p: 'plain',
  F: 'forest',
  M: 'mountain',
  w: 'river',
  B: 'bridge',
  R: 'road',
  W: 'wall',
  G: 'gate',
  C: 'camp',
};

export function parseMap(raw: MapLayer | { width: number; height: number; terrain: string[] | TerrainType[][] }): GridCell[][] {
  const width = raw.width;
  const height = raw.height;
  const grid: GridCell[][] = [];

  if (Array.isArray(raw.terrain) && raw.terrain.length > 0 && typeof raw.terrain[0] === 'string') {
    const stringRows = raw.terrain as string[];
    for (let y = 0; y < height; y++) {
      const row: GridCell[] = [];
      const rowStr = stringRows[y] ?? '';
      for (let x = 0; x < width; x++) {
        const ch = rowStr[x] ?? '.';
        const terrain: TerrainType = CHAR_TO_TERRAIN[ch] ?? 'plain';
        row.push({ x, y, terrain });
      }
      grid.push(row);
    }
  } else {
    const rows = raw.terrain as TerrainType[][];
    for (let y = 0; y < height; y++) {
      const row: GridCell[] = [];
      for (let x = 0; x < width; x++) {
        row.push({ x, y, terrain: rows[y]?.[x] ?? 'plain' });
      }
      grid.push(row);
    }
  }

  return grid;
}

export function clearOccupants(grid: GridCell[][]): void {
  for (const row of grid) {
    for (const cell of row) {
      cell.occupant = undefined;
    }
  }
}
