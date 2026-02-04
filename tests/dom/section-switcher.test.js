import {
    getActiveSection,
    initSectionSwitcher
} from '../../modules/section-switcher.js';

function renderTabs() {
    document.body.innerHTML = `
        <div role="tablist" aria-label="Model learning sections">
            <button class="section-tab" data-section="architecture" role="tab">Architecture</button>
            <button class="section-tab" data-section="training" role="tab">Training</button>
            <button class="section-tab" data-section="inference" role="tab">Inference</button>
        </div>
    `;
}

describe('section-switcher', () => {
    beforeEach(() => {
        renderTabs();
    });

    it('initializes with the default active section and aria state', () => {
        initSectionSwitcher({ defaultSection: 'architecture', onChange: () => {} });

        const architectureTab = document.querySelector('[data-section="architecture"]');
        const trainingTab = document.querySelector('[data-section="training"]');

        expect(getActiveSection()).toBe('architecture');
        expect(architectureTab.getAttribute('aria-selected')).toBe('true');
        expect(architectureTab.getAttribute('tabindex')).toBe('0');
        expect(trainingTab.getAttribute('aria-selected')).toBe('false');
        expect(trainingTab.getAttribute('tabindex')).toBe('-1');
    });

    it('changes section on click and notifies onChange', () => {
        const onChange = vi.fn();
        initSectionSwitcher({ defaultSection: 'architecture', onChange });

        const trainingTab = document.querySelector('[data-section="training"]');
        trainingTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(getActiveSection()).toBe('training');
        expect(onChange).toHaveBeenCalledWith('training');
        expect(trainingTab.getAttribute('aria-selected')).toBe('true');
        expect(trainingTab.getAttribute('tabindex')).toBe('0');
    });

    it('supports keyboard navigation (ArrowLeft/ArrowRight/Home/End)', () => {
        initSectionSwitcher({ defaultSection: 'architecture', onChange: () => {} });

        const architectureTab = document.querySelector('[data-section="architecture"]');
        const trainingTab = document.querySelector('[data-section="training"]');
        const inferenceTab = document.querySelector('[data-section="inference"]');

        architectureTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(getActiveSection()).toBe('training');

        trainingTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        expect(getActiveSection()).toBe('architecture');

        architectureTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
        expect(getActiveSection()).toBe('inference');

        inferenceTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
        expect(getActiveSection()).toBe('architecture');
    });
});
