import Phaser from 'phaser';
import { BootScene } from '@/scenes/BootScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { TitleScene } from '@/scenes/TitleScene';
import { DialogueScene } from '@/scenes/DialogueScene';
import { WorldMapScene } from '@/scenes/WorldMapScene';
import { BattlePrepScene } from '@/scenes/BattlePrepScene';
import { BattleScene } from '@/scenes/BattleScene';
import { BattleUIScene } from '@/scenes/BattleUIScene';
import { EndingScene } from '@/scenes/EndingScene';
import { SettingsScene } from '@/scenes/SettingsScene';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/constants';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-root',
  backgroundColor: '#0d0704',
  pixelArt: false,
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: { width: 480, height: 320 },
    max: { width: 1920, height: 1280 },
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    DialogueScene,
    WorldMapScene,
    BattlePrepScene,
    BattleScene,
    BattleUIScene,
    EndingScene,
    SettingsScene,
  ],
};

const game = new Phaser.Game(config);

window.addEventListener('beforeunload', () => {
  game.destroy(true);
});

if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}
