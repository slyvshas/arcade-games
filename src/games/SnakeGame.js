import Phaser from 'phaser';
import { COLORS, createBackButton, showGameOver } from '../utils';

const GRID = 20;
const COLS = 30;
const ROWS = 25;
const OFFSET_X = (800 - COLS * GRID) / 2;
const OFFSET_Y = 50;

export default class SnakeGame extends Phaser.Scene {
  constructor() {
    super('SnakeGame');
  }

  create() {
    this.score = 0;
    this.gameActive = true;
    this.moveDelay = 120;
    this.lastMoveTime = 0;
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };

    createBackButton(this);

    // Background grid
    const gfx = this.add.graphics();
    gfx.fillStyle(0x111122, 1);
    gfx.fillRect(OFFSET_X, OFFSET_Y, COLS * GRID, ROWS * GRID);
    gfx.lineStyle(1, 0x1a1a3a, 0.3);
    for (let x = 0; x <= COLS; x++) {
      gfx.lineBetween(OFFSET_X + x * GRID, OFFSET_Y, OFFSET_X + x * GRID, OFFSET_Y + ROWS * GRID);
    }
    for (let y = 0; y <= ROWS; y++) {
      gfx.lineBetween(OFFSET_X, OFFSET_Y + y * GRID, OFFSET_X + COLS * GRID, OFFSET_Y + y * GRID);
    }

    // Score
    this.scoreText = this.add.text(650, 16, 'Score: 0', {
      fontFamily: 'Orbitron, monospace', fontSize: '20px', color: '#feca57',
    }).setDepth(100);

    // Snake body
    this.snake = [
      { x: 5, y: 12 }, { x: 4, y: 12 }, { x: 3, y: 12 },
    ];
    this.snakeGraphics = this.add.graphics();

    // Food
    this.food = { x: 15, y: 12 };
    this.foodGraphics = this.add.graphics();
    this.placeFood();

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    this.input.keyboard.on('keydown', (event) => {
      if (!this.gameActive) return;
      switch (event.code) {
        case 'ArrowUp': case 'KeyW':
          if (this.direction.y === 0) this.nextDirection = { x: 0, y: -1 };
          break;
        case 'ArrowDown': case 'KeyS':
          if (this.direction.y === 0) this.nextDirection = { x: 0, y: 1 };
          break;
        case 'ArrowLeft': case 'KeyA':
          if (this.direction.x === 0) this.nextDirection = { x: -1, y: 0 };
          break;
        case 'ArrowRight': case 'KeyD':
          if (this.direction.x === 0) this.nextDirection = { x: 1, y: 0 };
          break;
      }
    });

    // Swipe controls for mobile
    this.input.on('pointerdown', (p) => { this.swipeStart = { x: p.x, y: p.y }; });
    this.input.on('pointerup', (p) => {
      if (!this.swipeStart || !this.gameActive) return;
      const dx = p.x - this.swipeStart.x;
      const dy = p.y - this.swipeStart.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 20 && this.direction.x === 0) this.nextDirection = { x: 1, y: 0 };
        else if (dx < -20 && this.direction.x === 0) this.nextDirection = { x: -1, y: 0 };
      } else {
        if (dy > 20 && this.direction.y === 0) this.nextDirection = { x: 0, y: 1 };
        else if (dy < -20 && this.direction.y === 0) this.nextDirection = { x: 0, y: -1 };
      }
    });

    this.drawSnake();
  }

  placeFood() {
    let valid = false;
    while (!valid) {
      this.food.x = Phaser.Math.Between(0, COLS - 1);
      this.food.y = Phaser.Math.Between(0, ROWS - 1);
      valid = !this.snake.some(s => s.x === this.food.x && s.y === this.food.y);
    }
    this.foodGraphics.clear();
    this.foodGraphics.fillStyle(COLORS.danger, 1);
    this.foodGraphics.fillCircle(
      OFFSET_X + this.food.x * GRID + GRID / 2,
      OFFSET_Y + this.food.y * GRID + GRID / 2,
      GRID / 2 - 2
    );
  }

  drawSnake() {
    this.snakeGraphics.clear();
    this.snake.forEach((seg, i) => {
      const alpha = 1 - (i / this.snake.length) * 0.4;
      const color = i === 0 ? COLORS.success : COLORS.successLight;
      this.snakeGraphics.fillStyle(color, alpha);
      this.snakeGraphics.fillRoundedRect(
        OFFSET_X + seg.x * GRID + 1,
        OFFSET_Y + seg.y * GRID + 1,
        GRID - 2, GRID - 2, 4
      );
    });
    // Eyes on head
    const head = this.snake[0];
    const hx = OFFSET_X + head.x * GRID + GRID / 2;
    const hy = OFFSET_Y + head.y * GRID + GRID / 2;
    this.snakeGraphics.fillStyle(0xffffff, 1);
    this.snakeGraphics.fillCircle(hx - 3 + this.direction.x * 3, hy - 3 + this.direction.y * 3, 3);
    this.snakeGraphics.fillCircle(hx + 3 + this.direction.x * 3, hy - 3 + this.direction.y * 3, 3);
    this.snakeGraphics.fillStyle(0x000000, 1);
    this.snakeGraphics.fillCircle(hx - 3 + this.direction.x * 4, hy - 3 + this.direction.y * 4, 1.5);
    this.snakeGraphics.fillCircle(hx + 3 + this.direction.x * 4, hy - 3 + this.direction.y * 4, 1.5);
  }

  update(time) {
    if (!this.gameActive) return;
    if (time - this.lastMoveTime < this.moveDelay) return;
    this.lastMoveTime = time;

    this.direction = { ...this.nextDirection };
    const head = this.snake[0];
    const newHead = { x: head.x + this.direction.x, y: head.y + this.direction.y };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      return this.die();
    }
    // Self collision
    if (this.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      return this.die();
    }

    this.snake.unshift(newHead);

    // Eat food
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score += 10;
      this.scoreText.setText('Score: ' + this.score);
      this.moveDelay = Math.max(50, this.moveDelay - 2);
      this.placeFood();
    } else {
      this.snake.pop();
    }

    this.drawSnake();
  }

  die() {
    this.gameActive = false;
    // Flash snake red
    this.snakeGraphics.clear();
    this.snake.forEach(seg => {
      this.snakeGraphics.fillStyle(COLORS.danger, 0.8);
      this.snakeGraphics.fillRoundedRect(
        OFFSET_X + seg.x * GRID + 1, OFFSET_Y + seg.y * GRID + 1,
        GRID - 2, GRID - 2, 4
      );
    });
    this.time.delayedCall(500, () => showGameOver(this, this.score, 'SnakeGame'));
  }
}
