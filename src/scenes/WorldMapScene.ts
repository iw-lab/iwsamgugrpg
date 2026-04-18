import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/config/constants';
import { GameState } from '@/systems/GameState';
import { DataRegistry } from '@/systems/DataRegistry';

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.WORLD_MAP);
  }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0);

    const g = this.add.graphics();
    g.fillGradientStyle(0x1a2a1a, 0x1a2a1a, 0x2a1a10, 0x2a1a10, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 16; i++) {
      const x = ((i * 173) % GAME_WIDTH);
      const y = ((i * 89) % (GAME_HEIGHT - 200)) + 50;
      g.fillStyle(0x2d4a2d, 0.6);
      g.fillCircle(x, y, 10 + (i % 3) * 3);
    }
    for (let i = 0; i < 6; i++) {
      const x = 100 + i * 130;
      const y = 300 + Math.sin(i) * 40;
      g.fillStyle(0x5a4e3f, 1);
      g.fillTriangle(x - 30, y + 30, x, y - 20, x + 30, y + 30);
    }

    this.add
      .text(GAME_WIDTH / 2, 40, '── 천하도 (天下圖) ──', {
        fontFamily: FONT.TITLE,
        fontSize: '28px',
        color: '#d4af37',
      })
      .setOrigin(0.5);

    const state = GameState.get();
    const reg = DataRegistry.get();

    let battle;
    try {
      battle = reg.getBattle(state.currentBattleId);
    } catch {
      battle = reg.getBattle('ch1_01_yellow_turban');
      state.currentBattleId = battle.id;
    }

    this.add
      .text(GAME_WIDTH / 2, 90, `제 ${battle.chapter}장 · ${battle.location}`, {
        fontFamily: FONT.BODY,
        fontSize: '18px',
        color: '#e8d9a8',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 120, battle.year, {
        fontFamily: FONT.BODY,
        fontSize: '14px',
        color: '#8a7245',
      })
      .setOrigin(0.5);

    const panel = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 200, 'panel_dialogue');

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 260, battle.title, {
        fontFamily: FONT.TITLE,
        fontSize: '32px',
        color: '#d4af37',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 220, battle.subtitle, {
        fontFamily: FONT.BODY,
        fontSize: '16px',
        color: '#e8d9a8',
      })
      .setOrigin(0.5);

    const objLabel = this.formatObjective(battle.objective, battle.turnLimit);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 180, objLabel, {
        fontFamily: FONT.BODY,
        fontSize: '14px',
        color: '#ffd866',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 155, `패배 조건: ${this.formatDefeat(battle.defeat)}`, {
        fontFamily: FONT.BODY,
        fontSize: '13px',
        color: '#c13a3a',
      })
      .setOrigin(0.5);

    const startBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 90, '[ 출진 (Start Battle) ]', {
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
    startBtn.on('pointerdown', () => {
      const pre = battle.preDialogue;
      if (pre && !state.flags[`dialogue_${pre}_shown`] && reg.getDialogue(pre)) {
        state.flags[`dialogue_${pre}_shown`] = true;
        this.scene.start(SCENE_KEYS.DIALOGUE, {
          dialogueId: pre,
          afterScene: SCENE_KEYS.BATTLE_PREP,
          afterData: { battleId: battle.id },
        });
      } else {
        this.scene.start(SCENE_KEYS.BATTLE_PREP, { battleId: battle.id });
      }
    });

    const saveBtn = this.add
      .text(GAME_WIDTH - 100, 40, '[ 저장 ]', {
        fontFamily: FONT.BODY,
        fontSize: '14px',
        color: '#e8d9a8',
        backgroundColor: '#1a0f08',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    saveBtn.on('pointerdown', () => this.showSaveMenu());

    const titleBtn = this.add
      .text(90, 40, '← 타이틀', {
        fontFamily: FONT.BODY,
        fontSize: '14px',
        color: '#8a7245',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    titleBtn.on('pointerdown', () => this.scene.start(SCENE_KEYS.TITLE));

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, `금: ${state.gold}   ·   아군: ${state.roster.length}명   ·   난이도: ${state.difficulty}`, {
        fontFamily: FONT.BODY,
        fontSize: '13px',
        color: '#8a7245',
      })
      .setOrigin(0.5);

    void panel;
  }

  private formatObjective(obj: ReturnType<typeof GameState.prototype.toSaveData>['roster'] extends never ? never : any, turnLimit?: number): string {
    switch (obj.victory) {
      case 'defeat-all':
        return '승리 조건: 적 전멸' + (turnLimit ? ` (${turnLimit}턴 이내)` : '');
      case 'defeat-boss':
        return '승리 조건: 적장 격파';
      case 'seize':
        return '승리 조건: 지정 지점 점령';
      case 'survive':
        return `승리 조건: ${obj.survivalTurns ?? turnLimit}턴 생존`;
      case 'escort':
        return '승리 조건: 호위 대상 생존';
      default:
        return '승리 조건: -';
    }
  }

  private formatDefeat(def: string[]): string {
    return def
      .map((d) => {
        if (d === 'liubei-falls') return '유비 전사';
        if (d === 'turn-limit') return '시간 초과';
        return d;
      })
      .join(' · ');
  }

  private showSaveMenu() {
    const slots = GameState.get().listSlots();
    const panel = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'panel_lg').setDepth(20);
    const texts: Phaser.GameObjects.Text[] = [];
    texts.push(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, '── 저장 ──', {
          fontFamily: FONT.BODY,
          fontSize: '20px',
          color: '#d4af37',
        })
        .setOrigin(0.5)
        .setDepth(21),
    );
    slots.forEach((s, i) => {
      let label = `슬롯 ${i + 1} · 비어있음`;
      if (s) {
        const date = new Date(s.data.timestamp).toLocaleString('ko-KR');
        label = `슬롯 ${i + 1} · ${date}`;
      }
      const t = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30 + i * 36, label, {
          fontFamily: FONT.BODY,
          fontSize: '16px',
          color: '#e8d9a8',
        })
        .setOrigin(0.5)
        .setDepth(21)
        .setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        GameState.get().save(i + 1);
        t.setText(`슬롯 ${i + 1} · 저장 완료!`).setColor('#57a957');
        this.time.delayedCall(800, () => {
          [panel, closeBtn, ...texts].forEach((x) => x.destroy());
        });
      });
      t.on('pointerover', () => t.setColor('#ffd866'));
      t.on('pointerout', () => t.setColor('#e8d9a8'));
      texts.push(t);
    });
    const closeBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90, '[ 닫기 ]', {
        fontFamily: FONT.BODY,
        fontSize: '14px',
        color: '#8a7245',
      })
      .setOrigin(0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      [panel, closeBtn, ...texts].forEach((x) => x.destroy());
    });
  }
}
