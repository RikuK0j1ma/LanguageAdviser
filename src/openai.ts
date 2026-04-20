// ─── OpenAI API Integration ───

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

const SYSTEM_PROMPT = `あなたは英語のネイティブスピーカーであり、日本人の英語学習者を支援する言語アドバイザーです。
ユーザーが英語で発話した内容を受け取り、以下の観点で分析してください：

1. その表現がネイティブスピーカーにとって自然かどうか
2. 不自然な場合、どう直せば自然になるか
3. なぜその修正が必要なのか（日本語で簡潔に説明）

必ず以下のJSON形式で回答してください。他のテキストは含めないでください：
{
  "isNatural": true/false,
  "corrected": "修正後の英文（自然な場合は元の文をそのまま）",
  "explanation": "日本語での解説（なぜ不自然なのか、どう直したのか。自然な場合は褒めるコメント。2〜3文程度で簡潔に）",
  "tip": "グラスに表示する短いアドバイス（日本語で1文以内。例：『makeよりdoを使おう』）"
}

注意点：
- 文法的に正しくても、ネイティブが普段使わない不自然な表現は指摘してください
- 直訳調の英語（日本語の直訳）には特に注意してください
- コロケーション（単語の自然な組み合わせ）の誤りも指摘してください
- 表現が自然な場合は素直に褒めてください
- 解説は日本語で、修正文は英語で返してください`;

export async function analyzeUtterance(apiKey: string, utterance: string): Promise<AdviceResult> {
    const res = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
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

export async function transcribeAudio(apiKey: string, audio: Blob): Promise<string> {
    const form = new FormData();
    form.append('file', audio, 'speech.wav');
    form.append('model', TRANSCRIBE_MODEL);
    form.append('language', 'en');
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
