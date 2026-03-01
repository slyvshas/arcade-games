import Phaser from 'phaser';
import { COLORS, createBackButton, showGameOver } from '../utils';

export default class PongGame extends Phaser.Scene {
  constructor() {
    super('PongGame');
  }

  create() {
    this.playerScore = 0;
    this.aiScore = 0;
    this.gameActive = true;
    this.maxScore = 5;
    this.aiSpeed = 3;

    createBackButton(this);

    // Background
    this.add.rectangle(400, 300, 800, 600, 0x0a1628).setDepth(-1);

    // Center line
    for (let i = 0; i < 20; i++) {
      this.add.rectangle(400, 15 + i * 30, 3, 15, 0x2a3a4a);
    }

    // Center circle
    const gfx = this.add.graphics();
    gfx.lineStyle(2, 0x2a3a4a);
    gfx.strokeCircle(400, 300, 60);

    // Score display
    this.playerScoreText = this.add.text(300, 40, '0', {
      fontFamily: 'Orbitron, monospace', fontSize: '48px', color: '#2a3a4a',
    }).setOrigin(0.5);

    this.aiScoreText = this.add.text(500, 40, '0', {
      fontFamily: 'Orbitron, monospace', fontSize: '48px', color: '#2a3a4a',
    }).setOrigin(0.5);

    // Paddles
    this.playerPaddle = this.add.rectangle(40, 300, 12, 80, COLORS.blueLight);
    this.physics.add.existing(this.playerPaddle);
    this.playerPaddle.body.setImmovable(true);
    this.playerPaddle.body.setCollideWorldBounds(true);

    this.aiPaddle = this.add.rectangle(760, 300, 12, 80, COLORS.danger);
    this.physics.add.existing(this.aiPaddle);
    this.aiPaddle.body.setImmovable(true);
    this.aiPaddle.body.setCollideWorldBounds(true);

    // Ball
    this.ball = this.add.circle(400, 300, 8, COLORS.white);
    this.physics.add.existing(this.ball);
    this.ball.body.setBounce(1);
    this.ball.body.setCollideWorldBounds(true);
    this.physics.world.setBoundsCollision(false, false, true, true);

    // Collisions
    this.physics.add.collider(this.ball, this.playerPaddle, this.hitPaddle, null, this);
    this.physics.add.collider(this.ball, this.aiPaddle, this.hitPaddle, null, this);

    // Trail effect for ball
    this.trail = this.add.graphics();

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S');

    // Touch control
    this.input.on('pointermove', (pointer) => {
      if (!this.gameActive) return;
      this.playerPaddle.y = Phaser.Math.Clamp(pointer.y, 50, 550);
    });

    // Launch ball
    this.launchBall();
  }

  launchBall() {
    this.ball.setPosition(400, 300);
    this.ball.body.setVelocity(0, 0);

    this.time.delayedCall(800, () => {
      if (!this.gameActive) return;
      const dir = Math.random() > 0.5 ? 1 : -1;
      const angle = Phaser.Math.Between(-30, 30);
      this.ball.body.setVelocity(dir * 300, angle * 3);
    });
  }

  hitPaddle(ball, paddle) {
    const diff = ball.y - paddle.y;
    const norm = diff / 40;
    ball.body.setVelocityY(norm * 300);

    // Speed up
    const vx = ball.body.velocity.x;
    ball.body.setVelocityX(vx > 0 ? Math.min(vx + 20, 500) : Math.max(vx - 20, -500));
  }

  update() {
    if (!this.gameActive) return;

    // Player paddle keyboard control
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      this.playerPaddle.y = Math.max(50, this.playerPaddle.y - 6);
    }
    if (this.cursors.down.isDown || this.wasd.S.isDown) {
      this.playerPaddle.y = Math.min(550, this.playerPaddle.y + 6);
    }
    this.playerPaddle.body.reset(40, this.playerPaddle.y);

    // AI paddle
    const target = this.ball.y;
    const diff = target - this.aiPaddle.y;
    const speed = this.aiSpeed + Math.abs(this.ball.body.velocity.x) / 150;
    if (Math.abs(diff) > 10) {
      this.aiPaddle.y += Math.sign(diff) * Math.min(speed, Math.abs(diff));
    }
    this.aiPaddle.y = Phaser.Math.Clamp(this.aiPaddle.y, 50, 550);
    this.aiPaddle.body.reset(760, this.aiPaddle.y);

    // Ball trail
    this.trail.clear();
    this.trail.fillStyle(COLORS.white, 0.15);
    this.trail.fillCircle(this.ball.x - this.ball.body.velocity.x * 0.02, this.ball.y - this.ball.body.velocity.y * 0.02, 6);
    this.trail.fillStyle(COLORS.white, 0.05);
    this.trail.fillCircle(this.ball.x - this.ball.body.velocity.x * 0.04, this.ball.y - this.ball.body.velocity.y * 0.04, 4);

    // Scoring
    if (this.ball.x < 10) {
      this.aiScore++;
      this.aiScoreText.setText(this.aiScore.toString());
      this.checkWin();
      this.launchBall();
    }
    if (this.ball.x > 790) {
      this.playerScore++;
      this.playerScoreText.setText(this.playerScore.toString());
      this.checkWin();
      this.launchBall();
    }
  }

  checkWin() {
    if (this.playerScore >= this.maxScore) {
      this.gameActive = false;
      const score = this.playerScore * 100 - this.aiScore * 50;
      showGameOver(this, Math.max(0, score), 'PongGame');
    } else if (this.aiScore >= this.maxScore) {
      this.gameActive = false;
      showGameOver(this, this.playerScore * 50, 'PongGame');
    }
  }
}
