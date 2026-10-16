// Active Battle Instance: Manages simulation, recruitment, units, projectiles, and victory/defeat
import { Unit } from '../entities/Unit.js';
import { Base } from '../entities/Base.js';
import { Projectile } from '../entities/Projectile.js';
import { CommandSystem } from './CommandSystem.js';
import { EnemyAI } from './EnemyAI.js';
import { UNIT_TYPES } from '../data/units.js';
import { MISSIONS } from '../data/missions.js';

export class Battle {
  constructor(mode, missionId, gameState, audio, renderer, camera) {
    this.mode = mode; // 'campaign', 'endless', 'skirmish'
    this.missionId = missionId;
    this.gameState = gameState;
    this.audio = audio;
    this.renderer = renderer;
    this.camera = camera;

    // Load mission configuration
    if (this.mode === 'campaign') {
      this.config = MISSIONS.find(m => m.id === missionId) || MISSIONS[0];
    } else {
      // Endless or skirmish mode config
      this.config = {
        id: 999,
        title: this.mode === 'endless' ? 'Endless Siege' : 'Skirmish Battlefield',
        theme: 'storm',
        worldWidth: 3800,
        playerHqHp: 2500,
        enemyHqHp: 3500,
        playerStartGold: 250,
        enemyStartGold: 250,
        playerIncomeRate: 12,
        enemyIncomeRate: 14,
        enemySpawnDelay: 3.0,
        enemyUnits: ['swordsman', 'rifleman', 'archer', 'machine_gunner', 'sniper', 'heavy']
      };
    }

    this.worldWidth = this.config.worldWidth || 3400;
    this.camera.setWorldWidth(this.worldWidth);
    this.groundY = 480;

    // Calculate armory modifiers
    this.modifiers = this.gameState.getCombatModifiers();

    // Economy
    this.gold = this.config.playerStartGold || 150;
    this.incomeRate = (this.config.playerIncomeRate || 10) + this.modifiers.passiveGoldBonus;

    // Bases
    const playerBaseHp = Math.round((this.config.playerHqHp || 1200) * this.modifiers.hqHpMultiplier);
    this.playerBase = new Base('player', 150, this.groundY, playerBaseHp, this.modifiers.turretLevel);
    this.enemyBase = new Base('enemy', this.worldWidth - 150, this.groundY, this.config.enemyHqHp || 1200, Math.min(4, Math.floor(this.config.id / 3)));

    // Entities
    this.units = [];
    this.projectiles = [];

    // Systems
    this.commandSystem = new CommandSystem();
    this.enemyAI = new EnemyAI(this.config);

    // Recruitment Cooldowns tracker: { [unitType]: remainingCooldown }
    this.recruitCooldowns = {};
    for (const key in UNIT_TYPES) {
      this.recruitCooldowns[key] = 0;
    }

    // Match status
    this.isOver = false;
    this.winner = null; // 'player' or 'enemy'
    this.elapsedTime = 0;
    this.enemiesDefeated = 0;
    this.totalGoldEarned = this.gold;

    // Endless mode specific counters
    this.endlessWave = 1;
    this.endlessWaveTimer = 20;

    // Center camera on player base at start
    this.camera.centerOn(350);
  }

  canRecruit(typeKey) {
    if (this.isOver) return false;
    const u = UNIT_TYPES[typeKey];
    if (!u) return false;
    if (!this.gameState.isUnitUnlocked(typeKey)) return false;
    if (this.gold < u.cost) return false;
    if (this.recruitCooldowns[typeKey] > 0) return false;
    return true;
  }

  recruit(typeKey) {
    if (!this.canRecruit(typeKey)) return false;
    const u = UNIT_TYPES[typeKey];
    this.gold -= u.cost;
    this.recruitCooldowns[typeKey] = u.cooldown * this.modifiers.recruitCooldownMult;

    // Spawn player soldier near player HQ
    const spawnX = this.playerBase.x + 80 + (Math.random() - 0.5) * 20;
    this.spawnUnit(typeKey, 'player', spawnX);

    if (this.audio) this.audio.click();
    return true;
  }

  spawnUnit(typeKey, team, x) {
    const isPlayer = team === 'player';
    const mods = isPlayer ? {
      hpMult: this.modifiers.healthMultiplier,
      dmgMult: this.modifiers.damageMultiplier,
      armorBonus: this.modifiers.armorBonus,
      cooldownMult: this.modifiers.recruitCooldownMult
    } : {
      // Enemy scaling in campaign
      hpMult: 1.0 + (this.config.id - 1) * 0.08,
      dmgMult: 1.0 + (this.config.id - 1) * 0.06,
      armorBonus: Math.floor((this.config.id - 1) / 3)
    };

    const unit = new Unit(typeKey, team, x, this.groundY, mods);
    this.units.push(unit);
    return unit;
  }

  spawnProjectile(options) {
    const proj = new Projectile(options);
    this.projectiles.push(proj);
  }

  handleExplosionSplash(proj) {
    if (this.audio) this.audio.explosion(proj.splashRadius > 100 ? 1.6 : 1.0);
    if (this.camera) this.camera.addTrauma(proj.splashRadius > 100 ? 0.6 : 0.3);

    // Spawn explosion particles
    for (let i = 0; i < (proj.splashRadius > 100 ? 24 : 14); i++) {
      this.renderer.addParticle({
        x: proj.x + (Math.random() - 0.5) * 30,
        y: proj.y - 10 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 250,
        vy: -80 - Math.random() * 200,
        color: Math.random() < 0.4 ? '#ef4444' : Math.random() < 0.7 ? '#f97316' : '#fef08a',
        size: 5 + Math.random() * 8,
        life: 0.7 + Math.random() * 0.4
      });
    }

    // Damage all units in splash radius
    const opponentTeam = proj.team === 'player' ? 'enemy' : 'player';
    for (const u of this.units) {
      if (u.team === opponentTeam && !u.dead) {
        const dist = Math.abs(u.x - proj.x);
        if (dist <= proj.splashRadius) {
          const falloff = 1 - (dist / proj.splashRadius) * 0.5;
          const damage = Math.round(proj.damage * falloff);
          const dealt = u.takeDamage(damage, true);
          this.renderer.addFloatText(u.x, this.groundY - 50, `-${dealt}`, '#f97316');
        }
      }
    }

    // Damage opponent base if within splash
    const oppBase = proj.team === 'player' ? this.enemyBase : this.playerBase;
    if (Math.abs(oppBase.x - proj.x) <= proj.splashRadius) {
      oppBase.takeDamage(Math.round(proj.damage * 0.7));
    }
  }

  update(dt) {
    if (this.isOver) return;
    this.elapsedTime += dt;

    // 1. Passive gold income
    const gainedGold = this.incomeRate * dt;
    this.gold += gainedGold;
    this.totalGoldEarned += gainedGold;

    // 2. Unit recruitment cooldowns
    for (const key in this.recruitCooldowns) {
      if (this.recruitCooldowns[key] > 0) {
        this.recruitCooldowns[key] -= dt;
        if (this.recruitCooldowns[key] < 0) this.recruitCooldowns[key] = 0;
      }
    }

    // 3. Command System update
    this.commandSystem.update(dt, this.modifiers.commanderCooldownMult);

    // Apply active stance to all player units
    for (const u of this.units) {
      this.commandSystem.applyStanceToUnit(u, this.playerBase, this.worldWidth);
    }

    // 4. Update Bases
    const bases = { player: this.playerBase, enemy: this.enemyBase };
    this.playerBase.update(
      dt,
      this.units,
      p => this.spawnProjectile(p),
      p => this.renderer.addParticle(p),
      this.audio
    );
    this.enemyBase.update(
      dt,
      this.units,
      p => this.spawnProjectile(p),
      p => this.renderer.addParticle(p),
      this.audio
    );

    // 5. Update Units
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      u.update(
        dt,
        this.units,
        bases,
        this.projectiles,
        p => this.spawnProjectile(p),
        p => this.renderer.addParticle(p),
        (x, y, text, col) => this.renderer.addFloatText(x, y, text, col),
        this.audio
      );

      // Unit died cleanup
      if (u.dead && u.deathTimer >= u.deathMaxTimer) {
        if (u.team === 'enemy') {
          this.enemiesDefeated++;
          // Kill bounty
          const bounty = Math.round(u.type.cost * 0.35);
          this.gold += bounty;
          this.totalGoldEarned += bounty;
          this.renderer.addFloatText(u.x, this.groundY - 70, `+${bounty}g`, '#facc15');
          if (this.audio) this.audio.coin();
        }
        this.units.splice(i, 1);
      }
    }

    // 6. Update Projectiles & Collisions
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt, this.groundY);

      if (p.dead) {
        if (p.splashRadius > 0) {
          this.handleExplosionSplash(p);
        } else if (p.hitGround && this.audio) {
          // Ricochet / dust puff
          this.renderer.addParticle({
            x: p.x,
            y: this.groundY,
            vx: (Math.random() - 0.5) * 40,
            vy: -20 - Math.random() * 20,
            color: '#94a3b8',
            size: 2.5,
            life: 0.3
          });
        }
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision with opposing units
      const opponentTeam = p.team === 'player' ? 'enemy' : 'player';
      let hitUnit = null;

      for (const u of this.units) {
        if (u.team === opponentTeam && !u.dead) {
          const hitRadius = 14 * u.scale;
          const uCenterY = this.groundY - (28 * u.scale);
          if (Math.abs(u.x - p.x) < hitRadius && Math.abs(uCenterY - p.y) < hitRadius + 12) {
            hitUnit = u;
            break;
          }
        }
      }

      if (hitUnit) {
        p.dead = true;
        if (p.splashRadius > 0) {
          this.handleExplosionSplash(p);
        } else {
          const dealt = hitUnit.takeDamage(p.damage);
          this.renderer.addFloatText(hitUnit.x, this.groundY - 50, `-${dealt}`, opponentTeam === 'enemy' ? '#ef4444' : '#f87171');
          if (this.audio) this.audio.hit();

          // Hit spark particles
          for (let k = 0; k < 4; k++) {
            this.renderer.addParticle({
              x: p.x,
              y: p.y,
              vx: (Math.random() - 0.5) * 80,
              vy: -30 - Math.random() * 50,
              color: '#fde047',
              size: 2.5,
              life: 0.35
            });
          }
        }
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision with opponent HQ
      const oppBase = p.team === 'player' ? this.enemyBase : this.playerBase;
      if (Math.abs(oppBase.x - p.x) < 45 && p.y > this.groundY - 90) {
        p.dead = true;
        if (p.splashRadius > 0) {
          this.handleExplosionSplash(p);
        } else {
          oppBase.takeDamage(p.damage);
          this.renderer.addFloatText(oppBase.x, this.groundY - 70, `-${p.damage}`, '#ef4444');
          if (this.audio) this.audio.hit();
        }
        this.projectiles.splice(i, 1);
      }
    }

    // 7. Update Enemy AI
    this.enemyAI.update(
      dt,
      this.units,
      this.enemyBase,
      this.playerBase,
      (type, team, x) => this.spawnUnit(type, team, x),
      p => this.spawnProjectile(p),
      this.audio
    );

    // 8. Endless Mode Spawner
    if (this.mode === 'endless') {
      this.endlessWaveTimer -= dt;
      if (this.endlessWaveTimer <= 0) {
        this.endlessWave++;
        this.endlessWaveTimer = Math.max(14, 25 - this.endlessWave * 0.8);
        this.renderer.addFloatText(this.worldWidth / 2, 120, `WAVE ${this.endlessWave} INCOMING!`, '#ef4444');
        if (this.audio) this.audio.airstrike();

        // Spawn dynamic wave
        const count = 3 + Math.floor(this.endlessWave * 0.8);
        const pool = ['swordsman', 'rifleman', 'archer', 'machine_gunner', 'sniper', 'heavy'];
        for (let w = 0; w < count; w++) {
          setTimeout(() => {
            const pick = pool[Math.floor(Math.random() * pool.length)];
            this.spawnUnit(pick, 'enemy', this.enemyBase.x - 70 - w * 25);
          }, w * 350);
        }

        // Spawn Boss every 4 waves
        if (this.endlessWave % 4 === 0) {
          setTimeout(() => {
            this.spawnUnit('boss_colossus', 'enemy', this.enemyBase.x - 90);
          }, 1500);
        }
      }
    }

    // 9. Win / Lose Check
    if (this.enemyBase.dead && !this.isOver) {
      this.isOver = true;
      this.winner = 'player';
      if (this.audio) {
        this.audio.stopMusic();
        this.audio.victory();
      }
      if (this.camera) this.camera.addTrauma(1.0);
    } else if (this.playerBase.dead && !this.isOver) {
      this.isOver = true;
      this.winner = 'enemy';
      if (this.audio) {
        this.audio.stopMusic();
        this.audio.defeat();
      }
      if (this.camera) this.camera.addTrauma(1.0);
    }
  }

  draw(ctx) {
    const theme = this.config.theme || 'grass';

    // 1. Parallax background
    this.renderer.drawBackground(this.camera, theme, this.groundY);

    // 2. Terrain & ground details
    this.renderer.drawTerrain(this.camera, theme, this.groundY, this.worldWidth);

    // 3. Bases
    this.playerBase.draw(ctx, this.camera);
    this.enemyBase.draw(ctx, this.camera);

    // 4. Units (sort by Y so closer units render in front)
    this.units.forEach(u => u.draw(ctx, this.camera));

    // 5. Projectiles
    this.projectiles.forEach(p => p.draw(ctx, this.camera));

    // 6. Particles & Weather
    this.renderer.drawParticles(this.camera);
    this.renderer.drawWeather(this.camera, theme);

    // 7. Floating Combat Text
    this.renderer.drawFloatTexts(this.camera);
  }
}
