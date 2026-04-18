import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/config/constants';
import { DataRegistry } from '@/systems/DataRegistry';
import { GameState } from '@/systems/GameState';
import type { Difficulty } from '@/config/balance';

interface SettingsParams {
  from: string;
  mode?: 'settings' | 'characters';
}

export class SettingsScene extends Phaser.Scene {
  private from: string = SCENE_KEYS.TITLE;
  private mode: 'settings' | 'characters' = 'settings';

  constructor() {
    super(SCENE_KEYS.SETTINGS);
  }

  create(p: SettingsParams) {
    this.from = p.from;
    this.mode = p.mode ?? 'settings';

    this.cameras.main.setBackgroundColor(0x0d0704);
    this.add
      .text(GAME_WIDTH / 2, 40, this.mode === 'settings' ? '── 설정 ──' : '── 장수 열람 ──', {
        fontFamily: FONT.TITLE,
        fontSize: '28px',
        color: '#d4af37',
      })
      .setOrigin(0.5);

    if (this.mode === 'settings') this.renderSettings();
    else this.renderCharacters();

    const backBtn = this.add
      .text(90, 40, '← 돌아가기', {
        fontFamily: FONT.BODY,
        fontSize: '14px',
        color: '#8a7245',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start(this.from));
  }

  private renderSettings() {
    const state = GameState.get();
    this.add
      .text(GAME_WIDTH / 2, 120, '난이도', {
        fontFamily: FONT.BODY,
        fontSize: '20px',
        color: '#e8d9a8',
      })
      .setOrigin(0.5);

    const difficulties: { key: Difficulty; label: string; desc: string }[] = [
      { key: 'easy', label: '관대', desc: '처음 플레이하거나 스토리 감상용. 적 약화.' },
      { key: 'normal', label: '보통', desc: '원작(영걸전)과 유사한 난이도. 추천.' },
      { key: 'hard', label: '엄격', desc: '재도전 특화. 적 강화, 경험치 감소.' },
    ];

    const texts: Phaser.GameObjects.Text[] = [];
    difficulties.forEach((d, i) => {
      const y = 170 + i * 100;
      const t = this.add
        .text(GAME_WIDTH / 2, y, `${state.difficulty === d.key ? '◆' : '◇'}  ${d.label}`, {
          fontFamily: FONT.BODY,
          fontSize: '18px',
          color: state.difficulty === d.key ? '#ffd866' : '#e8d9a8',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      const desc = this.add
        .text(GAME_WIDTH / 2, y + 28, d.desc, {
          fontFamily: FONT.BODY,
          fontSize: '12px',
          color: '#8a7245',
        })
        .setOrigin(0.5);
      t.on('pointerdown', () => {
        state.difficulty = d.key;
        texts.forEach((x, idx) => {
          x.setText(`${difficulties[idx].key === d.key ? '◆' : '◇'}  ${difficulties[idx].label}`);
          x.setColor(difficulties[idx].key === d.key ? '#ffd866' : '#e8d9a8');
        });
      });
      texts.push(t);
      void desc;
    });
  }

  private renderCharacters() {
    const reg = DataRegistry.get();
    const all = Array.from(reg.generals.values());

    const perRow = 6;
    const cardW = 130;
    const cardH = 170;
    const startX = 80;
    const startY = 100;
    const gap = 18;

    const container = this.add.container(0, 0);
    container.setScrollFactor(0);

    all.forEach((g, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      const card = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, cardW, cardH, 0x1a0f08, 0.9).setOrigin(0).setStrokeStyle(2, 0xd4af37, 0.6);
      card.add(bg);

      const portraitKey = `portrait_${g.id}`;
      if (this.textures.exists(portraitKey)) {
        const portrait = this.add.image(cardW / 2, 60, portraitKey).setScale(0.9);
        card.add(portrait);
      }

      const name = this.add.text(cardW / 2, 115, `${g.name}`, {
        fontFamily: FONT.BODY,
        fontSize: '14px',
        color: '#e8d9a8',
      }).setOrigin(0.5);
      const hanja = this.add.text(cardW / 2, 132, g.nameHanja, {
        fontFamily: FONT.BODY,
        fontSize: '11px',
        color: '#d4af37',
      }).setOrigin(0.5);
      const cls = this.add.text(cardW / 2, 149, `${this.factionLabel(g.faction)} · ${this.classLabel(g.class)}`, {
        fontFamily: FONT.BODY,
        fontSize: '10px',
        color: '#8a7245',
      }).setOrigin(0.5);
      card.add([name, hanja, cls]);
      container.add(card);
    });
  }

  private factionLabel(f: string): string {
    const m: Record<string, string> = {
      shu: '촉',
      wei: '위',
      wu: '오',
      han: '한',
      'yellow-turban': '황건',
      neutral: '중립',
    };
    return m[f] ?? f;
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
}
