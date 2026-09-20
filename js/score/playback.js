export class ScorePlayer {
  constructor(onState) { this.onState = onState; this.context = null; this.master = null; this.timer = null; this.voices = new Set(); }
  async ready() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContextClass();
      this.master = this.context.createGain(); this.master.gain.value = .28;
      const compressor = this.context.createDynamicsCompressor();
      this.master.connect(compressor); compressor.connect(this.context.destination);
    }
    await this.context.resume();
  }
  tone(midi, start, duration, velocity = .7) {
    const context = this.context, osc = context.createOscillator(), gain = context.createGain();
    osc.type = 'triangle'; osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0, start);
    const level = .16 * velocity, releaseAt = Math.max(start + .06, start + duration - .045);
    gain.gain.linearRampToValueAtTime(level, start + .012);
    // Keep sustained notes audible until their detected or measure-adjusted end.
    gain.gain.setValueAtTime(level, releaseAt);
    gain.gain.setTargetAtTime(0, releaseAt, .025);
    osc.connect(gain); gain.connect(this.master); this.voices.add(osc);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); this.voices.delete(osc); };
    osc.start(start); osc.stop(start + Math.max(.08, duration));
  }
  async play(events, tempo, onEvent) {
    this.stop(); await this.ready();
    const secondsPerBeat = 60 / tempo, start = this.context.currentTime + .06;
    events.forEach(event => {
      const at = start + event.startBeat * secondsPerBeat;
      event.notes.forEach(note => this.tone(note.midi, at, note.durationBeat * secondsPerBeat));
      const timeout = Math.max(0, (at - this.context.currentTime) * 1000);
      setTimeout(() => onEvent(event), timeout);
    });
    const end = start + Math.max(0, ...events.map(event => (event.startBeat + event.durationBeat) * secondsPerBeat));
    this.timer = setTimeout(() => { this.timer = null; this.onState(false); }, Math.max(0, (end - this.context.currentTime) * 1000 + 60));
    this.onState(true);
  }
  stop() {
    if (this.timer) clearTimeout(this.timer); this.timer = null;
    for (const voice of this.voices) { try { voice.stop(); } catch {} }
    this.voices.clear(); this.onState(false);
  }
}
