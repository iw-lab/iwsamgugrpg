import type { SaveData } from '@/types';
import { SAVE_KEY_PREFIX, SAVE_VERSION } from '@/config/constants';
import type { Difficulty } from '@/config/balance';

export interface RosterEntry {
  generalId: string;
  level: number;
  exp: number;
  items: string[];
}

export class GameState {
  private static instance: GameState | null = null;

  chapter: number = 1;
  currentBattleId: string = 'ch1_01_yellow_turban';
  clearedBattles: Set<string> = new Set();
  roster: RosterEntry[] = [];
  gold: number = 0;
  inventory: string[] = [];
  flags: Record<string, boolean | number | string> = {};
  difficulty: Difficulty = 'normal';
  playtimeMs: number = 0;
  sessionStart: number = Date.now();

  static get(): GameState {
    if (!this.instance) this.instance = new GameState();
    return this.instance;
  }

  initNewGame(difficulty: Difficulty = 'normal'): void {
    this.chapter = 1;
    this.currentBattleId = 'ch1_01_yellow_turban';
    this.clearedBattles.clear();
    this.roster = [
      { generalId: 'liubei', level: 1, exp: 0, items: ['sword_cixia', 'horse_dilu', 'talisman_peach'] },
      { generalId: 'guanyu', level: 1, exp: 0, items: ['guandao_azure'] },
      { generalId: 'zhangfei', level: 1, exp: 0, items: ['spear_serpent'] },
    ];
    this.gold = 500;
    this.inventory = ['potion_small', 'potion_small', 'potion_small'];
    this.flags = {};
    this.difficulty = difficulty;
    this.playtimeMs = 0;
    this.sessionStart = Date.now();
  }

  addGeneral(generalId: string, level: number = 1): void {
    if (this.roster.some((r) => r.generalId === generalId)) return;
    this.roster.push({ generalId, level, exp: 0, items: [] });
  }

  getRoster(generalId: string): RosterEntry | undefined {
    return this.roster.find((r) => r.generalId === generalId);
  }

  addGold(amount: number): void {
    this.gold = Math.max(0, this.gold + amount);
  }

  addItem(itemId: string): void {
    this.inventory.push(itemId);
  }

  removeItem(itemId: string): boolean {
    const idx = this.inventory.indexOf(itemId);
    if (idx < 0) return false;
    this.inventory.splice(idx, 1);
    return true;
  }

  markCleared(battleId: string): void {
    this.clearedBattles.add(battleId);
  }

  toSaveData(slot: number): SaveData {
    this.playtimeMs += Date.now() - this.sessionStart;
    this.sessionStart = Date.now();
    return {
      version: SAVE_VERSION,
      slot,
      timestamp: Date.now(),
      chapter: this.chapter,
      currentBattleId: this.currentBattleId,
      clearedBattles: Array.from(this.clearedBattles),
      roster: this.roster.map((r) => ({ ...r, items: [...r.items] })),
      gold: this.gold,
      inventory: [...this.inventory],
      flags: { ...this.flags },
      playtime: this.playtimeMs,
    };
  }

  fromSaveData(data: SaveData): void {
    if (data.version !== SAVE_VERSION) {
      console.warn(`Save version mismatch: ${data.version} vs ${SAVE_VERSION}`);
    }
    this.chapter = data.chapter;
    this.currentBattleId = data.currentBattleId;
    this.clearedBattles = new Set(data.clearedBattles);
    this.roster = data.roster.map((r) => ({ ...r, items: [...r.items] }));
    this.gold = data.gold;
    this.inventory = [...data.inventory];
    this.flags = { ...data.flags };
    this.playtimeMs = data.playtime;
    this.sessionStart = Date.now();
  }

  save(slot: number): void {
    try {
      const data = this.toSaveData(slot);
      localStorage.setItem(`${SAVE_KEY_PREFIX}${slot}`, JSON.stringify(data));
      console.log(`[Save] slot ${slot} saved at ${new Date(data.timestamp).toLocaleString()}`);
    } catch (e) {
      console.error('[Save] Failed', e);
    }
  }

  load(slot: number): boolean {
    try {
      const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slot}`);
      if (!raw) return false;
      const data = JSON.parse(raw) as SaveData;
      this.fromSaveData(data);
      return true;
    } catch (e) {
      console.error('[Save] Load failed', e);
      return false;
    }
  }

  listSlots(): Array<{ slot: number; data: SaveData } | null> {
    const out: Array<{ slot: number; data: SaveData } | null> = [];
    for (let i = 1; i <= 3; i++) {
      const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${i}`);
      if (raw) {
        try {
          out.push({ slot: i, data: JSON.parse(raw) });
        } catch {
          out.push(null);
        }
      } else {
        out.push(null);
      }
    }
    return out;
  }

  deleteSlot(slot: number): void {
    localStorage.removeItem(`${SAVE_KEY_PREFIX}${slot}`);
  }
}
