// ═══════════════════════════════════════════════════════════════
// Shared utilities, effects & UI for Arcade Hub
// ═══════════════════════════════════════════════════════════════
import Phaser from 'phaser';

export const COLORS = {
  bg: 0x0a0a1a, bgLight: 0x12122a, bgCard: 0x161630,
  primary: 0x6c5ce7, primaryLight: 0xa29bfe, primaryDark: 0x4834d4,
  accent: 0x00cec9, accentLight: 0x81ecec,
  danger: 0xff6b6b, dangerLight: 0xffa8a8, dangerDark: 0xee5a24,
  warning: 0xfeca57, warningLight: 0xffeaa7,
  success: 0x00b894, successLight: 0x55efc4,
  white: 0xffffff, gray: 0x636e72, grayLight: 0xb2bec3, dark: 0x2d3436,
  orange: 0xe17055, pink: 0xfd79a8, blue: 0x0984e3, blueLight: 0x74b9ff,
  neon: 0x00ff88, neonBlue: 0x00d4ff, neonPink: 0xff00ff,
  gold: 0xffd700, silver: 0xc0c0c0, bronze: 0xcd7f32,
};

// ── High Scores ──────────────────────────────────────────────
export function getHighScore(key) {
  try { return parseInt(localStorage.getItem(`ah_${key}`) || '0', 10); } catch { return 0; }
}
export function setHighScore(key, score) {
  try {
    const cur = getHighScore(key);
    if (score > cur) { localStorage.setItem(`ah_${key}`, String(score)); return true; }
  } catch {}
  return false;
}

// ── Screen Shake ─────────────────────────────────────────────
export function shake(scene, intensity = 0.005, duration = 150) {
  scene.cameras.main.shake(duration, intensity);
}

// ── Flash Rect ───────────────────────────────────────────────
export function flashScreen(scene, color = 0xffffff, alpha = 0.3, dur = 200) {
  const f = scene.add.rectangle(400, 300, 800, 600, color, alpha).setDepth(999);
  scene.tweens.add({ targets: f, alpha: 0, duration: dur, onComplete: () => f.destroy() });
}

// ── Particle Burst ───────────────────────────────────────────
export function burstParticles(scene, x, y, color, count = 12, spread = 50) {
  for (let i = 0; i < count; i++) {
    const size = Phaser.Math.Between(2, 6);
    const p = scene.add.circle(x, y, size, color).setDepth(150).setAlpha(1);
    const angle = (i / count) * Math.PI * 2;
    const dist = Phaser.Math.Between(spread * 0.4, spread);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0, scale: 0, duration: Phaser.Math.Between(300, 600),
      ease: 'Power2',
      onComplete: () => p.destroy(),
    });
  }
}

// ── Floating Score Text ──────────────────────────────────────
export function floatingText(scene, x, y, text, color = '#feca57', size = '18px') {
  const t = scene.add.text(x, y, text, {
    fontFamily: 'Orbitron, monospace', fontSize: size, color,
    stroke: '#000', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(160);
  scene.tweens.add({
    targets: t, y: y - 50, alpha: 0, scale: 1.5,
    duration: 800, ease: 'Power2', onComplete: () => t.destroy(),
  });
}

// ── Glow Circle (decorative) ─────────────────────────────────
export function drawGlow(gfx, x, y, radius, color, alpha = 0.15) {
  for (let i = 3; i >= 0; i--) {
    gfx.fillStyle(color, alpha * (1 - i * 0.2));
    gfx.fillCircle(x, y, radius + i * 6);
  }
}

// ── Back Button ──────────────────────────────────────────────
export function createBackButton(scene) {
  const bg = scene.add.rectangle(56, 22, 80, 28, 0x000000, 0.5)
    .setStrokeStyle(1, 0x333355).setDepth(100);
  const btn = scene.add.text(56, 22, '◄ BACK', {
    fontFamily: 'Orbitron, monospace', fontSize: '12px', color: '#636e72',
  }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });
  btn.on('pointerover', () => { btn.setColor('#ffffff'); bg.setStrokeStyle(1, COLORS.primary); });
  btn.on('pointerout', () => { btn.setColor('#636e72'); bg.setStrokeStyle(1, 0x333355); });
  btn.on('pointerdown', () => {
    scene.cameras.main.fadeOut(200, 0, 0, 0);
    scene.time.delayedCall(200, () => scene.scene.start('HubScene'));
  });
  return btn;
}

// ── Score HUD ────────────────────────────────────────────────
export function createScoreDisplay(scene, x = 650, y = 16) {
  return scene.add.text(x, y, 'Score: 0', {
    fontFamily: 'Orbitron, monospace', fontSize: '18px',
    color: '#feca57', stroke: '#000', strokeThickness: 2,
  }).setDepth(100);
}

// ── Game Over Overlay ────────────────────────────────────────
export function showGameOver(scene, score, gameKey) {
  const isNew = setHighScore(gameKey, score);
  const high = getHighScore(gameKey);

  // Cinematic fade
  const overlay = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0).setDepth(200);
  scene.tweens.add({ targets: overlay, fillAlpha: 0.8, duration: 400 });

  // Animated title
  const title = scene.add.text(400, -50, 'GAME OVER', {
    fontFamily: 'Orbitron, monospace', fontSize: '48px', color: '#ff6b6b',
    stroke: '#000', strokeThickness: 6,
  }).setOrigin(0.5).setDepth(210);
  scene.tweens.add({ targets: title, y: 160, duration: 600, ease: 'Back.easeOut', delay: 200 });

  // Score counter animation
  const scoreObj = { val: 0 };
  const scoreTxt = scene.add.text(400, 230, 'Score: 0', {
    fontFamily: 'Orbitron, monospace', fontSize: '32px', color: '#feca57',
    stroke: '#000', strokeThickness: 4,
  }).setOrigin(0.5).setDepth(210).setAlpha(0);
  scene.tweens.add({
    targets: scoreTxt, alpha: 1, duration: 300, delay: 600,
    onStart: () => {
      scene.tweens.add({
        targets: scoreObj, val: score, duration: 800, delay: 0,
        onUpdate: () => scoreTxt.setText(`Score: ${Math.floor(scoreObj.val)}`),
      });
    }
  });

  // High score badge
  scene.time.delayedCall(1200, () => {
    if (isNew) {
      const badge = scene.add.text(400, 280, '★ NEW HIGH SCORE ★', {
        fontFamily: 'Orbitron, monospace', fontSize: '16px', color: '#55efc4',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(210).setScale(0);
      scene.tweens.add({ targets: badge, scale: 1, duration: 400, ease: 'Back.easeOut' });
      // Celebration particles
      for (let i = 0; i < 20; i++) {
        scene.time.delayedCall(i * 30, () => {
          burstParticles(scene, Phaser.Math.Between(200, 600), Phaser.Math.Between(150, 300),
            [COLORS.warning, COLORS.neon, COLORS.neonPink, COLORS.accentLight][i % 4], 4, 30);
        });
      }
    } else {
      scene.add.text(400, 280, `Best: ${high}`, {
        fontFamily: 'Inter, Arial, sans-serif', fontSize: '16px', color: '#636e72',
      }).setOrigin(0.5).setDepth(210);
    }
  });

  // Buttons (slide in)
  scene.time.delayedCall(1000, () => {
    const retryBg = scene.add.rectangle(-200, 360, 220, 52, COLORS.primary)
      .setDepth(210).setInteractive({ useHandCursor: true });
    scene.add.text(-200, 360, '↻ PLAY AGAIN', {
      fontFamily: 'Orbitron, monospace', fontSize: '15px', color: '#fff',
    }).setOrigin(0.5).setDepth(211).setName('retryTxt');
    scene.tweens.add({ targets: [retryBg, scene.children.getByName('retryTxt')], x: 400, duration: 500, ease: 'Back.easeOut' });

    retryBg.on('pointerover', () => retryBg.setFillStyle(COLORS.primaryLight));
    retryBg.on('pointerout', () => retryBg.setFillStyle(COLORS.primary));
    retryBg.on('pointerdown', () => scene.scene.restart());

    const hubBg = scene.add.rectangle(-200, 420, 220, 42, 0x2d3436)
      .setDepth(210).setInteractive({ useHandCursor: true });
    scene.add.text(-200, 420, '◄ GAME HUB', {
      fontFamily: 'Inter, Arial, sans-serif', fontSize: '14px', color: '#b2bec3',
    }).setOrigin(0.5).setDepth(211).setName('hubTxt');
    scene.tweens.add({ targets: [hubBg, scene.children.getByName('hubTxt')], x: 400, duration: 500, ease: 'Back.easeOut', delay: 100 });

    hubBg.on('pointerover', () => hubBg.setFillStyle(0x636e72));
    hubBg.on('pointerout', () => hubBg.setFillStyle(0x2d3436));
    hubBg.on('pointerdown', () => scene.scene.start('HubScene'));

    // Keyboard shortcuts
    scene.input.keyboard.on('keydown-SPACE', () => scene.scene.restart());
    scene.input.keyboard.on('keydown-ESC', () => scene.scene.start('HubScene'));
  });
}
