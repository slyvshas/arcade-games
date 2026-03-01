import Phaser from 'phaser';
import { COLORS, createBackButton, createScoreDisplay, showGameOver, shake, burstParticles, floatingText, flashScreen } from '../utils';

export default class BreakoutGame extends Phaser.Scene {
  constructor() { super('BreakoutGame'); }

  create() {
    this.cameras.main.fadeIn(300);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.combo = 0;
    this.gameActive = true;
    this.launched = false;

    // ── Background ──
    const gfx = this.add.graphics();
    for (let i = 0; i < 600; i++) {
      const t = i / 600;
      gfx.fillStyle(Phaser.Display.Color.GetColor(
        Math.floor(10 + t * 5), Math.floor(10 + t * 8), Math.floor(26 + t * 15)
      ));
      gfx.fillRect(0, i, 800, 1);
    }

    // ── Paddle ──
    this.paddleWidth = 120;
    this.paddle = this.add.rectangle(400, 560, this.paddleWidth, 16, COLORS.primary);
    this.physics.add.existing(this.paddle, true);
    // Paddle glow
    this.paddleGlow = this.add.rectangle(400, 560, this.paddleWidth + 10, 20, COLORS.primary, 0.15).setDepth(-1);

    // ── Ball ──
    this.ball = this.add.circle(400, 540, 8, COLORS.warning);
    this.physics.add.existing(this.ball);
    this.ball.body.setCircle(8);
    this.ball.body.setBounce(1);
    this.ball.body.setCollideWorldBounds(true);
    this.ball.body.onWorldBounds = true;
    // Ball trail
    this.ballTrail = [];

    // ── Bricks ──
    this.bricks = this.physics.add.staticGroup();
    this.createBricks();

    // ── Power-ups ──
    this.powerups = this.physics.add.group();

    // ── Collisions ──
    this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, null, this);
    this.physics.add.collider(this.ball, this.bricks, this.hitBrick, null, this);
    this.physics.add.overlap(this.paddle, this.powerups, this.collectPowerup, null, this);
    this.physics.world.on('worldbounds', (body) => {
      if (body.gameObject === this.ball) this.combo = 0;
    });

    // ── Controls ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // ── UI ──
    createBackButton(this);
    this.scoreText = createScoreDisplay(this);
    this.livesText = this.add.text(16, 16, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '14px', color: '#ff6b6b',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(100);
    this.updateLivesText();

    this.comboText = this.add.text(400, 480, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '18px', color: '#00ff88',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    // Launch prompt
    this.launchText = this.add.text(400, 500, 'CLICK or SPACE to Launch', {
      fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#636e72',
    }).setOrigin(0.5);
    this.tweens.add({ targets: this.launchText, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });
  }

  createBricks() {
    this.bricks.clear(true, true);
    const patterns = [
      // Standard rows
      () => {
        const rows = 5 + Math.min(this.level, 3);
        const cols = 10;
        const colors = [COLORS.danger, COLORS.orange, COLORS.warning, COLORS.neon, COLORS.accent, COLORS.blue, COLORS.primary, COLORS.pink];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const bx = 68 + c * 70;
            const by = 80 + r * 28;
            const hp = r < 2 ? 2 : 1;
            this.createBrick(bx, by, 62, 20, colors[r % colors.length], hp);
          }
        }
      },
      // Diamond pattern
      () => {
        const colors = [COLORS.neonPink, COLORS.neon, COLORS.accent, COLORS.warning, COLORS.danger];
        for (let r = 0; r < 7; r++) {
          const inset = Math.abs(3 - r);
          const n = 10 - inset * 2;
          for (let c = 0; c < n; c++) {
            const bx = 68 + (inset + c) * 70;
            const by = 70 + r * 28;
            this.createBrick(bx, by, 62, 20, colors[r % colors.length], r < 2 || r > 4 ? 1 : 2);
          }
        }
      },
    ];

    patterns[(this.level - 1) % patterns.length]();
  }

  createBrick(x, y, w, h, color, hp) {
    const brick = this.add.rectangle(x, y, w, h, color);
    this.physics.add.existing(brick, true);
    brick.setData('hp', hp);
    brick.setData('color', color);
    brick.setData('maxHp', hp);
    this.bricks.add(brick);
    // Highlight line on top
    this.add.rectangle(x, y - h / 2 + 1, w - 4, 2, 0xffffff, 0.15);
    // Entrance animation
    brick.setScale(0);
    this.tweens.add({
      targets: brick, scaleX: 1, scaleY: 1,
      duration: 300, delay: Math.abs(x - 400) * 0.5 + (y - 70) * 1.5,
      ease: 'Back.easeOut',
    });
  }

  hitPaddle(ball, paddle) {
    // Angle based on hit position
    const diff = ball.x - paddle.x;
    const norm = diff / (this.paddleWidth / 2);
    const angle = Phaser.Math.DegToRad(-70 + norm * 50);
    const speed = 350 + this.level * 20;
    ball.body.setVelocity(Math.sin(angle) * speed, -Math.abs(Math.cos(angle) * speed));
    this.combo = 0;
    burstParticles(this, ball.x, ball.y, COLORS.primary, 4, 15);
  }

  hitBrick(ball, brick) {
    const hp = brick.getData('hp') - 1;
    brick.setData('hp', hp);
    this.combo++;

    if (hp <= 0) {
      const mult = Math.min(this.combo, 8);
      const pts = 10 * mult;
      this.score += pts;
      this.scoreText.setText(`Score: ${this.score}`);

      burstParticles(this, brick.x, brick.y, brick.getData('color'), 10, 30);
      floatingText(this, brick.x, brick.y, `+${pts}`);

      if (this.combo >= 3) {
        this.comboText.setText(`${this.combo}x COMBO!`).setAlpha(1);
        this.tweens.add({ targets: this.comboText, alpha: 0, duration: 600, delay: 200 });
      }

      shake(this, 0.002, 60);

      // Chance to drop power-up
      if (Math.random() < 0.12) {
        this.dropPowerup(brick.x, brick.y);
      }

      brick.destroy();

      // Level complete?
      if (this.bricks.countActive() === 0) {
        this.nextLevel();
      }
    } else {
      // Darken brick, flash it
      brick.setFillStyle(Phaser.Display.Color.GetColor(100, 100, 120));
      this.time.delayedCall(80, () => brick.setFillStyle(brick.getData('color')));
      shake(this, 0.001, 40);
    }
  }

  dropPowerup(x, y) {
    const types = ['wide', 'multi', 'life'];
    const type = types[Phaser.Math.Between(0, types.length - 1)];
    const colors = { wide: COLORS.accent, multi: COLORS.neonPink, life: COLORS.success };
    const labels = { wide: '◄►', multi: '●●●', life: '♥' };

    const pu = this.add.rectangle(x, y, 28, 14, colors[type]);
    this.add.text(x, y, labels[type], {
      fontSize: '10px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(20);
    this.physics.add.existing(pu);
    pu.body.setVelocityY(120);
    pu.body.allowGravity = false;
    pu.setData('type', type);
    this.powerups.add(pu);
  }

  collectPowerup(paddle, pu) {
    const type = pu.getData('type');
    burstParticles(this, pu.x, pu.y, COLORS.neon, 8, 25);

    if (type === 'wide') {
      this.paddleWidth = Math.min(200, this.paddleWidth + 30);
      paddle.setSize(this.paddleWidth, 16);
      paddle.body.setSize(this.paddleWidth, 16);
      this.paddleGlow.setSize(this.paddleWidth + 10, 20);
      floatingText(this, pu.x, pu.y, 'WIDER!', '#00cec9');
    } else if (type === 'multi') {
      // Spawn 2 extra balls
      for (let i = 0; i < 2; i++) {
        const nb = this.add.circle(this.ball.x, this.ball.y, 8, COLORS.neonPink);
        this.physics.add.existing(nb);
        nb.body.setCircle(8).setBounce(1).setCollideWorldBounds(true);
        nb.body.setVelocity(
          Phaser.Math.Between(-200, 200),
          -Phaser.Math.Between(250, 350)
        );
        nb.body.onWorldBounds = true;
        this.physics.add.collider(nb, paddle, (b) => {
          b.body.setVelocityY(-Math.abs(b.body.velocity.y));
        });
        this.physics.add.collider(nb, this.bricks, (b, brick) => this.hitBrick(b, brick));
        // Auto destroy after 10 seconds
        this.time.delayedCall(10000, () => { if (nb.active) nb.destroy(); });
      }
      floatingText(this, pu.x, pu.y, 'MULTI!', '#ff00ff');
    } else if (type === 'life') {
      this.lives++;
      this.updateLivesText();
      floatingText(this, pu.x, pu.y, '+1 LIFE', '#00b894');
    }

    flashScreen(this, COLORS.neon, 0.1, 150);
    pu.destroy();
  }

  nextLevel() {
    this.level++;
    this.launched = false;
    flashScreen(this, COLORS.neon, 0.2, 400);

    const lvl = this.add.text(400, 300, `LEVEL ${this.level}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '48px', color: '#00ff88',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(200).setAlpha(0);
    this.tweens.add({
      targets: lvl, alpha: 1, scale: 1.2, duration: 500, yoyo: true,
      onComplete: () => lvl.destroy(),
    });

    this.score += 100 * this.level;
    this.scoreText.setText(`Score: ${this.score}`);
    this.ball.setPosition(400, 540);
    this.ball.body.setVelocity(0);
    this.createBricks();
    this.launchText.setAlpha(1);
  }

  updateLivesText() {
    this.livesText.setText('♥'.repeat(this.lives));
  }

  loseBall() {
    this.lives--;
    this.updateLivesText();
    this.combo = 0;
    shake(this, 0.006, 200);
    flashScreen(this, COLORS.danger, 0.3, 300);

    if (this.lives <= 0) {
      this.gameActive = false;
      this.physics.pause();
      showGameOver(this, this.score, 'BreakoutGame');
    } else {
      this.launched = false;
      this.ball.setPosition(this.paddle.x, 540);
      this.ball.body.setVelocity(0);
      this.launchText.setAlpha(1);
    }
  }

  update() {
    if (!this.gameActive) return;

    // Paddle movement
    const paddleSpeed = 500;
    if (this.cursors.left.isDown) {
      this.paddle.x = Math.max(this.paddleWidth / 2, this.paddle.x - paddleSpeed * 0.016);
    } else if (this.cursors.right.isDown) {
      this.paddle.x = Math.min(800 - this.paddleWidth / 2, this.paddle.x + paddleSpeed * 0.016);
    }

    // Touch/mouse control
    if (this.input.activePointer.isDown && this.launched) {
      this.paddle.x = Phaser.Math.Clamp(this.input.activePointer.x, this.paddleWidth / 2, 800 - this.paddleWidth / 2);
    } else if (this.input.activePointer.isDown && !this.launched) {
      this.paddle.x = Phaser.Math.Clamp(this.input.activePointer.x, this.paddleWidth / 2, 800 - this.paddleWidth / 2);
    }

    this.paddle.body.reset(this.paddle.x, 560);
    this.paddleGlow.setPosition(this.paddle.x, 560);

    // Ball follows paddle before launch
    if (!this.launched) {
      this.ball.setPosition(this.paddle.x, 540);
      if (this.spaceKey.isDown || this.input.activePointer.isDown) {
        this.launched = true;
        this.ball.body.setVelocity(Phaser.Math.Between(-150, 150), -350);
        this.launchText.setAlpha(0);
      }
      return;
    }

    // Ball trail
    const tr = this.add.circle(this.ball.x, this.ball.y, 4, COLORS.warning, 0.3).setDepth(-1);
    this.tweens.add({ targets: tr, alpha: 0, scale: 0, duration: 200, onComplete: () => tr.destroy() });

    // Ball fell
    if (this.ball.y > 610) {
      this.loseBall();
    }

    // Ensure ball doesn't get stuck horizontal
    if (this.launched && Math.abs(this.ball.body.velocity.y) < 50) {
      this.ball.body.setVelocityY(this.ball.body.velocity.y < 0 ? -150 : 150);
    }
  }
}
