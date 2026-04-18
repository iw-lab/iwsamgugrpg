export type Faction = 'shu' | 'wei' | 'wu' | 'han' | 'yellow-turban' | 'neutral';

export type UnitClass =
  | 'infantry'
  | 'cavalry'
  | 'archer'
  | 'strategist'
  | 'guard'
  | 'lord'
  | 'assassin';

export type TerrainType =
  | 'plain'
  | 'forest'
  | 'mountain'
  | 'river'
  | 'bridge'
  | 'road'
  | 'wall'
  | 'gate'
  | 'camp';

export interface General {
  id: string;
  name: string;
  nameHanja: string;
  faction: Faction;
  class: UnitClass;
  portrait: string;
  sprite: string;
  base: {
    hp: number;
    atk: number;
    def: number;
    intel: number;
    mov: number;
    morale: number;
  };
  growth: {
    hp: [number, number];
    atk: [number, number];
    def: [number, number];
    intel: [number, number];
  };
  skills: string[];
  traits?: string[];
  bio: string;
}

export interface Skill {
  id: string;
  name: string;
  type: 'active' | 'passive' | 'duel';
  category: 'attack' | 'magic' | 'support' | 'movement';
  range: number;
  aoe: number;
  cost: number;
  cooldown?: number;
  power: number;
  effect?: string;
  description: string;
  requiresClass?: UnitClass[];
}

export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable';
  slot?: 'main' | 'sub' | 'head' | 'body' | 'trinket';
  stats: Partial<{
    atk: number;
    def: number;
    intel: number;
    mov: number;
    hp: number;
    critical: number;
    range: number;
  }>;
  classRestrict?: UnitClass[];
  description: string;
}

export interface UnitPlacement {
  generalId: string;
  x: number;
  y: number;
  level?: number;
  ai?: 'guard' | 'aggressive' | 'passive' | 'lord' | 'patrol';
  items?: string[];
}

export interface MapLayer {
  width: number;
  height: number;
  terrain: TerrainType[][];
  spawnZones?: { x: number; y: number }[];
}

export interface BattleEvent {
  id: string;
  trigger:
    | { type: 'turn-start'; turn: number }
    | { type: 'enemy-killed'; generalId: string }
    | { type: 'unit-moved'; generalId: string; x: number; y: number }
    | { type: 'hp-below'; generalId: string; percent: number }
    | { type: 'battle-end'; victory: boolean };
  action:
    | { type: 'dialogue'; id: string }
    | { type: 'duel'; attacker: string; defender: string }
    | { type: 'reinforce'; units: UnitPlacement[]; side: 'player' | 'enemy' }
    | { type: 'choice'; id: string }
    | { type: 'recruit'; generalId: string };
}

export interface Battle {
  id: string;
  chapter: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
  location: string;
  year: string;
  turnLimit?: number;
  objective: {
    victory: 'defeat-all' | 'defeat-boss' | 'seize' | 'survive' | 'escort';
    targetId?: string;
    seizePos?: { x: number; y: number };
    survivalTurns?: number;
  };
  defeat: Array<'liubei-falls' | 'turn-limit' | 'custom'>;
  map: MapLayer;
  playerDeploy: { x: number; y: number }[];
  playerForced: UnitPlacement[];
  enemyUnits: UnitPlacement[];
  events: BattleEvent[];
  reward: {
    exp: number;
    gold: number;
    items?: string[];
  };
  preDialogue?: string;
  postDialogue?: string;
  nextBattleId?: string | { choice: string; options: { label: string; next: string }[] };
}

export interface RuntimeUnit {
  uid: string;
  generalId: string;
  side: 'player' | 'enemy';
  level: number;
  exp: number;
  hp: number;
  hpMax: number;
  atk: number;
  def: number;
  intel: number;
  mov: number;
  morale: number;
  moraleMax: number;
  x: number;
  y: number;
  hasMoved: boolean;
  hasActed: boolean;
  items: string[];
  ai?: 'guard' | 'aggressive' | 'passive' | 'lord' | 'patrol';
  statusEffects: StatusEffect[];
}

export interface StatusEffect {
  id: string;
  kind: 'burn' | 'heal' | 'buff-atk' | 'buff-def' | 'debuff-atk' | 'debuff-def' | 'charm' | 'stun';
  duration: number;
  magnitude: number;
}

export interface DialogueLine {
  speaker: string;
  portrait?: string;
  text: string;
  emotion?: 'neutral' | 'happy' | 'angry' | 'sad' | 'serious';
}

export interface DialogueScene {
  id: string;
  title?: string;
  background?: string;
  bgm?: string;
  lines: DialogueLine[];
  choices?: { label: string; next: string }[];
}

export interface SaveData {
  version: number;
  slot: number;
  timestamp: number;
  chapter: number;
  currentBattleId: string;
  clearedBattles: string[];
  roster: Array<{
    generalId: string;
    level: number;
    exp: number;
    items: string[];
  }>;
  gold: number;
  inventory: string[];
  flags: Record<string, boolean | number | string>;
  playtime: number;
}
