import Phaser from 'phaser';
import { COLORS, createBackButton, createScoreDisplay, showGameOver, shake, burstParticles, floatingText, flashScreen } from '../utils';

export default class SnakeGame extends Phaser.Scene {
  constructor() { super('SnakeGame'); }

  create() {
    this.cameras.main.fadeIn(300);

    this.cellSize = 20;
    this.cols = 38; // 760/20
    this.rows = 27; // 540/20
    this.offsetX = 20;
    this.offsetY = 40;

    this.direction = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.snake = [{ x: 5, y: 13 }, { x: 4, y: 13 }, { x: 3, y: 13 }];
    this.score = 0;
    this.speed = 140;
    this.moveTimer = 0;
    this.gameActive = true;
    this.combo = 0;
    this.comboTimer = 0;
    this.foodEaten = 0;

    // ── Background grid ──
    const gfx = this.add.graphics();
    gfx.fillStyle(0x0d0d25);
    gfx.fillRect(this.offsetX, this.offsetY, this.cols * this.cellSize, this.rows * this.cellSize);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if ((r + c) % 2 === 0) {
          gfx.fillStyle(0x111130, 0.5);
          gfx.fillRect(this.offsetX + c * this.cellSize, this.offsetY + r * this.cellSize, this.cellSize, this.cellSize);
        }
      }
    }
    // Border glow
    gfx.lineStyle(2, COLORS.primary, 0.4);
    gfx.strokeRect(this.offsetX, this.offsetY, this.cols * this.cellSize, this.rows * this.cellSize);

    // ── Snake body graphics ──
    this.snakeGfx = [];
    this.trailGfx = [];

    // ── Food ──
    this.food = null;
    this.specialFood = null;
    this.spawnFood();

    // ── Controls ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    // Swipe detection
    this.swipeStart = null;
    this.input.on('pointerdown', (ptr) => { this.swipeStart = { x: ptr.x, y: ptr.y }; });
    this.input.on('pointerup', (ptr) => {
      if (!this.swipeStart) return;
      const dx = ptr.x - this.swipeStart.x;
      const dy = ptr.y - this.swipeStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 30) {
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0 && this.direction.x !== -1) this.nextDir = { x: 1, y: 0 };
          else if (dx < 0 && this.direction.x !== 1) this.nextDir = { x: -1, y: 0 };
        } else {
          if (dy > 0 && this.direction.y !== -1) this.nextDir = { x: 0, y: 1 };
          else if (dy < 0 && this.direction.y !== 1) this.nextDir = { x: 0, y: -1 };
        }
      }
      this.swipeStart = null;
    });

    // ── UI ──
    createBackButton(this);
    this.scoreText = createScoreDisplay(this);
    this.comboText = this.add.text(400, 26, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '16px', color: '#00ff88',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    this.lengthText = this.add.text(200, 16, `Length: ${this.snake.length}`, {
      fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#636e72',
    }).setDepth(100);
  }

  spawnFood() {
    let fx, fy, valid;
    do {
      fx = Phaser.Math.Between(0, this.cols - 1);
      fy = Phaser.Math.Between(0, this.rows - 1);
      valid = !this.snake.some(s => s.x === fx && s.y === fy);
    } while (!valid);

    if (this.food) this.food.destroy();
    this.food = this.add.circle(
      this.offsetX + fx * this.cellSize + this.cellSize / 2,
      this.offsetY + fy * this.cellSize + this.cellSize / 2,
      7, COLORS.danger
    ).setDepth(10);
    this.food.setData('gx', fx);
    this.food.setData('gy', fy);

    // Pulse animation
    this.tweens.add({ targets: this.food, scale: 1.3, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Bonus food every 5 eaten
    if (this.foodEaten > 0 && this.foodEaten % 5 === 0 && !this.specialFood) {
      this.spawnSpecialFood();
    }
  }

  spawnSpecialFood() {
    let fx, fy, valid;
    do {
      fx = Phaser.Math.Between(0, this.cols - 1);
      fy = Phaser.Math.Between(0, this.rows - 1);
      valid = !this.snake.some(s => s.x === fx && s.y === fy);
    } while (!valid);

    this.specialFood = this.add.circle(
      this.offsetX + fx * this.cellSize + this.cellSize / 2,
      this.offsetY + fy * this.cellSize + this.cellSize / 2,
      8, COLORS.neon
    ).setDepth(10);
    this.specialFood.setData('gx', fx);
    this.specialFood.setData('gy', fy);
    this.tweens.add({ targets: this.specialFood, scale: 1.5, alpha: 0.6, duration: 300, yoyo: true, repeat: -1 });

    // Disappears after 5 seconds
    this.time.delayedCall(5000, () => {
      if (this.specialFood) { this.specialFood.destroy(); this.specialFood = null; }
    });
  }

  update(time, delta) {
    if (!this.gameActive) return;

    // Keyboard input
    if (this.cursors.left.isDown || this.wasd.A.isDown) { if (this.direction.x !== 1) this.nextDir = { x: -1, y: 0 }; }
    else if (this.cursors.right.isDown || this.wasd.D.isDown) { if (this.direction.x !== -1) this.nextDir = { x: 1, y: 0 }; }
    else if (this.cursors.up.isDown || this.wasd.W.isDown) { if (this.direction.y !== 1) this.nextDir = { x: 0, y: -1 }; }
    else if (this.cursors.down.isDown || this.wasd.S.isDown) { if (this.direction.y !== -1) this.nextDir = { x: 0, y: 1 }; }

    // Combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    this.moveTimer += delta;
    if (this.moveTimer < this.speed) return;
    this.moveTimer = 0;

    this.direction = { ...this.nextDir };

    // New head position
    const head = this.snake[0];
    const nx = head.x + this.direction.x;
    const ny = head.y + this.direction.y;

    // Wall collision
    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) {
      this.die();
      return;
    }

    // Self collision
    if (this.snake.some(s => s.x === nx && s.y === ny)) {
      this.die();
      return;
    }

    this.snake.unshift({ x: nx, y: ny });

    // Check food
    let ate = false;
    if (this.food && nx === this.food.getData('gx') && ny === this.food.getData('gy')) {
      this.foodEaten++;
      this.combo++;
      this.comboTimer = 3000;
      const mult = Math.min(this.combo, 5);
      const pts = 10 * mult;
      this.score += pts;
      this.scoreText.setText(`Score: ${this.score}`);
      this.lengthText.setText(`Length: ${this.snake.length}`);

      const wx = this.offsetX + nx * this.cellSize + this.cellSize / 2;
      const wy = this.offsetY + ny * this.cellSize + this.cellSize / 2;
      burstParticles(this, wx, wy, COLORS.warning, 6, 20);
      floatingText(this, wx, wy - 10, `+${pts}`);

      if (this.combo >= 3) {
        this.comboText.setText(`${this.combo}x COMBO`).setAlpha(1);
        this.tweens.add({ targets: this.comboText, alpha: 0, duration: 1000, delay: 300 });
      }

      // Speed up
      this.speed = Math.max(60, this.speed - 2);
      this.spawnFood();
      ate = true;
    }

    // Check special food
    if (this.specialFood && nx === this.specialFood.getData('gx') && ny === this.specialFood.getData('gy')) {
      this.score += 50;
      this.scoreText.setText(`Score: ${this.score}`);
      const wx = this.offsetX + nx * this.cellSize + this.cellSize / 2;
      const wy = this.offsetY + ny * this.cellSize + this.cellSize / 2;
      burstParticles(this, wx, wy, COLORS.neon, 15, 35);
      floatingText(this, wx, wy - 10, '+50', '#00ff88', '22px');
      flashScreen(this, COLORS.neon, 0.1, 200);
      this.specialFood.destroy();
      this.specialFood = null;
      ate = true;
    }

    if (!ate) {
      this.snake.pop();
    }

    this.drawSnake();
  }

  drawSnake() {
    // Clear old
    this.snakeGfx.forEach(g => g.destroy());
    this.snakeGfx = [];

    this.snake.forEach((seg, i) => {
      const wx = this.offsetX + seg.x * this.cellSize + this.cellSize / 2;
      const wy = this.offsetY + seg.y * this.cellSize + this.cellSize / 2;
      const t = i / this.snake.length;
      const isHead = i === 0;

      // Body segment
      const size = isHead ? this.cellSize - 2 : this.cellSize - 3;
      const hue = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(COLORS.neon),
        Phaser.Display.Color.ValueToColor(COLORS.primary),
        100, Math.floor(t * 100)
      );
      const color = Phaser.Display.Color.GetColor(hue.r, hue.g, hue.b);
      const seg_gfx = this.add.rectangle(wx, wy, size, size, color).setDepth(5);
      this.snakeGfx.push(seg_gfx);

      if (isHead) {
        // Eyes
        const ex1 = this.add.circle(wx - 4 + this.direction.x * 4, wy - 4 + this.direction.y * 4, 3, 0xffffff).setDepth(7);
        const ex2 = this.add.circle(wx + 4 + this.direction.x * 4, wy - 4 + this.direction.y * 4, 3, 0xffffff).setDepth(7);
        const p1 = this.add.circle(wx - 4 + this.direction.x * 5, wy - 4 + this.direction.y * 5, 1.5, 0x000000).setDepth(8);
        const p2 = this.add.circle(wx + 4 + this.direction.x * 5, wy - 4 + this.direction.y * 5, 1.5, 0x000000).setDepth(8);
        this.snakeGfx.push(ex1, ex2, p1, p2);
      }
    });
  }

  die() {
    this.gameActive = false;
    shake(this, 0.01, 300);
    flashScreen(this, COLORS.danger, 0.5, 400);

    // Death explosion along snake body
    this.snake.forEach((seg, i) => {
      this.time.delayedCall(i * 30, () => {
        const wx = this.offsetX + seg.x * this.cellSize + this.cellSize / 2;
        const wy = this.offsetY + seg.y * this.cellSize + this.cellSize / 2;
        burstParticles(this, wx, wy, COLORS.danger, 4, 15);
      });
    });

    this.time.delayedCall(Math.min(this.snake.length * 30 + 200, 1500), () => {
      showGameOver(this, this.score, 'SnakeGame');
    });
  }
}
