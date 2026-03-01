import Phaser from 'phaser';
import { COLORS, createBackButton, createScoreDisplay, showGameOver, shake, burstParticles, floatingText, flashScreen } from '../utils';

export default class FlappyGame extends Phaser.Scene {
  constructor() { super('FlappyGame'); }

  create() {
    this.cameras.main.fadeIn(300);
    this.physics.world.gravity.y = 0;

    this.score = 0;
    this.gameActive = false;
    this.started = false;
    this.pipeSpeed = -220;
    this.gapSize = 160;
    this.passed = new Set();
    this.bestStreak = 0;

    // ── Scrolling Background ──
    this.bgLayers = [];
    // Far layer (dark buildings)
    for (let i = 0; i < 12; i++) {
      const bh = Phaser.Math.Between(80, 200);
      const bx = i * 80;
      const b = this.add.rectangle(bx, 600 - bh / 2, 60, bh, 0x0c0c20).setDepth(-3);
      this.bgLayers.push({ obj: b, speed: 0.3 });
    }
    // Near layer (lighter buildings)
    for (let i = 0; i < 8; i++) {
      const bh = Phaser.Math.Between(60, 140);
      const bx = i * 110 + 30;
      const b = this.add.rectangle(bx, 600 - bh / 2, 80, bh, 0x141435).setDepth(-2);
      this.bgLayers.push({ obj: b, speed: 0.6 });
    }

    // Stars
    for (let i = 0; i < 30; i++) {
      this.add.circle(
        Phaser.Math.Between(0, 800), Phaser.Math.Between(0, 250),
        Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.05, 0.2)
      ).setDepth(-4);
    }

    // ── Ground ──
    this.ground = this.add.rectangle(400, 590, 800, 20, 0x1a1a3a).setDepth(5);
    this.add.rectangle(400, 581, 800, 2, COLORS.neon, 0.3).setDepth(5);

    // ── Bird ──
    this.bird = this.add.rectangle(150, 300, 30, 22, COLORS.warning).setDepth(10);
    this.physics.add.existing(this.bird);
    this.bird.body.allowGravity = false;
    this.bird.body.setSize(26, 18);
    // Wing
    this.wing = this.add.triangle(140, 300, 0, 0, -12, -8, -12, 8, COLORS.orange).setDepth(9);
    // Eye
    this.birdEye = this.add.circle(160, 296, 4, 0xffffff).setDepth(11);
    this.birdPupil = this.add.circle(162, 295, 2, 0x000000).setDepth(12);
    // Beak
    this.beak = this.add.triangle(168, 300, 0, -4, 10, 0, 0, 4, COLORS.orange).setDepth(11);

    // ── Pipes ──
    this.pipes = this.physics.add.group();
    this.pipeTimer = null;

    // ── Input ──
    this.input.on('pointerdown', () => this.flap());
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey.on('down', () => this.flap());

    // ── UI ──
    createBackButton(this);
    this.scoreText = this.add.text(400, 60, '0', {
      fontFamily: 'Orbitron, monospace', fontSize: '56px', color: '#ffffff',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(100).setAlpha(0.7);

    // Start prompt
    this.startText = this.add.text(400, 350, 'TAP or SPACE to Start', {
      fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#636e72',
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: this.startText, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });

    // Idle bird float
    this.tweens.add({
      targets: [this.bird, this.wing, this.birdEye, this.birdPupil, this.beak],
      y: '+=10', duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  flap() {
    if (!this.started) {
      this.startGame();
      return;
    }
    if (!this.gameActive) return;

    this.bird.body.setVelocityY(-320);

    // Wing flap animation
    this.tweens.add({
      targets: this.wing, angle: -30, duration: 80,
      yoyo: true, ease: 'Power1',
    });

    // Tiny particles
    burstParticles(this, this.bird.x - 10, this.bird.y + 5, 0xffffff, 3, 10);
  }

  startGame() {
    this.started = true;
    this.gameActive = true;
    this.startText.destroy();
    this.tweens.killAll();

    this.bird.body.allowGravity = true;
    this.bird.body.setGravityY(850);
    this.bird.body.setVelocityY(-320);

    // Spawn pipes
    this.pipeTimer = this.time.addEvent({
      delay: 1800,
      callback: this.spawnPipe,
      callbackScope: this,
      loop: true,
    });

    // First pipe after a short delay
    this.time.delayedCall(1200, () => this.spawnPipe());
  }

  spawnPipe() {
    if (!this.gameActive) return;

    const gapY = Phaser.Math.Between(140, 420);
    const gap = this.gapSize - Math.min(this.score * 1.5, 30); // Gets harder

    // Top pipe
    const topH = gapY - gap / 2;
    const top = this.add.rectangle(850, topH / 2, 60, topH, COLORS.neon, 0.8).setDepth(3);
    this.add.rectangle(850, topH - 2, 68, 16, COLORS.neon).setDepth(3).setData('pipeDecor', true);
    this.physics.add.existing(top);
    top.body.allowGravity = false;
    top.body.setVelocityX(this.pipeSpeed - this.score * 3);
    top.body.setImmovable(true);
    this.pipes.add(top);

    // Bottom pipe
    const botY = gapY + gap / 2;
    const botH = 600 - botY;
    const bot = this.add.rectangle(850, botY + botH / 2, 60, botH, COLORS.neon, 0.8).setDepth(3);
    this.add.rectangle(850, botY + 2, 68, 16, COLORS.neon).setDepth(3).setData('pipeDecor', true);
    this.physics.add.existing(bot);
    bot.body.allowGravity = false;
    bot.body.setVelocityX(this.pipeSpeed - this.score * 3);
    bot.body.setImmovable(true);
    this.pipes.add(bot);

    // Score trigger
    const trigger = this.add.rectangle(850, 300, 4, 600, 0x000000, 0).setDepth(0);
    this.physics.add.existing(trigger);
    trigger.body.allowGravity = false;
    trigger.body.setVelocityX(this.pipeSpeed - this.score * 3);
    trigger.setData('scored', false);
    this.pipes.add(trigger);
  }

  update(time, delta) {
    if (!this.started) return;

    // Scroll backgrounds
    this.bgLayers.forEach(l => {
      l.obj.x += (this.pipeSpeed * 0.005 * l.speed);
      if (l.obj.x < -80) l.obj.x = 860;
    });

    if (!this.gameActive) return;

    // Update bird visual parts
    const by = this.bird.y;
    this.wing.setPosition(this.bird.x - 12, by);
    this.birdEye.setPosition(this.bird.x + 8, by - 4);
    this.birdPupil.setPosition(this.bird.x + 9, by - 5);
    this.beak.setPosition(this.bird.x + 18, by);

    // Bird rotation based on velocity
    const vy = this.bird.body.velocity.y;
    this.bird.setAngle(Phaser.Math.Clamp(vy * 0.1, -25, 70));

    // Check pipe collisions & scoring
    this.pipes.getChildren().forEach(pipe => {
      if (!pipe.active) return;

      // Score trigger
      if (pipe.getData('scored') === false && pipe.x < this.bird.x) {
        pipe.setData('scored', true);
        this.score++;
        this.scoreText.setText(String(this.score));

        // Score flash
        this.tweens.add({
          targets: this.scoreText, scale: 1.3, duration: 100, yoyo: true,
        });
        floatingText(this, this.bird.x + 40, this.bird.y, '+1', '#00ff88', '16px');
      }

      // Collision with pipes
      if (pipe.getData('scored') !== false && pipe.getData('pipeDecor') !== true) {
        if (Phaser.Geom.Rectangle.Overlaps(this.bird.getBounds(), pipe.getBounds())) {
          this.die();
          return;
        }
      }

      // Cleanup off-screen
      if (pipe.x < -100) pipe.destroy();
    });

    // Floor/ceiling death
    if (this.bird.y > 575 || this.bird.y < 5) {
      this.die();
    }

    // Trail
    const tr = this.add.circle(this.bird.x - 10, by, 3, COLORS.warning, 0.4);
    this.tweens.add({ targets: tr, alpha: 0, scale: 0, duration: 300, onComplete: () => tr.destroy() });
  }

  die() {
    if (!this.gameActive) return;
    this.gameActive = false;

    shake(this, 0.012, 300);
    flashScreen(this, COLORS.danger, 0.5, 400);
    burstParticles(this, this.bird.x, this.bird.y, COLORS.warning, 15, 40);

    if (this.pipeTimer) this.pipeTimer.destroy();
    this.physics.pause();

    this.time.delayedCall(600, () => {
      showGameOver(this, this.score, 'FlappyGame');
    });
  }
}
