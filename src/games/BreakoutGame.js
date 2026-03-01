import Phaser from 'phaser';
import { COLORS, createBackButton, showGameOver } from '../utils';

export default class BreakoutGame extends Phaser.Scene {
  constructor() {
    super('BreakoutGame');
  }

  create() {
    this.score = 0;
    this.lives = 3;
    this.gameActive = true;
    this.launched = false;

    createBackButton(this);

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a2e, 0x0a0a2e, 0x1a1a4e, 0x1a1a4e);
    bg.fillRect(0, 0, 800, 600);
    bg.setDepth(-1);

    this.scoreText = this.add.text(650, 16, 'Score: 0', {
      fontFamily: 'Orbitron, monospace', fontSize: '18px', color: '#feca57',
    }).setDepth(100);

    this.livesText = this.add.text(350, 16, '', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '16px', color: '#ff6b6b',
    }).setDepth(100);
    this.updateLives();

    // Paddle
    this.paddle = this.add.rectangle(400, 560, 100, 14, COLORS.blueLight);
    this.physics.add.existing(this.paddle, true);

    // Ball
    this.ball = this.add.circle(400, 545, 7, COLORS.white);
    this.physics.add.existing(this.ball);
    this.ball.body.setCollideWorldBounds(true);
    this.ball.body.setBounce(1);
    this.ball.body.setMaxVelocity(400, 400);

    // Walls - top and sides only
    this.physics.world.setBoundsCollision(true, true, true, false);

    // Bricks
    this.bricks = this.physics.add.staticGroup();
    const brickColors = [COLORS.danger, COLORS.orange, COLORS.warning, COLORS.success, COLORS.blue, COLORS.primary];
    const rows = 6;
    const cols = 10;
    const brickW = 64;
    const brickH = 18;
    const startX = (800 - cols * (brickW + 6)) / 2 + brickW / 2;
    const startY = 80;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const bx = startX + col * (brickW + 6);
        const by = startY + row * (brickH + 6);
        const brick = this.add.rectangle(bx, by, brickW, brickH, brickColors[row]);
        this.physics.add.existing(brick, true);
        brick.scoreValue = (rows - row) * 10;
        this.bricks.add(brick);
      }
    }

    // Collisions
    this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, null, this);
    this.physics.add.collider(this.ball, this.bricks, this.hitBrick, null, this);

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Launch instruction
    this.launchText = this.add.text(400, 480, 'Click or press SPACE to launch', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '14px', color: '#636e72',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-SPACE', () => this.launchBall());
    this.input.on('pointerdown', (p) => {
      if (!this.launched) this.launchBall();
    });

    // Touch/mouse paddle control
    this.input.on('pointermove', (pointer) => {
      if (!this.gameActive) return;
      const px = Phaser.Math.Clamp(pointer.x, 50, 750);
      this.paddle.x = px;
      this.paddle.body.reset(px, 560);
      if (!this.launched) {
        this.ball.x = px;
        this.ball.body.reset(px, 545);
      }
    });
  }

  launchBall() {
    if (this.launched || !this.gameActive) return;
    this.launched = true;
    if (this.launchText) this.launchText.destroy();
    const angle = Phaser.Math.Between(-60, 60);
    this.physics.velocityFromAngle(angle - 90, 350, this.ball.body.velocity);
  }

  hitPaddle(ball, paddle) {
    const diff = ball.x - paddle.x;
    const norm = diff / 50;
    ball.body.setVelocityX(norm * 300);
    // Ensure upward
    if (ball.body.velocity.y > 0) ball.body.setVelocityY(-Math.abs(ball.body.velocity.y));

    // Speed up slightly
    const speed = Math.sqrt(ball.body.velocity.x ** 2 + ball.body.velocity.y ** 2);
    if (speed < 400) {
      ball.body.velocity.scale(1.02);
    }
  }

  hitBrick(ball, brick) {
    // Particles
    for (let i = 0; i < 5; i++) {
      const p = this.add.rectangle(brick.x, brick.y, 6, 6, brick.fillColor);
      this.tweens.add({
        targets: p, x: brick.x + Phaser.Math.Between(-30, 30),
        y: brick.y + Phaser.Math.Between(-30, 30),
        alpha: 0, scale: 0, duration: 300, onComplete: () => p.destroy(),
      });
    }
    this.score += brick.scoreValue || 10;
    this.scoreText.setText('Score: ' + this.score);
    brick.destroy();

    if (this.bricks.countActive() === 0) {
      this.gameActive = false;
      this.score += 500; // bonus
      showGameOver(this, this.score, 'BreakoutGame');
    }
  }

  updateLives() {
    this.livesText.setText('♥'.repeat(this.lives));
  }

  resetBall() {
    this.launched = false;
    this.ball.body.reset(this.paddle.x, 545);
    this.ball.body.setVelocity(0, 0);
  }

  update() {
    if (!this.gameActive) return;

    // Keyboard paddle
    if (this.cursors.left.isDown) {
      const px = Phaser.Math.Clamp(this.paddle.x - 8, 50, 750);
      this.paddle.x = px;
      this.paddle.body.reset(px, 560);
      if (!this.launched) {
        this.ball.x = px;
        this.ball.body.reset(px, 545);
      }
    } else if (this.cursors.right.isDown) {
      const px = Phaser.Math.Clamp(this.paddle.x + 8, 50, 750);
      this.paddle.x = px;
      this.paddle.body.reset(px, 560);
      if (!this.launched) {
        this.ball.x = px;
        this.ball.body.reset(px, 545);
      }
    }

    // Ball fell below
    if (this.ball.y > 610) {
      this.lives--;
      this.updateLives();
      if (this.lives <= 0) {
        this.gameActive = false;
        showGameOver(this, this.score, 'BreakoutGame');
      } else {
        this.resetBall();
      }
    }
  }
}
