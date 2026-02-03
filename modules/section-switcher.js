/**
 * Section switcher controller for Home view tabs.
 */

const VALID_SECTIONS = ['architecture', 'training', 'inference'];

let activeSection = null;
let changeHandler = null;
let tabs = [];

function getIndex(section) {
    return VALID_SECTIONS.indexOf(section);
}

function isValidSection(section) {
    return VALID_SECTIONS.includes(section);
}

function updateTabState() {
    tabs.forEach((tab) => {
        const isActive = tab.dataset.section === activeSection;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
        tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });
}

function focusTab(section) {
    const tab = tabs.find((node) => node.dataset.section === section);
    tab?.focus();
}

function handleKeydown(event) {
    if (!tabs.length) return;

    const current = event.target.closest('.section-tab');
    if (!current) return;

    const currentIndex = getIndex(current.dataset.section);
    if (currentIndex < 0) return;

    let nextIndex = currentIndex;

    switch (event.key) {
        case 'ArrowRight':
            nextIndex = (currentIndex + 1) % VALID_SECTIONS.length;
            break;
        case 'ArrowLeft':
            nextIndex = (currentIndex - 1 + VALID_SECTIONS.length) % VALID_SECTIONS.length;
            break;
        case 'Home':
            nextIndex = 0;
            break;
        case 'End':
            nextIndex = VALID_SECTIONS.length - 1;
            break;
        default:
            return;
    }

    event.preventDefault();
    const nextSection = VALID_SECTIONS[nextIndex];
    setActiveSection(nextSection, { notify: true });
    focusTab(nextSection);
}

export function initSectionSwitcher({ defaultSection = 'architecture', onChange }) {
    changeHandler = onChange;
    tabs = Array.from(document.querySelectorAll('.section-tab'));

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            setActiveSection(tab.dataset.section, { notify: true });
        });

        tab.addEventListener('keydown', handleKeydown);
    });

    setActiveSection(defaultSection, { notify: false });
}

export function setActiveSection(section, { notify = false } = {}) {
    if (!isValidSection(section)) {
        return activeSection;
    }

    const sectionChanged = activeSection !== section;
    activeSection = section;
    updateTabState();

    if (notify && sectionChanged && typeof changeHandler === 'function') {
        changeHandler(section);
    }

    return activeSection;
}

export function getActiveSection() {
    return activeSection;
}
