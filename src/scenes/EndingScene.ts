import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/config/constants';
import { DataRegistry } from '@/systems/DataRegistry';
import { GameState } from '@/systems/GameState';
import type { Battle } from '@/types';

interface EndingParams {
  victory: boolean;
  battle: Battle;
  message?: string;
}

export class EndingScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.ENDING);
  }

  create(p: EndingParams) {
    this.cameras.main.setBackgroundColor(0x0d0704);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    const title = p.victory ? '승리' : '패배';
    const color = p.victory ? '#d4af37' : '#c13a3a';

    this.add
      .text(GAME_WIDTH / 2, 120, title, {
        fontFamily: FONT.TITLE,
        fontSize: '96px',
        color,
        stroke: '#000',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 210, p.battle.title, {
        fontFamily: FONT.BODY,
        fontSize: '20px',
        color: '#e8d9a8',
      })
      .setOrigin(0.5);

    if (p.message) {
      this.add
        .text(GAME_WIDTH / 2, 240, p.message, {
          fontFamily: FONT.BODY,
          fontSize: '15px',
          color: '#8a7245',
        })
        .setOrigin(0.5);
    }

    if (p.victory) {
      const rw = p.battle.reward;
      const rewardLines = [
        `┃ 획득 경험치: ${rw.exp}`,
        `┃ 획득 금전: ${rw.gold}`,
      ];
      if (rw.items && rw.items.length > 0) {
        rewardLines.push(`┃ 입수 아이템: ${rw.items.map((id) => this.itemName(id)).join(', ')}`);
      }

      this.add
        .text(GAME_WIDTH / 2, 320, rewardLines.join('\n'), {
          fontFamily: FONT.BODY,
          fontSize: '16px',
          color: '#e8d9a8',
          lineSpacing: 8,
        })
        .setOrigin(0.5);
    }

    const next = p.battle.nextBattleId;
    if (p.victory && next) {
      let nextId: string | null = null;
      if (typeof next === 'string') nextId = next;
      else if (typeof next === 'object' && 'options' in next) nextId = next.options[0]?.next ?? null;

      if (nextId) {
        const state = GameState.get();
        state.currentBattleId = nextId;

        const reg = DataRegistry.get();
        try {
          const nb = reg.getBattle(nextId);
          this.add
            .text(GAME_WIDTH / 2, 440, `다음 전투: ${nb.title}`, {
              fontFamily: FONT.BODY,
              fontSize: '18px',
              color: '#d4af37',
            })
            .setOrigin(0.5);
        } catch {
          /* ignore */
        }
      }
    }

    const continueBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 80, p.victory ? '[ 계속 ]' : '[ 재도전 ]', {
        fontFamily: FONT.BODY,
        fontSize: '24px',
        color: '#e8d9a8',
        backgroundColor: '#1a0f08',
        padding: { x: 24, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    continueBtn.on('pointerover', () => continueBtn.setColor('#ffd866'));
    continueBtn.on('pointerout', () => continueBtn.setColor('#e8d9a8'));
    continueBtn.on('pointerdown', () => {
      if (p.victory) {
        const next = p.battle.nextBattleId;
        if (!next) {
          this.scene.start(SCENE_KEYS.TITLE);
        } else {
          this.scene.start(SCENE_KEYS.WORLD_MAP);
        }
      } else {
        this.scene.start(SCENE_KEYS.BATTLE_PREP, { battleId: p.battle.id });
      }
    });

    const titleBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '타이틀로 돌아가기', {
        fontFamily: FONT.BODY,
        fontSize: '13px',
        color: '#8a7245',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    titleBtn.on('pointerdown', () => this.scene.start(SCENE_KEYS.TITLE));
  }

  private itemName(id: string): string {
    try {
      return DataRegistry.get().getItem(id).name;
    } catch {
      return id;
    }
  }
}
