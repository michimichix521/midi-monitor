// Eight-connected flood fill; mark on enqueue so each pixel is visited once.
export function connectedComponents(binary, width, height, minArea = 5, maxComponents = 30000) {
  const visited = new Uint8Array(binary.length), queue = new Int32Array(binary.length), components = [];
  let truncated = false;
  for (let origin = 0; origin < binary.length; origin++) {
    if (!binary[origin] || visited[origin]) continue;
    let head = 0, tail = 1, area = 0, sumX = 0, sumY = 0;
    let left = width, right = 0, top = height, bottom = 0;
    queue[0] = origin; visited[origin] = 1;
    while (head < tail) {
      const index = queue[head++], x = index % width, y = Math.floor(index / width);
      area++; sumX += x; sumY += y;
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if ((!dx && !dy) || nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (binary[next] && !visited[next]) { visited[next] = 1; queue[tail++] = next; }
      }
    }
    if (area < minArea) continue;
    const component = {id: components.length + 1, x: left, y: top, width: right - left + 1, height: bottom - top + 1,
      area, centerX: sumX / area, centerY: sumY / area};
    component.density = area / (component.width * component.height);
    components.push(component);
    if (components.length >= maxComponents) { truncated = true; break; }
  }
  return {components, truncated};
}
