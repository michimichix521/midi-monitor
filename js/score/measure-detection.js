// Detect vertical barlines shared by the staves in a piano system. This is a
// timing aid, not a complete barline recognizer: when it cannot find a stable
// set of bars, playback falls back to the staff's inferred note durations.
function staffSystems(staves) {
  const ordered = [...staves].sort((a, b) => a.top - b.top), groups = [];
  let current = [];
  for (const staff of ordered) {
    const previous = current[current.length - 1];
    if (previous && staff.top - previous.bottom > Math.max(staff.spacing, previous.spacing) * 14) {
      groups.push(current); current = [];
    }
    current.push(staff);
  }
  if (current.length) groups.push(current);
  return groups;
}

function verticalCoverage(binary, width, staff, x) {
  let ink = 0, total = 0;
  for (let y = Math.floor(staff.top); y <= Math.ceil(staff.bottom); y++) {
    total++;
    for (let dx = -1; dx <= 1; dx++) {
      if (x + dx >= 0 && x + dx < width && binary[y * width + x + dx]) { ink++; break; }
    }
  }
  return ink / Math.max(1, total);
}

export function detectMeasures(binary, width, staves) {
  return staffSystems(staves).map((systemStaves, system) => {
    const left = Math.ceil(Math.max(...systemStaves.map(staff => staff.left)));
    const right = Math.floor(Math.min(...systemStaves.map(staff => staff.right)));
    const spacing = systemStaves.reduce((sum, staff) => sum + staff.spacing, 0) / systemStaves.length;
    const candidates = [];
    for (let x = left; x <= right; x++) {
      const shared = systemStaves.filter(staff => verticalCoverage(binary, width, staff, x) >= .76).length;
      if (shared >= Math.min(2, systemStaves.length)) candidates.push(x);
    }
    const bars = [];
    for (let index = 0; index < candidates.length;) {
      const group = [candidates[index++]];
      while (index < candidates.length && candidates[index] <= group[group.length - 1] + 2) group.push(candidates[index++]);
      const center = Math.round(group.reduce((sum, x) => sum + x, 0) / group.length);
      if (center > left + spacing * 1.5 && center < right - spacing * 1.5) bars.push(center);
    }
    return {system, staffIds: systemStaves.map(staff => staff.id), boundaries: [left, ...bars, right]};
  });
}
