# Stickman Army Commander: Frontline War 🎖️

A complete, fully playable 2D side-scrolling strategy game built with **HTML5 Canvas**, **Vanilla JavaScript (ES Modules)**, **CSS**, and **Vite**.

---

## 🚀 How to Run the Game

### Option 1: Development Server (Instant Live Reload)
```bash
cd "C:\Users\Rehan\.gemini\antigravity\scratch\stickman-army-commander"
npm run dev
```
Open your browser at the URL shown in terminal (usually `http://localhost:5173/`).

### Option 2: Production Build & Preview
```bash
cd "C:\Users\Rehan\.gemini\antigravity\scratch\stickman-army-commander"
npm run build
npm run preview
```

---

## 🎮 Controls & Hotkeys

| Action | Desktop Keyboard & Mouse | Mobile / Touch |
|---|---|---|
| **Scroll Battlefield** | `[A]` / `[D]` or `[←]` / `[→]`, Mouse Drag, or click Minimap | Touch swipe / drag or on-screen `[◀]` / `[▶]` buttons |
| **Recruit Swordsman** | `[1]` or Click Unit Card | Tap Swordsman Card |
| **Recruit Rifleman** | `[2]` or Click Unit Card | Tap Rifleman Card |
| **Recruit Archer** | `[3]` or Click Unit Card | Tap Archer Card |
| **Recruit Gunner** | `[4]` or Click Unit Card | Tap Gunner Card |
| **Recruit Sniper** | `[5]` or Click Unit Card | Tap Sniper Card |
| **Recruit Medic** | `[6]` or Click Unit Card | Tap Medic Card |
| **Recruit Juggernaut** | `[7]` or Click Unit Card | Tap Juggernaut Card |
| **Airstrike Power** | `[Q]` then click target on battlefield | Tap `Air Strike` then tap battlefield target |
| **Rally Cry Power** | `[W]` (+40% speed, +50% attack rate for 10s) | Tap `Rally Cry` button |
| **Air Drop Power** | `[E]` (drops 3 elite paratroopers to front) | Tap `Air Drop` button |
| **HQ Overdrive Power** | `[R]` (repairs 25% HQ HP & supercharges turret) | Tap `Overdrive` button |
| **Tactical Stances** | Click `ATTACK`, `DEFEND`, `HOLD`, `RETREAT` | Tap stance buttons on right panel |
| **Pause Game** | `[Space]` or Pause button | Tap `⏸️` button |
| **Cancel Targeting** | `[Escape]` | Tap anywhere off crosshair |

---

## 💂 Soldier Types & Capabilities

1. **Swordsman (50 💰)**: Fast shock infantry armed with a combat blade and riot buckler. Cheap frontline screen.
2. **Rifleman (85 💰)**: Disciplined soldier equipped with a semi-automatic service rifle and tracer munitions.
3. **Archer (110 💰)**: Fires ballistic arcing flaming arrows that bypass frontlines to decimate backline ranks.
4. **Gunner (170 💰)**: Deploys a belt-fed heavy machine gun unloading rapid 5-round bursts to shred enemy swarms.
5. **Sniper (210 💰)**: Long-range marksman with laser sight and high-caliber rifle delivering lethal critical damage.
6. **Combat Medic (140 💰)**: Field medic projecting a restorative nanite beam to heal wounded friendly troops.
7. **Juggernaut (280 💰)**: Heavily armored vanguard with a riot wall barrier and devastating close-range explosive shotgun.
8. **Boss Units**:
   - *Captain Ironclad* (Mission 5 Mini-Boss): Dual-wielding SMG commander with reinforced combat armor.
   - *The Iron Colossus* (Mission 10 Final Boss): Massive 3-meter tall mechanized stickman titan armed with twin rocket salvos and Gatling cannons!

---

## 🎖️ Campaign Operations (10 Missions)

1. **Operation First Strike** (Plains) - Learn recruitment and frontline combat.
2. **Valley of Arrows** (Sunset Ridge) - High-angle archers introduced.
3. **The Iron Trench** (Mud & Rain) - Heavy machine gunners and suppression.
4. **Dune Sharpshooters** (Desert) - Long-range sniper duels.
5. **Fortress Ironclad** (Bunkers) - Heavy Juggernauts unlocked + Captain Ironclad Mini-Boss!
6. **Field Hospital Evac** (Twilight Valley) - Combat Medics unlocked for sustained attrition.
7. **Thunderstorm Assault** (Storm & Lightning) - Aggressive enemy offensive waves.
8. **Frostbite Ridge** (Snow Blizzard) - Enemy commander airstrikes and elite squads.
9. **Gates of the Citadel** (Night Fortress) - Fortified red bastions and heavy artillery.
10. **The Iron Colossus** (Apocalyptic Bastion) - Epic showdown against the giant Mech Boss!

---

## ⚙️ Armory & Base Upgrades

Earn coins from victories and enemy kill bounties to upgrade:
- **HQ Fortifications**: +25% Max HP per tier (Tiers 1–5).
- **Bunker Defense Turret**: Mounts and upgrades automated 20mm flak cannons on HQ.
- **Logistics Supply Lines**: Increases passive gold income rate (+2 gold/sec per tier).
- **Tungsten Munitions**: Increases all friendly units' attack damage (+15% per tier).
- **Kevlar Flak Vests**: Increases all friendly units' health (+20% per tier) and adds armor.
- **Barracks Drills**: Reduces unit training cooldowns (-10% per tier).
- **Tactical Uplink**: Accelerates Commander powers cooldowns (-12% per tier).

---

## 💾 Saving & Persistence

All campaign progress, star ratings (⭐ to ⭐⭐⭐), unlocked units, purchased upgrades, and war chest coins are saved automatically to `localStorage`.
