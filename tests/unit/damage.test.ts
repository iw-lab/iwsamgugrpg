import { describe, expect, it } from 'vitest';
import { classAdvantageMultiplier, terrainMoveCost } from '@/config/balance';
import { RNG } from '@/utils/rng';

describe('classAdvantage', () => {
  it('infantry > archer', () => {
    expect(classAdvantageMultiplier('infantry', 'archer')).toBeGreaterThan(1);
  });
  it('archer < infantry', () => {
    expect(classAdvantageMultiplier('archer', 'infantry')).toBeLessThan(1);
  });
  it('rock-paper-scissors loop', () => {
    const inf2cav = classAdvantageMultiplier('infantry', 'cavalry');
    const cav2arch = classAdvantageMultiplier('cavalry', 'archer');
    const arch2inf = classAdvantageMultiplier('archer', 'infantry');
    expect(inf2cav).toBeLessThan(1);
    expect(cav2arch).toBeLessThan(1);
    expect(arch2inf).toBeLessThan(1);
  });
});

describe('terrainMoveCost', () => {
  it('plain is 1 for all', () => {
    expect(terrainMoveCost('plain', 'infantry')).toBe(1);
    expect(terrainMoveCost('plain', 'cavalry')).toBe(1);
  });
  it('mountain blocks cavalry', () => {
    expect(terrainMoveCost('mountain', 'cavalry')).toBeGreaterThanOrEqual(99);
  });
  it('river is impassable', () => {
    expect(terrainMoveCost('river', 'infantry')).toBeGreaterThanOrEqual(99);
  });
});

describe('RNG', () => {
  it('deterministic with same seed', () => {
    const a = new RNG(42);
    const b = new RNG(42);
    expect(a.next()).toBe(b.next());
    expect(a.next()).toBe(b.next());
  });
  it('int range inclusive-exclusive', () => {
    const r = new RNG(1);
    for (let i = 0; i < 200; i++) {
      const v = r.int(0, 5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });
});
