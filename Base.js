// Fortified Base / Headquarters with automated defense turret, waving flag & damage states
export class Base {
  constructor(team, x, groundY, maxHp = 1200, turretLevel = 0) {
    this.team = team; // 'player' or 'enemy'
    this.x = x;
    this.groundY = groundY;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.turretLevel = turretLevel; // 0 to 5
    this.facing = team === 'player' ? 1 : -1;

    // Turret combat state
    this.turretRange = 400 + turretLevel * 40;
    this.turretCooldown = Math.max(0.6, 1.6 - turretLevel * 0.18);
    this.currentCooldown = 0;
    this.turretAimAngle = team === 'player' ? 0 : Math.PI;
    this.turretTarget = null;
    this.muzzleFlash = 0;

    // Visuals
    this.flagWaveTimer = Math.random() * 10;
    this.radarAngle = 0;
    this.dead = false;
    this.collapseY = 0;
    this.destroyTimer = 0;
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.dead = true;
    }
  }

  repair(amount) {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  upgradeTurret(level) {
    this.turretLevel = level;
    this.turretRange = 400 + level * 40;
    this.turretCooldown = Math.max(0.6, 1.6 - level * 0.18);
  }

  update(dt, units, onSpawnProjectile, onSpawnParticle, audio) {
    this.flagWaveTimer += dt * 4;
    this.radarAngle += dt * 1.5;
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt;

    if (this.dead) {
      this.destroyTimer += dt;
      if (this.destroyTimer < 2.5 && onSpawnParticle && Math.random() < 0.4) {
        onSpawnParticle({
          x: this.x + (Math.random() - 0.5) * 80,
          y: this.groundY - 40 - Math.random() * 60,
          vx: (Math.random() - 0.5) * 160,
          vy: -80 - Math.random() * 100,
          color: Math.random() < 0.5 ? '#f97316' : '#ef4444',
          size: 6 + Math.random() * 8,
          life: 0.8
        });
      }
      return;
    }

    // Emit damage smoke when HP is low
    if (this.hp / this.maxHp < 0.5 && onSpawnParticle && Math.random() < 0.25) {
      onSpawnParticle({
        x: this.x + (Math.random() - 0.5) * 50,
        y: this.groundY - 60 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 20,
        vy: -40 - Math.random() * 30,
        color: this.hp / this.maxHp < 0.25 ? '#ef4444' : '#64748b',
        size: 5 + Math.random() * 6,
        life: 0.9
      });
    }

    // Automated Defense Turret firing logic
    if (this.turretLevel > 0) {
      if (this.currentCooldown > 0) this.currentCooldown -= dt;

      // Find closest enemy unit within turret range
      const opponentTeam = this.team === 'player' ? 'enemy' : 'player';
      let closestUnit = null;
      let minDist = this.turretRange;

      for (const u of units) {
        if (u.team === opponentTeam && !u.dead) {
          const d = Math.abs(u.x - this.x);
          const inFront = this.team === 'player' ? (u.x > this.x - 20) : (u.x < this.x + 20);
          if (inFront && d < minDist) {
            minDist = d;
            closestUnit = u;
          }
        }
      }

      this.turretTarget = closestUnit;

      if (closestUnit) {
        const turretY = this.groundY - 82;
        const targetAngle = Math.atan2((this.groundY - 30) - turretY, closestUnit.x - this.x);
        this.turretAimAngle = targetAngle;

        if (this.currentCooldown <= 0) {
          this.currentCooldown = this.turretCooldown;
          this.muzzleFlash = 0.1;
          if (audio) audio.shoot('turret');

          // Spawn turret projectile
          const barrelDist = 28;
          const spawnX = this.x + Math.cos(targetAngle) * barrelDist;
          const spawnY = turretY + Math.sin(targetAngle) * barrelDist;

          if (onSpawnProjectile) {
            onSpawnProjectile({
              type: 'bullet',
              x: spawnX,
              y: spawnY,
              targetX: closestUnit.x,
              targetY: this.groundY - 30,
              team: this.team,
              damage: 16 + this.turretLevel * 7,
              speed: 950,
              groundY: this.groundY
            });
          }
        }
      }
    }
  }

  draw(ctx, camera) {
    const sx = camera.worldToScreen(this.x);
    if (!camera.isVisible(this.x - 100, 200)) return;

    const sy = this.groundY + camera.shakeY;
    const isPlayer = this.team === 'player';
    const mainColor = isPlayer ? '#38bdf8' : '#ef4444';
    const darkColor = isPlayer ? '#1e293b' : '#331e1e';
    const concrete = '#475569';
    const concreteDark = '#334155';

    ctx.save();
    ctx.translate(sx, sy);

    // 1. Foundation & Sandbags
    ctx.fillStyle = '#b45309'; // sandbag sand
    for (let row = 0; row < 3; row++) {
      for (let col = -3; col <= 3; col++) {
        const sbx = col * 14 + (row % 2 ? 6 : 0);
        const sby = -row * 8 - 4;
        ctx.beginPath();
        ctx.roundRect(sbx - 7, sby - 3, 13, 7, 3);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 2. Main Reinforced Bunker Structure
    ctx.fillStyle = concrete;
    ctx.strokeStyle = concreteDark;
    ctx.lineWidth = 3;

    // Bunker base
    ctx.beginPath();
    ctx.moveTo(-55, -24);
    ctx.lineTo(55, -24);
    ctx.lineTo(45, -75);
    ctx.lineTo(-45, -75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bunker Upper Command Deck
    ctx.fillStyle = darkColor;
    ctx.fillRect(-35, -95, 70, 22);
    ctx.strokeRect(-35, -95, 70, 22);

    // Armored Viewport Slits / Lights
    ctx.fillStyle = mainColor;
    ctx.fillRect(-26, -90, 16, 7);
    ctx.fillRect(10, -90, 16, 7);

    // Faction Symbol / Stripe
    ctx.fillStyle = mainColor;
    ctx.fillRect(-45, -55, 90, 6);

    // 3. Communications Radar Dish
    const radarX = this.facing * -24;
    const radarY = -105;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(radarX, -95);
    ctx.lineTo(radarX, radarY);
    ctx.stroke();
    // Rotating dish
    ctx.save();
    ctx.translate(radarX, radarY);
    ctx.rotate(Math.sin(this.radarAngle) * 0.4);
    ctx.beginPath();
    ctx.arc(0, 0, 9, Math.PI, 0);
    ctx.stroke();
    ctx.restore();

    // 4. Waving Faction Flag
    const flagPoleX = this.facing * 30;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(flagPoleX, -95);
    ctx.lineTo(flagPoleX, -145);
    ctx.stroke();

    // Animated flag cloth
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(flagPoleX, -143);
    const wave = Math.sin(this.flagWaveTimer) * 5;
    const flagW = this.facing * 28;
    ctx.bezierCurveTo(
      flagPoleX + flagW * 0.5, -145 + wave,
      flagPoleX + flagW * 0.8, -140 - wave,
      flagPoleX + flagW, -142 + wave
    );
    ctx.lineTo(flagPoleX + flagW, -122 + wave);
    ctx.bezierCurveTo(
      flagPoleX + flagW * 0.8, -120 - wave,
      flagPoleX + flagW * 0.5, -125 + wave,
      flagPoleX, -123
    );
    ctx.closePath();
    ctx.fill();

    // 5. Automated Defense Turret (If unlocked/upgraded)
    if (this.turretLevel > 0) {
      const turretBaseY = -95;
      // Turret Swivel Base
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, turretBaseY, 12, Math.PI, 0);
      ctx.fill();
      ctx.stroke();

      // Rotating Barrel
      ctx.save();
      ctx.translate(0, turretBaseY - 3);
      ctx.rotate(this.turretAimAngle);

      // Gun Body
      ctx.fillStyle = mainColor;
      ctx.fillRect(-6, -6, 16, 12);
      ctx.strokeRect(-6, -6, 16, 12);

      // Twin Barrels
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(10, -5, 18, 3.5);
      ctx.fillRect(10, 1.5, 18, 3.5);

      // Muzzle Flash
      if (this.muzzleFlash > 0) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(32, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(32, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }
}
