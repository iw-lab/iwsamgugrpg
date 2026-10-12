import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/config/constants';
import { DataRegistry } from '@/systems/DataRegistry';
import { AssetGenerator } from '@/systems/AssetGenerator';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  preload() {
    // 반응(주스) 효과음 — gen-sfx.py 레시피(hit_soft·crit·ko_punch·powerup·win)로 생성.
    const base = import.meta.env.BASE_URL || './';
    this.load.audio('sfx_hit', `${base}assets/audio/hit_soft.wav`);
    this.load.audio('sfx_crit', `${base}assets/audio/crit.wav`);
    this.load.audio('sfx_kill', `${base}assets/audio/ko_punch.wav`);
    this.load.audio('sfx_levelup', `${base}assets/audio/powerup.wav`);
    this.load.audio('sfx_victory', `${base}assets/audio/win.wav`);
  }

  async create() {
    const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.BG).setOrigin(0);
    bg.setStrokeStyle(1, COLORS.PANEL_BORDER, 0.3);

    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, '漢祖再興記', {
        fontFamily: FONT.TITLE,
        fontSize: '48px',
        color: '#d4af37',
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, '한조재흥기 · The Rise of Han', {
        fontFamily: FONT.BODY,
        fontSize: '16px',
        color: '#8a7245',
      })
      .setOrigin(0.5);

    const progressText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, '데이터 로딩 중...', {
        fontFamily: FONT.BODY,
        fontSize: '14px',
        color: '#e8d9a8',
      })
      .setOrigin(0.5);

    const barBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, 400, 10, 0x1a0f08).setOrigin(0.5);
    barBg.setStrokeStyle(1, COLORS.PANEL_BORDER);
    const bar = this.add.rectangle(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 + 70, 0, 8, COLORS.PANEL_BORDER).setOrigin(0, 0.5);

    const setProgress = (p: number, label: string) => {
      bar.width = 400 * p;
      progressText.setText(label);
    };

    try {
      setProgress(0.1, '장수 데이터 불러오는 중...');
      await DataRegistry.get().loadAll();
      setProgress(0.4, '스프라이트 생성 중...');

      const gen = new AssetGenerator(this);
      gen.ensureAllUnitTextures();
      setProgress(0.65, '타일셋 생성 중...');
      gen.ensureTileTextures();
      setProgress(0.8, 'UI 준비 중...');
      gen.ensureUITextures();
      gen.ensureTitleBackground();
      setProgress(1.0, '준비 완료');

      this.time.delayedCall(300, () => {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.classList.add('hidden');
        this.scene.start(SCENE_KEYS.TITLE);
      });
    } catch (err) {
      console.error('[Preload] Failed:', err);
      progressText.setText(`로딩 실패: ${String(err)}`).setColor('#c13a3a');
    }

    void title;
    void subtitle;
  }
}
