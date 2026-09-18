const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SEMITONES = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};

export function pitchToMidi(step, octave, accidental = 0) {
  return (octave + 1) * 12 + SEMITONES[step] + accidental;
}

export function midiLabel(midi) {
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

function diatonicOffset(step, octave, offset) {
  const base = STEPS.indexOf(step) + octave * 7 + offset;
  return {step: STEPS[((base % 7) + 7) % 7], octave: Math.floor(base / 7)};
}

// bottom line reference: treble E4, bass G2. Each staff position is one diatonic step.
export function inferPitch(head, staff, clef = 'treble') {
  const offset = Math.round((staff.bottom - head.centerY) / (staff.spacing / 2));
  const reference = clef === 'bass' ? {step: 'G', octave: 2} : {step: 'E', octave: 4};
  const pitch = diatonicOffset(reference.step, reference.octave, offset);
  return {...pitch, midi: pitchToMidi(pitch.step, pitch.octave), staffSteps: offset};
}

export function inferDuration(head) {
  return head.rhythm?.durationBeat ?? (head.kind === 'hollow' ? 2 : 1);
}

export function prepareScore(result, clefs = {}) {
  if (!result) return [];
  const staves = new Map(result.staves.map(staff => [staff.id, staff]));
  return result.heads.map(head => {
    const staff = staves.get(head.staff), clef = clefs[head.staff] || (head.staff % 2 ? 'treble' : 'bass');
    const inferred = inferPitch(head, staff, clef);
    const midi = Number.isInteger(head.midi) ? head.midi : inferred.midi;
    return {...head, clef, ...inferred, midi, startBeat: Number.isFinite(head.startBeat) ? head.startBeat : null, durationBeat: Number.isFinite(head.durationBeat) ? head.durationBeat : inferDuration(head), included: head.included === undefined ? head.accepted : head.included};
  });
}

export function buildPlaybackEvents(notes, staves, xTolerance = 10) {
  // Staff gaps larger than fourteen line spaces are treated as a new system.
  const orderedStaves = [...staves].sort((a, b) => a.top - b.top);
  let system = 0, previous = null;
  const systems = new Map();
  for (const staff of orderedStaves) {
    if (previous && staff.top - previous.bottom > Math.max(staff.spacing, previous.spacing) * 14) system++;
    systems.set(staff.id, system); previous = staff;
  }
  const rows = new Map();
  for (const note of notes.filter(note => note.included)) {
    const id = systems.get(note.staff) || 0;
    if (!rows.has(id)) rows.set(id, []);
    rows.get(id).push(note);
  }
  const events = [], sortedSystems = [...rows.keys()].sort((a, b) => a - b);
  let beat = 0;
  for (const id of sortedSystems) {
    const row = rows.get(id).sort((a, b) => a.centerX - b.centerX || a.centerY - b.centerY);
    for (let index = 0; index < row.length;) {
      const anchor = row[index].centerX, chord = [];
      while (index < row.length && Math.abs(row[index].centerX - anchor) <= xTolerance) chord.push(row[index++]);
      const durationBeat = Math.max(...chord.map(note => note.durationBeat));
      const manuallyPlaced = chord.map(note => note.startBeat).filter(Number.isFinite);
      const startBeat = manuallyPlaced.length ? Math.min(...manuallyPlaced) : beat;
      events.push({startBeat, durationBeat, notes: chord});
      beat = Math.max(beat, startBeat + durationBeat);
    }
  }
  return events.sort((a, b) => a.startBeat - b.startBeat);
}
export function scoreDataFromNotes(notes, tempo, staves = [], xTolerance = 10) {
  const events = buildPlaybackEvents(notes, staves, xTolerance);
  return {tempo, timeSignature: {numerator: 4, denominator: 4}, notes: events.flatMap(event => event.notes.map(note => ({
    id: note.id, midi: note.midi, startBeat: event.startBeat, durationBeat: note.durationBeat,
    measure: Math.floor(event.startBeat / 4) + 1, staff: note.staff, hand: note.clef === 'bass' ? 'left' : 'right', confidence: note.confidence
  })))};
}
