/**
 * Inference pipeline diagram rendering and interactions using D3.js
 */

import { clamp, getCenteredBox, getHorizontalBounds } from './diagram-layout-utils.js';

const COMPONENTS = {
    inputPrompt: {
        id: 'input-prompt',
        label: 'Input Prompt',
        sublabel: 'System + user context',
        y: 20,
        height: 56,
        color: '#22c55e',
        infoKey: 'inputPrompt'
    },
    tokenize: {
        id: 'inference-tokenize',
        label: 'Tokenize',
        sublabel: 'Text -> token IDs',
        y: 95,
        height: 56,
        color: '#14b8a6',
        infoKey: 'tokenize'
    },
    prefillPhase: {
        id: 'prefill-phase',
        label: 'Prefill Phase',
        sublabel: 'Process full prompt in parallel',
        y: 170,
        height: 56,
        color: '#00d4ff',
        infoKey: 'prefillPhase'
    },
    autoregressiveLoop: {
        id: 'decode-loop',
        label: 'Autoregressive Decode Loop',
        sublabel: 'One token at a time',
        y: 250,
        height: 230,
        color: '#a855f7',
        isContainer: true,
        infoKey: 'autoregressiveLoop'
    },
    logits: {
        id: 'decode-logits',
        label: 'Compute Logits',
        sublabel: 'Vocabulary-sized scores',
        y: 285,
        height: 48,
        color: '#06b6d4',
        parent: 'autoregressiveLoop',
        infoKey: 'logits'
    },
    sampling: {
        id: 'decode-sampling',
        label: 'Sample Next Token',
        sublabel: 'Temperature / Top-k / Top-p',
        y: 350,
        height: 48,
        color: '#eab308',
        parent: 'autoregressiveLoop',
        infoKey: 'sampling'
    },
    stopCondition: {
        id: 'decode-stop',
        label: 'Stop Condition Check',
        sublabel: 'EOS / stop seq / max tokens',
        y: 415,
        height: 48,
        color: '#f97316',
        parent: 'autoregressiveLoop',
        infoKey: 'stopCondition'
    },
    kvCache: {
        id: 'kv-cache-box',
        label: 'KV Cache',
        sublabel: 'Reuse past keys/values',
        y: 305,
        height: 78,
        width: 180,
        color: '#ec4899',
        infoKey: 'kvCache',
        isSideBox: true
    },
    detokenize: {
        id: 'detokenize',
        label: 'Detokenize Output',
        sublabel: 'Token IDs -> readable text',
        y: 505,
        height: 56,
        color: '#22c55e',
        infoKey: 'detokenize'
    }
};

const BASE_LAYOUT = {
    kvY: 285,
    detokenizeY: 505,
    height: 600
};

const MOBILE_BREAKPOINT = 768;
const MOBILE_LAYOUT = {
    boxInset: 16,
    innerTopPadding: 52,
    innerBoxHeight: 44,
    innerGap: 12,
    kvHeight: 70,
    loopBottomPadding: 16,
    detokenizeGap: 24
};

const DEFAULT_COMPONENT_STATE = {
    autoregressiveLoop: {
        y: COMPONENTS.autoregressiveLoop.y,
        height: COMPONENTS.autoregressiveLoop.height
    },
    logits: {
        y: COMPONENTS.logits.y,
        height: COMPONENTS.logits.height
    },
    sampling: {
        y: COMPONENTS.sampling.y,
        height: COMPONENTS.sampling.height
    },
    stopCondition: {
        y: COMPONENTS.stopCondition.y,
        height: COMPONENTS.stopCondition.height
    },
    kvCache: {
        y: COMPONENTS.kvCache.y,
        height: COMPONENTS.kvCache.height,
        sublabel: COMPONENTS.kvCache.sublabel
    },
    detokenize: {
        y: COMPONENTS.detokenize.y,
        height: COMPONENTS.detokenize.height
    }
};

let svg = null;
let onComponentClick = null;
let currentHighlight = null;
let resizeHandler = null;

export function initDiagram(containerId, clickHandler) {
    destroyDiagram();

    onComponentClick = clickHandler;
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    const width = container.clientWidth || 720;
    const layout = getInferenceLayout(width);

    svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', layout.height)
        .attr('viewBox', `0 0 ${width} ${layout.height}`)
        .attr('class', 'diagram-svg');

    addDefs(svg);
    applyLayout(layout);
    renderDiagram(width, layout);

    resizeHandler = () => {
        const newWidth = container.clientWidth || width;
        const newLayout = getInferenceLayout(newWidth);
        applyLayout(newLayout);

        svg.attr('height', newLayout.height)
            .attr('viewBox', `0 0 ${newWidth} ${newLayout.height}`);

        svg.selectAll('*').remove();
        addDefs(svg);
        renderDiagram(newWidth, newLayout);
    };

    window.addEventListener('resize', resizeHandler);
}

export function destroyDiagram() {
    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }

    if (svg) {
        svg.remove();
        svg = null;
    }

    currentHighlight = null;
}

function addDefs(svgEl) {
    const defs = svgEl.append('defs');

    const glow = defs.append('filter')
        .attr('id', 'inference-glow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');

    glow.append('feGaussianBlur')
        .attr('stdDeviation', '3')
        .attr('result', 'coloredBlur');

    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'coloredBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    defs.append('marker')
        .attr('id', 'inference-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#606060');
}

function getInferenceLayout(width) {
    if (width <= MOBILE_BREAKPOINT) {
        const mobileMain = getCenteredBox(width, 460, 20);
        const mainX = mobileMain.boxX;
        const mainWidth = mobileMain.boxWidth;
        const loopY = DEFAULT_COMPONENT_STATE.autoregressiveLoop.y;
        const logitsY = loopY + MOBILE_LAYOUT.innerTopPadding;
        const samplingY = logitsY + MOBILE_LAYOUT.innerBoxHeight + MOBILE_LAYOUT.innerGap;
        const stopY = samplingY + MOBILE_LAYOUT.innerBoxHeight + MOBILE_LAYOUT.innerGap;
        const kvY = stopY + MOBILE_LAYOUT.innerBoxHeight + MOBILE_LAYOUT.innerGap;
        const decodeHeight = (kvY + MOBILE_LAYOUT.kvHeight + MOBILE_LAYOUT.loopBottomPadding) - loopY;
        const detokenizeY = loopY + decodeHeight + MOBILE_LAYOUT.detokenizeGap;
        const kvWidth = clamp(mainWidth - 32, 150, Math.max(150, mainWidth - 12));
        const kvX = mainX + (mainWidth - kvWidth) / 2;
        const innerX = mainX + MOBILE_LAYOUT.boxInset;
        const innerWidth = mainWidth - MOBILE_LAYOUT.boxInset * 2;

        return {
            mode: 'mobile-linear',
            mainX,
            mainWidth,
            innerX,
            innerWidth,
            logitsY,
            samplingY,
            stopY,
            decodeHeight,
            kvX,
            kvY,
            kvWidth,
            kvHeight: MOBILE_LAYOUT.kvHeight,
            loopLaneX: clamp(mainX + mainWidth + 6, mainX + mainWidth + 2, mainX + mainWidth + 10),
            detokenizeY,
            height: detokenizeY + DEFAULT_COMPONENT_STATE.detokenize.height + 30
        };
    }

    const bounds = getHorizontalBounds(width, 8);
    const sidePadding = 20;
    const laneGap = 36;
    const laneInset = 8;
    const decodeInsetRight = 20;
    const kvWritePortRatioWide = 0.5;
    const kvWritePortInsetNarrow = 2;
    const kvReadPortRatio = 0.5;
    const kvMinWidth = 150;
    const kvMaxWidth = COMPONENTS.kvCache.width;
    const kvWidth = clamp(width - 40, kvMinWidth, kvMaxWidth);

    const wideMainWidth = Math.min(430, width - sidePadding * 2 - kvWidth - laneGap);

    if (wideMainWidth >= 320) {
        const totalWidth = wideMainWidth + laneGap + kvWidth;
        const laneLayout = getCenteredBox(width, totalWidth, sidePadding);
        const mainX = laneLayout.leftEdge;
        const mainRight = mainX + wideMainWidth;
        const kvX = clamp(mainRight + laneGap, bounds.minX + 4, bounds.maxX - kvWidth);
        const loopLaneX = clamp(mainRight + laneInset, mainRight + 4, bounds.maxX - 2);
        const kvWritePortX = clamp(kvX + kvWidth * kvWritePortRatioWide, kvX + 2, kvX + kvWidth - 2);
        const kvWriteLaneX = clamp(kvWritePortX, mainRight + 4, bounds.maxX - 2);

        return {
            mode: 'wide',
            mainX,
            mainWidth: wideMainWidth,
            kvX,
            kvY: BASE_LAYOUT.kvY,
            kvWidth,
            loopLaneX,
            kvWriteLaneX,
            kvWritePortX,
            kvReadPortX: clamp(kvX + kvWidth * kvReadPortRatio, kvX + 2, kvX + kvWidth - 2),
            decodeInX: clamp(mainRight - decodeInsetRight, bounds.minX + 20, bounds.maxX - 20),
            decodeInY: DEFAULT_COMPONENT_STATE.sampling.y + DEFAULT_COMPONENT_STATE.sampling.height / 2,
            detokenizeY: BASE_LAYOUT.detokenizeY,
            height: BASE_LAYOUT.height
        };
    }

    const narrowMain = getCenteredBox(width, 460, 24);
    const mainWidth = narrowMain.boxWidth;
    const mainX = narrowMain.boxX;
    const mainRight = mainX + mainWidth;
    const kvY = DEFAULT_COMPONENT_STATE.autoregressiveLoop.y + DEFAULT_COMPONENT_STATE.autoregressiveLoop.height + 10;
    const kvX = clamp(width - kvWidth - 20, bounds.minX + 4, bounds.maxX - kvWidth);
    const detokenizeY = kvY + DEFAULT_COMPONENT_STATE.kvCache.height + 26;
    const loopLaneX = clamp(mainRight + laneInset + 2, mainRight + 4, bounds.maxX - 2);
    const kvWriteLaneX = clamp(kvX + kvWidth - kvWritePortInsetNarrow, mainRight + 8, bounds.maxX - 2);

    return {
        mode: 'narrow',
        mainX,
        mainWidth,
        kvX,
        kvY,
        kvWidth,
        loopLaneX,
        kvWriteLaneX,
        kvWritePortX: clamp(kvWriteLaneX, kvX + 2, kvX + kvWidth - 2),
        kvReadPortX: clamp(kvX + kvWidth * kvReadPortRatio, kvX + 2, kvX + kvWidth - 2),
        decodeInX: clamp(mainRight - decodeInsetRight, bounds.minX + 20, bounds.maxX - 20),
        decodeInY: DEFAULT_COMPONENT_STATE.sampling.y + DEFAULT_COMPONENT_STATE.sampling.height / 2,
        detokenizeY,
        height: detokenizeY + COMPONENTS.detokenize.height + 30
    };
}

function applyLayout(layout) {
    COMPONENTS.autoregressiveLoop.y = DEFAULT_COMPONENT_STATE.autoregressiveLoop.y;
    COMPONENTS.autoregressiveLoop.height = DEFAULT_COMPONENT_STATE.autoregressiveLoop.height;
    COMPONENTS.logits.y = DEFAULT_COMPONENT_STATE.logits.y;
    COMPONENTS.logits.height = DEFAULT_COMPONENT_STATE.logits.height;
    COMPONENTS.sampling.y = DEFAULT_COMPONENT_STATE.sampling.y;
    COMPONENTS.sampling.height = DEFAULT_COMPONENT_STATE.sampling.height;
    COMPONENTS.stopCondition.y = DEFAULT_COMPONENT_STATE.stopCondition.y;
    COMPONENTS.stopCondition.height = DEFAULT_COMPONENT_STATE.stopCondition.height;
    COMPONENTS.kvCache.y = DEFAULT_COMPONENT_STATE.kvCache.y;
    COMPONENTS.kvCache.height = DEFAULT_COMPONENT_STATE.kvCache.height;
    COMPONENTS.kvCache.sublabel = DEFAULT_COMPONENT_STATE.kvCache.sublabel;
    COMPONENTS.detokenize.y = DEFAULT_COMPONENT_STATE.detokenize.y;
    COMPONENTS.detokenize.height = DEFAULT_COMPONENT_STATE.detokenize.height;

    if (layout.mode === 'mobile-linear') {
        COMPONENTS.autoregressiveLoop.height = layout.decodeHeight;
        COMPONENTS.logits.y = layout.logitsY;
        COMPONENTS.logits.height = MOBILE_LAYOUT.innerBoxHeight;
        COMPONENTS.sampling.y = layout.samplingY;
        COMPONENTS.sampling.height = MOBILE_LAYOUT.innerBoxHeight;
        COMPONENTS.stopCondition.y = layout.stopY;
        COMPONENTS.stopCondition.height = MOBILE_LAYOUT.innerBoxHeight;
        COMPONENTS.kvCache.y = layout.kvY;
        COMPONENTS.kvCache.height = layout.kvHeight;
        COMPONENTS.kvCache.sublabel = 'Written in prefill; read each decode step';
        COMPONENTS.detokenize.y = layout.detokenizeY;
        return;
    }

    COMPONENTS.kvCache.y = layout.kvY;
    COMPONENTS.detokenize.y = layout.detokenizeY;
}

function renderDiagram(width, layout) {
    renderMainBox('inputPrompt', layout.mainX, layout.mainWidth);
    renderMainBox('tokenize', layout.mainX, layout.mainWidth);
    renderMainBox('prefillPhase', layout.mainX, layout.mainWidth);

    renderContainer(layout.mainX, layout.mainWidth);
    renderInnerLoopBoxes(layout);

    if (layout.mode !== 'mobile-linear') {
        renderSideCache(layout);
    }

    renderMainBox('detokenize', layout.mainX, layout.mainWidth);
    renderMainArrows(layout);
}

function renderMainBox(key, x, width) {
    renderBox(key, COMPONENTS[key], x, width);
}

function renderContainer(x, width) {
    const comp = COMPONENTS.autoregressiveLoop;

    const group = svg.append('g')
        .attr('class', 'component-container')
        .attr('id', comp.id)
        .attr('cursor', 'pointer')
        .on('click', (event) => handleClick(event, 'autoregressiveLoop', comp));

    group.append('rect')
        .attr('x', x - 12)
        .attr('y', comp.y)
        .attr('width', width + 24)
        .attr('height', comp.height)
        .attr('rx', 12)
        .attr('fill', 'rgba(168, 85, 247, 0.08)')
        .attr('stroke', comp.color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '8,4');

    group.append('text')
        .attr('x', x + width / 2)
        .attr('y', comp.y + 24)
        .attr('text-anchor', 'middle')
        .attr('fill', '#f0f0f0')
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .text(comp.label);

    group.append('text')
        .attr('x', x + width / 2)
        .attr('y', comp.y + 42)
        .attr('text-anchor', 'middle')
        .attr('fill', '#a0a0a0')
        .attr('font-size', '11px')
        .text(comp.sublabel);
}

function renderInnerLoopBoxes(layout) {
    const x = layout.mainX;
    const width = layout.mainWidth;
    const centerX = x + width / 2;

    if (layout.mode === 'mobile-linear') {
        renderBox('logits', COMPONENTS.logits, layout.innerX, layout.innerWidth);
        renderBox('sampling', COMPONENTS.sampling, layout.innerX, layout.innerWidth);
        renderBox('stopCondition', COMPONENTS.stopCondition, layout.innerX, layout.innerWidth);
        renderBox('kvCache', COMPONENTS.kvCache, layout.kvX, layout.kvWidth);

        svg.append('line')
            .attr('x1', centerX)
            .attr('y1', COMPONENTS.logits.y + COMPONENTS.logits.height + 2)
            .attr('x2', centerX)
            .attr('y2', COMPONENTS.sampling.y - 2)
            .attr('stroke', '#606060')
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#inference-arrow)');

        svg.append('line')
            .attr('x1', centerX)
            .attr('y1', COMPONENTS.sampling.y + COMPONENTS.sampling.height + 2)
            .attr('x2', centerX)
            .attr('y2', COMPONENTS.stopCondition.y - 2)
            .attr('stroke', '#606060')
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#inference-arrow)');

        const innerRight = layout.innerX + layout.innerWidth;
        const loopStartX = innerRight - 4;

        drawConnectorPath([
            { x: loopStartX, y: COMPONENTS.stopCondition.y + COMPONENTS.stopCondition.height / 2 },
            { x: layout.loopLaneX, y: COMPONENTS.stopCondition.y + COMPONENTS.stopCondition.height / 2 },
            { x: layout.loopLaneX, y: COMPONENTS.logits.y + COMPONENTS.logits.height / 2 },
            { x: loopStartX, y: COMPONENTS.logits.y + COMPONENTS.logits.height / 2 }
        ], {
            stroke: '#00d4ff',
            dashed: true
        });
        return;
    }

    renderBox('logits', COMPONENTS.logits, x + 20, width - 40);
    renderBox('sampling', COMPONENTS.sampling, x + 20, width - 40);
    renderBox('stopCondition', COMPONENTS.stopCondition, x + 20, width - 40);

    svg.append('line')
        .attr('x1', centerX)
        .attr('y1', COMPONENTS.logits.y + COMPONENTS.logits.height + 2)
        .attr('x2', centerX)
        .attr('y2', COMPONENTS.sampling.y - 2)
        .attr('stroke', '#606060')
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#inference-arrow)');

    svg.append('line')
        .attr('x1', centerX)
        .attr('y1', COMPONENTS.sampling.y + COMPONENTS.sampling.height + 2)
        .attr('x2', centerX)
        .attr('y2', COMPONENTS.stopCondition.y - 2)
        .attr('stroke', '#606060')
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#inference-arrow)');

    const innerRight = x + width - 20;
    const loopStartX = innerRight + 8;
    const loopTurnX = Math.max(loopStartX + 8, layout.loopLaneX);

    drawConnectorPath([
        { x: loopStartX, y: COMPONENTS.stopCondition.y + COMPONENTS.stopCondition.height / 2 },
        { x: loopTurnX, y: COMPONENTS.stopCondition.y + COMPONENTS.stopCondition.height / 2 },
        { x: loopTurnX, y: COMPONENTS.logits.y + COMPONENTS.logits.height / 2 },
        { x: loopStartX, y: COMPONENTS.logits.y + COMPONENTS.logits.height / 2 }
    ], {
        stroke: '#00d4ff',
        dashed: true
    });

}
function renderSideCache(layout) {
    renderBox('kvCache', COMPONENTS.kvCache, layout.kvX, layout.kvWidth);

    const prefillOut = {
        x: layout.mainX + layout.mainWidth,
        y: COMPONENTS.prefillPhase.y + COMPONENTS.prefillPhase.height * 0.35
    };
    const kvWriteIn = {
        x: layout.kvWritePortX,
        y: COMPONENTS.kvCache.y
    };
    const kvReadOut = {
        x: layout.kvReadPortX,
        y: COMPONENTS.kvCache.y + COMPONENTS.kvCache.height
    };
    const decodeIn = {
        x: layout.decodeInX,
        y: layout.decodeInY
    };

    drawConnectorPath([
        prefillOut,
        { x: layout.kvWriteLaneX, y: prefillOut.y },
        kvWriteIn
    ]);

    drawConnectorPath([
        kvReadOut,
        { x: kvReadOut.x, y: decodeIn.y },
        decodeIn
    ]);
}

function renderMainArrows(layout) {
    const centerX = layout.mainX + layout.mainWidth / 2;
    const topFlow = ['inputPrompt', 'tokenize', 'prefillPhase'];

    topFlow.forEach((key, index) => {
        if (index === topFlow.length - 1) return;

        const fromComp = COMPONENTS[key];
        const toComp = COMPONENTS[topFlow[index + 1]];

        svg.append('line')
            .attr('x1', centerX)
            .attr('y1', fromComp.y + fromComp.height + 2)
            .attr('x2', centerX)
            .attr('y2', toComp.y - 2)
            .attr('stroke', '#606060')
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#inference-arrow)');
    });

    svg.append('line')
        .attr('x1', centerX)
        .attr('y1', COMPONENTS.prefillPhase.y + COMPONENTS.prefillPhase.height + 2)
        .attr('x2', centerX)
        .attr('y2', COMPONENTS.autoregressiveLoop.y - 2)
        .attr('stroke', '#606060')
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#inference-arrow)');

    svg.append('line')
        .attr('x1', centerX)
        .attr('y1', COMPONENTS.autoregressiveLoop.y + COMPONENTS.autoregressiveLoop.height + 2)
        .attr('x2', centerX)
        .attr('y2', COMPONENTS.detokenize.y - 2)
        .attr('stroke', '#606060')
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#inference-arrow)');
}

function drawConnectorPath(points, { stroke = '#606060', dashed = false } = {}) {
    const d = points.map((point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');

    const path = svg.append('path')
        .attr('d', d)
        .attr('fill', 'none')
        .attr('stroke', stroke)
        .attr('stroke-width', 2)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('marker-end', 'url(#inference-arrow)');

    if (dashed) {
        path.attr('stroke-dasharray', '6,4');
    }
}

function renderBox(key, comp, x, width) {
    const group = svg.append('g')
        .attr('class', 'component-box')
        .attr('id', comp.id)
        .attr('data-key', key)
        .attr('cursor', 'pointer')
        .on('click', (event) => handleClick(event, key, comp))
        .on('mouseenter', () => handleHover(key, comp, true))
        .on('mouseleave', () => handleHover(key, comp, false));

    group.append('rect')
        .attr('class', 'box-bg')
        .attr('x', x)
        .attr('y', comp.y)
        .attr('width', width)
        .attr('height', comp.height)
        .attr('rx', 8)
        .attr('fill', '#1a1a1a')
        .attr('stroke', comp.color)
        .attr('stroke-width', 2);

    group.append('text')
        .attr('class', 'box-label')
        .attr('x', x + width / 2)
        .attr('y', comp.y + comp.height / 2 - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', '#f0f0f0')
        .attr('font-size', '13px')
        .attr('font-weight', '500')
        .text(comp.label);

    group.append('text')
        .attr('class', 'box-sublabel')
        .attr('x', x + width / 2)
        .attr('y', comp.y + comp.height / 2 + 12)
        .attr('text-anchor', 'middle')
        .attr('fill', '#a0a0a0')
        .attr('font-size', '11px')
        .text(comp.sublabel);
}

function handleClick(event, key, comp) {
    event.stopPropagation();
    highlightComponent(key);

    if (typeof onComponentClick === 'function') {
        onComponentClick(comp.infoKey || key, comp);
    }
}

function handleHover(key, comp, isEnter) {
    if (!svg) return;

    const group = svg.select(`#${comp.id}`);
    if (group.empty()) return;

    if (isEnter) {
        group.select('.box-bg')
            .transition()
            .duration(180)
            .attr('filter', 'url(#inference-glow)')
            .attr('stroke-width', 3);
        return;
    }

    if (currentHighlight !== key) {
        group.select('.box-bg')
            .transition()
            .duration(180)
            .attr('filter', null)
            .attr('stroke-width', 2);
    }
}

export function highlightComponent(key) {
    if (!svg) return;

    if (currentHighlight && COMPONENTS[currentHighlight]) {
        svg.select(`#${COMPONENTS[currentHighlight].id} .box-bg`)
            .transition()
            .duration(180)
            .attr('filter', null)
            .attr('stroke-width', 2);
    }

    currentHighlight = key;

    if (COMPONENTS[key]) {
        svg.select(`#${COMPONENTS[key].id} .box-bg`)
            .transition()
            .duration(180)
            .attr('filter', 'url(#inference-glow)')
            .attr('stroke-width', 3);
    }
}

export function clearHighlight() {
    if (!svg || !currentHighlight || !COMPONENTS[currentHighlight]) {
        currentHighlight = null;
        return;
    }

    svg.select(`#${COMPONENTS[currentHighlight].id} .box-bg`)
        .transition()
        .duration(180)
        .attr('filter', null)
        .attr('stroke-width', 2);

    currentHighlight = null;
}

export function getComponentByInfoKey(infoKey) {
    return Object.entries(COMPONENTS).find(([_, comp]) => comp.infoKey === infoKey)?.[0] || null;
}
