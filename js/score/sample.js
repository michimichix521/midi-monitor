// A two-page vector PDF generated locally. No fonts or external assets are needed.
// The simple shapes are a demonstration, not a representative OMR accuracy benchmark.
export function samplePDF() {
  const objects = [], add = value => { objects.push(value); return objects.length; };
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add('<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>');
  function ellipse(x, y, rx, ry) {
    const k = .55228475;
    return `${x + rx} ${y} m ${x + rx} ${y + k * ry} ${x + k * rx} ${y + ry} ${x} ${y + ry} c ` +
      `${x - k * rx} ${y + ry} ${x - rx} ${y + k * ry} ${x - rx} ${y} c ` +
      `${x - rx} ${y - k * ry} ${x - k * rx} ${y - ry} ${x} ${y - ry} c ` +
      `${x + k * rx} ${y - ry} ${x + rx} ${y - k * ry} ${x + rx} ${y} c`;
  }
  for (let page = 0; page < 2; page++) {
    const parts = ['0 G 0 g .7 w'];
    const spacing = page ? 10 : 8;
    for (let staff = 0; staff < 2; staff++) {
      const bottom = 670 - staff * 160;
      for (let line = 0; line < 5; line++) parts.push(`55 ${bottom + line * spacing} m 540 ${bottom + line * spacing} l S`);
      for (let n = 0; n < 8; n++) {
        const x = 115 + n * 52, y = bottom + ((n + staff + page) % 9) * spacing / 2;
        const hollow = n === 2 || n === 6;
        if (n !== 6) parts.push(`.9 w ${x + spacing * .62} ${y} m ${x + spacing * .62} ${y + spacing * 3.2} l S`);
        parts.push(`${hollow ? '1 g 1.2 w' : '0 g'} ${ellipse(x, y, spacing * .65, spacing * .43)} ${hollow ? 'B' : 'f'} 0 g`);
      }
    }
    const content = parts.join('\n');
    const contentId = objects.length + 2;
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> /Contents ${contentId} 0 R >>`);
    add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  }
  let pdf = '%PDF-1.4\n', offsets = [0];
  objects.forEach((object, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
