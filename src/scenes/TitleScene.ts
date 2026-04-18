import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/config/constants';
import { GameState } from '@/systems/GameState';

interface MenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export class TitleScene extends Phaser.Scene {
  private items: MenuItem[] = [];
  private itemTexts: Phaser.GameObjects.Text[] = [];
  private selected = 0;
  private cursor!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.TITLE);
  }

  create() {
    this.add.image(0, 0, 'bg_title').setOrigin(0);

    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0d0704, 0.5).setOrigin(0);
    overlay.setDepth(1);

    const titleHan = this.add
      .text(GAME_WIDTH / 2, 140, '漢祖再興記', {
        fontFamily: FONT.TITLE,
        fontSize: '92px',
        color: '#d4af37',
        stroke: '#3a2010',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(GAME_WIDTH / 2, 220, '한조재흥기', {
        fontFamily: FONT.BODY,
        fontSize: '28px',
        color: '#e8d9a8',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(GAME_WIDTH / 2, 256, 'The Rise of Han · 漢末群雄傳', {
        fontFamily: FONT.ENGLISH,
        fontSize: '16px',
        color: '#8a7245',
        fontStyle: 'italic',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.tweens.add({
      targets: titleHan,
      scale: { from: 1, to: 1.04 },
      yoyo: true,
      duration: 2400,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const hasSaves = GameState.get().listSlots().some((s) => s !== null);

    this.items = [
      {
        label: '신규 유희 (New Game)',
        onSelect: () => this.startNewGame(),
      },
      {
        label: '이어서 (Continue)',
        onSelect: () => this.showLoadMenu(),
        disabled: !hasSaves,
      },
      {
        label: '설정 (Settings)',
        onSelect: () => this.scene.launch(SCENE_KEYS.SETTINGS, { from: SCENE_KEYS.TITLE }),
      },
      {
        label: '장수 열람 (Characters)',
        onSelect: () => this.showCharacters(),
      },
    ];

    const menuY = 380;
    const menuGap = 48;
    this.itemTexts = this.items.map((it, idx) => {
      const color = it.disabled ? '#5a4a2a' : '#e8d9a8';
      const t = this.add
        .text(GAME_WIDTH / 2, menuY + idx * menuGap, it.label, {
          fontFamily: FONT.BODY,
          fontSize: '22px',
          color,
        })
        .setOrigin(0.5)
        .setDepth(2)
        .setInteractive({ useHandCursor: !it.disabled });

      t.on('pointerover', () => {
        if (!it.disabled) {
          this.selected = idx;
          this.refreshSelection();
        }
      });
      t.on('pointerdown', () => {
        if (!it.disabled) it.onSelect();
      });
      return t;
    });

    this.cursor = this.add
      .text(0, 0, '◆', {
        fontFamily: FONT.BODY,
        fontSize: '22px',
        color: '#ffd866',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '↑↓ 선택 · Enter 결정 · OpenGameArt CC0 에셋 기반', {
        fontFamily: FONT.BODY,
        fontSize: '12px',
        color: '#8a7245',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 20, '© 2026 · 저작권 무관 오리지널 프로젝트', {
        fontFamily: FONT.ENGLISH,
        fontSize: '11px',
        color: '#8a7245',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.refreshSelection();
    this.bindInputs();

    void COLORS;
  }

  private bindInputs() {
    this.input.keyboard?.on('keydown-UP', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard?.on('keydown-SPACE', () => this.confirm());
  }

  private moveSelection(dir: number) {
    let next = this.selected;
    for (let i = 0; i < this.items.length; i++) {
      next = (next + dir + this.items.length) % this.items.length;
      if (!this.items[next].disabled) break;
    }
    this.selected = next;
    this.refreshSelection();
  }

  private refreshSelection() {
    this.itemTexts.forEach((t, i) => {
      const it = this.items[i];
      if (it.disabled) {
        t.setColor('#5a4a2a');
      } else if (i === this.selected) {
        t.setColor('#ffd866');
        t.setScale(1.08);
      } else {
        t.setColor('#e8d9a8');
        t.setScale(1);
      }
    });
    const target = this.itemTexts[this.selected];
    if (target) {
      this.cursor.setPosition(target.x - 170, target.y);
    }
  }

  private confirm() {
    const it = this.items[this.selected];
    if (it && !it.disabled) it.onSelect();
  }

  private startNewGame() {
    GameState.get().initNewGame('normal');
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENE_KEYS.DIALOGUE, {
        dialogueId: 'prologue_peach_garden',
        afterScene: SCENE_KEYS.WORLD_MAP,
      });
    });
  }

  private showLoadMenu() {
    const slots = GameState.get().listSlots();
    const panel = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'panel_lg').setDepth(10);
    const texts: Phaser.GameObjects.Text[] = [];
    texts.push(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, '── 이어서 ──', {
          fontFamily: FONT.BODY,
          fontSize: '20px',
          color: '#d4af37',
        })
        .setOrigin(0.5)
        .setDepth(11),
    );

    slots.forEach((s, i) => {
      let label = `슬롯 ${i + 1} · 비어있음`;
      if (s) {
        const date = new Date(s.data.timestamp).toLocaleString('ko-KR');
        label = `슬롯 ${i + 1} · ${s.data.chapter}장 · ${date}`;
      }
      const t = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30 + i * 36, label, {
          fontFamily: FONT.BODY,
          fontSize: '16px',
          color: s ? '#e8d9a8' : '#5a4a2a',
        })
        .setOrigin(0.5)
        .setDepth(11)
        .setInteractive({ useHandCursor: !!s });
      if (s) {
        t.on('pointerdown', () => {
          if (GameState.get().load(i + 1)) {
            [panel, ...texts].forEach((x) => x.destroy());
            this.scene.start(SCENE_KEYS.WORLD_MAP);
          }
        });
        t.on('pointerover', () => t.setColor('#ffd866'));
        t.on('pointerout', () => t.setColor('#e8d9a8'));
      }
      texts.push(t);
    });

    const closeBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90, '[ 닫기 ]', {
        fontFamily: FONT.BODY,
        fontSize: '14px',
        color: '#8a7245',
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      [panel, closeBtn, ...texts].forEach((x) => x.destroy());
    });
    texts.push(closeBtn);
  }

  private showCharacters() {
    this.scene.launch(SCENE_KEYS.SETTINGS, { from: SCENE_KEYS.TITLE, mode: 'characters' });
  }
}
