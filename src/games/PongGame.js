import Phaser from 'phaser';
import { COLORS, createBackButton, showGameOver, shake, burstParticles, floatingText, flashScreen } from '../utils';

export default class PongGame extends Phaser.Scene {
  constructor() { super('PongGame'); }

  create() {
    this.cameras.main.fadeIn(300);

    this.playerScore = 0;
    this.aiScore = 0;
    this.winScore = 7;
    this.gameActive = true;
    this.rallies = 0;
    this.maxRally = 0;
    this.difficulty = 0.7; // AI tracking factor

    // ── Background ──
    const gfx = this.add.graphics().setDepth(0);
    gfx.fillStyle(0x0a0a1a);
    gfx.fillRect(0, 0, 800, 600);

    // Center line dashed
    for (let y = 0; y < 600; y += 24) {
      this.add.rectangle(400, y + 6, 2, 12, 0x222244).setDepth(0);
    }

    // Center circle
    gfx.lineStyle(1, 0x222244);
    gfx.strokeCircle(400, 300, 60);

    // ── Paddles ──
    this.paddleH = 90;
    this.player = this.add.rectangle(40, 300, 14, this.paddleH, COLORS.primary).setDepth(5);
    this.physics.add.existing(this.player);
    this.player.body.setImmovable(true);
    this.player.body.setCollideWorldBounds(true);
    // Glow
    this.playerGlow = this.add.rectangle(40, 300, 20, this.paddleH + 10, COLORS.primary, 0.1).setDepth(4);

    this.ai = this.add.rectangle(760, 300, 14, this.paddleH, COLORS.danger).setDepth(5);
    this.physics.add.existing(this.ai);
    this.ai.body.setImmovable(true);
    this.ai.body.setCollideWorldBounds(true);
    this.aiGlow = this.add.rectangle(760, 300, 20, this.paddleH + 10, COLORS.danger, 0.1).setDepth(4);

    // ── Ball ──
    this.ball = this.add.circle(400, 300, 8, COLORS.warning).setDepth(10);
    this.physics.add.existing(this.ball);
    this.ball.body.setCircle(8);
    this.ball.body.setBounce(1.05);
    this.ball.body.setCollideWorldBounds(true);
    this.ball.body.onWorldBounds = true;
    this.ball.body.setMaxVelocity(600, 600);

    // Ball trail
    this.trailTimer = 0;

    // ── Collisions ──
    this.physics.add.collider(this.ball, this.player, (ball, paddle) => this.hitPaddle(ball, paddle, 'player'));
    this.physics.add.collider(this.ball, this.ai, (ball, paddle) => this.hitPaddle(ball, paddle, 'ai'));
    this.physics.world.on('worldbounds', (body, up, down) => {
      if (body.gameObject === this.ball && (up || down)) {
        shake(this, 0.001, 50);
      }
    });

    // ── Controls ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S');

    // ── UI ──
    createBackButton(this);
    this.playerScoreText = this.add.text(300, 40, '0', {
      fontFamily: 'Orbitron, monospace', fontSize: '48px', color: '#6c5ce7',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100).setAlpha(0.5);

    this.aiScoreText = this.add.text(500, 40, '0', {
      fontFamily: 'Orbitron, monospace', fontSize: '48px', color: '#ff6b6b',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100).setAlpha(0.5);

    this.rallyText = this.add.text(400, 85, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '14px', color: '#00ff88',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    this.infoText = this.add.text(400, 565, `First to ${this.winScore} wins!`, {
      fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#333366',
    }).setOrigin(0.5);

    // ── Launch ──
    this.launchBall();
  }

  launchBall() {
    this.ball.setPosition(400, 300);
    this.ball.body.setVelocity(0);
    this.rallies = 0;

    this.time.delayedCall(800, () => {
      if (!this.gameActive) return;
      const dir = Math.random() > 0.5 ? 1 : -1;
      const vy = Phaser.Math.Between(-150, 150);
      this.ball.body.setVelocity(250 * dir, vy);
    });
  }

  hitPaddle(ball, paddle, who) {
    this.rallies++;
    this.maxRally = Math.max(this.maxRally, this.rallies);

    // Angle based on where ball hits paddle
    const diff = ball.y - paddle.y;
    const norm = diff / (this.paddleH / 2);
    const angle = norm * 60;
    const speed = Math.min(500, 280 + this.rallies * 10);

    const dir = who === 'player' ? 1 : -1;
    ball.body.setVelocity(dir * speed, Math.sin(Phaser.Math.DegToRad(angle)) * speed * 0.8);

    burstParticles(this, ball.x, ball.y, who === 'player' ? COLORS.primary : COLORS.danger, 5, 15);
    shake(this, 0.002, 50);

    // Rally milestones
    if (this.rallies === 10 || this.rallies === 20) {
      this.rallyText.setText(`${this.rallies} RALLY!`).setAlpha(1);
      this.tweens.add({ targets: this.rallyText, alpha: 0, duration: 1000, delay: 300 });
      flashScreen(this, COLORS.neon, 0.08, 150);
    }

    // Increase difficulty with rallies
    if (this.rallies > 5) {
      this.difficulty = Math.min(0.95, 0.7 + this.rallies * 0.02);
    }
  }

  scored(who) {
    if (!this.gameActive) return;

    if (who === 'player') {
      this.playerScore++;
      this.playerScoreText.setText(String(this.playerScore));
      burstParticles(this, 700, 300, COLORS.primary, 15, 50);
      floatingText(this, 400, 280, 'PLAYER SCORES!', '#6c5ce7', '20px');
    } else {
      this.aiScore++;
      this.aiScoreText.setText(String(this.aiScore));
      burstParticles(this, 100, 300, COLORS.danger, 15, 50);
      floatingText(this, 400, 280, 'AI SCORES!', '#ff6b6b', '20px');
    }

    shake(this, 0.006, 200);
    flashScreen(this, who === 'player' ? COLORS.primary : COLORS.danger, 0.2, 300);

    // Check win
    if (this.playerScore >= this.winScore || this.aiScore >= this.winScore) {
      this.gameActive = false;
      const won = this.playerScore >= this.winScore;
      const score = this.playerScore * 100 + this.maxRally * 10 - this.aiScore * 30;

      this.time.delayedCall(600, () => {
        if (won) {
          flashScreen(this, COLORS.neon, 0.2, 400);
          for (let i = 0; i < 10; i++) {
            this.time.delayedCall(i * 60, () => {
              burstParticles(this, Phaser.Math.Between(100, 700), Phaser.Math.Between(100, 500),
                [COLORS.neon, COLORS.warning, COLORS.accent][i % 3], 8, 30);
            });
          }
        }
        showGameOver(this, Math.max(0, score), 'PongGame');
      });
    } else {
      this.difficulty = 0.7;
      this.launchBall();
    }
  }

  update(time, delta) {
    if (!this.gameActive) return;

    // Player paddle
    const pSpeed = 400;
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      this.player.body.setVelocityY(-pSpeed);
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      this.player.body.setVelocityY(pSpeed);
    } else {
      this.player.body.setVelocityY(0);
    }

    // Touch control
    if (this.input.activePointer.isDown) {
      const py = this.input.activePointer.y;
      if (py < this.player.y - 10) this.player.body.setVelocityY(-pSpeed);
      else if (py > this.player.y + 10) this.player.body.setVelocityY(pSpeed);
      else this.player.body.setVelocityY(0);
    }

    // AI paddle
    const target = this.ball.y;
    const aiDiff = target - this.ai.y;
    const aiSpeed = 300 * this.difficulty;
    if (Math.abs(aiDiff) > 10) {
      this.ai.body.setVelocityY(aiDiff > 0 ? aiSpeed : -aiSpeed);
    } else {
      this.ai.body.setVelocityY(0);
    }

    // Update glows
    this.playerGlow.setPosition(this.player.x, this.player.y);
    this.aiGlow.setPosition(this.ai.x, this.ai.y);

    // Ball trail
    this.trailTimer += delta;
    if (this.trailTimer > 30) {
      this.trailTimer = 0;
      const t = this.add.circle(this.ball.x, this.ball.y, 5, COLORS.warning, 0.3).setDepth(1);
      this.tweens.add({ targets: t, alpha: 0, scale: 0, duration: 250, onComplete: () => t.destroy() });
    }

    // Score detection
    if (this.ball.x < 10) {
      this.scored('ai');
    } else if (this.ball.x > 790) {
      this.scored('player');
    }
  }
}
