import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // No external assets needed - using shape primitives
  }

  create() {
    // Transition to game scene after a short delay
    this.time.delayedCall(500, () => {
      this.scene.start('GameScene');
    });

    // Display loading message
    const text = this.add.text(400, 300, 'Loading...', {
      fontSize: '32px',
      fill: '#fff'
    });
    text.setOrigin(0.5);
  }
}
