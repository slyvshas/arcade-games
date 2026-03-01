import Phaser from 'phaser';
import { COLORS, createBackButton, showGameOver, shake, burstParticles, floatingText, flashScreen } from '../utils';

const SYMBOLS = ['★', '♦', '♠', '♥', '●', '▲', '■', '♣'];
const CARD_COLORS = [COLORS.danger, COLORS.accent, COLORS.primary, COLORS.pink, COLORS.warning, COLORS.neon, COLORS.blue, COLORS.orange];

export default class MemoryGame extends Phaser.Scene {
  constructor() { super('MemoryGame'); }

  create() {
    this.cameras.main.fadeIn(300);

    this.score = 0;
    this.moves = 0;
    this.matched = 0;
    this.flipped = [];
    this.canFlip = true;
    this.totalPairs = 8;
    this.startTime = this.time.now;
    this.gameActive = true;

    // ── Background ──
    for (let i = 0; i < 20; i++) {
      this.add.circle(
        Phaser.Math.Between(0, 800), Phaser.Math.Between(0, 600),
        Phaser.Math.Between(40, 100),
        [COLORS.primary, COLORS.accent, COLORS.pink][i % 3],
        0.02
      ).setDepth(-1);
    }

    // ── Card Grid (4x4) ──
    const values = [];
    for (let i = 0; i < this.totalPairs; i++) {
      values.push(i, i);
    }
    Phaser.Utils.Array.Shuffle(values);

    this.cards = [];
    const cardW = 100, cardH = 120, gapX = 18, gapY = 18;
    const cols = 4, rows = 4;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const totalH = rows * cardH + (rows - 1) * gapY;
    const startX = (800 - totalW) / 2 + cardW / 2;
    const startY = (600 - totalH) / 2 + cardH / 2 + 30;

    values.forEach((val, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      const card = this.createCard(x, y, cardW, cardH, val, idx);
      this.cards.push(card);
    });

    // Brief peek at the start
    this.time.delayedCall(300, () => {
      this.cards.forEach((c, i) => {
        this.time.delayedCall(i * 50, () => this.showCard(c));
      });
    });
    this.time.delayedCall(2000, () => {
      this.cards.forEach((c, i) => {
        if (!c.getData('matched')) {
          this.time.delayedCall(i * 30, () => this.hideCard(c));
        }
      });
      this.canFlip = true;
    });
    this.canFlip = false;

    // ── UI ──
    createBackButton(this);
    this.movesText = this.add.text(400, 16, 'Moves: 0', {
      fontFamily: 'Orbitron, monospace', fontSize: '16px', color: '#feca57',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(100);

    this.scoreText = this.add.text(650, 16, 'Score: 0', {
      fontFamily: 'Orbitron, monospace', fontSize: '18px', color: '#feca57',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(100);

    this.timeText = this.add.text(200, 16, 'Time: 0s', {
      fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#636e72',
    }).setOrigin(0.5).setDepth(100);
  }

  createCard(x, y, w, h, value, index) {
    const container = this.add.container(x, y).setDepth(5);

    // Card back
    const back = this.add.rectangle(0, 0, w, h, 0x1c1c3a).setStrokeStyle(2, 0x333366);
    const qMark = this.add.text(0, 0, '?', {
      fontFamily: 'Orbitron, monospace', fontSize: '32px', color: '#333366',
    }).setOrigin(0.5);

    // Card front (hidden initially)
    const front = this.add.rectangle(0, 0, w, h, CARD_COLORS[value], 0.2)
      .setStrokeStyle(2, CARD_COLORS[value]).setVisible(false);
    const symbol = this.add.text(0, -5, SYMBOLS[value], {
      fontSize: '36px', color: '#ffffff',
    }).setOrigin(0.5).setVisible(false);
    const label = this.add.text(0, 30, SYMBOLS[value], {
      fontFamily: 'Orbitron, monospace', fontSize: '12px',
      color: Phaser.Display.Color.IntegerToRGBString(CARD_COLORS[value]),
    }).setOrigin(0.5).setVisible(false);

    container.add([back, qMark, front, symbol, label]);

    container.setData('value', value);
    container.setData('index', index);
    container.setData('flipped', false);
    container.setData('matched', false);
    container.setData('back', back);
    container.setData('qMark', qMark);
    container.setData('front', front);
    container.setData('symbol', symbol);
    container.setData('label', label);

    // Interactive
    back.setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.flipCard(container));
    back.on('pointerover', () => {
      if (!container.getData('flipped') && !container.getData('matched') && this.canFlip) {
        this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 100 });
        back.setStrokeStyle(2, COLORS.accentLight);
      }
    });
    back.on('pointerout', () => {
      if (!container.getData('flipped') && !container.getData('matched')) {
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
        back.setStrokeStyle(2, 0x333366);
      }
    });

    // Entrance animation
    container.setScale(0);
    this.tweens.add({
      targets: container, scaleX: 1, scaleY: 1,
      duration: 300, delay: index * 40, ease: 'Back.easeOut',
    });

    return container;
  }

  showCard(card) {
    card.getData('back').setVisible(false);
    card.getData('qMark').setVisible(false);
    card.getData('front').setVisible(true);
    card.getData('symbol').setVisible(true);
    card.getData('label').setVisible(true);
    card.setData('flipped', true);
  }

  hideCard(card) {
    card.getData('back').setVisible(true);
    card.getData('qMark').setVisible(true);
    card.getData('front').setVisible(false);
    card.getData('symbol').setVisible(false);
    card.getData('label').setVisible(false);
    card.setData('flipped', false);
  }

  flipCard(card) {
    if (!this.canFlip || !this.gameActive) return;
    if (card.getData('flipped') || card.getData('matched')) return;
    if (this.flipped.length >= 2) return;

    // Flip animation
    this.tweens.add({
      targets: card, scaleX: 0, duration: 120,
      onComplete: () => {
        this.showCard(card);
        this.tweens.add({ targets: card, scaleX: 1, duration: 120 });
      },
    });

    this.flipped.push(card);

    if (this.flipped.length === 2) {
      this.moves++;
      this.movesText.setText(`Moves: ${this.moves}`);
      this.canFlip = false;

      const [a, b] = this.flipped;

      if (a.getData('value') === b.getData('value')) {
        // Match!
        this.time.delayedCall(300, () => {
          a.setData('matched', true);
          b.setData('matched', true);
          this.matched++;

          // Bonus for quick matches
          const timeBonus = Math.max(0, 50 - this.moves * 2);
          const pts = 100 + timeBonus;
          this.score += pts;
          this.scoreText.setText(`Score: ${this.score}`);

          burstParticles(this, a.x, a.y, CARD_COLORS[a.getData('value')], 10, 30);
          burstParticles(this, b.x, b.y, CARD_COLORS[b.getData('value')], 10, 30);
          floatingText(this, (a.x + b.x) / 2, (a.y + b.y) / 2, `+${pts}`, '#00ff88');

          // Matched glow
          [a, b].forEach(c => {
            this.tweens.add({ targets: c, scaleX: 1.1, scaleY: 1.1, duration: 150, yoyo: true });
          });

          this.flipped = [];
          this.canFlip = true;

          // All matched?
          if (this.matched === this.totalPairs) {
            this.win();
          }
        });
      } else {
        // No match
        this.time.delayedCall(800, () => {
          [a, b].forEach(card => {
            this.tweens.add({
              targets: card, scaleX: 0, duration: 120,
              onComplete: () => {
                this.hideCard(card);
                this.tweens.add({ targets: card, scaleX: 1, duration: 120 });
              },
            });
          });
          this.flipped = [];
          this.canFlip = true;
        });
      }
    }
  }

  win() {
    this.gameActive = false;
    const elapsed = Math.floor((this.time.now - this.startTime) / 1000);
    const timeBonus = Math.max(0, (120 - elapsed) * 5);
    const moveBonus = Math.max(0, (40 - this.moves) * 10);
    this.score += timeBonus + moveBonus;

    flashScreen(this, COLORS.neon, 0.2, 400);

    // Victory celebration
    for (let i = 0; i < 15; i++) {
      this.time.delayedCall(i * 80, () => {
        burstParticles(this,
          Phaser.Math.Between(100, 700), Phaser.Math.Between(100, 500),
          [COLORS.neon, COLORS.warning, COLORS.accent, COLORS.neonPink][i % 4], 8, 35);
      });
    }

    this.time.delayedCall(800, () => {
      showGameOver(this, this.score, 'MemoryGame');
    });
  }

  update() {
    if (!this.gameActive) return;
    const elapsed = Math.floor((this.time.now - this.startTime) / 1000);
    this.timeText.setText(`Time: ${elapsed}s`);
  }
}
