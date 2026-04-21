// ─── Supported Languages ───

export type LangCode = 'en' | 'ja' | 'de' | 'zh' | 'fi';

export interface Language {
    code: LangCode;
    // English display name (UI labels are English).
    label: string;
    // Name as used inside the LLM prompt — natural English phrasing.
    promptName: string;
    // ISO 639-1 code used by OpenAI Whisper / gpt-4o-mini-transcribe.
    whisperCode: string;
}

export const LANGUAGES: Language[] = [
    { code: 'en', label: 'English',  promptName: 'English',           whisperCode: 'en' },
    { code: 'ja', label: 'Japanese', promptName: 'Japanese (日本語)', whisperCode: 'ja' },
    { code: 'de', label: 'German',   promptName: 'German (Deutsch)',  whisperCode: 'de' },
    { code: 'zh', label: 'Chinese',  promptName: 'Chinese (中文)',    whisperCode: 'zh' },
    { code: 'fi', label: 'Finnish',  promptName: 'Finnish (suomi)',   whisperCode: 'fi' },
];

export function getLanguage(code: LangCode): Language {
    return LANGUAGES.find(l => l.code === code) ?? LANGUAGES[0];
}

export function isLangCode(v: unknown): v is LangCode {
    return typeof v === 'string' && LANGUAGES.some(l => l.code === v);
}
