import Phaser from 'phaser';
import { COLORS, createBackButton, createScoreDisplay, showGameOver, shake, burstParticles, floatingText, flashScreen } from '../utils';

const COLOR_NAMES = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE'];
const COLOR_VALUES = ['#ff6b6b', '#0984e3', '#00b894', '#feca57', '#6c5ce7', '#e17055'];
const COLOR_HEX = [COLORS.danger, COLORS.blue, COLORS.success, COLORS.warning, COLORS.primary, COLORS.orange];

export default class ColorMatchGame extends Phaser.Scene {
  constructor() { super('ColorMatchGame'); }

  create() {
    this.cameras.main.fadeIn(300);

    this.score = 0;
    this.lives = 3;
    this.streak = 0;
    this.maxStreak = 0;
    this.timeLeft = 45;
    this.gameActive = true;
    this.canAnswer = true;
    this.roundTime = 0;
    this.difficulty = 0; // 0 = easy, increases

    // ── Background ──
    for (let i = 0; i < 15; i++) {
      const c = this.add.circle(
        Phaser.Math.Between(0, 800), Phaser.Math.Between(0, 600),
        Phaser.Math.Between(30, 80),
        COLOR_HEX[i % 6], 0.02
      ).setDepth(-1);
      this.tweens.add({
        targets: c, alpha: 0.04, duration: Phaser.Math.Between(2000, 4000),
        yoyo: true, repeat: -1,
      });
    }

    // ── Central Display ──
    this.displayBg = this.add.rectangle(400, 240, 400, 160, 0x111130)
      .setStrokeStyle(2, 0x333366).setDepth(5);

    this.colorText = this.add.text(400, 220, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '52px',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);

    this.instructionText = this.add.text(400, 280, 'Does the WORD match the COLOR?', {
      fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#636e72',
    }).setOrigin(0.5).setDepth(10);

    // ── Answer Buttons ──
    this.matchBtn = this.createButton(300, 400, 'MATCH ✓', COLORS.success, () => this.answer(true));
    this.noMatchBtn = this.createButton(500, 400, 'NO MATCH ✗', COLORS.danger, () => this.answer(false));

    // Keyboard shortcuts
    this.input.keyboard.on('keydown-LEFT', () => this.answer(true));
    this.input.keyboard.on('keydown-RIGHT', () => this.answer(false));
    this.input.keyboard.on('keydown-A', () => this.answer(true));
    this.input.keyboard.on('keydown-D', () => this.answer(false));

    // ── Timer ──
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`${this.timeLeft}s`);
        this.updateTimerBar();
        if (this.timeLeft <= 0) {
          this.gameActive = false;
          this.timerEvent.destroy();
          showGameOver(this, this.score, 'ColorMatchGame');
        }
      },
      loop: true,
    });

    // ── Round Timer Bar (per-question) ──
    this.roundBarBg = this.add.rectangle(400, 340, 300, 6, 0x222244).setDepth(5);
    this.roundBar = this.add.rectangle(250, 340, 300, 6, COLORS.accent).setOrigin(0, 0.5).setDepth(6);

    // ── UI ──
    createBackButton(this);
    this.scoreText = createScoreDisplay(this);

    this.timerText = this.add.text(400, 24, '45s', {
      fontFamily: 'Orbitron, monospace', fontSize: '22px', color: '#ff6b6b',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);

    this.timerBarBg = this.add.rectangle(400, 55, 300, 8, 0x222244).setDepth(100);
    this.timerBar = this.add.rectangle(250, 55, 300, 8, COLORS.neon).setOrigin(0, 0.5).setDepth(101);

    this.livesText = this.add.text(16, 16, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '14px', color: '#ff6b6b',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(100);
    this.updateLivesText();

    this.streakText = this.add.text(400, 470, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '16px', color: '#00ff88',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    this.add.text(400, 530, '← A = MATCH     NO MATCH = D →', {
      fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#333366',
    }).setOrigin(0.5);

    // ── Start First Round ──
    this.nextRound();
  }

  createButton(x, y, label, color, callback) {
    const bg = this.add.rectangle(x, y, 160, 56, color, 0.2)
      .setStrokeStyle(2, color).setDepth(10)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontFamily: 'Orbitron, monospace', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);

    bg.on('pointerover', () => { bg.setFillStyle(color, 0.4); });
    bg.on('pointerout', () => { bg.setFillStyle(color, 0.2); });
    bg.on('pointerdown', callback);

    return { bg, txt };
  }

  nextRound() {
    if (!this.gameActive) return;
    this.canAnswer = true;
    this.roundTime = 0;

    // Pick word and display color
    const wordIdx = Phaser.Math.Between(0, COLOR_NAMES.length - 1);
    let colorIdx;

    // As difficulty increases, matching becomes less likely
    if (Math.random() < 0.4 + this.difficulty * 0.05) {
      // Non-matching
      do {
        colorIdx = Phaser.Math.Between(0, COLOR_NAMES.length - 1);
      } while (colorIdx === wordIdx);
    } else {
      colorIdx = wordIdx;
    }

    this.currentWord = COLOR_NAMES[wordIdx];
    this.currentColorIdx = colorIdx;
    this.isMatch = wordIdx === colorIdx;

    // Animate text in
    this.colorText.setText(this.currentWord)
      .setColor(COLOR_VALUES[colorIdx])
      .setScale(0);
    this.tweens.add({
      targets: this.colorText, scaleX: 1, scaleY: 1,
      duration: 200, ease: 'Back.easeOut',
    });

    // Reset round bar
    this.roundBar.setSize(300, 6).setFillStyle(COLORS.accent);

    // Difficulty ramp
    this.difficulty = Math.min(10, this.difficulty + 0.1);
  }

  answer(saidMatch) {
    if (!this.canAnswer || !this.gameActive) return;
    this.canAnswer = false;

    const correct = saidMatch === this.isMatch;

    if (correct) {
      this.streak++;
      this.maxStreak = Math.max(this.maxStreak, this.streak);
      const timeBonus = Math.max(0, Math.floor(10 - this.roundTime / 200));
      const streakBonus = Math.min(this.streak, 10);
      const pts = 10 + timeBonus + streakBonus;
      this.score += pts;
      this.scoreText.setText(`Score: ${this.score}`);

      burstParticles(this, 400, 240, COLORS.neon, 8, 25);
      floatingText(this, 400, 180, `+${pts}`, '#00ff88');

      // Flash display border green
      this.displayBg.setStrokeStyle(3, COLORS.neon);
      this.time.delayedCall(200, () => this.displayBg.setStrokeStyle(2, 0x333366));

      if (this.streak >= 5) {
        this.streakText.setText(`🔥 ${this.streak} STREAK!`).setAlpha(1);
        this.tweens.add({ targets: this.streakText, alpha: 0, duration: 800, delay: 300 });
      }

      // Speed bonus for fast answers
      if (this.roundTime < 500) {
        floatingText(this, 400, 160, 'FAST!', '#feca57', '14px');
        this.score += 5;
      }
    } else {
      this.streak = 0;
      this.lives--;
      this.updateLivesText();
      shake(this, 0.006, 150);
      flashScreen(this, COLORS.danger, 0.3, 250);

      // Flash display border red
      this.displayBg.setStrokeStyle(3, COLORS.danger);
      this.time.delayedCall(200, () => this.displayBg.setStrokeStyle(2, 0x333366));

      floatingText(this, 400, 180, 'WRONG!', '#ff6b6b');

      if (this.lives <= 0) {
        this.gameActive = false;
        if (this.timerEvent) this.timerEvent.destroy();
        this.time.delayedCall(500, () => {
          showGameOver(this, this.score, 'ColorMatchGame');
        });
        return;
      }
    }

    this.time.delayedCall(300, () => this.nextRound());
  }

  updateLivesText() {
    this.livesText.setText('♥'.repeat(this.lives));
  }

  updateTimerBar() {
    const pct = this.timeLeft / 45;
    this.timerBar.setSize(300 * pct, 8);
    if (pct < 0.3) this.timerBar.setFillStyle(COLORS.danger);
    else if (pct < 0.6) this.timerBar.setFillStyle(COLORS.warning);
  }

  update(time, delta) {
    if (!this.gameActive) return;

    this.roundTime += delta;

    // Animate round bar depleting
    const roundLimit = 3000 - this.difficulty * 100;
    const pct = Math.max(0, 1 - this.roundTime / roundLimit);
    this.roundBar.setSize(300 * pct, 6);
    if (pct < 0.3) this.roundBar.setFillStyle(COLORS.danger);
    else if (pct < 0.6) this.roundBar.setFillStyle(COLORS.warning);

    // Auto-fail if too slow
    if (this.roundTime > roundLimit && this.canAnswer) {
      this.answer(!this.isMatch); // Wrong answer
    }
  }
}
