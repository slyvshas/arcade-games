import Phaser from 'phaser';
import { COLORS, createBackButton, showGameOver } from '../utils';

const GAME_COLORS = [
  { name: 'RED', color: 0xff6b6b, hex: '#ff6b6b' },
  { name: 'BLUE', color: 0x0984e3, hex: '#0984e3' },
  { name: 'GREEN', color: 0x00b894, hex: '#00b894' },
  { name: 'YELLOW', color: 0xfeca57, hex: '#feca57' },
  { name: 'PURPLE', color: 0x6c5ce7, hex: '#6c5ce7' },
  { name: 'ORANGE', color: 0xe17055, hex: '#e17055' },
];

export default class ColorMatchGame extends Phaser.Scene {
  constructor() {
    super('ColorMatchGame');
  }

  create() {
    this.score = 0;
    this.lives = 3;
    this.gameActive = true;
    this.round = 0;
    this.timePerRound = 3000;
    this.roundTimer = null;

    createBackButton(this);

    // Background
    this.add.rectangle(400, 300, 800, 600, 0x0a0a2a).setDepth(-1);

    this.scoreText = this.add.text(580, 16, 'Score: 0', {
      fontFamily: 'Orbitron, monospace', fontSize: '20px', color: '#feca57',
    }).setDepth(100);

    this.livesText = this.add.text(300, 16, '♥♥♥', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '18px', color: '#ff6b6b',
    }).setDepth(100);

    // Title
    this.add.text(400, 80, 'Does the COLOR match the WORD?', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '16px', color: '#636e72',
    }).setOrigin(0.5);

    // Word display
    this.wordText = this.add.text(400, 220, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '56px', color: '#ffffff',
    }).setOrigin(0.5);

    // Timer bar
    this.timerBg = this.add.rectangle(400, 310, 400, 8, 0x2d2d5e);
    this.timerBar = this.add.rectangle(200, 310, 400, 8, COLORS.accentLight).setOrigin(0, 0.5);

    // Buttons
    this.matchBtn = this.add.rectangle(300, 420, 160, 60, COLORS.success)
      .setInteractive({ useHandCursor: true });
    this.add.text(300, 420, '✓ MATCH', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.noMatchBtn = this.add.rectangle(500, 420, 160, 60, COLORS.danger)
      .setInteractive({ useHandCursor: true });
    this.add.text(500, 420, '✗ NO MATCH', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.matchBtn.on('pointerdown', () => this.answer(true));
    this.noMatchBtn.on('pointerdown', () => this.answer(false));

    this.matchBtn.on('pointerover', () => this.matchBtn.setFillStyle(COLORS.successLight));
    this.matchBtn.on('pointerout', () => this.matchBtn.setFillStyle(COLORS.success));
    this.noMatchBtn.on('pointerover', () => this.noMatchBtn.setFillStyle(COLORS.dangerLight));
    this.noMatchBtn.on('pointerout', () => this.noMatchBtn.setFillStyle(COLORS.danger));

    // Keyboard controls
    this.input.keyboard.on('keydown-LEFT', () => this.answer(true));
    this.input.keyboard.on('keydown-RIGHT', () => this.answer(false));
    this.input.keyboard.on('keydown-A', () => this.answer(true));
    this.input.keyboard.on('keydown-D', () => this.answer(false));

    // Feedback text
    this.feedbackText = this.add.text(400, 500, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '24px', color: '#55efc4',
    }).setOrigin(0.5);

    this.add.text(400, 550, 'A / ← = Match    D / → = No Match', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '12px', color: '#4a4a6a',
    }).setOrigin(0.5);

    this.nextRound();
  }

  nextRound() {
    if (!this.gameActive) return;
    this.round++;

    // Decide if it's a match or not (50/50)
    this.isMatch = Math.random() > 0.5;

    // Pick word and display color
    const wordIndex = Phaser.Math.Between(0, GAME_COLORS.length - 1);
    let displayColorIndex;

    if (this.isMatch) {
      displayColorIndex = wordIndex;
    } else {
      do {
        displayColorIndex = Phaser.Math.Between(0, GAME_COLORS.length - 1);
      } while (displayColorIndex === wordIndex);
    }

    this.wordText.setText(GAME_COLORS[wordIndex].name);
    this.wordText.setColor(GAME_COLORS[displayColorIndex].hex);

    // Timer
    this.timePerRound = Math.max(1000, 3000 - this.round * 30);
    this.roundStart = this.time.now;

    if (this.roundTimer) this.roundTimer.destroy();
    this.roundTimer = this.time.delayedCall(this.timePerRound, () => {
      this.wrongAnswer();
    });

    this.answered = false;
  }

  answer(playerSaysMatch) {
    if (!this.gameActive || this.answered) return;
    this.answered = true;
    if (this.roundTimer) this.roundTimer.destroy();

    if (playerSaysMatch === this.isMatch) {
      // Correct!
      const timeBonus = Math.floor((this.timePerRound - (this.time.now - this.roundStart)) / 100);
      const points = 10 + timeBonus;
      this.score += points;
      this.scoreText.setText('Score: ' + this.score);

      this.feedbackText.setText(`✓ +${points}`).setColor('#55efc4');
      this.tweens.add({
        targets: this.feedbackText, scale: 1.3, duration: 150, yoyo: true,
      });
    } else {
      this.wrongAnswer();
      return;
    }

    this.time.delayedCall(400, () => this.nextRound());
  }

  wrongAnswer() {
    this.lives--;
    this.livesText.setText('♥'.repeat(Math.max(0, this.lives)));
    this.feedbackText.setText('✗ WRONG').setColor('#ff6b6b');
    this.answered = true;

    // Screen flash
    const flash = this.add.rectangle(400, 300, 800, 600, COLORS.danger, 0.2);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy(),
    });

    if (this.lives <= 0) {
      this.gameActive = false;
      this.time.delayedCall(500, () => showGameOver(this, this.score, 'ColorMatchGame'));
    } else {
      this.time.delayedCall(600, () => this.nextRound());
    }
  }

  update() {
    if (!this.gameActive || this.answered) return;

    // Update timer bar
    const elapsed = this.time.now - this.roundStart;
    const progress = 1 - (elapsed / this.timePerRound);
    this.timerBar.scaleX = Math.max(0, progress);

    if (progress > 0.5) this.timerBar.setFillStyle(COLORS.accentLight);
    else if (progress > 0.25) this.timerBar.setFillStyle(COLORS.warning);
    else this.timerBar.setFillStyle(COLORS.danger);
  }
}
