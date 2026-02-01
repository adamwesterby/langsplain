/**
 * Sampling Strategies visualization
 * Interactive demo showing how temperature, top-k, and top-p affect token selection
 */

import { softmax } from './math-utils.js';

// Sample vocabulary with realistic-looking probabilities
const SAMPLE_VOCAB = [
    { token: 'the', baseLogit: 3.2 },
    { token: 'a', baseLogit: 2.8 },
    { token: 'an', baseLogit: 1.5 },
    { token: 'this', baseLogit: 1.2 },
    { token: 'that', baseLogit: 0.9 },
    { token: 'my', baseLogit: 0.7 },
    { token: 'your', baseLogit: 0.4 },
    { token: 'their', baseLogit: 0.2 },
    { token: 'some', baseLogit: 0.0 },
    { token: 'any', baseLogit: -0.3 },
    { token: 'every', baseLogit: -0.5 },
    { token: 'each', baseLogit: -0.8 },
    { token: 'one', baseLogit: -1.0 },
    { token: 'all', baseLogit: -1.3 },
    { token: 'no', baseLogit: -1.5 }
];

/**
 * Apply temperature scaling to logits
 */
function applyTemperature(logits, temperature) {
    return logits.map(l => l / temperature);
}

/**
 * Apply top-k filtering - only keep top k logits, set rest to -Infinity
 */
function applyTopK(probs, k) {
    if (k >= probs.length) return probs;

    // Find the k-th largest probability
    const sorted = [...probs].sort((a, b) => b - a);
    const threshold = sorted[k - 1];

    // Zero out probabilities below threshold
    return probs.map(p => p >= threshold ? p : 0);
}

/**
 * Apply top-p (nucleus) filtering - keep smallest set with cumulative prob >= p
 */
function applyTopP(probs, p) {
    // Get sorted indices by probability (descending)
    const indexed = probs.map((prob, i) => ({ prob, i }));
    indexed.sort((a, b) => b.prob - a.prob);

    // Find cumulative probability threshold
    let cumulative = 0;
    const keepIndices = new Set();

    for (const { prob, i } of indexed) {
        if (cumulative < p) {
            keepIndices.add(i);
            cumulative += prob;
        }
    }

    // Zero out probabilities not in the nucleus
    return probs.map((prob, i) => keepIndices.has(i) ? prob : 0);
}

/**
 * Normalize probabilities after filtering
 */
function normalize(probs) {
    const sum = probs.reduce((a, b) => a + b, 0);
    if (sum === 0) return probs;
    return probs.map(p => p / sum);
}

/**
 * Sample a token index based on probabilities
 */
function sampleToken(probs) {
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < probs.length; i++) {
        cumulative += probs[i];
        if (r < cumulative) return i;
    }
    return probs.length - 1;
}

/**
 * Compute full sampling pipeline
 */
export function computeSamplingDistribution(baseLogits, temperature, topK, topP) {
    // Step 1: Apply temperature
    const scaledLogits = applyTemperature(baseLogits, temperature);

    // Step 2: Softmax to get initial probabilities
    let probs = softmax(scaledLogits);

    // Step 3: Apply top-k
    probs = applyTopK(probs, topK);

    // Step 4: Normalize after top-k
    probs = normalize(probs);

    // Step 5: Apply top-p
    probs = applyTopP(probs, topP);

    // Step 6: Final normalization
    probs = normalize(probs);

    return {
        scaledLogits,
        finalProbs: probs,
        activeCount: probs.filter(p => p > 0).length
    };
}

/**
 * Sampling Demo UI Controller
 */
export class SamplingDemoUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.temperature = 1.0;
        this.topK = 15;
        this.topP = 1.0;
        this.baseLogits = SAMPLE_VOCAB.map(v => v.baseLogit);
        this.sampledHistory = [];
        this.comparisonMode = false;
    }

    /**
     * Initialize the demo UI
     */
    init() {
        this.container.innerHTML = `
            <div class="demo-content sampling-demo">
                <div class="demo-header">
                    <h2>Sampling Strategies</h2>
                    <p class="demo-description">
                        Adjust parameters to see how they change the probability distribution.
                        Higher temperature = more random; lower = more deterministic.
                    </p>
                </div>

                <div class="sampling-controls">
                    <div class="slider-group">
                        <label>
                            <span class="slider-label">Temperature</span>
                            <span class="slider-value" id="temp-value">1.0</span>
                        </label>
                        <input type="range" id="temp-slider" min="0.1" max="2.0" step="0.1" value="1.0">
                        <div class="slider-hints">
                            <span>Deterministic</span>
                            <span>Creative</span>
                        </div>
                    </div>

                    <div class="slider-group">
                        <label>
                            <span class="slider-label">Top-K</span>
                            <span class="slider-value" id="topk-value">15</span>
                        </label>
                        <input type="range" id="topk-slider" min="1" max="15" step="1" value="15">
                        <div class="slider-hints">
                            <span>Fewer choices</span>
                            <span>All tokens</span>
                        </div>
                    </div>

                    <div class="slider-group">
                        <label>
                            <span class="slider-label">Top-P (Nucleus)</span>
                            <span class="slider-value" id="topp-value">1.0</span>
                        </label>
                        <input type="range" id="topp-slider" min="0.1" max="1.0" step="0.05" value="1.0">
                        <div class="slider-hints">
                            <span>High-prob only</span>
                            <span>All tokens</span>
                        </div>
                    </div>
                </div>

                <div class="sampling-actions">
                    <button id="sample-btn" class="primary-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/>
                            <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/>
                            <path d="M12 12l4 4-4 4"/>
                        </svg>
                        Sample Token
                    </button>
                    <button id="compare-btn" class="secondary-btn">
                        Compare Settings
                    </button>
                    <button id="reset-btn" class="secondary-btn">
                        Reset
                    </button>
                </div>

                <div class="probability-chart-container">
                    <h4>Probability Distribution</h4>
                    <div class="chart-legend">
                        <span class="active-tokens">Active: <strong id="active-count">15</strong> tokens</span>
                        <span class="entropy-display">Entropy: <strong id="entropy-value">-</strong></span>
                    </div>
                    <div id="probability-chart" class="probability-chart"></div>
                </div>

                <div id="comparison-container" class="comparison-container hidden">
                    <h4>Comparison Mode</h4>
                    <div class="comparison-charts">
                        <div class="comparison-panel">
                            <h5>Current Settings</h5>
                            <div class="comparison-params" id="current-params"></div>
                            <div id="comparison-chart-current" class="probability-chart small"></div>
                        </div>
                        <div class="comparison-panel">
                            <h5>Saved Settings</h5>
                            <div class="comparison-params" id="saved-params"></div>
                            <div id="comparison-chart-saved" class="probability-chart small"></div>
                        </div>
                    </div>
                </div>

                <div class="sampled-history" id="sampled-history">
                    <h4>Sampled Tokens</h4>
                    <div class="history-tokens" id="history-tokens">
                        <span class="hint">Click "Sample Token" to see results</span>
                    </div>
                </div>

                <div class="demo-explanation">
                    <p><strong>How Sampling Works:</strong></p>
                    <ul>
                        <li><strong>Temperature:</strong> Divides logits before softmax. Low values (0.1-0.5) make the distribution sharper, high values (1.5-2.0) flatten it.</li>
                        <li><strong>Top-K:</strong> Only considers the K most likely tokens, zeroing out the rest.</li>
                        <li><strong>Top-P (Nucleus):</strong> Keeps the smallest set of tokens whose cumulative probability exceeds P.</li>
                    </ul>
                    <p class="hint">These strategies are often combined: temperature first, then top-k, then top-p.</p>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.updateChart();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const tempSlider = this.container.querySelector('#temp-slider');
        const topkSlider = this.container.querySelector('#topk-slider');
        const toppSlider = this.container.querySelector('#topp-slider');
        const sampleBtn = this.container.querySelector('#sample-btn');
        const compareBtn = this.container.querySelector('#compare-btn');
        const resetBtn = this.container.querySelector('#reset-btn');

        tempSlider.addEventListener('input', (e) => {
            this.temperature = parseFloat(e.target.value);
            this.container.querySelector('#temp-value').textContent = this.temperature.toFixed(1);
            this.updateChart();
        });

        topkSlider.addEventListener('input', (e) => {
            this.topK = parseInt(e.target.value);
            this.container.querySelector('#topk-value').textContent = this.topK;
            this.updateChart();
        });

        toppSlider.addEventListener('input', (e) => {
            this.topP = parseFloat(e.target.value);
            this.container.querySelector('#topp-value').textContent = this.topP.toFixed(2);
            this.updateChart();
        });

        sampleBtn.addEventListener('click', () => this.sampleAndAnimate());
        compareBtn.addEventListener('click', () => this.toggleComparison());
        resetBtn.addEventListener('click', () => this.reset());
    }

    /**
     * Update the probability chart
     */
    updateChart() {
        const result = computeSamplingDistribution(
            this.baseLogits,
            this.temperature,
            this.topK,
            this.topP
        );

        // Update active count
        this.container.querySelector('#active-count').textContent = result.activeCount;

        // Calculate entropy
        const entropy = this.calculateEntropy(result.finalProbs);
        this.container.querySelector('#entropy-value').textContent = entropy.toFixed(2);

        // Render D3 bar chart
        this.renderBarChart('probability-chart', result.finalProbs);

        // Update comparison if active
        if (this.comparisonMode) {
            this.updateComparison();
        }
    }

    /**
     * Calculate Shannon entropy
     */
    calculateEntropy(probs) {
        return -probs.reduce((sum, p) => {
            if (p > 0) {
                return sum + p * Math.log2(p);
            }
            return sum;
        }, 0);
    }

    /**
     * Render D3 bar chart
     */
    renderBarChart(containerId, probs, small = false) {
        const container = this.container.querySelector(`#${containerId}`);
        container.innerHTML = '';

        const margin = small ? { top: 10, right: 10, bottom: 40, left: 35 }
                             : { top: 20, right: 20, bottom: 60, left: 50 };
        const width = container.clientWidth - margin.left - margin.right || 600;
        const height = (small ? 150 : 250) - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // X scale
        const x = d3.scaleBand()
            .domain(SAMPLE_VOCAB.map(v => v.token))
            .range([0, width])
            .padding(0.2);

        // Y scale
        const y = d3.scaleLinear()
            .domain([0, Math.max(0.5, ...probs)])
            .range([height, 0]);

        // X axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')
            .style('font-size', small ? '10px' : '12px')
            .style('fill', '#a0a0a0');

        // Y axis
        svg.append('g')
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => (d * 100).toFixed(0) + '%'))
            .selectAll('text')
            .style('font-size', small ? '10px' : '12px')
            .style('fill', '#a0a0a0');

        // Bars
        svg.selectAll('.bar')
            .data(probs)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', (d, i) => x(SAMPLE_VOCAB[i].token))
            .attr('width', x.bandwidth())
            .attr('y', height)
            .attr('height', 0)
            .attr('fill', (d, i) => d > 0 ? this.getBarColor(d, probs) : '#333')
            .attr('rx', 3)
            .transition()
            .duration(300)
            .attr('y', d => y(d))
            .attr('height', d => height - y(d));

        // Add probability labels on bars
        if (!small) {
            svg.selectAll('.bar-label')
                .data(probs)
                .enter()
                .append('text')
                .attr('class', 'bar-label')
                .attr('x', (d, i) => x(SAMPLE_VOCAB[i].token) + x.bandwidth() / 2)
                .attr('y', d => y(d) - 5)
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .style('fill', '#a0a0a0')
                .text(d => d > 0.01 ? (d * 100).toFixed(1) + '%' : '');
        }
    }

    /**
     * Get bar color based on probability
     */
    getBarColor(prob, allProbs) {
        const maxProb = Math.max(...allProbs);
        const ratio = prob / maxProb;

        // Gradient from purple to cyan based on relative probability
        if (ratio > 0.8) return '#00d4ff';
        if (ratio > 0.5) return '#3b82f6';
        if (ratio > 0.2) return '#8b5cf6';
        return '#a855f7';
    }

    /**
     * Sample a token and animate the selection
     */
    sampleAndAnimate() {
        const result = computeSamplingDistribution(
            this.baseLogits,
            this.temperature,
            this.topK,
            this.topP
        );

        const sampledIndex = sampleToken(result.finalProbs);
        const sampledToken = SAMPLE_VOCAB[sampledIndex];

        // Animate the selection
        const bars = this.container.querySelectorAll('#probability-chart .bar');
        bars.forEach((bar, i) => {
            if (i === sampledIndex) {
                bar.style.filter = 'brightness(1.5) drop-shadow(0 0 10px #00d4ff)';
                setTimeout(() => {
                    bar.style.filter = '';
                }, 500);
            }
        });

        // Add to history
        this.sampledHistory.push({
            token: sampledToken.token,
            prob: result.finalProbs[sampledIndex],
            settings: {
                temperature: this.temperature,
                topK: this.topK,
                topP: this.topP
            }
        });

        this.updateHistory();
    }

    /**
     * Update sampled history display
     */
    updateHistory() {
        const container = this.container.querySelector('#history-tokens');

        if (this.sampledHistory.length === 0) {
            container.innerHTML = '<span class="hint">Click "Sample Token" to see results</span>';
            return;
        }

        container.innerHTML = this.sampledHistory.map((item, i) => `
            <span class="sampled-token" title="T=${item.settings.temperature}, K=${item.settings.topK}, P=${item.settings.topP.toFixed(2)}">
                ${item.token}
                <span class="token-prob">${(item.prob * 100).toFixed(1)}%</span>
            </span>
        `).join('');
    }

    /**
     * Toggle comparison mode
     */
    toggleComparison() {
        const container = this.container.querySelector('#comparison-container');

        if (!this.comparisonMode) {
            // Save current settings for comparison
            this.savedSettings = {
                temperature: this.temperature,
                topK: this.topK,
                topP: this.topP
            };
            this.comparisonMode = true;
            container.classList.remove('hidden');
            this.updateComparison();

            this.container.querySelector('#compare-btn').textContent = 'Exit Comparison';
        } else {
            this.comparisonMode = false;
            container.classList.add('hidden');
            this.container.querySelector('#compare-btn').textContent = 'Compare Settings';
        }
    }

    /**
     * Update comparison charts
     */
    updateComparison() {
        // Current settings
        const currentResult = computeSamplingDistribution(
            this.baseLogits,
            this.temperature,
            this.topK,
            this.topP
        );

        // Saved settings
        const savedResult = computeSamplingDistribution(
            this.baseLogits,
            this.savedSettings.temperature,
            this.savedSettings.topK,
            this.savedSettings.topP
        );

        // Update params display
        this.container.querySelector('#current-params').innerHTML = `
            T=${this.temperature.toFixed(1)}, K=${this.topK}, P=${this.topP.toFixed(2)}
        `;
        this.container.querySelector('#saved-params').innerHTML = `
            T=${this.savedSettings.temperature.toFixed(1)}, K=${this.savedSettings.topK}, P=${this.savedSettings.topP.toFixed(2)}
        `;

        // Render charts
        this.renderBarChart('comparison-chart-current', currentResult.finalProbs, true);
        this.renderBarChart('comparison-chart-saved', savedResult.finalProbs, true);
    }

    /**
     * Reset to defaults
     */
    reset() {
        this.temperature = 1.0;
        this.topK = 15;
        this.topP = 1.0;
        this.sampledHistory = [];
        this.comparisonMode = false;

        // Update sliders
        this.container.querySelector('#temp-slider').value = 1.0;
        this.container.querySelector('#topk-slider').value = 15;
        this.container.querySelector('#topp-slider').value = 1.0;
        this.container.querySelector('#temp-value').textContent = '1.0';
        this.container.querySelector('#topk-value').textContent = '15';
        this.container.querySelector('#topp-value').textContent = '1.0';

        // Hide comparison
        this.container.querySelector('#comparison-container').classList.add('hidden');
        this.container.querySelector('#compare-btn').textContent = 'Compare Settings';

        this.updateHistory();
        this.updateChart();
    }
}

export default SamplingDemoUI;
