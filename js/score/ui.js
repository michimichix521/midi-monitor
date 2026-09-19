import {t} from './i18n.js';

export class ScoreView {
  constructor(canvas, overlay) { this.canvas = canvas; this.overlay = overlay; this.lastSource = null; this.lastResult = null; this.lastMode = null; }
  draw(source, result, options, selected) {
    if (!source) return;
    const mode = result ? options.mode : 'original';
    if (source !== this.lastSource || result !== this.lastResult || mode !== this.lastMode) {
      this.canvas.width = source.width; this.canvas.height = source.height;
      this.overlay.width = source.width; this.overlay.height = source.height;
      const ctx = this.canvas.getContext('2d');
      if (mode === 'original') ctx.drawImage(source, 0, 0);
      else {
        const bytes = result[mode], image = ctx.createImageData(source.width, source.height);
        for (let i = 0; i < bytes.length; i++) {
          const value = mode === 'gray' ? bytes[i] : bytes[i] ? 0 : 255;
          image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = value;
          image.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(image, 0, 0);
      }
      this.lastSource = source; this.lastResult = result; this.lastMode = mode;
    }
    const ctx = this.overlay.getContext('2d'), {width, height} = source;
    ctx.clearRect(0, 0, width, height);
    if (!result || !options.debug) return;
    const colors = getComputedStyle(document.documentElement);
    const color = name => colors.getPropertyValue(name).trim();
    ctx.save(); ctx.lineWidth = 2; ctx.font = '16px sans-serif';
    if (options.projection) {
      ctx.fillStyle = '#8854cb66';
      const maximum = Math.max(1, ...result.projection);
      for (let y = 0; y < height; y++) {
        const length = result.projection[y] / maximum * Math.min(180, width * .15);
        ctx.fillRect(width - length, y, length, 1);
      }
    }
    if (options.lines) {
      ctx.strokeStyle = '#e59322'; ctx.globalAlpha = .55; ctx.setLineDash([8, 6]);
      for (const line of result.lines) { ctx.beginPath(); ctx.moveTo(line.left, line.y); ctx.lineTo(line.right, line.y); ctx.stroke(); }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    if (options.staves) for (const staff of result.staves) {
      ctx.fillStyle = color('--staff'); ctx.globalAlpha = .08;
      ctx.fillRect(staff.left, staff.top - staff.spacing, staff.right - staff.left, staff.spacing * 6);
      ctx.strokeStyle = color('--staff'); ctx.globalAlpha = .65;
      ctx.strokeRect(staff.left, staff.top - staff.spacing, staff.right - staff.left, staff.spacing * 6);
      for (const line of staff.lines) { ctx.beginPath(); ctx.moveTo(staff.left, line.y); ctx.lineTo(staff.right, line.y); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.fillText(`#${staff.id} · ${staff.spacing.toFixed(1)} px`, staff.left, Math.max(18, staff.top - staff.spacing - 6));
    }
    if (options.components) {
      ctx.strokeStyle = color('--component'); ctx.globalAlpha = .5; ctx.lineWidth = 1;
      for (const box of result.components.slice(0, 5000)) ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.globalAlpha = 1;
    }
    const notesById = new Map((options.notes || []).map(note => [note.id, note]));
    if (options.heads) for (const head of result.heads) {
      if (!head.accepted && !options.showLowConfidence && head.id !== selected) continue;
      ctx.strokeStyle = head.id === selected ? '#165aca' : color(head.accepted ? '--head' : '--low');
      ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = head.id === selected ? 4 : 2;
      ctx.strokeRect(head.x - 3, head.y - 3, head.width + 6, head.height + 6);
      const note = notesById.get(head.id);
      ctx.fillText(note ? `${head.id} · ${note.step}${note.octave}` : String(head.id), head.x, head.y - 7);
    }
    ctx.restore();
  }
}

export function renderInspector(result, selected, choose, updateHead = () => {}) {
  const $ = id => document.getElementById(id);
  $('staff-count').textContent = result ? result.staves.length : '—';
  $('component-count').textContent = result ? result.components.length : '—';
  $('head-count').textContent = result ? result.heads.length : '—';
  $('accepted-count').textContent = result ? result.heads.filter(head => head.accepted).length : '—';
  $('staff-list').replaceChildren(); $('warnings').replaceChildren();
  for (const staff of result?.staves || []) {
    const item = document.createElement('li'); item.textContent = t('五線 {id}：{spacing} px・信頼度 {confidence}', {id: staff.id, spacing: staff.spacing.toFixed(1), confidence: staff.confidence.toFixed(2)});
    $('staff-list').append(item);
  }
  const warnings = [];
  if (result && !result.staves.length) warnings.push('五線が見つかりません。詳細設定を調整してください。斜めの五線や短い五線は検出できないことがあります。');
  else if (result && !result.heads.length) warnings.push('音符頭の候補が見つかりません。二値化画像と五線除去後の画像を確認してください。');
  if (result?.truncated) warnings.push('塊が多いため検出を30,000個で打ち切りました。しきい値や最小面積を調整してください。');
  if (result?.components.length > 5000) warnings.push('表示負荷を抑えるため、塊の枠は先頭5,000個だけ表示します。');
  for (const warning of warnings) { const p = document.createElement('p'); p.textContent = t(warning); $('warnings').append(p); }
  const options = [new Option(t(result?.heads.length ? '候補を選択してください' : '候補なし'), '')];
  for (const head of result?.heads || []) options.push(new Option(`#${head.id} · ${t(head.kind === 'hollow' ? '白い音符頭候補' : '黒い音符頭候補')} · ${head.confidence.toFixed(2)}`, head.id));
  $('candidate').replaceChildren(...options); $('candidate').disabled = !result?.heads.length;
  $('candidate').value = selected || '';
  $('candidate').onchange = () => choose(Number($('candidate').value) || null);
  $('candidate-detail').replaceChildren();
  const head = result?.heads.find(item => item.id === selected);
  const note = result?.playNotes?.find(item => item.id === selected);
  if (!head) return;
  const rows = [['五線番号', head.staff], ['信頼度', head.confidence.toFixed(2)],
    ['形状', t(head.kind === 'hollow' ? '白い音符頭候補' : '黒い音符頭候補')],
    ['位置', `${head.centerX.toFixed(1)}, ${head.centerY.toFixed(1)}`], ['幅 × 高さ', `${head.width} × ${head.height} px`],
    ['黒画素密度', head.density.toFixed(2)], ['幅 / 五線間隔', head.relativeWidth.toFixed(2)], ['高さ / 五線間隔', head.relativeHeight.toFixed(2)],
    ['音価の推定', `${note?.rhythm?.durationBeat ?? '—'} ${t('拍')} · ${t(note?.rhythm?.flagged ? '旗・連桁あり' : '旗・連桁なし')}`]];
  const list = document.createElement('dl');
  for (const [key, value] of rows) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = t(key); dd.textContent = value; list.append(dt, dd); }
  $('candidate-detail').append(list);
  if (!note) return;
  const editor = document.createElement('div'); editor.className = 'candidate-editor';
  const midi = document.createElement('input'); midi.type = 'number'; midi.min = '0'; midi.max = '127'; midi.value = String(note.midi);
  const start = document.createElement('input'); start.type = 'number'; start.min = '0'; start.max = '999'; start.step = '.125'; start.placeholder = t('自動'); start.value = note.startBeat ?? '';
  const duration = document.createElement('input'); duration.type = 'number'; duration.min = '.125'; duration.max = '16'; duration.step = '.125'; duration.value = String(note.durationBeat);
  const included = document.createElement('input'); included.type = 'checkbox'; included.checked = note.included;
  const field = (label, input) => { const row = document.createElement('label'), text = document.createElement('span'); text.textContent = t(label); row.append(text, input); return row; };
  editor.append(field('推定MIDI番号', midi), field('推定音名', Object.assign(document.createElement('output'), {textContent: `${note.step}${note.octave}`})), field('開始拍（空欄で自動）', start), field('長さ（拍）', duration));
  const toggle = document.createElement('label'); toggle.className = 'check'; const text = document.createElement('span'); text.textContent = t('再生に含める'); toggle.append(included, text); editor.append(toggle);
  const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'secondary'; reset.textContent = t('推定値に戻す'); editor.append(reset);
  const save = () => updateHead(head.id, {midi: Number(midi.value), startBeat: start.value === '' ? null : Number(start.value), durationBeat: Number(duration.value), included: included.checked});
  midi.addEventListener('change', save); start.addEventListener('change', save); duration.addEventListener('change', save); included.addEventListener('change', save);
  reset.addEventListener('click', () => updateHead(head.id, {midi: null, startBeat: null, durationBeat: null, included: true}));
  $('candidate-detail').append(editor);
}
