// Analysis images use 1 for black, 0 for white. The source RGBA buffer is never changed.
export function grayscale(rgba) {
  const gray = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < gray.length; i++) {
    const p = i * 4, alpha = rgba[p + 3] / 255;
    gray[i] = Math.round((.299 * rgba[p] + .587 * rgba[p + 1] + .114 * rgba[p + 2]) * alpha + 255 * (1 - alpha));
  }
  return gray;
}

export function binarize(gray, width, height, {threshold = 180, adaptive = false, radius = 18, offset = 12} = {}) {
  const binary = new Uint8Array(gray.length);
  if (!adaptive) {
    for (let i = 0; i < gray.length; i++) binary[i] = gray[i] < threshold ? 1 : 0;
    return binary;
  }
  const stride = width + 1, integral = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      sum += gray[y * width + x];
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + sum;
    }
  }
  for (let y = 0; y < height; y++) {
    const top = Math.max(0, y - radius), bottom = Math.min(height, y + radius + 1);
    for (let x = 0; x < width; x++) {
      const left = Math.max(0, x - radius), right = Math.min(width, x + radius + 1);
      const sum = integral[bottom * stride + right] - integral[top * stride + right]
        - integral[bottom * stride + left] + integral[top * stride + left];
      const mean = sum / ((right - left) * (bottom - top));
      binary[y * width + x] = gray[y * width + x] < Math.min(threshold, mean - offset) ? 1 : 0;
    }
  }
  return binary;
}

// Remove isolated specks, preserving horizontal/vertical strokes and hollow heads.
export function reduceNoise(binary, width, height) {
  const output = binary.slice();
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    if (!binary[i]) continue;
    let neighbors = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx || dy) neighbors += binary[i + dy * width + dx];
    }
    if (neighbors <= 1) output[i] = 0;
  }
  return output;
}

export function horizontalProjection(binary, width, height) {
  const rows = new Uint32Array(height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) rows[y] += binary[y * width + x];
  }
  return rows;
}

export function removeStaffLines(binary, width, height, staves) {
  const output = binary.slice();
  for (const staff of staves) for (const line of staff.lines) {
    const margin = Math.max(2, Math.round(staff.spacing * .2));
    for (let x = staff.left; x <= staff.right; x++) {
      // A vertical crossing or note head has ink beyond the narrow line band.
      let above = 0, below = 0;
      for (let d = 1; d <= margin; d++) {
        if (line.top - d >= 0) above += binary[(line.top - d) * width + x];
        if (line.bottom + d < height) below += binary[(line.bottom + d) * width + x];
      }
      if (above >= Math.ceil(margin / 2) || below >= Math.ceil(margin / 2)) continue;
      for (let y = line.top; y <= line.bottom; y++) output[y * width + x] = 0;
    }
  }
  return output;
}
