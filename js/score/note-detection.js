// Local silhouettes stay detectable when stems, beams and ledger lines join heads.
function templates(spacing) {
  const list = [];
  for (const [kind, rx, ry, slope] of [
    ['filled', .62, .39, -.32], ['filled', .7, .43, -.24],
    ['hollow', .65, .4, -.32], ['whole', .85, .43, 0], ['whole', .78, .45, 0]
  ]) {
    const core = [], rim = [], outside = [], sides = [];
    for (let y = -Math.ceil(spacing * .85); y <= spacing * .85; y++) {
      for (let x = -Math.ceil(spacing * 1.15); x <= spacing * 1.15; x++) {
        const u = x / (spacing * rx), v = (y - slope * x) / (spacing * ry);
        const r = u * u + v * v;
        if (Math.abs(x) > spacing * rx * 1.35 && Math.abs(y) < spacing * .32) sides.push([x, y]);
        if (kind === 'whole' ? (x - y * .5) ** 2 / (spacing * .24) ** 2 + y ** 2 / (spacing * .32) ** 2 < 1 : r < .3) core.push([x, y]);
        else if (r > .58 && r < .98) rim.push([x, y]);
        else if (r > 1.55 && r < 2.65 && Math.abs(x) < spacing * rx * .8) outside.push([x, y]);
      }
    }
    list.push({kind, rx, ry, core, rim, outside, sides});
  }
  return list;
}

export function detectNoteHeads(cleaned, width, height, staves, minConfidence = .5, original = cleaned) {
  const found = [];
  for (const staff of staves) {
    const s = staff.spacing, models = templates(s), candidates = [];
    const lineRows = new Uint8Array(height);
    for (const line of staff.lines) for (let y = Math.max(0, line.top - 1); y <= Math.min(height - 1, line.bottom + 1); y++) lineRows[y] = 1;
    const sample = (points, cx, cy, ledgerY) => {
      let ink = 0, count = 0;
      for (const [dx, dy] of points) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= width || y < 0 || y >= height || lineRows[y] || (ledgerY !== null && Math.abs(y - ledgerY) <= 1)) continue;
        ink += original[y * width + x]; count++;
      }
      return count ? ink / count : 0;
    };
    // A whole note has no stem. Finger numbers and other print near a staff often
    // resemble its white centre, but normally continue as a vertical stroke above
    // or below the oval. Reject that stroke before accepting a stemless template.
    const hasVerticalTail = (cx, cy) => {
      let ink = 0, total = 0;
      for (const direction of [-1, 1]) for (let distance = Math.ceil(s * .7); distance <= Math.ceil(s * 1.45); distance++) {
        for (let dx = -Math.ceil(s * .24); dx <= Math.ceil(s * .24); dx++) {
          const x = Math.round(cx + dx), y = Math.round(cy + direction * distance);
          if (x < 0 || x >= width || y < 0 || y >= height || lineRows[y]) continue;
          total++; ink += original[y * width + x];
        }
      }
      return total && ink / total > .38;
    };
    // Exclude the clef area, but leave room for early pickup notes.
    for (let step = -6; step <= 14; step++) {
      const gridY = staff.bottom - step * s / 2;
      const ledgerY = (step < 0 || step > 8) && step % 2 === 0 ? Math.round(gridY) : null;
      for (let x = Math.ceil(staff.left + s * 5.5); x < staff.right - s; x += 2) {
        for (const model of models) {
          for (const shift of [-2, -1, 0, 1, 2]) {
            const y = Math.round(gridY + shift);
            const core = sample(model.core, x, y, ledgerY);
            if (model.kind === 'filled' ? core < .88 : core > .45) continue;
            const rim = sample(model.rim, x, y, ledgerY);
            if (rim < (model.kind === 'filled' ? .63 : .65)) continue;
            const outside = sample(model.outside, x, y, ledgerY);
            if (outside > .3 || sample(model.sides, x, y, ledgerY) > .32) continue;
            let beam = false;
            for (let row = y - Math.round(s * .35); row <= y + Math.round(s * .35); row++) {
              if (row < 0 || row >= height || lineRows[row] || !original[row * width + x]) continue;
              let left = x, right = x;
              while (left > 0 && x - left < s * 4 && original[row * width + left - 1]) left--;
              while (right < width - 1 && right - x < s * 4 && original[row * width + right + 1]) right++;
              if (right - left > s * 3.4) { beam = true; break; }
            }
            if (beam) continue;
            if (model.kind === 'whole' && hasVerticalTail(x, y)) continue;
            const fit = .45 * (model.kind === 'filled' ? core : 1 - core) + .35 * rim + .2 * (1 - outside);
            if (fit < .78) continue;
            const w = Math.round(s * model.rx * 2), h = Math.round(s * model.ry * 2);
            candidates.push({staff: staff.id, x: x - w / 2, y: y - h / 2, width: w, height: h,
              centerX: x, centerY: y, area: Math.round(w * h * rim), density: (core + rim) / 2,
              relativeWidth: w / s, relativeHeight: h / s, kind: model.kind === 'filled' ? 'filled' : 'hollow',
              whole: model.kind === 'whole', alignmentError: Math.abs(y - gridY) / (s / 2),
              confidence: Math.min(.94, fit), shapeFit: fit, accepted: fit >= Math.max(.8, minConfidence)});
          }
        }
      }
    }
    // One local maximum per head; vertically adjacent chord tones remain separate.
    candidates.sort((a, b) => b.shapeFit - a.shapeFit);
    const kept = [];
    for (const head of candidates) {
      if (kept.some(other => Math.abs(head.centerX - other.centerX) < s * .8 && Math.abs(head.centerY - other.centerY) < s * .65)) continue;
      kept.push(head);
    }
    found.push(...kept);
  }
  return found.sort((a, b) => a.staff - b.staff || a.centerX - b.centerX || a.centerY - b.centerY).map((head, index) => ({...head, id: index + 1}));
}
