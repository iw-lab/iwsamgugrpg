import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/config/constants';
import { DataRegistry } from '@/systems/DataRegistry';
import { GameState } from '@/systems/GameState';
import type { UnitPlacement } from '@/types';

export class BattlePrepScene extends Phaser.Scene {
  private battleId!: string;

  constructor() {
    super(SCENE_KEYS.BATTLE_PREP);
  }

  create(data: { battleId: string }) {
    this.battleId = data.battleId;
    const reg = DataRegistry.get();
    const state = GameState.get();
    const battle = reg.getBattle(this.battleId);

    this.cameras.main.setBackgroundColor(0x0d0704);
    this.add
      .text(GAME_WIDTH / 2, 40, `── 출진 편성 · ${battle.title} ──`, {
        fontFamily: FONT.TITLE,
        fontSize: '24px',
        color: '#d4af37',
      })
      .setOrigin(0.5);

    const forcedIds = new Set(battle.playerForced.map((p) => p.generalId));
    const availableSlots = Math.max(0, battle.playerDeploy.length - battle.playerForced.length);

    this.add
      .text(60, 90, '강제 출전 (필수 편성)', {
        fontFamily: FONT.BODY,
        fontSize: '16px',
        color: '#ffd866',
      });
    this.drawRoster(
      battle.playerForced.map((p) => ({ id: p.generalId, forced: true })),
      60,
      120,
    );

    this.add
      .text(60, 280, `선택 편성 (남은 자리 ${availableSlots})`, {
        fontFamily: FONT.BODY,
        fontSize: '16px',
        color: '#e8d9a8',
      });

    const availableGenerals = state.roster
      .filter((r) => !forcedIds.has(r.generalId))
      .map((r) => ({ id: r.generalId, forced: false }));

    const selected: Set<string> = new Set();
    const entries = this.drawRoster(availableGenerals, 60, 310, true, (id, on) => {
      if (on) {
        if (selected.size < availableSlots) selected.add(id);
      } else {
        selected.delete(id);
      }
      slotsLabel.setText(`선택한 장수: ${selected.size} / ${availableSlots}`);
    });

    const slotsLabel = this.add.text(60, 260, `선택한 장수: 0 / ${availableSlots}`, {
      fontFamily: FONT.BODY,
      fontSize: '13px',
      color: '#8a7245',
    });

    const startBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '[ 전투 시작 ]', {
        fontFamily: FONT.BODY,
        fontSize: '22px',
        color: '#e8d9a8',
        backgroundColor: '#1a0f08',
        padding: { x: 24, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    startBtn.on('pointerover', () => startBtn.setColor('#ffd866'));
    startBtn.on('pointerout', () => startBtn.setColor('#e8d9a8'));
    startBtn.on('pointerdown', () => this.startBattle(selected));

    const backBtn = this.add
      .text(90, GAME_HEIGHT - 60, '← 돌아가기', {
        fontFamily: FONT.BODY,
        fontSize: '14px',
        color: '#8a7245',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start(SCENE_KEYS.WORLD_MAP));

    void entries;
  }

  private drawRoster(
    items: Array<{ id: string; forced: boolean }>,
    startX: number,
    startY: number,
    selectable: boolean = false,
    onToggle?: (id: string, on: boolean) => void,
  ): Phaser.GameObjects.Container[] {
    const reg = DataRegistry.get();
    const state = GameState.get();
    const containers: Phaser.GameObjects.Container[] = [];
    const perRow = 6;
    const gap = 140;
    const rowH = 150;

    items.forEach((it, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = startX + col * gap;
      const y = startY + row * rowH;

      const rosterEntry = state.roster.find((r) => r.generalId === it.id);
      const level = rosterEntry?.level ?? 1;
      const general = reg.getGeneral(it.id);

      const card = this.add.container(x, y);
      const bg = this.add
        .rectangle(0, 0, 128, 140, 0x1a0f08, 0.9)
        .setOrigin(0)
        .setStrokeStyle(2, it.forced ? 0xffd866 : 0xd4af37, it.forced ? 1 : 0.6);
      card.add(bg);

      const portraitKey = `portrait_${it.id}`;
      if (this.textures.exists(portraitKey)) {
        const portrait = this.add.image(64, 48, portraitKey).setScale(0.8);
        card.add(portrait);
      }

      const nameTxt = this.add
        .text(64, 95, general.name, {
          fontFamily: FONT.BODY,
          fontSize: '14px',
          color: '#e8d9a8',
        })
        .setOrigin(0.5);
      card.add(nameTxt);

      const classLabel = this.classLabel(general.class);
      const lvlTxt = this.add
        .text(64, 114, `Lv ${level} · ${classLabel}`, {
          fontFamily: FONT.BODY,
          fontSize: '11px',
          color: '#8a7245',
        })
        .setOrigin(0.5);
      card.add(lvlTxt);

      if (it.forced) {
        const forcedTag = this.add
          .text(64, 130, '강제 출전', {
            fontFamily: FONT.BODY,
            fontSize: '11px',
            color: '#ffd866',
          })
          .setOrigin(0.5);
        card.add(forcedTag);
      }

      if (selectable) {
        bg.setInteractive({ useHandCursor: true });
        let on = false;
        bg.on('pointerdown', () => {
          on = !on;
          bg.setStrokeStyle(2, on ? 0x57a957 : 0xd4af37, on ? 1 : 0.6);
          if (onToggle) onToggle(it.id, on);
        });
      }

      containers.push(card);
    });
    return containers;
  }

  private classLabel(cls: string): string {
    const m: Record<string, string> = {
      lord: '군주',
      cavalry: '기병',
      infantry: '보병',
      archer: '궁병',
      strategist: '책사',
      guard: '호위',
      assassin: '자객',
    };
    return m[cls] ?? cls;
  }

  private startBattle(selected: Set<string>) {
    const reg = DataRegistry.get();
    const state = GameState.get();
    const battle = reg.getBattle(this.battleId);
    const deployCells = [...battle.playerDeploy];

    const placements: UnitPlacement[] = [...battle.playerForced];
    const usedCells = new Set(placements.map((p) => `${p.x},${p.y}`));
    for (const id of selected) {
      const cell = deployCells.find((c) => !usedCells.has(`${c.x},${c.y}`));
      if (!cell) break;
      placements.push({ generalId: id, x: cell.x, y: cell.y });
      usedCells.add(`${cell.x},${cell.y}`);
    }

    this.scene.start(SCENE_KEYS.BATTLE, {
      battleId: this.battleId,
      playerPlacements: placements,
    });
  }
}
