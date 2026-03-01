# Arcade Hub - 10 Free Browser Games

A mobile-friendly arcade game portal built with **Phaser.js** and HTML5 Canvas. Play 10 classic mini-games right in your browser with touch and keyboard support.

## Games

| # | Game | Description | Controls |
|---|------|-------------|----------|
| 1 | **Platformer** | Jump & collect stars, avoid bombs | Arrow keys / WASD / Tap |
| 2 | **Snake** | Eat food & grow longer | Arrow keys / WASD / Swipe |
| 3 | **Breakout** | Smash all the bricks with a ball | Mouse / Arrow keys / Touch |
| 4 | **Flappy** | Fly through pipes | Space / Tap |
| 5 | **Space Shooter** | Blast waves of aliens | Arrow keys / Mouse / Touch |
| 6 | **Memory** | Match card pairs | Click / Tap |
| 7 | **Whack-a-Mole** | Whack moles before they hide | Click / Tap |
| 8 | **Pong** | Classic paddle game vs AI | Arrow keys / W,S / Touch |
| 9 | **Runner** | Jump over obstacles endlessly | Space / Up / Tap |
| 10 | **Color Match** | Fast reaction color matching | A,D / Arrow keys / Tap |

## Features

- Beautiful dark-themed game hub with card-based navigation
- Local high score tracking (localStorage)
- Mobile-friendly with touch/swipe controls
- Particle effects and smooth animations
- No external assets — all graphics are procedurally generated
- Hot-reloading dev server

## Project Structure

```
arcade-games/
├── src/
│   ├── main.js                  # Game config & scene registration
│   ├── utils.js                 # Shared colors, fonts, score utils
│   ├── scenes/
│   │   └── HubScene.js          # Game selection portal
│   └── games/
│       ├── PlatformerGame.js
│       ├── SnakeGame.js
│       ├── BreakoutGame.js
│       ├── FlappyGame.js
│       ├── SpaceShooterGame.js
│       ├── MemoryGame.js
│       ├── WhackAMoleGame.js
│       ├── PongGame.js
│       ├── RunnerGame.js
│       └── ColorMatchGame.js
├── index.html
├── webpack.config.js
├── package.json
└── .gitignore
```

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Production build
npm run build
```

## Tech Stack

- **Phaser 3** — HTML5 game framework
- **Webpack 5** — Module bundler with hot reload
- **Babel** — ES6+ transpilation

## License

MIT
