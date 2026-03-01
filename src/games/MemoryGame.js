import Phaser from 'phaser';
import { COLORS, createBackButton, showGameOver } from '../utils';

const CARD_COLORS = [
  0xff6b6b, 0x00b894, 0x0984e3, 0xfeca57,
  0x6c5ce7, 0xfd79a8, 0xe17055, 0x00cec9,
];

export default class MemoryGame extends Phaser.Scene {
  constructor() {
    super('MemoryGame');
  }

  create() {
    this.score = 0;
    this.moves = 0;
    this.matchesFound = 0;
    this.totalPairs = 8;
    this.flipped = [];
    this.canFlip = true;
    this.gameActive = true;
    this.startTime = this.time.now;

    createBackButton(this);

    // Background
    this.add.rectangle(400, 300, 800, 600, 0x111128).setDepth(-1);

    this.scoreText = this.add.text(580, 16, 'Moves: 0', {
      fontFamily: 'Orbitron, monospace', fontSize: '18px', color: '#feca57',
    }).setDepth(100);

    this.matchText = this.add.text(300, 16, `Pairs: 0/${this.totalPairs}`, {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '16px', color: '#55efc4',
    }).setDepth(100);

    // Create card grid 4x4
    const cols = 4;
    const rows = 4;
    const cardW = 100;
    const cardH = 110;
    const gapX = 20;
    const gapY = 20;
    const startX = (800 - (cols * cardW + (cols - 1) * gapX)) / 2 + cardW / 2;
    const startY = 90 + cardH / 2;

    // Create pairs
    let colorPairs = [];
    for (let i = 0; i < this.totalPairs; i++) {
      colorPairs.push(i, i);
    }
    // Shuffle
    Phaser.Utils.Array.Shuffle(colorPairs);

    this.cards = [];
    for (let i = 0; i < colorPairs.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      this.createCard(x, y, cardW, cardH, colorPairs[i], i);
    }

    // Brief reveal at start
    this.time.delayedCall(300, () => {
      this.cards.forEach(card => this.showCard(card));
      this.time.delayedCall(1500, () => {
        this.cards.forEach(card => {
          if (!card.matched) this.hideCard(card);
        });
      });
    });
  }

  createCard(x, y, w, h, colorIndex, index) {
    const card = {
      x, y, colorIndex, index,
      matched: false,
      flipped: false,
    };

    // Card back
    card.back = this.add.rectangle(x, y, w, h, 0x2d2d5e)
      .setStrokeStyle(2, 0x4a4a8a)
      .setInteractive({ useHandCursor: true });

    // Question mark
    card.qmark = this.add.text(x, y, '?', {
      fontFamily: 'Orbitron, monospace', fontSize: '32px', color: '#4a4a8a',
    }).setOrigin(0.5);

    // Card front (hidden initially)
    card.front = this.add.rectangle(x, y, w, h, CARD_COLORS[colorIndex])
      .setStrokeStyle(2, 0xffffff)
      .setAlpha(0);

    // Symbol on front
    const symbols = ['★', '●', '◆', '▲', '♥', '♦', '◎', '✦'];
    card.symbol = this.add.text(x, y, symbols[colorIndex], {
      fontSize: '36px', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0);

    card.back.on('pointerdown', () => this.flipCard(card));
    card.back.on('pointerover', () => {
      if (!card.flipped && !card.matched) {
        card.back.setStrokeStyle(2, 0xa29bfe);
      }
    });
    card.back.on('pointerout', () => {
      if (!card.flipped && !card.matched) {
        card.back.setStrokeStyle(2, 0x4a4a8a);
      }
    });

    this.cards.push(card);
  }

  flipCard(card) {
    if (!this.canFlip || card.flipped || card.matched || !this.gameActive) return;

    this.showCard(card);
    this.flipped.push(card);

    if (this.flipped.length === 2) {
      this.moves++;
      this.scoreText.setText('Moves: ' + this.moves);
      this.canFlip = false;

      const [a, b] = this.flipped;
      if (a.colorIndex === b.colorIndex) {
        // Match!
        a.matched = true;
        b.matched = true;
        this.matchesFound++;
        this.matchText.setText(`Pairs: ${this.matchesFound}/${this.totalPairs}`);

        // Celebration effect
        [a, b].forEach(c => {
          this.tweens.add({
            targets: [c.front, c.symbol],
            scale: 1.1, duration: 200, yoyo: true,
          });
          c.front.setStrokeStyle(3, COLORS.successLight);
        });

        this.flipped = [];
        this.canFlip = true;

        if (this.matchesFound >= this.totalPairs) {
          this.gameActive = false;
          // Score: fewer moves = higher score
          const timeBonus = Math.max(0, 60 - Math.floor((this.time.now - this.startTime) / 1000));
          this.score = Math.max(10, (this.totalPairs * 100) - (this.moves * 5) + timeBonus * 10);
          this.time.delayedCall(500, () => showGameOver(this, this.score, 'MemoryGame'));
        }
      } else {
        // No match - flip back
        this.time.delayedCall(800, () => {
          this.flipped.forEach(c => this.hideCard(c));
          this.flipped = [];
          this.canFlip = true;
        });
      }
    }
  }

  showCard(card) {
    card.flipped = true;
    card.back.setAlpha(0);
    card.qmark.setAlpha(0);
    card.front.setAlpha(1);
    card.symbol.setAlpha(1);
  }

  hideCard(card) {
    card.flipped = false;
    card.back.setAlpha(1);
    card.qmark.setAlpha(1);
    card.front.setAlpha(0);
    card.symbol.setAlpha(0);
  }
}
