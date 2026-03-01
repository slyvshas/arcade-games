import Phaser from 'phaser';
import { COLORS, createBackButton, createScoreDisplay, showGameOver, shake, burstParticles, floatingText, flashScreen } from '../utils';

export default class RunnerGame extends Phaser.Scene {
  constructor() { super('RunnerGame'); }

  create() {
    this.cameras.main.fadeIn(300);
    this.physics.world.gravity.y = 1200;

    this.score = 0;
    this.distance = 0;
    this.gameActive = true;
    this.speed = 300;
    this.maxSpeed = 700;
    this.jumping = false;
    this.ducking = false;
    this.hasShield = false;

    // ── Parallax background ──
    this.bgLayers = [];
    // Far mountains
    for (let i = 0; i < 6; i++) {
      const mh = Phaser.Math.Between(80, 180);
      const m = this.add.triangle(
        i * 160, 500,
        0, mh, mh * 0.8, 0, mh * 1.6, mh,
        0x0c0c25
      ).setDepth(-3).setOrigin(0, 1);
      this.bgLayers.push({ obj: m, speed: 0.15, w: mh * 1.6 });
    }
    // Near buildings
    for (let i = 0; i < 10; i++) {
      const bh = Phaser.Math.Between(40, 130);
      const bw = Phaser.Math.Between(30, 70);
      const b = this.add.rectangle(i * 90, 500 - bh / 2, bw, bh, 0x111130).setDepth(-2);
      this.bgLayers.push({ obj: b, speed: 0.4, w: 90 });
    }

    // Stars
    for (let i = 0; i < 25; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0, 800), Phaser.Math.Between(0, 250),
        Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.05, 0.15)
      ).setDepth(-4);
      this.bgLayers.push({ obj: s, speed: 0.05, w: 800 });
    }

    // ── Ground ──
    this.groundY = 500;
    this.ground = this.add.rectangle(400, this.groundY + 25, 800, 50, 0x1a1a3a).setDepth(1);
    this.add.rectangle(400, this.groundY + 1, 800, 2, COLORS.neon, 0.3).setDepth(2);

    // Ground particles (scrolling dots)
    this.groundDots = [];
    for (let i = 0; i < 15; i++) {
      const d = this.add.circle(Phaser.Math.Between(0, 800), this.groundY + Phaser.Math.Between(5, 45),
        1, 0x333366).setDepth(1);
      this.groundDots.push(d);
    }

    // ── Player ──
    this.player = this.add.rectangle(150, this.groundY - 24, 28, 48, COLORS.primary).setDepth(10);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setGravityY(0);

    // Player details
    this.playerEyeL = this.add.circle(0, 0, 3, 0xffffff).setDepth(11);
    this.playerEyeR = this.add.circle(0, 0, 3, 0xffffff).setDepth(11);
    this.playerPupilL = this.add.circle(0, 0, 1.5, 0x000000).setDepth(12);
    this.playerPupilR = this.add.circle(0, 0, 1.5, 0x000000).setDepth(12);

    // Shield visual
    this.shieldGfx = null;

    // ── Obstacles ──
    this.obstacles = this.physics.add.group();
    this.obstacleTimer = this.time.addEvent({
      delay: 1500,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true,
    });

    // ── Collectibles ──
    this.collectibles = this.physics.add.group();
    this.collectTimer = this.time.addEvent({
      delay: 3000,
      callback: this.spawnCollectible,
      callbackScope: this,
      loop: true,
    });

    // ── Collisions ──
    this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);
    this.physics.add.overlap(this.player, this.collectibles, this.collect, null, this);

    // Invisible ground collider
    this.groundCollider = this.add.rectangle(400, this.groundY, 800, 4, 0x000000, 0).setDepth(-10);
    this.physics.add.existing(this.groundCollider, true);
    this.physics.add.collider(this.player, this.groundCollider, () => {
      this.jumping = false;
    });

    // ── Controls ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.wasd = this.input.keyboard.addKeys('W,S');

    this.input.on('pointerdown', (ptr) => {
      if (!this.gameActive) return;
      if (ptr.y < 400) this.jump();
      else this.duck(true);
    });
    this.input.on('pointerup', () => this.duck(false));

    // ── UI ──
    createBackButton(this);
    this.scoreText = createScoreDisplay(this);
    this.speedText = this.add.text(400, 16, '', {
      fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#636e72',
    }).setOrigin(0.5).setDepth(100);
  }

  jump() {
    if (this.jumping || this.ducking || !this.gameActive) return;
    this.jumping = true;
    this.player.body.setVelocityY(-550);
    burstParticles(this, this.player.x, this.player.y + 24, 0x444488, 4, 12);
  }

  duck(down) {
    if (!this.gameActive) return;
    if (down && !this.jumping) {
      this.ducking = true;
      this.player.setSize(28, 24);
      this.player.body.setSize(28, 24);
      this.player.y = this.groundY - 12;
      this.player.setFillStyle(COLORS.primaryDark);
    } else {
      this.ducking = false;
      this.player.setSize(28, 48);
      this.player.body.setSize(28, 48);
      this.player.setFillStyle(COLORS.primary);
    }
  }

  spawnObstacle() {
    if (!this.gameActive) return;

    const type = Math.random();

    if (type < 0.4) {
      // Ground spike
      const h = Phaser.Math.Between(30, 55);
      const obs = this.add.rectangle(850, this.groundY - h / 2, 22, h, COLORS.danger).setDepth(5);
      this.physics.add.existing(obs);
      obs.body.setVelocityX(-this.speed);
      obs.body.allowGravity = false;
      obs.body.setImmovable(true);
      this.obstacles.add(obs);
      // Spike top
      this.add.triangle(850, this.groundY - h - 5, -14, 14, 14, 14, 0, 0, COLORS.dangerDark).setDepth(5)
        .setData('followObs', obs);
    } else if (type < 0.7) {
      // Flying obstacle (must duck)
      const obs = this.add.rectangle(850, this.groundY - 34, 40, 14, COLORS.neonPink).setDepth(5);
      this.physics.add.existing(obs);
      obs.body.setVelocityX(-this.speed * 1.1);
      obs.body.allowGravity = false;
      obs.body.setImmovable(true);
      this.obstacles.add(obs);
    } else {
      // Double obstacle
      const obs1 = this.add.rectangle(850, this.groundY - 18, 18, 36, COLORS.danger).setDepth(5);
      const obs2 = this.add.rectangle(890, this.groundY - 25, 18, 50, COLORS.dangerDark).setDepth(5);
      [obs1, obs2].forEach(o => {
        this.physics.add.existing(o);
        o.body.setVelocityX(-this.speed);
        o.body.allowGravity = false;
        o.body.setImmovable(true);
        this.obstacles.add(o);
      });
    }

    // Adjust spawn rate based on speed
    this.obstacleTimer.delay = Math.max(800, 1500 - (this.speed - 300) * 1.5);
  }

  spawnCollectible() {
    if (!this.gameActive) return;

    const isShield = Math.random() < 0.15 && !this.hasShield;
    const cy = isShield ? this.groundY - 50 : Phaser.Math.Between(this.groundY - 80, this.groundY - 30);
    const color = isShield ? COLORS.accent : COLORS.warning;
    const size = isShield ? 10 : 7;

    const c = this.add.circle(850, cy, size, color).setDepth(8);
    this.physics.add.existing(c);
    c.body.setVelocityX(-this.speed);
    c.body.allowGravity = false;
    c.setData('type', isShield ? 'shield' : 'coin');
    this.collectibles.add(c);

    this.tweens.add({ targets: c, scale: 1.3, duration: 300, yoyo: true, repeat: -1 });
  }

  collect(player, item) {
    const type = item.getData('type');

    if (type === 'shield') {
      this.hasShield = true;
      this.shieldGfx = this.add.circle(player.x, player.y, 30, COLORS.accent, 0.2).setDepth(15);
      burstParticles(this, item.x, item.y, COLORS.accent, 10, 30);
      floatingText(this, item.x, item.y - 10, 'SHIELD!', '#00cec9');
      flashScreen(this, COLORS.accent, 0.1, 150);
    } else {
      this.score += 5;
      this.scoreText.setText(`Score: ${this.score}`);
      burstParticles(this, item.x, item.y, COLORS.warning, 5, 15);
      floatingText(this, item.x, item.y - 10, '+5');
    }

    item.destroy();
  }

  hitObstacle(player, obs) {
    if (!this.gameActive) return;

    if (this.hasShield) {
      this.hasShield = false;
      if (this.shieldGfx) { this.shieldGfx.destroy(); this.shieldGfx = null; }
      burstParticles(this, obs.x, obs.y, COLORS.accent, 10, 25);
      obs.destroy();
      shake(this, 0.003, 100);
      return;
    }

    this.gameActive = false;
    shake(this, 0.015, 400);
    flashScreen(this, COLORS.danger, 0.5, 400);
    burstParticles(this, player.x, player.y, COLORS.primary, 15, 40);

    this.physics.pause();
    if (this.obstacleTimer) this.obstacleTimer.destroy();
    if (this.collectTimer) this.collectTimer.destroy();

    this.time.delayedCall(600, () => {
      const finalScore = this.score + Math.floor(this.distance / 10);
      showGameOver(this, finalScore, 'RunnerGame');
    });
  }

  update(time, delta) {
    if (!this.gameActive) return;

    // Speed increase
    this.speed = Math.min(this.maxSpeed, this.speed + delta * 0.005);
    this.distance += this.speed * delta * 0.001;
    this.score = Math.floor(this.distance / 10);
    this.scoreText.setText(`Score: ${this.score}`);
    this.speedText.setText(`Speed: ${Math.floor(this.speed)}`);

    // Keyboard
    if (this.cursors.up.isDown || this.spaceKey.isDown || this.wasd.W.isDown) this.jump();
    if (this.cursors.down.isDown || this.wasd.S.isDown) this.duck(true);
    else if (!this.input.activePointer.isDown) this.duck(false);

    // Keep player at correct X
    this.player.x = 150;
    if (!this.jumping && !this.ducking) {
      this.player.y = this.groundY - 24;
    }

    // Update eyes
    const px = this.player.x, py = this.player.y;
    const eyeOff = this.ducking ? 4 : 8;
    this.playerEyeL.setPosition(px + 4, py - eyeOff);
    this.playerEyeR.setPosition(px + 10, py - eyeOff);
    this.playerPupilL.setPosition(px + 5, py - eyeOff + 1);
    this.playerPupilR.setPosition(px + 11, py - eyeOff + 1);

    // Shield follow
    if (this.shieldGfx && this.hasShield) {
      this.shieldGfx.setPosition(px, py);
    }

    // Scroll backgrounds
    this.bgLayers.forEach(l => {
      l.obj.x -= this.speed * l.speed * delta * 0.001;
      if (l.obj.x < -200) l.obj.x = 900;
    });

    // Ground dots
    this.groundDots.forEach(d => {
      d.x -= this.speed * delta * 0.001;
      if (d.x < -10) { d.x = 810; d.y = this.groundY + Phaser.Math.Between(5, 45); }
    });

    // Cleanup off-screen
    this.obstacles.getChildren().forEach(o => { if (o.x < -50) o.destroy(); });
    this.collectibles.getChildren().forEach(c => { if (c.x < -50) c.destroy(); });

    // Update obstacle speeds to current speed
    this.obstacles.getChildren().forEach(o => o.body.setVelocityX(-this.speed));
    this.collectibles.getChildren().forEach(c => c.body.setVelocityX(-this.speed));

    // Speed milestone effects
    if (Math.floor(this.speed) % 100 === 0 && Math.floor(this.speed) > 300) {
      flashScreen(this, COLORS.neon, 0.05, 100);
    }
  }
}
