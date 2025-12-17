class SoundManager {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (this.isMuted) return;

    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    const adjustedVolume = volume * 0.2;
    gainNode.gain.setValueAtTime(adjustedVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  private playMultiTone(notes: Array<{ frequency: number; delay: number; duration: number; type?: OscillatorType; volume?: number }>) {
    notes.forEach(note => {
      setTimeout(() => {
        this.playTone(note.frequency, note.duration, note.type || 'sine', note.volume || 0.3);
      }, note.delay);
    });
  }

  servePizza() {
    this.playTone(800, 0.1, 'sine', 0.2);
  }

  customerServed() {
    this.playMultiTone([
      { frequency: 523, delay: 0, duration: 0.1, volume: 0.25 },
      { frequency: 659, delay: 50, duration: 0.1, volume: 0.25 },
      { frequency: 784, delay: 100, duration: 0.15, volume: 0.25 }
    ]);
  }

  customerDisappointed() {
    this.playMultiTone([
      { frequency: 400, delay: 0, duration: 0.15, type: 'sawtooth', volume: 0.2 },
      { frequency: 300, delay: 80, duration: 0.2, type: 'sawtooth', volume: 0.2 }
    ]);
  }

  plateCaught() {
    this.playTone(1000, 0.08, 'sine', 0.2);
  }

  plateDropped() {
    this.playMultiTone([
      { frequency: 800, delay: 0, duration: 0.05, type: 'triangle', volume: 0.25 },
      { frequency: 600, delay: 30, duration: 0.05, type: 'triangle', volume: 0.2 },
      { frequency: 400, delay: 60, duration: 0.08, type: 'triangle', volume: 0.15 }
    ]);
  }

  powerUpCollected(type?: string) {
    if (type === 'honey') {
      this.playMultiTone([
        { frequency: 659, delay: 0, duration: 0.12, volume: 0.25 },
        { frequency: 784, delay: 60, duration: 0.12, volume: 0.25 },
        { frequency: 988, delay: 120, duration: 0.15, volume: 0.25 }
      ]);
    } else if (type === 'ice-cream') {
      this.playMultiTone([
        { frequency: 880, delay: 0, duration: 0.1, volume: 0.25 },
        { frequency: 1047, delay: 50, duration: 0.1, volume: 0.25 },
        { frequency: 1319, delay: 100, duration: 0.12, volume: 0.25 },
        { frequency: 1568, delay: 150, duration: 0.15, volume: 0.25 }
      ]);
    } else if (type === 'beer') {
      /* this.playMultiTone([
        { frequency: 523, delay: 0, duration: 0.15, type: 'square', volume: 0.25 },
        { frequency: 659, delay: 80, duration: 0.15, type: 'square', volume: 0.25 },
        { frequency: 784, delay: 160, duration: 0.2, type: 'square', volume: 0.25 }
      ]); */
      this.playMultiTone([
      { frequency: 400, delay: 0, duration: 0.15, type: 'square', volume: 0.2 },
      { frequency: 350, delay: 80, duration: 0.2, type: 'square', volume: 0.2 }
    ]);
    } else {
      this.playMultiTone([
        { frequency: 659, delay: 0, duration: 0.1, volume: 0.25 },
        { frequency: 784, delay: 50, duration: 0.1, volume: 0.25 },
        { frequency: 988, delay: 100, duration: 0.15, volume: 0.25 },
        { frequency: 1319, delay: 150, duration: 0.2, volume: 0.25 }
      ]);
    }
  }

  ovenStart() {
    this.playTone(440, 0.1, 'square', 0.15);
  }

// Toaster "ping!" — bright metallic chime with a crisp spring click
ovenReady() {
  this.playMultiTone([
    { frequency: 880, delay: 0, duration: 0.1, volume: 0.2 },
    { frequency: 880, delay: 150, duration: 0.1, volume: 0.2 }
  ]);
}

  ovenWarning() {
    this.playTone(880, 0.15, 'sine', 0.25);
  }

  ovenBurning() {
    this.playMultiTone([
      { frequency: 300, delay: 0, duration: 0.2, type: 'sawtooth', volume: 0.2 },
      { frequency: 250, delay: 100, duration: 0.25, type: 'sawtooth', volume: 0.2 }
    ]);
  }

  ovenBurned() {
    this.playMultiTone([
      { frequency: 200, delay: 0, duration: 0.3, type: 'sawtooth', volume: 0.25 },
      { frequency: 150, delay: 150, duration: 0.4, type: 'sawtooth', volume: 0.25 }
    ]);
  }

  lifeLost() {
    this.playMultiTone([
      { frequency: 500, delay: 0, duration: 0.15, type: 'triangle', volume: 0.25 },
      { frequency: 400, delay: 80, duration: 0.15, type: 'triangle', volume: 0.25 },
      { frequency: 300, delay: 160, duration: 0.25, type: 'triangle', volume: 0.25 }
    ]);
  }

  lifeGained() {
    this.playMultiTone([
      { frequency: 523, delay: 0, duration: 0.12, volume: 0.25 },
      { frequency: 659, delay: 60, duration: 0.12, volume: 0.25 },
      { frequency: 784, delay: 120, duration: 0.12, volume: 0.25 },
      { frequency: 1047, delay: 180, duration: 0.18, volume: 0.25 }
    ]);
  }

  gameOver() {
    this.playMultiTone([
      { frequency: 440, delay: 0, duration: 0.2, type: 'sawtooth', volume: 0.3 },
      { frequency: 415, delay: 100, duration: 0.2, type: 'sawtooth', volume: 0.3 },
      { frequency: 392, delay: 200, duration: 0.2, type: 'sawtooth', volume: 0.3 },
      { frequency: 370, delay: 300, duration: 0.4, type: 'sawtooth', volume: 0.3 }
    ]);
  }

  chefMove() {
    this.playTone(600, 0.05, 'square', 0.1);
  }

  pizzaDestroyed() {
    this.playTone(300, 0.1, 'sawtooth', 0.15);
  }

  customerUnfreeze() {
    this.playTone(700, 0.12, 'sine', 0.2);
  }

  beerEffect() {
    this.playMultiTone([
      { frequency: 400, delay: 0, duration: 0.15, type: 'square', volume: 0.2 },
      { frequency: 350, delay: 80, duration: 0.2, type: 'square', volume: 0.2 }
    ]);
  }

  woozyServed() {
    this.playMultiTone([
      { frequency: 500, delay: 0, duration: 0.1, volume: 0.2 },
      { frequency: 600, delay: 60, duration: 0.1, volume: 0.2 }
    ]);
  }

  cleaningStart() {
    this.playTone(500, 0.15, 'square', 0.15);
  }

  cleaningComplete() {
    this.playMultiTone([
      { frequency: 600, delay: 0, duration: 0.1, volume: 0.2 },
      { frequency: 800, delay: 80, duration: 0.12, volume: 0.2 }
    ]);
  }

  nyanCatPowerUp() {
      this.playMultiTone([
    { frequency: 1480.0, delay: 0,    duration: 0.171, type: 'triangle', volume: 0.22 },
    { frequency: 1661.2, delay: 171,  duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 1108.8, delay: 343,  duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 1244.6, delay: 429,  duration: 0.171, type: 'triangle', volume: 0.22 },
    { frequency: 987.8,  delay: 600,  duration: 0.043, type: 'triangle', volume: 0.22 },

    { frequency: 1174.6, delay: 686,  duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 1108.8, delay: 771,  duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 987.8,  delay: 857,  duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 987.8,  delay: 1029, duration: 0.086, type: 'triangle', volume: 0.22 },

    { frequency: 1108.8, delay: 1200, duration: 0.171, type: 'triangle', volume: 0.22 },
    { frequency: 1174.6, delay: 1371, duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 1174.6, delay: 1543, duration: 0.043, type: 'triangle', volume: 0.22 },
    { frequency: 1108.8, delay: 1629, duration: 0.043, type: 'triangle', volume: 0.22 },

    { frequency: 987.8,  delay: 1714, duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 1108.8, delay: 1800, duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 1244.6, delay: 1886, duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 1480.0, delay: 1971, duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 1661.2, delay: 2057, duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 1244.6, delay: 2143, duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 1480.0, delay: 2229, duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 1108.8, delay: 2314, duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 1174.6, delay: 2400, duration: 0.086, type: 'triangle', volume: 0.22 },
    { frequency: 987.8,  delay: 2486, duration: 0.086, type: 'triangle', volume: 0.22 },

    { frequency: 1108.8, delay: 2571, duration: 0.086, type: 'triangle', volume: 0.22 },

  ]);
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
  }

  checkMuted(): boolean {
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
