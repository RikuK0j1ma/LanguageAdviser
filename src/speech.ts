// ─── Web Speech API Integration ───

export interface SpeechCallbacks {
    onResult: (transcript: string, isFinal: boolean) => void;
    onError: (error: string) => void;
    onEnd: () => void;
    onStart: () => void;
}

// Extend Window for vendor-prefixed SpeechRecognition
interface SpeechRecognitionWindow extends Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
}

let recognition: SpeechRecognition | null = null;
let isListening = false;

export function isSpeechSupported(): boolean {
    const w = window as unknown as SpeechRecognitionWindow;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function startListening(callbacks: SpeechCallbacks): boolean {
    if (!isSpeechSupported()) {
        callbacks.onError('このブラウザは音声認識に対応していません');
        return false;
    }

    if (isListening) {
        stopListening();
    }

    const w = window as unknown as SpeechRecognitionWindow;
    const SpeechRecognitionClass = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return false;

    recognition = new SpeechRecognitionClass();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        isListening = true;
        callbacks.onStart();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        callbacks.onResult(transcript, result.isFinal);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        isListening = false;
        if (event.error === 'no-speech') {
            callbacks.onError('音声が検出されませんでした。もう一度お試しください。');
        } else if (event.error === 'not-allowed') {
            callbacks.onError('マイクの使用が許可されていません。ブラウザの設定を確認してください。');
        } else {
            callbacks.onError(`音声認識エラー: ${event.error}`);
        }
    };

    recognition.onend = () => {
        isListening = false;
        callbacks.onEnd();
    };

    recognition.start();
    return true;
}

export function stopListening() {
    if (recognition) {
        recognition.abort();
        recognition = null;
    }
    isListening = false;
}

export function getIsListening(): boolean {
    return isListening;
}
