const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SEMITONES = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
const SIGNATURES = {
  none: {},
  'sharp-1': {F: 1}, 'sharp-2': {F: 1, C: 1}, 'sharp-3': {F: 1, C: 1, G: 1},
  'sharp-4': {F: 1, C: 1, G: 1, D: 1}, 'sharp-5': {F: 1, C: 1, G: 1, D: 1, A: 1},
  'sharp-6': {F: 1, C: 1, G: 1, D: 1, A: 1, E: 1}, 'sharp-7': {F: 1, C: 1, G: 1, D: 1, A: 1, E: 1, B: 1},
  'flat-1': {B: -1}, 'flat-2': {B: -1, E: -1}, 'flat-3': {B: -1, E: -1, A: -1},
  'flat-4': {B: -1, E: -1, A: -1, D: -1}, 'flat-5': {B: -1, E: -1, A: -1, D: -1, G: -1},
  'flat-6': {B: -1, E: -1, A: -1, D: -1, G: -1, C: -1}, 'flat-7': {B: -1, E: -1, A: -1, D: -1, G: -1, C: -1, F: -1}
};

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
export function inferPitch(head, staff, clef = 'treble', keySignature = 'none') {
  const offset = Math.round((staff.bottom - head.centerY) / (staff.spacing / 2));
  const reference = clef === 'bass' ? {step: 'G', octave: 2} : {step: 'E', octave: 4};
  const pitch = diatonicOffset(reference.step, reference.octave, offset);
  const accidental = SIGNATURES[keySignature]?.[pitch.step] || 0;
  return {...pitch, accidental, midi: pitchToMidi(pitch.step, pitch.octave, accidental), staffSteps: offset};
}

export function inferDuration(head) {
  return head.rhythm?.durationBeat ?? (head.kind === 'hollow' ? 2 : 1);
}

export function prepareScore(result, clefs = {}, page = 1, keySignature = 'none') {
  if (!result) return [];
  const staves = new Map(result.staves.map(staff => [staff.id, staff]));
  return result.heads.map(head => {
    const staff = staves.get(head.staff), clef = clefs[`${page}:${head.staff}`] || clefs[head.staff] || (head.staff % 2 ? 'treble' : 'bass');
    const inferred = inferPitch(head, staff, clef, keySignature);
    const midi = Number.isInteger(head.midi) ? head.midi : inferred.midi;
    const hand = clef === 'bass' ? 'left' : 'right';
    return {...head, clef, hand, ...inferred, midi, startBeat: Number.isFinite(head.startBeat) ? head.startBeat : null, durationBeat: Number.isFinite(head.durationBeat) ? head.durationBeat : inferDuration(head), included: head.included === undefined ? head.accepted : head.included};
  });
}

export function buildPlaybackEvents(notes, staves, measures = [], xTolerance = 10) {
  const staffSpacing = staves.length ? staves.reduce((sum, staff) => sum + staff.spacing, 0) / staves.length : 0;
  const sameStaffTolerance = Math.max(xTolerance, staffSpacing * .55);
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
  let systemStartBeat = 0;
  for (const id of sortedSystems) {
    const byStaff = new Map();
    for (const note of rows.get(id)) {
      if (!byStaff.has(note.staff)) byStaff.set(note.staff, []);
      byStaff.get(note.staff).push(note);
    }
    const measureGroup = measures.find(group => group.system === id && group.boundaries.length >= 2);
    let systemEndBeat = systemStartBeat;
    for (const [staff, staffNotes] of byStaff) {
      staffNotes.sort((a, b) => a.centerX - b.centerX || a.centerY - b.centerY);
      const columns = [];
      for (let index = 0; index < staffNotes.length;) {
        const anchor = staffNotes[index].centerX, notesAtOnset = [];
        while (index < staffNotes.length && Math.abs(staffNotes[index].centerX - anchor) <= sameStaffTolerance) notesAtOnset.push(staffNotes[index++]);
        columns.push({x: anchor, notes: notesAtOnset});
      }
      if (measureGroup) {
        for (let measure = 0; measure + 1 < measureGroup.boundaries.length; measure++) {
          const left = measureGroup.boundaries[measure], right = measureGroup.boundaries[measure + 1];
          const measureStart = systemStartBeat + measure * 4;
          const inMeasure = columns.filter(column => column.x >= left && (measure + 2 === measureGroup.boundaries.length ? column.x <= right : column.x < right));
          // The head classifier is only a hint. Make the inferred values fill the
          // complete measure so a mistaken flag cannot leave an audible gap.
          const raw = inMeasure.map(column => Math.max(.125, ...column.notes.map(note => note.durationBeat)));
          const total = raw.reduce((sum, duration) => sum + duration, 0);
          let staffBeat = measureStart;
          for (let index = 0; index < inMeasure.length; index++) {
            const column = inMeasure[index], durationBeat = total ? raw[index] / total * 4 : 0;
            const manual = column.notes.map(note => note.startBeat).filter(Number.isFinite);
            const startBeat = manual.length ? Math.min(...manual) : staffBeat;
            const remaining = Math.max(.125, measureStart + 4 - startBeat);
            const scheduledDuration = Math.min(durationBeat, remaining);
            events.push({startBeat, durationBeat: scheduledDuration,
              notes: column.notes.map(note => ({...note, durationBeat: scheduledDuration}))});
            staffBeat = Math.max(staffBeat, startBeat + scheduledDuration);
          }
        }
        systemEndBeat = Math.max(systemEndBeat, systemStartBeat + (measureGroup.boundaries.length - 1) * 4);
      } else {
        let staffBeat = systemStartBeat;
        for (const column of columns) {
          const durationBeat = Math.max(...column.notes.map(note => note.durationBeat));
          const manual = column.notes.map(note => note.startBeat).filter(Number.isFinite);
          const startBeat = manual.length ? Math.min(...manual) : staffBeat;
          events.push({startBeat, durationBeat, notes: column.notes.map(note => ({...note, durationBeat}))});
          staffBeat = Math.max(staffBeat, startBeat + durationBeat);
        }
        systemEndBeat = Math.max(systemEndBeat, staffBeat);
      }
    }
    systemStartBeat = systemEndBeat;
  }
  // Merge equal beats after both hands have their own timeline. The player then
  // starts a two-hand onset together without making one hand wait for the other.
  const merged = [];
  for (const event of events.sort((a, b) => a.startBeat - b.startBeat)) {
    const previous = merged[merged.length - 1];
    if (previous && Math.abs(previous.startBeat - event.startBeat) < .001) {
      previous.notes.push(...event.notes);
      previous.durationBeat = Math.max(previous.durationBeat, event.durationBeat);
    } else merged.push({...event, notes: [...event.notes]});
  }
  return merged;
}
export function scoreDataFromNotes(notes, tempo, staves = [], measures = [], xTolerance = 10) {
  const events = buildPlaybackEvents(notes, staves, measures, xTolerance);
  return {tempo, timeSignature: {numerator: 4, denominator: 4}, notes: events.flatMap(event => event.notes.map(note => ({
    id: note.id, midi: note.midi, startBeat: event.startBeat, durationBeat: note.durationBeat,
    measure: Math.floor(event.startBeat / 4) + 1, staff: note.staff, hand: note.clef === 'bass' ? 'left' : 'right', confidence: note.confidence
  })))};
}
