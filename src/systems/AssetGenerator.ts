import Phaser from 'phaser';
import { DataRegistry } from './DataRegistry';
import type { Faction, UnitClass } from '@/types';

const FACTION_COLORS: Record<Faction, number> = {
  shu: 0x3b7dd8,
  wei: 0xc13a3a,
  wu: 0x2e8b57,
  han: 0x8b4513,
  'yellow-turban': 0xd4af37,
  neutral: 0x808080,
};

const CLASS_SHAPES: Record<UnitClass, string> = {
  lord: 'crown',
  cavalry: 'horse',
  infantry: 'sword',
  archer: 'bow',
  strategist: 'fan',
  guard: 'shield',
  assassin: 'dagger',
};

export class AssetGenerator {
  private scene: Phaser.Scene;
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  ensureAllUnitTextures(): void {
    const reg = DataRegistry.get();
    reg.generals.forEach((g) => {
      this.ensureUnitTexture(g.id);
      this.ensurePortraitTexture(g.id);
    });
  }

  ensureUnitTexture(generalId: string, size: number = 40): string {
    const key = `unit_${generalId}`;
    if (this.scene.textures.exists(key)) return key;

    const reg = DataRegistry.get();
    const general = reg.getGeneral(generalId);
    const color = FACTION_COLORS[general.faction];
    const shape = CLASS_SHAPES[general.class];

    const g = this.scene.add.graphics({ x: 0, y: 0 });
    g.setVisible(false);

    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(size / 2, size - 3, size * 0.6, 4);

    g.fillStyle(color, 1);
    g.lineStyle(2, 0x000000, 1);
    g.fillCircle(size / 2, size / 2, size / 2 - 2);
    g.strokeCircle(size / 2, size / 2, size / 2 - 2);

    g.fillStyle(0xffecb3, 1);
    g.fillCircle(size / 2, size / 2 - 4, size / 3 - 3);

    g.lineStyle(2, 0xfff8dc, 1);
    g.fillStyle(0xfff8dc, 1);

    const cx = size / 2;
    const cy = size / 2 + 5;
    switch (shape) {
      case 'crown':
        g.fillTriangle(cx - 7, cy, cx, cy - 7, cx + 7, cy);
        g.fillRect(cx - 7, cy, 14, 2);
        break;
      case 'sword':
        g.fillRect(cx - 1, cy - 6, 2, 12);
        g.fillRect(cx - 4, cy - 6, 8, 2);
        break;
      case 'horse':
        g.fillRect(cx - 6, cy - 1, 12, 3);
        g.fillRect(cx - 5, cy + 2, 2, 4);
        g.fillRect(cx + 3, cy + 2, 2, 4);
        g.fillCircle(cx + 6, cy - 1, 2);
        break;
      case 'bow':
        g.beginPath();
        g.arc(cx, cy, 7, Math.PI * 1.2, Math.PI * 1.8);
        g.strokePath();
        g.lineStyle(1, 0xfff8dc, 1);
        g.lineBetween(cx - 5, cy - 4, cx + 5, cy - 4);
        break;
      case 'fan':
        g.beginPath();
        g.moveTo(cx, cy + 5);
        g.arc(cx, cy + 5, 7, Math.PI * 1.25, Math.PI * 1.75, false);
        g.closePath();
        g.fillPath();
        break;
      case 'shield':
        g.beginPath();
        g.moveTo(cx, cy - 6);
        g.lineTo(cx + 6, cy - 3);
        g.lineTo(cx + 5, cy + 5);
        g.lineTo(cx, cy + 7);
        g.lineTo(cx - 5, cy + 5);
        g.lineTo(cx - 6, cy - 3);
        g.closePath();
        g.fillPath();
        break;
      case 'dagger':
        g.fillRect(cx - 1, cy - 4, 2, 8);
        break;
    }

    g.generateTexture(key, size, size);
    g.destroy();
    return key;
  }

  ensurePortraitTexture(generalId: string, size: number = 96): string {
    const key = `portrait_${generalId}`;
    if (this.scene.textures.exists(key)) return key;

    const reg = DataRegistry.get();
    const general = reg.getGeneral(generalId);
    const color = FACTION_COLORS[general.faction];

    const g = this.scene.add.graphics({ x: 0, y: 0 });
    g.setVisible(false);

    g.fillGradientStyle(color, color, 0x1a0f08, 0x0d0704, 1);
    g.fillRect(0, 0, size, size);

    g.fillStyle(0xffecb3, 1);
    g.lineStyle(2, 0x000000, 1);
    g.fillEllipse(size / 2, size / 2 + 4, size * 0.55, size * 0.7);
    g.strokeEllipse(size / 2, size / 2 + 4, size * 0.55, size * 0.7);

    g.fillStyle(0x1a0f08, 1);
    g.fillCircle(size * 0.42, size * 0.48, 2);
    g.fillCircle(size * 0.58, size * 0.48, 2);

    g.fillStyle(0x3a2817, 1);
    g.fillRect(size * 0.3, size * 0.2, size * 0.4, size * 0.15);

    g.lineStyle(3, 0xd4af37, 1);
    g.strokeRect(1, 1, size - 2, size - 2);

    g.generateTexture(key, size, size);
    g.destroy();

    const textKey = `portrait_label_${generalId}`;
    if (!this.scene.textures.exists(textKey)) {
      const canvas = this.scene.textures.createCanvas(textKey, size, 20);
      if (canvas) {
        const ctx = canvas.getContext();
        ctx.fillStyle = 'rgba(10,6,3,0.75)';
        ctx.fillRect(0, 0, size, 20);
        ctx.fillStyle = '#e8d9a8';
        ctx.font = 'bold 14px "Nanum Myeongjo", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(general.name, size / 2, 10);
        canvas.refresh();
      }
    }

    return key;
  }

  ensureTileTextures(): void {
    const tiles: Array<{ key: string; colors: [number, number]; pattern: 'plain' | 'forest' | 'mountain' | 'water' | 'bridge' | 'wall' | 'gate' }> = [
      { key: 'tile_plain', colors: [0x6b7f4a, 0x5a6f3d], pattern: 'plain' },
      { key: 'tile_road', colors: [0x8b7355, 0x7a6247], pattern: 'plain' },
      { key: 'tile_forest', colors: [0x2d4a2d, 0x1f3a1f], pattern: 'forest' },
      { key: 'tile_mountain', colors: [0x7a6a55, 0x5a4e3f], pattern: 'mountain' },
      { key: 'tile_river', colors: [0x4a6b99, 0x2c4a70], pattern: 'water' },
      { key: 'tile_bridge', colors: [0x8b6b3a, 0x6b4e24], pattern: 'bridge' },
      { key: 'tile_wall', colors: [0x5a5a5a, 0x3a3a3a], pattern: 'wall' },
      { key: 'tile_gate', colors: [0x8b4513, 0x5a2808], pattern: 'gate' },
      { key: 'tile_camp', colors: [0x8b7355, 0x6b5337], pattern: 'plain' },
    ];

    const size = 48;
    for (const t of tiles) {
      if (this.scene.textures.exists(t.key)) continue;
      const g = this.scene.add.graphics({ x: 0, y: 0 });
      g.setVisible(false);
      g.fillStyle(t.colors[0], 1);
      g.fillRect(0, 0, size, size);
      g.fillStyle(t.colors[1], 1);

      switch (t.pattern) {
        case 'plain':
          for (let i = 0; i < 6; i++) {
            const x = (i * 13) % size;
            const y = (i * 17) % size;
            g.fillRect(x, y, 2, 2);
          }
          break;
        case 'forest':
          g.fillCircle(12, 16, 8);
          g.fillCircle(32, 20, 9);
          g.fillCircle(22, 34, 7);
          g.fillStyle(0x4a2b1a, 1);
          g.fillRect(10, 20, 2, 4);
          g.fillRect(30, 24, 2, 4);
          g.fillRect(20, 36, 2, 4);
          break;
        case 'mountain':
          g.fillTriangle(6, 42, 24, 6, 42, 42);
          g.fillStyle(0xe0dcc8, 1);
          g.fillTriangle(20, 12, 24, 6, 28, 12);
          break;
        case 'water': {
          for (let y = 4; y < size; y += 10) {
            g.lineStyle(2, t.colors[1], 0.8);
            g.beginPath();
            for (let x = 0; x < size; x += 4) {
              const wy = y + Math.sin(x * 0.4) * 2;
              if (x === 0) g.moveTo(x, wy);
              else g.lineTo(x, wy);
            }
            g.strokePath();
          }
          break;
        }
        case 'bridge':
          g.fillRect(4, 18, size - 8, 12);
          g.fillStyle(0x4a3820, 1);
          g.fillRect(4, 22, size - 8, 2);
          for (let x = 6; x < size - 6; x += 8) {
            g.fillRect(x, 18, 2, 12);
          }
          break;
        case 'wall':
          g.fillStyle(t.colors[1], 1);
          for (let y = 4; y < size; y += 12) {
            for (let x = y % 24 === 4 ? 0 : 12; x < size; x += 24) {
              g.fillRect(x, y, 20, 8);
            }
          }
          break;
        case 'gate':
          g.fillStyle(t.colors[1], 1);
          g.fillRect(14, 10, 20, size - 20);
          g.fillStyle(0xd4af37, 1);
          g.fillCircle(size / 2, size / 2, 3);
          break;
      }

      g.lineStyle(1, 0x000000, 0.2);
      g.strokeRect(0, 0, size, size);

      g.generateTexture(t.key, size, size);
      g.destroy();
    }
  }

  ensureUITextures(): void {
    const makePanel = (key: string, w: number, h: number, borderColor: number) => {
      if (this.scene.textures.exists(key)) return;
      const g = this.scene.add.graphics({ x: 0, y: 0 });
      g.setVisible(false);
      g.fillStyle(0x1a0f08, 0.92);
      g.fillRoundedRect(0, 0, w, h, 6);
      g.lineStyle(2, borderColor, 1);
      g.strokeRoundedRect(1, 1, w - 2, h - 2, 6);
      g.lineStyle(1, 0x3a2817, 0.6);
      g.strokeRoundedRect(4, 4, w - 8, h - 8, 4);
      g.generateTexture(key, w, h);
      g.destroy();
    };
    makePanel('panel_default', 240, 80, 0xd4af37);
    makePanel('panel_lg', 480, 240, 0xd4af37);
    makePanel('panel_dialogue', 880, 180, 0xd4af37);
    makePanel('panel_menu', 220, 260, 0xd4af37);

    if (!this.scene.textures.exists('cursor_select')) {
      const g = this.scene.add.graphics({ x: 0, y: 0 });
      g.setVisible(false);
      g.lineStyle(3, 0xffd866, 1);
      g.strokeRect(2, 2, 44, 44);
      g.lineStyle(1, 0xffd866, 0.6);
      g.strokeRect(5, 5, 38, 38);
      g.generateTexture('cursor_select', 48, 48);
      g.destroy();
    }

    if (!this.scene.textures.exists('highlight_move')) {
      const g = this.scene.add.graphics({ x: 0, y: 0 });
      g.setVisible(false);
      g.fillStyle(0x3b7dd8, 0.35);
      g.fillRect(0, 0, 48, 48);
      g.lineStyle(1, 0x3b7dd8, 0.7);
      g.strokeRect(0, 0, 48, 48);
      g.generateTexture('highlight_move', 48, 48);
      g.destroy();
    }

    if (!this.scene.textures.exists('highlight_attack')) {
      const g = this.scene.add.graphics({ x: 0, y: 0 });
      g.setVisible(false);
      g.fillStyle(0xc13a3a, 0.35);
      g.fillRect(0, 0, 48, 48);
      g.lineStyle(1, 0xc13a3a, 0.7);
      g.strokeRect(0, 0, 48, 48);
      g.generateTexture('highlight_attack', 48, 48);
      g.destroy();
    }
  }

  ensureTitleBackground(): void {
    const key = 'bg_title';
    if (this.scene.textures.exists(key)) return;
    const w = 960;
    const h = 640;
    const g = this.scene.add.graphics({ x: 0, y: 0 });
    g.setVisible(false);
    g.fillGradientStyle(0x1a0f08, 0x1a0f08, 0x3a2010, 0x200f08, 1);
    g.fillRect(0, 0, w, h);

    for (let i = 0; i < 40; i++) {
      const px = (i * 79) % w;
      const py = (i * 113) % h;
      g.fillStyle(0xffd866, 0.1 + 0.1 * ((i * 31) % 5) / 4);
      g.fillCircle(px, py, 1 + (i % 3));
    }

    g.fillStyle(0xffb74d, 1);
    for (let i = 0; i < 8; i++) {
      const cx = (i * 131) % w;
      const cy = h * 0.7 + ((i * 27) % 40);
      for (let p = 0; p < 5; p++) {
        const ang = (p / 5) * Math.PI * 2;
        const r = 4;
        g.fillCircle(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 2.5);
      }
    }

    g.generateTexture(key, w, h);
    g.destroy();
  }
}
