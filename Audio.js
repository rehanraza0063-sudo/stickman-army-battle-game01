// Web Audio API procedural sound synthesizer (Zero external asset dependencies)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.initialized = false;
    this.sfxMuted = false;
    this.musicMuted = false;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.step = 0;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.masterGain.gain.value = 0.8;
      this.sfxGain.gain.value = 0.8;
      this.musicGain.gain.value = 0.45;

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  resume() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playNoise(duration, gainVal = 0.5, filterFreq = 1000, highpass = false) {
    if (!this.initialized || this.sfxMuted) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = highpass ? 'highpass' : 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start();
    noise.stop(this.ctx.currentTime + duration);
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.3, endFreq = null) {
    if (!this.initialized || this.sfxMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  shoot(type = 'bullet') {
    this.resume();
    if (!this.initialized || this.sfxMuted) return;

    if (type === 'bullet') {
      // Rifle shot: snappy high noise + fast decay pop
      this.playTone(340, 'sawtooth', 0.08, 0.25, 60);
      this.playNoise(0.09, 0.35, 3200, false);
    } else if (type === 'heavy_bullet') {
      // Machine gun: punchier lower thump
      this.playTone(220, 'square', 0.09, 0.3, 50);
      this.playNoise(0.12, 0.4, 2400, false);
    } else if (type === 'sniper_round') {
      // Sniper: huge high crack + deep booming echo
      this.playTone(550, 'sawtooth', 0.25, 0.45, 40);
      this.playNoise(0.35, 0.6, 4500, false);
      setTimeout(() => this.playNoise(0.2, 0.2, 800, false), 60);
    } else if (type === 'arrow') {
      // Bow release thwip
      this.playTone(450, 'sine', 0.12, 0.25, 120);
      this.playNoise(0.08, 0.15, 1800, true);
    } else if (type === 'buckshot') {
      // Shotgun blast
      this.playTone(160, 'sawtooth', 0.22, 0.5, 35);
      this.playNoise(0.25, 0.65, 2000, false);
    } else if (type === 'rocket') {
      // Rocket hiss / thrust
      this.playTone(180, 'triangle', 0.3, 0.4, 380);
      this.playNoise(0.3, 0.3, 1500, true);
    } else if (type === 'turret') {
      this.playTone(280, 'square', 0.1, 0.3, 80);
      this.playNoise(0.1, 0.35, 2500, false);
    }
  }

  slash() {
    this.resume();
    if (!this.initialized || this.sfxMuted) return;
    this.playTone(600, 'triangle', 0.12, 0.2, 180);
    this.playNoise(0.1, 0.25, 3000, true);
  }

  hit() {
    this.resume();
    if (!this.initialized || this.sfxMuted) return;
    this.playTone(140, 'triangle', 0.08, 0.25, 40);
    this.playNoise(0.06, 0.2, 1200, false);
  }

  explosion(scale = 1.0) {
    this.resume();
    if (!this.initialized || this.sfxMuted) return;
    const dur = Math.min(1.2, 0.4 * scale);
    this.playTone(110, 'sine', dur, 0.6 * Math.min(1.5, scale), 20);
    this.playNoise(dur, 0.7 * Math.min(1.5, scale), 800, false);
  }

  heal() {
    this.resume();
    if (!this.initialized || this.sfxMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.playTone(f, 'sine', 0.18, 0.2, f * 1.05);
      }, i * 45);
    });
  }

  rally() {
    this.resume();
    if (!this.initialized || this.sfxMuted) return;
    // Military bugle call
    const notes = [392.0, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.playTone(f, 'sawtooth', 0.22, 0.3, f * 0.98);
      }, i * 90);
    });
  }

  airstrike() {
    this.resume();
    if (!this.initialized || this.sfxMuted) return;
    // Jet flyby dive sound + siren
    this.playTone(280, 'sawtooth', 0.8, 0.35, 750);
    this.playNoise(1.2, 0.45, 1200, false);
  }

  repair() {
    this.resume();
    if (!this.initialized || this.sfxMuted) return;
    this.playTone(440, 'triangle', 0.15, 0.3, 660);
    setTimeout(() => this.playTone(660, 'triangle', 0.25, 0.3, 880), 120);
  }

  coin() {
    this.resume();
    if (!this.initialized || this.sfxMuted) return;
    this.playTone(987.77, 'sine', 0.09, 0.25);
    setTimeout(() => this.playTone(1318.51, 'sine', 0.15, 0.25), 50);
  }

  click() {
    this.resume();
    if (!this.initialized || this.sfxMuted) return;
    this.playTone(800, 'sine', 0.04, 0.15, 400);
  }

  victory() {
    this.resume();
    if (!this.initialized || this.sfxMuted) return;
    const chords = [
      { f: 523.25, t: 0 },
      { f: 659.25, t: 150 },
      { f: 783.99, t: 300 },
      { f: 1046.50, t: 450 },
      { f: 1046.50, t: 700 }
    ];
    chords.forEach(c => {
      setTimeout(() => {
        this.playTone(c.f, 'sawtooth', 0.45, 0.35);
        this.playTone(c.f / 2, 'triangle', 0.45, 0.25);
      }, c.t);
    });
  }

  defeat() {
    this.resume();
    if (!this.initialized || this.sfxMuted) return;
    const chords = [
      { f: 440, t: 0 },
      { f: 415.3, t: 250 },
      { f: 392, t: 500 },
      { f: 349.23, t: 800 }
    ];
    chords.forEach(c => {
      setTimeout(() => {
        this.playTone(c.f, 'sawtooth', 0.6, 0.3, c.f * 0.9);
      }, c.t);
    });
  }

  // Dynamic procedural military march rhythm track
  startMusic() {
    if (this.musicPlaying) return;
    this.resume();
    this.musicPlaying = true;
    this.step = 0;

    const bpm = 110;
    const beatInterval = (60 / bpm) * 1000 / 2; // eighth notes

    const playMarchBeat = () => {
      if (!this.musicPlaying) return;
      if (this.initialized && !this.musicMuted) {
        const s = this.step % 16;
        // Kick on 0, 4, 8, 12
        if (s % 4 === 0) {
          this.playTone(90, 'sine', 0.14, 0.3, 30);
        }
        // Snare / March roll on 2, 6, 10, 14 and rolls
        if (s === 4 || s === 12 || s === 14 || s === 15) {
          this.playNoise(0.08, 0.18, 2500, true);
        } else if (s % 2 === 0) {
          this.playNoise(0.05, 0.08, 1800, true);
        }
        // Low brass bass pulse
        if (s === 0) {
          this.playTone(110, 'triangle', 0.25, 0.2, 105);
        } else if (s === 8) {
          this.playTone(98, 'triangle', 0.25, 0.2, 93);
        }
      }
      this.step++;
      this.musicTimer = setTimeout(playMarchBeat, beatInterval);
    };

    playMarchBeat();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  setSfxVolume(val) {
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx?.currentTime || 0);
    }
  }

  setMusicVolume(val) {
    if (this.musicGain) {
      this.musicGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx?.currentTime || 0);
    }
  }

  toggleSfx() {
    this.sfxMuted = !this.sfxMuted;
    return !this.sfxMuted;
  }

  toggleMusic() {
    this.musicMuted = !this.musicMuted;
    return !this.musicMuted;
  }
}

export const audio = new SoundEngine();
