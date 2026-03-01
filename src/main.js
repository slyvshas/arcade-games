import Phaser from 'phaser';
import HubScene from './scenes/HubScene';
import PlatformerGame from './games/PlatformerGame';
import SnakeGame from './games/SnakeGame';
import BreakoutGame from './games/BreakoutGame';
import FlappyGame from './games/FlappyGame';
import SpaceShooterGame from './games/SpaceShooterGame';
import MemoryGame from './games/MemoryGame';
import WhackAMoleGame from './games/WhackAMoleGame';
import PongGame from './games/PongGame';
import RunnerGame from './games/RunnerGame';
import ColorMatchGame from './games/ColorMatchGame';

const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600,
    parent: 'game-container',
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    }
  },
  scene: [
    HubScene,
    PlatformerGame,
    SnakeGame,
    BreakoutGame,
    FlappyGame,
    SpaceShooterGame,
    MemoryGame,
    WhackAMoleGame,
    PongGame,
    RunnerGame,
    ColorMatchGame,
  ],
  backgroundColor: '#0a0a1a',
  input: {
    activePointers: 3,
  },
};

const game = new Phaser.Game(config);
