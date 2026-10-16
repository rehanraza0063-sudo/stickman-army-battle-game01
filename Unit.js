// Procedural Stickman Unit with dynamic skeletal animation, weapons, combat & ragdoll
import { UNIT_TYPES } from '../data/units.js';

let unitIdCounter = 1;

export class Unit {
  constructor(typeKey, team, startX, groundY, modifiers = {}) {
    this.id = unitIdCounter++;
    this.typeKey = typeKey;
    this.type = UNIT_TYPES[typeKey] || UNIT_TYPES.swordsman;
    this.team = team; // 'player' or 'enemy'
    this.x = startX;
    this.groundY = groundY;
    this.scale = this.type.scale || 1.0;

    // Modifiers from player armory or AI difficulty
    const hpMult = modifiers.hpMult || 1.0;
    const dmgMult = modifiers.dmgMult || 1.0;
    const armorBonus = modifiers.armorBonus || 0;
    const speedMult = modifiers.speedMult || 1.0;
    const cdMult = modifiers.cooldownMult || 1.0;

    this.maxHp = Math.round(this.type.maxHp * hpMult);
    this.hp = this.maxHp;
    this.baseDamage = Math.round(this.type.damage * dmgMult);
    this.damage = this.baseDamage;
    this.armor = this.type.armor + armorBonus;
    this.speed = this.type.speed * speedMult;
    this.range = this.type.range;
    this.attackCooldown = this.type.attackSpeed * cdMult;
    this.currentCooldown = Math.random() * 0.4; // slight stagger
    this.isHealer = this.type.role === 'healer';

    // State
    this.state = 'walk'; // 'walk', 'idle', 'attack', 'dead'
    this.target = null;
    this.walkCycle = Math.random() * Math.PI * 2;
    this.attackAnimTimer = 0;
    this.isAttacking = false;
    this.burstRemaining = 0;
    this.burstTimer = 0;

    // Visuals & Effects
    this.facing = this.team === 'player' ? 1 : -1;
    this.aimAngle = 0;
    this.hitFlash = 0;
    this.knockbackX = 0;
    this.muzzleFlashTimer = 0;
    this.healBeamTimer = 0;
    this.healTarget = null;
    this.dead = false;
    this.deathTimer = 0;
    this.deathMaxTimer = 2.4;
    this.deathAngle = 0;
    this.deathVy = 0;
    this.deathVx = 0;
    this.deathYOffset = 0;

    // Commander buffs
    this.rallyBuffTimer = 0;
  }

  takeDamage(amount, isTrueDamage = false) {
    if (this.dead) return 0;
    const effectiveArmor = isTrueDamage ? 0 : this.armor;
    const actualDamage = Math.max(2, Math.round(amount - effectiveArmor));
    this.hp -= actualDamage;
    this.hitFlash = 0.15;
    this.knockbackX = -this.facing * (this.scale > 1.5 ? 2 : 5);

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
    return actualDamage;
  }

  heal(amount) {
    if (this.dead || this.hp >= this.maxHp) return 0;
    const healed = Math.min(this.maxHp - this.hp, amount);
    this.hp += healed;
    return healed;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.state = 'dead';
    this.deathVx = -this.facing * (40 + Math.random() * 60);
    this.deathVy = -(80 + Math.random() * 90);
    this.deathAngle = 0;
  }

  applyRally(duration = 10) {
    this.rallyBuffTimer = duration;
  }

  update(dt, units, bases, projectiles, onSpawnProjectile, onSpawnParticle, onSpawnFloatText, audio) {
    // Flash & timer decays
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.muzzleFlashTimer > 0) this.muzzleFlashTimer -= dt;
    if (this.healBeamTimer > 0) this.healBeamTimer -= dt;
    if (this.currentCooldown > 0) this.currentCooldown -= dt;

    // Rally buff speed/attack rate modifier
    let currentSpeed = this.speed;
    let attackRateMult = 1.0;
    if (this.rallyBuffTimer > 0) {
      this.rallyBuffTimer -= dt;
      currentSpeed *= 1.4;
      attackRateMult = 1.5;
    }

    // Handle Dead / Ragdoll
    if (this.dead) {
      this.deathTimer += dt;
      this.x += this.deathVx * dt;
      this.deathVy += 500 * dt;
      this.deathYOffset += this.deathVy * dt;
      if (this.deathYOffset > 0) {
        this.deathYOffset = 0;
        this.deathVx *= 0.5;
      }
      this.deathAngle += (this.facing * -Math.PI * 0.9) * dt;
      if (this.deathAngle < -Math.PI / 2) this.deathAngle = -Math.PI / 2;
      return;
    }

    // Apply knockback decay
    this.x += this.knockbackX;
    this.knockbackX *= 0.7;

    // 1. Target finding & Behavior
    const opponentTeam = this.team === 'player' ? 'enemy' : 'player';
    const opponentBase = bases[opponentTeam];

    if (this.isHealer) {
      // Healer seeks injured allies
      let lowestHpRatio = 0.95;
      let targetAlly = null;
      for (const u of units) {
        if (u.team === this.team && !u.dead && u !== this) {
          const ratio = u.hp / u.maxHp;
          if (ratio < lowestHpRatio) {
            const dist = Math.abs(u.x - this.x);
            if (dist < 450) {
              lowestHpRatio = ratio;
              targetAlly = u;
            }
          }
        }
      }
      this.healTarget = targetAlly;
      if (targetAlly) {
        const dist = Math.abs(targetAlly.x - this.x);
        if (dist <= this.range) {
          this.state = 'attack';
          this.aimAngle = Math.atan2(0, (targetAlly.x - this.x));
          if (this.currentCooldown <= 0) {
            this.currentCooldown = this.attackCooldown / attackRateMult;
            const healed = targetAlly.heal(Math.abs(this.damage));
            this.healBeamTimer = 0.3;
            if (onSpawnFloatText && healed > 0) {
              onSpawnFloatText(targetAlly.x, this.groundY - 60, `+${healed}`, '#4ade80');
            }
            if (audio) audio.heal();
            if (onSpawnParticle) {
              for (let i = 0; i < 4; i++) {
                onSpawnParticle({
                  x: targetAlly.x + (Math.random() - 0.5) * 20,
                  y: this.groundY - 30 - Math.random() * 30,
                  vx: (Math.random() - 0.5) * 30,
                  vy: -40 - Math.random() * 40,
                  color: '#4ade80',
                  size: 3,
                  life: 0.6
                });
              }
            }
          }
        } else {
          this.state = 'walk';
          const dir = targetAlly.x > this.x ? 1 : -1;
          this.x += dir * currentSpeed * dt;
          this.walkCycle += dt * 9;
        }
        return;
      }
    }

    // Find closest opponent soldier or base
    let closestTarget = null;
    let minDistance = Infinity;

    for (const u of units) {
      if (u.team === opponentTeam && !u.dead) {
        const d = (this.team === 'player' ? (u.x - this.x) : (this.x - u.x));
        if (d > -40 && d < minDistance) {
          minDistance = d;
          closestTarget = u;
        }
      }
    }

    // Check base distance
    const distToBase = this.team === 'player' ? (opponentBase.x - this.x) : (this.x - opponentBase.x);
    let targetIsBase = false;

    if (!closestTarget || distToBase < minDistance) {
      if (distToBase >= 0 && distToBase < minDistance) {
        minDistance = distToBase;
        targetIsBase = true;
      }
    }

    // 2. Burst fire handling (Machine gunner, Captain, Boss)
    if (this.burstRemaining > 0) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this.burstTimer = this.type.burstInterval || 0.08;
        this.burstRemaining--;
        this.fireProjectile(closestTarget, opponentBase, targetIsBase, onSpawnProjectile, audio);
      }
    }

    // 3. Movement and Combat Decisions
    const effectiveRange = targetIsBase ? this.range + 40 : this.range;

    if (minDistance <= effectiveRange) {
      // In combat range: stop and attack
      this.state = 'attack';
      const targetObj = targetIsBase ? opponentBase : closestTarget;
      if (targetObj) {
        const tx = targetIsBase ? opponentBase.x : targetObj.x;
        const ty = targetIsBase ? this.groundY - 40 : this.groundY - 30;
        this.aimAngle = Math.atan2(ty - (this.groundY - 30), tx - this.x);
      }

      if (this.currentCooldown <= 0 && this.burstRemaining === 0) {
        this.currentCooldown = this.attackCooldown / attackRateMult;
        this.attackAnimTimer = 0.25;

        if (this.type.burstCount && this.type.burstCount > 1) {
          this.burstRemaining = this.type.burstCount;
          this.burstTimer = 0;
        } else if (this.type.role === 'melee') {
          // Melee attack
          if (audio) audio.slash();
          if (targetIsBase) {
            opponentBase.takeDamage(this.damage);
            if (onSpawnFloatText) onSpawnFloatText(opponentBase.x, this.groundY - 60, `-${this.damage}`, '#f87171');
          } else if (closestTarget) {
            const dealt = closestTarget.takeDamage(this.damage);
            if (onSpawnFloatText) onSpawnFloatText(closestTarget.x, this.groundY - 50, `-${dealt}`, '#ef4444');
            if (onSpawnParticle) {
              for (let i = 0; i < 5; i++) {
                onSpawnParticle({
                  x: closestTarget.x,
                  y: this.groundY - 30,
                  vx: (Math.random() - 0.5) * 120,
                  vy: -50 - Math.random() * 80,
                  color: '#dc2626',
                  size: 3,
                  life: 0.5
                });
              }
            }
          }
        } else {
          // Single projectile shot
          this.fireProjectile(closestTarget, opponentBase, targetIsBase, onSpawnProjectile, audio);
        }
      }
    } else {
      // Advance towards enemy base / frontline
      this.state = 'walk';
      this.x += this.facing * currentSpeed * dt;
      this.walkCycle += dt * (8 * (currentSpeed / 80));
    }

    // Soft separation between friendly units (prevent stacking)
    for (const u of units) {
      if (u !== this && u.team === this.team && !u.dead) {
        const diff = this.x - u.x;
        const minDist = 18 * this.scale;
        if (Math.abs(diff) < minDist) {
          const push = (minDist - Math.abs(diff)) * 0.5;
          if (diff >= 0) this.x += push * dt * 5;
          else this.x -= push * dt * 5;
        }
      }
    }
  }

  fireProjectile(target, opponentBase, isBase, onSpawnProjectile, audio) {
    this.muzzleFlashTimer = 0.08;
    if (audio) audio.shoot(this.type.projectile || 'bullet');

    const spawnX = this.x + this.facing * (18 * this.scale);
    const spawnY = this.groundY - (30 * this.scale);

    let targetX = isBase ? opponentBase.x : (target ? target.x : spawnX + this.facing * this.range);
    let targetY = isBase ? this.groundY - 40 : (target ? this.groundY - 28 : spawnY);

    if (this.type.projectile === 'buckshot') {
      // Shotgun: spawn 4 pellets
      for (let i = 0; i < 4; i++) {
        if (onSpawnProjectile) {
          onSpawnProjectile({
            type: 'buckshot',
            x: spawnX,
            y: spawnY,
            targetX: targetX,
            targetY: targetY,
            team: this.team,
            damage: Math.round(this.damage / 3),
            groundY: this.groundY
          });
        }
      }
    } else {
      if (onSpawnProjectile) {
        onSpawnProjectile({
          type: this.type.projectile || 'bullet',
          x: spawnX,
          y: spawnY,
          targetX: targetX,
          targetY: targetY,
          team: this.team,
          damage: this.damage,
          groundY: this.groundY,
          splashRadius: this.type.id === 'boss_colossus' ? 60 : 0
        });
      }
    }
  }

  draw(ctx, camera) {
    const sx = camera.worldToScreen(this.x);
    if (!camera.isVisible(this.x, 80 * this.scale)) return;

    const sy = this.groundY + this.deathYOffset + camera.shakeY;
    const isPlayer = this.team === 'player';
    const mainColor = isPlayer ? '#38bdf8' : '#ef4444';
    const secondaryColor = isPlayer ? '#1e3a8a' : '#7f1d1d';
    const skinColor = '#0f172a'; // classic dark stickman body
    const s = this.scale;

    ctx.save();
    ctx.translate(sx, sy);

    if (this.dead) {
      const alpha = Math.max(0, 1 - (this.deathTimer / this.deathMaxTimer));
      ctx.globalAlpha = alpha;
      ctx.rotate(this.deathAngle);
    }

    if (this.hitFlash > 0) {
      ctx.filter = 'brightness(2.0) saturate(0.2)';
    }

    // Shadow on ground
    if (!this.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Walking / leg motion
    const walkSwing = this.state === 'walk' ? Math.sin(this.walkCycle) * 0.45 : 0;
    const hipY = -26 * s;
    const torsoTopY = -48 * s;
    const headY = -56 * s;
    const headRadius = 7.5 * s;

    // Colossus Boss has specialized mech appearance
    if (this.typeKey === 'boss_colossus') {
      this.drawBossColossus(ctx, s, mainColor, secondaryColor);
      ctx.restore();
      this.drawHealthBar(ctx, sx, sy - 90 * s, isPlayer);
      return;
    }

    // 1. LEGS (Back leg & Front leg)
    ctx.lineWidth = 3.2 * s;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = skinColor;

    // Back leg
    const backLegAngle = -walkSwing;
    const backKneeX = Math.sin(backLegAngle) * (14 * s);
    const backKneeY = hipY + Math.cos(backLegAngle) * (14 * s);
    const backFootX = backKneeX + Math.sin(backLegAngle * 0.8) * (13 * s);
    const backFootY = 0;
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(backKneeX, backKneeY);
    ctx.lineTo(backFootX, Math.min(0, backFootY));
    ctx.stroke();

    // Front leg
    const frontLegAngle = walkSwing;
    const frontKneeX = Math.sin(frontLegAngle) * (14 * s);
    const frontKneeY = hipY + Math.cos(frontLegAngle) * (14 * s);
    const frontFootX = frontKneeX + Math.sin(frontLegAngle * 0.8) * (13 * s);
    const frontFootY = 0;
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(frontKneeX, frontKneeY);
    ctx.lineTo(frontFootX, Math.min(0, frontFootY));
    ctx.stroke();

    // 2. TORSO
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(0, torsoTopY);
    ctx.stroke();

    // Tactical vest / armor plate
    if (this.type.armor > 0 || this.type.role === 'tank') {
      ctx.fillStyle = mainColor;
      ctx.fillRect(-4.5 * s, torsoTopY + 4 * s, 9 * s, 14 * s);
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 1.2 * s;
      ctx.strokeRect(-4.5 * s, torsoTopY + 4 * s, 9 * s, 14 * s);
    }

    // 3. HEAD & HELMET / GEAR
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Helmet / Cap
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(0, headY - 1 * s, headRadius + 1 * s, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    // Helmet brim
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(-headRadius - 2 * s, headY - 1 * s);
    ctx.lineTo(this.facing * (headRadius + 4 * s), headY - 1 * s);
    ctx.stroke();

    // Eyes / Goggles
    ctx.fillStyle = isPlayer ? '#67e8f9' : '#f87171';
    const eyeOffset = this.facing * 3 * s;
    ctx.fillRect(eyeOffset, headY - 2 * s, 3.5 * s, 2.5 * s);

    // Medic White Helmet & Red Cross
    if (this.typeKey === 'medic') {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, headY - 2 * s, headRadius + 1 * s, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();
      // Red Cross on helmet
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-1.2 * s, headY - 8 * s, 2.4 * s, 6 * s);
      ctx.fillRect(-3.5 * s, headY - 6.2 * s, 7 * s, 2.4 * s);
      // Medical pack on back
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(-this.facing * 10 * s, torsoTopY + 4 * s, 6 * s, 12 * s);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-this.facing * 9 * s, torsoTopY + 8 * s, 4 * s, 4 * s);
    }

    // 4. ARMS & WEAPONS
    const shoulderX = 0;
    const shoulderY = torsoTopY + 4 * s;

    this.drawWeaponsAndArms(ctx, s, shoulderX, shoulderY, mainColor, secondaryColor, isPlayer);

    // Muzzle Flash
    if (this.muzzleFlashTimer > 0) {
      const flashDist = 28 * s;
      const flashAngle = this.aimAngle || (this.facing > 0 ? 0 : Math.PI);
      const fx = Math.cos(flashAngle) * flashDist;
      const fy = shoulderY + Math.sin(flashAngle) * flashDist;

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(fx, fy, (6 + Math.random() * 4) * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(fx, fy, 3 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rally Buff Aura
    if (this.rallyBuffTimer > 0) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.ellipse(0, -25 * s, 16 * s, 28 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // Floating Health Bar
    if (!this.dead) {
      this.drawHealthBar(ctx, sx, sy - 66 * s, isPlayer);
    }
  }

  drawWeaponsAndArms(ctx, s, sx, sy, mainColor, secondaryColor, isPlayer) {
    const skinColor = '#0f172a';
    ctx.lineWidth = 2.8 * s;
    ctx.strokeStyle = skinColor;

    if (this.typeKey === 'swordsman') {
      // Shield on back/offhand
      ctx.fillStyle = mainColor;
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.ellipse(-this.facing * 4 * s, sy + 4 * s, 6 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sword Arm
      const swing = this.state === 'attack' ? -Math.PI / 4 : Math.PI / 6;
      const handX = this.facing * 14 * s;
      const handY = sy + 6 * s;

      ctx.strokeStyle = skinColor;
      ctx.lineWidth = 2.8 * s;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      // Blade
      ctx.save();
      ctx.translate(handX, handY);
      ctx.rotate(this.facing * (swing + 0.3));
      // Hilt
      ctx.fillStyle = '#475569';
      ctx.fillRect(-2 * s, -2 * s, 4 * s, 4 * s);
      // Steel Blade
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(-2 * s, -2 * s);
      ctx.lineTo(2 * s, -2 * s);
      ctx.lineTo(1 * s, -22 * s);
      ctx.lineTo(0, -26 * s);
      ctx.lineTo(-1 * s, -22 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

    } else if (this.typeKey === 'heavy') {
      // Massive Riot Shield in front
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 2.5 * s;
      const shieldX = this.facing * 12 * s;
      ctx.fillRect(shieldX - 4 * s, sy - 14 * s, 8 * s, 34 * s);
      ctx.strokeRect(shieldX - 4 * s, sy - 14 * s, 8 * s, 34 * s);
      // Shield viewport
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(shieldX - 2 * s, sy - 8 * s, 4 * s, 5 * s);

      // Shotgun barrel poking out
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(shieldX + this.facing * 2 * s, sy + 4 * s, this.facing * 14 * s, 5 * s);

    } else if (this.typeKey === 'archer') {
      // Wooden Bow
      const handX = this.facing * 12 * s;
      const handY = sy + 2 * s;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      // Bow Arc
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.arc(handX + this.facing * 4 * s, handY, 14 * s, -Math.PI / 2, Math.PI / 2, this.facing < 0);
      ctx.stroke();

      // Bow String
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(handX + this.facing * 4 * s, handY - 14 * s);
      ctx.lineTo(handX - this.facing * 4 * s, handY);
      ctx.lineTo(handX + this.facing * 4 * s, handY + 14 * s);
      ctx.stroke();

    } else if (this.typeKey === 'sniper') {
      // Long Rifle with Laser Sight
      const handX = this.facing * 16 * s;
      const handY = sy + 1 * s;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      // Long sniper rifle
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(handX - 4 * s, handY - 2 * s, this.facing * 28 * s, 4 * s);
      // Scope
      ctx.fillStyle = '#475569';
      ctx.fillRect(handX + this.facing * 2 * s, handY - 5 * s, this.facing * 10 * s, 3 * s);

      // Laser Sight beam in aiming state
      if (this.state === 'attack') {
        ctx.strokeStyle = isPlayer ? 'rgba(56, 189, 248, 0.45)' : 'rgba(239, 68, 68, 0.45)';
        ctx.lineWidth = 1.2 * s;
        ctx.beginPath();
        ctx.moveTo(handX + this.facing * 28 * s, handY);
        ctx.lineTo(handX + this.facing * 350 * s, handY);
        ctx.stroke();
      }

    } else if (this.typeKey === 'machine_gunner') {
      // Heavy Gatling / M249 gun
      const handX = this.facing * 14 * s;
      const handY = sy + 4 * s;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      // Machine gun body
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(handX - 4 * s, handY - 3 * s, this.facing * 20 * s, 6 * s);
      // Ammo Drum
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(handX + this.facing * 4 * s, handY + 6 * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.typeKey === 'captain') {
      // Dual SMGs
      const handX = this.facing * 12 * s;
      const handY = sy + 2 * s;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(handX, handY - 4 * s, this.facing * 12 * s, 4 * s);
      ctx.fillRect(handX - 4 * s, handY + 2 * s, this.facing * 10 * s, 4 * s);

    } else {
      // Standard Rifleman
      const handX = this.facing * 13 * s;
      const handY = sy + 3 * s;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      // Rifle
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(handX - 4 * s, handY - 2 * s, this.facing * 18 * s, 4 * s);
      // Stock
      ctx.fillStyle = '#78350f';
      ctx.fillRect(handX - this.facing * 6 * s, handY - 1 * s, this.facing * 6 * s, 3 * s);
    }
  }

  drawBossColossus(ctx, s, mainColor, secondaryColor) {
    // Massive Walker / Mech Titan
    const walkSwing = Math.sin(this.walkCycle) * 0.3;

    // Heavy Mech Legs
    ctx.lineWidth = 7 * s;
    ctx.strokeStyle = '#334155';
    // Back Leg
    ctx.beginPath();
    ctx.moveTo(0, -35 * s);
    ctx.lineTo(-Math.sin(walkSwing) * 15 * s, -18 * s);
    ctx.lineTo(-Math.sin(walkSwing) * 25 * s, 0);
    ctx.stroke();
    // Front Leg
    ctx.beginPath();
    ctx.moveTo(0, -35 * s);
    ctx.lineTo(Math.sin(walkSwing) * 15 * s, -18 * s);
    ctx.lineTo(Math.sin(walkSwing) * 25 * s, 0);
    ctx.stroke();

    // Armored Cockpit Torso
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.roundRect(-18 * s, -65 * s, 36 * s, 32 * s, 8 * s);
    ctx.fill();
    ctx.stroke();

    // Glowing Visor
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-12 * s, -55 * s, 24 * s, 6 * s);

    // Rocket Pod on Shoulder
    ctx.fillStyle = '#475569';
    ctx.fillRect(-16 * s, -78 * s, 14 * s, 12 * s);
    ctx.fillStyle = '#f97316';
    for (let r = 0; r < 3; r++) {
      ctx.fillRect(-14 * s + r * 4 * s, -76 * s, 3 * s, 8 * s);
    }

    // Heavy Gatling Gun Arm
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(this.facing * 14 * s, -52 * s, this.facing * 28 * s, 10 * s);
    // Barrel rotating tips
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(this.facing * 38 * s, -54 * s, this.facing * 6 * s, 14 * s);
  }

  drawHealthBar(ctx, sx, barY, isPlayer) {
    const barW = Math.max(28, 30 * this.scale);
    const barH = 4.5;
    const hpRatio = Math.max(0, Math.min(1, this.hp / this.maxHp));

    ctx.save();
    // Bar Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(sx - barW / 2 - 1, barY - 1, barW + 2, barH + 2);

    // Fill
    ctx.fillStyle = isPlayer ? '#38bdf8' : '#ef4444';
    ctx.fillRect(sx - barW / 2, barY, barW * hpRatio, barH);

    // Armor pips indicator
    if (this.armor > 2) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(sx - barW / 2, barY + barH, 4, 2);
    }

    ctx.restore();
  }
}
