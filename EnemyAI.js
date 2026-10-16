// Dynamic Enemy AI Commander with reactionary recruitment and boss pacing
import { UNIT_TYPES } from '../data/units.js';

export class EnemyAI {
  constructor(missionConfig) {
    this.config = missionConfig;
    this.gold = missionConfig.enemyStartGold || 150;
    this.incomeRate = missionConfig.enemyIncomeRate || 10;
    this.spawnTimer = 0;
    this.spawnDelay = missionConfig.enemySpawnDelay || 3.5;
    this.waves = [...(missionConfig.waves || [])];
    this.gameTime = 0;
    this.bossSpawned = false;

    // Enemy commander tactical abilities in late missions
    this.aiAirstrikeTimer = 35;
  }

  update(dt, units, enemyBase, playerBase, onSpawnUnit, onSpawnProjectile, audio) {
    this.gameTime += dt;
    this.gold += this.incomeRate * dt;
    this.spawnTimer -= dt;

    // 1. Process Mission Scripted Waves
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i];
      if (this.gameTime >= wave.time) {
        wave.units.forEach((uType, index) => {
          setTimeout(() => {
            onSpawnUnit(uType, 'enemy', enemyBase.x - 60 - index * 25);
          }, index * 400);
        });
        this.waves.splice(i, 1);
      }
    }

    // 2. Process Boss Spawn
    if (this.config.bossUnit && !this.bossSpawned && this.gameTime >= (this.config.bossSpawnTime || 60)) {
      this.bossSpawned = true;
      onSpawnUnit(this.config.bossUnit, 'enemy', enemyBase.x - 80);
      if (audio) audio.explosion(2.0);
    }

    // 3. Enemy Commander Air Strike in late missions (Mission 7+)
    if (this.config.id >= 7) {
      this.aiAirstrikeTimer -= dt;
      if (this.aiAirstrikeTimer <= 0) {
        this.aiAirstrikeTimer = 40 + Math.random() * 20;
        // Target player frontline unit cluster
        const playerUnits = units.filter(u => u.team === 'player' && !u.dead);
        if (playerUnits.length > 2) {
          const target = playerUnits[Math.floor(playerUnits.length / 2)];
          if (audio) audio.airstrike();
          for (let b = 0; b < 3; b++) {
            setTimeout(() => {
              onSpawnProjectile({
                type: 'airstrike_bomb',
                x: target.x + (Math.random() - 0.5) * 160,
                y: -40,
                targetX: target.x,
                targetY: enemyBase.groundY,
                team: 'enemy',
                damage: 140,
                splashRadius: 100,
                groundY: enemyBase.groundY
              });
              if (audio) audio.explosion(1.2);
            }, b * 250);
          }
        }
      }
    }

    // 4. Dynamic Reactionary Recruitment
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnDelay + Math.random() * 1.5;
      this.decideAndRecruit(units, enemyBase, onSpawnUnit);
    }
  }

  decideAndRecruit(units, enemyBase, onSpawnUnit) {
    const allowed = this.config.enemyUnits || ['swordsman', 'rifleman'];

    // Analyze player army composition
    let playerMelee = 0;
    let playerHeavies = 0;
    let playerRanged = 0;
    let enemyFrontliners = 0;
    let enemyHealers = 0;

    for (const u of units) {
      if (u.dead) continue;
      if (u.team === 'player') {
        if (u.type.role === 'tank') playerHeavies++;
        else if (u.type.role === 'melee') playerMelee++;
        else playerRanged++;
      } else {
        if (u.type.role === 'melee' || u.type.role === 'tank') enemyFrontliners++;
        if (u.type.role === 'healer') enemyHealers++;
      }
    }

    // Selection priority based on counters
    let chosenType = null;

    if (enemyFrontliners === 0) {
      // Need a frontline screen
      if (allowed.includes('heavy') && this.gold >= UNIT_TYPES.heavy.cost && Math.random() < 0.6) {
        chosenType = 'heavy';
      } else if (allowed.includes('swordsman')) {
        chosenType = 'swordsman';
      }
    } else if (playerHeavies > 0 && allowed.includes('sniper') && this.gold >= UNIT_TYPES.sniper.cost && Math.random() < 0.7) {
      // Counter heavies with snipers
      chosenType = 'sniper';
    } else if (playerMelee >= 2 && allowed.includes('machine_gunner') && this.gold >= UNIT_TYPES.machine_gunner.cost) {
      // Counter swarms with machine gunners
      chosenType = 'machine_gunner';
    } else if (enemyFrontliners >= 2 && enemyHealers === 0 && allowed.includes('medic') && this.gold >= UNIT_TYPES.medic.cost && Math.random() < 0.5) {
      // Add a medic
      chosenType = 'medic';
    } else {
      // Random weighted pick from affordable units
      const affordable = allowed.filter(t => (UNIT_TYPES[t]?.cost || 999) <= this.gold);
      if (affordable.length > 0) {
        chosenType = affordable[Math.floor(Math.random() * affordable.length)];
      }
    }

    if (chosenType && UNIT_TYPES[chosenType]) {
      const cost = UNIT_TYPES[chosenType].cost;
      if (this.gold >= cost) {
        this.gold -= cost;
        onSpawnUnit(chosenType, 'enemy', enemyBase.x - 70);
      }
    }
  }
}
