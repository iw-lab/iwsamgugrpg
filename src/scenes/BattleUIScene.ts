import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/config/constants';
import { DataRegistry } from '@/systems/DataRegistry';
import type { Battle, RuntimeUnit } from '@/types';

interface ActionMenuData {
  unit: RuntimeUnit;
  options: Array<{ label: string; onSelect: () => void; disabled?: boolean }>;
  x: number;
  y: number;
}

export class BattleUIScene extends Phaser.Scene {
  private battle!: Battle;
  private topBar!: Phaser.GameObjects.Rectangle;
  private turnLabel!: Phaser.GameObjects.Text;
  private objectiveLabel!: Phaser.GameObjects.Text;
  private hintLabel!: Phaser.GameObjects.Text;
  private inspectPanel?: Phaser.GameObjects.Container;
  private actionMenu?: Phaser.GameObjects.Container;
  private toastLayer!: Phaser.GameObjects.Container;
  private announcer?: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.BATTLE_UI);
  }

  create(data: { battle: Battle }) {
    this.battle = data.battle;

    this.topBar = this.add.rectangle(0, 0, GAME_WIDTH, 44, 0x0d0704, 0.9).setOrigin(0);
    this.topBar.setStrokeStyle(1, 0x3a2817, 0.8);

    this.turnLabel = this.add.text(20, 12, '턴 1 · 아군', {
      fontFamily: FONT.BODY,
      fontSize: '16px',
      color: '#d4af37',
      fontStyle: 'bold',
    });

    const objText = this.formatObjective(this.battle);
    this.objectiveLabel = this.add
      .text(GAME_WIDTH / 2, 22, objText, {
        fontFamily: FONT.BODY,
        fontSize: '13px',
        color: '#e8d9a8',
      })
      .setOrigin(0.5);

    this.hintLabel = this.add
      .text(GAME_WIDTH - 20, 22, 'ENTER: 턴 종료  ·  F1: 도움말', {
        fontFamily: FONT.BODY,
        fontSize: '12px',
        color: '#8a7245',
      })
      .setOrigin(1, 0.5);

    this.toastLayer = this.add.container(0, 0);

    const battleScene = this.scene.get(SCENE_KEYS.BATTLE);
    battleScene.events.on('battle:select', (u: RuntimeUnit) => this.showInspect(u));
    battleScene.events.on('battle:hover', (d: { cell: { occupant?: RuntimeUnit } }) => {
      if (d.cell.occupant) this.showInspect(d.cell.occupant);
    });
    battleScene.events.on('battle:inspect', (u: RuntimeUnit) => this.showInspect(u));
    battleScene.events.on('battle:action-menu', (d: ActionMenuData) => this.showActionMenu(d));
    battleScene.events.on('battle:close-menu', () => this.closeActionMenu());
    battleScene.events.on('battle:turn-announce', (d: { side: 'player' | 'enemy'; turn: number }) => {
      this.turnLabel.setText(`턴 ${d.turn} · ${d.side === 'player' ? '아군' : '적군'}`);
      this.announceTurn(d.side, d.turn);
    });
    battleScene.events.on('battle:toast', (d: { text: string; tone?: string }) => {
      this.showToast(d.text, d.tone);
    });

    this.events.on('shutdown', () => {
      battleScene.events.off('battle:select');
      battleScene.events.off('battle:hover');
      battleScene.events.off('battle:inspect');
      battleScene.events.off('battle:action-menu');
      battleScene.events.off('battle:close-menu');
      battleScene.events.off('battle:turn-announce');
      battleScene.events.off('battle:toast');
    });
  }

  private formatObjective(b: Battle): string {
    const o = b.objective;
    switch (o.victory) {
      case 'defeat-all':
        return `임무: 적 전멸${b.turnLimit ? ` · ${b.turnLimit}턴 제한` : ''}`;
      case 'defeat-boss': {
        try {
          const g = DataRegistry.get().getGeneral(o.targetId ?? '');
          return `임무: ${g.name} 격파`;
        } catch {
          return '임무: 적장 격파';
        }
      }
      case 'seize':
        return `임무: 지점 점령 (${o.seizePos?.x},${o.seizePos?.y})`;
      case 'survive':
        return `임무: ${o.survivalTurns ?? b.turnLimit}턴 생존`;
      case 'escort': {
        try {
          const g = DataRegistry.get().getGeneral(o.targetId ?? '');
          return `임무: ${g.name} 호위`;
        } catch {
          return '임무: 호위 대상 생존';
        }
      }
      default:
        return '임무: -';
    }
  }

  private showInspect(unit: RuntimeUnit) {
    this.inspectPanel?.destroy();
    const reg = DataRegistry.get();
    const g = reg.getGeneral(unit.generalId);
    const container = this.add.container(GAME_WIDTH - 220, 60);
    const bg = this.add.rectangle(0, 0, 200, 160, 0x1a0f08, 0.94).setOrigin(0);
    bg.setStrokeStyle(2, unit.side === 'player' ? 0x3b7dd8 : 0xc13a3a);
    container.add(bg);

    const name = this.add.text(10, 8, `${g.name} (${g.nameHanja})`, {
      fontFamily: FONT.BODY,
      fontSize: '15px',
      color: '#d4af37',
      fontStyle: 'bold',
    });
    container.add(name);

    const cls = this.classLabel(g.class);
    const lvl = this.add.text(10, 28, `Lv ${unit.level} · ${cls} · ${this.factionLabel(g.faction)}`, {
      fontFamily: FONT.BODY,
      fontSize: '11px',
      color: '#8a7245',
    });
    container.add(lvl);

    const hpBarBg = this.add.rectangle(10, 50, 180, 10, 0x3a2817).setOrigin(0);
    hpBarBg.setStrokeStyle(1, 0x000);
    const hpRatio = Math.max(0, unit.hp / unit.hpMax);
    const hpBar = this.add.rectangle(11, 51, 178 * hpRatio, 8, hpRatio > 0.5 ? 0x57a957 : hpRatio > 0.25 ? 0xe6a23c : 0xc13a3a).setOrigin(0);
    const hpLabel = this.add.text(10, 62, `HP ${unit.hp}/${unit.hpMax}`, {
      fontFamily: FONT.BODY,
      fontSize: '11px',
      color: '#e8d9a8',
    });
    container.add([hpBarBg, hpBar, hpLabel]);

    const stats = [
      `공격 ${unit.atk}`,
      `방어 ${unit.def}`,
      `지력 ${unit.intel}`,
      `이동 ${unit.mov}`,
    ].join(' · ');
    const statsText = this.add.text(10, 80, stats, {
      fontFamily: FONT.BODY,
      fontSize: '11px',
      color: '#e8d9a8',
    });
    container.add(statsText);

    const expLabel = this.add.text(10, 96, unit.side === 'player' ? `EXP ${unit.exp}/100` : '', {
      fontFamily: FONT.BODY,
      fontSize: '11px',
      color: '#8a7245',
    });
    container.add(expLabel);

    const traits = g.traits?.map((t) => this.traitLabel(t)).join(' · ') ?? '';
    if (traits) {
      const traitText = this.add.text(10, 112, `특성: ${traits}`, {
        fontFamily: FONT.BODY,
        fontSize: '11px',
        color: '#8a7245',
      });
      container.add(traitText);
    }

    const bio = this.add.text(10, 130, g.bio, {
      fontFamily: FONT.BODY,
      fontSize: '10px',
      color: '#8a7245',
      wordWrap: { width: 180 },
    });
    container.add(bio);

    this.inspectPanel = container;
  }

  private showActionMenu(d: ActionMenuData) {
    this.closeActionMenu();
    const container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 120);
    const bg = this.add.rectangle(0, 0, 200, 120, 0x1a0f08, 0.95).setOrigin(0.5);
    bg.setStrokeStyle(2, 0xd4af37);
    container.add(bg);

    const title = this.add
      .text(0, -42, DataRegistry.get().getGeneral(d.unit.generalId).name, {
        fontFamily: FONT.BODY,
        fontSize: '14px',
        color: '#d4af37',
      })
      .setOrigin(0.5);
    container.add(title);

    d.options.forEach((opt, i) => {
      const y = -20 + i * 26;
      const t = this.add
        .text(0, y, opt.disabled ? `· ${opt.label} ·` : `▶ ${opt.label}`, {
          fontFamily: FONT.BODY,
          fontSize: '14px',
          color: opt.disabled ? '#5a4a2a' : '#e8d9a8',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: !opt.disabled });
      if (!opt.disabled) {
        t.on('pointerover', () => t.setColor('#ffd866'));
        t.on('pointerout', () => t.setColor('#e8d9a8'));
        t.on('pointerdown', () => {
          opt.onSelect();
        });
      }
      container.add(t);
    });

    this.actionMenu = container;
  }

  private closeActionMenu() {
    this.actionMenu?.destroy();
    this.actionMenu = undefined;
  }

  private announceTurn(side: 'player' | 'enemy', turn: number) {
    this.announcer?.destroy();
    const label = side === 'player' ? `제 ${turn} 턴 · 아군의 행동` : `제 ${turn} 턴 · 적의 공세`;
    const color = side === 'player' ? '#3b7dd8' : '#c13a3a';
    this.announcer = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, label, {
        fontFamily: FONT.TITLE,
        fontSize: '36px',
        color,
        stroke: '#0d0704',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: this.announcer,
      alpha: { from: 0, to: 1 },
      scale: { from: 1.4, to: 1 },
      duration: 280,
      yoyo: true,
      hold: 420,
      onComplete: () => {
        this.announcer?.destroy();
        this.announcer = undefined;
      },
    });
  }

  private showToast(text: string, tone: string = 'info') {
    const color = tone === 'success' ? '#57a957' : tone === 'error' ? '#c13a3a' : '#ffd866';
    const t = this.add
      .text(GAME_WIDTH / 2, 80, text, {
        fontFamily: FONT.BODY,
        fontSize: '16px',
        color,
        backgroundColor: '#0d0704',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.toastLayer.add(t);
    this.tweens.add({
      targets: t,
      alpha: { from: 0, to: 1 },
      y: 100,
      duration: 280,
    });
    this.time.delayedCall(2400, () => {
      this.tweens.add({
        targets: t,
        alpha: 0,
        duration: 400,
        onComplete: () => t.destroy(),
      });
    });
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

  private traitLabel(t: string): string {
    const m: Record<string, string> = {
      benevolence: '인덕',
      'true-lord': '천명',
      honor: '의리',
      'true-duel': '일기토',
      ferocity: '맹장',
      valor: '용맹',
      peerless: '무쌍',
      genius: '천재',
      loyalty: '충성',
      ambition: '야심',
      veteran: '노련',
      diplomat: '외교',
      merchant: '상인',
      wisdom: '지혜',
      vengeance: '복수',
      fury: '분노',
      beauty: '미모',
      growth: '대기만성',
      inheritor: '계승자',
      zealot: '광신',
      treachery: '배신',
      guard: '호위',
    };
    return m[t] ?? t;
  }
}
