/**
 * Autoregressive generation demo
 */

import { softmax } from './math-utils.js';

const VOCAB = ['<eos>', 'the', 'cat', 'sat', 'on', 'mat', 'soft', 'warm', 'and', '.'];

const TRANSITIONS = {
    '<bos>': { the: 2.8, cat: 1.5, warm: 0.8, soft: 0.8, '<eos>': -2 },
    the: { cat: 2.8, mat: 2.3, warm: 1.5, soft: 1.4, '.': -1.5, '<eos>': -2 },
    cat: { sat: 2.9, '.': 0.8, and: 0.4, '<eos>': -1.2 },
    sat: { on: 2.6, '.': 1.2, and: 0.6, '<eos>': -1.1 },
    on: { the: 2.7, warm: 1.1, soft: 1.1, '<eos>': -1.8 },
    mat: { '.': 2.4, and: 1.2, '<eos>': 0.8 },
    soft: { mat: 2.2, and: 1.1, '.': 0.8 },
    warm: { mat: 2.2, and: 1.1, '.': 0.8 },
    and: { the: 2.4, cat: 1.5, warm: 1.3, soft: 1.3 },
    '.': { '<eos>': 2.5 }
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function normalizeLogits(baseLogits, temperature, topK) {
    const scaled = baseLogits.map((value) => value / temperature);
    const probs = softmax(scaled);

    const indexed = probs.map((prob, i) => ({ prob, i }));
    indexed.sort((a, b) => b.prob - a.prob);

    const keep = new Set(indexed.slice(0, topK).map((entry) => entry.i));
    const filtered = probs.map((prob, i) => (keep.has(i) ? prob : 0));
    const sum = filtered.reduce((acc, value) => acc + value, 0);

    return filtered.map((value) => value / (sum || 1));
}

function sampleIndex(probs) {
    const roll = Math.random();
    let cumulative = 0;

    for (let i = 0; i < probs.length; i++) {
        cumulative += probs[i];
        if (roll <= cumulative) return i;
    }

    return probs.length - 1;
}

export class GenerationDemoUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.temperature = 1.0;
        this.topK = 5;
        this.maxTokens = 12;
        this.timer = null;
        this.resetState();
    }

    resetState() {
        this.phase = 'prefill';
        this.promptText = 'The cat';
        this.tokens = [];
        this.generatedTokens = [];
        this.kvCacheSize = 0;
        this.stepCount = 0;
        this.lastDistribution = [];
        this.done = false;
    }

    init() {
        this.stopAuto();
        this.resetState();

        this.container.innerHTML = `
            <div class="demo-content generation-demo">
                <div class="demo-header">
                    <h2>Autoregressive Generation</h2>
                    <p class="demo-description">Step through prefill and decode. Watch how sampling + KV cache drive token-by-token output.</p>
                </div>

                <div class="demo-controls">
                    <div class="control-group wide-control">
                        <label for="generation-prompt">Prompt</label>
                        <input id="generation-prompt" type="text" value="${this.promptText}" maxlength="80">
                    </div>
                    <div class="control-group wide-control">
                        <label for="generation-temp">Temperature <span id="generation-temp-value">${this.temperature.toFixed(2)}</span></label>
                        <input id="generation-temp" type="range" min="0.2" max="1.8" step="0.05" value="${this.temperature}">
                    </div>
                    <div class="control-group wide-control">
                        <label for="generation-topk">Top-K <span id="generation-topk-value">${this.topK}</span></label>
                        <input id="generation-topk" type="range" min="1" max="8" step="1" value="${this.topK}">
                    </div>
                    <button id="generation-step" class="primary-btn">Next Step</button>
                    <button id="generation-auto" class="secondary-btn">Auto</button>
                    <button id="generation-reset" class="secondary-btn">Reset</button>
                </div>

                <div class="generation-state">
                    <div class="metric-grid">
                        <div class="metric-card"><span>Phase</span><strong id="generation-phase">prefill</strong></div>
                        <div class="metric-card"><span>Decode Steps</span><strong id="generation-steps">0</strong></div>
                        <div class="metric-card"><span>KV Cache Size</span><strong id="generation-cache">0</strong></div>
                        <div class="metric-card"><span>Status</span><strong id="generation-status">ready</strong></div>
                    </div>
                </div>

                <div class="generation-output">
                    <h4>Token Stream</h4>
                    <div id="generation-tokens" class="token-stream"></div>
                    <div class="generation-text"><strong>Output:</strong> <span id="generation-text"></span></div>
                </div>

                <div class="probability-chart-container">
                    <h4>Current Step Distribution</h4>
                    <div id="generation-dist" class="loss-bars"></div>
                </div>

                <div class="demo-explanation">
                    <p><strong>Pipeline:</strong> prefill computes prompt states once, then decode predicts one token per step.</p>
                    <ul>
                        <li>KV cache size grows with total context length.</li>
                        <li>Stop criteria: EOS token, max decode steps, or punctuation completion in this toy model.</li>
                        <li>Top-k and temperature shape which candidate token gets sampled next.</li>
                    </ul>
                </div>
            </div>
        `;

        this.bindEvents();
        this.render();
    }

    bindEvents() {
        this.container.querySelector('#generation-prompt').addEventListener('change', (event) => {
            this.promptText = event.target.value.trim() || 'The cat';
            this.resetStateFromControls();
        });

        this.container.querySelector('#generation-temp').addEventListener('input', (event) => {
            this.temperature = Number(event.target.value);
            this.container.querySelector('#generation-temp-value').textContent = this.temperature.toFixed(2);
        });

        this.container.querySelector('#generation-topk').addEventListener('input', (event) => {
            this.topK = Number(event.target.value);
            this.container.querySelector('#generation-topk-value').textContent = String(this.topK);
        });

        this.container.querySelector('#generation-step').addEventListener('click', () => this.nextStep());

        this.container.querySelector('#generation-auto').addEventListener('click', () => {
            if (this.timer) {
                this.stopAuto();
            } else {
                this.startAuto();
            }
        });

        this.container.querySelector('#generation-reset').addEventListener('click', () => {
            this.resetStateFromControls();
        });
    }

    resetStateFromControls() {
        this.stopAuto();
        this.resetState();
        const promptInput = this.container.querySelector('#generation-prompt');
        this.promptText = promptInput.value.trim() || 'The cat';
        this.render();
    }

    startAuto() {
        if (this.done) return;

        this.container.querySelector('#generation-auto').textContent = 'Pause';
        this.timer = setInterval(() => {
            this.nextStep();
            if (this.done) {
                this.stopAuto();
            }
        }, 350);
    }

    stopAuto() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        const autoBtn = this.container.querySelector('#generation-auto');
        if (autoBtn) autoBtn.textContent = 'Auto';
    }

    nextStep() {
        if (this.done) return;

        if (this.phase === 'prefill') {
            this.runPrefill();
        } else {
            this.runDecodeStep();
        }

        this.render();
    }

    runPrefill() {
        const cleaned = this.promptText.toLowerCase().replace(/[^a-z\s.]/g, ' ');
        const rawTokens = cleaned.split(/\s+/).filter(Boolean);
        this.tokens = rawTokens.length ? rawTokens : ['the', 'cat'];
        this.generatedTokens = [...this.tokens];
        this.kvCacheSize = this.generatedTokens.length;
        this.phase = 'decode';
        this.lastDistribution = [];
    }

    runDecodeStep() {
        const lastToken = this.generatedTokens[this.generatedTokens.length - 1] || '<bos>';
        const transition = TRANSITIONS[lastToken] || TRANSITIONS['<bos>'];

        const baseLogits = VOCAB.map((token) => {
            if (Object.prototype.hasOwnProperty.call(transition, token)) {
                return transition[token];
            }
            return -3.5;
        });

        const distribution = normalizeLogits(baseLogits, clamp(this.temperature, 0.2, 2), this.topK);
        const sampled = sampleIndex(distribution);
        const token = VOCAB[sampled];

        this.lastDistribution = VOCAB.map((vocabToken, i) => ({
            token: vocabToken,
            prob: distribution[i]
        })).sort((a, b) => b.prob - a.prob);

        this.stepCount += 1;

        if (token !== '<eos>') {
            this.generatedTokens.push(token);
        }

        this.kvCacheSize = this.generatedTokens.length;

        const punctuationDone = token === '.' && this.stepCount >= 2;
        const eosDone = token === '<eos>';
        const maxDone = this.stepCount >= this.maxTokens;

        if (eosDone || punctuationDone || maxDone) {
            this.done = true;
            this.phase = 'done';
        }
    }

    render() {
        const phaseEl = this.container.querySelector('#generation-phase');
        const stepEl = this.container.querySelector('#generation-steps');
        const cacheEl = this.container.querySelector('#generation-cache');
        const statusEl = this.container.querySelector('#generation-status');
        const tokenEl = this.container.querySelector('#generation-tokens');
        const textEl = this.container.querySelector('#generation-text');
        const distEl = this.container.querySelector('#generation-dist');

        if (!phaseEl) return;

        phaseEl.textContent = this.phase;
        stepEl.textContent = String(this.stepCount);
        cacheEl.textContent = String(this.kvCacheSize);
        statusEl.textContent = this.done ? 'stopped' : 'running';

        tokenEl.innerHTML = this.generatedTokens.map((token, i) => {
            const generatedClass = i >= this.tokens.length ? 'generated' : 'prefill';
            return `<span class="token-pill ${generatedClass}">${token}</span>`;
        }).join('');

        textEl.textContent = this.generatedTokens.join(' ');

        if (!this.lastDistribution.length) {
            distEl.innerHTML = '<div class="empty-note">Run a decode step to see logits and sampling probabilities.</div>';
            return;
        }

        const shown = this.lastDistribution.slice(0, 8);

        distEl.innerHTML = shown.map((entry) => `
            <div class="loss-bar-row ${entry.token === '<eos>' ? 'target' : ''}">
                <div class="loss-token">${entry.token}</div>
                <div class="loss-bar-track">
                    <div class="loss-bar-fill" style="width:${(entry.prob * 100).toFixed(2)}%"></div>
                </div>
                <div class="loss-bar-value">${(entry.prob * 100).toFixed(2)}%</div>
            </div>
        `).join('');
    }
}
