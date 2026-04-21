# Language Adviser for Even G2

**[English](README.md)** | **日本語** | **[Deutsch](README.de.md)** | **[中文](README.zh.md)** | **[Suomi](README.fi.md)**

---

Even G2 スマートグラス向けのスピーキングコーチアプリです。
ユーザーが学習したい言語で話した内容を分析し、ネイティブにとって自然な表現かどうかを判定します。改善のためのアドバイスは、お好みの言語で受け取れます。

## 対象ユーザー

学習したい言語の基本的な文法・語彙はひと通り習得しており、会話自体は成立するものの、表現の自然さに課題を感じている方を想定しています。中級レベル（日本語学習なら JLPT N3、英語学習なら英検2級 / CEFR B1、中国語学習なら HSK 4級、ドイツ語学習なら Goethe-Zertifikat B1、フィンランド語学習なら YKI taso 3 相当）が目安です。

## 対応言語

学習言語・説明言語のどちらも、以下から自由に選べます。組み合わせに制限はなく、両方に同じ言語を指定することもできます。

- English
- Japanese (日本語)
- German (Deutsch)
- Chinese (中文)
- Finnish (suomi)

## 機能

- **音声認識**: G2 グラスのマイクで学習言語の音声を取得し、OpenAI Whisper (`gpt-4o-mini-transcribe`) で書き起こします
- **自然さ判定**: `gpt-4o-mini` がネイティブの視点から表現を分析します
- **修正提案**: 不自然な表現を、自然な学習言語の言い回しに書き換えて提示します
- **多言語解説**: なぜ不自然なのか、どう直すとよいかを、指定した説明言語で返します
- **グラス表示**: 修正文とワンポイントのヒントを Even G2 に表示します
- **言語ペア設定**: 学習言語と説明言語を個別に選べます。Settings 画面からいつでも変更できます
- **履歴の永続化**: 発話・修正・解説・ヒント・言語ペア・タイムスタンプを LocalStorage に保存します（最新 200 件まで）
- **エクスポート**: 履歴を JSON または CSV でダウンロードできます（BOM 付き UTF-8 なので Excel でそのまま開けます）
- **履歴クリア**: 保存した履歴をまとめて削除できます

## 必要なもの

- [Node.js](https://nodejs.org/) v18 以上
- [OpenAI API キー](https://platform.openai.com/api-keys)
- Even G2 スマートグラスと Even Hub アプリ（グラスのマイクを使うため、必須です）

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:5174` を開いてください。

### Even G2 実機で動かす場合

```bash
npm run qr
```

表示された QR コードをスマホで読み取り、Even Hub アプリから接続してください。

> HTTPS が必要な場合は、`vite.config.ts` に SSL 証明書の設定を追加してください。

## 使い方

1. 初回起動時に OpenAI API キーを入力し、学習言語（I want to practice）と説明言語（Explain to me in）を選んで `Save` を押します
2. `Tap to Speak` を押し、学習言語で G2 グラスに向かって話します
3. `Stop` を押すと書き起こしと分析が走ります
4. 結果はスマホ画面と G2 グラスの両方に表示されます
5. 画面下部には直近 5 件の履歴が並びます。全履歴は Export から取得できます

### 言語ペアを変更する

メイン画面下部の `Settings` を開き、セレクタを変更して `Save` を押してください。
過去の履歴はそのまま残り、以降の分析だけが新しいペアで動きます。

### 分析結果の見方

- **Natural!**（緑）: 自然な表現です。そのまま自信を持って使ってください
- **More natural way:**（赤）: より自然な言い方があります。修正文・解説・ヒントが表示されます

### エクスポート形式

- **JSON**: すべてのフィールドを保持します（timestamp, targetLang, nativeLang, original, result{isNatural, corrected, explanation, tip}）
- **CSV**: `timestamp, target, native, isNatural, original, corrected, explanation, tip` の 8 列です。ISO8601 形式のタイムスタンプと BOM 付き UTF-8 で出力します

## ビルド

```bash
npm run build       # 本番ビルド
npm run preview     # ビルド結果のプレビュー
```

出力先は `dist/` です。

## データの保存場所

すべてブラウザの LocalStorage に保存されます。デバイス間の同期はありません。キーは以下のとおりです。

| キー | 内容 |
|------|------|
| `openai_api_key` | OpenAI API キー |
| `target_lang` | 学習言語コード（en/ja/de/zh/fi） |
| `native_lang` | 説明言語コード |
| `history` | 発話履歴の JSON 配列（最新 200 件） |

`Reset API key & languages` ボタンを押すと、これらをすべて削除します。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| 言語 | TypeScript |
| ビルド | Vite |
| 分析 | OpenAI `gpt-4o-mini` |
| 音声認識 | OpenAI `gpt-4o-mini-transcribe`（Whisper 系） |
| 音声取得 | Even G2 マイク（16 kHz / 16-bit PCM） |
| グラス連携 | `@evenrealities/even_hub_sdk` |
| 永続化 | LocalStorage |

## ファイル構成

```
src/
  main.ts        UI・状態管理・エクスポート
  openai.ts      chat completions / 音声書き起こし
  speech.ts      G2 マイク制御・WAV 生成
  languages.ts   対応言語の定義
  style.css      スタイル
```
