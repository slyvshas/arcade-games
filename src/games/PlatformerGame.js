import Phaser from 'phaser';
import { COLORS, createBackButton, createScoreDisplay, showGameOver } from '../utils';

export default class PlatformerGame extends Phaser.Scene {
  constructor() {
    super('PlatformerGame');
  }

  create() {
    this.physics.world.gravity.y = 500;
    this.score = 0;
    this.gameActive = true;

    createBackButton(this);
    this.scoreText = createScoreDisplay(this, 650, 16);

    // Sky gradient
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x1a1a4e, 0x1a1a4e, 0x2d2d6e, 0x2d2d6e, 1);
    sky.fillRect(0, 0, 800, 600);
    sky.setDepth(-1);

    // Ground
    this.platforms = this.physics.add.staticGroup();
    const ground = this.add.rectangle(400, 585, 800, 30, 0x4a7fff);
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    // Platforms
    const platData = [
      { x: 150, y: 460, w: 160 }, { x: 650, y: 460, w: 160 },
      { x: 400, y: 350, w: 200 }, { x: 100, y: 250, w: 140 },
      { x: 700, y: 250, w: 140 }, { x: 400, y: 150, w: 160 },
    ];
    platData.forEach(p => {
      const plat = this.add.rectangle(p.x, p.y, p.w, 16, 0x6ba3ff);
      this.physics.add.existing(plat, true);
      this.platforms.add(plat);
    });

    // Player
    this.player = this.add.rectangle(100, 500, 28, 28, COLORS.danger);
    this.physics.add.existing(this.player);
    this.player.body.setBounce(0.15);
    this.player.body.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.platforms);

    // Eyes on player
    this.leftEye = this.add.circle(-4, -6, 3, 0xffffff);
    this.rightEye = this.add.circle(6, -6, 3, 0xffffff);
    this.leftPupil = this.add.circle(-4, -6, 1.5, 0x000000);
    this.rightPupil = this.add.circle(6, -6, 1.5, 0x000000);

    // Stars
    this.stars = this.physics.add.group();
    this.physics.add.collider(this.stars, this.platforms);
    this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    this.spawnStars();

    // Bombs
    this.bombs = this.physics.add.group();
    this.physics.add.collider(this.bombs, this.platforms);
    this.physics.add.collider(this.player, this.bombs, this.hitBomb, null, this);

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    // Mobile touch zones
    this.input.on('pointerdown', (pointer) => {
      if (!this.gameActive) return;
      if (pointer.y < 300) {
        this.mobileJump = true;
      }
      if (pointer.x < 300) this.mobileLeft = true;
      else if (pointer.x > 500) this.mobileRight = true;
    });
    this.input.on('pointerup', () => {
      this.mobileLeft = false;
      this.mobileRight = false;
      this.mobileJump = false;
    });
  }

  spawnStars() {
    this.stars.clear(true, true);
    for (let i = 0; i < 12; i++) {
      const s = this.add.star(40 + i * 66, Phaser.Math.Between(0, 80), 5, 4, 8, COLORS.warning);
      this.physics.add.existing(s);
      s.body.setBounceY(Phaser.Math.FloatBetween(0.3, 0.7));
      this.stars.add(s);
    }
  }

  collectStar(player, star) {
    // Particle burst
    for (let i = 0; i < 6; i++) {
      const p = this.add.circle(star.x, star.y, 3, COLORS.warning);
      this.tweens.add({
        targets: p, x: star.x + Phaser.Math.Between(-40, 40),
        y: star.y + Phaser.Math.Between(-40, 40), alpha: 0, scale: 0,
        duration: 400, onComplete: () => p.destroy(),
      });
    }
    star.destroy();
    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);

    if (this.stars.countActive(true) === 0) {
      this.spawnStars();
      // Spawn bomb
      const bx = (this.player.x < 400) ? Phaser.Math.Between(500, 750) : Phaser.Math.Between(50, 300);
      const bomb = this.add.circle(bx, 16, 10, COLORS.danger);
      this.physics.add.existing(bomb);
      bomb.body.setBounce(1);
      bomb.body.setCollideWorldBounds(true);
      bomb.body.setVelocity(Phaser.Math.Between(-200, 200), 20);
      bomb.body.setGravityY(-500); // float
      this.bombs.add(bomb);
    }
  }

  hitBomb() {
    if (!this.gameActive) return;
    this.gameActive = false;
    this.physics.pause();
    this.player.setFillStyle(0x333333);
    this.time.delayedCall(300, () => showGameOver(this, this.score, 'PlatformerGame'));
  }

  update() {
    if (!this.gameActive) return;

    const left = this.cursors.left.isDown || this.wasd.A.isDown || this.mobileLeft;
    const right = this.cursors.right.isDown || this.wasd.D.isDown || this.mobileRight;
    const jump = this.cursors.up.isDown || this.wasd.W.isDown || this.mobileJump;

    if (left) this.player.body.setVelocityX(-200);
    else if (right) this.player.body.setVelocityX(200);
    else this.player.body.setVelocityX(0);

    if (jump && this.player.body.touching.down) {
      this.player.body.setVelocityY(-400);
    }

    // Update eyes to follow player
    const px = this.player.x;
    const py = this.player.y;
    this.leftEye.setPosition(px - 5, py - 6);
    this.rightEye.setPosition(px + 5, py - 6);
    this.leftPupil.setPosition(px - 5 + (left ? -2 : right ? 2 : 0), py - 6);
    this.rightPupil.setPosition(px + 5 + (left ? -2 : right ? 2 : 0), py - 6);
  }

  shutdown() {
    this.physics.world.gravity.y = 0;
  }
}
