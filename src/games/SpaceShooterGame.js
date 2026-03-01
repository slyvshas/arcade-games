import Phaser from 'phaser';
import { COLORS, createBackButton, createScoreDisplay, showGameOver, shake, burstParticles, floatingText, flashScreen } from '../utils';

export default class SpaceShooterGame extends Phaser.Scene {
  constructor() { super('SpaceShooterGame'); }

  create() {
    this.cameras.main.fadeIn(300);

    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.gameActive = true;
    this.fireRate = 200;
    this.lastFired = 0;
    this.powerLevel = 1;

    // ── Starfield background ──
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0, 800), Phaser.Math.Between(0, 600),
        Phaser.Math.FloatBetween(0.5, 2), 0xffffff,
        Phaser.Math.FloatBetween(0.1, 0.4)
      ).setDepth(-1);
      this.stars.push({ obj: s, speed: Phaser.Math.FloatBetween(0.5, 3) });
    }

    // ── Player Ship ──
    this.ship = this.add.container(400, 520);
    const body = this.add.rectangle(0, 0, 32, 40, COLORS.primary);
    const nose = this.add.triangle(0, -22, -8, 0, 8, 0, 0, -14, COLORS.accent);
    const wingL = this.add.triangle(-18, 10, 0, -12, 0, 12, -16, 12, COLORS.primaryDark);
    const wingR = this.add.triangle(18, 10, 0, -12, 0, 12, 16, 12, COLORS.primaryDark);
    const engine = this.add.rectangle(0, 22, 10, 6, COLORS.danger);
    this.ship.add([wingL, wingR, body, nose, engine]);
    this.ship.setDepth(10);
    this.physics.add.existing(this.ship);
    this.ship.body.setSize(32, 44);
    this.ship.body.setCollideWorldBounds(true);

    // Engine flame animation
    this.engineFlame = this.add.rectangle(this.ship.x, this.ship.y + 28, 6, 12, COLORS.warning).setDepth(9);
    this.tweens.add({ targets: this.engineFlame, scaleY: 1.5, alpha: 0.6, duration: 100, yoyo: true, repeat: -1 });

    // ── Bullets ──
    this.bullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();

    // ── Enemies ──
    this.enemies = this.physics.add.group();

    // ── Powerups ──
    this.powerups = this.physics.add.group();

    // ── Collisions ──
    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.ship, this.enemies, this.hitShip, null, this);
    this.physics.add.overlap(this.ship, this.enemyBullets, this.hitShip, null, this);
    this.physics.add.overlap(this.ship, this.powerups, this.collectPowerup, null, this);

    // ── Controls ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // ── Waves ──
    this.spawnWave();

    // ── UI ──
    createBackButton(this);
    this.scoreText = createScoreDisplay(this);
    this.livesText = this.add.text(16, 16, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '14px', color: '#ff6b6b',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(100);
    this.updateLivesText();

    this.waveText = this.add.text(400, 50, `WAVE ${this.wave}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '14px', color: '#636e72',
    }).setOrigin(0.5).setDepth(100);

    // Wave announce
    this.announceWave();
  }

  announceWave() {
    const txt = this.add.text(400, 300, `WAVE ${this.wave}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '42px', color: '#00ff88',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(200).setAlpha(0);
    this.tweens.add({
      targets: txt, alpha: 1, scale: 1.2, duration: 500, yoyo: true,
      onComplete: () => txt.destroy(),
    });
  }

  spawnWave() {
    const count = 4 + this.wave * 2;
    const rows = Math.ceil(count / 6);

    for (let i = 0; i < count; i++) {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const ex = 120 + col * 100;
      const ey = -40 - row * 50;

      this.time.delayedCall(i * 100, () => {
        if (!this.gameActive) return;

        const type = Math.random() < 0.2 && this.wave > 2 ? 'tank' : 'normal';
        const hp = type === 'tank' ? 3 : 1;
        const color = type === 'tank' ? COLORS.danger : COLORS.neonPink;
        const size = type === 'tank' ? 28 : 22;

        const enemy = this.add.rectangle(ex, ey, size, size, color).setDepth(5);
        this.physics.add.existing(enemy);
        enemy.body.setVelocityY(40 + this.wave * 5);
        enemy.setData('hp', hp);
        enemy.setData('type', type);
        this.enemies.add(enemy);

        // Add enemy eyes
        this.add.circle(ex - 4, ey, 2, 0xffffff).setDepth(6).setData('parent', enemy);
        this.add.circle(ex + 4, ey, 2, 0xffffff).setDepth(6).setData('parent', enemy);

        // Some enemies move sideways
        if (Math.random() < 0.5) {
          this.tweens.add({
            targets: enemy, x: enemy.x + Phaser.Math.Between(-80, 80),
            duration: Phaser.Math.Between(1500, 3000), yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }

        // Shooting enemies (later waves)
        if (this.wave >= 2 && Math.random() < 0.3) {
          this.time.addEvent({
            delay: Phaser.Math.Between(2000, 4000),
            callback: () => {
              if (!enemy.active || !this.gameActive) return;
              const b = this.add.circle(enemy.x, enemy.y + 15, 4, COLORS.danger);
              this.physics.add.existing(b);
              b.body.setVelocityY(250);
              this.enemyBullets.add(b);
            },
            loop: true,
          });
        }
      });
    }
  }

  fire() {
    const x = this.ship.x;
    const y = this.ship.y - 24;

    if (this.powerLevel >= 3) {
      // Triple shot
      [-15, 0, 15].forEach(offset => {
        const b = this.add.rectangle(x + offset, y, 4, 14, COLORS.accent).setDepth(8);
        this.physics.add.existing(b);
        b.body.setVelocityY(-500);
        b.body.setVelocityX(offset * 2);
        this.bullets.add(b);
      });
    } else if (this.powerLevel >= 2) {
      // Double shot
      [-8, 8].forEach(offset => {
        const b = this.add.rectangle(x + offset, y, 4, 14, COLORS.accent).setDepth(8);
        this.physics.add.existing(b);
        b.body.setVelocityY(-500);
        this.bullets.add(b);
      });
    } else {
      const b = this.add.rectangle(x, y, 4, 14, COLORS.accent).setDepth(8);
      this.physics.add.existing(b);
      b.body.setVelocityY(-500);
      this.bullets.add(b);
    }
  }

  hitEnemy(bullet, enemy) {
    bullet.destroy();

    const hp = enemy.getData('hp') - 1;
    enemy.setData('hp', hp);

    if (hp <= 0) {
      const pts = enemy.getData('type') === 'tank' ? 30 : 10;
      this.score += pts;
      this.scoreText.setText(`Score: ${this.score}`);

      burstParticles(this, enemy.x, enemy.y,
        enemy.getData('type') === 'tank' ? COLORS.danger : COLORS.neonPink, 12, 35);
      floatingText(this, enemy.x, enemy.y - 10, `+${pts}`);
      shake(this, 0.002, 60);
      enemy.destroy();

      // Drop powerup
      if (Math.random() < 0.1) {
        const pu = this.add.rectangle(enemy.x, enemy.y, 16, 16, COLORS.neon).setDepth(5);
        this.physics.add.existing(pu);
        pu.body.setVelocityY(80);
        this.powerups.add(pu);
        this.tweens.add({ targets: pu, angle: 360, duration: 2000, repeat: -1 });
      }

      // Wave clear?
      if (this.enemies.countActive() === 0) {
        this.wave++;
        this.waveText.setText(`WAVE ${this.wave}`);
        this.score += 50 * this.wave;
        this.scoreText.setText(`Score: ${this.score}`);
        flashScreen(this, COLORS.neon, 0.15, 300);
        this.announceWave();
        this.time.delayedCall(1200, () => this.spawnWave());
      }
    } else {
      enemy.setFillStyle(0xffffff);
      this.time.delayedCall(50, () => {
        if (enemy.active) enemy.setFillStyle(enemy.getData('type') === 'tank' ? COLORS.danger : COLORS.neonPink);
      });
    }
  }

  collectPowerup(ship, pu) {
    this.powerLevel = Math.min(3, this.powerLevel + 1);
    burstParticles(this, pu.x, pu.y, COLORS.neon, 10, 30);
    floatingText(this, pu.x, pu.y, 'POWER UP!', '#00ff88');
    flashScreen(this, COLORS.neon, 0.1, 150);
    pu.destroy();
  }

  hitShip(ship, obj) {
    if (!this.gameActive) return;
    obj.destroy();
    this.lives--;
    this.updateLivesText();
    shake(this, 0.008, 200);
    flashScreen(this, COLORS.danger, 0.4, 300);
    burstParticles(this, ship.x, ship.y, COLORS.primary, 10, 30);
    this.powerLevel = Math.max(1, this.powerLevel - 1);

    if (this.lives <= 0) {
      this.gameActive = false;
      this.physics.pause();
      showGameOver(this, this.score, 'SpaceShooterGame');
    } else {
      // Invuln flash
      this.tweens.add({
        targets: ship, alpha: 0.3, duration: 80, yoyo: true, repeat: 8,
        onComplete: () => ship.setAlpha(1),
      });
    }
  }

  updateLivesText() {
    this.livesText.setText('♥'.repeat(this.lives));
  }

  update(time) {
    if (!this.gameActive) return;

    // Scrolling stars
    this.stars.forEach(s => {
      s.obj.y += s.speed;
      if (s.obj.y > 610) { s.obj.y = -10; s.obj.x = Phaser.Math.Between(0, 800); }
    });

    // Ship movement
    const speed = 350;
    if (this.cursors.left.isDown || this.wasd.A.isDown) this.ship.body.setVelocityX(-speed);
    else if (this.cursors.right.isDown || this.wasd.D.isDown) this.ship.body.setVelocityX(speed);
    else this.ship.body.setVelocityX(0);

    if (this.cursors.up.isDown || this.wasd.W.isDown) this.ship.body.setVelocityY(-speed);
    else if (this.cursors.down.isDown || this.wasd.S.isDown) this.ship.body.setVelocityY(speed);
    else this.ship.body.setVelocityY(0);

    // Touch control
    if (this.input.activePointer.isDown) {
      const ptr = this.input.activePointer;
      const dx = ptr.x - this.ship.x;
      const dy = ptr.y - this.ship.y;
      if (Math.abs(dx) > 10) this.ship.body.setVelocityX(dx > 0 ? speed : -speed);
      if (Math.abs(dy) > 10) this.ship.body.setVelocityY(dy > 0 ? speed : -speed);
    }

    this.engineFlame.setPosition(this.ship.x, this.ship.y + 28);

    // Auto-fire
    if (time > this.lastFired + this.fireRate) {
      this.fire();
      this.lastFired = time;
    }

    // Cleanup off-screen
    this.bullets.getChildren().forEach(b => { if (b.y < -20) b.destroy(); });
    this.enemyBullets.getChildren().forEach(b => { if (b.y > 620) b.destroy(); });
    this.enemies.getChildren().forEach(e => { if (e.y > 640) e.destroy(); });
  }
}
