# Language Adviser for Even G2

**[English](README.md)** | **日本語** | **[Deutsch](README.de.md)** | **[中文](README.zh.md)** | **[Suomi](README.fi.md)**

---

Even G2 スマートグラス向けのスピーキングコーチアプリ。
ユーザーが学習したい言語で話した内容を分析し、ネイティブにとって自然な表現か判定、改善アドバイス提供。説明は任意の言語で返す。

## 対象ユーザー

学習対象言語の基本文法・語彙は習得済み、会話自体は可能、表現の自然さに課題（CEFR B1相当）。

## 対応言語

学習言語・説明言語 ともに以下から選択可。組合せ自由（同一言語ペア可）。

- English
- Japanese (日本語)
- German (Deutsch)
- Chinese (中文)
- Finnish (suomi)

## 機能

- **音声認識**: G2グラスのマイクで学習言語音声を取得、OpenAI Whisper (`gpt-4o-mini-transcribe`) で書き起こし
- **自然さ判定**: `gpt-4o-mini` がネイティブ視点で分析
- **修正提案**: 不自然な表現を自然な学習言語に書き換え
- **多言語解説**: なぜ不自然か、どう直すかを指定の説明言語で返答
- **グラス表示**: 修正文・ワンポイントTip を Even G2 グラスに表示
- **言語ペア設定**: 学習言語 / 説明言語を個別選択。Settings画面でいつでも変更可
- **履歴永続化**: 発話・修正・解説・Tip・言語ペア・タイムスタンプを LocalStorage に保存（最新200件）
- **エクスポート**: 履歴を JSON / CSV でダウンロード（BOM付UTF-8、Excel直開き対応）
- **履歴クリア**: 保存履歴の一括削除

## 必要なもの

- [Node.js](https://nodejs.org/) v18+
- [OpenAI API キー](https://platform.openai.com/api-keys)
- Even G2 スマートグラス + Even Hub アプリ（グラスマイク使用のため必須）

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:5174` を開く。

### Even G2 実機接続

```bash
npm run qr
```

表示QRをスマホで読取 → Even Hub アプリから接続。

> HTTPS 必要時は `vite.config.ts` に SSL 証明書設定追加。

## 使い方

1. 初回起動: OpenAI API キー入力 + 学習言語（I want to practice）+ 説明言語（Explain to me in）選択 → `Save`
2. `Tap to Speak` 押下 → G2グラスで学習言語を話す
3. `Stop` 押下 → 書き起こし → 分析実行
4. 結果がスマホ画面・G2グラス両方に表示
5. 履歴は画面下部に直近5件表示。全履歴は Export で取得

### 言語ペア変更

メイン画面下部 `Settings` → セレクタ変更 → `Save`。
既存履歴は保持。以降の分析のみ新ペア適用。

### 分析結果の見方

- **Natural!** (緑): 表現自然。そのまま使用可
- **More natural way:** (赤): 修正文 + 解説 + Tip 表示

### エクスポート形式

- **JSON**: 全フィールド保持（timestamp, targetLang, nativeLang, original, result{isNatural, corrected, explanation, tip}）
- **CSV**: `timestamp, target, native, isNatural, original, corrected, explanation, tip` の8列。ISO8601タイムスタンプ。BOM付UTF-8

## ビルド

```bash
npm run build       # プロダクションビルド
npm run preview     # ビルド結果プレビュー
```

出力先: `dist/`

## データ保存先

全ブラウザ LocalStorage 内。デバイス跨ぎ同期なし。キー一覧:

| キー | 内容 |
|------|------|
| `openai_api_key` | OpenAI APIキー |
| `target_lang` | 学習言語コード (en/ja/de/zh/fi) |
| `native_lang` | 説明言語コード |
| `history` | 発話履歴 JSON配列（最新200件） |

`Reset API key & languages` ボタンで全削除。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| 言語 | TypeScript |
| ビルド | Vite |
| 分析 | OpenAI `gpt-4o-mini` |
| 音声認識 | OpenAI `gpt-4o-mini-transcribe` (Whisper系) |
| 音声取得 | Even G2 マイク (16kHz/16bit PCM) |
| グラス連携 | `@evenrealities/even_hub_sdk` |
| 永続化 | LocalStorage |

## ファイル構成

```
src/
  main.ts        UI・状態管理・エクスポート
  openai.ts      chat completions / 音声書き起こし
  speech.ts      G2マイク制御・WAV生成
  languages.ts   対応言語定義
  style.css      スタイル
```
