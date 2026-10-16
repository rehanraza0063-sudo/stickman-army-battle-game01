// Main Game Controller: Loop, Input bindings, Screen Switching, HUD & Minimap sync
import { gameState } from './core/GameState.js';
import { audio } from './core/Audio.js';
import { Camera } from './core/Camera.js';
import { Renderer } from './core/Renderer.js';
import { Battle } from './systems/Battle.js';
import { UNIT_TYPES } from './data/units.js';
import { MISSIONS } from './data/missions.js';
import { UPGRADES } from './data/upgrades.js';

class GameApp {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.minimapCanvas = document.getElementById('minimapCanvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    this.camera = new Camera(window.innerWidth, window.innerHeight, 3400);
    this.renderer = new Renderer(this.canvas, this.ctx);
    this.currentBattle = null;
    this.isPaused = false;
    this.lastTime = performance.now();

    // Input state
    this.keys = {};
    this.pointerDown = false;
    this.pointerStartX = 0;
    this.pointerLastX = 0;
    this.hasDragged = false;
    this.isMinimapDragging = false;

    this.initWindow();
    this.bindEvents();
    this.renderMenu();
    this.renderMissionsList();
    this.renderUpgradesList();
    this.renderUnitDeck();

    // Start Main Loop
    requestAnimationFrame(time => this.loop(time));
  }

  initWindow() {
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.camera.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resize);
    resize();
  }

  bindEvents() {
    // Keyboard inputs
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;

      // Handle hotkeys in battle
      if (this.currentBattle && !this.isPaused) {
        // Hotkeys 1-7 for units
        const unitKeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'];
        const unitOrder = ['swordsman', 'rifleman', 'archer', 'machine_gunner', 'sniper', 'medic', 'heavy'];
        const unitIdx = unitKeys.indexOf(e.code);
        if (unitIdx !== -1) {
          const type = unitOrder[unitIdx];
          if (type) this.currentBattle.recruit(type);
        }

        // Commander Powers Q, W, E, R
        if (e.code === 'KeyQ') this.triggerPower('airstrike');
        if (e.code === 'KeyW') this.triggerPower('rally');
        if (e.code === 'KeyE') this.triggerPower('reinforce');
        if (e.code === 'KeyR') this.triggerPower('repair');

        // Space to toggle pause
        if (e.code === 'Space') {
          e.preventDefault();
          this.togglePause();
        }

        // Escape to cancel targeting
        if (e.code === 'Escape') {
          this.cancelTargeting();
        }
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });

    // Pointer / Mouse / Touch Dragging on Battlefield Canvas
    this.canvas.addEventListener('pointerdown', e => {
      this.pointerDown = true;
      this.pointerStartX = e.clientX;
      this.pointerLastX = e.clientX;
      this.hasDragged = false;

      // If targeting power active (e.g. Airstrike), execute on world coordinates!
      if (this.currentBattle && this.currentBattle.commandSystem.targetingPower) {
        const worldX = this.camera.screenToWorld(e.clientX);
        this.executePowerTarget(worldX);
        this.pointerDown = false;
      }
    });

    window.addEventListener('pointermove', e => {
      if (this.pointerDown && this.currentBattle) {
        const deltaX = e.clientX - this.pointerLastX;
        if (Math.abs(e.clientX - this.pointerStartX) > 6) {
          this.hasDragged = true;
        }
        // Pan camera in opposite direction of drag
        this.camera.pan(-deltaX * 1.2);
        this.pointerLastX = e.clientX;
      }

      // Update airstrike targeting crosshair position
      const crosshair = document.getElementById('airstrike-target-marker');
      if (crosshair && !crosshair.classList.contains('hidden')) {
        crosshair.style.left = `${e.clientX}px`;
        crosshair.style.top = `${e.clientY}px`;
      }
    });

    window.addEventListener('pointerup', () => {
      this.pointerDown = false;
    });

    // Minimap interaction
    this.minimapCanvas.addEventListener('pointerdown', e => {
      this.isMinimapDragging = true;
      this.handleMinimapClick(e);
    });

    this.minimapCanvas.addEventListener('pointermove', e => {
      if (this.isMinimapDragging) {
        this.handleMinimapClick(e);
      }
    });

    window.addEventListener('pointerup', () => {
      this.isMinimapDragging = false;
    });

    // Mobile Pan Buttons
    const leftBtn = document.getElementById('btn-pan-left');
    const rightBtn = document.getElementById('btn-pan-right');
    let panInterval = null;

    const startPan = dir => {
      if (panInterval) clearInterval(panInterval);
      panInterval = setInterval(() => {
        if (this.camera) this.camera.pan(dir * 25);
      }, 16);
    };

    const stopPan = () => {
      if (panInterval) clearInterval(panInterval);
      panInterval = null;
    };

    leftBtn.addEventListener('pointerdown', () => startPan(-1));
    leftBtn.addEventListener('pointerup', stopPan);
    leftBtn.addEventListener('pointerleave', stopPan);

    rightBtn.addEventListener('pointerdown', () => startPan(1));
    rightBtn.addEventListener('pointerup', stopPan);
    rightBtn.addEventListener('pointerleave', stopPan);

    // Tactical Stances UI clicks
    document.querySelectorAll('.stance-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const stance = btn.dataset.stance;
        if (this.currentBattle) {
          this.currentBattle.commandSystem.setStance(stance);
          document.querySelectorAll('.stance-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          audio.click();
        }
      });
    });

    // Commander Powers UI clicks
    document.querySelectorAll('.power-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const power = btn.dataset.power;
        this.triggerPower(power);
      });
    });

    // Sound toggle
    document.getElementById('btn-sound-toggle').addEventListener('click', () => {
      const active = audio.toggleSfx();
      audio.toggleMusic();
      document.getElementById('btn-sound-toggle').textContent = active ? '🔊' : '🔇';
    });

    // Pause button
    document.getElementById('btn-pause').addEventListener('click', () => {
      this.togglePause();
    });

    // Menu Navigation buttons
    document.getElementById('btn-menu-campaign').addEventListener('click', () => {
      audio.click();
      this.showScreen('screen-missions');
      this.renderMissionsList();
    });

    document.getElementById('btn-menu-endless').addEventListener('click', () => {
      audio.click();
      this.startBattle('endless', 1);
    });

    document.getElementById('btn-menu-upgrades').addEventListener('click', () => {
      audio.click();
      this.showScreen('screen-upgrades');
      this.renderUpgradesList();
    });

    document.getElementById('btn-menu-instructions').addEventListener('click', () => {
      audio.click();
      document.getElementById('modal-instructions').classList.remove('hidden');
    });

    document.getElementById('btn-instructions-close').addEventListener('click', () => {
      audio.click();
      document.getElementById('modal-instructions').classList.add('hidden');
    });

    document.getElementById('btn-menu-settings').addEventListener('click', () => {
      audio.click();
      document.getElementById('modal-settings').classList.remove('hidden');
    });

    document.getElementById('btn-settings-close').addEventListener('click', () => {
      audio.click();
      document.getElementById('modal-settings').classList.add('hidden');
    });

    // Sub-screen back buttons
    document.getElementById('btn-missions-back').addEventListener('click', () => {
      audio.click();
      this.showScreen('screen-menu');
      this.renderMenu();
    });

    document.getElementById('btn-upgrades-back').addEventListener('click', () => {
      audio.click();
      this.showScreen('screen-menu');
      this.renderMenu();
    });

    // Pause Modal buttons
    document.getElementById('btn-pause-resume').addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('btn-pause-restart').addEventListener('click', () => {
      audio.click();
      this.togglePause();
      if (this.currentBattle) {
        this.startBattle(this.currentBattle.mode, this.currentBattle.missionId);
      }
    });

    document.getElementById('btn-pause-armory').addEventListener('click', () => {
      audio.click();
      this.togglePause();
      this.showScreen('screen-upgrades');
      this.renderUpgradesList();
    });

    document.getElementById('btn-pause-quit').addEventListener('click', () => {
      audio.click();
      this.togglePause();
      this.stopBattle();
      this.showScreen('screen-menu');
      this.renderMenu();
    });

    // Victory Modal buttons
    document.getElementById('btn-victory-next').addEventListener('click', () => {
      audio.click();
      document.getElementById('modal-victory').classList.add('hidden');
      const nextId = (this.currentBattle ? this.currentBattle.missionId : 1) + 1;
      if (nextId <= MISSIONS.length) {
        this.startBattle('campaign', nextId);
      } else {
        this.showScreen('screen-missions');
        this.renderMissionsList();
      }
    });

    document.getElementById('btn-victory-armory').addEventListener('click', () => {
      audio.click();
      document.getElementById('modal-victory').classList.add('hidden');
      this.showScreen('screen-upgrades');
      this.renderUpgradesList();
    });

    document.getElementById('btn-victory-menu').addEventListener('click', () => {
      audio.click();
      document.getElementById('modal-victory').classList.add('hidden');
      this.showScreen('screen-missions');
      this.renderMissionsList();
    });

    // Defeat Modal buttons
    document.getElementById('btn-defeat-retry').addEventListener('click', () => {
      audio.click();
      document.getElementById('modal-defeat').classList.add('hidden');
      if (this.currentBattle) {
        this.startBattle(this.currentBattle.mode, this.currentBattle.missionId);
      }
    });

    document.getElementById('btn-defeat-armory').addEventListener('click', () => {
      audio.click();
      document.getElementById('modal-defeat').classList.add('hidden');
      this.showScreen('screen-upgrades');
      this.renderUpgradesList();
    });

    document.getElementById('btn-defeat-menu').addEventListener('click', () => {
      audio.click();
      document.getElementById('modal-defeat').classList.add('hidden');
      this.showScreen('screen-menu');
      this.renderMenu();
    });

    // Settings inputs
    document.getElementById('slider-sfx').addEventListener('input', e => {
      audio.setSfxVolume(parseFloat(e.target.value));
    });

    document.getElementById('slider-music').addEventListener('input', e => {
      audio.setMusicVolume(parseFloat(e.target.value));
    });

    document.getElementById('btn-reset-save').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all game progress?')) {
        gameState.resetSave();
      }
    });
  }

  handleMinimapClick(e) {
    if (!this.currentBattle) return;
    const rect = this.minimapCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetWorldX = ratio * this.currentBattle.worldWidth;
    this.camera.centerOn(targetWorldX);
  }

  triggerPower(powerId) {
    if (!this.currentBattle) return;
    const status = this.currentBattle.commandSystem.triggerPower(powerId, this.getCombatContext());
    if (status === 'targeting') {
      // Show crosshair
      document.getElementById('airstrike-target-marker').classList.remove('hidden');
    }
  }

  executePowerTarget(worldX) {
    if (!this.currentBattle) return;
    const pwr = this.currentBattle.commandSystem.targetingPower;
    if (pwr) {
      this.currentBattle.commandSystem.executePower(pwr, worldX, this.getCombatContext());
      this.cancelTargeting();
    }
  }

  cancelTargeting() {
    if (this.currentBattle) {
      this.currentBattle.commandSystem.cancelTargeting();
    }
    const marker = document.getElementById('airstrike-target-marker');
    if (marker) marker.classList.add('hidden');
  }

  getCombatContext() {
    return {
      audio,
      units: this.currentBattle.units,
      playerBase: this.currentBattle.playerBase,
      worldWidth: this.currentBattle.worldWidth,
      groundY: this.currentBattle.groundY,
      onSpawnProjectile: p => this.currentBattle.spawnProjectile(p),
      onSpawnParticle: p => this.renderer.addParticle(p),
      onSpawnFloatText: (x, y, text, color) => this.renderer.addFloatText(x, y, text, color),
      onSpawnUnit: (type, team, x) => this.currentBattle.spawnUnit(type, team, x),
      camera: this.camera,
      techModifier: {
        cooldownReduction: this.currentBattle.modifiers.commanderCooldownMult
      }
    };
  }

  showScreen(screenId) {
    document.querySelectorAll('.screen-layer').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(screenId);
    if (target) target.classList.remove('hidden');
  }

  renderMenu() {
    document.getElementById('menu-coin-count').textContent = gameState.profile.coins;
  }

  renderMissionsList() {
    const container = document.getElementById('missions-container');
    document.getElementById('missions-coin-count').textContent = gameState.profile.coins;
    container.innerHTML = '';

    MISSIONS.forEach(m => {
      const isLocked = m.id > gameState.profile.maxMissionReached;
      const starsEarned = gameState.profile.missionStars[m.id] || 0;

      const card = document.createElement('div');
      card.className = `mission-card ${isLocked ? 'locked' : ''}`;

      let starsHtml = '';
      for (let s = 1; s <= 3; s++) {
        starsHtml += `<span class="${s <= starsEarned ? 'star earned' : 'star'}">★</span>`;
      }

      card.innerHTML = `
        <div class="mission-card-header">
          <span class="mission-number">MISSION ${m.id}</span>
          <div class="mission-stars">${isLocked ? '🔒 LOCKED' : starsHtml}</div>
        </div>
        <div class="mission-card-title">${m.title}</div>
        <div class="mission-card-sub">${m.subtitle}</div>
        <div class="mission-card-desc">${m.description}</div>
        <div class="mission-card-footer">
          <span>Reward:</span>
          <span class="bounty-badge">+${m.rewardGold} 💰</span>
        </div>
      `;

      if (!isLocked) {
        card.addEventListener('click', () => {
          audio.click();
          this.startBattle('campaign', m.id);
        });
      }

      container.appendChild(card);
    });
  }

  renderUpgradesList() {
    const container = document.getElementById('upgrades-container');
    document.getElementById('upgrades-coin-count').textContent = gameState.profile.coins;
    container.innerHTML = '';

    for (const key in UPGRADES) {
      const u = UPGRADES[key];
      const currentLevel = gameState.getUpgradeLevel(key);
      const isMax = currentLevel >= u.maxLevel;
      const nextCost = isMax ? null : u.costs[currentLevel];
      const canAfford = nextCost !== null && gameState.profile.coins >= nextCost;

      const card = document.createElement('div');
      card.className = 'upgrade-card';

      let pipsHtml = '';
      for (let i = 0; i < u.maxLevel; i++) {
        pipsHtml += `<div class="tier-pip ${i < currentLevel ? 'filled' : ''}"></div>`;
      }

      card.innerHTML = `
        <div class="upgrade-header">
          <div class="upgrade-icon">${u.icon}</div>
          <div class="upgrade-info">
            <div class="upgrade-title">${u.name}</div>
            <div class="upgrade-level">Tier: ${currentLevel} / ${u.maxLevel}</div>
          </div>
        </div>
        <div class="upgrade-desc">${u.description}</div>
        <div class="upgrade-tier-bar">${pipsHtml}</div>
        <div class="upgrade-footer">
          <span class="upgrade-cost">${isMax ? 'MAX TIER' : `Cost: 💰 ${nextCost}`}</span>
          <button class="btn btn-primary btn-upgrade-buy" ${isMax || !canAfford ? 'disabled' : ''}>
            ${isMax ? 'Completed' : 'Upgrade'}
          </button>
        </div>
      `;

      const buyBtn = card.querySelector('.btn-upgrade-buy');
      if (buyBtn && !isMax && canAfford) {
        buyBtn.addEventListener('click', () => {
          if (gameState.buyUpgrade(key)) {
            audio.coin();
            this.renderUpgradesList();
          }
        });
      }

      container.appendChild(card);
    }
  }

  renderUnitDeck() {
    const container = document.getElementById('unit-deck-container');
    container.innerHTML = '';

    const unitOrder = [
      { key: 'swordsman', num: 1, icon: '🗡️' },
      { key: 'rifleman', num: 2, icon: '🔫' },
      { key: 'archer', num: 3, icon: '🏹' },
      { key: 'machine_gunner', num: 4, icon: '⚡' },
      { key: 'sniper', num: 5, icon: '🎯' },
      { key: 'medic', num: 6, icon: '➕' },
      { key: 'heavy', num: 7, icon: '🛡️' }
    ];

    unitOrder.forEach(uDef => {
      const u = UNIT_TYPES[uDef.key];
      const isUnlocked = gameState.isUnitUnlocked(uDef.key);

      const card = document.createElement('div');
      card.className = `unit-card ${!isUnlocked ? 'locked' : ''}`;
      card.id = `unit-card-${uDef.key}`;
      card.title = `${u.name} - ${u.description}\nHP: ${u.maxHp} | Dmg: ${u.damage} | Rng: ${u.range}`;

      card.innerHTML = `
        <span class="unit-card-hotkey">[${uDef.num}]</span>
        <div class="unit-card-icon">${uDef.icon}</div>
        <div class="unit-card-name">${u.name}</div>
        <div class="unit-card-cost">${isUnlocked ? `💰 ${u.cost}` : '🔒'}</div>
        <div class="unit-cooldown-overlay" id="cd-${uDef.key}"></div>
      `;

      card.addEventListener('click', () => {
        if (this.currentBattle && isUnlocked) {
          this.currentBattle.recruit(uDef.key);
        }
      });

      container.appendChild(card);
    });
  }

  startBattle(mode, missionId = 1) {
    this.currentBattle = new Battle(mode, missionId, gameState, audio, this.renderer, this.camera);
    this.isPaused = false;
    this.showScreen('hud');
    this.renderUnitDeck();

    // Mission title
    document.getElementById('hud-mission-title').textContent = this.currentBattle.config.title;

    // Endless wave badge
    const waveLabel = document.getElementById('hud-wave-label');
    if (mode === 'endless') {
      waveLabel.classList.remove('hidden');
      waveLabel.textContent = 'WAVE 1';
    } else {
      waveLabel.classList.add('hidden');
    }

    // Reset modals
    document.querySelectorAll('.modal-layer').forEach(m => m.classList.add('hidden'));

    // Start military march soundtrack
    audio.startMusic();
  }

  stopBattle() {
    this.currentBattle = null;
    audio.stopMusic();
  }

  togglePause() {
    if (!this.currentBattle || this.currentBattle.isOver) return;
    this.isPaused = !this.isPaused;
    const modal = document.getElementById('modal-pause');
    if (this.isPaused) {
      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
  }

  loop(currentTime) {
    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const dt = Math.min(0.08, rawDt); // avoid huge delta jumps

    if (this.currentBattle && !this.isPaused) {
      // 1. Update Camera
      this.camera.update(dt, this.keys);

      // 2. Update Battle Simulation
      this.currentBattle.update(dt);
      this.renderer.update(dt, this.currentBattle.config.theme);

      // 3. Draw Scene
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.currentBattle.draw(this.ctx);

      // 4. Update & Draw Minimap
      this.updateMinimap();

      // 5. Update HUD elements
      this.updateHUD();

      // 6. Handle Match Over
      if (this.currentBattle.isOver) {
        this.handleBattleEnd();
      }
    } else if (!this.currentBattle) {
      // Draw idle background in menu
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.renderer.drawBackground(this.camera, 'grass', this.canvas.height - 100);
      this.renderer.drawTerrain(this.camera, 'grass', this.canvas.height - 100, 3000);
    }

    requestAnimationFrame(time => this.loop(time));
  }

  updateHUD() {
    const b = this.currentBattle;
    if (!b) return;

    // Base Health Bars
    const pRatio = Math.max(0, b.playerBase.hp / b.playerBase.maxHp);
    const eRatio = Math.max(0, b.enemyBase.hp / b.enemyBase.maxHp);

    document.getElementById('player-hp-bar').style.width = `${pRatio * 100}%`;
    document.getElementById('player-hp-text').textContent = `${Math.round(b.playerBase.hp)} / ${b.playerBase.maxHp}`;

    document.getElementById('enemy-hp-bar').style.width = `${eRatio * 100}%`;
    document.getElementById('enemy-hp-text').textContent = `${Math.round(b.enemyBase.hp)} / ${b.enemyBase.maxHp}`;

    // Gold Counter
    document.getElementById('hud-gold-count').textContent = Math.floor(b.gold);
    document.getElementById('hud-gold-rate').textContent = `(+${Math.round(b.incomeRate)}/s)`;

    // Timer
    const mins = Math.floor(b.elapsedTime / 60).toString().padStart(2, '0');
    const secs = Math.floor(b.elapsedTime % 60).toString().padStart(2, '0');
    document.getElementById('hud-timer').textContent = `${mins}:${secs}`;

    // Endless wave counter
    if (b.mode === 'endless') {
      document.getElementById('hud-wave-label').textContent = `WAVE ${b.endlessWave}`;
    }

    // Unit Deck Cooldowns and Affordability
    for (const key in UNIT_TYPES) {
      const u = UNIT_TYPES[key];
      const card = document.getElementById(`unit-card-${key}`);
      const overlay = document.getElementById(`cd-${key}`);
      if (card && overlay) {
        const cdRem = b.recruitCooldowns[key] || 0;
        const totalCd = u.cooldown * b.modifiers.recruitCooldownMult;
        if (cdRem > 0) {
          overlay.style.height = `${(cdRem / totalCd) * 100}%`;
          card.classList.add('cooling-down');
        } else {
          overlay.style.height = '0%';
          card.classList.remove('cooling-down');
        }

        if (b.gold < u.cost) {
          card.classList.add('cant-afford');
        } else {
          card.classList.remove('cant-afford');
        }
      }
    }

    // Commander Powers Cooldown Overlays
    for (const pKey in b.commandSystem.powers) {
      const p = b.commandSystem.powers[pKey];
      const btn = document.getElementById(`pwr-${pKey}`);
      if (btn) {
        const overlay = btn.querySelector('.power-cooldown-overlay');
        const ratio = p.currentCooldown / (p.baseCooldown * b.modifiers.commanderCooldownMult);
        if (overlay) {
          overlay.style.height = `${ratio * 100}%`;
        }
        btn.disabled = p.currentCooldown > 0;
      }
    }
  }

  updateMinimap() {
    const b = this.currentBattle;
    if (!b) return;

    this.minimapCtx.clearRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
    this.renderer.drawMinimap(
      this.camera,
      b.worldWidth,
      b.units,
      b.playerBase,
      b.enemyBase,
      { x: 0, y: 0, width: this.minimapCanvas.width, height: this.minimapCanvas.height }
    );
  }

  handleBattleEnd() {
    const b = this.currentBattle;
    if (!b) return;

    if (b.winner === 'player') {
      const hqRatio = b.playerBase.hp / b.playerBase.maxHp;
      const { stars, reward } = gameState.recordMissionVictory(b.missionId, hqRatio, b.elapsedTime);

      // Populate Victory Modal
      const starElements = document.querySelectorAll('#victory-stars .star');
      starElements.forEach((el, idx) => {
        if (idx < stars) el.classList.add('earned');
        else el.classList.remove('earned');
      });

      document.getElementById('victory-stats').innerHTML = `
        <div><strong>Operation:</strong> ${b.config.title}</div>
        <div><strong>Time:</strong> ${Math.round(b.elapsedTime)}s</div>
        <div><strong>Hostiles Neutralized:</strong> ${b.enemiesDefeated}</div>
        <div><strong>Base Integrity:</strong> ${Math.round(hqRatio * 100)}%</div>
      `;

      document.getElementById('victory-reward-gold').textContent = `+${reward} 💰`;
      document.getElementById('modal-victory').classList.remove('hidden');

    } else if (b.winner === 'enemy') {
      // Defeat
      document.getElementById('modal-defeat').classList.remove('hidden');
    }

    this.stopBattle();
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new GameApp();
});
