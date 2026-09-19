// Rhythm hints are intentionally conservative. The user can correct each result in Score Lab.
function ink(binary, width, height, x, y) {
  x = Math.round(x); y = Math.round(y);
  return x >= 0 && x < width && y >= 0 && y < height ? binary[y * width + x] : 0;
}

function verticalRun(binary, width, height, x, y, direction, limit) {
  let run = 0, gaps = 0;
  for (let distance = 0; distance <= limit; distance++) {
    if (ink(binary, width, height, x, y + direction * distance)) { run = distance + 1; gaps = 0; }
    else if (++gaps > 2) break;
  }
  return run;
}

function findStem(binary, width, height, head, spacing) {
  const maximum = Math.round(spacing * 5), minimum = Math.round(spacing * 1.8);
  const positions = [];
  for (const direction of [-1, 1]) for (let offset = .3; offset <= .9; offset += .07) {
    positions.push({side: direction < 0 ? 'up' : 'down', direction,
      x: head.centerX - direction * spacing * offset, y: head.centerY + direction * spacing * .25});
  }
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
    const durationBeat = head.whole ? 4 : (head.kind === 'hollow' ? 2 : (flagged ? .5 : 1));
    const rhythmConfidence = head.kind === 'hollow'
      ? (head.whole ? .66 : (stem ? .76 : .42))
      : (stem ? (flagged ? .63 : .78) : .42);
    // Notes sit on a staff line or space. A crisp filled oval can remain valid
    // when its thin stem is lost in a beam or staff line; weaker shapes still need
    // a stem so finger numbers and printed symbols do not enter playback.
    const gridAligned = head.alignmentError <= .32;
    const structuralEvidence = Boolean(stem) || (head.whole && head.shapeFit >= .84) ||
      (head.kind === 'filled' && head.shapeFit >= .84);
    const confidence = head.confidence * (gridAligned ? 1 : .55) * (structuralEvidence ? 1 : .5);
    const accepted = head.accepted && gridAligned && structuralEvidence && confidence >= .5;
    return {...head, confidence, accepted, rhythm: {durationBeat, confidence: rhythmConfidence,
      gridAligned, stem: stem ? {side: stem.side, length: stem.length} : null, flagged}};
  });
}
