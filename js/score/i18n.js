const english = {
  '楽譜PDF解析 — MIDI Monitor': 'Score PDF analysis — MIDI Monitor',
  'MIDIモニターに戻る': 'Back to MIDI Monitor',
  '楽譜PDFを見える形で解析': 'See how your score is recognized',
  'PDFから五線と音符頭の候補を探します。結果は推定です。まず元の楽譜と見比べてください。': 'Find staves and possible note heads in your PDF. These are estimates: compare them with the original score.',
  '推定した音高を合成音で再生できます。音価は黒い音符頭を四分音符、白い音符頭を二分音符として仮定します。演奏採点はまだ行いません。': 'You can play the estimated pitches with a synth. Filled heads are treated as quarter notes and hollow heads as half notes. Performance grading is not implemented yet.',
  '① PDFを選択 → ② 解析 → ③ 結果を確認': '1. Choose a PDF → 2. Analyze → 3. Review',
  '楽譜PDF（40 MBまで）': 'Score PDF (up to 40 MB)',
  'サンプル楽譜を開く': 'Open sample score',
  'このページを解析': 'Analyze this page',
  '解析を中止': 'Cancel analysis',
  'PDFは外部へ送信しません。初回は表示用ライブラリの読み込みにインターネット接続が必要です。': 'Your PDF stays on this device. An internet connection is needed to load the PDF rendering library initially.',
  '詳細設定': 'Advanced settings',
  '画像の読み取り方': 'Image analysis',
  '二値化方式': 'Threshold mode',
  '固定しきい値': 'Fixed threshold',
  '周囲の明るさに合わせる': 'Adaptive threshold',
  '黒とみなす明るさ': 'Black-pixel threshold',
  '周囲を見る半径（px）': 'Local radius (px)',
  '周囲との明るさの差': 'Local brightness offset',
  '五線候補の横幅（ページ幅比）': 'Minimum line length / page width',
  '線間隔の許容誤差': 'Staff spacing tolerance',
  '塊の最小面積（px）': 'Minimum component area (px)',
  '有力候補の信頼度下限': 'Minimum likely-head confidence',
  '孤立した小さなノイズを除去': 'Remove isolated specks',
  '設定を変えたら再解析してください。薄い線にはしきい値を上げ、短い五線には横幅比を下げます。傾きの自動補正は未対応です。': 'Analyze again after changing settings. Raise the threshold for faint lines; lower the line-length ratio for short staves. Automatic deskew is not supported.',
  '表示する解析結果': 'Analysis overlays',
  'デバッグ表示': 'Debug overlays',
  '五線と枠': 'Staves and bounds',
  '五線候補の横線': 'Candidate staff lines',
  '黒画素の塊': 'Components',
  '横方向の黒画素数': 'Horizontal projection',
  '音符頭候補と番号': 'Note-head candidates and IDs',
  '楽譜と検出結果': 'Score and detection results',
  '前へ': 'Previous', '次へ': 'Next', 'ページ': 'Page', '画像': 'Image',
  '原画像': 'Original', 'グレースケール': 'Grayscale', '二値化': 'Binary', '五線除去後': 'Staff lines removed',
  '等倍で表示': 'Actual size',
  '楽譜PDFを選択してください。サンプルでも試せます。': 'Choose a score PDF or try the sample.',
  '赤：検出五線': 'Red: detected staves', '青緑：有力候補': 'Teal: likely heads', '黄：低信頼度候補': 'Amber: lower confidence',
  'ページごとに解析します。別のページへ移動すると、このページの解析表示はリセットされます。': 'Analyze one page at a time. Switching pages clears the current analysis view.',
  '③ 認識候補を確認': '3. Review candidates',
  '五線グループ': 'Staves', '音符頭候補': 'Head candidates', '有力候補': 'Likely heads', '五線間隔': 'Staff spacing',
  '音符頭候補を選択': 'Select a head candidate',
  '楽譜上の枠をクリックしても選択できます。信頼度は形状による目安で、正解率ではありません。': 'Click a box on the score to select it. Confidence is a shape heuristic, not a measured accuracy rate.',
  '解析情報を保存（JSON）': 'Save analysis JSON',
  '保存内容は位置と信頼度などの解析情報です。採点用JSONではありません。': 'Exports positions, confidence, and analysis metadata. This is not a performance-grading score file.',
  'この段階で分かること・分からないこと': 'What this prototype can and cannot recognize',
  '水平で鮮明な五線と、比較的独立した音符頭を対象にしています。音部記号・文字・臨時記号を音符と取り違えたり、和音・連桁・加線に触れた音符を見落とすことがあります。': 'Designed for clear, horizontal staves and relatively isolated note heads. Clefs, text, or accidentals may be mistaken for notes; chords and heads touching beams or ledger lines may be missed.',
  '音高は五線位置から推定し、個別に修正できます。旗・連桁・付点・休符・臨時記号・調号は未認識のため、現在の音価と半音は推定に含まれません。次の段階で、MIDI演奏との比較を追加します。': 'Pitch is estimated from staff position and can be corrected per note. Flags, beams, dots, rests, accidentals, and key signatures are not recognized, so rhythm and semitones are approximate. MIDI performance comparison is the next milestone.',
  'ブラウザー内で解析・ファイルの外部送信なし': 'Analyzed in your browser · No PDF uploads',
  'PDFを選択するか、サンプルを開いてください。': 'Choose a PDF or open the sample.',
  'PDFを読み込んでいます…': 'Loading PDF…',
  '{page}ページ目を表示しています…': 'Rendering page {page}…',
  '{page} / {count}ページを表示しました。「このページを解析」を押してください。': 'Page {page} of {count} is ready. Click Analyze this page.',
  'グレースケール化・二値化を行っています…': 'Converting to grayscale and binary…',
  '五線を検出しています…': 'Detecting staves…',
  '黒画素の塊を検出しています…': 'Finding connected components…',
  '音符頭の候補を探しています…': 'Finding possible note heads…',
  '解析完了：五線 {staves}組、音符頭候補 {heads}個。元の楽譜と見比べてください。': 'Analysis complete: {staves} staves, {heads} head candidates. Compare with the original score.',
  '解析を中止しました。': 'Analysis canceled.',
  '設定が変わりました。「このページを解析」を押して更新してください。': 'Settings changed. Click Analyze this page to update the results.',
  'PDFファイルを選択してください。': 'Please select a PDF file.',
  'PDFは40 MB以下にしてください。': 'Please choose a PDF no larger than 40 MB.',
  'PDFを表示できませんでした。ファイル形式とネット接続を確認してください。': 'Could not display the PDF. Check the file and your internet connection.',
  'パスワード付きPDFには未対応です。パスワードのないPDFを選択してください。': 'Password-protected PDFs are not supported. Choose a PDF without a password.',
  '解析を開始できませんでした。このブラウザーでWeb Workerが利用できるか確認してください。': 'Could not start analysis. Check that Web Workers are available in this browser.',
  '解析に失敗しました。設定を調整して再試行してください。': 'Analysis failed. Adjust the settings and try again.',
  '詳細設定の数値を範囲内で入力してください。': 'Enter valid values within the advanced-setting limits.',
  '五線が見つかりません。詳細設定を調整してください。斜めの五線や短い五線は検出できないことがあります。': 'No staves found. Adjust advanced settings. Slanted or short staves may not be detected.',
  '音符頭の候補が見つかりません。二値化画像と五線除去後の画像を確認してください。': 'No head candidates found. Inspect the binary and staff-removed images.',
  '塊が多いため検出を30,000個で打ち切りました。しきい値や最小面積を調整してください。': 'Stopped at 30,000 components. Adjust the threshold or minimum area.',
  '表示負荷を抑えるため、塊の枠は先頭5,000個だけ表示します。': 'Component boxes are limited to the first 5,000 for display performance.',
  '候補を選択してください': 'Select a candidate', '候補なし': 'No candidates',
  '黒い音符頭候補': 'Filled-head candidate', '白い音符頭候補': 'Hollow-head candidate',
  '五線 {id}：{spacing} px・信頼度 {confidence}': 'Staff {id}: {spacing} px · confidence {confidence}',
  '五線番号': 'Staff', '信頼度': 'Confidence', '形状': 'Shape', '位置': 'Position', '幅 × 高さ': 'Width × height',
  '黒画素密度': 'Ink density', '幅 / 五線間隔': 'Width / staff spacing', '高さ / 五線間隔': 'Height / staff spacing',
  '楽譜画像': 'Score image', '解析結果。候補一覧からも選択できます。': 'Analysis overlay. Candidates can also be selected using the list.',
  'サンプル楽譜（2ページ）': 'Sample score (2 pages)',
  '④ 推定した音を確認する': '4. Review the estimated notes',
  '有力候補を、各段の左から右へ再生します。同じ横位置の候補は和音として同時に鳴らします。再生前に音部記号と個別のMIDI番号・長さを確認してください。': 'Likely candidates play left to right within each system. Candidates at the same horizontal position play as a chord. Check clefs plus individual MIDI numbers and durations before playback.',
  'テンポ（BPM）': 'Tempo (BPM)', '和音とみなす横位置（px）': 'Chord x tolerance (px)', '推定音を再生': 'Play estimated notes', '停止': 'Stop', '採点用JSONを保存': 'Save score JSON',
  '再生対象の音符': 'playable notes', '再生イベント': 'playback events', '推定拍数': 'estimated beats', '五線': 'Staff', '音部記号': 'Clef',
  'ト音記号': 'Treble', 'ヘ音記号': 'Bass', '推定音高は要確認': 'Estimated pitches need review', '再生中': 'Playing',
  '音声を開始できませんでした': 'Could not start audio', '停止しました': 'Stopped',
  '推定MIDI番号': 'Estimated MIDI number', '推定音名': 'Estimated note name', '長さ（拍）': 'Duration (beats)',
  '再生に含める': 'Include in playback', '推定値に戻す': 'Restore estimate'
};
let language = 'ja';
try { if (localStorage.getItem('midi-monitor-language') === 'en') language = 'en'; } catch {}
export const t = (key, values = {}) => (language === 'en' ? english[key] || key : key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
export function initLanguage(onChange) {
  const select = document.getElementById('language');
  function apply() {
    document.documentElement.lang = language;
    document.title = t('楽譜PDF解析 — MIDI Monitor');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.getElementById('page-canvas').setAttribute('aria-label', t('楽譜画像'));
    document.getElementById('overlay-canvas').setAttribute('aria-label', t('解析結果。候補一覧からも選択できます。'));
    select.value = language;
    onChange();
  }
  select.addEventListener('change', () => {
    language = select.value === 'en' ? 'en' : 'ja';
    try { localStorage.setItem('midi-monitor-language', language); } catch {}
    apply();
  });
  apply();
}
