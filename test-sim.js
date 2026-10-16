// Simulation tester for combat mechanics and AI
import { Unit } from '../src/entities/Unit.js';
import { Base } from '../src/entities/Base.js';
import { Projectile } from '../src/entities/Projectile.js';
import { CommandSystem } from '../src/systems/CommandSystem.js';
import { UNIT_TYPES } from '../src/data/units.js';
import { MISSIONS } from '../src/data/missions.js';

console.log('--- STARTING COMBAT SIMULATION TEST ---');

// Mock audio
const mockAudio = {
  shoot: () => {},
  slash: () => {},
  hit: () => {},
  explosion: () => {},
  heal: () => {},
  rally: () => {},
  airstrike: () => {},
  repair: () => {},
  coin: () => {},
  click: () => {}
};

const groundY = 480;
const playerBase = new Base('player', 150, groundY, 1200, 1);
const enemyBase = new Base('enemy', 3000, groundY, 1200, 1);
const units = [];
const projectiles = [];

// Spawn player swordsman and rifleman
const p1 = new Unit('swordsman', 'player', 200, groundY);
const p2 = new Unit('rifleman', 'player', 180, groundY);
units.push(p1, p2);

// Spawn enemy swordsman and archer
const e1 = new Unit('swordsman', 'enemy', 400, groundY);
const e2 = new Unit('archer', 'enemy', 460, groundY);
units.push(e1, e2);

const commandSystem = new CommandSystem();

console.log(`Initial units count: ${units.length}`);

// Simulate 200 ticks (10 seconds)
const dt = 0.05;
for (let tick = 0; tick < 200; tick++) {
  commandSystem.update(dt);
  for (const u of units) {
    commandSystem.applyStanceToUnit(u, playerBase, 3200);
  }

  const bases = { player: playerBase, enemy: enemyBase };
  playerBase.update(dt, units, p => projectiles.push(new Projectile(p)), null, mockAudio);
  enemyBase.update(dt, units, p => projectiles.push(new Projectile(p)), null, mockAudio);

  for (let i = units.length - 1; i >= 0; i--) {
    const u = units[i];
    u.update(
      dt,
      units,
      bases,
      projectiles,
      p => projectiles.push(new Projectile(p)),
      null,
      null,
      mockAudio
    );
    if (u.dead && u.deathTimer >= u.deathMaxTimer) {
      units.splice(i, 1);
    }
  }

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.update(dt, groundY);
    if (p.dead) {
      projectiles.splice(i, 1);
    }
  }
}

console.log(`Simulation finished. Surviving units: ${units.length}, Player Base HP: ${playerBase.hp}, Enemy Base HP: ${enemyBase.hp}`);
console.log('--- SIMULATION PASSED CLEANLY ---');
