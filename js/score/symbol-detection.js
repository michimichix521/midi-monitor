// Conservative symbol recognition. These candidates are deliberately limited to
// the immediate musical area of an accepted head so text and finger numbers do
// not become accidentals or rests.
function componentAt(components, head, spacing) {
  const candidates = components.filter(component => {
    const cx = component.x + component.width / 2, cy = component.y + component.height / 2;
    const gap = head.x - (component.x + component.width);
    return gap >= spacing * .08 && gap <= spacing * 2.1 &&
      Math.abs(cy - head.centerY) <= spacing * 1.35 &&
      component.width >= spacing * .18 && component.width <= spacing * 1.15 &&
      component.height >= spacing * .55 && component.height <= spacing * 2.2 &&
      cx < head.centerX;
  });
  return candidates.sort((a, b) => (head.x - (a.x + a.width)) - (head.x - (b.x + b.width)))[0];
}

function accidentalKind(component, spacing, binary, width) {
  const w = component.width / spacing, h = component.height / spacing;
  const rows = [], columns = [];
  for (let y = component.y; y < component.y + component.height; y++) {
    let ink = 0;
    for (let x = component.x; x < component.x + component.width; x++) ink += binary[y * width + x];
    if (ink >= component.width * .58) rows.push(y);
  }
  for (let x = component.x; x < component.x + component.width; x++) {
    let ink = 0;
    for (let y = component.y; y < component.y + component.height; y++) ink += binary[y * width + x];
    if (ink >= component.height * .5) columns.push(x);
  }
  const separated = values => values.some((value, index) => index && value - values[0] >= Math.max(2, values.length * .18));
  // Apply a sharp only when the component really has two crossing horizontal
  // and vertical strokes. Width/height alone confused text and nearby stems.
  if (w >= .52 && h >= .72 && rows.length >= 2 && columns.length >= 2 && separated(rows) && separated(columns)) {
    return {value: 1, kind: 'sharp', confidence: .88};
  }
  if (w <= .58 && h >= .9) return {value: -1, kind: 'flat-or-natural', confidence: .52};
  return null;
}

export function detectAccidentals(components, heads, staves, binary, width) {
  const staffMap = new Map(staves.map(staff => [staff.id, staff]));
  return heads.map(head => {
    if (!head.accepted) return head;
    const staff = staffMap.get(head.staff), component = componentAt(components, head, staff.spacing);
    const accidental = component && accidentalKind(component, staff.spacing, binary, width);
    // Only a recognizably wide sharp is applied automatically. The narrow forms
    // are surfaced for review rather than silently changing the pitch.
    return accidental ? {...head, detectedAccidental: accidental,
      accidental: accidental.confidence >= .65 ? accidental.value : undefined} : head;
  });
}

export function detectRests(components, heads, staves) {
  const rests = [], staffMap = new Map(staves.map(staff => [staff.id, staff]));
  for (const staff of staves) for (const component of components) {
    const cx = component.x + component.width / 2, cy = component.y + component.height / 2;
    const w = component.width / staff.spacing, h = component.height / staff.spacing;
    if (cx < staff.left + staff.spacing * 4 || cx > staff.right - staff.spacing ||
      cy < staff.top - staff.spacing || cy > staff.bottom + staff.spacing ||
      w < .7 || w > 2.45 || h < .14 || h > .75) continue;
    // Whole/half rests are the only rest shapes reliable enough in this first
    // pass: compact horizontal blocks hanging from, or sitting on, the middle line.
    const middle = (staff.top + staff.bottom) / 2;
    if (Math.abs(cy - middle) > staff.spacing * .72) continue;
    if (heads.some(head => head.staff === staff.id && Math.abs(head.centerX - cx) < staff.spacing * 1.25 && Math.abs(head.centerY - cy) < staff.spacing * 1.1)) continue;
    const kind = cy < middle ? 'whole' : 'half';
    rests.push({staff: staff.id, x: component.x, y: component.y, width: component.width, height: component.height,
      centerX: cx, centerY: cy, durationBeat: kind === 'whole' ? 4 : 2, kind, confidence: .62});
  }
  return rests.sort((a, b) => a.staff - b.staff || a.centerX - b.centerX);
}
