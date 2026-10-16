// Persistent game state, localStorage profile, armory upgrades and modifiers
import { UPGRADES } from '../data/upgrades.js';
import { MISSIONS } from '../data/missions.js';

const STORAGE_KEY = 'stickman_army_commander_save_v1';

export class GameState {
  constructor() {
    this.profile = {
      coins: 400, // starting war chest
      maxMissionReached: 1,
      missionStars: {},
      upgrades: {
        hq_health: 0,
        hq_turret: 0,
        gold_mining: 0,
        infantry_damage: 0,
        infantry_armor: 0,
        recruit_speed: 0,
        commander_tech: 0
      },
      unlockedUnits: ['swordsman', 'rifleman'],
      endlessBestTime: 0,
      settings: {
        sfxVolume: 0.8,
        musicVolume: 0.5,
        screenShake: true,
        edgeScroll: true
      }
    };

    this.currentMode = 'menu'; // 'menu', 'campaign', 'endless', 'skirmish'
    this.currentMissionId = 1;
    this.activeBattle = null;

    this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.profile = {
          ...this.profile,
          ...parsed,
          upgrades: { ...this.profile.upgrades, ...(parsed.upgrades || {}) },
          settings: { ...this.profile.settings, ...(parsed.settings || {}) }
        };
      }
    } catch (e) {
      console.warn('Could not load save data from localStorage:', e);
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch (e) {
      console.warn('Could not save data to localStorage:', e);
    }
  }

  resetSave() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }

  addCoins(amount) {
    this.profile.coins += Math.max(0, Math.round(amount));
    this.save();
  }

  spendCoins(amount) {
    if (this.profile.coins >= amount) {
      this.profile.coins -= amount;
      this.save();
      return true;
    }
    return false;
  }

  getUpgradeLevel(upgradeId) {
    return this.profile.upgrades[upgradeId] || 0;
  }

  getUpgradeCost(upgradeId) {
    const u = UPGRADES[upgradeId];
    if (!u) return Infinity;
    const currentLvl = this.getUpgradeLevel(upgradeId);
    if (currentLvl >= u.maxLevel) return null;
    return u.costs[currentLvl];
  }

  buyUpgrade(upgradeId) {
    const cost = this.getUpgradeCost(upgradeId);
    if (cost !== null && this.spendCoins(cost)) {
      this.profile.upgrades[upgradeId] = (this.profile.upgrades[upgradeId] || 0) + 1;
      this.save();
      return true;
    }
    return false;
  }

  isUnitUnlocked(unitId) {
    return this.profile.unlockedUnits.includes(unitId);
  }

  unlockUnit(unitId) {
    if (!this.profile.unlockedUnits.includes(unitId)) {
      this.profile.unlockedUnits.push(unitId);
      this.save();
    }
  }

  recordMissionVictory(missionId, hqHealthRatio, completionTime) {
    // Calculate stars:
    // 3 stars: HQ HP > 70% and time < 150s
    // 2 stars: HQ HP > 35%
    // 1 star: Cleared
    let stars = 1;
    if (hqHealthRatio >= 0.7 && completionTime < 180) stars = 3;
    else if (hqHealthRatio >= 0.35) stars = 2;

    const prevStars = this.profile.missionStars[missionId] || 0;
    if (stars > prevStars) {
      this.profile.missionStars[missionId] = stars;
    }

    const mission = MISSIONS.find(m => m.id === missionId);
    let reward = 200;
    if (mission) {
      reward = mission.rewardGold;
      if (mission.unlockedUnits) {
        mission.unlockedUnits.forEach(u => this.unlockUnit(u));
      }
    }

    this.addCoins(reward);

    if (missionId >= this.profile.maxMissionReached && missionId < MISSIONS.length) {
      this.profile.maxMissionReached = missionId + 1;
    }

    this.save();
    return { stars, reward };
  }

  // Get active combat stat modifiers calculated from armory upgrades
  getCombatModifiers() {
    const u = this.profile.upgrades;
    const hpLevel = u.hq_health || 0;
    const turretLevel = u.hq_turret || 0;
    const miningLevel = u.gold_mining || 0;
    const dmgLevel = u.infantry_damage || 0;
    const armorLevel = u.infantry_armor || 0;
    const recruitLevel = u.recruit_speed || 0;
    const techLevel = u.commander_tech || 0;

    return {
      hqHpMultiplier: 1.0 + hpLevel * 0.25,
      turretLevel: turretLevel,
      passiveGoldBonus: miningLevel * 2,
      damageMultiplier: 1.0 + dmgLevel * 0.15,
      healthMultiplier: 1.0 + armorLevel * 0.20,
      armorBonus: armorLevel,
      recruitCooldownMult: Math.max(0.4, 1.0 - recruitLevel * 0.10),
      commanderCooldownMult: Math.max(0.4, 1.0 - techLevel * 0.12)
    };
  }
}

export const gameState = new GameState();
