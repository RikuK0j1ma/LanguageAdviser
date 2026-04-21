// ─── OpenAI API Integration ───

import { getLanguage, type LangCode } from './languages.ts';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MODEL = 'gpt-4o-mini';
const TRANSCRIBE_MODEL = 'gpt-4o-mini-transcribe';

export interface AdviceResult {
    isNatural: boolean;
    corrected: string;
    explanation: string;
    tip: string;
}

function buildSystemPrompt(targetLang: LangCode, explainLang: LangCode): string {
    const target = getLanguage(targetLang).promptName;
    const explain = getLanguage(explainLang).promptName;

    return `You are a native-level ${target} speaker and a language coach.
The learner is practicing ${target}. Write ALL explanations and tips in ${explain}.
The learner just said a sentence in ${target}. Analyze it on:

1. Is it natural for a ${target} native speaker?
2. If unnatural, how should it be rewritten to sound natural?
3. Why does the fix matter? (explain briefly in ${explain})

Respond with ONLY this JSON object, nothing else:
{
  "isNatural": true or false,
  "corrected": "the corrected sentence in ${target} (or the original if already natural)",
  "explanation": "2-3 sentence explanation in ${explain}: why it was unnatural and what you changed, or a short compliment if natural",
  "tip": "one short line in ${explain} shown on AR glasses (e.g. a rule of thumb)"
}

Guidelines:
- Flag expressions that are grammatical but not how natives would say it.
- Flag literal translations from other languages.
- Flag collocation errors (unnatural word combinations).
- Praise genuinely natural phrasing.
- Corrections are written in ${target}. Explanations and tips are written in ${explain}.
- If target and explanation languages are the same, still follow the JSON format.`;
}

export async function analyzeUtterance(
    apiKey: string,
    utterance: string,
    targetLang: LangCode,
    explainLang: LangCode,
): Promise<AdviceResult> {
    const res = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'system', content: buildSystemPrompt(targetLang, explainLang) },
                { role: 'user', content: utterance },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned empty response');

    const parsed = JSON.parse(content) as AdviceResult;
    return parsed;
}

export async function transcribeAudio(
    apiKey: string,
    audio: Blob,
    targetLang: LangCode,
): Promise<string> {
    const form = new FormData();
    form.append('file', audio, 'speech.wav');
    form.append('model', TRANSCRIBE_MODEL);
    form.append('language', getLanguage(targetLang).whisperCode);
    form.append('response_format', 'json');

    const res = await fetch(OPENAI_TRANSCRIBE_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: form,
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI Transcription error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return typeof data.text === 'string' ? data.text : '';
}
