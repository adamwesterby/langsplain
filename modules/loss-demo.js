/**
 * Loss and learning visualization
 */

import { softmax } from './math-utils.js';

const TOKENS = ['mat', 'rug', 'bed', 'sofa', 'chair', 'floor'];

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export class LossDemoUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.learningRate = 0.2;
        this.targetIndex = 0;
        this.logits = [0.2, 0.6, -0.1, -0.5, -0.2, -0.8];
        this.steps = 0;
        this.timer = null;
    }

    init() {
        this.stopAuto();

        this.container.innerHTML = `
            <div class="demo-content loss-demo">
                <div class="demo-header">
                    <h2>Loss and Learning</h2>
                    <p class="demo-description">Simulate next-token training with cross-entropy. The model updates logits after each gradient step.</p>
                </div>

                <div class="demo-controls">
                    <div class="control-group">
                        <label for="target-token">Target Token</label>
                        <select id="target-token" class="demo-select">
                            ${TOKENS.map((token, i) => `<option value="${i}" ${i === this.targetIndex ? 'selected' : ''}>${token}</option>`).join('')}
                        </select>
                    </div>
                    <div class="control-group wide-control">
                        <label for="loss-lr">Learning Rate <span id="loss-lr-value">${this.learningRate.toFixed(2)}</span></label>
                        <input id="loss-lr" type="range" min="0.05" max="0.7" step="0.01" value="${this.learningRate}">
                    </div>
                    <button id="loss-step" class="primary-btn">Train Step</button>
                    <button id="loss-auto" class="secondary-btn">Auto Train</button>
                    <button id="loss-reset" class="secondary-btn">Reset</button>
                </div>

                <div class="loss-sentence">
                    <span class="sentence-label">Prompt:</span>
                    <code>The cat sat on the</code>
                    <span class="sentence-label">Target:</span>
                    <code id="target-preview">${TOKENS[this.targetIndex]}</code>
                </div>

                <div class="probability-chart-container">
                    <h4>Next-token Probability Distribution</h4>
                    <div id="loss-bars" class="loss-bars"></div>
                </div>

                <div class="metric-grid">
                    <div class="metric-card"><span>Train Steps</span><strong id="loss-step-count">0</strong></div>
                    <div class="metric-card"><span>Cross-Entropy</span><strong id="loss-value">0.0000</strong></div>
                    <div class="metric-card"><span>Perplexity</span><strong id="ppl-value">0.00</strong></div>
                    <div class="metric-card"><span>Target Prob</span><strong id="target-prob">0.00%</strong></div>
                </div>

                <div class="demo-explanation">
                    <p><strong>Update rule (single example):</strong></p>
                    <p><code>logits = logits - lr * (softmax(logits) - one_hot(target))</code></p>
                    <ul>
                        <li>When target probability is low, loss is high.</li>
                        <li>Each step pushes probability mass toward the target token.</li>
                        <li>Perplexity is <code>exp(loss)</code>; lower is better.</li>
                    </ul>
                </div>
            </div>
        `;

        this.bindEvents();
        this.render();
    }

    bindEvents() {
        this.container.querySelector('#target-token').addEventListener('change', (event) => {
            this.targetIndex = Number(event.target.value);
            this.container.querySelector('#target-preview').textContent = TOKENS[this.targetIndex];
            this.render();
        });

        this.container.querySelector('#loss-lr').addEventListener('input', (event) => {
            this.learningRate = Number(event.target.value);
            this.container.querySelector('#loss-lr-value').textContent = this.learningRate.toFixed(2);
        });

        this.container.querySelector('#loss-step').addEventListener('click', () => this.trainStep());

        this.container.querySelector('#loss-auto').addEventListener('click', () => {
            if (this.timer) {
                this.stopAuto();
            } else {
                this.startAuto();
            }
        });

        this.container.querySelector('#loss-reset').addEventListener('click', () => this.reset());
    }

    startAuto() {
        this.container.querySelector('#loss-auto').textContent = 'Pause';
        this.timer = setInterval(() => {
            this.trainStep();
            const probs = softmax(this.logits);
            if (probs[this.targetIndex] > 0.98 || this.steps >= 200) {
                this.stopAuto();
            }
        }, 140);
    }

    stopAuto() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        const autoBtn = this.container.querySelector('#loss-auto');
        if (autoBtn) autoBtn.textContent = 'Auto Train';
    }

    reset() {
        this.stopAuto();
        this.logits = [0.2, 0.6, -0.1, -0.5, -0.2, -0.8];
        this.steps = 0;
        this.render();
    }

    trainStep() {
        const probs = softmax(this.logits);

        for (let i = 0; i < this.logits.length; i++) {
            const target = i === this.targetIndex ? 1 : 0;
            const grad = probs[i] - target;
            this.logits[i] -= this.learningRate * grad;
            this.logits[i] = clamp(this.logits[i], -8, 8);
        }

        this.steps += 1;
        this.render();
    }

    render() {
        const probs = softmax(this.logits);
        const targetProb = probs[this.targetIndex];
        const loss = -Math.log(Math.max(targetProb, 1e-9));
        const perplexity = Math.exp(loss);

        const bars = this.container.querySelector('#loss-bars');
        bars.innerHTML = probs.map((prob, i) => {
            const isTarget = i === this.targetIndex;
            return `
                <div class="loss-bar-row ${isTarget ? 'target' : ''}">
                    <div class="loss-token">${TOKENS[i]}</div>
                    <div class="loss-bar-track">
                        <div class="loss-bar-fill" style="width:${(prob * 100).toFixed(2)}%"></div>
                    </div>
                    <div class="loss-bar-value">${(prob * 100).toFixed(2)}%</div>
                </div>
            `;
        }).join('');

        this.container.querySelector('#loss-step-count').textContent = String(this.steps);
        this.container.querySelector('#loss-value').textContent = loss.toFixed(4);
        this.container.querySelector('#ppl-value').textContent = perplexity.toFixed(2);
        this.container.querySelector('#target-prob').textContent = `${(targetProb * 100).toFixed(2)}%`;
    }
}
