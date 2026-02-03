/**
 * Gradient descent visualization
 */

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lossAt(x, y) {
    return 0.12 * x * x + 0.42 * y * y + 0.08 * Math.sin(1.6 * x) * Math.cos(1.4 * y);
}

function gradientAt(x, y) {
    const dx = 0.24 * x + 0.128 * Math.cos(1.6 * x) * Math.cos(1.4 * y);
    const dy = 0.84 * y - 0.112 * Math.sin(1.6 * x) * Math.sin(1.4 * y);
    return { dx, dy };
}

export class GradientDemoUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.optimizer = 'sgd';
        this.learningRate = 0.12;
        this.beta1 = 0.9;
        this.beta2 = 0.999;
        this.eps = 1e-8;
        this.point = { x: 3.6, y: -2.2 };
        this.m = { x: 0, y: 0 };
        this.v = { x: 0, y: 0 };
        this.t = 0;
        this.steps = 0;
        this.timer = null;
        this.path = [];
        this.dragging = false;
        this.lastWidth = 520;
        this.lastHeight = 320;
        this.boundMouseMove = null;
        this.boundMouseUp = null;
        this.dragSvg = null;
    }

    init() {
        this.stopAutoRun();
        if (this.boundMouseMove) {
            window.removeEventListener('mousemove', this.boundMouseMove);
            this.boundMouseMove = null;
        }
        if (this.boundMouseUp) {
            window.removeEventListener('mouseup', this.boundMouseUp);
            this.boundMouseUp = null;
        }

        this.container.innerHTML = `
            <div class="demo-content gradient-demo">
                <div class="demo-header">
                    <h2>Gradient Descent Playground</h2>
                    <p class="demo-description">Move the starting point, then step through SGD or Adam on a toy 2D loss surface.</p>
                </div>

                <div class="demo-controls">
                    <div class="control-group">
                        <label for="optimizer-select">Optimizer</label>
                        <select id="optimizer-select" class="demo-select">
                            <option value="sgd">SGD</option>
                            <option value="adam">Adam</option>
                        </select>
                    </div>
                    <div class="control-group wide-control">
                        <label for="lr-slider">Learning Rate <span id="lr-value">0.12</span></label>
                        <input type="range" id="lr-slider" min="0.02" max="0.4" step="0.01" value="0.12">
                    </div>
                    <button id="step-gradient" class="primary-btn">Step</button>
                    <button id="run-gradient" class="secondary-btn">Auto Run</button>
                    <button id="reset-gradient" class="secondary-btn">Reset</button>
                </div>

                <div class="surface-wrap">
                    <svg id="gradient-surface" viewBox="0 0 520 320" preserveAspectRatio="xMidYMid meet"></svg>
                </div>

                <div class="metric-grid">
                    <div class="metric-card"><span>Step</span><strong id="metric-step">0</strong></div>
                    <div class="metric-card"><span>Loss</span><strong id="metric-loss">0.0000</strong></div>
                    <div class="metric-card"><span>Gradient Norm</span><strong id="metric-grad">0.0000</strong></div>
                    <div class="metric-card"><span>Position</span><strong id="metric-pos">(0.00, 0.00)</strong></div>
                </div>

                <div class="demo-explanation">
                    <p><strong>What to observe:</strong></p>
                    <ul>
                        <li>SGD follows the raw local gradient each step.</li>
                        <li>Adam uses momentum and adaptive scaling, which often stabilizes zig-zagging.</li>
                        <li>Steeper regions produce larger gradient norms and larger updates at the same learning rate.</li>
                    </ul>
                </div>
            </div>
        `;

        this.path = [
            { x: this.point.x, y: this.point.y }
        ];

        this.bindEvents();
        this.renderSurface();
        this.updateMetrics();
    }

    bindEvents() {
        const optimizerSelect = this.container.querySelector('#optimizer-select');
        const lrSlider = this.container.querySelector('#lr-slider');
        const stepBtn = this.container.querySelector('#step-gradient');
        const runBtn = this.container.querySelector('#run-gradient');
        const resetBtn = this.container.querySelector('#reset-gradient');

        optimizerSelect.value = this.optimizer;

        optimizerSelect.addEventListener('change', (event) => {
            this.optimizer = event.target.value;
        });

        lrSlider.addEventListener('input', (event) => {
            this.learningRate = Number(event.target.value);
            this.container.querySelector('#lr-value').textContent = this.learningRate.toFixed(2);
        });

        stepBtn.addEventListener('click', () => this.step());

        runBtn.addEventListener('click', () => {
            if (this.timer) {
                this.stopAutoRun();
            } else {
                this.startAutoRun();
            }
        });

        resetBtn.addEventListener('click', () => this.reset());

        this.boundMouseMove = (event) => {
            if (!this.dragging || !this.dragSvg) return;

            const rect = this.dragSvg.getBoundingClientRect();
            const sx = clamp((event.clientX - rect.left) * (this.lastWidth / rect.width), 0, this.lastWidth);
            const sy = clamp((event.clientY - rect.top) * (this.lastHeight / rect.height), 0, this.lastHeight);
            const model = this.screenToModel(sx, sy, this.lastWidth, this.lastHeight);

            this.point.x = model.x;
            this.point.y = model.y;
            this.path = [{ x: this.point.x, y: this.point.y }];
            this.m = { x: 0, y: 0 };
            this.v = { x: 0, y: 0 };
            this.t = 0;
            this.steps = 0;
            this.renderSurface();
            this.updateMetrics();
        };

        this.boundMouseUp = () => {
            this.dragging = false;
        };

        window.addEventListener('mousemove', this.boundMouseMove);
        window.addEventListener('mouseup', this.boundMouseUp);
    }

    startAutoRun() {
        const runBtn = this.container.querySelector('#run-gradient');
        runBtn.textContent = 'Pause';

        this.timer = setInterval(() => {
            this.step();
            if (this.steps >= 120 || this.gradientNorm() < 0.0008) {
                this.stopAutoRun();
            }
        }, 180);
    }

    stopAutoRun() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        const runBtn = this.container.querySelector('#run-gradient');
        if (runBtn) runBtn.textContent = 'Auto Run';
    }

    reset() {
        this.stopAutoRun();
        this.point = { x: 3.6, y: -2.2 };
        this.m = { x: 0, y: 0 };
        this.v = { x: 0, y: 0 };
        this.t = 0;
        this.steps = 0;
        this.path = [{ x: this.point.x, y: this.point.y }];
        this.renderSurface();
        this.updateMetrics();
    }

    step() {
        const { dx, dy } = gradientAt(this.point.x, this.point.y);

        if (this.optimizer === 'adam') {
            this.t += 1;
            this.m.x = this.beta1 * this.m.x + (1 - this.beta1) * dx;
            this.m.y = this.beta1 * this.m.y + (1 - this.beta1) * dy;
            this.v.x = this.beta2 * this.v.x + (1 - this.beta2) * dx * dx;
            this.v.y = this.beta2 * this.v.y + (1 - this.beta2) * dy * dy;

            const mHatX = this.m.x / (1 - Math.pow(this.beta1, this.t));
            const mHatY = this.m.y / (1 - Math.pow(this.beta1, this.t));
            const vHatX = this.v.x / (1 - Math.pow(this.beta2, this.t));
            const vHatY = this.v.y / (1 - Math.pow(this.beta2, this.t));

            this.point.x -= this.learningRate * mHatX / (Math.sqrt(vHatX) + this.eps);
            this.point.y -= this.learningRate * mHatY / (Math.sqrt(vHatY) + this.eps);
        } else {
            this.point.x -= this.learningRate * dx;
            this.point.y -= this.learningRate * dy;
        }

        this.point.x = clamp(this.point.x, -5, 5);
        this.point.y = clamp(this.point.y, -5, 5);

        this.steps += 1;
        this.path.push({ x: this.point.x, y: this.point.y });

        if (this.path.length > 200) {
            this.path.shift();
        }

        this.renderSurface();
        this.updateMetrics();
    }

    gradientNorm() {
        const grad = gradientAt(this.point.x, this.point.y);
        return Math.sqrt(grad.dx * grad.dx + grad.dy * grad.dy);
    }

    modelToScreen(x, y, width, height) {
        return {
            sx: ((x + 5) / 10) * width,
            sy: height - ((y + 5) / 10) * height
        };
    }

    screenToModel(sx, sy, width, height) {
        return {
            x: (sx / width) * 10 - 5,
            y: ((height - sy) / height) * 10 - 5
        };
    }

    renderSurface() {
        const svg = this.container.querySelector('#gradient-surface');
        if (!svg) return;

        const width = this.lastWidth;
        const height = this.lastHeight;

        const surfaceCells = [];
        const step = 16;

        let minLoss = Infinity;
        let maxLoss = -Infinity;

        for (let gx = 0; gx <= width; gx += step) {
            for (let gy = 0; gy <= height; gy += step) {
                const model = this.screenToModel(gx + step / 2, gy + step / 2, width, height);
                const value = lossAt(model.x, model.y);
                minLoss = Math.min(minLoss, value);
                maxLoss = Math.max(maxLoss, value);
                surfaceCells.push({ gx, gy, value });
            }
        }

        const lossRange = Math.max(1e-6, maxLoss - minLoss);

        svg.innerHTML = '';

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', '0');
        bg.setAttribute('y', '0');
        bg.setAttribute('width', String(width));
        bg.setAttribute('height', String(height));
        bg.setAttribute('fill', '#101010');
        svg.appendChild(bg);

        surfaceCells.forEach((cell) => {
            const normalized = (cell.value - minLoss) / lossRange;
            const alpha = 0.15 + normalized * 0.55;
            const hue = 190 - normalized * 130;
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', String(cell.gx));
            rect.setAttribute('y', String(cell.gy));
            rect.setAttribute('width', String(step + 0.6));
            rect.setAttribute('height', String(step + 0.6));
            rect.setAttribute('fill', `hsla(${hue}, 80%, 55%, ${alpha})`);
            svg.appendChild(rect);
        });

        const axes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        axes.innerHTML = `
            <line x1="${width / 2}" y1="0" x2="${width / 2}" y2="${height}" stroke="#333" stroke-width="1" />
            <line x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}" stroke="#333" stroke-width="1" />
            <text x="${width - 26}" y="${height / 2 - 8}" fill="#777" font-size="10">+x</text>
            <text x="${width / 2 + 8}" y="16" fill="#777" font-size="10">+y</text>
        `;
        svg.appendChild(axes);

        if (this.path.length > 1) {
            const pathD = this.path.map((point, idx) => {
                const { sx, sy } = this.modelToScreen(point.x, point.y, width, height);
                return `${idx === 0 ? 'M' : 'L'} ${sx} ${sy}`;
            }).join(' ');

            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', pathD);
            pathEl.setAttribute('fill', 'none');
            pathEl.setAttribute('stroke', '#ffffff');
            pathEl.setAttribute('stroke-width', '2');
            pathEl.setAttribute('stroke-opacity', '0.8');
            svg.appendChild(pathEl);
        }

        const point = this.modelToScreen(this.point.x, this.point.y, width, height);

        const pointCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pointCircle.setAttribute('cx', String(point.sx));
        pointCircle.setAttribute('cy', String(point.sy));
        pointCircle.setAttribute('r', '7');
        pointCircle.setAttribute('fill', '#f97316');
        pointCircle.setAttribute('stroke', '#fff');
        pointCircle.setAttribute('stroke-width', '2');
        pointCircle.setAttribute('cursor', 'grab');
        svg.appendChild(pointCircle);

        pointCircle.addEventListener('mousedown', () => {
            this.dragging = true;
            this.dragSvg = svg;
        });
    }

    updateMetrics() {
        const loss = lossAt(this.point.x, this.point.y);
        const gradNorm = this.gradientNorm();

        this.container.querySelector('#metric-step').textContent = String(this.steps);
        this.container.querySelector('#metric-loss').textContent = loss.toFixed(4);
        this.container.querySelector('#metric-grad').textContent = gradNorm.toFixed(4);
        this.container.querySelector('#metric-pos').textContent = `(${this.point.x.toFixed(2)}, ${this.point.y.toFixed(2)})`;
    }
}
