export class ScoreMidiInput {
  constructor(onEvent, onState) { this.onEvent = onEvent; this.onState = onState; this.access = null; this.active = new Map(); }
  async connect() {
    if (!navigator.requestMIDIAccess) throw new Error('unsupported');
    this.access = await navigator.requestMIDIAccess();
    this.access.onstatechange = () => this.bindInputs();
    this.bindInputs();
  }
  bindInputs() {
    if (!this.access) return;
    const inputs = [...this.access.inputs.values()];
    for (const input of inputs) input.onmidimessage = message => this.handle(message);
    this.onState(inputs.map(input => input.name || 'MIDI input'));
  }
  handle({data}) {
    const [status, midi, velocity = 0] = data, type = status & 0xf0, channel = (status & 0x0f) + 1;
    if (type !== 0x90 && type !== 0x80) return;
    const key = `${channel}:${midi}`, now = performance.now();
    if (type === 0x90 && velocity > 0) {
      const note = {midi, velocity, channel, startTime: now, endTime: null, duration: null};
      this.active.set(key, note); this.onEvent('on', note); return;
    }
    const note = this.active.get(key) || {midi, velocity: 0, channel, startTime: now};
    note.endTime = now; note.duration = Math.max(0, now - note.startTime);
    this.active.delete(key); this.onEvent('off', note);
  }
}
