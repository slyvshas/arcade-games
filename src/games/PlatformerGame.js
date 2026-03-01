import Phaser from 'phaser';
import { COLORS, createBackButton, createScoreDisplay, showGameOver, shake, burstParticles, floatingText, flashScreen } from '../utils';

export default class PlatformerGame extends Phaser.Scene {
  constructor() { super('PlatformerGame'); }

  create() {
    this.cameras.main.fadeIn(300);
    this.physics.world.gravity.y = 900;

    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.combo = 0;
    this.gameActive = true;

    // ── Sky gradient ──
    const gfx = this.add.graphics();
    for (let i = 0; i < 600; i++) {
      const t = i / 600;
      const r = Math.floor(10 + t * 8);
      const g = Math.floor(10 + t * 20);
      const b = Math.floor(30 + t * 10);
      gfx.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      gfx.fillRect(0, i, 800, 1);
    }

    // Distant stars
    for (let i = 0; i < 30; i++) {
      this.add.circle(
        Phaser.Math.Between(0, 800), Phaser.Math.Between(0, 300),
        Phaser.Math.FloatBetween(0.5, 1.5), 0xffffff, Phaser.Math.FloatBetween(0.05, 0.2)
      );
    }

    // ── Platforms ──
    this.platforms = this.physics.add.staticGroup();
    this.createLevel();

    // ── Player ──
    this.player = this.add.rectangle(100, 450, 28, 36, COLORS.primary);
    this.physics.add.existing(this.player);
    this.player.body.setBounce(0.1);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(28, 36);
    // Eyes
    this.playerEyeL = this.add.circle(0, 0, 3, 0xffffff).setDepth(5);
    this.playerEyeR = this.add.circle(0, 0, 3, 0xffffff).setDepth(5);
    this.playerPupilL = this.add.circle(0, 0, 1.5, 0x000000).setDepth(6);
    this.playerPupilR = this.add.circle(0, 0, 1.5, 0x000000).setDepth(6);

    // Trail particles
    this.trailTimer = 0;

    // ── Coins ──
    this.coins = this.physics.add.group();
    this.spawnCoins();

    // ── Enemies ──
    this.enemies = this.physics.add.group();
    this.spawnEnemies();

    // ── Power-ups ──
    this.powerups = this.physics.add.group();
    this.hasShield = false;
    this.shieldGfx = null;
    this.hasSpeed = false;

    // ── Collisions ──
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.coins, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.powerups, this.platforms);
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, null, this);

    // ── Controls ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Mobile touch zones
    this.input.on('pointerdown', (ptr) => {
      if (!this.gameActive) return;
      if (ptr.y < 400 && this.player.body.touching.down) {
        this.player.body.setVelocityY(-440);
        this.jumpEffect();
      }
    });

    // ── UI ──
    createBackButton(this);
    this.scoreText = createScoreDisplay(this);
    this.livesText = this.add.text(16, 16, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '14px', color: '#ff6b6b',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(100);
    this.updateLivesText();

    this.comboText = this.add.text(400, 80, '', {
      fontFamily: 'Orbitron, monospace', fontSize: '20px', color: '#00ff88',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    this.levelText = this.add.text(400, 50, `LEVEL ${this.level}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '14px', color: '#636e72',
    }).setOrigin(0.5).setDepth(100);

    // Level start animation
    const go = this.add.text(400, 300, 'GO!', {
      fontFamily: 'Orbitron, monospace', fontSize: '64px', color: '#00ff88',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(200).setAlpha(0);
    this.tweens.add({
      targets: go, alpha: 1, scale: 1.3, duration: 400, yoyo: true,
      onComplete: () => go.destroy(),
    });
  }

  createLevel() {
    this.platforms.clear(true, true);

    // Ground
    for (let x = 0; x < 800; x += 64) {
      const g = this.add.rectangle(x + 32, 584, 64, 32, 0x1a1a3a);
      this.add.rectangle(x + 32, 569, 64, 2, COLORS.primary, 0.3);
      this.platforms.add(g);
      this.physics.add.existing(g, true);
    }

    // Platforms with variety
    const layouts = [
      [[150, 460], [350, 380], [600, 400], [500, 280], [200, 260], [700, 180], [100, 160]],
      [[100, 440], [300, 480], [450, 360], [650, 320], [250, 220], [550, 180], [400, 120]],
      [[200, 480], [450, 440], [700, 380], [300, 300], [100, 250], [600, 200], [400, 140]],
    ];
    const layout = layouts[(this.level - 1) % layouts.length];

    layout.forEach(([px, py]) => {
      const w = Phaser.Math.Between(80, 140);
      const plat = this.add.rectangle(px, py, w, 16, 0x222244);
      this.add.rectangle(px, py - 7, w, 2, COLORS.accent, 0.4);
      this.platforms.add(plat);
      this.physics.add.existing(plat, true);
    });
  }

  spawnCoins() {
    this.coins.clear(true, true);
    const count = 8 + this.level * 2;
    for (let i = 0; i < count; i++) {
      const cx = Phaser.Math.Between(60, 740);
      const cy = Phaser.Math.Between(80, 500);
      const coin = this.add.circle(cx, cy, 8, COLORS.warning);
      this.add.circle(cx, cy, 4, 0xffffff, 0.3).setDepth(1);
      this.physics.add.existing(coin);
      coin.body.setBounce(0.4);
      coin.body.setCollideWorldBounds(true);
      this.coins.add(coin);
    }
    // Spawn a powerup every level
    if (this.level % 2 === 0) {
      this.spawnPowerup();
    }
  }

  spawnEnemies() {
    this.enemies.clear(true, true);
    const count = Math.min(2 + this.level, 8);
    for (let i = 0; i < count; i++) {
      const ex = Phaser.Math.Between(200, 700);
      const ey = 520;
      const enemy = this.add.rectangle(ex, ey, 24, 24, COLORS.danger);
      // Angry eyes on enemy
      this.add.circle(ex - 5, ey - 4, 3, 0xffffff).setDepth(2);
      this.add.circle(ex + 5, ey - 4, 3, 0xffffff).setDepth(2);
      this.add.circle(ex - 5, ey - 3, 1.5, 0xff0000).setDepth(3);
      this.add.circle(ex + 5, ey - 3, 1.5, 0xff0000).setDepth(3);
      this.physics.add.existing(enemy);
      enemy.body.setBounce(1);
      enemy.body.setCollideWorldBounds(true);
      enemy.body.setVelocityX(Phaser.Math.Between(60, 120) * (Math.random() > 0.5 ? 1 : -1));
      enemy.body.allowGravity = false;
      this.enemies.add(enemy);
    }
  }

  spawnPowerup() {
    const type = Math.random() > 0.5 ? 'shield' : 'speed';
    const px = Phaser.Math.Between(100, 700);
    const py = Phaser.Math.Between(100, 400);
    const color = type === 'shield' ? COLORS.accent : COLORS.neon;
    const pu = this.add.rectangle(px, py, 18, 18, color);
    this.add.text(px, py, type === 'shield' ? '🛡' : '⚡', { fontSize: '14px' }).setOrigin(0.5).setDepth(5);
    this.physics.add.existing(pu);
    pu.body.setBounce(0.6);
    pu.body.setCollideWorldBounds(true);
    pu.setData('type', type);
    this.powerups.add(pu);
    // Sparkle animation
    this.tweens.add({ targets: pu, angle: 360, duration: 3000, repeat: -1 });
  }

  collectCoin(player, coin) {
    this.combo++;
    const multiplier = Math.min(this.combo, 5);
    const points = 10 * multiplier;
    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);

    burstParticles(this, coin.x, coin.y, COLORS.warning, 8, 30);
    floatingText(this, coin.x, coin.y - 10, `+${points}`, '#feca57');

    if (this.combo >= 3) {
      this.comboText.setText(`${this.combo}x COMBO!`).setAlpha(1);
      this.tweens.add({ targets: this.comboText, alpha: 0, duration: 800, delay: 300 });
    }

    coin.destroy();

    // Level complete?
    if (this.coins.countActive() === 0) {
      this.levelUp();
    }
  }

  collectPowerup(player, powerup) {
    const type = powerup.getData('type');
    burstParticles(this, powerup.x, powerup.y, COLORS.neon, 15, 40);
    floatingText(this, powerup.x, powerup.y, type === 'shield' ? 'SHIELD!' : 'SPEED!', '#00ff88', '22px');
    flashScreen(this, COLORS.neon, 0.15, 300);
    powerup.destroy();

    if (type === 'shield') {
      this.hasShield = true;
      this.shieldGfx = this.add.circle(player.x, player.y, 24, COLORS.accent, 0.2).setDepth(10);
      this.time.delayedCall(5000, () => { this.hasShield = false; if (this.shieldGfx) this.shieldGfx.destroy(); });
    } else {
      this.hasSpeed = true;
      this.time.delayedCall(4000, () => { this.hasSpeed = false; });
    }
  }

  hitEnemy(player, enemy) {
    if (!this.gameActive) return;

    // Stomp from above
    if (player.body.velocity.y > 0 && player.y < enemy.y - 10) {
      burstParticles(this, enemy.x, enemy.y, COLORS.danger, 12, 40);
      floatingText(this, enemy.x, enemy.y, '+25', '#ff6b6b');
      shake(this, 0.003, 100);
      enemy.destroy();
      player.body.setVelocityY(-300);
      this.score += 25;
      this.scoreText.setText(`Score: ${this.score}`);
      return;
    }

    if (this.hasShield) {
      this.hasShield = false;
      if (this.shieldGfx) this.shieldGfx.destroy();
      burstParticles(this, player.x, player.y, COLORS.accent, 10, 35);
      enemy.destroy();
      return;
    }

    this.lives--;
    this.combo = 0;
    this.updateLivesText();
    shake(this, 0.008, 200);
    flashScreen(this, COLORS.danger, 0.4, 300);

    if (this.lives <= 0) {
      this.gameActive = false;
      this.physics.pause();
      showGameOver(this, this.score, 'PlatformerGame');
    } else {
      // Respawn with brief invuln
      player.setPosition(100, 450);
      player.body.setVelocity(0);
      this.tweens.add({
        targets: player, alpha: 0.3, duration: 100, yoyo: true, repeat: 5,
        onComplete: () => player.setAlpha(1),
      });
    }
  }

  levelUp() {
    this.level++;
    this.levelText.setText(`LEVEL ${this.level}`);
    flashScreen(this, COLORS.neon, 0.2, 400);

    const lvl = this.add.text(400, 300, `LEVEL ${this.level}`, {
      fontFamily: 'Orbitron, monospace', fontSize: '48px', color: '#00ff88',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(200).setAlpha(0);
    this.tweens.add({
      targets: lvl, alpha: 1, scale: 1.2, duration: 500, yoyo: true,
      onComplete: () => lvl.destroy(),
    });

    this.score += 50 * this.level;
    this.scoreText.setText(`Score: ${this.score}`);
    this.combo = 0;
    this.createLevel();
    this.spawnCoins();
    this.spawnEnemies();
    this.player.setPosition(100, 450);
    this.player.body.setVelocity(0);
  }

  jumpEffect() {
    burstParticles(this, this.player.x, this.player.y + 18, 0x444488, 5, 15);
  }

  updateLivesText() {
    this.livesText.setText('♥'.repeat(this.lives));
  }

  update(time, delta) {
    if (!this.gameActive) return;

    const speed = this.hasSpeed ? 280 : 200;

    // Movement
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      this.player.body.setVelocityX(-speed);
      this.player.setFillStyle(COLORS.primaryLight);
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      this.player.body.setVelocityX(speed);
      this.player.setFillStyle(COLORS.primary);
    } else {
      this.player.body.setVelocityX(0);
    }

    // Jump
    if ((this.cursors.up.isDown || this.wasd.W.isDown || this.spaceKey.isDown) && this.player.body.touching.down) {
      this.player.body.setVelocityY(-440);
      this.jumpEffect();
    }

    // Update player eyes
    const px = this.player.x, py = this.player.y;
    this.playerEyeL.setPosition(px - 6, py - 6);
    this.playerEyeR.setPosition(px + 6, py - 6);
    const dir = this.player.body.velocity.x > 0 ? 1.5 : this.player.body.velocity.x < 0 ? -1.5 : 0;
    this.playerPupilL.setPosition(px - 6 + dir, py - 5);
    this.playerPupilR.setPosition(px + 6 + dir, py - 5);

    // Shield follow
    if (this.shieldGfx && this.hasShield) {
      this.shieldGfx.setPosition(px, py);
    }

    // Movement trail
    this.trailTimer += delta;
    if (this.trailTimer > 50 && Math.abs(this.player.body.velocity.x) > 50) {
      this.trailTimer = 0;
      const t = this.add.rectangle(px, py, 28, 36, COLORS.primary, 0.3);
      this.tweens.add({ targets: t, alpha: 0, duration: 200, onComplete: () => t.destroy() });
    }

    // Mobile controls
    if (this.input.pointer1.isDown) {
      const ptr = this.input.pointer1;
      if (ptr.x < 300) this.player.body.setVelocityX(-speed);
      else if (ptr.x > 500) this.player.body.setVelocityX(speed);
    }
  }
}
