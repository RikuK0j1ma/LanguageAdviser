# Language Adviser for Even G2

**English** | **[日本語](README.ja.md)** | **[Deutsch](README.de.md)** | **[中文](README.zh.md)** | **[Suomi](README.fi.md)**

---

A speaking coach app for Even G2 smart glasses.
Analyze the user's speech in a target language, judge whether the expression sounds natural to a native speaker, and return advice in any chosen explanation language.

## Target user

Learners who already have the basic grammar and vocabulary of the target language and can hold a conversation, but still struggle with naturalness (intermediate level — roughly CEFR B1 / Cambridge PET for English, JLPT N3 for Japanese, Goethe-Zertifikat B1 for German, HSK 4 for Chinese, YKI taso 3 for Finnish).

## Supported languages

Both the target (practice) language and the explanation language can be chosen from the list. Any combination works, including the same language for both.

- English
- Japanese (日本語)
- German (Deutsch)
- Chinese (中文)
- Finnish (suomi)

## Features

- **Speech recognition**: Audio is captured from the G2 glasses mic and transcribed via OpenAI Whisper (`gpt-4o-mini-transcribe`)
- **Naturalness check**: `gpt-4o-mini` analyzes the utterance from a native speaker's viewpoint
- **Rewrite suggestion**: Unnatural expressions are rewritten in natural target-language form
- **Multilingual explanation**: Why it was unnatural and how to fix it, returned in the chosen explanation language
- **Glasses display**: The corrected sentence and a short tip are shown on Even G2
- **Language pair setting**: Target and explanation languages are selected independently and can be changed anytime from the Settings screen
- **Persistent history**: Utterances, corrections, explanations, tips, language pair and timestamps are stored in LocalStorage (latest 200 entries)
- **Export**: Download the history as JSON or CSV (UTF-8 with BOM, opens directly in Excel)
- **Clear history**: Wipe all stored entries in one click

## Requirements

- [Node.js](https://nodejs.org/) v18+
- [OpenAI API key](https://platform.openai.com/api-keys)
- Even G2 smart glasses + Even Hub app (required — the app uses the glasses' microphone)

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5174` in a browser.

### Running on real G2 hardware

```bash
npm run qr
```

Scan the QR with your phone, then connect from the Even Hub app.

> If HTTPS is required, add an SSL cert config to `vite.config.ts`.

## Usage

1. First launch: enter your OpenAI API key, pick a target language (I want to practice) and an explanation language (Explain to me in), then press `Save`
2. Tap `Tap to Speak` and speak in the target language through the G2 mic
3. Press `Stop` → transcription → analysis
4. The result is shown both on the phone screen and on the G2 glasses
5. The last five entries are listed at the bottom; use Export to get the full history

### Changing the language pair

Bottom of the main screen → `Settings` → change the selectors → `Save`.
Existing history is preserved; only subsequent analyses use the new pair.

### Reading the result

- **Natural!** (green): the expression is natural — use it with confidence
- **More natural way:** (red): a corrected sentence, explanation, and tip are shown

### Export formats

- **JSON**: all fields preserved (timestamp, targetLang, nativeLang, original, result{isNatural, corrected, explanation, tip})
- **CSV**: 8 columns — `timestamp, target, native, isNatural, original, corrected, explanation, tip`. ISO8601 timestamps. UTF-8 with BOM

## Build

```bash
npm run build       # production build
npm run preview     # preview the build output
```

Output goes to `dist/`.

## Where data lives

Everything is in the browser's LocalStorage. No cross-device sync. Keys:

| Key | Content |
|-----|---------|
| `openai_api_key` | OpenAI API key |
| `target_lang` | Target language code (en/ja/de/zh/fi) |
| `native_lang` | Explanation language code |
| `history` | JSON array of utterance records (latest 200) |

The `Reset API key & languages` button deletes all of them.

## Tech stack

| Category | Tech |
|----------|------|
| Language | TypeScript |
| Build | Vite |
| Analysis | OpenAI `gpt-4o-mini` |
| Speech-to-text | OpenAI `gpt-4o-mini-transcribe` (Whisper family) |
| Audio capture | Even G2 mic (16 kHz / 16-bit PCM) |
| Glasses SDK | `@evenrealities/even_hub_sdk` |
| Persistence | LocalStorage |

## File layout

```
src/
  main.ts        UI, state management, export
  openai.ts      chat completions / transcription
  speech.ts      G2 mic control, WAV build
  languages.ts   supported-language definitions
  style.css      styles
```
