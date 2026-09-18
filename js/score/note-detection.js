import {connectedComponents} from './components.js';

// Remove long, thin stems from a SECOND copy to separate heads from beams.
// We retain horizontally broad strokes, including hollow heads' top/bottom edges.
function headMask(binary, width, height, spacing) {
  const mask = binary.slice(), minStem = Math.round(spacing * 2), side = Math.max(2, Math.round(spacing * .25));
  for (let x = 0; x < width; x++) for (let y = 0; y < height; y++) {
    if (!binary[y * width + x]) continue;
    const top = y;
    while (y < height && binary[y * width + x]) y++;
    if (y - top < minStem) continue;
    for (let row = top; row < y; row++) {
      const i = row * width + x;
      let broad = false;
      // A hollow head's opposite edge may lie across a white interior.
      // Preserve it instead of treating the attached outer edge as a bare stem.
      for (let offset = side; offset <= Math.ceil(spacing * 1.5) && !broad; offset++) {
        broad = (x >= offset && binary[i - offset]) || (x + offset < width && binary[i + offset]);
      }
      if (!broad) mask[i] = 0;
    }
  }
  return mask;
}

function hasHole(mask, width, height, box) {
  // A white region enclosed by ink is evidence of an open note head.
  const bw = box.width, bh = box.height, seen = new Uint8Array(bw * bh), queue = [];
  const black = (x, y) => mask[(box.y + y) * width + box.x + x];
  function add(x, y) {
    const i = y * bw + x;
    if (!seen[i] && !black(x, y)) { seen[i] = 1; queue.push(i); }
  }
  for (let x = 0; x < bw; x++) { add(x, 0); add(x, bh - 1); }
  for (let y = 0; y < bh; y++) { add(0, y); add(bw - 1, y); }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head], x = i % bw, y = Math.floor(i / bw);
    if (x > 0) add(x - 1, y); if (x + 1 < bw) add(x + 1, y);
    if (y > 0) add(x, y - 1); if (y + 1 < bh) add(x, y + 1);
  }
  let holes = 0;
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (!black(x, y) && !seen[y * bw + x]) holes++;
  return holes / (bw * bh) >= .045;
}

export function detectNoteHeads(binary, width, height, staves, minConfidence = .5) {
  const candidates = [];
  // Work in separate staff crops so each uses its own estimated scale.
  for (const staff of staves) {
    const spacing = staff.spacing;
    const x0 = Math.max(0, staff.left), y0 = Math.max(0, Math.floor(staff.top - spacing * 3));
    const cropWidth = Math.min(width - x0, staff.right - staff.left + 1);
    const cropHeight = Math.min(height - y0, Math.ceil(staff.bottom + spacing * 3) - y0 + 1);
    const crop = new Uint8Array(cropWidth * cropHeight);
    for (let y = 0; y < cropHeight; y++) crop.set(binary.subarray((y0 + y) * width + x0, (y0 + y) * width + x0 + cropWidth), y * cropWidth);
    const mask = headMask(crop, cropWidth, cropHeight, spacing);
    const {components} = connectedComponents(mask, cropWidth, cropHeight, Math.max(4, Math.round(spacing * spacing * .07)));
    for (const box of components) {
      const relativeWidth = box.width / spacing, relativeHeight = box.height / spacing;
      const aspect = box.width / box.height;
      if (relativeWidth < .65 || relativeWidth > 2 || relativeHeight < .45 || relativeHeight > 1.45 || aspect < .8 || aspect > 2.7) continue;
      if (box.density < .2 || box.density > .94) continue;
      const hollow = hasHole(mask, cropWidth, cropHeight, box);
      if (!hollow && box.density < .43) continue;
      const x = x0 + box.x, y = y0 + box.y;
      const centerX = x + (box.width - 1) / 2, centerY = y + (box.height - 1) / 2;
      // Prefer the closest staff if ledger-line areas overlap.
      const distance = s => Math.max(s.top - centerY, 0, centerY - s.bottom);
      if (staves.some(other => other.id !== staff.id && distance(other) < distance(staff))) continue;
      const shape = Math.max(0, 1 - Math.abs(relativeWidth - 1.25) / 1.25) *
        Math.max(0, 1 - Math.abs(relativeHeight - .85) / .85);
      const steps = (staff.bottom - centerY) / (spacing / 2);
      const alignmentError = Math.abs(steps - Math.round(steps));
      const alignment = 1 - Math.min(1, alignmentError * 2);
      const confidence = Math.min(.85, .28 + .34 * shape + .13 * alignment + .1 * staff.confidence);
      candidates.push({id: candidates.length + 1, staff: staff.id, x, y, width: box.width, height: box.height,
        centerX, centerY, area: box.area, density: box.density, relativeWidth, relativeHeight,
        kind: hollow ? 'hollow' : 'filled', alignmentError, confidence, accepted: confidence >= minConfidence});
    }
  }
  return candidates.sort((a, b) => a.staff - b.staff || a.centerX - b.centerX).map((head, index) => ({...head, id: index + 1}));
}
