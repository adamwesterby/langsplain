/**
 * Guided tour state machine across Architecture, Training, and Inference sections.
 */

const TOUR_STEPS = [
    {
        section: 'architecture',
        target: '#input-box',
        componentKey: 'input',
        title: 'Architecture: Tokenization',
        content: 'The architecture view starts with tokenized input flowing into embeddings and transformer blocks.',
        position: 'right'
    },
    {
        section: 'architecture',
        target: '#attention-block',
        componentKey: 'attention',
        title: 'Architecture: Self-Attention',
        content: 'Self-attention lets each token condition on prior context under causal masking.',
        position: 'right'
    },
    {
        section: 'architecture',
        target: '#ffn-block',
        componentKey: 'ffn',
        title: 'Architecture: FFN / MOE',
        content: 'After attention, each token passes through FFN-style computation; some models swap this for MOE experts.',
        position: 'right'
    },
    {
        section: 'training',
        target: '#training-data',
        componentKey: 'trainingData',
        title: 'Training: Data',
        content: 'Training starts with curated corpora, then dataset prep builds token sequences for batches.',
        position: 'right'
    },
    {
        section: 'training',
        target: '#loss-function',
        componentKey: 'lossFunction',
        title: 'Training: Loss',
        content: 'Cross-entropy compares predicted distributions against targets and produces a scalar objective.',
        position: 'right'
    },
    {
        section: 'training',
        target: '#preference-tuning',
        componentKey: 'preferenceTuning',
        title: 'Training: Preference Optimization',
        content: 'Post-training methods (such as DPO/PPO) align behavior toward preferred responses.',
        position: 'right'
    },
    {
        section: 'inference',
        target: '#prefill-phase',
        componentKey: 'prefillPhase',
        title: 'Inference: Prefill',
        content: 'Prefill runs the full prompt in parallel and initializes the KV cache.',
        position: 'right'
    },
    {
        section: 'inference',
        target: '#decode-loop',
        componentKey: 'autoregressiveLoop',
        title: 'Inference: Decode Loop',
        content: 'Decode generates one token at a time: logits -> sampling -> stop check, then repeat.',
        position: 'right'
    },
    {
        section: 'inference',
        target: '#kv-cache-box',
        componentKey: 'kvCache',
        title: 'Inference: KV Cache',
        content: 'KV cache reuses prior key/value tensors to avoid recomputing attention history every step.',
        position: 'right'
    },
    {
        section: 'inference',
        target: '.demo-buttons',
        componentKey: null,
        title: 'Click around and explore!',
        content: 'Click on the buttons at the bottom of each page to run interactive demos illustrating each concept. Click on individual components within the diagrams to view more information about the component.',
        position: 'center',
        isFinal: true
    }
];

class Tour {
    constructor() {
        this.steps = TOUR_STEPS;
        this.currentStep = 0;
        this.active = false;
        this.tooltip = null;
        this.overlay = null;
        this.onStepChange = null;
        this.onComplete = null;
        this.onExit = null;
        this.renderToken = 0;
    }

    init() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';
        this.overlay.innerHTML = '<div class="tour-spotlight"></div>';
        document.body.appendChild(this.overlay);

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tour-tooltip';
        this.tooltip.innerHTML = `
            <button class="tour-close" aria-label="Close tour">&times;</button>
            <h3 class="tour-title"></h3>
            <p class="tour-content"></p>
            <div class="tour-footer">
                <div class="tour-buttons">
                    <button class="tour-btn tour-prev">Previous</button>
                    <button class="tour-btn tour-next">Next</button>
                </div>
                <span class="tour-progress"></span>
            </div>
        `;
        document.body.appendChild(this.tooltip);

        this.tooltip.querySelector('.tour-close').addEventListener('click', () => this.exit());
        this.tooltip.querySelector('.tour-prev').addEventListener('click', () => this.prev());
        this.tooltip.querySelector('.tour-next').addEventListener('click', () => this.next());

        this.overlay.addEventListener('click', (event) => {
            if (event.target === this.overlay) {
                this.exit();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (!this.active) return;

            switch (event.key) {
                case 'ArrowRight':
                case 'Enter':
                    this.next();
                    break;
                case 'ArrowLeft':
                    this.prev();
                    break;
                case 'Escape':
                    this.exit();
                    break;
                default:
                    break;
            }
        });
    }

    start() {
        this.active = true;
        this.currentStep = 0;

        window.dispatchEvent(new CustomEvent('tour:ensureHome'));

        this.overlay.classList.add('active');
        this.tooltip.classList.add('active');
        this.showStep(0);
    }

    showStep(index) {
        if (index < 0 || index >= this.steps.length) return;

        this.currentStep = index;
        const step = this.steps[index];
        const sectionLabel = this.getSectionLabel(step.section);
        const sectionProgress = this.getSectionProgress(index, step.section);
        const transitionNotice = this.getTransitionNotice(index, step.section);
        const content = transitionNotice ? `${transitionNotice} ${step.content}` : step.content;

        this.tooltip.querySelector('.tour-title').textContent = step.title;
        this.tooltip.querySelector('.tour-content').textContent = content;
        this.tooltip.querySelector('.tour-progress').textContent = `${sectionLabel} • ${sectionProgress.index}/${sectionProgress.total}`;

        const prevBtn = this.tooltip.querySelector('.tour-prev');
        const nextBtn = this.tooltip.querySelector('.tour-next');
        prevBtn.style.display = index === 0 ? 'none' : 'inline-block';
        nextBtn.textContent = step.isFinal ? 'Finish' : 'Next';

        if (step.section) {
            window.dispatchEvent(new CustomEvent('tour:switchSection', {
                detail: { section: step.section }
            }));
        }

        const token = ++this.renderToken;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (!this.active || token !== this.renderToken) return;

                this.positionElements(step);

                if (step.componentKey) {
                    window.dispatchEvent(new CustomEvent('tour:highlight', {
                        detail: { componentKey: step.componentKey }
                    }));
                } else {
                    window.dispatchEvent(new CustomEvent('tour:clearHighlight'));
                }

                if (this.onStepChange) {
                    this.onStepChange(index, step);
                }
            });
        });
    }

    getSectionLabel(section) {
        if (!section) return 'Tour';
        return section.charAt(0).toUpperCase() + section.slice(1);
    }

    getSectionProgress(index, section) {
        const total = this.steps.filter((step) => step.section === section).length;
        let currentIndex = 0;

        for (let i = 0; i <= index; i += 1) {
            if (this.steps[i].section === section) {
                currentIndex += 1;
            }
        }

        return {
            index: Math.max(1, currentIndex),
            total: Math.max(1, total)
        };
    }

    getTransitionNotice(index, section) {
        if (index === 0) return '';

        const previousSection = this.steps[index - 1]?.section;
        if (!section || previousSection === section) return '';

        return `Now entering the ${this.getSectionLabel(section)} section.`;
    }

    positionElements(step) {
        const spotlight = this.overlay.querySelector('.tour-spotlight');
        const isCenterStep = step.position === 'center';
        this.tooltip.classList.toggle('tour-tooltip-center', isCenterStep);

        if (isCenterStep) {
            this.tooltip.style.left = '50%';
            this.tooltip.style.top = '50%';
            this.tooltip.style.transform = 'translate(-50%, -50%)';
            spotlight.style.display = 'none';
            return;
        }

        const target = document.querySelector(step.target);

        if (!target) {
            this.tooltip.style.left = '50%';
            this.tooltip.style.top = '50%';
            this.tooltip.style.transform = 'translate(-50%, -50%)';
            spotlight.style.display = 'none';
            return;
        }

        const rect = target.getBoundingClientRect();

        spotlight.style.display = 'block';
        spotlight.style.left = `${rect.left - 10}px`;
        spotlight.style.top = `${rect.top - 10}px`;
        spotlight.style.width = `${rect.width + 20}px`;
        spotlight.style.height = `${rect.height + 20}px`;

        const tooltipRect = this.tooltip.getBoundingClientRect();
        let left = rect.right + 20;
        let top = rect.top + rect.height / 2 - tooltipRect.height / 2;

        switch (step.position) {
            case 'left':
                left = rect.left - tooltipRect.width - 20;
                break;
            case 'bottom':
                left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                top = rect.bottom + 20;
                break;
            case 'top':
                left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                top = rect.top - tooltipRect.height - 20;
                break;
            default:
                break;
        }

        const padding = 20;
        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
        top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.transform = 'none';
    }

    next() {
        if (this.currentStep >= this.steps.length - 1) {
            this.complete();
            return;
        }

        this.showStep(this.currentStep + 1);
    }

    prev() {
        if (this.currentStep <= 0) return;
        this.showStep(this.currentStep - 1);
    }

    goToStep(index) {
        this.showStep(index);
    }

    complete() {
        this.active = false;
        this.overlay.classList.remove('active');
        this.tooltip.classList.remove('active');
        window.dispatchEvent(new CustomEvent('tour:clearHighlight'));

        if (this.onComplete) {
            this.onComplete();
        }
    }

    exit() {
        this.active = false;
        this.overlay.classList.remove('active');
        this.tooltip.classList.remove('active');
        window.dispatchEvent(new CustomEvent('tour:clearHighlight'));

        if (this.onExit) {
            this.onExit();
        }
    }

    isActive() {
        return this.active;
    }

    getCurrentStep() {
        return this.currentStep;
    }
}

const tour = new Tour();

export default tour;

export function initTour() {
    tour.init();
    return tour;
}

export function startTour() {
    tour.start();
}

export function exitTour() {
    tour.exit();
}
