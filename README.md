# MIDI Monitor

A simple browser-based MIDI input monitor built with HTML, CSS, and JavaScript.

Live site: [MIDI Monitor](https://michimichix521.github.io/midi-monitor/)

- View notes, velocity, channels, and controller messages in real time.
- Highlight held notes on a C2–C7 keyboard and inspect the latest 100 messages.
- Hear a simple synth sound with chords, velocity, sustain, and pitch bend (±2 semitones). Toggle sound and adjust the volume.
- Choose from 9 synthesized tones: soft synth, piano-style, electric piano-style, organ, bell, strings-style, bass, lead, and 8-bit. Your selection is saved.
- Switch between Japanese and English using the menu in the header. Your language choice is saved in your browser.

## Usage

Open the site over HTTPS in a browser with Web MIDI support. Connect your MIDI device, click **Connect to MIDI**, allow access, and select an input device.

Sound starts when you connect. If it stays silent, click **Enable audio**. No installation or build is needed, and the app does not send MIDI.

## Score PDF analysis (milestone 1)

Open [Score Lab](https://michimichix521.github.io/midi-monitor/score.html), choose a PDF (up to 40 MB) or the built-in sample, and click **Analyze this page**. Multiple pages, adjustable thresholding, staff overlays, connected components, and filled/hollow note-head candidates are supported. Select a candidate to inspect its confidence; advanced settings expose intermediate images and debugging overlays.

PDF.js is loaded from a pinned CDN version; PDF contents and image analysis stay in your browser. Detection is experimental: skewed scans, chords, beams, ledger lines, text, and music symbols can cause missed or false candidates. Pitch/rhythm conversion, manual note editing, grading JSON, and MIDI performance grading are later milestones and are **not implemented yet**. Exported JSON contains analysis diagnostics only.

---

## 日本語

HTML・CSS・JavaScriptで作成した、ブラウザーで使えるシンプルなMIDI入力モニターです。

公開サイト: [MIDI Monitor](https://michimichix521.github.io/midi-monitor/)

- ノート、ベロシティ、チャンネル、コントローラー情報をリアルタイム表示。
- C2〜C7の鍵盤で押下中の音を表示し、最新100件のログを確認。
- 和音・ベロシティ・サステイン・ピッチベンド（±2半音）に対応したシンセ音を再生。音のオン・オフと音量を調整できます。
- ソフトシンセ、ピアノ風、エレピ風、オルガン、ベル、ストリングス風、ベース、リード、8ビットの9種類の合成音色を選択でき、設定は保存されます。
- ヘッダーのメニューで日本語・英語を切り替え。選択した言語はブラウザーに保存されます。

### 使い方

Web MIDI対応ブラウザーでHTTPSのサイトを開きます。MIDIデバイスを接続し、**MIDIに接続** を押してアクセスを許可した後、入力デバイスを選択してください。

接続時に音声が有効になります。音が出ない場合は **音声を有効にする** を押してください。インストールやビルドは不要で、MIDI送信は行いません。

### 楽譜PDF解析（第1段階）

[楽譜PDF解析ページ](https://michimichix521.github.io/midi-monitor/score.html)で40 MB以下のPDFまたはサンプルを開き、**このページを解析** を押します。複数ページ、しきい値調整、五線の重ね合わせ表示、黒画素の塊、黒・白の音符頭候補に対応しています。候補を選ぶと信頼度を確認でき、詳細設定では処理途中の画像やデバッグ表示を確認できます。

PDF.jsはバージョンを固定したCDNから読み込み、PDFと画像解析はブラウザー内で処理します。認識は試作段階で、傾いたスキャン・和音・連桁・加線・文字・音楽記号では誤検出や見落としがあります。音高・音価への変換、音符の手動修正、採点用JSON、MIDI演奏の採点は**まだ未実装**です。保存できるJSONは解析情報のみです。
