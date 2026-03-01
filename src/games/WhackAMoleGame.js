import Phaser from 'phaser';
import { COLORS, createBackButton, createScoreDisplay, showGameOver, shake, burstParticles, floatingText, flashScreen } from '../utils';

export default class WhackAMoleGame extends Phaser.Scene {
  constructor() { super('WhackAMoleGame'); }

  create() {
    this.cameras.main.fadeIn(300);

    this.score = 0;
    this.timeLeft = 30;
    this.combo = 0;
    this.maxCombo = 0;
    this.gameActive = true;
    this.moleSpeed = 1500;
    this.goldenChance = 0.1;

    // ── Background ──
    const gfx = this.add.graphics();
    gfx.fillStyle(0x0d0d25);
    gfx.fillRect(0, 0, 800, 600);

    // ── Mole Grid (3x3) ──
    this.holes = [];
    const gridSize = 3;
    const holeW = 120, holeH = 100, gap = 30;
    const totalW = gridSize * holeW + (gridSize - 1) * gap;
    const totalH = gridSize * holeH + (gridSize - 1) * gap;
    const startX = (800 - totalW) / 2 + holeW / 2;
    const startY = (600 - totalH) / 2 + holeH / 2 + 30;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const x = startX + c * (holeW + gap);
        const y = startY + r * (holeH + gap);
        this.createHole(x, y, holeW, holeH);
      }
    }

    // ── Controls ──
    // Touch/click handled per mole

    // ── Timer ──
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`${this.timeLeft}s`);
        this.updateTimerBar();

        // Speed up over time
        if (this.timeLeft === 20) this.moleSpeed = 1200;
        if (this.timeLeft === 10) { this.moleSpeed = 900; this.goldenChance = 0.15; }
        if (this.timeLeft === 5) this.moleSpeed = 700;

        if (this.timeLeft <= 0) {
          this.gameActive = false;
          this.timerEvent.destroy();
          this.time.delayedCall(500, () => {
            showGameOver(this, this.score, 'WhackAMoleGame');
          });
        }
      },
      loop: true,
    });

    // ── Mole Spawner ──
    this.spawnMole();

    // ── UI ──
    createBackButton(this);
    this.scoreText = createScoreDisplay(this);

    this.timerText = this.add.text(400, 24, '30s', {
      fontFamily: 'Orbitron, monospace', fontSize: '24px', color: '#ff6b6b',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);

    // Timer bar
    this.timerBarBg = this.add.rectangle(400, 55, 300, 8, 0x222244).setDepth(100);
    this.timerBar = this.add.rectangle(250, 55, 300, 8, COLORS.neon).setOrigin(0, 0.5).setDepth(101);

    this.comboText = this.add.text(400, 80, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '18px', color: '#00ff88',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100).setAlpha(0);
  }

  createHole(x, y, w, h) {
    // Hole background
    const holeBg = this.add.ellipse(x, y + 20, w - 10, 40, 0x1a1a3a).setDepth(1);
    const holeRim = this.add.ellipse(x, y + 20, w, 44, 0x222244, 0.5).setDepth(0);

    const hole = {
      x, y, w, h,
      bg: holeBg,
      rim: holeRim,
      mole: null,
      active: false,
      golden: false,
    };
    this.holes.push(hole);
  }

  spawnMole() {
    if (!this.gameActive) return;

    // Pick random empty hole
    const empty = this.holes.filter(h => !h.active);
    if (empty.length === 0) {
      this.time.delayedCall(200, () => this.spawnMole());
      return;
    }

    const hole = empty[Phaser.Math.Between(0, empty.length - 1)];
    hole.active = true;
    hole.golden = Math.random() < this.goldenChance;

    const moleColor = hole.golden ? COLORS.gold : COLORS.orange;

    // Mole body
    const moleBody = this.add.rectangle(hole.x, hole.y + 50, 50, 50, moleColor)
      .setDepth(3).setInteractive({ useHandCursor: true });

    // Mole head
    const moleHead = this.add.circle(hole.x, hole.y + 20, 28, moleColor).setDepth(4);

    // Eyes
    const eyeL = this.add.circle(hole.x - 10, hole.y + 15, 5, 0xffffff).setDepth(5);
    const eyeR = this.add.circle(hole.x + 10, hole.y + 15, 5, 0xffffff).setDepth(5);
    const pupilL = this.add.circle(hole.x - 10, hole.y + 16, 2.5, 0x000000).setDepth(6);
    const pupilR = this.add.circle(hole.x + 10, hole.y + 16, 2.5, 0x000000).setDepth(6);

    // Nose
    const nose = this.add.circle(hole.x, hole.y + 24, 4, 0x8B4513).setDepth(5);

    const parts = [moleBody, moleHead, eyeL, eyeR, pupilL, pupilR, nose];
    hole.mole = parts;

    if (hole.golden) {
      // Golden sparkle
      this.tweens.add({ targets: moleHead, fillColor: COLORS.warning, duration: 200, yoyo: true, repeat: -1 });
    }

    // Pop up animation
    parts.forEach(p => { p.y += 60; p.setAlpha(0); });
    this.tweens.add({
      targets: parts, y: '-=60', alpha: 1, duration: 200, ease: 'Back.easeOut',
    });

    // Click handler
    const whack = () => {
      if (!hole.active || !this.gameActive) return;
      hole.active = false;

      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      const mult = Math.min(this.combo, 5);
      const pts = (hole.golden ? 50 : 10) * mult;
      this.score += pts;
      this.scoreText.setText(`Score: ${this.score}`);

      const color = hole.golden ? COLORS.gold : COLORS.warning;
      burstParticles(this, hole.x, hole.y, color, hole.golden ? 15 : 8, 35);
      floatingText(this, hole.x, hole.y - 20, `+${pts}`, hole.golden ? '#ffd700' : '#feca57');
      shake(this, 0.003, 80);

      if (this.combo >= 3) {
        this.comboText.setText(`${this.combo}x COMBO!`).setAlpha(1);
        this.tweens.add({ targets: this.comboText, alpha: 0, duration: 800, delay: 200 });
      }

      if (hole.golden) {
        flashScreen(this, COLORS.gold, 0.15, 200);
      }

      // Squish animation
      this.tweens.add({
        targets: parts, scaleY: 0.3, alpha: 0, duration: 150,
        onComplete: () => parts.forEach(p => p.destroy()),
      });

      hole.mole = null;
    };

    moleBody.on('pointerdown', whack);
    moleHead.setInteractive({ useHandCursor: true }).on('pointerdown', whack);

    // Auto hide if not whacked
    this.time.delayedCall(this.moleSpeed, () => {
      if (hole.active) {
        hole.active = false;
        this.combo = 0; // Reset combo on miss

        this.tweens.add({
          targets: parts, y: '+=60', alpha: 0, duration: 200,
          onComplete: () => parts.forEach(p => p.destroy()),
        });
        hole.mole = null;
      }
    });

    // Schedule next mole
    const nextDelay = Phaser.Math.Between(400, Math.max(600, 1200 - this.timeLeft * 15));
    this.time.delayedCall(nextDelay, () => this.spawnMole());

    // Sometimes spawn 2 moles
    if (this.timeLeft < 15 && Math.random() < 0.3) {
      this.time.delayedCall(200, () => this.spawnMole());
    }
  }

  updateTimerBar() {
    const pct = this.timeLeft / 30;
    this.timerBar.setSize(300 * pct, 8);
    if (pct < 0.3) this.timerBar.setFillStyle(COLORS.danger);
    else if (pct < 0.6) this.timerBar.setFillStyle(COLORS.warning);
  }

  update() {}
}
