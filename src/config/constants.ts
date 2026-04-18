export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

export const TILE = {
  SIZE: 48,
  HALF: 24,
} as const;

export const COLORS = {
  BG: 0x0d0704,
  PANEL: 0x1a0f08,
  PANEL_BORDER: 0xd4af37,
  TEXT: 0xe8d9a8,
  TEXT_DIM: 0x8a7245,
  PLAYER: 0x3b7dd8,
  ENEMY: 0xc13a3a,
  ALLY: 0x57a957,
  MOVE_RANGE: 0x3b7dd8,
  ATTACK_RANGE: 0xc13a3a,
  SELECTED: 0xffd866,
  HP_GOOD: 0x57a957,
  HP_MID: 0xe6a23c,
  HP_LOW: 0xc13a3a,
} as const;

export const FONT = {
  TITLE: '"Nanum Myeongjo", serif',
  BODY: '"Nanum Myeongjo", serif',
  ENGLISH: '"Cinzel", serif',
} as const;

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  TITLE: 'TitleScene',
  WORLD_MAP: 'WorldMapScene',
  BATTLE_PREP: 'BattlePrepScene',
  BATTLE: 'BattleScene',
  BATTLE_UI: 'BattleUIScene',
  DIALOGUE: 'DialogueScene',
  DUEL: 'DuelScene',
  BASE: 'BaseScene',
  ENDING: 'EndingScene',
  SETTINGS: 'SettingsScene',
} as const;

export const INPUT_KEYS = {
  CONFIRM: 'Enter',
  CANCEL: 'Escape',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  MENU: 'Tab',
  SAVE: 'F5',
  LOAD: 'F9',
} as const;

export const SAVE_VERSION = 1;
export const SAVE_KEY_PREFIX = 'yungkuljun:save:';
