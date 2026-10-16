// Parallax background, terrain, particles, floating damage numbers & minimap
export class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.particles = [];
    this.floatTexts = [];
    this.clouds = [];
    this.weatherParticles = [];
    this.lightningTimer = 0;
    this.isLightning = false;

    // Seed clouds
    for (let i = 0; i < 12; i++) {
      this.clouds.push({
        x: Math.random() * 5000,
        y: 40 + Math.random() * 120,
        width: 100 + Math.random() * 120,
        height: 35 + Math.random() * 25,
        speed: 8 + Math.random() * 14
      });
    }

    // Seed weather particles
    for (let i = 0; i < 90; i++) {
      this.weatherParticles.push({
        x: Math.random() * 4000,
        y: Math.random() * 800,
        vx: -60 - Math.random() * 80,
        vy: 300 + Math.random() * 300,
        length: 12 + Math.random() * 14
      });
    }
  }

  addParticle(p) {
    this.particles.push({
      x: p.x,
      y: p.y,
      vx: p.vx || (Math.random() - 0.5) * 50,
      vy: p.vy || (Math.random() - 0.5) * 50,
      color: p.color || '#f97316',
      size: p.size || 4,
      life: p.life || 0.6,
      maxLife: p.life || 0.6,
      gravity: p.gravity !== undefined ? p.gravity : 150
    });
  }

  addFloatText(x, y, text, color = '#f87171') {
    this.floatTexts.push({
      x,
      y,
      text,
      color,
      life: 0.85,
      maxLife: 0.85,
      vy: -45
    });
  }

  update(dt, theme) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Update floating text
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const ft = this.floatTexts[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatTexts.splice(i, 1);
        continue;
      }
      ft.y += ft.vy * dt;
    }

    // Update clouds
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > 5000) c.x = -200;
    }

    // Weather updates (rain / snow / storm)
    if (theme === 'storm' || theme === 'trench' || theme === 'snow') {
      const isSnow = theme === 'snow';
      for (const wp of this.weatherParticles) {
        wp.x += (isSnow ? Math.sin(wp.y * 0.05) * 20 : wp.vx) * dt;
        wp.y += (isSnow ? 90 : wp.vy) * dt;
        if (wp.y > 700) {
          wp.y = -20;
          wp.x = Math.random() * 4500;
        }
      }

      // Lightning in storm
      if (theme === 'storm') {
        this.lightningTimer -= dt;
        if (this.lightningTimer <= 0) {
          this.isLightning = Math.random() < 0.25;
          this.lightningTimer = this.isLightning ? 0.08 : 3 + Math.random() * 5;
        }
      }
    } else {
      this.isLightning = false;
    }
  }

  drawBackground(camera, theme, groundY) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    if (this.isLightning) {
      skyGrad.addColorStop(0, '#e2e8f0');
      skyGrad.addColorStop(1, '#94a3b8');
    } else if (theme === 'sunset' || theme === 'hills') {
      skyGrad.addColorStop(0, '#7c2d12');
      skyGrad.addColorStop(0.4, '#ea580c');
      skyGrad.addColorStop(1, '#fde047');
    } else if (theme === 'night' || theme === 'twilight' || theme === 'citadel') {
      skyGrad.addColorStop(0, '#090d16');
      skyGrad.addColorStop(0.6, '#1e1b4b');
      skyGrad.addColorStop(1, '#312e81');
    } else if (theme === 'storm' || theme === 'trench') {
      skyGrad.addColorStop(0, '#1e293b');
      skyGrad.addColorStop(0.6, '#334155');
      skyGrad.addColorStop(1, '#475569');
    } else if (theme === 'desert') {
      skyGrad.addColorStop(0, '#d97706');
      skyGrad.addColorStop(0.5, '#f59e0b');
      skyGrad.addColorStop(1, '#fef3c7');
    } else if (theme === 'snow') {
      skyGrad.addColorStop(0, '#334155');
      skyGrad.addColorStop(0.5, '#64748b');
      skyGrad.addColorStop(1, '#cbd5e1');
    } else if (theme === 'boss') {
      skyGrad.addColorStop(0, '#450a0a');
      skyGrad.addColorStop(0.5, '#7f1d1d');
      skyGrad.addColorStop(1, '#b91c1c');
    } else {
      // Default grass daylight
      skyGrad.addColorStop(0, '#38bdf8');
      skyGrad.addColorStop(0.6, '#7dd3fc');
      skyGrad.addColorStop(1, '#e0f2fe');
    }

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Sun / Moon / Distress Glow
    if (theme === 'night' || theme === 'twilight') {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(w * 0.75, 90, 32, 0, Math.PI * 2);
      ctx.fill();
    } else if (theme === 'sunset' || theme === 'hills') {
      ctx.fillStyle = '#ffedd5';
      ctx.beginPath();
      ctx.arc(w * 0.45, 140, 48, 0, Math.PI * 2);
      ctx.fill();
    } else if (theme === 'grass') {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(w * 0.2, 80, 36, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Parallax Layer 1: Distant Mountains (speed factor 0.08)
    const p1 = camera.x * 0.08;
    ctx.fillStyle = theme === 'snow' ? '#475569' :
                    theme === 'desert' ? '#92400e' :
                    theme === 'night' || theme === 'citadel' ? '#172554' :
                    theme === 'boss' ? '#290e0e' : '#475569';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = -200; x < w + 400; x += 180) {
      const peakX = x - (p1 % 180);
      const peakY = groundY - 140 - Math.sin((x + p1) * 0.008) * 80;
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(peakX + 90, groundY);
    }
    ctx.closePath();
    ctx.fill();

    // 3. Parallax Layer 2: Midground Hills & Trees (speed factor 0.22)
    const p2 = camera.x * 0.22;
    ctx.fillStyle = theme === 'snow' ? '#94a3b8' :
                    theme === 'desert' ? '#b45309' :
                    theme === 'night' ? '#1e1b4b' :
                    theme === 'boss' ? '#450a0a' :
                    theme === 'trench' ? '#334155' : '#15803d';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = -100; x < w + 300; x += 120) {
      const hillX = x - (p2 % 120);
      const hillY = groundY - 60 - Math.sin((x + p2) * 0.012) * 35;
      ctx.quadraticCurveTo(hillX, hillY, hillX + 60, groundY);
    }
    ctx.closePath();
    ctx.fill();

    // Silhouette Pine Trees or Bunkers on midground
    ctx.fillStyle = theme === 'snow' ? '#1e293b' :
                    theme === 'desert' ? '#78350f' :
                    theme === 'night' ? '#0f172a' : '#14532d';
    for (let tx = 0; tx < w + 200; tx += 95) {
      const treeX = tx - (p2 % 95);
      const treeBaseY = groundY - 15 - Math.sin((tx + p2) * 0.012) * 15;
      ctx.beginPath();
      ctx.moveTo(treeX - 10, treeBaseY);
      ctx.lineTo(treeX, treeBaseY - 24);
      ctx.lineTo(treeX + 10, treeBaseY);
      ctx.fill();
    }

    // 4. Clouds (in camera world space)
    ctx.fillStyle = theme === 'night' ? 'rgba(255, 255, 255, 0.08)' :
                    theme === 'storm' ? 'rgba(15, 23, 42, 0.45)' :
                    theme === 'boss' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.65)';
    for (const c of this.clouds) {
      const cloudScreenX = camera.worldToScreen(c.x);
      if (cloudScreenX > -200 && cloudScreenX < w + 200) {
        ctx.beginPath();
        ctx.ellipse(cloudScreenX, c.y, c.width / 2, c.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawTerrain(camera, theme, groundY, worldWidth) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const sy = groundY + camera.shakeY;

    // Surface colors by theme
    let surfaceColor = '#16a34a'; // lush grass
    let subsoilColor = '#78350f'; // brown earth
    let grassBladeColor = '#22c55e';

    if (theme === 'desert') {
      surfaceColor = '#f59e0b';
      subsoilColor = '#d97706';
      grassBladeColor = '#fbbf24';
    } else if (theme === 'snow') {
      surfaceColor = '#f1f5f9';
      subsoilColor = '#475569';
      grassBladeColor = '#e2e8f0';
    } else if (theme === 'trench') {
      surfaceColor = '#475569';
      subsoilColor = '#334155';
      grassBladeColor = '#64748b';
    } else if (theme === 'citadel' || theme === 'boss') {
      surfaceColor = '#27272a';
      subsoilColor = '#18181b';
      grassBladeColor = '#ef4444';
    }

    // 1. Underground Cross-section
    ctx.fillStyle = subsoilColor;
    ctx.fillRect(0, sy, w, h - sy);

    // Strata rock details in underground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let y = sy + 25; y < h; y += 30) {
      ctx.fillRect(0, y, w, 4);
    }

    // 2. Main Ground Surface Strip
    ctx.fillStyle = surfaceColor;
    ctx.fillRect(0, sy - 1, w, 14);

    // 3. Ground Details in World Coordinates (Grass blades, rocks, trenches, barricades)
    const startTile = Math.floor(camera.x / 40);
    const endTile = Math.ceil((camera.x + w) / 40) + 1;

    for (let i = startTile; i <= endTile; i++) {
      const worldX = i * 40;
      const screenX = camera.worldToScreen(worldX);

      // Procedural grass blades / tufts
      if (theme !== 'citadel' && theme !== 'boss') {
        ctx.strokeStyle = grassBladeColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(screenX, sy);
        ctx.lineTo(screenX + 3, sy - 7);
        ctx.moveTo(screenX + 4, sy);
        ctx.lineTo(screenX + 9, sy - 9);
        ctx.moveTo(screenX + 8, sy);
        ctx.lineTo(screenX + 11, sy - 6);
        ctx.stroke();
      }

      // Small rocks or debris every few tiles
      if (i % 7 === 0) {
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(screenX + 15, sy - 2, 7, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Barbed wire barricades in trench/fortress missions
      if ((theme === 'trench' || theme === 'fortress') && i % 18 === 0) {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(screenX, sy);
        ctx.lineTo(screenX + 10, sy - 18);
        ctx.lineTo(screenX + 20, sy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(screenX + 3, sy - 10);
        ctx.lineTo(screenX + 17, sy - 10);
        ctx.stroke();
      }
    }

    // Draw battlefield boundaries / border markers
    const startX = camera.worldToScreen(0);
    const endX = camera.worldToScreen(worldWidth);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    if (startX > -50) {
      ctx.fillRect(startX - 20, 0, 20, h);
    }
    if (endX < w + 50) {
      ctx.fillRect(endX, 0, 20, h);
    }
  }

  drawWeather(camera, theme) {
    const ctx = this.ctx;
    if (theme === 'storm' || theme === 'trench') {
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
      ctx.lineWidth = 1.5;
      for (const wp of this.weatherParticles) {
        const sx = camera.worldToScreen(wp.x);
        if (sx > -20 && sx < this.canvas.width + 20) {
          ctx.beginPath();
          ctx.moveTo(sx, wp.y);
          ctx.lineTo(sx - 4, wp.y + wp.length);
          ctx.stroke();
        }
      }
    } else if (theme === 'snow') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      for (const wp of this.weatherParticles) {
        const sx = camera.worldToScreen(wp.x);
        if (sx > -20 && sx < this.canvas.width + 20) {
          ctx.beginPath();
          ctx.arc(sx, wp.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawParticles(camera) {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const sx = camera.worldToScreen(p.x);
      const sy = p.y + camera.shakeY;
      const alpha = Math.max(0, p.life / p.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size * (0.5 + 0.5 * alpha), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawFloatTexts(camera) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';

    for (const ft of this.floatTexts) {
      const sx = camera.worldToScreen(ft.x);
      const sy = ft.y + camera.shakeY;
      const alpha = Math.max(0, ft.life / ft.maxLife);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#0f172a';
      ctx.fillText(ft.text, sx + 1, sy + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, sx, sy);
    }
    ctx.restore();
  }

  // Draw interactive top/bottom Radar Minimap
  drawMinimap(camera, worldWidth, units, playerBase, enemyBase, minimapRect) {
    const ctx = this.ctx;
    const { x, y, width, height } = minimapRect;

    ctx.save();
    // Radar Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 6);
    ctx.fill();
    ctx.stroke();

    // Radar scan grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + height / 2);
    ctx.lineTo(x + width, y + height / 2);
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width / 2, y + height);
    ctx.stroke();

    // Player HQ Blip
    const pHqX = x + (playerBase.x / worldWidth) * width;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(pHqX - 4, y + 4, 8, height - 8);

    // Enemy HQ Blip
    const eHqX = x + (enemyBase.x / worldWidth) * width;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(eHqX - 4, y + 4, 8, height - 8);

    // Unit Blips
    for (const u of units) {
      if (u.dead) continue;
      const ux = x + (u.x / worldWidth) * width;
      const uy = y + height / 2 + (u.team === 'player' ? -2 : 2);
      ctx.fillStyle = u.team === 'player' ? '#38bdf8' : '#ef4444';
      ctx.beginPath();
      ctx.arc(ux, uy, u.typeKey === 'boss_colossus' ? 4.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Camera Viewport Box on radar
    const camLeft = x + (camera.x / worldWidth) * width;
    const camWidth = (camera.viewportWidth / worldWidth) * width;
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(camLeft, y + 1, camWidth, height - 2);

    ctx.restore();
  }
}
