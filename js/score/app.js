import {ScorePDF} from './pdf.js';
import {ScoreView, renderInspector} from './ui.js?v=6';
import {initLanguage, t} from './i18n.js';
import {samplePDF} from './sample.js';
import {prepareScore, buildPlaybackEvents} from './pitch.js?v=8';
import {ScorePlayer} from './playback.js?v=2';
import {ScoreMidiInput} from './midi-input.js';
import {PerformanceJudge} from './judge.js';
import {readMidiScore, synchronizeHands} from './midi-file.js?v=2';

// Turn off to start with an unobstructed score; the UI can override this setting.
const DEBUG = true;
const $ = id => document.getElementById(id);
const pdf = new ScorePDF(), view = new ScoreView($('page-canvas'), $('overlay-canvas'));
let source = null, result = null, selected = null, worker = null, busy = false;
const pageSources = new Map();
const pagePreviews = new Map();
let currentPage = 1, pageCount = 0, fileName = '', isSample = false;
let statusKey = 'PDFを選択するか、サンプルを開いてください。', statusValues = {}, statusError = false;
let clefs = {}, events = [], isPlaying = false, addingNote = false, activeNote = null;
const pageAnalyses = new Map();
let midiConnected = false, judge = null, judging = false;
let importedMidiScore = null;
const midi = new ScoreMidiInput(handleMidi, names => {
  midiConnected = names.length > 0;
  $('midi-status').textContent = names.length ? `${t('MIDI接続済み')}：${names.join(', ')}` : t('MIDI入力が見つかりません');
  controls();
});
const player = new ScorePlayer(playing => { isPlaying = playing; if (!playing) { activeNote = null; draw(); drawAllPreviewOverlays(); } controls(); });

function status(key, values = {}, error = false) {
  statusKey = key; statusValues = values; statusError = error;
  $('status').textContent = t(key, values); $('status').classList.toggle('error', error);
}
function controls() {
  $('pdf-file').disabled = busy; $('sample').disabled = busy;
  $('analyze').disabled = busy || !source;
  $('analyze-all').disabled = busy || !pageCount;
  $('previous').disabled = busy || currentPage <= 1 || !pageCount;
  $('next').disabled = busy || currentPage >= pageCount;
  $('page-number').disabled = busy || !pageCount;
  $('page-number').value = currentPage; $('page-number').max = Math.max(1, pageCount);
  $('page-count').textContent = `/ ${pageCount}`;
  $('view').disabled = !result;
  $('export').disabled = busy || !result;
  $('add-note').disabled = busy || !result;
  $('play').disabled = busy || isPlaying || !events.length;
  $('stop').disabled = !isPlaying;
  $('export-score').disabled = busy || !events.length;
  $('midi-connect').disabled = busy;
  $('judge-start').disabled = busy || judging || !midiConnected || !events.length;
  $('judge-finish').disabled = !judging;
  $('analysis-settings').disabled = busy;
  $('cancel').hidden = !worker;
  $('canvas-scroll').setAttribute('aria-busy', String(busy));
  const adaptive = $('threshold-mode').value === 'adaptive';
  $('radius').disabled = !adaptive; $('offset').disabled = !adaptive;
}
function gradingThresholds() {
  return {perfect: Number($('perfect-ms').value), great: Number($('great-ms').value), good: Number($('good-ms').value)};
}
function handleMidi(type, note) {
  if (!judging || !judge) return;
  const outcome = type === 'on' ? judge.on(note) : (judge.off(note), null);
  if (outcome) $('judge-feedback').textContent = outcome.extra ? t('EXTRA NOTE') : outcome.grade;
}
function finishJudging() {
  if (!judge) return;
  const score = judge.finish(); judging = false;
  $('score-total').textContent = String(score.total); $('pitch-score').textContent = `${Math.round(score.pitch)}%`;
  $('timing-score').textContent = `${Math.round(score.timing)}%`; $('duration-score').textContent = `${Math.round(score.duration)}%`;
  $('extra-count').textContent = String(score.extra);
  $('grade-counts').textContent = `PERFECT ${score.counts.PERFECT} · GREAT ${score.counts.GREAT} · GOOD ${score.counts.GOOD} · MISS ${score.counts.MISS}`;
  $('judge-stats').textContent = `${t('平均タイミング誤差')} ${Math.round(score.averageError)} ms · ${t('最大タイミング誤差')} ${Math.round(score.maximumError)} ms · ${t('演奏ノート数')} ${score.played} / ${t('正解ノート数')} ${score.expected}`;
  $('judge-results').hidden = false; $('judge-feedback').textContent = t('採点結果'); controls();
}
function draw() {
  view.draw(source, result, {mode: $('view').value, debug: $('debug').checked,
    staves: $('show-staves').checked, lines: $('show-lines').checked, components: $('show-components').checked,
    projection: $('show-projection').checked, heads: $('show-heads').checked,
    showLowConfidence: $('show-low-confidence').checked, notes: result?.playNotes || []}, activeNote?.page === currentPage ? activeNote.id : selected);
}
function drawPreviewOverlay(page, analysis) {
  const preview = pagePreviews.get(page);
  if (!preview || !analysis) return;
  const composite = document.createElement('canvas'); composite.className = 'composite-page';
  composite.width = analysis.width; composite.height = analysis.height;
  const ctx = composite.getContext('2d'), notes = new Map((analysis.playNotes || []).map(note => [note.id, note]));
  ctx.drawImage(pageSources.get(page), 0, 0);
  ctx.lineWidth = 2; ctx.font = '16px sans-serif';
  for (const staff of analysis.staves) {
    ctx.strokeStyle = '#e74654aa';
    for (const line of staff.lines) { ctx.beginPath(); ctx.moveTo(staff.left, line.y); ctx.lineTo(staff.right, line.y); ctx.stroke(); }
  }
  for (const head of analysis.heads) {
    if (!head.accepted) continue;
    const note = notes.get(head.id), active = activeNote?.page === page && activeNote.id === head.id;
    ctx.strokeStyle = active ? '#165aca' : '#008b87'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = active ? 4 : 2;
    ctx.strokeRect(head.x - 3, head.y - 3, head.width + 6, head.height + 6);
    ctx.fillText(note ? `${head.id} · ${note.step}${note.octave}` : String(head.id), head.x, head.y - 7);
    if (head.detectedAccidental) { ctx.fillStyle = '#8d54c8'; ctx.fillText(head.detectedAccidental.value > 0 ? '♯' : '?♭', head.x - 14, head.y + head.height + 14); }
  }
  for (const rest of analysis.rests || []) {
    ctx.strokeStyle = '#6c6478'; ctx.lineWidth = 2; ctx.strokeRect(rest.x - 2, rest.y - 2, rest.width + 4, rest.height + 4);
    ctx.fillStyle = '#6c6478'; ctx.fillText(`rest ${rest.durationBeat}`, rest.x, rest.y - 6);
  }
  preview.querySelector('.preview-canvas').replaceChildren(composite);
}
function drawAllPreviewOverlays() {
  for (const [page, analysis] of pageAnalyses) if (page !== 1) drawPreviewOverlay(page, analysis);
}
function updateScore() {
  if (importedMidiScore) {
    const sourceEvents = $('sync-midi-hands').checked ? synchronizeHands(importedMidiScore).events : importedMidiScore.events;
    events = sourceEvents.map(event => ({...event, notes: event.notes.filter(note => note.hand === 'right' ? $('include-right').checked : $('include-left').checked)})).filter(event => event.notes.length);
    $('tempo').value = importedMidiScore.tempo;
    renderPlayback(); controls(); return;
  }
  if (!result) { events = []; renderPlayback(); return; }
  result.playNotes = prepareScore(result, clefs, currentPage, $('key-signature').value);
  pageAnalyses.set(currentPage, result);
  let offset = 0; events = [];
  for (const [pageNumber, page] of [...pageAnalyses].sort((a, b) => a[0] - b[0])) {
    page.playNotes = prepareScore(page, clefs, pageNumber, $('key-signature').value).map(note => ({...note, page: pageNumber}));
    const selectedHands = page.playNotes.filter(note => (note.hand === 'right' ? $('include-right').checked : $('include-left').checked));
    const pageEvents = buildPlaybackEvents(selectedHands, page.staves, page.measures, Number($('chord-tolerance').value), page.rests || []);
    events.push(...pageEvents.map(event => ({...event, startBeat: event.startBeat + offset})));
    offset += pageEvents.length ? Math.max(...pageEvents.map(event => event.startBeat + event.durationBeat)) : 0;
  }
  renderInspector(result, selected, choose, updateHead); renderPlayback(); draw(); drawAllPreviewOverlays(); controls();
}
function choose(id) { selected = id; renderInspector(result, selected, choose, updateHead); draw(); }
function updateHead(id, changes) {
  const head = result?.heads.find(item => item.id === id);
  if (!head) return;
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) delete head[key]; else head[key] = value;
  }
  updateScore();
}
function renderPlayback() {
  const notes = (pageAnalyses.size ? [...pageAnalyses.values()].flatMap(page => page.playNotes || []) : (result?.playNotes || [])).filter(note => note.hand === 'right' ? $('include-right').checked : $('include-left').checked);
  $('playable-count').textContent = notes.filter(note => note.included).length || '—';
  $('event-count').textContent = events.length || '—';
  $('estimated-beats').textContent = events.length ? Math.max(...events.map(event => event.startBeat + event.durationBeat)).toFixed(2) : '—';
  $('clefs').replaceChildren();
  for (const staff of result?.staves || []) {
    const label = document.createElement('label'), text = document.createElement('span'), select = document.createElement('select');
    text.textContent = `${t('五線')} ${staff.id} · ${t('音部記号')}`;
    select.append(new Option(t('ト音記号'), 'treble'), new Option(t('ヘ音記号'), 'bass'));
    select.value = clefs[`${currentPage}:${staff.id}`] || (staff.id % 2 ? 'treble' : 'bass');
    select.addEventListener('change', () => { clefs[`${currentPage}:${staff.id}`] = select.value; updateScore(); });
    label.append(text, select); $('clefs').append(label);
  }
  $('playback-status').textContent = result ? t('推定音高は要確認') : '';
}
function refreshText() {
  status(statusKey, statusValues, statusError);
  $('filename').textContent = isSample ? t('サンプル楽譜（2ページ）') : fileName;
  renderInspector(result, selected, choose, updateHead); renderPlayback(); draw();
}
function resetPage() {
  source = null; result = null; selected = null;
  addingNote = false; player.stop();
  view.lastSource = null; view.lastResult = null;
  $('all-pages').hidden = true; $('placeholder').hidden = false; $('additional-pages').replaceChildren();
  $('page-canvas').width = 0; $('page-canvas').height = 0;
  $('overlay-canvas').width = 0; $('overlay-canvas').height = 0;
  $('view').value = 'original';
  renderInspector(null, null, choose, updateHead); renderPlayback();
}
function pdfError(error) {
  status(error.name === 'PasswordException' ? 'パスワード付きPDFには未対応です。パスワードのないPDFを選択してください。' :
    'PDFを表示できませんでした。ファイル形式とネット接続を確認してください。', {}, true);
}
async function renderPage(pageNumber) {
  resetPage();
  status('{page}ページ目を表示しています…', {page: pageNumber});
  source = pageSources.get(pageNumber) || await pdf.render(pageNumber);
  currentPage = pageNumber;
  result = pageAnalyses.get(pageNumber) || null;
  $('placeholder').hidden = true; $('all-pages').hidden = false;
  $('canvas-scroll').scrollTop = 0; $('canvas-scroll').scrollLeft = 0;
  draw(); if (result) updateScore();
  status('{page} / {count}ページを表示しました。「このページを解析」を押してください。', {page: currentPage, count: pageCount});
}
async function renderAllPages() {
  pageSources.clear(); pagePreviews.clear(); $('additional-pages').replaceChildren();
  status('全{count}ページを表示しています…', {count: pageCount});
  for (let page = 1; page <= pageCount; page++) {
    const canvas = await pdf.render(page); pageSources.set(page, canvas);
    if (page === 1) { source = canvas; continue; }
    const preview = document.createElement('section'); preview.className = 'page-preview'; pagePreviews.set(page, preview);
    const label = document.createElement('p'); label.textContent = `${t('ページ')} ${page} / ${pageCount}`;
    const holder = document.createElement('div'); holder.className = 'preview-canvas'; holder.append(canvas);
    preview.append(label, holder); $('additional-pages').append(preview);
  }
  currentPage = 1; result = pageAnalyses.get(1) || null; selected = null;
  $('placeholder').hidden = true; $('all-pages').hidden = false; $('canvas-scroll').scrollTop = 0;
  draw(); if (result) updateScore();
  status('全{count}ページを縦に表示しました。「楽譜を解析」を押してください。', {count: pageCount});
}
async function loadPDF(bytes, name, sample = false) {
  busy = true; pageCount = 0; currentPage = 1; fileName = name; isSample = sample;
  pageAnalyses.clear(); events = []; clefs = {}; importedMidiScore = null;
  resetPage(); controls(); refreshText(); status('PDFを読み込んでいます…');
  try {
    pageCount = await pdf.open(bytes);
    await renderAllPages();
  } catch (error) { pdfError(error); }
  finally { busy = false; controls(); }
}
$('pdf-file').addEventListener('change', async () => {
  const file = $('pdf-file').files[0];
  if (!file || busy) return;
  const isMidiFile = /\.(mid|midi)$/i.test(file.name) || /midi/i.test(file.type);
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf' && !isMidiFile) { status('PDFまたはMIDIファイルを選択してください。', {}, true); return; }
  if (file.size > 40 * 1024 * 1024) { status('PDFは40 MB以下にしてください。', {}, true); return; }
  busy = true; controls(); status('PDFを読み込んでいます…');
  try {
    const bytes = await file.arrayBuffer();
    if (isMidiFile) {
      resetPage(); pageAnalyses.clear(); importedMidiScore = readMidiScore(bytes); fileName = file.name; isSample = false; pageCount = 0;
      $('tempo').value = importedMidiScore.tempo; $('filename').textContent = file.name;
      status('MIDIを読み込みました：{notes}音、BPM {tempo}。再生または採点できます。', {notes: importedMidiScore.notes.length, tempo: importedMidiScore.tempo});
      updateScore();
    } else await loadPDF(new Uint8Array(bytes), file.name);
  }
  catch (error) { busy = false; controls(); pdfError(error); }
  finally { busy = false; controls(); $('pdf-file').value = ''; }
});
$('sample').addEventListener('click', () => { if (!busy) void loadPDF(samplePDF(), 'sample-score.pdf', true); });
async function goToPage(number) {
  if (busy || !pageCount) return;
  if (!Number.isInteger(number) || number < 1 || number > pageCount || number === currentPage) { $('page-number').value = currentPage; return; }
  busy = true; controls();
  try { await renderPage(number); }
  catch (error) { pdfError(error); }
  finally { busy = false; controls(); }
}
$('previous').addEventListener('click', () => void goToPage(currentPage - 1));
$('next').addEventListener('click', () => void goToPage(currentPage + 1));
$('page-number').addEventListener('change', () => void goToPage(Number($('page-number').value)));

function settings() {
  const number = id => Number($(id).value);
  return {threshold: number('threshold'), adaptive: $('threshold-mode').value === 'adaptive', radius: number('radius'),
    offset: number('offset'), denoise: $('denoise').checked, lineRatio: number('line-ratio'),
    spacingTolerance: number('spacing-tolerance'), minArea: number('min-area'), minConfidence: number('min-confidence')};
}
function finishWorker() { worker?.terminate(); worker = null; busy = false; controls(); }
$('analyze').addEventListener('click', () => {
  if (!source || busy) return;
  for (const input of $('analysis-settings').querySelectorAll('input')) {
    if (!input.disabled && (!input.checkValidity() || (input.type === 'number' && input.value === ''))) {
      $('settings').open = true; input.focus(); input.reportValidity(); status('詳細設定の数値を範囲内で入力してください。', {}, true); return;
    }
  }
  try {
    worker = new Worker(new URL('./analysis-worker.js?v=4', import.meta.url), {type: 'module'});
    busy = true; result = null; selected = null; controls(); choose(null);
    const stages = {preprocess: 'グレースケール化・二値化を行っています…', staves: '五線を検出しています…',
      components: '黒画素の塊を検出しています…', heads: '音符頭の候補を探しています…'};
    worker.onmessage = ({data}) => {
      if (data.type === 'progress') status(stages[data.stage]);
      if (data.type === 'result') {
        result = data.result; finishWorker(); updateScore(); choose(null);
        status('解析完了：五線 {staves}組、音符頭候補 {heads}個。元の楽譜と見比べてください。', {staves: result.staves.length, heads: result.heads.length});
      }
      if (data.type === 'error') { finishWorker(); status('解析に失敗しました。設定を調整して再試行してください。', {}, true); }
    };
    worker.onerror = event => { event.preventDefault(); finishWorker(); status('解析に失敗しました。設定を調整して再試行してください。', {}, true); };
    const image = source.getContext('2d').getImageData(0, 0, source.width, source.height);
    worker.postMessage({rgba: image.data.buffer, width: image.width, height: image.height, settings: settings()}, [image.data.buffer]);
    status(stages.preprocess);
  } catch {
    finishWorker(); status('解析を開始できませんでした。このブラウザーでWeb Workerが利用できるか確認してください。', {}, true);
  }
});
function analyzeCanvas(canvas, page) {
  return new Promise((resolve, reject) => {
    worker = new Worker(new URL('./analysis-worker.js?v=4', import.meta.url), {type: 'module'});
    worker.onmessage = ({data}) => {
      if (data.type === 'progress') status(`${page} / ${pageCount} ${t('解析中')}…`);
      if (data.type === 'result') { worker.terminate(); worker = null; resolve(data.result); }
      if (data.type === 'error') { worker.terminate(); worker = null; reject(new Error(data.message)); }
    };
    worker.onerror = () => { worker?.terminate(); worker = null; reject(new Error('worker')); };
    const image = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    worker.postMessage({rgba: image.data.buffer, width: image.width, height: image.height, settings: settings()}, [image.data.buffer]);
  });
}
$('analyze-all').addEventListener('click', async () => {
  if (busy || !pageCount) return;
  busy = true; controls(); pageAnalyses.clear(); events = [];
  try {
    for (let page = 1; page <= pageCount; page++) {
      status('{page} / {count}ページを解析しています…', {page, count: pageCount});
      const canvas = pageSources.get(page) || await pdf.render(page);
      pageAnalyses.set(page, await analyzeCanvas(canvas, page));
    }
    result = pageAnalyses.get(currentPage) || null; selected = null; updateScore();
    status('全{count}ページを解析し、連続した採点対象にしました。', {count: pageCount});
  } catch {
    status('全ページの解析に失敗しました。設定を調整して再試行してください。', {}, true);
  } finally { worker?.terminate(); worker = null; busy = false; controls(); }
});
$('cancel').addEventListener('click', () => { finishWorker(); status('解析を中止しました。'); });
$('analysis-settings').addEventListener('input', () => {
  $('threshold-value').value = $('threshold').value; controls();
  if (result) status('設定が変わりました。「このページを解析」を押して更新してください。');
});
for (const id of ['view', 'debug', 'show-staves', 'show-lines', 'show-components', 'show-projection', 'show-heads', 'show-low-confidence']) $(id).addEventListener('change', draw);
$('actual-size').addEventListener('change', () => $('canvas-stack').classList.toggle('actual', $('actual-size').checked));
$('tempo').addEventListener('change', () => { if ($('tempo').checkValidity()) renderPlayback(); });
$('chord-tolerance').addEventListener('change', () => { if ($('chord-tolerance').checkValidity()) updateScore(); });
$('key-signature').addEventListener('change', updateScore);
for (const id of ['include-right', 'include-left', 'sync-midi-hands']) $(id).addEventListener('change', updateScore);
$('play').addEventListener('click', async () => {
  if (!events.length || !$('tempo').checkValidity()) return;
  try {
    await player.play(events, Number($('tempo').value), event => {
      const current = event.notes[0];
      activeNote = current ? {page: current.page, id: current.id} : null;
      if (current?.page === currentPage) choose(current.id); else { draw(); drawAllPreviewOverlays(); }
      $('playback-status').textContent = current ? `${t('再生中')} · ${current.step}${current.octave} · MIDI ${current.midi}` : t('再生中');
    });
  } catch { $('playback-status').textContent = t('音声を開始できませんでした'); }
});
$('stop').addEventListener('click', () => { player.stop(); $('playback-status').textContent = t('停止しました'); });
$('midi-connect').addEventListener('click', async () => {
  try { await midi.connect(); }
  catch { $('midi-status').textContent = t('MIDI接続に失敗しました。HTTPS対応ブラウザーで確認してください。'); }
});
$('judge-start').addEventListener('click', () => {
  const thresholds = gradingThresholds();
  if (!(thresholds.perfect <= thresholds.great && thresholds.great <= thresholds.good)) { $('judge-feedback').textContent = t('判定時間を小さい順に設定してください'); return; }
  judge = new PerformanceJudge(events, Number($('tempo').value), thresholds); judge.start(); judging = true;
  $('judge-results').hidden = true; $('judge-feedback').textContent = t('演奏中'); controls();
});
$('judge-finish').addEventListener('click', finishJudging);
$('add-note').addEventListener('click', () => {
  if (!result) return;
  addingNote = !addingNote;
  $('add-note').classList.toggle('primary', addingNote);
  status(addingNote ? '追加する音符頭を楽譜上でクリックしてください。' : '音符の追加を取り消しました。');
});
$('overlay-canvas').addEventListener('click', event => {
  if (!result || (!addingNote && (!$('debug').checked || !$('show-heads').checked))) return;
  const rect = $('overlay-canvas').getBoundingClientRect();
  const x = (event.clientX - rect.left) * result.width / rect.width, y = (event.clientY - rect.top) * result.height / rect.height;
  const padding = Math.max(4, result.width / rect.width * 4);
  if (addingNote) {
    const staff = [...result.staves].sort((a, b) => Math.abs((a.top + a.bottom) / 2 - y) - Math.abs((b.top + b.bottom) / 2 - y))[0];
    if (!staff) return;
    const size = Math.max(5, Math.round(staff.spacing * .75));
    const id = Math.max(0, ...result.heads.map(head => head.id)) + 1;
    result.heads.push({id, staff: staff.id, x: x - size / 2, y: y - size / 3, width: size, height: Math.round(size * .7),
      centerX: x, centerY: y, area: size * size * .55, density: .7, relativeWidth: size / staff.spacing,
      relativeHeight: size * .7 / staff.spacing, alignmentError: 0, kind: 'filled', confidence: 1, accepted: true,
      rhythm: {durationBeat: 1, confidence: 1, gridAligned: true, stem: null, flagged: false}, manual: true});
    addingNote = false; $('add-note').classList.remove('primary'); selected = id; updateScore();
    status('音符を追加しました。MIDI番号・開始拍・長さを確認してください。'); return;
  }
  const nearby = result.heads.filter(head => x >= head.x - padding && x <= head.x + head.width + padding && y >= head.y - padding && y <= head.y + head.height + padding);
  nearby.sort((a, b) => Math.hypot(a.centerX - x, a.centerY - y) - Math.hypot(b.centerX - x, b.centerY - y));
  choose(nearby[0]?.id || null);
});
$('export').addEventListener('click', () => {
  if (!result) return;
  const {width, height, settings, lines, staves, measures, components, truncated, heads, projection} = result;
  const data = {schema: 'midi-monitor.omr-analysis.v1', milestone: 1, fileName, page: currentPage, pageCount,
    width, height, settings, lines, staves, measures, components, truncated, heads, projection: Array.from(projection)};
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = `score-analysis-page-${currentPage}.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('export-score').addEventListener('click', () => {
  if (!events.length) return;
  const timeSignature = importedMidiScore?.timeSignature || {numerator: 4, denominator: 4};
  const data = {tempo: Number($('tempo').value), timeSignature, notes: events.flatMap(event => event.notes.map(note => ({id: note.id, midi: note.midi, startBeat: event.startBeat, durationBeat: note.durationBeat, measure: Math.floor(event.startBeat / timeSignature.numerator) + 1, staff: note.staff, hand: note.hand, confidence: note.confidence})))};
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = `score-playback-page-${currentPage}.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener('pagehide', () => { worker?.terminate(); player.stop(); });
$('debug').checked = DEBUG;
initLanguage(refreshText); controls();
