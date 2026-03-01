import Phaser from 'phaser';
import { COLORS, createBackButton, showGameOver } from '../utils';

export default class RunnerGame extends Phaser.Scene {
  constructor() {
    super('RunnerGame');
  }

  create() {
    this.score = 0;
    this.gameActive = true;
    this.speed = 4;
    this.jumpForce = -500;
    this.isJumping = false;
    this.isDucking = false;
    this.obstacleTimer = 0;

    this.physics.world.gravity.y = 1200;
    createBackButton(this);

    // Sky gradient
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x1a2a4a, 0x1a2a4a, 0x2a1a3a, 0x2a1a3a);
    sky.fillRect(0, 0, 800, 600);
    sky.setDepth(-3);

    // Stars
    for (let i = 0; i < 30; i++) {
      this.add.circle(
        Phaser.Math.Between(0, 800),
        Phaser.Math.Between(0, 300),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.2, 0.6)
      ).setDepth(-2);
    }

    // Ground
    this.groundY = 500;
    this.groundTiles = [];
    for (let i = 0; i < 20; i++) {
      const tile = this.add.rectangle(i * 50, this.groundY, 48, 100, 0x3a3a5e);
      tile.setOrigin(0, 0);
      this.groundTiles.push(tile);
    }

    // Ground line
    this.add.rectangle(400, this.groundY, 800, 2, COLORS.primaryLight);

    // Ground physics
    const ground = this.add.rectangle(400, this.groundY + 50, 800, 100, 0x000000, 0);
    this.physics.add.existing(ground, true);
    this.groundBody = ground;

    // Player
    this.player = this.add.rectangle(120, this.groundY - 25, 28, 40, COLORS.accentLight);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(false);
    this.physics.add.collider(this.player, this.groundBody);

    // Player eyes
    this.eyes = this.add.graphics();

    // Obstacles
    this.obstacles = this.physics.add.group();
    this.physics.add.collider(this.obstacles, this.groundBody);
    this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);

    // Score
    this.scoreText = this.add.text(600, 16, 'Score: 0', {
      fontFamily: 'Orbitron, monospace', fontSize: '20px', color: '#feca57',
    }).setDepth(100);

    this.speedText = this.add.text(300, 16, 'Speed: 1x', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '14px', color: '#636e72',
    }).setDepth(100);

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-SPACE', () => this.jump());
    this.input.keyboard.on('keydown-UP', () => this.jump());
    this.input.keyboard.on('keydown-DOWN', () => this.duck());
    this.input.keyboard.on('keyup-DOWN', () => this.unduck());

    this.input.on('pointerdown', (p) => {
      if (p.y < 400) this.jump();
      else this.duck();
    });
    this.input.on('pointerup', () => this.unduck());

    // Instruction
    const inst = this.add.text(400, 300, 'SPACE/TAP to Jump\nDOWN/TAP BOTTOM to Duck', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '16px', color: '#ffffff',
      align: 'center', backgroundColor: '#00000088', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(50);
    this.time.delayedCall(2500, () => inst.destroy());
  }

  jump() {
    if (!this.gameActive) return;
    if (this.player.body.touching.down) {
      this.player.body.setVelocityY(this.jumpForce);
    }
  }

  duck() {
    if (!this.gameActive) return;
    this.isDucking = true;
    this.player.setSize(28, 20);
    this.player.body.setSize(28, 20);
    this.player.y = this.groundY - 12;
  }

  unduck() {
    this.isDucking = false;
    this.player.setSize(28, 40);
    this.player.body.setSize(28, 40);
  }

  spawnObstacle() {
    if (!this.gameActive) return;
    const type = Phaser.Math.Between(0, 2);

    let obs;
    if (type === 0) {
      // Small cactus
      obs = this.add.rectangle(850, this.groundY - 20, 16, 36, COLORS.success);
      this.physics.add.existing(obs);
    } else if (type === 1) {
      // Tall cactus
      obs = this.add.rectangle(850, this.groundY - 30, 20, 55, COLORS.success);
      this.physics.add.existing(obs);
    } else {
      // Flying obstacle
      obs = this.add.rectangle(850, this.groundY - 60 - Phaser.Math.Between(0, 40), 30, 14, COLORS.danger);
      this.physics.add.existing(obs);
      obs.body.allowGravity = false;
    }

    obs.body.setVelocityX(-200 - this.speed * 30);
    obs.body.allowGravity = false;
    obs.body.setImmovable(true);
    this.obstacles.add(obs);
  }

  hitObstacle() {
    if (!this.gameActive) return;
    this.gameActive = false;
    this.physics.pause();
    this.player.setFillStyle(COLORS.danger);
    this.time.delayedCall(500, () => showGameOver(this, this.score, 'RunnerGame'));
  }

  update(time) {
    if (!this.gameActive) return;

    // Score
    this.score = Math.floor(time / 100);
    this.scoreText.setText('Score: ' + this.score);

    // Speed up
    this.speed = 4 + Math.floor(this.score / 50);
    this.speedText.setText('Speed: ' + (this.speed / 4).toFixed(1) + 'x');

    // Spawn obstacles
    this.obstacleTimer += 1;
    const spawnRate = Math.max(40, 100 - this.speed * 3);
    if (this.obstacleTimer > spawnRate) {
      this.obstacleTimer = 0;
      this.spawnObstacle();
    }

    // Scroll ground tiles
    this.groundTiles.forEach(tile => {
      tile.x -= this.speed;
      if (tile.x < -50) tile.x += 1000;
    });

    // Remove off-screen obstacles
    this.obstacles.children.entries.forEach(obs => {
      if (obs.active && obs.x < -50) obs.destroy();
    });

    // Draw eyes
    this.eyes.clear();
    const px = this.player.x;
    const py = this.player.y - (this.isDucking ? 2 : 10);
    this.eyes.fillStyle(0xffffff);
    this.eyes.fillCircle(px - 4, py, 3);
    this.eyes.fillCircle(px + 4, py, 3);
    this.eyes.fillStyle(0x000000);
    this.eyes.fillCircle(px - 3, py, 1.5);
    this.eyes.fillCircle(px + 5, py, 1.5);
  }

  shutdown() {
    this.physics.world.gravity.y = 0;
  }
}
