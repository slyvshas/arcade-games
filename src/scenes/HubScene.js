import Phaser from 'phaser';
import { COLORS, getHighScore } from '../utils';

const GAMES = [
  { key: 'PlatformerGame',   name: 'Platformer',    icon: '🏃', color: 0xff6b6b, desc: 'Jump & collect coins' },
  { key: 'SnakeGame',        name: 'Snake',          icon: '🐍', color: 0x00b894, desc: 'Eat & grow longer' },
  { key: 'BreakoutGame',     name: 'Breakout',       icon: '🧱', color: 0x0984e3, desc: 'Smash all bricks' },
  { key: 'FlappyGame',       name: 'Flappy',         icon: '🐦', color: 0xfeca57, desc: 'Fly through gaps' },
  { key: 'SpaceShooterGame', name: 'Space Shooter',  icon: '🚀', color: 0x6c5ce7, desc: 'Blast the aliens' },
  { key: 'MemoryGame',       name: 'Memory',         icon: '🧠', color: 0xfd79a8, desc: 'Match card pairs' },
  { key: 'WhackAMoleGame',   name: 'Whack-a-Mole',  icon: '🔨', color: 0xe17055, desc: 'Whack fast!' },
  { key: 'PongGame',         name: 'Pong',           icon: '🏓', color: 0x00cec9, desc: 'Beat the AI' },
  { key: 'RunnerGame',       name: 'Runner',         icon: '💨', color: 0x74b9ff, desc: 'Run forever' },
  { key: 'ColorMatchGame',   name: 'Color Match',    icon: '🎨', color: 0xa29bfe, desc: 'Fast reactions' },
];

export default class HubScene extends Phaser.Scene {
  constructor() { super('HubScene'); }

  create() {
    this.cameras.main.fadeIn(300);

    // ── Animated Starfield Background ──
    this.bgStars = [];
    for (let i = 0; i < 60; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0, 800), Phaser.Math.Between(0, 600),
        Phaser.Math.FloatBetween(0.5, 2), 0xffffff,
        Phaser.Math.FloatBetween(0.03, 0.15)
      ).setDepth(-2);
      this.bgStars.push({ obj: s, speed: Phaser.Math.FloatBetween(0.1, 0.6) });
    }

    // Floating nebula blobs
    for (let i = 0; i < 4; i++) {
      const nb = this.add.circle(
        Phaser.Math.Between(100, 700), Phaser.Math.Between(100, 500),
        Phaser.Math.Between(80, 160),
        [COLORS.primary, COLORS.accent, COLORS.pink, COLORS.neonBlue][i],
        0.02
      ).setDepth(-1);
      this.tweens.add({
        targets: nb, x: nb.x + Phaser.Math.Between(-60, 60), y: nb.y + Phaser.Math.Between(-40, 40),
        duration: Phaser.Math.Between(6000, 10000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── Top Accent Bar ──
    const bar = this.add.rectangle(400, 2, 800, 4, COLORS.primary).setOrigin(0.5, 0);
    this.tweens.add({ targets: bar, fillColor: COLORS.accent, duration: 3000, yoyo: true, repeat: -1 });

    // ── Title ──
    this.add.text(400, 34, 'ARCADE HUB', {
      fontFamily: 'Orbitron, monospace', fontSize: '32px', color: '#ffffff',
      stroke: '#6c5ce7', strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(400, 64, '10 FREE GAMES  ·  MOBILE FRIENDLY', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '11px', color: '#636e72',
      letterSpacing: 3,
    }).setOrigin(0.5);

    // ── Game Cards Grid (2 columns) ──
    const cardW = 355, cardH = 72, gapX = 24, gapY = 12;
    const cols = 2;
    const offsetX = (800 - (cols * cardW + (cols - 1) * gapX)) / 2 + cardW / 2;
    const startY = 100;

    GAMES.forEach((game, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = offsetX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      this.createCard(x, y, cardW, cardH, game, i);
    });

    // ── Footer ──
    this.add.text(400, 588, 'Arrow Keys / WASD / Touch  ·  ESC = Back', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '10px', color: '#333366',
    }).setOrigin(0.5);
  }

  createCard(x, y, w, h, game, index) {
    // Card enters with staggered animation
    const startX = index % 2 === 0 ? -400 : 1200;

    // Card bg
    const bg = this.add.rectangle(startX, y, w, h, 0x13132a)
      .setStrokeStyle(1, 0x222244);
    this.tweens.add({
      targets: bg, x, duration: 500, ease: 'Back.easeOut',
      delay: 80 + index * 60,
    });

    // Color accent strip
    const strip = this.add.rectangle(startX - w / 2 + 3, y, 4, h - 12, game.color);
    this.tweens.add({ targets: strip, x: x - w / 2 + 3, duration: 500, ease: 'Back.easeOut', delay: 80 + index * 60 });

    // Icon background circle
    const iconBg = this.add.circle(startX - w / 2 + 38, y, 22, game.color, 0.12);
    this.tweens.add({ targets: iconBg, x: x - w / 2 + 38, duration: 500, ease: 'Back.easeOut', delay: 80 + index * 60 });

    // Emoji icon
    const icon = this.add.text(startX - w / 2 + 38, y, game.icon, { fontSize: '22px' }).setOrigin(0.5);
    this.tweens.add({ targets: icon, x: x - w / 2 + 38, duration: 500, ease: 'Back.easeOut', delay: 80 + index * 60 });

    // Game name
    const name = this.add.text(startX - w / 2 + 72, y - 12, game.name.toUpperCase(), {
      fontFamily: 'Orbitron, monospace', fontSize: '13px', color: '#ffffff',
    });
    this.tweens.add({ targets: name, x: x - w / 2 + 72, duration: 500, ease: 'Back.easeOut', delay: 80 + index * 60 });

    // Desc
    const desc = this.add.text(startX - w / 2 + 72, y + 6, game.desc, {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '10px', color: '#555588',
    });
    this.tweens.add({ targets: desc, x: x - w / 2 + 72, duration: 500, ease: 'Back.easeOut', delay: 80 + index * 60 });

    // High score star
    const hs = getHighScore(game.key);
    if (hs > 0) {
      const hsTxt = this.add.text(startX + w / 2 - 90, y - 13, `★ ${hs}`, {
        fontFamily: 'Orbitron, monospace', fontSize: '10px', color: '#feca57',
      });
      this.tweens.add({ targets: hsTxt, x: x + w / 2 - 90, duration: 500, ease: 'Back.easeOut', delay: 80 + index * 60 });
    }

    // PLAY button
    const btnBg = this.add.rectangle(startX + w / 2 - 48, y + 4, 65, 26, game.color)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: btnBg, x: x + w / 2 - 48, duration: 500, ease: 'Back.easeOut', delay: 80 + index * 60 });

    const btnTxt = this.add.text(startX + w / 2 - 48, y + 4, 'PLAY ▶', {
      fontFamily: 'Orbitron, monospace', fontSize: '10px', color: '#fff',
    }).setOrigin(0.5);
    this.tweens.add({ targets: btnTxt, x: x + w / 2 - 48, duration: 500, ease: 'Back.easeOut', delay: 80 + index * 60 });

    // Hover & Click
    const allParts = [bg, strip, iconBg, icon, name, desc, btnBg, btnTxt];

    const launch = () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => this.scene.start(game.key));
    };

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setFillStyle(0x1c1c3a).setStrokeStyle(1, game.color);
      this.tweens.add({ targets: allParts, scaleX: 1.01, scaleY: 1.01, duration: 150 });
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x13132a).setStrokeStyle(1, 0x222244);
      this.tweens.add({ targets: allParts, scaleX: 1, scaleY: 1, duration: 150 });
    });
    bg.on('pointerdown', launch);
    btnBg.on('pointerover', () => btnBg.setAlpha(0.8));
    btnBg.on('pointerout', () => btnBg.setAlpha(1));
    btnBg.on('pointerdown', launch);
  }

  update() {
    this.bgStars.forEach(s => {
      s.obj.y -= s.speed;
      if (s.obj.y < -5) { s.obj.y = 605; s.obj.x = Phaser.Math.Between(0, 800); }
    });
  }
}
