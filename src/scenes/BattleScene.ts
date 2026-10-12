import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS, TILE } from '@/config/constants';
import { DataRegistry } from '@/systems/DataRegistry';
import { GameState } from '@/systems/GameState';
import { createRuntimeUnit, gainExp } from '@/systems/UnitFactory';
import { parseMap } from '@/systems/MapLoader';
import { decideEnemyTurn } from '@/systems/AI';
import { computeAttackRange, computeReachable, findPath, manhattan } from '@/utils/pathfinding';
import type { GridCell } from '@/utils/pathfinding';
import { canRetaliate, computeDamage } from '@/utils/damage';
import { EXP } from '@/config/balance';
import type { Battle, RuntimeUnit, UnitPlacement } from '@/types';
import { createJuice } from '@/juice/juice.js';
import type { JuiceChannel } from '@/juice/juice.js';
import { JUICE, JUICE_SFX } from '@/juice/reactions';

type Phase =
  | 'start'
  | 'player-turn'
  | 'enemy-turn'
  | 'animating'
  | 'dialogue'
  | 'end';

interface SelectionState {
  unit: RuntimeUnit | null;
  reachable: Map<string, number> | null;
  attackRange: Set<string> | null;
  mode: 'idle' | 'move' | 'action' | 'attack';
  plannedDest?: { x: number; y: number };
  origPos?: { x: number; y: number };
}

export class BattleScene extends Phaser.Scene {
  private battle!: Battle;
  private grid: GridCell[][] = [];
  private tileLayer!: Phaser.GameObjects.Container;
  private highlightLayer!: Phaser.GameObjects.Container;
  private unitLayer!: Phaser.GameObjects.Container;
  private units: RuntimeUnit[] = [];
  private unitSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private turn = 1;
  private phase: Phase = 'start';
  private currentSide: 'player' | 'enemy' = 'player';
  private sel: SelectionState = { unit: null, reachable: null, attackRange: null, mode: 'idle' };
  private cursor!: Phaser.GameObjects.Image;
  private offsetX = 0;
  private offsetY = 0;
  private mapWidthPx = 0;
  private mapHeightPx = 0;
  private firedEvents: Set<string> = new Set();
  private seized = false;
  private J!: ReturnType<typeof createJuice>;

  constructor() {
    super(SCENE_KEYS.BATTLE);
  }

  init() {
    this.units = [];
    this.unitSprites = new Map();
    this.firedEvents = new Set();
    this.seized = false;
    this.turn = 1;
    this.phase = 'start';
    this.currentSide = 'player';
    this.sel = { unit: null, reachable: null, attackRange: null, mode: 'idle' };
  }

  create(data: { battleId: string; playerPlacements: UnitPlacement[] }) {
    const reg = DataRegistry.get();
    this.battle = reg.getBattle(data.battleId);
    this.grid = parseMap(this.battle.map);
    this.mapWidthPx = this.battle.map.width * TILE.SIZE;
    this.mapHeightPx = this.battle.map.height * TILE.SIZE;
    this.offsetX = Math.floor((GAME_WIDTH - this.mapWidthPx) / 2);
    this.offsetY = Math.max(60, Math.floor((GAME_HEIGHT - this.mapHeightPx) / 2) - 20);

    this.cameras.main.setBackgroundColor(0x0d0704);
    this.drawTiles();

    this.highlightLayer = this.add.container(this.offsetX, this.offsetY);
    this.unitLayer = this.add.container(this.offsetX, this.offsetY);

    this.cursor = this.add.image(-100, -100, 'cursor_select').setOrigin(0).setDepth(5);

    this.J = createJuice({
      table: JUICE as Record<string, JuiceChannel[]>,
      sfx: (name: string, { rate, vol }: { rate: number; vol: number }) => {
        const key = JUICE_SFX[name];
        if (key) this.sound.play(key, { rate, volume: vol ?? 1 });
      },
    });

    this.spawnPlayers(data.playerPlacements);
    this.spawnEnemies();

    this.scene.launch(SCENE_KEYS.BATTLE_UI, { battle: this.battle });

    this.bindInput();

    this.events.once('shutdown', () => {
      this.time.timeScale = 1;
      this.tweens.timeScale = 1;
      this.J?.destroy();
    });

    this.time.delayedCall(350, () => {
      this.events.emit('battle:turn-announce', { side: 'player', turn: 1 });
      this.phase = 'player-turn';
      this.fireTurnStartEvents();
    });
  }

  private drawTiles() {
    this.tileLayer = this.add.container(this.offsetX, this.offsetY);
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const t = this.grid[y][x];
        const key = this.terrainToTexture(t.terrain);
        const img = this.add.image(x * TILE.SIZE, y * TILE.SIZE, key).setOrigin(0);
        this.tileLayer.add(img);
      }
    }
  }

  private terrainToTexture(terrain: string): string {
    const m: Record<string, string> = {
      plain: 'tile_plain',
      road: 'tile_road',
      forest: 'tile_forest',
      mountain: 'tile_mountain',
      river: 'tile_river',
      bridge: 'tile_bridge',
      wall: 'tile_wall',
      gate: 'tile_gate',
      camp: 'tile_camp',
    };
    return m[terrain] ?? 'tile_plain';
  }

  private spawnPlayers(placements: UnitPlacement[]) {
    const state = GameState.get();
    for (const p of placements) {
      const roster = state.getRoster(p.generalId);
      const level = roster?.level ?? p.level ?? 1;
      const items = roster?.items ?? p.items ?? [];
      const unit = createRuntimeUnit({
        generalId: p.generalId,
        side: 'player',
        level,
        x: p.x,
        y: p.y,
        items,
        ai: 'lord',
      });
      this.addUnit(unit);
    }
  }

  private spawnEnemies() {
    for (const p of this.battle.enemyUnits) {
      const unit = createRuntimeUnit({
        generalId: p.generalId,
        side: 'enemy',
        level: p.level ?? 1,
        x: p.x,
        y: p.y,
        items: p.items ?? [],
        ai: p.ai,
        difficulty: GameState.get().difficulty,
      });
      this.addUnit(unit);
    }
  }

  private addUnit(unit: RuntimeUnit) {
    this.units.push(unit);
    this.grid[unit.y][unit.x].occupant = unit;
    const container = this.buildUnitSprite(unit);
    this.unitLayer.add(container);
    this.unitSprites.set(unit.uid, container);
  }

  private buildUnitSprite(unit: RuntimeUnit): Phaser.GameObjects.Container {
    const c = this.add.container(unit.x * TILE.SIZE + TILE.HALF, unit.y * TILE.SIZE + TILE.HALF);
    const tint = unit.side === 'player' ? 0x3b7dd8 : 0xc13a3a;
    const ring = this.add.circle(0, 4, 18, tint, 0.35);
    const img = this.add.image(0, 0, `unit_${unit.generalId}`).setOrigin(0.5);
    const hpBar = this.add.rectangle(0, 20, 36, 4, 0x57a957).setOrigin(0.5);
    const hpBarBg = this.add.rectangle(0, 20, 36, 4, 0x000000, 0.6).setOrigin(0.5);
    const general = DataRegistry.get().getGeneral(unit.generalId);
    const nameLabel = this.add
      .text(0, -28, general.name, {
        fontFamily: FONT.BODY,
        fontSize: '11px',
        color: unit.side === 'player' ? '#e8d9a8' : '#fca5a5',
        backgroundColor: 'rgba(10,6,3,0.7)',
        padding: { x: 4, y: 1 },
      })
      .setOrigin(0.5);
    c.add([ring, hpBarBg, hpBar, img, nameLabel]);
    c.setData('hpBar', hpBar);
    c.setData('ring', ring);
    return c;
  }

  private updateUnitSprite(unit: RuntimeUnit) {
    const c = this.unitSprites.get(unit.uid);
    if (!c) return;
    c.setPosition(unit.x * TILE.SIZE + TILE.HALF, unit.y * TILE.SIZE + TILE.HALF);
    const hpBar = c.getData('hpBar') as Phaser.GameObjects.Rectangle;
    const ratio = Math.max(0, unit.hp / unit.hpMax);
    hpBar.width = 36 * ratio;
    hpBar.fillColor = ratio > 0.5 ? 0x57a957 : ratio > 0.25 ? 0xe6a23c : 0xc13a3a;

    if (unit.side === 'player') {
      c.setAlpha(unit.hasActed ? 0.5 : 1);
    }
  }

  private bindInput() {
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onHover(p));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onClick(p));
    this.input.keyboard?.on('keydown-ESC', () => this.onCancel());
    this.input.keyboard?.on('keydown-TAB', () => this.cycleUnit());
    this.input.keyboard?.on('keydown-ENTER', () => this.endPlayerTurn());
    this.input.keyboard?.on('keydown-F1', () => this.showHelp());
  }

  private screenToTile(px: number, py: number): { x: number; y: number } | null {
    const lx = px - this.offsetX;
    const ly = py - this.offsetY;
    if (lx < 0 || ly < 0) return null;
    const x = Math.floor(lx / TILE.SIZE);
    const y = Math.floor(ly / TILE.SIZE);
    if (x >= this.battle.map.width || y >= this.battle.map.height) return null;
    return { x, y };
  }

  private onHover(p: Phaser.Input.Pointer) {
    const t = this.screenToTile(p.x, p.y);
    if (!t) {
      this.cursor.setPosition(-100, -100);
      return;
    }
    this.cursor.setPosition(this.offsetX + t.x * TILE.SIZE, this.offsetY + t.y * TILE.SIZE);
    this.events.emit('battle:hover', { x: t.x, y: t.y, cell: this.grid[t.y][t.x] });
  }

  private onClick(p: Phaser.Input.Pointer) {
    if (this.phase !== 'player-turn') return;
    const t = this.screenToTile(p.x, p.y);
    if (!t) return;
    const cell = this.grid[t.y][t.x];

    switch (this.sel.mode) {
      case 'idle':
        if (cell.occupant && cell.occupant.side === 'player' && !cell.occupant.hasActed) {
          this.beginSelection(cell.occupant);
        } else if (cell.occupant) {
          this.events.emit('battle:inspect', cell.occupant);
        }
        break;
      case 'move':
        if (cell.occupant && cell.occupant.uid === this.sel.unit?.uid) {
          this.enterActionMenu();
        } else if (this.sel.reachable?.has(`${t.x},${t.y}`) && !cell.occupant) {
          this.moveUnitTo(t.x, t.y);
        } else {
          this.onCancel();
        }
        break;
      case 'attack': {
        const target = cell.occupant;
        if (target && target.side === 'enemy' && this.sel.attackRange?.has(`${t.x},${t.y}`)) {
          this.performAttack(this.sel.unit!, target);
        } else {
          this.enterActionMenu();
        }
        break;
      }
      case 'action':
        break;
    }
  }

  private beginSelection(unit: RuntimeUnit) {
    this.sel.unit = unit;
    this.sel.origPos = { x: unit.x, y: unit.y };
    this.sel.mode = 'move';
    this.showMoveRange(unit);
    this.events.emit('battle:select', unit);
  }

  private showMoveRange(unit: RuntimeUnit) {
    const general = DataRegistry.get().getGeneral(unit.generalId);
    const reachable = computeReachable(this.grid, unit.x, unit.y, unit.mov, general.class, unit.side);
    const atkRange = general.class === 'archer' ? 2 : 1;
    const attack = computeAttackRange(this.grid, reachable, atkRange);

    this.sel.reachable = reachable;
    this.sel.attackRange = attack;
    this.clearHighlights();

    for (const [k] of reachable) {
      const [x, y] = k.split(',').map(Number);
      const img = this.add.image(x * TILE.SIZE, y * TILE.SIZE, 'highlight_move').setOrigin(0);
      this.highlightLayer.add(img);
    }
    for (const k of attack) {
      if (reachable.has(k)) continue;
      const [x, y] = k.split(',').map(Number);
      const img = this.add.image(x * TILE.SIZE, y * TILE.SIZE, 'highlight_attack').setOrigin(0);
      this.highlightLayer.add(img);
    }
  }

  private clearHighlights() {
    this.highlightLayer.removeAll(true);
  }

  private moveUnitTo(x: number, y: number) {
    const unit = this.sel.unit!;
    const general = DataRegistry.get().getGeneral(unit.generalId);
    const path = findPath(this.grid, unit.x, unit.y, x, y, general.class, unit.side, unit.mov);
    if (!path) return;
    this.phase = 'animating';
    this.clearHighlights();
    this.animatePath(unit, path, () => {
      this.grid[this.sel.origPos!.y][this.sel.origPos!.x].occupant = undefined;
      unit.x = x;
      unit.y = y;
      this.grid[y][x].occupant = unit;
      unit.hasMoved = true;
      this.sel.plannedDest = { x, y };
      this.phase = 'player-turn';
      this.enterActionMenu();
      this.checkEvents();
    });
  }

  private animatePath(
    unit: RuntimeUnit,
    path: Array<{ x: number; y: number }>,
    onComplete: () => void,
  ) {
    const container = this.unitSprites.get(unit.uid)!;
    let i = 0;
    const step = () => {
      if (i >= path.length) {
        onComplete();
        return;
      }
      const node = path[i];
      i++;
      this.tweens.add({
        targets: container,
        x: node.x * TILE.SIZE + TILE.HALF,
        y: node.y * TILE.SIZE + TILE.HALF,
        duration: 110,
        ease: 'Linear',
        onComplete: step,
      });
    };
    step();
  }

  private enterActionMenu() {
    this.sel.mode = 'action';
    this.clearHighlights();
    const unit = this.sel.unit!;
    const general = DataRegistry.get().getGeneral(unit.generalId);
    const atkRange = general.class === 'archer' ? 2 : 1;

    const hasEnemies = this.units.some(
      (u) => u.side === 'enemy' && u.hp > 0 && manhattan(unit.x, unit.y, u.x, u.y) <= atkRange,
    );

    const options: Array<{ label: string; onSelect: () => void; disabled?: boolean }> = [
      {
        label: '공격',
        disabled: !hasEnemies,
        onSelect: () => this.enterAttackMode(),
      },
      {
        label: '대기',
        onSelect: () => this.wait(),
      },
      {
        label: '취소',
        onSelect: () => this.onCancel(),
      },
    ];

    this.events.emit('battle:action-menu', { unit, options, x: unit.x, y: unit.y });
  }

  actionMenuSelect(idx: number) {
    const unit = this.sel.unit;
    if (!unit) return;
    const general = DataRegistry.get().getGeneral(unit.generalId);
    const atkRange = general.class === 'archer' ? 2 : 1;
    const hasEnemies = this.units.some(
      (u) => u.side === 'enemy' && u.hp > 0 && manhattan(unit.x, unit.y, u.x, u.y) <= atkRange,
    );
    if (idx === 0) {
      if (hasEnemies) this.enterAttackMode();
    } else if (idx === 1) {
      this.wait();
    } else {
      this.onCancel();
    }
  }

  private enterAttackMode() {
    this.sel.mode = 'attack';
    const unit = this.sel.unit!;
    const general = DataRegistry.get().getGeneral(unit.generalId);
    const atkRange = general.class === 'archer' ? 2 : 1;
    this.clearHighlights();
    const attacks = new Set<string>();
    for (let dy = -atkRange; dy <= atkRange; dy++) {
      for (let dx = -atkRange; dx <= atkRange; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d === 0 || d > atkRange) continue;
        const tx = unit.x + dx;
        const ty = unit.y + dy;
        if (ty < 0 || tx < 0 || ty >= this.battle.map.height || tx >= this.battle.map.width) continue;
        attacks.add(`${tx},${ty}`);
        const img = this.add.image(tx * TILE.SIZE, ty * TILE.SIZE, 'highlight_attack').setOrigin(0);
        this.highlightLayer.add(img);
      }
    }
    this.sel.attackRange = attacks;
    this.events.emit('battle:close-menu');
  }

  private performAttack(attacker: RuntimeUnit, defender: RuntimeUnit) {
    this.phase = 'animating';
    this.clearHighlights();
    const reg = DataRegistry.get();
    const atkGeneral = reg.getGeneral(attacker.generalId);
    const defGeneral = reg.getGeneral(defender.generalId);
    const defTerrain = this.grid[defender.y][defender.x].terrain;
    const result = computeDamage(attacker, defender, atkGeneral.class, defGeneral.class, defTerrain);
    const atkRange = atkGeneral.class === 'archer' ? 2 : 1;
    const defRange = defGeneral.class === 'archer' ? 2 : 1;

    this.performAttackStrike(attacker, defender, result.damage, result.crit, result.missed, () => {
      if (defender.hp > 0 && canRetaliate(defender, attacker, atkRange, defRange)) {
        const retDef = this.grid[attacker.y][attacker.x].terrain;
        const ret = computeDamage(defender, attacker, defGeneral.class, atkGeneral.class, retDef, 0.85);
        this.performAttackStrike(defender, attacker, ret.damage, ret.crit, ret.missed, () => {
          this.finishAttack(attacker);
        });
      } else {
        this.finishAttack(attacker);
      }
    });
  }

  private performAttackStrike(
    attacker: RuntimeUnit,
    defender: RuntimeUnit,
    damage: number,
    crit: boolean,
    missed: boolean,
    onDone: () => void,
  ) {
    const atkC = this.unitSprites.get(attacker.uid);
    const defC = this.unitSprites.get(defender.uid);
    if (!atkC || !defC) {
      onDone();
      return;
    }

    const origX = atkC.x;
    const origY = atkC.y;
    const dirX = Math.sign(defC.x - atkC.x);
    const dirY = Math.sign(defC.y - atkC.y);

    this.tweens.add({
      targets: atkC,
      x: origX + dirX * 14,
      y: origY + dirY * 14,
      duration: 120,
      yoyo: true,
      onComplete: () => {
        if (!missed) {
          defender.hp = Math.max(0, defender.hp - damage);
          this.cameras.main.shake(120, 0.004);
          this.tweens.add({ targets: defC, alpha: { from: 0.3, to: 1 }, duration: 180 });
          this.spawnDamagePopup(defC.x + this.offsetX, defC.y + this.offsetY - 10, `${damage}`, crit ? '#ffd866' : '#fca5a5', crit);
          if (crit) {
            this.J.fire('crit', { text: '치명타!', color: '#ffd866' });
          } else {
            this.J.fire('hit', { color: '#fca5a5' });
          }
        } else {
          this.spawnDamagePopup(defC.x + this.offsetX, defC.y + this.offsetY - 10, 'MISS', '#8a7245', false);
        }
        this.updateUnitSprite(defender);
        if (defender.hp === 0) {
          const wasLord = DataRegistry.get().getGeneral(defender.generalId).class === 'lord';
          const expGain = EXP.KILL_BASE + (wasLord ? 40 : 0) + defender.level * 4;
          this.J.fire('kill', { title: `${DataRegistry.get().getGeneral(defender.generalId).name} 격파!`, color: '#ff6b57' });
          if (attacker.side === 'player') {
            const leveled = gainExp(attacker, expGain);
            if (leveled) {
              this.J.fire('levelup', { title: `${DataRegistry.get().getGeneral(attacker.generalId).name} 레벨 업!`, color: '#ffd866' });
            }
          }
          this.fadeAndRemoveUnit(defender);
        } else if (attacker.side === 'player') {
          gainExp(attacker, EXP.HIT_BASE);
        }
        onDone();
      },
    });
  }

  private spawnDamagePopup(x: number, y: number, text: string, color: string, large: boolean) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: FONT.BODY,
        fontSize: large ? '26px' : '20px',
        color,
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.tweens.add({
      targets: t,
      y: y - 40,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  private fadeAndRemoveUnit(unit: RuntimeUnit) {
    const c = this.unitSprites.get(unit.uid);
    if (!c) return;
    this.tweens.add({
      targets: c,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        c.destroy();
        this.unitSprites.delete(unit.uid);
        this.grid[unit.y][unit.x].occupant = undefined;
      },
    });
  }

  private finishAttack(attacker: RuntimeUnit) {
    attacker.hasActed = true;
    attacker.hasMoved = true;
    this.updateUnitSprite(attacker);
    this.sel = { unit: null, reachable: null, attackRange: null, mode: 'idle' };
    this.phase = 'player-turn';
    this.events.emit('battle:close-menu');
    this.checkEvents();
    this.checkVictoryConditions();
    if (this.phase === 'player-turn' && this.allPlayersDone()) {
      this.endPlayerTurn();
    }
  }

  private wait() {
    const unit = this.sel.unit!;
    unit.hasActed = true;
    unit.hasMoved = true;
    this.updateUnitSprite(unit);
    this.sel = { unit: null, reachable: null, attackRange: null, mode: 'idle' };
    this.events.emit('battle:close-menu');
    this.clearHighlights();
    this.checkEvents();
    if (this.allPlayersDone()) this.endPlayerTurn();
  }

  private onCancel() {
    if (this.sel.mode === 'attack') {
      this.enterActionMenu();
      return;
    }
    if (this.sel.mode === 'action' || this.sel.mode === 'move') {
      if (this.sel.origPos && this.sel.unit && this.sel.mode === 'action') {
        const unit = this.sel.unit;
        this.grid[unit.y][unit.x].occupant = undefined;
        unit.x = this.sel.origPos.x;
        unit.y = this.sel.origPos.y;
        unit.hasMoved = false;
        this.grid[unit.y][unit.x].occupant = unit;
        this.updateUnitSprite(unit);
      }
      this.sel = { unit: null, reachable: null, attackRange: null, mode: 'idle' };
      this.clearHighlights();
      this.events.emit('battle:close-menu');
    }
  }

  private cycleUnit() {
    if (this.phase !== 'player-turn' || this.sel.mode !== 'idle') return;
    const next = this.units.find((u) => u.side === 'player' && u.hp > 0 && !u.hasActed);
    if (next) {
      this.cursor.setPosition(this.offsetX + next.x * TILE.SIZE, this.offsetY + next.y * TILE.SIZE);
    }
  }

  private allPlayersDone(): boolean {
    return this.units.filter((u) => u.side === 'player' && u.hp > 0).every((u) => u.hasActed);
  }

  private endPlayerTurn() {
    if (this.phase !== 'player-turn') return;
    this.phase = 'enemy-turn';
    this.currentSide = 'enemy';
    this.events.emit('battle:turn-announce', { side: 'enemy', turn: this.turn });
    this.time.delayedCall(600, () => this.runEnemyTurn());
  }

  private async runEnemyTurn() {
    const enemies = this.units.filter((u) => u.side === 'enemy' && u.hp > 0);
    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      await this.runEnemyAction(enemy);
      await this.sleep(200);
      if (this.phase === 'end') return;
    }
    this.startNextPlayerTurn();
  }

  private runEnemyAction(enemy: RuntimeUnit): Promise<void> {
    return new Promise((resolve) => {
      const players = this.units.filter((u) => u.side === 'player' && u.hp > 0);
      if (players.length === 0) {
        resolve();
        return;
      }
      const decision = decideEnemyTurn(enemy, this.grid, players);
      const finalize = () => {
        this.checkEvents();
        this.checkVictoryConditions();
        resolve();
      };

      if (decision.move && (decision.move.x !== enemy.x || decision.move.y !== enemy.y)) {
        const general = DataRegistry.get().getGeneral(enemy.generalId);
        const path = findPath(
          this.grid,
          enemy.x,
          enemy.y,
          decision.move.x,
          decision.move.y,
          general.class,
          'enemy',
          enemy.mov,
        );
        if (path) {
          this.animatePath(enemy, path, () => {
            this.grid[enemy.y][enemy.x].occupant = undefined;
            enemy.x = decision.move!.x;
            enemy.y = decision.move!.y;
            this.grid[enemy.y][enemy.x].occupant = enemy;
            if (decision.attack && decision.attack.hp > 0) {
              this.performAttackAI(enemy, decision.attack, finalize);
            } else {
              finalize();
            }
          });
          return;
        }
      }

      if (decision.attack && decision.attack.hp > 0) {
        this.performAttackAI(enemy, decision.attack, finalize);
        return;
      }
      finalize();
    });
  }

  private performAttackAI(attacker: RuntimeUnit, defender: RuntimeUnit, done: () => void) {
    const reg = DataRegistry.get();
    const atkGeneral = reg.getGeneral(attacker.generalId);
    const defGeneral = reg.getGeneral(defender.generalId);
    const defTerrain = this.grid[defender.y][defender.x].terrain;
    const result = computeDamage(attacker, defender, atkGeneral.class, defGeneral.class, defTerrain);
    const atkRange = atkGeneral.class === 'archer' ? 2 : 1;
    const defRange = defGeneral.class === 'archer' ? 2 : 1;

    this.performAttackStrike(attacker, defender, result.damage, result.crit, result.missed, () => {
      if (defender.hp > 0 && canRetaliate(defender, attacker, atkRange, defRange)) {
        const retT = this.grid[attacker.y][attacker.x].terrain;
        const ret = computeDamage(defender, attacker, defGeneral.class, atkGeneral.class, retT, 0.85);
        this.performAttackStrike(defender, attacker, ret.damage, ret.crit, ret.missed, done);
      } else {
        done();
      }
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => this.time.delayedCall(ms, r));
  }

  private startNextPlayerTurn() {
    this.turn++;
    this.currentSide = 'player';
    this.phase = 'player-turn';
    for (const u of this.units) {
      u.hasActed = false;
      u.hasMoved = false;
      this.updateUnitSprite(u);
    }
    this.events.emit('battle:turn-announce', { side: 'player', turn: this.turn });
    this.fireTurnStartEvents();
    this.checkVictoryConditions();
  }

  private fireTurnStartEvents() {
    for (const ev of this.battle.events) {
      if (this.firedEvents.has(ev.id)) continue;
      if (ev.trigger.type === 'turn-start' && ev.trigger.turn === this.turn) {
        this.fireEvent(ev);
      }
    }
  }

  private checkEvents() {
    for (const ev of this.battle.events) {
      if (this.firedEvents.has(ev.id)) continue;
      const trg = ev.trigger;
      if (trg.type === 'hp-below') {
        const tgt = this.units.find((u) => u.generalId === trg.generalId);
        if (tgt && tgt.hp / tgt.hpMax <= trg.percent) {
          this.fireEvent(ev);
        }
      }
    }
  }

  private fireEvent(ev: Battle['events'][number]) {
    this.firedEvents.add(ev.id);
    const a = ev.action;
    if (a.type === 'dialogue') {
      this.phase = 'dialogue';
      this.scene.launch(SCENE_KEYS.DIALOGUE, {
        dialogueId: a.id,
        onComplete: () => {
          this.phase = this.currentSide === 'player' ? 'player-turn' : 'enemy-turn';
        },
      });
    } else if (a.type === 'recruit') {
      GameState.get().addGeneral(a.generalId, Math.max(3, Math.floor(this.turn / 2)));
      this.events.emit('battle:toast', { text: `${DataRegistry.get().getGeneral(a.generalId).name}이(가) 아군에 합류했습니다!`, tone: 'success' });
    } else if (a.type === 'duel') {
      const atk = this.units.find((u) => u.generalId === a.attacker);
      const def = this.units.find((u) => u.generalId === a.defender);
      if (atk && def && def.hp > 0) {
        def.hp = 0;
        this.events.emit('battle:toast', { text: `${DataRegistry.get().getGeneral(atk.generalId).name}의 일기토 승리!`, tone: 'success' });
        this.fadeAndRemoveUnit(def);
      }
    } else if (a.type === 'choice') {
      this.phase = 'dialogue';
      this.scene.launch(SCENE_KEYS.DIALOGUE, {
        dialogueId: a.id,
        onComplete: () => {
          this.phase = this.currentSide === 'player' ? 'player-turn' : 'enemy-turn';
        },
        onChoice: (_idx: number, next: string) => {
          this.battle = { ...this.battle, nextBattleId: next };
        },
      });
    }
  }

  private checkVictoryConditions() {
    if (this.phase === 'end') return;
    const state = GameState.get();
    const players = this.units.filter((u) => u.side === 'player' && u.hp > 0);
    const enemies = this.units.filter((u) => u.side === 'enemy' && u.hp > 0);
    const liubei = this.units.find((u) => u.generalId === 'liubei');

    if (liubei && liubei.hp <= 0) {
      this.endBattle(false, '유비가 쓰러졌습니다...');
      return;
    }

    if (this.battle.turnLimit && this.turn > this.battle.turnLimit) {
      const obj = this.battle.objective;
      if (obj.victory === 'survive') {
        this.endBattle(true, '기일을 버텨냈다!');
      } else {
        this.endBattle(false, '시간 초과');
      }
      return;
    }

    const obj = this.battle.objective;
    if (obj.victory === 'defeat-all') {
      if (enemies.length === 0) this.endBattle(true);
    } else if (obj.victory === 'defeat-boss') {
      const boss = this.units.find((u) => u.generalId === obj.targetId && u.side === 'enemy');
      if (!boss || boss.hp <= 0) this.endBattle(true);
    } else if (obj.victory === 'seize' && obj.seizePos) {
      const onSpot = players.find((u) => u.x === obj.seizePos!.x && u.y === obj.seizePos!.y);
      if (onSpot && !this.seized) {
        this.seized = true;
        this.endBattle(true, `${DataRegistry.get().getGeneral(onSpot.generalId).name}이(가) 거점을 점령했다!`);
      }
    } else if (obj.victory === 'escort' && obj.targetId) {
      const tgt = this.units.find((u) => u.generalId === obj.targetId);
      if (tgt && tgt.hp <= 0) this.endBattle(false, '호위 대상이 쓰러졌습니다');
      else if (enemies.length === 0) this.endBattle(true);
    } else if (obj.victory === 'survive') {
      if (this.battle.turnLimit && this.turn > this.battle.turnLimit) this.endBattle(true);
    }
  }

  private endBattle(victory: boolean, message?: string) {
    this.phase = 'end';
    const state = GameState.get();
    const reward = this.battle.reward;

    if (victory) {
      this.J.fire('victory', { title: message || '전투 승리!', color: '#ffd866' });
      state.addGold(reward.gold);
      for (const u of this.units.filter((u) => u.side === 'player' && u.hp > 0)) {
        const entry = state.getRoster(u.generalId);
        if (entry) {
          entry.level = u.level;
          entry.exp = u.exp;
        }
      }
      for (const item of reward.items ?? []) state.addItem(item);
      state.markCleared(this.battle.id);

      const endEvent = this.battle.events.find(
        (e) => e.trigger.type === 'battle-end' && e.trigger.victory === true,
      );
      if (endEvent) this.fireEvent(endEvent);

      if (typeof this.battle.nextBattleId === 'string') {
        state.currentBattleId = this.battle.nextBattleId;
      }
    }

    this.time.delayedCall(900, () => {
      this.scene.stop(SCENE_KEYS.BATTLE_UI);
      this.scene.start(SCENE_KEYS.ENDING, {
        victory,
        battle: this.battle,
        message,
      });
    });
  }

  /** 반응(주스) 멈칫·느리게를 씬 시간에 건다 — Phaser 의 모든 타이머·트윈이 따라간다 */
  update(_time: number, delta: number): void {
    if (!this.J) return;
    const dtSec = delta / 1000;
    const scaled = this.J.time(dtSec);
    const scale = dtSec > 0 ? Phaser.Math.Clamp(scaled / dtSec, 0, 1) : 1;
    this.time.timeScale = scale;
    this.tweens.timeScale = scale;
  }

  private showHelp() {
    this.events.emit('battle:toast', {
      text: '클릭: 유닛 선택 · 이동 후 공격/대기 선택 · ENTER로 턴 종료 · ESC로 취소',
      tone: 'info',
    });
  }
}
