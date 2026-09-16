"use strict";
const $ = (id) => document.getElementById(id);
const english = {
  "入力デバイス": "Input device",
  "MIDIキーボード": "MIDI keyboard",
  "先にMIDIアクセスを許可してください": "Allow MIDI access first",
  "MIDIに接続": "Connect to MIDI",
  "デバイスを更新": "Refresh devices",
  "キーボードを接続し「MIDIに接続」を押してください。": "Connect your keyboard and click “Connect to MIDI”.",
  "ライブモニター": "Live monitor",
  "押している音": "HELD NOTE",
  "ドレミの音名": "Solfege note name",
  "ノート入力を待っています": "Waiting for notes",
  "同時に押している音": "Notes currently held",
  "受信中のノートを示す鍵盤、C2からC7": "Keyboard showing incoming notes, C2 to C7",
  "押されている鍵盤": "Held keys",
  "/ 中央のド = C4": "/ Middle C = C4",
  "受信ログ": "Message log",
  "ログをクリア": "Clear log",
  "時刻": "Time",
  "操作": "Message",
  "値": "Value",
  "まだMIDI情報を受信していません": "No MIDI messages received yet",
  "デバイスを選択して、鍵盤やコントローラーを操作してください。": "Select a device, then play notes or move its controls.",
  "最新100件 · 同期クロックなどの定期信号は省略": "Latest 100 messages · Clock and Active Sensing omitted",
  "ブラウザー内で処理 · MIDI送信なし": "Processed in your browser · No MIDI output",
  "HTTPS・localhostで利用": "Use over HTTPS or localhost",
  "未接続": "Disconnected",
  "接続中": "Connecting",
  "受信待機": "Ready",
  "接続エラー": "Connection error",
  "アクセス不可": "Access unavailable",
  "MIDIデバイス": "MIDI device",
  "{device} に接続しました。鍵盤を弾くと入力が表示されます。": "Connected to {device}. Play notes to see MIDI input.",
  "デバイスを開けませんでした。接続を確認して再度選択してください。": "Could not open the device. Check the connection and select it again.",
  "デバイスを選択してください": "Select a device",
  "MIDIデバイスが見つかりません": "No MIDI devices found",
  "入力するMIDIキーボードを選択してください。": "Select a MIDI keyboard to monitor.",
  "MIDIキーボードを接続してください。接続すると自動で一覧に表示されます。": "Connect a MIDI keyboard. It will appear in the list automatically.",
  "HTTPSまたはlocalhostで開いてください。": "Open this page over HTTPS or localhost.",
  "このブラウザーはWeb MIDIに対応していません。ChromeやEdgeで開いてください。": "This browser does not support Web MIDI. Open this page in Chrome or Edge.",
  "MIDIアクセスが許可されていません。ブラウザーのサイト設定を確認して再試行してください。": "MIDI access was denied. Check your browser’s site permissions and try again.",
  "MIDIにアクセスできませんでした。デバイスとブラウザーを確認して再試行してください。": "Could not access MIDI. Check your device and browser, then try again.",
  "押下中": "Held",
  "受信合計 {count} 件": "Total received: {count}",
  "強さ": "Velocity",
  "モジュレーション": "Modulation",
  "音量": "Volume",
  "パン": "Pan",
  "エクスプレッション": "Expression",
  "サステインペダル": "Sustain pedal",
  "ソフトペダル": "Soft pedal",
  "コントロール": "Control",
  "同期クロック": "Timing Clock",
  "MIDI Monitor — 入力モニター": "MIDI Monitor — Input monitor",
  "MIDIキーボードを選択し、ノート、ベロシティ、コントロール情報をリアルタイム表示。": "Select a MIDI keyboard and monitor notes, velocity, and controls in real time."
};
let language = 'ja';
try { const saved = localStorage.getItem('midi-monitor-language'); if (saved === 'ja' || saved === 'en') language = saved; } catch {}
const t = (key, values = {}) => (language === 'en' ? english[key] ?? key ?? '' : key ?? '').replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
const syllable = n => (language === 'ja' ? solfege : ['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Ti'])[n % 12];
let statusKey = '未接続', messageKey = 'キーボードを接続し「MIDIに接続」を押してください。', messageDevice = null;
function setMessage(key, device = null) { messageKey = key; messageDevice = device; $('message').textContent = t(key, {device: device || t('MIDIデバイス')}); }
const names = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const solfege = ['ド','ド♯','レ','レ♯','ミ','ファ','ファ♯','ソ','ソ♯','ラ','ラ♯','シ'];
const noteName = n => names[n % 12] + (Math.floor(n / 12) - 1);
const noteLabel = n => language === 'ja' ? `${noteName(n)}（${syllable(n)}）` : `${noteName(n)} (${syllable(n)})`;
let access = null, input = null, total = 0, selectionVersion = 0, frame = 0, pulseTimer;
const held = new Map(), history = [], keys = new Map();
let whiteIndex = 0;
for (let n = 36; n <= 96; n++) {
  const black = [1,3,6,8,10].includes(n % 12);
  const key = document.createElement('div');
  key.className = 'key' + (black ? ' black' : '');
  if (black) { key.style.left = `${(whiteIndex - .32) / 36 * 100}%`; key.style.width = `${.64 / 36 * 100}%`; }
  else { whiteIndex++; const label = document.createElement('span'); label.textContent = syllable(n); key.append(label); }
  key.title = `${noteLabel(n)} · MIDI ${n}`;
  keys.set(n, key); $('keyboard').append(key);
}
function status(text, connected = false) { statusKey = text; $('status').textContent = t(text); $('status').classList.toggle('connected', connected); }
function resetNotes() { held.clear(); $('active').textContent = '0'; keys.forEach(k => k.classList.remove('pressed')); $('note').textContent = '—'; $('solfege').textContent = '—'; $('note-number').textContent = t('ノート入力を待っています'); $('velocity').textContent = '—'; $('channel').textContent = '—'; $('velocity-bar').style.width = '0%'; }
function detach() { if (input) { input.onmidimessage = null; input.close().catch(() => {}); } input = null; resetNotes(); }
async function selectInput() {
  const version = ++selectionVersion;
  detach();
  const next = access?.inputs.get($('device').value);
  if (!next || next.state !== 'connected') { status('未接続'); return; }
  status('接続中');
  try {
    await next.open();
    if (version !== selectionVersion) return;
    if (next.state !== 'connected') throw new Error('disconnected');
    input = next; input.onmidimessage = receive;
    status('受信待機', true);
    setMessage('{device} に接続しました。鍵盤を弾くと入力が表示されます。', next.name);
  } catch { if (version === selectionVersion) { status('接続エラー'); setMessage('デバイスを開けませんでした。接続を確認して再度選択してください。'); } }
}
function refreshDevices() {
  const previous = $('device').value;
  const devices = [...access.inputs.values()].filter(port => port.state === 'connected');
  $('device').replaceChildren(new Option(t(devices.length ? 'デバイスを選択してください' : 'MIDIデバイスが見つかりません'), ''));
  devices.forEach(port => $('device').add(new Option(port.name || port.manufacturer || 'MIDI Input', port.id)));
  $('device').disabled = !devices.length;
  if (devices.some(p => p.id === previous)) { $('device').value = previous; return; }
  ++selectionVersion; detach(); status('未接続');
  setMessage(devices.length ? '入力するMIDIキーボードを選択してください。' : 'MIDIキーボードを接続してください。接続すると自動で一覧に表示されます。');
}
$('connect').addEventListener('click', async () => {
  if (!window.isSecureContext) { setMessage('HTTPSまたはlocalhostで開いてください。'); return; }
  if (!navigator.requestMIDIAccess) { setMessage('このブラウザーはWeb MIDIに対応していません。ChromeやEdgeで開いてください。'); return; }
  $('connect').disabled = true;
  try {
    if (!access) { access = await navigator.requestMIDIAccess({sysex:false}); access.onstatechange = refreshDevices; }
    refreshDevices(); $('connect').textContent = t('デバイスを更新');
  } catch (error) { status('アクセス不可'); setMessage(error.name === 'NotAllowedError' || error.name === 'SecurityError' ? 'MIDIアクセスが許可されていません。ブラウザーのサイト設定を確認して再試行してください。' : 'MIDIにアクセスできませんでした。デバイスとブラウザーを確認して再試行してください。'); }
  finally { $('connect').disabled = false; }
});
$('device').addEventListener('change', selectInput);
function decode(data) {
  const [s, a = 0, b = 0] = data, type = s & 0xf0;
  const ch = s < 0xf0 ? (s & 15) + 1 : null;
  if (type === 0x90 || type === 0x80) return {type: type === 0x90 && b > 0 ? 'Note On' : 'Note Off', ch, detail:`${noteLabel(a)} · MIDI ${a} · Velocity ${b}`};
  if (type === 0xa0) return {type:'Poly Pressure', ch, detail:`${noteLabel(a)} · MIDI ${a} · Pressure ${b}`};
  if (type === 0xb0) return {type:'Control Change', ch, detail:`CC ${a} · Value ${b}`};
  if (type === 0xc0) return {type:'Program Change', ch, detail:`Program ${a} (0–127)`};
  if (type === 0xd0) return {type:'Channel Pressure', ch, detail:`Pressure ${a}`};
  if (type === 0xe0) return {type:'Pitch Bend', ch, detail:`${((b << 7) | a) - 8192} · Raw ${(b << 7) | a}`};
  const system = {240:'SysEx',241:'MTC Quarter Frame',242:'Song Position',243:'Song Select',246:'Tune Request',247:'End of SysEx',248:'Timing Clock',250:'Start',251:'Continue',252:'Stop',254:'Active Sensing',255:'System Reset'};
  return {type:system[s] || 'System Message', ch, detail:s === 242 ? `Position ${(b << 7) | a}` : data.length > 1 ? Array.from(data).slice(1).join(', ') : '—'};
}
function receive(event) {
  if (!event.data?.length) return;
  const data = Array.from(event.data), entry = decode(data);
  const [s, n, v] = data, channel = (s & 15) + 1;
  if (entry.type === 'Note On' || entry.type === 'Note Off') {
    const key = `${channel}:${n}`;
    if (entry.type === 'Note On') {
      held.delete(key);
      held.set(key, { note: n, velocity: v, channel });
    } else held.delete(key);
  }
  if ((s & 0xf0) === 0xb0 && (n === 120 || n >= 123)) for (const key of held.keys()) if (key.startsWith(`${channel}:`)) held.delete(key);
  if (s === 255) held.clear();
  const current = [...held.values()].at(-1);
  if (current) {
    $('note').textContent = noteName(current.note);
    $('solfege').textContent = syllable(current.note);
    $('note-number').textContent = `MIDI ${current.note} · ${t('押下中')}`;
    $('velocity').textContent = current.velocity;
    $('velocity-bar').style.width = `${current.velocity / 127 * 100}%`;
    $('channel').textContent = current.channel;
  } else {
    $('note').textContent = '—';
    $('solfege').textContent = '—';
    $('note-number').textContent = t('ノート入力を待っています');
    $('velocity').textContent = '—';
    $('velocity-bar').style.width = '0%';
    $('channel').textContent = entry.ch ?? '—';
  }
  const activeNotes = new Set([...held.values()].map(value => value.note));
  keys.forEach((key, number) => key.classList.toggle('pressed', activeNotes.has(number)));
  $('active').textContent = held.size;
  $('activity').classList.add('flash'); clearTimeout(pulseTimer); pulseTimer = setTimeout(() => $('activity').classList.remove('flash'), 100);
  total++;
  if (s === 248 || s === 254) { $('total').textContent = t('受信合計 {count} 件', {count: total.toLocaleString(language)}); return; }
  const now = new Date();
  history.unshift({data, time:now});
  if (history.length > 100) history.pop();
  if (!frame) frame = requestAnimationFrame(renderLog);
}
function renderLog() {
  frame = 0; const fragment = document.createDocumentFragment();
  for (const item of history) { const entry = decode(item.data); const row=document.createElement('tr'); for (const value of [item.time.toLocaleTimeString(language === 'ja' ? 'ja-JP' : 'en-GB', {hour12:false}),entry.type,entry.ch ?? '—',brief(item.data,entry)]) {const cell=document.createElement('td');cell.textContent=value;row.append(cell);}fragment.append(row); }
  $('events').replaceChildren(fragment); $('empty').hidden = history.length > 0; $('count').textContent = history.length; $('total').textContent = t('受信合計 {count} 件', {count: total.toLocaleString(language)});
}
$('clear').addEventListener('click', () => { history.length = 0; total = 0; renderLog(); });
function brief(data, entry) {
  const [status,a,b] = data;
  if (entry.type === 'Note On' || entry.type === 'Note Off') return `${noteLabel(a)} · ${t('強さ')} ${b}`;
  if (entry.type === 'Control Change') {
    const name = t(({1:'モジュレーション',7:'音量',10:'パン',11:'エクスプレッション',64:'サステインペダル',67:'ソフトペダル'})[a]) || `${t('コントロール')} ${a}`;
    return `${name} · ${b}`;
  }
  if (entry.type === 'Pitch Bend') return String(((b << 7) | a) - 8192);
  if (entry.type === 'Poly Pressure') return `${noteLabel(a)} · ${b}`;
  if (entry.type === 'Program Change' || entry.type === 'Channel Pressure') return String(a);
  return status === 248 ? t('同期クロック') : entry.detail;
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.title = t('MIDI Monitor — 入力モニター');
  document.querySelector('meta[name="description"]').content = t('MIDIキーボードを選択し、ノート、ベロシティ、コントロール情報をリアルタイム表示。');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $('language').value = language;
  $('status').textContent = t(statusKey);
  setMessage(messageKey, messageDevice);
  $('connect').textContent = t(access ? 'デバイスを更新' : 'MIDIに接続');
  $('device').options[0].textContent = t(!access ? '先にMIDIアクセスを許可してください' : $('device').options.length > 1 ? 'デバイスを選択してください' : 'MIDIデバイスが見つかりません');
  const current = [...held.values()].at(-1);
  $('solfege').textContent = current ? syllable(current.note) : '—';
  $('note-number').textContent = current ? `MIDI ${current.note} · ${t('押下中')}` : t('ノート入力を待っています');
  keys.forEach((key, n) => { key.title = `${noteLabel(n)} · MIDI ${n}`; const label = key.querySelector('span'); if (label) label.textContent = syllable(n); });
  renderLog();
}
$('language').addEventListener('change', () => {
  language = $('language').value === 'en' ? 'en' : 'ja';
  try { localStorage.setItem('midi-monitor-language', language); } catch {}
  applyLanguage();
});
applyLanguage();
