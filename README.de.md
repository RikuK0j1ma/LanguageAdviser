# Language Adviser für Even G2

**[English](README.md)** | **[日本語](README.ja.md)** | **Deutsch** | **[中文](README.zh.md)** | **[Suomi](README.fi.md)**

---

Sprach-Coaching-App für die Even G2 Smart Glasses.
Analysiert gesprochene Äußerungen in der Lernsprache, bewertet, ob der Ausdruck für Muttersprachler natürlich klingt, und liefert Hinweise in der gewählten Erklärsprache.

## Zielgruppe

Lernende, die Grundgrammatik und Grundwortschatz der Zielsprache beherrschen und Gespräche führen können, aber mit der Natürlichkeit des Ausdrucks kämpfen (CEFR B1).

## Unterstützte Sprachen

Sowohl die Lernsprache als auch die Erklärsprache lassen sich aus der Liste wählen. Beliebige Kombinationen möglich, inklusive derselben Sprache für beides.

- English
- Japanese (日本語)
- German (Deutsch)
- Chinese (中文)
- Finnish (suomi)

## Funktionen

- **Spracherkennung**: Audio wird über das Mikrofon der G2-Brille aufgenommen und mit OpenAI Whisper (`gpt-4o-mini-transcribe`) transkribiert
- **Natürlichkeitsprüfung**: `gpt-4o-mini` analysiert die Äußerung aus Muttersprachler-Perspektive
- **Umformulierungsvorschlag**: Unnatürliche Ausdrücke werden in natürliche Zielsprach-Formulierungen umgeschrieben
- **Mehrsprachige Erklärung**: Warum es unnatürlich war und wie man es korrigiert — in der gewählten Erklärsprache
- **Anzeige auf der Brille**: Korrigierter Satz und Kurztipp werden auf der Even G2 eingeblendet
- **Sprachpaar-Einstellung**: Lern- und Erklärsprache unabhängig wählbar, jederzeit im Settings-Screen änderbar
- **Persistenter Verlauf**: Äußerungen, Korrekturen, Erklärungen, Tipps, Sprachpaar und Zeitstempel werden im LocalStorage gespeichert (neueste 200 Einträge)
- **Export**: Verlauf als JSON oder CSV herunterladen (UTF-8 mit BOM, direkt in Excel lesbar)
- **Verlauf löschen**: Alle gespeicherten Einträge auf einen Klick entfernen

## Voraussetzungen

- [Node.js](https://nodejs.org/) v18+
- [OpenAI API-Key](https://platform.openai.com/api-keys)
- Even G2 Smart Glasses + Even-Hub-App (erforderlich — die App nutzt das Brillenmikrofon)

## Einrichtung

```bash
npm install
npm run dev
```

Im Browser `http://localhost:5174` öffnen.

### Betrieb auf echter G2-Hardware

```bash
npm run qr
```

QR-Code mit dem Smartphone scannen und aus der Even-Hub-App verbinden.

> Falls HTTPS nötig: SSL-Zertifikatskonfiguration in `vite.config.ts` ergänzen.

## Bedienung

1. Erststart: OpenAI-API-Key eingeben, Lernsprache (I want to practice) und Erklärsprache (Explain to me in) wählen, dann `Save`
2. `Tap to Speak` drücken und in der Lernsprache ins G2-Mikrofon sprechen
3. `Stop` → Transkription → Analyse
4. Ergebnis erscheint gleichzeitig auf dem Smartphone und auf der G2-Brille
5. Unten werden die letzten fünf Einträge gelistet; der komplette Verlauf via Export

### Sprachpaar ändern

Unten im Hauptscreen `Settings` → Selektoren ändern → `Save`.
Bestehender Verlauf bleibt erhalten; nur nachfolgende Analysen nutzen das neue Paar.

### Ergebnis lesen

- **Natural!** (grün): Ausdruck ist natürlich — ruhig so verwenden
- **More natural way:** (rot): Korrigierter Satz, Erklärung und Tipp werden angezeigt

### Exportformate

- **JSON**: alle Felder erhalten (timestamp, targetLang, nativeLang, original, result{isNatural, corrected, explanation, tip})
- **CSV**: 8 Spalten — `timestamp, target, native, isNatural, original, corrected, explanation, tip`. ISO8601-Zeitstempel. UTF-8 mit BOM

## Build

```bash
npm run build       # Produktions-Build
npm run preview     # Build-Vorschau
```

Ausgabe nach `dist/`.

## Wo die Daten liegen

Alles im LocalStorage des Browsers. Kein Sync zwischen Geräten. Schlüssel:

| Schlüssel | Inhalt |
|-----------|--------|
| `openai_api_key` | OpenAI API-Key |
| `target_lang` | Lernsprach-Code (en/ja/de/zh/fi) |
| `native_lang` | Erklärsprach-Code |
| `history` | JSON-Array mit Äußerungs-Einträgen (neueste 200) |

Der Button `Reset API key & languages` löscht alles davon.

## Tech-Stack

| Kategorie | Technologie |
|-----------|-------------|
| Sprache | TypeScript |
| Build | Vite |
| Analyse | OpenAI `gpt-4o-mini` |
| Speech-to-Text | OpenAI `gpt-4o-mini-transcribe` (Whisper-Familie) |
| Audio-Aufnahme | Even G2 Mikrofon (16 kHz / 16-bit PCM) |
| Brillen-SDK | `@evenrealities/even_hub_sdk` |
| Persistenz | LocalStorage |

## Dateistruktur

```
src/
  main.ts        UI, State-Management, Export
  openai.ts      Chat Completions / Transkription
  speech.ts      G2-Mikrofonsteuerung, WAV-Erzeugung
  languages.ts   Definition unterstützter Sprachen
  style.css      Styles
```
