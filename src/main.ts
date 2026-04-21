import './style.css';
import {
    waitForEvenAppBridge,
    CreateStartUpPageContainer,
    TextContainerProperty,
    TextContainerUpgrade,
} from '@evenrealities/even_hub_sdk';
import { analyzeUtterance, type AdviceResult } from './openai.ts';
import { startListening, stopListening, getIsListening } from './speech.ts';
import { LANGUAGES, isLangCode, getLanguage, type LangCode } from './languages.ts';

// ─── Constants ───

const CONTAINER_ID = 1;
const CONTAINER_NAME = 'advice-text';
const LS_API_KEY = 'openai_api_key';
const LS_TARGET_LANG = 'target_lang';
const LS_NATIVE_LANG = 'native_lang';
const LS_HISTORY = 'history';
const HISTORY_MAX = 200;

// Defaults preserve the original behaviour: speak English, explain in Japanese.
const DEFAULT_TARGET: LangCode = 'en';
const DEFAULT_NATIVE: LangCode = 'ja';

// ─── State ───

let bridge: Awaited<ReturnType<typeof waitForEvenAppBridge>> | null = null;
let apiKey = '';
let targetLang: LangCode = DEFAULT_TARGET;
let nativeLang: LangCode = DEFAULT_NATIVE;
let isAnalyzing = false;

interface HistoryEntry {
    timestamp: number;
    targetLang: LangCode;
    nativeLang: LangCode;
    original: string;
    result: AdviceResult;
}
let history: HistoryEntry[] = [];

function loadHistory() {
    try {
        const raw = localStorage.getItem(LS_HISTORY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) history = parsed as HistoryEntry[];
    } catch (e) {
        console.warn('History load failed:', e);
    }
}

function saveHistory() {
    try {
        const trimmed = history.slice(-HISTORY_MAX);
        history = trimmed;
        localStorage.setItem(LS_HISTORY, JSON.stringify(trimmed));
    } catch (e) {
        console.warn('History save failed (quota?):', e);
    }
}

function clearHistory() {
    history = [];
    localStorage.removeItem(LS_HISTORY);
    updateHistory();
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportJson() {
    if (history.length === 0) return;
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `language-adviser-${exportStamp()}.json`);
}

function exportCsv() {
    if (history.length === 0) return;
    const headers = ['timestamp', 'target', 'native', 'isNatural', 'original', 'corrected', 'explanation', 'tip'];
    const rows = history.map(e => [
        new Date(e.timestamp).toISOString(),
        e.targetLang,
        e.nativeLang,
        String(e.result.isNatural),
        e.original,
        e.result.corrected,
        e.result.explanation,
        e.result.tip,
    ].map(csvCell).join(','));
    const csv = '\ufeff' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `language-adviser-${exportStamp()}.csv`);
}

function csvCell(v: string): string {
    const needsQuote = /[",\r\n]/.test(v);
    const escaped = v.replace(/"/g, '""');
    return needsQuote ? `"${escaped}"` : escaped;
}

function exportStamp(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// ─── Phone UI ───

function langOptions(selected: LangCode): string {
    return LANGUAGES.map(l =>
        `<option value="${l.code}"${l.code === selected ? ' selected' : ''}>${l.label}</option>`
    ).join('');
}

function renderUI() {
    document.getElementById('app')!.innerHTML = `
        <h2>Language Adviser</h2>
        <p class="subtitle">Even G2 - Speaking Coach</p>

        <div id="setup" style="display:none">
            <p>OpenAI API Key:</p>
            <input id="apiKeyInput" type="password" placeholder="sk-..." />

            <div class="lang-row">
                <label>I want to practice:
                    <select id="targetLangSelect">${langOptions(targetLang)}</select>
                </label>
            </div>
            <div class="lang-row">
                <label>Explain to me in:
                    <select id="nativeLangSelect">${langOptions(nativeLang)}</select>
                </label>
            </div>

            <button id="saveSetup">Save</button>
            <p class="hint">
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">
                    OpenAI Dashboard
                </a>
                — get your API key here.
            </p>
        </div>

        <div id="mainUI" style="display:none">
            <div id="langBadge"></div>
            <div id="status">Tap the mic and start speaking</div>
            <div id="transcript" style="display:none"></div>
            <button id="micBtn">Tap to Speak</button>
            <div id="adviceCard" style="display:none"></div>
            <div id="history"></div>
            <div id="historyActions" style="display:none">
                <button id="exportJsonBtn" class="secondary">Export JSON</button>
                <button id="exportCsvBtn" class="secondary">Export CSV</button>
                <button id="clearHistoryBtn" class="secondary danger">Clear History</button>
            </div>
            <button id="settingsBtn">Settings</button>
        </div>

        <button id="resetBtn" style="display:none">Reset API key &amp; languages</button>
    `;
}

function showSetupUI() {
    // Re-render so select elements pick up the latest stored values.
    renderUI();
    wireSetupHandlers();
    show('setup');
    hide('mainUI');
    hide('resetBtn');
}

function showMainUI() {
    renderUI();
    wireMainHandlers();
    hide('setup');
    show('mainUI');
    show('resetBtn');
    updateLangBadge();
    updateHistory();
    setStatus('Tap the mic and start speaking');
}

function updateLangBadge() {
    const el = document.getElementById('langBadge');
    if (!el) return;
    const t = getLanguage(targetLang).label;
    const n = getLanguage(nativeLang).label;
    el.textContent = `Practicing ${t} · Explained in ${n}`;
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
    const actions = document.getElementById('historyActions');
    if (!el) return;
    if (history.length === 0) {
        el.innerHTML = '';
        if (actions) actions.style.display = 'none';
        return;
    }
    if (actions) actions.style.display = '';

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

    el.innerHTML = `<p class="history-title">History</p>${items}`;
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

    startListening(bridge, apiKey, targetLang, {
        onStart() {
            micBtn?.classList.add('listening');
            if (micBtn) micBtn.textContent = 'Stop';
            setStatus('Recording... press Stop when done');
            showOnGlasses('Listening...');
            if (transcriptEl) {
                transcriptEl.textContent = '';
                transcriptEl.classList.add('interim');
            }
            show('transcript');
        },

        onRecording(bytesSoFar: number) {
            const seconds = (bytesSoFar / (16000 * 2)).toFixed(1);
            if (transcriptEl) {
                transcriptEl.textContent = `Recording: ${seconds}s`;
            }
        },

        onTranscribing() {
            if (transcriptEl) {
                transcriptEl.textContent = 'Transcribing...';
                transcriptEl.classList.remove('interim');
            }
            setStatus('Transcribing...');
            showOnGlasses('Transcribing...');
        },

        onFinalTranscript(transcript: string) {
            if (transcriptEl) transcriptEl.textContent = transcript;
            handleFinalTranscript(transcript);
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
    setStatus('Analyzing...');
    showOnGlasses('Analyzing...\n' + utterance);

    try {
        const result = await analyzeUtterance(apiKey, utterance, targetLang, nativeLang);

        showAdvice(utterance, result);
        history.push({
            timestamp: Date.now(),
            targetLang,
            nativeLang,
            original: utterance,
            result,
        });
        saveHistory();
        updateHistory();

        // Show on glasses
        if (result.isNatural) {
            showOnGlasses(`OK: ${result.corrected}\n\n${result.tip}`);
        } else {
            showOnGlasses(`${result.corrected}\n\n${result.tip}`);
        }

        setStatus('Done! Try another one.');
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setStatus(`Error: ${msg}`);
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

// ─── Handlers ───

function wireSetupHandlers() {
    // Pre-fill API key input if already saved (so user can just change languages).
    const apiInput = document.getElementById('apiKeyInput') as HTMLInputElement | null;
    if (apiInput && apiKey) apiInput.value = apiKey;

    document.getElementById('saveSetup')?.addEventListener('click', () => {
        const input = document.getElementById('apiKeyInput') as HTMLInputElement;
        const tSel = document.getElementById('targetLangSelect') as HTMLSelectElement;
        const nSel = document.getElementById('nativeLangSelect') as HTMLSelectElement;

        const val = input.value.trim();
        if (!val) return;

        apiKey = val;
        if (isLangCode(tSel.value)) targetLang = tSel.value;
        if (isLangCode(nSel.value)) nativeLang = nSel.value;

        localStorage.setItem(LS_API_KEY, apiKey);
        localStorage.setItem(LS_TARGET_LANG, targetLang);
        localStorage.setItem(LS_NATIVE_LANG, nativeLang);

        showMainUI();
    });
}

function wireMainHandlers() {
    document.getElementById('micBtn')?.addEventListener('click', onMicClick);

    document.getElementById('settingsBtn')?.addEventListener('click', () => {
        stopListening();
        showSetupUI();
    });

    document.getElementById('exportJsonBtn')?.addEventListener('click', exportJson);
    document.getElementById('exportCsvBtn')?.addEventListener('click', exportCsv);
    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
        if (history.length === 0) return;
        if (confirm('Delete all saved history? This cannot be undone.')) clearHistory();
    });

    document.getElementById('resetBtn')?.addEventListener('click', () => {
        if (!confirm('Reset API key, language settings, and clear history?')) return;
        localStorage.removeItem(LS_API_KEY);
        localStorage.removeItem(LS_TARGET_LANG);
        localStorage.removeItem(LS_NATIVE_LANG);
        localStorage.removeItem(LS_HISTORY);
        apiKey = '';
        targetLang = DEFAULT_TARGET;
        nativeLang = DEFAULT_NATIVE;
        history = [];
        stopListening();
        location.reload();
    });
}

// ─── Init ───

async function init() {
    // Load saved settings
    apiKey = localStorage.getItem(LS_API_KEY) || '';
    const savedTarget = localStorage.getItem(LS_TARGET_LANG);
    const savedNative = localStorage.getItem(LS_NATIVE_LANG);
    if (isLangCode(savedTarget)) targetLang = savedTarget;
    if (isLangCode(savedNative)) nativeLang = savedNative;
    loadHistory();

    // Init glasses (non-blocking). The G2 mic is used for audio capture.
    initGlasses();

    // Route to correct UI state
    if (!apiKey) {
        showSetupUI();
    } else {
        showMainUI();
    }
}

init();
