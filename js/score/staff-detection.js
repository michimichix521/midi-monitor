import {horizontalProjection} from './image-processing.js';

export function detectStaves(binary, width, height, {lineRatio = .32, spacingTolerance = .2} = {}) {
  const projection = horizontalProjection(binary, width, height);
  const cutoff = width * lineRatio, candidates = [];
  for (let y = 0; y < height; y++) {
    if (projection[y] < cutoff) continue;
    const top = y;
    let weighted = 0, weight = 0;
    while (y < height && projection[y] >= cutoff) { weighted += y * projection[y]; weight += projection[y]; y++; }
    const bottom = y - 1, center = weighted / weight;
    const row = Math.round(center);
    let left = 0, right = width - 1;
    while (left < width && !binary[row * width + left]) left++;
    while (right > left && !binary[row * width + right]) right--;
    candidates.push({y: center, top, bottom, left, right, strength: weight / ((bottom - top + 1) * width)});
  }
  const staves = [];
  for (let start = 0; start <= candidates.length - 5;) {
    // Beams can create extra projection peaks between genuine staff lines.
    // Follow an evenly spaced lattice rather than taking five consecutive peaks.
    let lines = null;
    for (let second = start + 1; second < Math.min(candidates.length, start + 5); second++) {
      const interval = candidates[second].y - candidates[start].y;
      if (interval < 4 || interval > height / 16) continue;
      const group = [candidates[start], candidates[second]];
      let cursor = second + 1;
      for (let line = 2; line < 5; line++) {
        const target = candidates[start].y + interval * line;
        while (cursor < candidates.length && candidates[cursor].y < target - interval * spacingTolerance) cursor++;
        if (cursor === candidates.length || Math.abs(candidates[cursor].y - target) > interval * spacingTolerance) break;
        group.push(candidates[cursor++]);
      }
      if (group.length === 5) { lines = group; break; }
    }
    if (!lines) { start++; continue; }
    const gaps = lines.slice(1).map((line, i) => line.y - lines[i].y);
    const sorted = [...gaps].sort((a, b) => a - b), spacing = (sorted[1] + sorted[2]) / 2;
    const error = Math.max(...gaps.map(gap => Math.abs(gap - spacing) / spacing));
    const left = Math.max(...lines.map(line => line.left)), right = Math.min(...lines.map(line => line.right));
    const thin = lines.every(line => line.bottom - line.top + 1 <= spacing * .45);
    if (spacing >= 4 && spacing <= height / 16 && error <= spacingTolerance && thin && right - left >= cutoff) {
      staves.push({id: staves.length + 1, lines, top: lines[0].y, bottom: lines[4].y, left, right, spacing,
        confidence: Math.min(.98, .55 + .3 * (1 - error / spacingTolerance) + .15 * lines.reduce((a, l) => a + l.strength, 0) / 5)});
      start = candidates.indexOf(lines[4]) + 1;
    } else start++;
  }
  return {projection, candidates, staves};
}
