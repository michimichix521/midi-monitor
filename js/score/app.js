import {ScorePDF} from './pdf.js';
import {ScoreView, renderInspector} from './ui.js?v=6';
import {initLanguage, t} from './i18n.js';
import {samplePDF} from './sample.js';
import {prepareScore, buildPlaybackEvents, scoreDataFromNotes} from './pitch.js?v=6';
import {ScorePlayer} from './playback.js';

// Turn off to start with an unobstructed score; the UI can override this setting.
const DEBUG = true;
const $ = id => document.getElementById(id);
const pdf = new ScorePDF(), view = new ScoreView($('page-canvas'), $('overlay-canvas'));
let source = null, result = null, selected = null, worker = null, busy = false;
let currentPage = 1, pageCount = 0, fileName = '', isSample = false;
let statusKey = 'PDFを選択するか、サンプルを開いてください。', statusValues = {}, statusError = false;
let clefs = {}, events = [], isPlaying = false, addingNote = false;
const player = new ScorePlayer(playing => { isPlaying = playing; controls(); });

function status(key, values = {}, error = false) {
  statusKey = key; statusValues = values; statusError = error;
  $('status').textContent = t(key, values); $('status').classList.toggle('error', error);
}
function controls() {
  $('pdf-file').disabled = busy; $('sample').disabled = busy;
  $('analyze').disabled = busy || !source;
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
  $('analysis-settings').disabled = busy;
  $('cancel').hidden = !worker;
  $('canvas-scroll').setAttribute('aria-busy', String(busy));
  const adaptive = $('threshold-mode').value === 'adaptive';
  $('radius').disabled = !adaptive; $('offset').disabled = !adaptive;
}
function draw() {
  view.draw(source, result, {mode: $('view').value, debug: $('debug').checked,
    staves: $('show-staves').checked, lines: $('show-lines').checked, components: $('show-components').checked,
    projection: $('show-projection').checked, heads: $('show-heads').checked,
    showLowConfidence: $('show-low-confidence').checked, notes: result?.playNotes || []}, selected);
}
function updateScore() {
  if (!result) { events = []; renderPlayback(); return; }
  result.playNotes = prepareScore(result, clefs);
  events = buildPlaybackEvents(result.playNotes, result.staves, Number($('chord-tolerance').value));
  renderInspector(result, selected, choose, updateHead); renderPlayback(); draw(); controls();
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
  const notes = result?.playNotes || [];
  $('playable-count').textContent = notes.filter(note => note.included).length || '—';
  $('event-count').textContent = events.length || '—';
  $('estimated-beats').textContent = events.length ? Math.max(...events.map(event => event.startBeat + event.durationBeat)).toFixed(2) : '—';
  $('clefs').replaceChildren();
  for (const staff of result?.staves || []) {
    const label = document.createElement('label'), text = document.createElement('span'), select = document.createElement('select');
    text.textContent = `${t('五線')} ${staff.id} · ${t('音部記号')}`;
    select.append(new Option(t('ト音記号'), 'treble'), new Option(t('ヘ音記号'), 'bass'));
    select.value = clefs[staff.id] || (staff.id % 2 ? 'treble' : 'bass');
    select.addEventListener('change', () => { clefs[staff.id] = select.value; updateScore(); });
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
  events = []; clefs = {}; addingNote = false; player.stop();
  view.lastSource = null; view.lastResult = null;
  $('canvas-stack').hidden = true; $('placeholder').hidden = false;
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
  source = await pdf.render(pageNumber);
  currentPage = pageNumber;
  $('placeholder').hidden = true; $('canvas-stack').hidden = false;
  $('canvas-scroll').scrollTop = 0; $('canvas-scroll').scrollLeft = 0;
  draw();
  status('{page} / {count}ページを表示しました。「このページを解析」を押してください。', {page: currentPage, count: pageCount});
}
async function loadPDF(bytes, name, sample = false) {
  busy = true; pageCount = 0; currentPage = 1; fileName = name; isSample = sample;
  resetPage(); controls(); refreshText(); status('PDFを読み込んでいます…');
  try {
    pageCount = await pdf.open(bytes);
    await renderPage(1);
  } catch (error) { pdfError(error); }
  finally { busy = false; controls(); }
}
$('pdf-file').addEventListener('change', async () => {
  const file = $('pdf-file').files[0];
  if (!file || busy) return;
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { status('PDFファイルを選択してください。', {}, true); return; }
  if (file.size > 40 * 1024 * 1024) { status('PDFは40 MB以下にしてください。', {}, true); return; }
  busy = true; controls(); status('PDFを読み込んでいます…');
  try { await loadPDF(new Uint8Array(await file.arrayBuffer()), file.name); }
  catch (error) { busy = false; controls(); pdfError(error); }
  finally { $('pdf-file').value = ''; }
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
    worker = new Worker(new URL('./analysis-worker.js?v=3', import.meta.url), {type: 'module'});
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
$('cancel').addEventListener('click', () => { finishWorker(); status('解析を中止しました。'); });
$('analysis-settings').addEventListener('input', () => {
  $('threshold-value').value = $('threshold').value; controls();
  if (result) status('設定が変わりました。「このページを解析」を押して更新してください。');
});
for (const id of ['view', 'debug', 'show-staves', 'show-lines', 'show-components', 'show-projection', 'show-heads', 'show-low-confidence']) $(id).addEventListener('change', draw);
$('actual-size').addEventListener('change', () => $('canvas-stack').classList.toggle('actual', $('actual-size').checked));
$('tempo').addEventListener('change', () => { if ($('tempo').checkValidity()) renderPlayback(); });
$('chord-tolerance').addEventListener('change', () => { if ($('chord-tolerance').checkValidity()) updateScore(); });
$('play').addEventListener('click', async () => {
  if (!events.length || !$('tempo').checkValidity()) return;
  try {
    await player.play(events, Number($('tempo').value), event => {
      const current = event.notes[0]; choose(current?.id || null);
      $('playback-status').textContent = current ? `${t('再生中')} · ${current.step}${current.octave} · MIDI ${current.midi}` : t('再生中');
    });
  } catch { $('playback-status').textContent = t('音声を開始できませんでした'); }
});
$('stop').addEventListener('click', () => { player.stop(); $('playback-status').textContent = t('停止しました'); });
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
  const {width, height, settings, lines, staves, components, truncated, heads, projection} = result;
  const data = {schema: 'midi-monitor.omr-analysis.v1', milestone: 1, fileName, page: currentPage, pageCount,
    width, height, settings, lines, staves, components, truncated, heads, projection: Array.from(projection)};
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = `score-analysis-page-${currentPage}.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('export-score').addEventListener('click', () => {
  if (!result?.playNotes?.length) return;
  const data = scoreDataFromNotes(result.playNotes, Number($('tempo').value), result.staves, Number($('chord-tolerance').value));
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = `score-playback-page-${currentPage}.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener('pagehide', () => { worker?.terminate(); player.stop(); });
$('debug').checked = DEBUG;
initLanguage(refreshText); controls();
