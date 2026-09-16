"use strict";
const $ = (id) => document.getElementById(id);
const names = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const solfege = ['ド','ド♯','レ','レ♯','ミ','ファ','ファ♯','ソ','ソ♯','ラ','ラ♯','シ'];
const noteName = n => names[n % 12] + (Math.floor(n / 12) - 1);
const noteLabel = n => `${noteName(n)}（${solfege[n % 12]}）`;
let access = null, input = null, total = 0, selectionVersion = 0, frame = 0, pulseTimer;
const held = new Map(), history = [], keys = new Map();
let whiteIndex = 0;
for (let n = 36; n <= 96; n++) {
  const black = [1,3,6,8,10].includes(n % 12);
  const key = document.createElement('div');
  key.className = 'key' + (black ? ' black' : '');
  if (black) { key.style.left = `${(whiteIndex - .32) / 36 * 100}%`; key.style.width = `${.64 / 36 * 100}%`; }
  else { whiteIndex++; const label = document.createElement('span'); label.textContent = solfege[n % 12]; key.append(label); }
  key.title = `${noteLabel(n)} · MIDI ${n}`;
  keys.set(n, key); $('keyboard').append(key);
}
function status(text, connected = false) { $('status').textContent = text; $('status').classList.toggle('connected', connected); }
function resetNotes() { held.clear(); $('active').textContent = '0'; keys.forEach(k => k.classList.remove('pressed')); $('note').textContent = '—'; $('solfege').textContent = '—'; $('note-number').textContent = 'ノート入力を待っています'; $('velocity').textContent = '—'; $('channel').textContent = '—'; $('velocity-bar').style.width = '0%'; }
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
    $('message').textContent = `${next.name || 'MIDIデバイス'} に接続しました。鍵盤を弾くと入力が表示されます。`;
  } catch { if (version === selectionVersion) { status('接続エラー'); $('message').textContent = 'デバイスを開けませんでした。接続を確認して再度選択してください。'; } }
}
function refreshDevices() {
  const previous = $('device').value;
  const devices = [...access.inputs.values()].filter(port => port.state === 'connected');
  $('device').replaceChildren(new Option(devices.length ? 'デバイスを選択してください' : 'MIDIデバイスが見つかりません', ''));
  devices.forEach(port => $('device').add(new Option(port.name || port.manufacturer || 'MIDI Input', port.id)));
  $('device').disabled = !devices.length;
  if (devices.some(p => p.id === previous)) { $('device').value = previous; return; }
  ++selectionVersion; detach(); status('未接続');
  $('message').textContent = devices.length ? '入力するMIDIキーボードを選択してください。' : 'MIDIキーボードを接続してください。接続すると自動で一覧に表示されます。';
}
$('connect').addEventListener('click', async () => {
  if (!window.isSecureContext) { $('message').textContent = 'HTTPSまたはlocalhostで開いてください。'; return; }
  if (!navigator.requestMIDIAccess) { $('message').textContent = 'このブラウザーはWeb MIDIに対応していません。ChromeやEdgeで開いてください。'; return; }
  $('connect').disabled = true;
  try {
    if (!access) { access = await navigator.requestMIDIAccess({sysex:false}); access.onstatechange = refreshDevices; }
    refreshDevices(); $('connect').textContent = 'デバイスを更新';
  } catch (error) { status('アクセス不可'); $('message').textContent = error.name === 'NotAllowedError' || error.name === 'SecurityError' ? 'MIDIアクセスが許可されていません。ブラウザーのサイト設定を確認して再試行してください。' : 'MIDIにアクセスできませんでした。デバイスとブラウザーを確認して再試行してください。'; }
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
    $('solfege').textContent = solfege[current.note % 12];
    $('note-number').textContent = `MIDI ${current.note} · 押下中`;
    $('velocity').textContent = current.velocity;
    $('velocity-bar').style.width = `${current.velocity / 127 * 100}%`;
    $('channel').textContent = current.channel;
  } else {
    $('note').textContent = '—';
    $('solfege').textContent = '—';
    $('note-number').textContent = 'ノート入力を待っています';
    $('velocity').textContent = '—';
    $('velocity-bar').style.width = '0%';
    $('channel').textContent = entry.ch ?? '—';
  }
  const activeNotes = new Set([...held.values()].map(value => value.note));
  keys.forEach((key, number) => key.classList.toggle('pressed', activeNotes.has(number)));
  $('active').textContent = held.size;
  $('activity').classList.add('flash'); clearTimeout(pulseTimer); pulseTimer = setTimeout(() => $('activity').classList.remove('flash'), 100);
  total++;
  if (s === 248 || s === 254) { $('total').textContent = `受信合計 ${total.toLocaleString()} 件`; return; }
  const now = new Date();
  history.unshift({...entry, time:now.toLocaleTimeString('ja-JP', {hour12:false}), display:brief(data,entry)});
  if (history.length > 100) history.pop();
  if (!frame) frame = requestAnimationFrame(renderLog);
}
function renderLog() {
  frame = 0; const fragment = document.createDocumentFragment();
  for (const entry of history) { const row=document.createElement('tr'); for (const value of [entry.time,entry.type,entry.ch ?? '—',entry.display]) {const cell=document.createElement('td');cell.textContent=value;row.append(cell);}fragment.append(row); }
  $('events').replaceChildren(fragment); $('empty').hidden = history.length > 0; $('count').textContent = history.length; $('total').textContent = `受信合計 ${total.toLocaleString()} 件`;
}
$('clear').addEventListener('click', () => { history.length = 0; total = 0; renderLog(); });
function brief(data, entry) {
  const [status,a,b] = data;
  if (entry.type === 'Note On' || entry.type === 'Note Off') return `${noteLabel(a)} · 強さ ${b}`;
  if (entry.type === 'Control Change') {
    const name = ({1:'モジュレーション',7:'音量',10:'パン',11:'エクスプレッション',64:'サステインペダル',67:'ソフトペダル'})[a] || `コントロール ${a}`;
    return `${name} · ${b}`;
  }
  if (entry.type === 'Pitch Bend') return String(((b << 7) | a) - 8192);
  if (entry.type === 'Poly Pressure') return `${noteLabel(a)} · ${b}`;
  if (entry.type === 'Program Change' || entry.type === 'Channel Pressure') return String(a);
  return status === 248 ? '同期クロック' : entry.detail;
}
