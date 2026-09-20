function text(bytes, offset, length) { return String.fromCharCode(...bytes.slice(offset, offset + length)); }
function read32(bytes, offset) { return ((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]; }
function vlq(bytes, state) { let value = 0, byte; do { byte = bytes[state.i++]; value = (value << 7) | (byte & 0x7f); } while (byte & 0x80); return value; }

// Standard MIDI File reader for note, tempo, and time-signature events.
export function readMidiScore(buffer) {
  const bytes = new Uint8Array(buffer);
  if (text(bytes, 0, 4) !== 'MThd' || read32(bytes, 4) < 6) throw new Error('Not a Standard MIDI file');
  const tracks = (bytes[10] << 8) | bytes[11], division = (bytes[12] << 8) | bytes[13];
  if (!division || division & 0x8000) throw new Error('SMPTE timing is not supported');
  let offset = 14, tempo = 120, signature = {numerator: 4, denominator: 4}, id = 1;
  const notes = [];
  for (let track = 0; track < tracks && offset + 8 <= bytes.length; track++) {
    if (text(bytes, offset, 4) !== 'MTrk') throw new Error('Invalid MIDI track');
    const end = offset + 8 + read32(bytes, offset + 4), state = {i: offset + 8}; let tick = 0, running = 0;
    const active = new Map();
    while (state.i < end) {
      tick += vlq(bytes, state); let status = bytes[state.i++];
      if (status < 0x80) { state.i--; status = running; } else if (status < 0xf0) running = status;
      if (status === 0xff) {
        const type = bytes[state.i++], size = vlq(bytes, state), data = bytes.slice(state.i, state.i + size); state.i += size;
        if (type === 0x51 && size === 3) tempo = Math.round(60000000 / ((data[0] << 16) | (data[1] << 8) | data[2]));
        if (type === 0x58 && size >= 2) signature = {numerator: data[0], denominator: 2 ** data[1]};
        continue;
      }
      if (status === 0xf0 || status === 0xf7) { state.i += vlq(bytes, state); continue; }
      const type = status & 0xf0, channel = (status & 0x0f) + 1, midi = bytes[state.i++], velocity = type === 0xc0 || type === 0xd0 ? 0 : bytes[state.i++];
      if (type !== 0x90 && type !== 0x80) continue;
      const key = `${channel}:${midi}`;
      if (type === 0x90 && velocity) active.set(key, {midi, channel, velocity, tick});
      else {
        const start = active.get(key); if (!start) continue; active.delete(key);
        notes.push({id: id++, midi, channel, velocity, startBeat: start.tick / division, durationBeat: Math.max(.0625, (tick - start.tick) / division),
          hand: midi < 60 ? 'left' : 'right', staff: midi < 60 ? 2 : 1, confidence: 1});
      }
    }
    offset = end;
  }
  notes.sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi);
  const events = [];
  for (const note of notes) {
    const previous = events[events.length - 1];
    if (previous && Math.abs(previous.startBeat - note.startBeat) < .0001) { previous.notes.push(note); previous.durationBeat = Math.max(previous.durationBeat, note.durationBeat); }
    else events.push({startBeat: note.startBeat, durationBeat: note.durationBeat, notes: [note]});
  }
  return {tempo, timeSignature: signature, notes, events};
}
