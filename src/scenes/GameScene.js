import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // Create platforms using simple rectangles
    this.platforms = this.physics.add.staticGroup();

    // Ground platform
    let ground = this.add.rectangle(400, 570, 800, 32, 0x6ba3ff);
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    // Left platform
    let platform1 = this.add.rectangle(75, 410, 150, 20, 0x4a7fff);
    this.physics.add.existing(platform1, true);
    this.platforms.add(platform1);

    // Middle platform
    let platform2 = this.add.rectangle(400, 320, 200, 20, 0x4a7fff);
    this.physics.add.existing(platform2, true);
    this.platforms.add(platform2);

    // Right platform
    let platform3 = this.add.rectangle(725, 230, 150, 20, 0x4a7fff);
    this.physics.add.existing(platform3, true);
    this.platforms.add(platform3);

    // Create player as a simple rectangle
    this.player = this.add.rectangle(100, 450, 32, 32, 0xff6b6b);
    this.physics.add.existing(this.player);
    this.player.body.setBounce(0.2);
    this.player.body.setCollideWorldBounds(true);

    // Add stars to collect
    this.stars = this.physics.add.group();
    for (let i = 0; i < 12; i++) {
      let star = this.add.rectangle(12 + i * 70, 0, 16, 16, 0xffff00);
      this.physics.add.existing(star);
      star.body.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
      star.body.setVelocityY(0);
      this.stars.add(star);
    }

    // Bombs group
    this.bombs = this.physics.add.group();

    // Colliders
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.stars, this.platforms);
    this.physics.add.collider(this.bombs, this.platforms);
    this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);
    this.physics.add.collider(this.player, this.bombs, this.hitBomb, null, this);

    // Input handling
    this.cursors = this.input.keyboard.createCursorKeys();
    this.isJumping = false;

    // Score
    this.score = 0;
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '32px',
      fill: '#fff',
      fontStyle: 'bold'
    });

    // Game instructions
    const gameText = this.add.text(400, 300, 'Use Arrow Keys to Move\nPress UP to Jump\nCollect Stars, Avoid Bombs!', {
      fontSize: '20px',
      fill: '#fff',
      align: 'center',
      backgroundColor: '#000000',
      padding: { x: 10, y: 10 }
    });
    gameText.setOrigin(0.5);
    this.time.delayedCall(4000, () => {
      gameText.destroy();
    });
  }

  update() {
    if (this.cursors.left.isDown) {
      this.player.body.setVelocityX(-160);
    } else if (this.cursors.right.isDown) {
      this.player.body.setVelocityX(160);
    } else {
      this.player.body.setVelocityX(0);
    }

    if (this.cursors.up.isDown && this.player.body.touching.down) {
      this.player.body.setVelocityY(-330);
    }
  }

  collectStar(player, star) {
    star.destroy();

    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);

    if (this.stars.children.entries.length === 0) {
      // Recreate stars
      for (let i = 0; i < 12; i++) {
        let newStar = this.add.rectangle(12 + i * 70, 0, 16, 16, 0xffff00);
        this.physics.add.existing(newStar);
        newStar.body.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        this.stars.add(newStar);
      }

      // Add a bomb
      let x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
      let bomb = this.add.rectangle(x, 16, 20, 20, 0xff0000);
      this.physics.add.existing(bomb);
      bomb.body.setBounce(1);
      bomb.body.setCollideWorldBounds(true);
      bomb.body.setVelocity(Phaser.Math.Between(-200, 200), 20);
      this.bombs.add(bomb);
    }
  }

  hitBomb(player, bomb) {
    this.physics.pause();
    player.setFillStyle(0x000000);
    this.scene.start('GameOverScene');
  }
}

