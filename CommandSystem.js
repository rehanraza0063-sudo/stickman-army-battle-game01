// Tactical Stances and Commander Powers System
export class CommandSystem {
  constructor() {
    this.currentStance = 'attack'; // 'attack', 'defend', 'hold', 'retreat'
    this.powers = {
      airstrike: {
        id: 'airstrike',
        name: 'Airstrike',
        hotkey: 'Q',
        baseCooldown: 28,
        currentCooldown: 0,
        targetMode: true,
        cost: 0,
        description: 'Target artillery coordinates to rain explosive bombs on enemy clusters.'
      },
      rally: {
        id: 'rally',
        name: 'Rally Cry',
        hotkey: 'W',
        baseCooldown: 22,
        currentCooldown: 0,
        targetMode: false,
        cost: 0,
        description: 'War bugle sounds: Friendly troops gain +40% speed and +50% attack rate for 10s.'
      },
      reinforce: {
        id: 'reinforce',
        name: 'Air Drop',
        hotkey: 'E',
        baseCooldown: 32,
        currentCooldown: 0,
        targetMode: false,
        cost: 0,
        description: 'Paradrops 3 elite reinforcement soldiers directly to the frontline.'
      },
      repair: {
        id: 'repair',
        name: 'HQ Overdrive',
        hotkey: 'R',
        baseCooldown: 40,
        currentCooldown: 0,
        targetMode: false,
        cost: 0,
        description: 'Repairs 25% of Base HP and supercharges base defense turrets.'
      }
    };

    this.targetingPower = null; // currently active power awaiting click
  }

  setStance(stance) {
    if (['attack', 'defend', 'hold', 'retreat'].includes(stance)) {
      this.currentStance = stance;
    }
  }

  update(dt, techCooldownMult = 1.0) {
    for (const key in this.powers) {
      const p = this.powers[key];
      if (p.currentCooldown > 0) {
        p.currentCooldown -= dt;
        if (p.currentCooldown < 0) p.currentCooldown = 0;
      }
    }
  }

  canUse(powerId) {
    const p = this.powers[powerId];
    return p && p.currentCooldown <= 0;
  }

  triggerPower(powerId, context) {
    const p = this.powers[powerId];
    if (!p || p.currentCooldown > 0) return false;

    if (p.targetMode) {
      this.targetingPower = powerId;
      return 'targeting';
    } else {
      this.executePower(powerId, null, context);
      return 'executed';
    }
  }

  cancelTargeting() {
    this.targetingPower = null;
  }

  executePower(powerId, targetX, context) {
    const p = this.powers[powerId];
    if (!p) return;

    const {
      audio,
      units,
      playerBase,
      worldWidth,
      groundY,
      onSpawnProjectile,
      onSpawnParticle,
      onSpawnUnit,
      camera,
      techModifier
    } = context;

    const cdReduction = techModifier?.cooldownReduction || 1.0;
    p.currentCooldown = p.baseCooldown * cdReduction;
    this.targetingPower = null;

    if (powerId === 'airstrike') {
      if (audio) audio.airstrike();
      if (camera) camera.addTrauma(0.7);

      // Rain 5 mortar shells around targetX
      const center = targetX !== null ? targetX : (camera.x + camera.viewportWidth / 2);
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const dropX = center + (Math.random() - 0.5) * 220;
          if (onSpawnProjectile) {
            onSpawnProjectile({
              type: 'airstrike_bomb',
              x: dropX,
              y: -50,
              targetX: dropX,
              targetY: groundY,
              team: 'player',
              damage: 180,
              splashRadius: 130,
              groundY: groundY
            });
          }
          if (audio) audio.explosion(1.3);
          if (camera) camera.addTrauma(0.4);
        }, i * 180);
      }

    } else if (powerId === 'rally') {
      if (audio) audio.rally();
      for (const u of units) {
        if (u.team === 'player' && !u.dead) {
          u.applyRally(10);
        }
      }
      if (context.onSpawnFloatText) {
        context.onSpawnFloatText(playerBase.x + 100, groundY - 120, 'RALLY! +50% ATK', '#fde047');
      }

    } else if (powerId === 'reinforce') {
      if (audio) audio.repair();
      // Drop 1 Swordsman + 2 Riflemen
      const frontX = Math.min(worldWidth - 500, Math.max(playerBase.x + 200, camera.x + 150));
      if (onSpawnUnit) {
        onSpawnUnit('swordsman', 'player', frontX);
        setTimeout(() => onSpawnUnit('rifleman', 'player', frontX - 40), 200);
        setTimeout(() => onSpawnUnit('rifleman', 'player', frontX - 80), 400);
      }

    } else if (powerId === 'repair') {
      if (audio) audio.repair();
      playerBase.repair(playerBase.maxHp * 0.25);
      if (context.onSpawnFloatText) {
        context.onSpawnFloatText(playerBase.x, groundY - 100, '+25% HQ HEALTH', '#38bdf8');
      }
      // Supercharge turret fire rate for 8s
      playerBase.currentCooldown = 0;
    }
  }

  // Adjust unit target behavior based on stance
  applyStanceToUnit(unit, playerBase, worldWidth) {
    if (unit.team !== 'player' || unit.dead) return;

    if (this.currentStance === 'hold') {
      // Don't advance
      if (unit.state === 'walk') {
        unit.state = 'idle';
      }
    } else if (this.currentStance === 'retreat') {
      // Fall back towards base defense perimeter
      const retreatPoint = playerBase.x + 220;
      if (unit.x > retreatPoint) {
        unit.facing = -1;
        unit.state = 'walk';
      }
    } else if (this.currentStance === 'defend') {
      // Hold line up to 45% of map
      const defenseLine = worldWidth * 0.42;
      if (unit.x > defenseLine && unit.state === 'walk') {
        unit.state = 'idle';
      }
    } else {
      // Attack: face forward
      unit.facing = 1;
    }
  }
}
