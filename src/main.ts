import './style.css';
import {
    waitForEvenAppBridge,
    CreateStartUpPageContainer,
    TextContainerProperty,
    TextContainerUpgrade,
} from '@evenrealities/even_hub_sdk';
import { analyzeUtterance, type AdviceResult } from './openai.ts';
import { startListening, stopListening, getIsListening, isSpeechSupported } from './speech.ts';

// ─── Constants ───

const CONTAINER_ID = 1;
const CONTAINER_NAME = 'advice-text';
const LS_API_KEY = 'openai_api_key';

// ─── State ───

let bridge: Awaited<ReturnType<typeof waitForEvenAppBridge>> | null = null;
let apiKey = '';
let isAnalyzing = false;

interface HistoryEntry {
    original: string;
    result: AdviceResult;
}
const history: HistoryEntry[] = [];

// ─── Phone UI ───

function renderUI() {
    document.getElementById('app')!.innerHTML = `
        <h2>Language Adviser</h2>
        <p class="subtitle">Even G2 - English Speaking Coach</p>

        <div id="setup" style="display:none">
            <p>OpenAI API Key:</p>
            <input id="apiKeyInput" type="password" placeholder="sk-..." />
            <button id="saveApiKey">保存</button>
            <p class="hint">
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">
                    OpenAI Dashboard
                </a>
                でAPIキーを取得してください。
            </p>
        </div>

        <div id="mainUI" style="display:none">
            <div id="status">マイクボタンを押して英語で話してください</div>
            <div id="transcript" style="display:none"></div>
            <button id="micBtn">Tap to Speak</button>
            <div id="adviceCard" style="display:none"></div>
            <div id="history"></div>
        </div>

        <button id="resetBtn" style="display:none">APIキーをリセット</button>
    `;
}

function showSetupUI() {
    show('setup');
    hide('mainUI');
    hide('resetBtn');
}

function showMainUI() {
    hide('setup');
    show('mainUI');
    show('resetBtn');
    setStatus('マイクボタンを押して英語で話してください');
}

function setStatus(msg: string) {
    const el = document.getElementById('status');
    if (el) el.textContent = msg;
}

function show(id: string) {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
}

function hide(id: string) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

// ─── Advice Display ───

function showAdvice(original: string, result: AdviceResult) {
    const card = document.getElementById('adviceCard');
    if (!card) return;

    const headerClass = result.isNatural ? 'natural' : 'unnatural';
    const headerText = result.isNatural ? 'Natural!' : 'More natural way:';

    card.innerHTML = `
        <div class="advice-header ${headerClass}">${headerText}</div>
        <div class="advice-body">
            ${!result.isNatural ? `<p class="advice-original">${escapeHtml(original)}</p>` : ''}
            <p class="advice-corrected">${escapeHtml(result.corrected)}</p>
            <p class="advice-explanation">${escapeHtml(result.explanation)}</p>
            <p class="advice-tip">${escapeHtml(result.tip)}</p>
        </div>
    `;
    show('adviceCard');
}

function updateHistory() {
    const el = document.getElementById('history');
    if (!el || history.length === 0) return;

    const items = history.slice(-5).reverse().map(entry => {
        if (entry.result.isNatural) {
            return `<div class="history-item">
                <span class="natural-mark">OK</span>
                <span class="corrected">${escapeHtml(entry.original)}</span>
            </div>`;
        }
        return `<div class="history-item">
            <span class="original">${escapeHtml(entry.original)}</span>
            &rarr; <span class="corrected">${escapeHtml(entry.result.corrected)}</span>
        </div>`;
    }).join('');

    el.innerHTML = `<p class="history-title">履歴</p>${items}`;
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ─── Glasses Display ───

async function initGlasses() {
    try {
        bridge = await waitForEvenAppBridge();
        console.log('G2 bridge connected');

        await bridge.createStartUpPageContainer(
            new CreateStartUpPageContainer({
                containerTotalNum: 1,
                textObject: [
                    new TextContainerProperty({
                        xPosition: 350,
                        yPosition: 0,
                        width: 226,
                        height: 288,
                        borderWidth: 0,
                        paddingLength: 16,
                        containerID: CONTAINER_ID,
                        containerName: CONTAINER_NAME,
                        content: 'Language Adviser\nReady',
                        isEventCapture: 0,
                    }),
                ],
            }),
        );
        console.log('G2 display initialized');
    } catch (e) {
        console.warn('G2 bridge unavailable (running in browser?):', e);
        bridge = null;
    }
}

async function showOnGlasses(text: string) {
    if (!bridge) return;
    try {
        const safeText = text.slice(0, 2000);
        await bridge.textContainerUpgrade(
            new TextContainerUpgrade({
                containerID: CONTAINER_ID,
                containerName: CONTAINER_NAME,
                contentOffset: 0,
                contentLength: safeText.length,
                content: safeText,
            }),
        );
    } catch (e) {
        console.error('G2 display update error:', e);
    }
}

// ─── Speech + Analysis Flow ───

function onMicClick() {
    if (isAnalyzing) return;

    if (getIsListening()) {
        stopListening();
        return;
    }

    hide('adviceCard');
    const transcriptEl = document.getElementById('transcript');
    const micBtn = document.getElementById('micBtn');

    startListening({
        onStart() {
            micBtn?.classList.add('listening');
            if (micBtn) micBtn.textContent = 'Listening...';
            setStatus('聞いています... 英語で話してください');
            showOnGlasses('Listening...');
            if (transcriptEl) {
                transcriptEl.textContent = '';
                transcriptEl.classList.add('interim');
            }
            show('transcript');
        },

        onResult(transcript: string, isFinal: boolean) {
            if (transcriptEl) {
                transcriptEl.textContent = transcript;
                if (isFinal) {
                    transcriptEl.classList.remove('interim');
                }
            }

            if (isFinal && transcript.trim()) {
                handleFinalTranscript(transcript.trim());
            }
        },

        onError(error: string) {
            setStatus(error);
            micBtn?.classList.remove('listening');
            if (micBtn) micBtn.textContent = 'Tap to Speak';
            showOnGlasses('Error\n' + error);
        },

        onEnd() {
            micBtn?.classList.remove('listening');
            if (!isAnalyzing && micBtn) {
                micBtn.textContent = 'Tap to Speak';
            }
        },
    });
}

async function handleFinalTranscript(utterance: string) {
    const micBtn = document.getElementById('micBtn');
    isAnalyzing = true;
    if (micBtn) {
        micBtn.textContent = 'Analyzing...';
        micBtn.setAttribute('disabled', '');
    }
    setStatus('分析中...');
    showOnGlasses('Analyzing...\n' + utterance);

    try {
        const result = await analyzeUtterance(apiKey, utterance);

        showAdvice(utterance, result);
        history.push({ original: utterance, result });
        updateHistory();

        // Show on glasses
        if (result.isNatural) {
            showOnGlasses(`OK: ${result.corrected}\n\n${result.tip}`);
        } else {
            showOnGlasses(`${result.corrected}\n\n${result.tip}`);
        }

        setStatus('完了！もう一度話してみましょう');
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setStatus(`エラー: ${msg}`);
        showOnGlasses('Error');
        console.error('Analysis error:', e);
    } finally {
        isAnalyzing = false;
        if (micBtn) {
            micBtn.textContent = 'Tap to Speak';
            micBtn.removeAttribute('disabled');
        }
    }
}

// ─── Init ───

async function init() {
    renderUI();

    // Check speech support
    if (!isSpeechSupported()) {
        setStatus('このブラウザは音声認識に対応していません。Chromeをご利用ください。');
    }

    // Load saved API key
    apiKey = localStorage.getItem(LS_API_KEY) || '';

    // Init glasses (non-blocking)
    initGlasses();

    // Route to correct UI state
    if (!apiKey) {
        showSetupUI();
    } else {
        showMainUI();
    }

    // Wire up event handlers
    document.getElementById('saveApiKey')?.addEventListener('click', () => {
        const input = document.getElementById('apiKeyInput') as HTMLInputElement;
        const val = input.value.trim();
        if (val) {
            apiKey = val;
            localStorage.setItem(LS_API_KEY, apiKey);
            showMainUI();
        }
    });

    document.getElementById('micBtn')?.addEventListener('click', onMicClick);

    document.getElementById('resetBtn')?.addEventListener('click', () => {
        localStorage.removeItem(LS_API_KEY);
        apiKey = '';
        stopListening();
        location.reload();
    });
}

init();
