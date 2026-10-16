// Armory and Base Upgrades definition
export const UPGRADES = {
  hq_health: {
    id: 'hq_health',
    name: 'HQ Fortifications',
    category: 'base',
    description: 'Reinforces the Headquarters bunker with titanium plating (+25% Max HP per tier).',
    maxLevel: 5,
    costs: [150, 300, 550, 900, 1500],
    bonusPerLevel: 0.25, // +25% HP
    icon: '🛡️'
  },
  hq_turret: {
    id: 'hq_turret',
    name: 'Bunker Defense Turret',
    category: 'base',
    description: 'Mounts an automated 20mm flak cannon atop the HQ to fire at approaching hostiles.',
    maxLevel: 5,
    costs: [200, 380, 650, 1100, 1800],
    bonusPerLevel: 1, // Turret level
    icon: '💥'
  },
  gold_mining: {
    id: 'gold_mining',
    name: 'Logistics Supply Lines',
    category: 'economy',
    description: 'Enhances resource supply convoys (+2 gold per second per tier).',
    maxLevel: 5,
    costs: [180, 350, 600, 1000, 1600],
    bonusPerLevel: 2, // +2 gold/s
    icon: '💰'
  },
  infantry_damage: {
    id: 'infantry_damage',
    name: 'Tungsten Munitions',
    category: 'military',
    description: 'Issues armor-piercing bullets and razor-sharp blades (+15% Damage per tier).',
    maxLevel: 5,
    costs: [220, 420, 750, 1250, 2000],
    bonusPerLevel: 0.15, // +15% damage
    icon: '⚔️'
  },
  infantry_armor: {
    id: 'infantry_armor',
    name: 'Kevlar Flak Vests',
    category: 'military',
    description: 'Equips all combat personnel with ballistic combat vests (+20% Health per tier).',
    maxLevel: 5,
    costs: [200, 400, 700, 1200, 1900],
    bonusPerLevel: 0.20, // +20% HP
    icon: '🦺'
  },
  recruit_speed: {
    id: 'recruit_speed',
    name: 'Barracks Drills',
    category: 'military',
    description: 'Streamlines combat readiness, reducing unit training cooldowns by 10% per tier.',
    maxLevel: 5,
    costs: [180, 360, 620, 1050, 1700],
    bonusPerLevel: 0.10, // -10% cooldown
    icon: '⚡'
  },
  commander_tech: {
    id: 'commander_tech',
    name: 'Tactical Uplink',
    category: 'commander',
    description: 'Reduces Commander abilities cooldown by 12% and amplifies artillery blast radius.',
    maxLevel: 5,
    costs: [250, 500, 850, 1400, 2200],
    bonusPerLevel: 0.12, // -12% cooldown
    icon: '📡'
  }
};
