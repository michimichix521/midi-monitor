# MIDI Monitor

A simple browser-based MIDI input monitor built with HTML, CSS, and JavaScript.

Live site: [MIDI Monitor](https://michimichix521.github.io/midi-monitor/)

- Monitor MIDI notes, velocity, channels, and controller messages in real time.
- Play nine built-in synth tones from a MIDI keyboard.
- Switch the interface between Japanese and English.

Open the site over HTTPS in a browser with Web MIDI support, connect a MIDI device, and choose an input. No installation or build is required.

## Score Lab

Open [Score Lab](https://michimichix521.github.io/midi-monitor/score.html), select a score PDF or the built-in sample, and analyze a page. PDF rendering and analysis stay in the browser.

The prototype detects staff groups and note-head candidates, estimates pitch from the selected clef, and plays the estimated result with a browser synth. You can correct each candidate's MIDI number, duration, and inclusion before playback, then save score JSON.

Recognition remains approximate. Stem, flag, and beam hints estimate whole, half, quarter, and eighth notes; you can correct each note's start beat and duration. Dots, rests, ties, barlines, meter, accidentals, key signatures, and complex chords are not reliable. MIDI performance grading is not implemented yet.

---

## 日本語

HTML・CSS・JavaScriptで作成した、ブラウザーで使えるシンプルなMIDI入力モニターです。

公開サイト: [MIDI Monitor](https://michimichix521.github.io/midi-monitor/)

- MIDIノート、ベロシティ、チャンネル、コントローラー情報をリアルタイム表示。
- MIDIキーボードで9種類の内蔵シンセ音色を再生。
- 画面を日本語・英語で切り替え。

Web MIDI対応ブラウザーでHTTPSのサイトを開き、MIDIデバイスを接続して入力を選択してください。インストールやビルドは不要です。

### Score Lab

[楽譜PDF解析ページ](https://michimichix521.github.io/midi-monitor/score.html)でPDFまたは内蔵サンプルを開き、ページを解析します。PDFの描画と解析はブラウザー内で完結します。

試作版では五線と音符頭候補を検出し、選択した音部記号から音高を推定してブラウザーのシンセで再生します。候補ごとにMIDI番号、音価、再生に含めるかを修正でき、採点用JSONとして保存できます。

認識精度はまだ限定的です。符幹・旗・連桁らしい形から全音符・二分音符・四分音符・八分音符を推定し、候補ごとに開始拍と長さを修正できます。付点、休符、タイ、小節線、拍子、臨時記号、調号、複雑な和音は正確に認識できません。MIDI演奏の採点は未実装です。
