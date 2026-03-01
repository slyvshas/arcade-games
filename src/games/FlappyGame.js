import Phaser from 'phaser';
import { COLORS, createBackButton, showGameOver } from '../utils';

export default class FlappyGame extends Phaser.Scene {
  constructor() {
    super('FlappyGame');
  }

  create() {
    this.score = 0;
    this.gameActive = false;
    this.started = false;
    this.pipeSpeed = -200;
    this.pipeGap = 160;
    this.pipeTimer = null;

    createBackButton(this);

    // Sky
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x1a3a5c, 0x1a3a5c, 0x0a2040, 0x0a2040);
    sky.fillRect(0, 0, 800, 600);
    sky.setDepth(-2);

    // Clouds
    for (let i = 0; i < 5; i++) {
      const cx = Phaser.Math.Between(0, 800);
      const cy = Phaser.Math.Between(30, 200);
      const cloud = this.add.ellipse(cx, cy, Phaser.Math.Between(60, 120), 30, 0xffffff, 0.05);
      cloud.setDepth(-1);
    }

    // Ground
    this.ground = this.add.rectangle(400, 580, 800, 40, 0x3d5c3a);
    this.physics.add.existing(this.ground, true);

    // Bird
    this.bird = this.add.rectangle(150, 300, 30, 22, COLORS.warning);
    this.physics.add.existing(this.bird);
    this.bird.body.setGravityY(800);
    this.bird.body.setCollideWorldBounds(false);
    this.bird.body.allowGravity = false;

    // Bird wing
    this.wing = this.add.triangle(140, 300, 0, 0, -12, -8, -12, 8, COLORS.warningLight);

    // Bird eye
    this.eye = this.add.circle(160, 296, 4, 0xffffff);
    this.pupil = this.add.circle(162, 296, 2, 0x000000);
    // Beak
    this.beak = this.add.triangle(170, 300, 0, 0, 10, 4, 0, 8, COLORS.orange);

    // Pipes group
    this.pipes = this.physics.add.group();
    this.scoreZones = this.physics.add.group();

    // Colliders
    this.physics.add.collider(this.bird, this.ground, () => this.die());
    this.physics.add.collider(this.bird, this.pipes, () => this.die());
    this.physics.add.overlap(this.bird, this.scoreZones, this.addScore, null, this);

    // Score display
    this.scoreText = this.add.text(400, 50, '0', {
      fontFamily: 'Orbitron, monospace', fontSize: '48px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(50);

    // Start instruction
    this.startText = this.add.text(400, 350, 'TAP or SPACE to fly!', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '20px', color: '#ffffff',
      backgroundColor: '#00000066', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(50);

    // Controls
    this.input.keyboard.on('keydown-SPACE', () => this.flap());
    this.input.on('pointerdown', () => this.flap());

    // Idle animation
    this.tweens.add({
      targets: this.bird,
      y: 280, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  flap() {
    if (!this.started) {
      this.started = true;
      this.gameActive = true;
      this.bird.body.allowGravity = true;
      this.tweens.killTweensOf(this.bird);
      if (this.startText) this.startText.destroy();
      // Start spawning pipes
      this.spawnPipe();
      this.pipeTimer = this.time.addEvent({
        delay: 1800, callback: this.spawnPipe, callbackScope: this, loop: true,
      });
    }
    if (!this.gameActive) return;
    this.bird.body.setVelocityY(-280);
  }

  spawnPipe() {
    if (!this.gameActive) return;
    const gapY = Phaser.Math.Between(130, 430);
    const pipeW = 52;

    // Top pipe
    const topH = gapY - this.pipeGap / 2;
    const top = this.add.rectangle(850, topH / 2, pipeW, topH, COLORS.success);
    this.physics.add.existing(top);
    top.body.setVelocityX(this.pipeSpeed);
    top.body.setImmovable(true);
    top.body.allowGravity = false;
    this.pipes.add(top);

    // Top pipe cap
    const topCap = this.add.rectangle(850, topH - 2, pipeW + 8, 16, COLORS.successLight);
    this.physics.add.existing(topCap);
    topCap.body.setVelocityX(this.pipeSpeed);
    topCap.body.setImmovable(true);
    topCap.body.allowGravity = false;
    this.pipes.add(topCap);

    // Bottom pipe
    const botTop = gapY + this.pipeGap / 2;
    const botH = 560 - botTop;
    const bot = this.add.rectangle(850, botTop + botH / 2, pipeW, botH, COLORS.success);
    this.physics.add.existing(bot);
    bot.body.setVelocityX(this.pipeSpeed);
    bot.body.setImmovable(true);
    bot.body.allowGravity = false;
    this.pipes.add(bot);

    // Bottom pipe cap
    const botCap = this.add.rectangle(850, botTop + 2, pipeW + 8, 16, COLORS.successLight);
    this.physics.add.existing(botCap);
    botCap.body.setVelocityX(this.pipeSpeed);
    botCap.body.setImmovable(true);
    botCap.body.allowGravity = false;
    this.pipes.add(botCap);

    // Score zone
    const zone = this.add.rectangle(850, gapY, 4, this.pipeGap, 0x000000, 0);
    this.physics.add.existing(zone);
    zone.body.setVelocityX(this.pipeSpeed);
    zone.body.allowGravity = false;
    zone.scored = false;
    this.scoreZones.add(zone);
  }

  addScore(bird, zone) {
    if (zone.scored) return;
    zone.scored = true;
    this.score++;
    this.scoreText.setText(this.score.toString());

    // Speed up gradually
    if (this.score % 5 === 0 && this.pipeSpeed > -350) {
      this.pipeSpeed -= 20;
    }
  }

  die() {
    if (!this.gameActive) return;
    this.gameActive = false;
    if (this.pipeTimer) this.pipeTimer.destroy();
    this.bird.setFillStyle(COLORS.danger);
    this.physics.pause();
    this.time.delayedCall(600, () => showGameOver(this, this.score, 'FlappyGame'));
  }

  update() {
    if (!this.started) return;

    // Update bird parts
    const bx = this.bird.x;
    const by = this.bird.y;
    const rot = Phaser.Math.Clamp(this.bird.body.velocity.y / 600, -0.5, 0.5);
    this.bird.rotation = rot;
    this.wing.setPosition(bx - 12, by);
    this.eye.setPosition(bx + 8, by - 4);
    this.pupil.setPosition(bx + 9, by - 4);
    this.beak.setPosition(bx + 18, by);

    // Remove off-screen pipes
    this.pipes.children.entries.forEach(pipe => {
      if (pipe.x < -60) pipe.destroy();
    });
    this.scoreZones.children.entries.forEach(zone => {
      if (zone.x < -60) zone.destroy();
    });

    // Bird fell off screen
    if (this.bird.y > 600 || this.bird.y < -50) {
      this.die();
    }
  }
}
