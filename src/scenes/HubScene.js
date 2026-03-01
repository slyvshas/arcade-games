import Phaser from 'phaser';
import { COLORS, getHighScore } from '../utils';

const GAMES = [
  { key: 'PlatformerGame',   name: 'Platformer',     icon: '🏃', color: 0xff6b6b, desc: 'Jump & collect stars' },
  { key: 'SnakeGame',        name: 'Snake',           icon: '🐍', color: 0x00b894, desc: 'Eat food & grow' },
  { key: 'BreakoutGame',     name: 'Breakout',        icon: '🧱', color: 0x0984e3, desc: 'Smash all the bricks' },
  { key: 'FlappyGame',       name: 'Flappy',          icon: '🐦', color: 0xfeca57, desc: 'Fly through pipes' },
  { key: 'SpaceShooterGame', name: 'Space Shooter',   icon: '🚀', color: 0x6c5ce7, desc: 'Blast the aliens' },
  { key: 'MemoryGame',       name: 'Memory',          icon: '🧠', color: 0xfd79a8, desc: 'Match card pairs' },
  { key: 'WhackAMoleGame',   name: 'Whack-a-Mole',   icon: '🔨', color: 0xe17055, desc: 'Whack the moles!' },
  { key: 'PongGame',         name: 'Pong',            icon: '🏓', color: 0x00cec9, desc: 'Classic paddle game' },
  { key: 'RunnerGame',       name: 'Runner',          icon: '💨', color: 0x74b9ff, desc: 'Jump over obstacles' },
  { key: 'ColorMatchGame',   name: 'Color Match',     icon: '🎨', color: 0xa29bfe, desc: 'Fast reactions!' },
];

export default class HubScene extends Phaser.Scene {
  constructor() {
    super('HubScene');
  }

  create() {
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.cardObjects = [];

    // Animated background particles
    this.particles = [];
    for (let i = 0; i < 40; i++) {
      const p = this.add.circle(
        Phaser.Math.Between(0, 800),
        Phaser.Math.Between(0, 600),
        Phaser.Math.Between(1, 3),
        COLORS.primaryLight, 
        Phaser.Math.FloatBetween(0.05, 0.2)
      );
      this.particles.push({
        obj: p,
        speed: Phaser.Math.FloatBetween(0.1, 0.5),
        drift: Phaser.Math.FloatBetween(-0.3, 0.3),
      });
    }

    // Header glow bar
    this.add.rectangle(400, 0, 800, 4, COLORS.primary).setOrigin(0.5, 0);

    // Title
    this.add.text(400, 36, 'ARCADE HUB', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(400, 72, '10 GAMES · PLAY FREE · MOBILE FRIENDLY', {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '12px',
      color: '#636e72',
      letterSpacing: 4,
    }).setOrigin(0.5);

    // Scroll container
    this.container = this.add.container(0, 0);

    // Create game cards in 2-column grid  
    const startY = 105;
    const cardW = 350;
    const cardH = 80;
    const gapX = 30;
    const gapY = 16;
    const cols = 2;
    const offsetX = (800 - (cols * cardW + (cols - 1) * gapX)) / 2;

    GAMES.forEach((game, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = offsetX + col * (cardW + gapX) + cardW / 2;
      const y = startY + row * (cardH + gapY) + cardH / 2;

      this.createGameCard(x, y, cardW, cardH, game);
    });

    // Input for scrolling
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      this.targetScrollY = Phaser.Math.Clamp(this.targetScrollY + deltaY * 0.5, 0, 120);
    });

    // Touch drag scroll
    this.lastPointerY = 0;
    this.input.on('pointerdown', (pointer) => {
      this.lastPointerY = pointer.y;
    });
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown) {
        const dy = this.lastPointerY - pointer.y;
        this.targetScrollY = Phaser.Math.Clamp(this.targetScrollY + dy * 0.5, 0, 120);
        this.lastPointerY = pointer.y;
      }
    });
  }

  createGameCard(x, y, w, h, game) {
    const cont = this.container;

    // Card background
    const bg = this.add.rectangle(x, y, w, h, 0x1a1a2e, 1)
      .setStrokeStyle(1, 0x2d2d44);
    cont.add(bg);

    // Color accent bar on left
    const accent = this.add.rectangle(x - w/2 + 4, y, 4, h - 16, game.color);
    cont.add(accent);

    // Icon circle
    const iconBg = this.add.circle(x - w/2 + 40, y, 24, game.color, 0.15);
    cont.add(iconBg);

    // Icon text
    const icon = this.add.text(x - w/2 + 40, y, game.icon, {
      fontSize: '24px',
    }).setOrigin(0.5);
    cont.add(icon);

    // Game name
    const name = this.add.text(x - w/2 + 78, y - 14, game.name, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    cont.add(name);

    // Description
    const desc = this.add.text(x - w/2 + 78, y + 6, game.desc, {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '11px',
      color: '#636e72',
    });
    cont.add(desc);

    // High score
    const high = getHighScore(game.key);
    if (high > 0) {
      const hs = this.add.text(x + w/2 - 80, y - 14, `★ ${high}`, {
        fontFamily: 'Orbitron, monospace',
        fontSize: '11px',
        color: '#feca57',
      });
      cont.add(hs);
    }

    // Play button
    const btnBg = this.add.rectangle(x + w/2 - 55, y + 5, 70, 28, game.color, 0.9)
      .setInteractive({ useHandCursor: true });
    cont.add(btnBg);

    const btnTxt = this.add.text(x + w/2 - 55, y + 5, 'PLAY ▶', {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    cont.add(btnTxt);

    // Hover effects
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setFillStyle(0x22223a);
      bg.setStrokeStyle(1, game.color);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x1a1a2e);
      bg.setStrokeStyle(1, 0x2d2d44);
    });

    const launch = () => this.scene.start(game.key);
    bg.on('pointerdown', launch);
    btnBg.on('pointerover', () => btnBg.setFillStyle(0xffffff, 0.25));
    btnBg.on('pointerout', () => btnBg.setFillStyle(game.color, 0.9));
    btnBg.on('pointerdown', launch);
  }

  update() {
    // Smooth scroll
    this.scrollY += (this.targetScrollY - this.scrollY) * 0.1;
    this.container.y = -this.scrollY;

    // Animate particles
    this.particles.forEach(p => {
      p.obj.y -= p.speed;
      p.obj.x += p.drift;
      if (p.obj.y < -10) {
        p.obj.y = 610;
        p.obj.x = Phaser.Math.Between(0, 800);
      }
      if (p.obj.x < -10) p.obj.x = 810;
      if (p.obj.x > 810) p.obj.x = -10;
    });
  }
}
