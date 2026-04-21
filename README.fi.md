# Language Adviser Even G2:lle

**[English](README.md)** | **[日本語](README.ja.md)** | **[Deutsch](README.de.md)** | **[中文](README.zh.md)** | **Suomi**

---

Puheenharjoitussovellus Even G2 -älylaseille.
Analysoi käyttäjän puheen kohdekielellä, arvioi kuulostaako ilmaisu natiivipuhujasta luontevalta ja antaa neuvot valitulla selityskielellä.

## Kohdekäyttäjä

Oppijat, jotka hallitsevat kohdekielen perussäännöt ja -sanaston ja pystyvät keskustelemaan, mutta kamppailevat vielä ilmaisun luontevuuden kanssa (keskitaso — esim. suomea opiskellessa YKI taso 3, englantia CEFR B1 / Cambridge PET, japania JLPT N3, kiinaa HSK 4, saksaa Goethe-Zertifikat B1).

## Tuetut kielet

Sekä kohdekieli (harjoiteltava) että selityskieli valitaan alla olevasta listasta. Kaikki yhdistelmät kelpaavat, myös sama kieli molempiin.

- English
- Japanese (日本語)
- German (Deutsch)
- Chinese (中文)
- Finnish (suomi)

## Ominaisuudet

- **Puheentunnistus**: Ääni poimitaan G2-lasien mikrofonista ja litteroidaan OpenAI Whisperillä (`gpt-4o-mini-transcribe`)
- **Luontevuuden arviointi**: `gpt-4o-mini` analysoi lausuman natiivipuhujan näkökulmasta
- **Uudelleenmuotoilu**: Epäluontevat ilmaisut kirjoitetaan uudelleen luontevaan kohdekielen muotoon
- **Monikielinen selitys**: Miksi ilmaisu oli epäluonteva ja miten sen korjaa — valitulla selityskielellä
- **Näyttö laseissa**: Korjattu lause ja lyhyt vinkki näkyvät Even G2:ssa
- **Kieliparin asetus**: Kohde- ja selityskieli valitaan erikseen, muutettavissa milloin tahansa Settings-näytöltä
- **Historian säilytys**: Lausumat, korjaukset, selitykset, vinkit, kielipari ja aikaleimat tallennetaan LocalStorageen (uusimmat 200)
- **Vienti**: Historia ladattavissa JSON- tai CSV-muodossa (UTF-8 BOMilla, avautuu suoraan Excelissä)
- **Historian tyhjennys**: Kaikki tallennetut merkinnät pois yhdellä klikkauksella

## Vaatimukset

- [Node.js](https://nodejs.org/) v18+
- [OpenAI API -avain](https://platform.openai.com/api-keys)
- Even G2 -älylasit + Even Hub -sovellus (pakollinen — sovellus käyttää lasien mikrofonia)

## Asennus

```bash
npm install
npm run dev
```

Avaa selaimessa `http://localhost:5174`.

### Ajo oikealla G2-laitteella

```bash
npm run qr
```

Skannaa QR-koodi puhelimella ja yhdistä Even Hub -sovelluksesta.

> Jos HTTPS vaaditaan: lisää SSL-sertifikaattiasetukset tiedostoon `vite.config.ts`.

## Käyttö

1. Ensimmäinen käynnistys: syötä OpenAI API -avain, valitse kohdekieli (I want to practice) ja selityskieli (Explain to me in), paina `Save`
2. Paina `Tap to Speak` ja puhu kohdekielellä G2-mikrofoniin
3. Paina `Stop` → litterointi → analyysi
4. Tulos näkyy sekä puhelimen näytöllä että G2-laseissa
5. Alhaalla näkyy 5 viimeisintä; koko historia saadaan Export-painikkeilla

### Kieliparin vaihto

Pääruudun alaosasta `Settings` → muuta valinnat → `Save`.
Aiempi historia säilyy; vain uudet analyysit käyttävät uutta paria.

### Tuloksen lukeminen

- **Natural!** (vihreä): ilmaisu on luonteva — käytä rohkeasti
- **More natural way:** (punainen): näytetään korjattu lause, selitys ja vinkki

### Vientimuodot

- **JSON**: kaikki kentät säilyvät (timestamp, targetLang, nativeLang, original, result{isNatural, corrected, explanation, tip})
- **CSV**: 8 saraketta — `timestamp, target, native, isNatural, original, corrected, explanation, tip`. ISO8601-aikaleimat. UTF-8 BOMilla

## Rakentaminen

```bash
npm run build       # tuotantobuild
npm run preview     # buildin esikatselu
```

Tuloste: `dist/`

## Missä data sijaitsee

Kaikki selaimen LocalStoragessa. Ei synkronointia laitteiden välillä. Avaimet:

| Avain | Sisältö |
|-------|---------|
| `openai_api_key` | OpenAI API -avain |
| `target_lang` | Kohdekielen koodi (en/ja/de/zh/fi) |
| `native_lang` | Selityskielen koodi |
| `history` | Lausumien JSON-taulukko (uusimmat 200) |

Painike `Reset API key & languages` poistaa kaiken yllä olevan.

## Teknologiapino

| Kategoria | Teknologia |
|-----------|------------|
| Kieli | TypeScript |
| Build | Vite |
| Analyysi | OpenAI `gpt-4o-mini` |
| Puhe-tekstiksi | OpenAI `gpt-4o-mini-transcribe` (Whisper-perhe) |
| Äänen kaappaus | Even G2 -mikrofoni (16 kHz / 16-bit PCM) |
| Lasien SDK | `@evenrealities/even_hub_sdk` |
| Tallennus | LocalStorage |

## Tiedostorakenne

```
src/
  main.ts        UI, tilanhallinta, vienti
  openai.ts      chat completions / litterointi
  speech.ts      G2-mikrofonin ohjaus, WAV-rakennus
  languages.ts   tuettujen kielten määrittelyt
  style.css      tyylit
```
