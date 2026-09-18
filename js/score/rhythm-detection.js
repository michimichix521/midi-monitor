// Rhythm hints are intentionally conservative. The user can correct each result in Score Lab.
function ink(binary, width, height, x, y) {
  return x >= 0 && x < width && y >= 0 && y < height ? binary[Math.round(y) * width + Math.round(x)] : 0;
}

function verticalRun(binary, width, height, x, y, direction, limit) {
  let run = 0;
  for (let distance = 0; distance <= limit; distance++) {
    if (ink(binary, width, height, x, y + direction * distance)) run++;
    else if (distance > 2) break;
  }
  return run;
}

function findStem(binary, width, height, head, spacing) {
  const maximum = Math.round(spacing * 4.5), minimum = Math.round(spacing * 1.35);
  const positions = [
    {side: 'up', direction: -1, x: head.x + head.width + 1, y: head.centerY},
    {side: 'up', direction: -1, x: head.x + head.width - 2, y: head.centerY},
    {side: 'down', direction: 1, x: head.x - 1, y: head.centerY},
    {side: 'down', direction: 1, x: head.x + 1, y: head.centerY}
  ];
  let best = null;
  for (const position of positions) {
    const run = verticalRun(binary, width, height, position.x, position.y, position.direction, maximum);
    if (run >= minimum && (!best || run > best.length)) best = {...position, length: run};
  }
  return best;
}

function hasFlagOrBeam(binary, width, height, stem, spacing) {
  if (!stem) return false;
  const endY = stem.y + stem.direction * stem.length;
  const edge = Math.max(2, Math.round(spacing * .25));
  let nearbyInk = 0;
  // Look beside the stem tip; the stem itself is excluded from this count.
  for (let y = Math.round(endY - spacing * .55); y <= Math.round(endY + spacing * .55); y++) {
    for (let x = Math.round(stem.x - spacing * 1.8); x <= Math.round(stem.x + spacing * 1.8); x++) {
      if (Math.abs(x - stem.x) <= edge) continue;
      nearbyInk += ink(binary, width, height, x, y);
    }
  }
  return nearbyInk >= Math.max(5, Math.round(spacing * .55));
}

export function enrichNoteRhythm(binary, width, height, heads, staves) {
  const staffMap = new Map(staves.map(staff => [staff.id, staff]));
  return heads.map(head => {
    const staff = staffMap.get(head.staff), stem = findStem(binary, width, height, head, staff.spacing);
    const flagged = head.kind === 'filled' && hasFlagOrBeam(binary, width, height, stem, staff.spacing);
    // A stem can disappear during staff-line removal. Treat a hollow head as a
    // half note unless the user explicitly changes it, rather than overextending
    // playback by guessing a whole note.
    const durationBeat = head.kind === 'hollow' ? 2 : (flagged ? .5 : 1);
    const rhythmConfidence = head.kind === 'hollow'
      ? (stem ? .76 : .66)
      : (stem ? (flagged ? .63 : .78) : .42);
    // Notes sit on a staff line or space. A filled head without a stem is generally
    // punctuation or text after staff-line removal, so do not play it automatically.
    const gridAligned = head.alignmentError <= .32;
    const structuralEvidence = Boolean(stem);
    const confidence = Math.min(head.confidence, rhythmConfidence) * (gridAligned ? 1 : .55);
    const accepted = head.accepted && gridAligned && structuralEvidence && confidence >= .5;
    return {...head, confidence, accepted, rhythm: {durationBeat, confidence: rhythmConfidence,
      gridAligned, stem: stem ? {side: stem.side, length: stem.length} : null, flagged}};
  });
}
