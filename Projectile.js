// Projectiles: Bullets, Arcing Arrows, Rockets, Artillery Bombs
export class Projectile {
  constructor(options) {
    this.type = options.type || 'bullet';
    this.x = options.x;
    this.y = options.y;
    this.targetX = options.targetX;
    this.targetY = options.targetY;
    this.team = options.team; // 'player' or 'enemy'
    this.damage = options.damage || 20;
    this.splashRadius = options.splashRadius || 0;
    this.speed = options.speed || 800;
    this.groundY = options.groundY || 500;
    this.dead = false;
    this.life = 0;
    this.maxLife = options.maxLife || 4.0;
    this.trail = [];

    // Calculate initial velocity based on projectile type
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (this.type === 'arrow') {
      // Ballistic arcing arrow calculation
      this.gravity = 550;
      // Approximate flight time based on distance
      const flightTime = Math.max(0.45, Math.min(1.2, dist / 420));
      this.vx = dx / flightTime;
      // Vy formula with gravity: dy = vy*t + 0.5*g*t^2 => vy = (dy - 0.5*g*t^2)/t
      this.vy = (dy - 0.5 * this.gravity * flightTime * flightTime) / flightTime;
      this.rotation = Math.atan2(this.vy, this.vx);
    } else if (this.type === 'airstrike_bomb') {
      this.gravity = 700;
      this.vx = (Math.random() - 0.5) * 40;
      this.vy = 400;
      this.splashRadius = 120;
      this.damage = options.damage || 220;
      this.rotation = Math.PI / 2;
    } else if (this.type === 'rocket') {
      this.gravity = 60;
      const angle = Math.atan2(dy, dx);
      this.vx = Math.cos(angle) * (this.speed || 500);
      this.vy = Math.sin(angle) * (this.speed || 500);
      this.splashRadius = 80;
      this.rotation = angle;
    } else if (this.type === 'buckshot') {
      // Spread angle for shotgun
      const baseAngle = Math.atan2(dy, dx);
      const spread = (Math.random() - 0.5) * 0.28;
      const angle = baseAngle + spread;
      const spd = (this.speed || 750) * (0.85 + Math.random() * 0.3);
      this.vx = Math.cos(angle) * spd;
      this.vy = Math.sin(angle) * spd;
      this.gravity = 0;
      this.rotation = angle;
      this.maxLife = 0.45;
    } else {
      // Direct bullet or sniper round
      const angle = Math.atan2(dy, dx);
      this.vx = Math.cos(angle) * (this.speed || 900);
      this.vy = Math.sin(angle) * (this.speed || 900);
      this.gravity = 0;
      this.rotation = angle;
      this.maxLife = 1.0;
    }
  }

  update(dt, groundY) {
    if (this.dead) return;
    this.life += dt;
    if (this.life > this.maxLife) {
      this.dead = true;
      return;
    }

    // Save trail point
    if (this.type === 'rocket' || this.type === 'airstrike_bomb' || this.type === 'sniper_round') {
      this.trail.push({ x: this.x, y: this.y, alpha: 1.0 });
      if (this.trail.length > 8) this.trail.shift();
      for (const p of this.trail) {
        p.alpha -= dt * 3;
      }
    }

    // Apply physics
    if (this.gravity > 0) {
      this.vy += this.gravity * dt;
      this.rotation = Math.atan2(this.vy, this.vx);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Hit ground
    if (this.y >= groundY) {
      this.y = groundY;
      this.dead = true;
      this.hitGround = true;
    }
  }

  draw(ctx, camera) {
    if (this.dead) return;
    const sx = camera.worldToScreen(this.x);
    const sy = this.y + camera.shakeY;

    ctx.save();

    // Draw trails
    if (this.trail.length > 1) {
      ctx.lineWidth = this.type === 'sniper_round' ? 2 : 4;
      ctx.strokeStyle = this.type === 'rocket' ? 'rgba(255, 160, 40, 0.6)' :
                        this.type === 'sniper_round' ? 'rgba(230, 200, 255, 0.7)' :
                        'rgba(180, 180, 180, 0.4)';
      ctx.beginPath();
      const first = this.trail[0];
      ctx.moveTo(camera.worldToScreen(first.x), first.y + camera.shakeY);
      for (let i = 1; i < this.trail.length; i++) {
        const pt = this.trail[i];
        ctx.lineTo(camera.worldToScreen(pt.x), pt.y + camera.shakeY);
      }
      ctx.stroke();
    }

    ctx.translate(sx, sy);
    ctx.rotate(this.rotation);

    if (this.type === 'arrow') {
      // Stylized wooden arrow with fletching
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();

      // Arrow tip
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(2, -3);
      ctx.lineTo(2, 3);
      ctx.closePath();
      ctx.fill();

      // Fletchings
      ctx.strokeStyle = this.team === 'player' ? '#38bdf8' : '#ef4444';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-19, -3.5);
      ctx.moveTo(-16, 0);
      ctx.lineTo(-19, 3.5);
      ctx.stroke();

    } else if (this.type === 'rocket') {
      // Military rocket body
      ctx.fillStyle = '#475569';
      ctx.fillRect(-12, -3, 16, 6);

      // Warhead tip
      ctx.fillStyle = this.team === 'player' ? '#38bdf8' : '#dc2626';
      ctx.beginPath();
      ctx.moveTo(4, -3);
      ctx.lineTo(9, 0);
      ctx.lineTo(4, 3);
      ctx.closePath();
      ctx.fill();

      // Exhaust flame
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-12, -2);
      ctx.lineTo(-18 - Math.random() * 8, 0);
      ctx.lineTo(-12, 2);
      ctx.closePath();
      ctx.fill();

    } else if (this.type === 'airstrike_bomb') {
      // Big aerial artillery shell
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-8, -4, 4, 8);

    } else if (this.type === 'sniper_round') {
      // Glowing tracer
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();

      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(8, 0, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'heavy_bullet') {
      // Heavy tracer
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(4, 0);
      ctx.stroke();

    } else {
      // Standard rifle / buckshot tracer
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(3, 0);
      ctx.stroke();
    }

    ctx.restore();
  }
}
