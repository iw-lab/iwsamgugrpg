import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/config/constants';
import { DataRegistry } from '@/systems/DataRegistry';
import type { DialogueLine } from '@/types';

interface DialogueParams {
  dialogueId: string;
  afterScene?: string;
  afterData?: Record<string, unknown>;
  onChoice?: (idx: number, next: string) => void;
  onComplete?: () => void;
}

export class DialogueScene extends Phaser.Scene {
  private params!: DialogueParams;
  private lines: DialogueLine[] = [];
  private choices: Array<{ label: string; next: string }> | undefined;
  private idx = 0;
  private speakerText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private portrait?: Phaser.GameObjects.Image;
  private portraitLabel?: Phaser.GameObjects.Image;
  private prompt!: Phaser.GameObjects.Text;
  private typing = false;
  private typingEvent?: Phaser.Time.TimerEvent;
  private fullText = '';

  constructor() {
    super(SCENE_KEYS.DIALOGUE);
  }

  create(params: DialogueParams) {
    this.params = params;
    const reg = DataRegistry.get();
    const scene = reg.getDialogue(params.dialogueId);
    if (!scene) {
      console.warn(`Dialogue not found: ${params.dialogueId}`);
      this.exit();
      return;
    }

    this.lines = scene.lines;
    this.choices = scene.choices;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0d0704, 1).setOrigin(0);

    this.add
      .rectangle(GAME_WIDTH / 2, 120, 600, 2, 0xd4af37, 0.4)
      .setOrigin(0.5);
    if (scene.title) {
      this.add
        .text(GAME_WIDTH / 2, 80, scene.title, {
          fontFamily: FONT.TITLE,
          fontSize: '32px',
          color: '#d4af37',
        })
        .setOrigin(0.5);
    }

    const panel = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT - 110, 'panel_dialogue')
      .setDepth(1);
    void panel;

    this.speakerText = this.add
      .text(60, GAME_HEIGHT - 190, '', {
        fontFamily: FONT.BODY,
        fontSize: '18px',
        color: '#d4af37',
        fontStyle: 'bold',
      })
      .setDepth(2);

    this.bodyText = this.add
      .text(60, GAME_HEIGHT - 160, '', {
        fontFamily: FONT.BODY,
        fontSize: '18px',
        color: '#e8d9a8',
        wordWrap: { width: GAME_WIDTH - 120 },
        lineSpacing: 6,
      })
      .setDepth(2);

    this.prompt = this.add
      .text(GAME_WIDTH - 100, GAME_HEIGHT - 50, '▼ 계속', {
        fontFamily: FONT.BODY,
        fontSize: '14px',
        color: '#8a7245',
      })
      .setDepth(2);
    this.tweens.add({
      targets: this.prompt,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard?.on('keydown-SPACE', () => this.advance());
    this.input.keyboard?.on('keydown-ENTER', () => this.advance());
    this.input.on('pointerdown', () => this.advance());

    this.showLine();
  }

  private showLine() {
    if (this.idx >= this.lines.length) {
      if (this.choices && this.choices.length > 0) {
        this.showChoices();
        return;
      }
      this.exit();
      return;
    }
    const line = this.lines[this.idx];
    this.speakerText.setText(this.speakerLabel(line.speaker));

    this.portrait?.destroy();
    this.portraitLabel?.destroy();
    this.portrait = undefined;
    this.portraitLabel = undefined;
    if (line.portrait) {
      const key = line.portrait.startsWith('portrait_') ? line.portrait : `portrait_${line.portrait}`;
      if (this.textures.exists(key)) {
        this.portrait = this.add.image(80, GAME_HEIGHT / 2 + 40, key).setDepth(1).setOrigin(0, 0.5);
        const labelKey = key.replace('portrait_', 'portrait_label_');
        if (this.textures.exists(labelKey)) {
          this.portraitLabel = this.add
            .image(80, GAME_HEIGHT / 2 + 40 + 48 + 10, labelKey)
            .setDepth(1)
            .setOrigin(0, 0.5);
        }
      }
    }

    this.fullText = line.text;
    this.startTyping();
  }

  private speakerLabel(id: string): string {
    if (id === 'narrator') return '※';
    if (id === 'all') return '삼형제';
    const reg = DataRegistry.get();
    try {
      return reg.getGeneral(id).name;
    } catch {
      return id;
    }
  }

  private startTyping() {
    this.typing = true;
    this.bodyText.setText('');
    let i = 0;
    this.typingEvent?.remove();
    this.typingEvent = this.time.addEvent({
      delay: 22,
      repeat: this.fullText.length - 1,
      callback: () => {
        i++;
        this.bodyText.setText(this.fullText.slice(0, i));
        if (i >= this.fullText.length) {
          this.typing = false;
        }
      },
    });
  }

  private advance() {
    if (this.typing) {
      this.typingEvent?.remove();
      this.bodyText.setText(this.fullText);
      this.typing = false;
      return;
    }
    this.idx++;
    this.showLine();
  }

  private showChoices() {
    if (!this.choices) return;
    this.speakerText.setText('선택');
    this.bodyText.setText('');

    const choiceTexts: Phaser.GameObjects.Text[] = [];
    const total = this.choices.length;
    const startY = GAME_HEIGHT - 150;
    this.choices.forEach((c, i) => {
      const t = this.add
        .text(GAME_WIDTH / 2, startY + i * 36, `  ${c.label}`, {
          fontFamily: FONT.BODY,
          fontSize: '20px',
          color: '#e8d9a8',
          backgroundColor: '#1a0f08',
          padding: { x: 20, y: 8 },
        })
        .setOrigin(0.5)
        .setDepth(3)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#ffd866'));
      t.on('pointerout', () => t.setColor('#e8d9a8'));
      t.on('pointerdown', () => {
        this.params.onChoice?.(i, c.next);
        choiceTexts.forEach((x) => x.destroy());
        this.exit(c.next);
      });
      choiceTexts.push(t);
      void total;
    });
    this.prompt.setText('선택하시오').setAlpha(1);
    this.tweens.killTweensOf(this.prompt);
  }

  private exit(choiceNext?: string) {
    this.params.onComplete?.();
    if (choiceNext) {
      this.scene.stop();
      return;
    }
    if (this.params.afterScene) {
      this.scene.start(this.params.afterScene, this.params.afterData ?? {});
    } else {
      this.scene.stop();
    }
  }
}
