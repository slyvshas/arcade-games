import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    this.add.text(400, 200, 'Game Over!', {
      fontSize: '48px',
      fill: '#fff'
    }).setOrigin(0.5);

    this.add.text(400, 300, 'Press SPACE to Restart', {
      fontSize: '28px',
      fill: '#fff'
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }
}
