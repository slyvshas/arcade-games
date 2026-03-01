import Phaser from 'phaser';
import { COLORS, createBackButton, showGameOver } from '../utils';

export default class WhackAMoleGame extends Phaser.Scene {
  constructor() {
    super('WhackAMoleGame');
  }

  create() {
    this.score = 0;
    this.timeLeft = 30;
    this.gameActive = true;
    this.combo = 0;

    createBackButton(this);

    // Background (dirt)
    this.add.rectangle(400, 300, 800, 600, 0x3d2b1f).setDepth(-1);

    // Grass top
    this.add.rectangle(400, 50, 800, 100, 0x4a7c3f).setDepth(-1);

    this.scoreText = this.add.text(580, 16, 'Score: 0', {
      fontFamily: 'Orbitron, monospace', fontSize: '20px', color: '#feca57',
    }).setDepth(100);

    this.timerText = this.add.text(300, 16, 'Time: 30', {
      fontFamily: 'Orbitron, monospace', fontSize: '20px', color: '#ff6b6b',
    }).setDepth(100);

    this.comboText = this.add.text(400, 90, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '16px', color: '#55efc4',
    }).setOrigin(0.5).setDepth(100);

    // Create mole holes in 3x3 grid
    this.holes = [];
    const cols = 3;
    const rows = 3;
    const startX = 200;
    const startY = 170;
    const gapX = 200;
    const gapY = 140;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * gapX;
        const y = startY + r * gapY;
        this.createHole(x, y);
      }
    }

    // Timer
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText('Time: ' + this.timeLeft);
        if (this.timeLeft <= 0) {
          this.gameActive = false;
          this.timerEvent.destroy();
          if (this.spawnEvent) this.spawnEvent.destroy();
          showGameOver(this, this.score, 'WhackAMoleGame');
        }
      },
      loop: true,
    });

    // Spawn moles
    this.spawnEvent = this.time.addEvent({
      delay: 800,
      callback: this.spawnMole,
      callbackScope: this,
      loop: true,
    });

    // Start text
    const txt = this.add.text(400, 300, 'WHACK THE MOLES!', {
      fontFamily: 'Orbitron, monospace', fontSize: '24px', color: '#ffffff',
      backgroundColor: '#00000088', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(50);
    this.time.delayedCall(1500, () => txt.destroy());
  }

  createHole(x, y) {
    const hole = {
      x, y, active: false, mole: null,
    };

    // Hole shadow
    this.add.ellipse(x, y + 30, 90, 30, 0x1a0f0a, 0.6);

    // Hole
    const holeGfx = this.add.ellipse(x, y + 20, 80, 24, 0x2a1a0f);
    holeGfx.setDepth(2);

    // Mole
    const moleBody = this.add.ellipse(x, y + 40, 50, 40, 0x8B6914);
    moleBody.setDepth(1);
    moleBody.setAlpha(0);
    hole.moleBody = moleBody;

    // Mole face
    const leftEye = this.add.circle(x - 10, y + 25, 5, 0xffffff);
    leftEye.setDepth(1).setAlpha(0);
    hole.leftEye = leftEye;

    const rightEye = this.add.circle(x + 10, y + 25, 5, 0xffffff);
    rightEye.setDepth(1).setAlpha(0);
    hole.rightEye = rightEye;

    const leftPupil = this.add.circle(x - 10, y + 25, 2.5, 0x000000);
    leftPupil.setDepth(1).setAlpha(0);
    hole.leftPupil = leftPupil;

    const rightPupil = this.add.circle(x + 10, y + 25, 2.5, 0x000000);
    rightPupil.setDepth(1).setAlpha(0);
    hole.rightPupil = rightPupil;

    const nose = this.add.circle(x, y + 32, 4, 0xff9999);
    nose.setDepth(1).setAlpha(0);
    hole.nose = nose;

    // Hit zone
    const hitZone = this.add.rectangle(x, y + 10, 70, 60, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(3);

    hitZone.on('pointerdown', () => this.whack(hole));

    this.holes.push(hole);
  }

  spawnMole() {
    if (!this.gameActive) return;

    const inactive = this.holes.filter(h => !h.active);
    if (inactive.length === 0) return;

    const hole = Phaser.Utils.Array.GetRandom(inactive);
    hole.active = true;

    // Show mole
    const parts = [hole.moleBody, hole.leftEye, hole.rightEye, hole.leftPupil, hole.rightPupil, hole.nose];
    parts.forEach(p => p.setAlpha(1));

    // Pop up animation
    this.tweens.add({
      targets: hole.moleBody,
      y: hole.y, duration: 150, ease: 'Back.easeOut',
    });
    this.tweens.add({ targets: hole.leftEye, y: hole.y - 8, duration: 150 });
    this.tweens.add({ targets: hole.rightEye, y: hole.y - 8, duration: 150 });
    this.tweens.add({ targets: hole.leftPupil, y: hole.y - 8, duration: 150 });
    this.tweens.add({ targets: hole.rightPupil, y: hole.y - 8, duration: 150 });
    this.tweens.add({ targets: hole.nose, y: hole.y, duration: 150 });

    // Auto-hide after delay
    const duration = Math.max(600, 1500 - this.score * 5);
    hole.hideTimer = this.time.delayedCall(duration, () => {
      if (hole.active) {
        this.hideMole(hole);
        this.combo = 0;
        this.comboText.setText('');
      }
    });
  }

  hideMole(hole) {
    hole.active = false;
    const parts = [hole.moleBody, hole.leftEye, hole.rightEye, hole.leftPupil, hole.rightPupil, hole.nose];
    this.tweens.add({
      targets: hole.moleBody, y: hole.y + 40, duration: 100,
    });
    this.time.delayedCall(100, () => {
      parts.forEach(p => p.setAlpha(0));
      // Reset positions
      hole.moleBody.y = hole.y + 40;
      hole.leftEye.y = hole.y + 25;
      hole.rightEye.y = hole.y + 25;
      hole.leftPupil.y = hole.y + 25;
      hole.rightPupil.y = hole.y + 25;
      hole.nose.y = hole.y + 32;
    });
  }

  whack(hole) {
    if (!hole.active || !this.gameActive) return;

    if (hole.hideTimer) hole.hideTimer.destroy();

    this.combo++;
    const points = 10 * this.combo;
    this.score += points;
    this.scoreText.setText('Score: ' + this.score);

    if (this.combo > 1) {
      this.comboText.setText(`${this.combo}x COMBO! +${points}`);
    }

    // Hit effect
    const star = this.add.text(hole.x, hole.y - 20, `+${points}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '18px', color: '#feca57',
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({
      targets: star, y: hole.y - 60, alpha: 0, duration: 600,
      onComplete: () => star.destroy(),
    });

    // Flash mole red then hide
    hole.moleBody.setFillStyle(COLORS.danger);
    this.time.delayedCall(100, () => {
      hole.moleBody.setFillStyle(0x8B6914);
      this.hideMole(hole);
    });

    // Speed up spawning
    if (this.score % 50 === 0 && this.spawnEvent.delay > 400) {
      this.spawnEvent.delay -= 50;
    }
  }
}
