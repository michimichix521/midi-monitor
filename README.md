# MIDI Monitor

A lightweight, browser-based MIDI input monitor built with HTML, CSS, and vanilla JavaScript. Connect a MIDI keyboard or controller to inspect notes and controller messages in real time.

The application interface is in Japanese. It uses the Web MIDI API and requires no framework, package installation, or build step.

## Features

- Select one MIDI input device and refresh the device list. Connected and disconnected devices are reflected automatically after MIDI access is granted.
- View the most recently pressed note that is still held, its MIDI note number, Japanese solfège, velocity (0–127), and channel (1–16).
- Track held notes across channels and highlight them on a virtual keyboard covering C2–C7 (MIDI 36–96). Middle C is displayed as C4 (MIDI 60).
- Inspect the latest 100 logged messages, newest first, with timestamps, message types, channels, and values.
- Monitor Note On/Off, Control Change, Program Change, Poly Pressure, Channel Pressure, Pitch Bend, and system messages such as Start, Continue, and Stop.
- See Japanese labels for common controls, including modulation, volume, pan, expression, sustain, and soft pedal.
- Use a responsive dark interface with a velocity meter and MIDI activity indicator.

## Getting started

You need a MIDI input device recognized by your operating system, a browser that exposes the Web MIDI API, and permission to access MIDI devices. The application suggests Chrome or Edge if the API is unavailable.

Serve the three application files over **HTTPS** or from **localhost**. For example, if Python is installed, run this command in the project directory:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Then open [http://localhost:8000](http://localhost:8000).

1. Connect your MIDI keyboard or controller to your computer.
2. Click **MIDIに接続** (Connect to MIDI) and grant the browser's MIDI permission if prompted.
3. Select an input from the **MIDIキーボード** (MIDI keyboard) dropdown.
4. Play notes or move the device's controls to view live input and the message log.
5. Click **ログをクリア** (Clear log) to reset the log and received-message total. This does not reset held notes.

After access is granted, the connection button becomes **デバイスを更新** (Refresh devices).

## Behavior and limitations

- This is an input monitor: it does not generate audio or send MIDI messages. The on-screen keyboard is a display, not a playable instrument.
- Notes outside the visible keyboard range still appear in the readout and log.
- **ACTIVE NOTES** counts distinct channel/note pairs currently held. The same pitch on two channels counts as two active notes but highlights one key.
- A Note On with velocity 0 is treated as Note Off. Sustain pedal messages are logged, but the held-note display follows Note On/Off rather than sustained sound.
- Timing Clock and Active Sensing messages are omitted from the log but included in the received-message total. The log badge shows only the number of retained entries, up to 100.
- Pitch bend is displayed as a signed value from −8192 to 8191. Program Change values use 0–127 numbering.
- System Exclusive (SysEx) access is not requested (`sysex: false`).
- MIDI data is processed in the browser. The application has no external dependencies, uploads, persistent storage, or log export; reloading the page clears its in-memory state.

## Troubleshooting

- **MIDI access is unavailable:** Open the app over HTTPS or localhost and use a browser with Web MIDI support.
- **Permission was denied:** Check the browser's site permissions, then retry the connection.
- **No input devices appear:** Check the device connection and operating-system recognition, then click **デバイスを更新**.
- **No messages appear:** Select an input device and confirm that the device is transmitting MIDI. Only the selected input is monitored.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Japanese interface, device controls, live readouts, and log table |
| `style.css` | Dark theme, responsive layout, virtual keyboard, and activity styling |
| `script.js` | Web MIDI access, device selection, message decoding, note tracking, and log rendering |

---

## 日本語

HTML・CSS・Vanilla JavaScriptで作成した、ブラウザーで動作する軽量なMIDI入力モニターです。MIDIキーボードやコントローラーを接続して、ノートやコントローラーの情報をリアルタイムで確認できます。

画面は日本語です。Web MIDI APIを使用しており、フレームワーク、パッケージのインストール、ビルドは不要です。

### 主な機能

- MIDI入力デバイスを1台選択してモニター。MIDIアクセス許可後は、デバイスの接続・切断を一覧に自動反映します。
- 押している音のうち最後に押した音について、音名、MIDIノート番号、ドレミ表記、ベロシティ（0〜127）、チャンネル（1〜16）を表示します。
- チャンネル別に押下状態を管理し、C2〜C7（MIDI 36〜96）の鍵盤をハイライト表示します。中央のドはC4（MIDI 60）です。
- 最新100件のログを新しい順に表示し、時刻・操作・チャンネル・値を確認できます。
- Note On/Off、Control Change、Program Change、Poly Pressure、Channel Pressure、Pitch Bend、およびStart・Continue・Stopなどのシステムメッセージを表示します。
- モジュレーション、音量、パン、エクスプレッション、サステインペダル、ソフトペダルなどを日本語で表示します。
- ダークテーマとレスポンシブレイアウトを採用し、ベロシティメーターとMIDI受信インジケーターを備えています。

### 起動方法・使い方

OSに認識されているMIDI入力デバイス、Web MIDI APIを利用できるブラウザー、MIDIデバイスへのアクセス許可が必要です。APIを利用できない場合、アプリはChromeまたはEdgeの使用を案内します。

アプリの3ファイルを **HTTPS** または **localhost** で配信してください。Pythonがインストールされている場合は、プロジェクトのディレクトリで次のコマンドを実行できます。

```sh
python -m http.server 8000 --bind 127.0.0.1
```

ブラウザーで [http://localhost:8000](http://localhost:8000) を開きます。

1. MIDIキーボードやコントローラーをパソコンに接続します。
2. **MIDIに接続** を押し、ブラウザーから確認が表示されたらMIDIアクセスを許可します。
3. **MIDIキーボード** の選択欄から入力デバイスを選びます。
4. 鍵盤やコントローラーを操作し、ライブモニターと受信ログを確認します。
5. **ログをクリア** を押すと、ログと受信合計がリセットされます。押下中のノートはリセットされません。

アクセス許可後、接続ボタンの表示は **デバイスを更新** に変わります。

### 表示仕様・制限

- 入力の確認専用です。音の再生やMIDI送信は行いません。画面上の鍵盤は表示用で、クリックして演奏する機能はありません。
- 鍵盤の表示範囲外のノートも、数値表示とログには反映されます。
- **ACTIVE NOTES** は、押下中の「チャンネルとノート番号の組み合わせ」の数です。同じ音を2つのチャンネルで受信すると2として数え、鍵盤は1つをハイライトします。
- ベロシティ0のNote OnはNote Offとして扱います。サステインペダルの情報はログに表示しますが、押下表示は音の持続ではなくNote On/Offに従います。
- Timing ClockとActive Sensingはログから省略しますが、受信合計には含めます。ログ見出しの件数は保持している件数で、最大100件です。
- Pitch Bendは−8192〜8191、Program Changeは0〜127で表示します。
- System Exclusive（SysEx）のアクセスは要求しません（`sysex: false`）。
- MIDIデータはブラウザー内で処理します。アプリには外部依存、アップロード、永続保存、ログ出力の機能はなく、再読み込みするとメモリー上の状態は消去されます。

### 困ったときは

- **MIDIにアクセスできない：** HTTPSまたはlocalhostで開き、Web MIDIに対応したブラウザーを使用してください。
- **アクセスが拒否された：** ブラウザーのサイト設定でMIDIの許可を確認し、再接続してください。
- **入力デバイスが表示されない：** 接続とOSによる認識を確認し、**デバイスを更新** を押してください。
- **受信ログが表示されない：** 入力デバイスを選択し、そのデバイスがMIDIを送信していることを確認してください。選択した入力だけをモニターします。

### ファイル構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | 日本語の画面、接続操作、ライブ表示、受信ログのテーブル |
| `style.css` | ダークテーマ、レスポンシブレイアウト、鍵盤、受信状態のスタイル |
| `script.js` | Web MIDIへのアクセス、デバイス選択、メッセージ解析、押下状態の管理、ログ描画 |
