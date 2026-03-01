import Phaser from 'phaser';
import { COLORS, createBackButton, createScoreDisplay, showGameOver } from '../utils';

export default class SpaceShooterGame extends Phaser.Scene {
  constructor() {
    super('SpaceShooterGame');
  }

  create() {
    this.score = 0;
    this.lives = 3;
    this.gameActive = true;
    this.wave = 1;
    this.lastFire = 0;
    this.fireRate = 200;

    createBackButton(this);

    // Starfield background
    this.starfield = this.add.graphics();
    this.bgStars = [];
    for (let i = 0; i < 100; i++) {
      this.bgStars.push({
        x: Phaser.Math.Between(0, 800),
        y: Phaser.Math.Between(0, 600),
        speed: Phaser.Math.FloatBetween(0.5, 2),
        size: Phaser.Math.FloatBetween(0.5, 2),
      });
    }

    this.scoreText = createScoreDisplay(this, 620, 16);
    this.livesText = this.add.text(300, 16, '♥♥♥', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '18px', color: '#ff6b6b',
    }).setDepth(100);

    this.waveText = this.add.text(400, 50, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '24px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(100);

    // Player ship (triangle)
    this.ship = this.add.triangle(400, 520, 0, 24, 14, 0, 28, 24, COLORS.blueLight);
    this.physics.add.existing(this.ship);
    this.ship.body.setCollideWorldBounds(true);
    // Thruster
    this.thruster = this.add.triangle(400, 540, 0, 0, 7, 10, 14, 0, COLORS.warning);

    // Bullets
    this.bullets = this.physics.add.group();

    // Enemies
    this.enemies = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();

    // Collisions
    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.ship, this.enemies, this.hitPlayer, null, this);
    this.physics.add.overlap(this.ship, this.enemyBullets, this.hitPlayer, null, this);

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-SPACE', () => this.fire());

    // Touch control
    this.input.on('pointermove', (p) => {
      if (!this.gameActive) return;
      this.ship.x = Phaser.Math.Clamp(p.x, 20, 780);
    });
    this.input.on('pointerdown', () => this.fire());

    // Start first wave
    this.spawnWave();
  }

  spawnWave() {
    this.waveText.setText(`WAVE ${this.wave}`);
    this.tweens.add({
      targets: this.waveText, alpha: 0, delay: 1500, duration: 500,
      onComplete: () => this.waveText.setAlpha(1),
    });

    const count = 5 + this.wave * 2;
    const cols = Math.min(count, 8);
    const rows = Math.ceil(count / cols);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols && (r * cols + c) < count; c++) {
        const ex = 120 + c * 80;
        const ey = 60 + r * 50;
        const colors = [COLORS.danger, COLORS.orange, COLORS.pink, COLORS.primary];
        const enemy = this.add.rectangle(ex, ey, 28, 20, colors[r % colors.length]);
        this.physics.add.existing(enemy);
        enemy.body.allowGravity = false;
        enemy.hp = 1 + Math.floor(this.wave / 3);
        this.enemies.add(enemy);
      }
    }

    // Enemy movement pattern
    this.enemyDir = 1;
    this.enemyMoveTimer = this.time.addEvent({
      delay: Math.max(400, 1000 - this.wave * 50),
      callback: this.moveEnemies,
      callbackScope: this,
      loop: true,
    });

    // Enemy shooting
    this.enemyFireTimer = this.time.addEvent({
      delay: Math.max(600, 2000 - this.wave * 100),
      callback: this.enemyFire,
      callbackScope: this,
      loop: true,
    });
  }

  moveEnemies() {
    if (!this.gameActive) return;
    let hitEdge = false;
    this.enemies.children.entries.forEach(e => {
      if (e.active) {
        e.x += this.enemyDir * 20;
        if (e.x > 760 || e.x < 40) hitEdge = true;
      }
    });
    if (hitEdge) {
      this.enemyDir *= -1;
      this.enemies.children.entries.forEach(e => {
        if (e.active) e.y += 15;
      });
    }
  }

  enemyFire() {
    if (!this.gameActive) return;
    const active = this.enemies.children.entries.filter(e => e.active);
    if (active.length === 0) return;
    const shooter = Phaser.Utils.Array.GetRandom(active);
    const bullet = this.add.rectangle(shooter.x, shooter.y + 15, 4, 12, COLORS.danger);
    this.physics.add.existing(bullet);
    bullet.body.setVelocityY(250);
    bullet.body.allowGravity = false;
    this.enemyBullets.add(bullet);
  }

  fire() {
    if (!this.gameActive) return;
    const now = this.time.now;
    if (now - this.lastFire < this.fireRate) return;
    this.lastFire = now;

    const bullet = this.add.rectangle(this.ship.x, this.ship.y - 20, 3, 10, COLORS.accentLight);
    this.physics.add.existing(bullet);
    bullet.body.setVelocityY(-400);
    bullet.body.allowGravity = false;
    this.bullets.add(bullet);
  }

  hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.hp--;
    if (enemy.hp <= 0) {
      // Explosion particles
      for (let i = 0; i < 8; i++) {
        const p = this.add.circle(enemy.x, enemy.y, 3, enemy.fillColor);
        this.tweens.add({
          targets: p, x: enemy.x + Phaser.Math.Between(-30, 30),
          y: enemy.y + Phaser.Math.Between(-30, 30),
          alpha: 0, scale: 0, duration: 300, onComplete: () => p.destroy(),
        });
      }
      enemy.destroy();
      this.score += 10 * this.wave;
      this.scoreText.setText('Score: ' + this.score);

      // Check wave clear
      if (this.enemies.countActive() === 0) {
        this.wave++;
        if (this.enemyMoveTimer) this.enemyMoveTimer.destroy();
        if (this.enemyFireTimer) this.enemyFireTimer.destroy();
        this.enemyBullets.clear(true, true);
        this.time.delayedCall(1000, () => {
          if (this.gameActive) this.spawnWave();
        });
      }
    } else {
      enemy.setAlpha(0.5);
      this.time.delayedCall(100, () => { if (enemy.active) enemy.setAlpha(1); });
    }
  }

  hitPlayer(ship, obj) {
    if (!this.gameActive) return;
    obj.destroy();
    this.lives--;
    this.livesText.setText('♥'.repeat(Math.max(0, this.lives)));

    // Flash ship
    this.ship.setFillStyle(COLORS.danger);
    this.time.delayedCall(200, () => {
      if (this.gameActive) this.ship.setFillStyle(COLORS.blueLight);
    });

    if (this.lives <= 0) {
      this.gameActive = false;
      if (this.enemyMoveTimer) this.enemyMoveTimer.destroy();
      if (this.enemyFireTimer) this.enemyFireTimer.destroy();
      showGameOver(this, this.score, 'SpaceShooterGame');
    }
  }

  update() {
    if (!this.gameActive) return;

    // Move ship
    if (this.cursors.left.isDown) this.ship.x = Math.max(20, this.ship.x - 5);
    if (this.cursors.right.isDown) this.ship.x = Math.min(780, this.ship.x + 5);

    // Auto-fire on hold
    if (this.input.activePointer.isDown || this.cursors.up.isDown) this.fire();

    // Thruster follow
    this.thruster.x = this.ship.x;
    this.thruster.y = this.ship.y + 18;
    this.thruster.setAlpha(0.5 + Math.random() * 0.5);

    // Cleanup off-screen bullets
    this.bullets.children.entries.forEach(b => { if (b.active && b.y < -10) b.destroy(); });
    this.enemyBullets.children.entries.forEach(b => { if (b.active && b.y > 610) b.destroy(); });

    // Starfield
    this.starfield.clear();
    this.bgStars.forEach(s => {
      s.y += s.speed;
      if (s.y > 600) { s.y = 0; s.x = Phaser.Math.Between(0, 800); }
      this.starfield.fillStyle(0xffffff, 0.3);
      this.starfield.fillCircle(s.x, s.y, s.size);
    });
    this.starfield.setDepth(-1);
  }
}
