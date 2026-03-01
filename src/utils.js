// Shared utilities for all games
export const COLORS = {
  bg: 0x0a0a1a,
  bgLight: 0x12122a,
  primary: 0x6c5ce7,
  primaryLight: 0xa29bfe,
  accent: 0x00cec9,
  accentLight: 0x81ecec,
  danger: 0xff6b6b,
  dangerLight: 0xffa8a8,
  warning: 0xfeca57,
  warningLight: 0xffeaa7,
  success: 0x00b894,
  successLight: 0x55efc4,
  white: 0xffffff,
  gray: 0x636e72,
  grayLight: 0xb2bec3,
  dark: 0x2d3436,
  orange: 0xe17055,
  pink: 0xfd79a8,
  blue: 0x0984e3,
  blueLight: 0x74b9ff,
};

export const FONTS = {
  title: { fontFamily: 'Orbitron, monospace', fontSize: '32px', color: '#ffffff' },
  heading: { fontFamily: 'Orbitron, monospace', fontSize: '24px', color: '#ffffff' },
  body: { fontFamily: 'Inter, Arial, sans-serif', fontSize: '18px', color: '#ffffff' },
  small: { fontFamily: 'Inter, Arial, sans-serif', fontSize: '14px', color: '#b2bec3' },
  score: { fontFamily: 'Orbitron, monospace', fontSize: '20px', color: '#feca57' },
  button: { fontFamily: 'Inter, Arial, sans-serif', fontSize: '16px', color: '#ffffff' },
};

export function getHighScore(gameKey) {
  try {
    return parseInt(localStorage.getItem(`arcade_${gameKey}_high`) || '0', 10);
  } catch (e) {
    return 0;
  }
}

export function setHighScore(gameKey, score) {
  try {
    const current = getHighScore(gameKey);
    if (score > current) {
      localStorage.setItem(`arcade_${gameKey}_high`, score.toString());
      return true;
    }
  } catch (e) {}
  return false;
}

export function createBackButton(scene) {
  const btn = scene.add.text(20, 16, '← BACK', {
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: '16px',
    color: '#b2bec3',
    backgroundColor: '#2d343688',
    padding: { x: 12, y: 6 },
  }).setInteractive({ useHandCursor: true }).setDepth(100);

  btn.on('pointerover', () => btn.setColor('#ffffff'));
  btn.on('pointerout', () => btn.setColor('#b2bec3'));
  btn.on('pointerdown', () => {
    scene.scene.start('HubScene');
  });
  return btn;
}

export function createScoreDisplay(scene, x, y) {
  return scene.add.text(x, y, 'Score: 0', {
    fontFamily: 'Orbitron, monospace',
    fontSize: '20px',
    color: '#feca57',
  }).setDepth(100);
}

export function showGameOver(scene, score, gameKey, restartScene) {
  const isNew = setHighScore(gameKey, score);
  const high = getHighScore(gameKey);

  const overlay = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.75).setDepth(200);

  scene.add.text(400, 180, 'GAME OVER', {
    fontFamily: 'Orbitron, monospace',
    fontSize: '42px',
    color: '#ff6b6b',
  }).setOrigin(0.5).setDepth(201);

  scene.add.text(400, 240, `Score: ${score}`, {
    fontFamily: 'Orbitron, monospace',
    fontSize: '28px',
    color: '#feca57',
  }).setOrigin(0.5).setDepth(201);

  if (isNew) {
    scene.add.text(400, 280, '★ NEW HIGH SCORE! ★', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '18px',
      color: '#55efc4',
    }).setOrigin(0.5).setDepth(201);
  } else {
    scene.add.text(400, 280, `Best: ${high}`, {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '18px',
      color: '#b2bec3',
    }).setOrigin(0.5).setDepth(201);
  }

  // Retry button
  const retryBg = scene.add.rectangle(400, 360, 200, 50, 0x6c5ce7, 1).setDepth(201).setInteractive({ useHandCursor: true });
  const retryTxt = scene.add.text(400, 360, '↻ PLAY AGAIN', {
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: '18px',
    color: '#ffffff',
  }).setOrigin(0.5).setDepth(202);

  retryBg.on('pointerover', () => retryBg.setFillStyle(0xa29bfe));
  retryBg.on('pointerout', () => retryBg.setFillStyle(0x6c5ce7));
  retryBg.on('pointerdown', () => scene.scene.restart());

  // Hub button
  const hubBg = scene.add.rectangle(400, 425, 200, 50, 0x2d3436, 1).setDepth(201).setInteractive({ useHandCursor: true });
  const hubTxt = scene.add.text(400, 425, '← GAME HUB', {
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: '18px',
    color: '#b2bec3',
  }).setOrigin(0.5).setDepth(202);

  hubBg.on('pointerover', () => hubBg.setFillStyle(0x636e72));
  hubBg.on('pointerout', () => hubBg.setFillStyle(0x2d3436));
  hubBg.on('pointerdown', () => scene.scene.start('HubScene'));
}
