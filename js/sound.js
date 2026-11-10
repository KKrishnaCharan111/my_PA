// Web Audio API Sound Synthesizer for Notifications & Pomodoro Ambient Sound
class SoundManager {
  constructor() {
    this.ctx = null;
    this.ambientSource = null;
    this.ambientGain = null;
    this.ambientInterval = null;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play customizable notification sounds
  play(theme = 'chime') {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    switch (theme) {
      case 'bell':
        this.playBell(t);
        break;
      case 'ping':
        this.playPing(t);
        break;
      case 'marimba':
        this.playMarimba(t);
        break;
      case 'zen':
        this.playZen(t);
        break;
      case 'chime':
      default:
        this.playChime(t);
        break;
    }
  }

  playChime(t) {
    // Gentle dual-tone chime (A4 -> E5)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, t); // A4
    osc1.frequency.exponentialRampToValueAtTime(659.25, t + 0.15); // E5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, t);
    osc2.frequency.exponentialRampToValueAtTime(1318.5, t + 0.15);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.2);
    osc2.stop(t + 1.2);
  }

  playBell(t) {
    // High reverberant bell
    const freqs = [880, 1760, 2640];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      const vol = 0.25 / (idx + 1);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 1.8);
    });
  }

  playPing(t) {
    // Crisp modern digital ping
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.25);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  playMarimba(t) {
    // 3-note arpeggio chord (C5 -> E5 -> G5)
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const start = t + i * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.35, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  playZen(t) {
    // Deep meditation singing bowl tone
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);

    sub.type = 'sine';
    sub.frequency.setValueAtTime(560, t);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);

    osc.connect(gain);
    sub.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    sub.start(t);
    osc.stop(t + 2.5);
    sub.stop(t + 2.5);
  }

  // Ambient sound synthesizer for Pomodoro Focus Timer
  startAmbient(type = 'rain', volume = 0.3) {
    this.stopAmbient();
    this.init();
    if (!this.ctx) return;

    if (type === 'tick') {
      this.ambientInterval = setInterval(() => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1000, now);
        g.gain.setValueAtTime(volume * 0.15, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      }, 1000);
      return;
    }

    // White noise / Rain / Forest noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'rain') {
        // Pinkish noise for rain
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      } else if (type === 'forest') {
        output[i] = (lastOut + 0.015 * white) / 1.015;
        lastOut = output[i];
        output[i] *= 2.8;
      } else {
        // Pure white noise
        output[i] = white * 0.2;
      }
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = type === 'rain' ? 'lowpass' : (type === 'forest' ? 'bandpass' : 'allpass');
    filter.frequency.value = type === 'rain' ? 800 : (type === 'forest' ? 1200 : 3000);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(volume * 0.4, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    whiteNoise.start();
    this.ambientSource = whiteNoise;
    this.ambientGain = gainNode;
  }

  stopAmbient() {
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
        this.ambientSource.disconnect();
      } catch (e) {}
      this.ambientSource = null;
    }
  }
}

window.soundManager = new SoundManager();
