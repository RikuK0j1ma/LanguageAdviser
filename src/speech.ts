// ─── G2 Glasses Mic + Whisper Transcription ───
//
// Uses Even G2 glasses' built-in microphone (via EvenHub SDK) instead of the
// browser's Web Speech API. Audio is received as 16kHz / 16-bit LE PCM frames
// through `bridge.onEvenHubEvent`, accumulated until the user stops, wrapped
// in a WAV header, and sent to OpenAI's audio transcription endpoint.

import type { EvenAppBridge, EvenHubEvent } from '@evenrealities/even_hub_sdk';
import { transcribeAudio } from './openai.ts';
import type { LangCode } from './languages.ts';

const SAMPLE_RATE = 16000;
const BITS_PER_SAMPLE = 16;
const CHANNELS = 1;

export interface SpeechCallbacks {
    onStart: () => void;
    onRecording: (bytesSoFar: number) => void;
    onTranscribing: () => void;
    onFinalTranscript: (transcript: string) => void;
    onError: (error: string) => void;
    onEnd: () => void;
}

interface Session {
    bridge: EvenAppBridge;
    apiKey: string;
    targetLang: LangCode;
    callbacks: SpeechCallbacks;
    chunks: Uint8Array[];
    totalBytes: number;
    unsubscribe: (() => void) | null;
}

let session: Session | null = null;

export function isGlassesMicAvailable(bridge: EvenAppBridge | null): boolean {
    return !!bridge;
}

export function getIsListening(): boolean {
    return session !== null;
}

export async function startListening(
    bridge: EvenAppBridge | null,
    apiKey: string,
    targetLang: LangCode,
    callbacks: SpeechCallbacks,
): Promise<boolean> {
    if (!bridge) {
        callbacks.onError('G2 glasses not connected. Launch the app from Even App.');
        return false;
    }
    if (session) {
        await stopListening();
    }

    const s: Session = {
        bridge,
        apiKey,
        targetLang,
        callbacks,
        chunks: [],
        totalBytes: 0,
        unsubscribe: null,
    };
    session = s;

    s.unsubscribe = bridge.onEvenHubEvent((event: EvenHubEvent) => {
        if (!event.audioEvent) return;
        const pcm = normalizePcm(event.audioEvent.audioPcm);
        if (pcm.length === 0) return;
        s.chunks.push(pcm);
        s.totalBytes += pcm.length;
        s.callbacks.onRecording(s.totalBytes);
    });

    try {
        const ok = await bridge.audioControl(true);
        if (!ok) {
            teardown(s);
            callbacks.onError('Could not open mic. Check the glasses connection.');
            return false;
        }
    } catch (e) {
        teardown(s);
        callbacks.onError(`Mic start error: ${e instanceof Error ? e.message : String(e)}`);
        return false;
    }

    callbacks.onStart();
    return true;
}

export async function stopListening(): Promise<void> {
    const s = session;
    if (!s) return;
    session = null;

    try {
        await s.bridge.audioControl(false);
    } catch (e) {
        console.warn('audioControl(false) failed:', e);
    }
    if (s.unsubscribe) s.unsubscribe();

    if (s.totalBytes < SAMPLE_RATE) {
        s.callbacks.onError('Audio too short. Please speak a bit longer.');
        s.callbacks.onEnd();
        return;
    }

    s.callbacks.onTranscribing();
    try {
        const wav = buildWav(s.chunks, s.totalBytes);
        const text = await transcribeAudio(s.apiKey, wav, s.targetLang);
        const trimmed = text.trim();
        if (!trimmed) {
            s.callbacks.onError('Could not recognize speech. Please try again.');
        } else {
            s.callbacks.onFinalTranscript(trimmed);
        }
    } catch (e) {
        s.callbacks.onError(`Transcription error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        s.callbacks.onEnd();
    }
}

export async function cancelListening(): Promise<void> {
    const s = session;
    if (!s) return;
    session = null;
    try {
        await s.bridge.audioControl(false);
    } catch {
        // ignore
    }
    if (s.unsubscribe) s.unsubscribe();
    s.callbacks.onEnd();
}

function teardown(s: Session) {
    if (session === s) session = null;
    if (s.unsubscribe) s.unsubscribe();
}

// Host may deliver audioPcm as Uint8Array, number[], or base64 string.
function normalizePcm(raw: unknown): Uint8Array {
    if (raw instanceof Uint8Array) return raw;
    if (Array.isArray(raw)) return new Uint8Array(raw as number[]);
    if (typeof raw === 'string') {
        try {
            const bin = atob(raw);
            const out = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
            return out;
        } catch {
            return new Uint8Array(0);
        }
    }
    return new Uint8Array(0);
}

function buildWav(chunks: Uint8Array[], dataLength: number): Blob {
    const byteRate = (SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE) / 8;
    const blockAlign = (CHANNELS * BITS_PER_SAMPLE) / 8;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeAscii(view, 8, 'WAVE');
    writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, CHANNELS, true);
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, BITS_PER_SAMPLE, true);
    writeAscii(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    const out = new Uint8Array(buffer);
    let offset = 44;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
    }
    return new Blob([buffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, text: string) {
    for (let i = 0; i < text.length; i++) {
        view.setUint8(offset + i, text.charCodeAt(i));
    }
}
