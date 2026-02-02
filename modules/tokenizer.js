/**
 * Simple BPE-style tokenization simulation
 * Uses a vocabulary of common words with character fallback
 * Includes BPE merge visualization for educational purposes
 */

import { randomVector } from './math-utils.js';

// BPE merge rules (simulated) - pairs that get merged and their frequencies
const BPE_MERGE_RULES = [
    { pair: ['t', 'h'], result: 'th', frequency: 3847 },
    { pair: ['th', 'e'], result: 'the', frequency: 2941 },
    { pair: ['i', 'n'], result: 'in', frequency: 2156 },
    { pair: ['a', 'n'], result: 'an', frequency: 1893 },
    { pair: ['e', 'r'], result: 'er', frequency: 1742 },
    { pair: ['o', 'n'], result: 'on', frequency: 1521 },
    { pair: ['r', 'e'], result: 're', frequency: 1398 },
    { pair: ['e', 'd'], result: 'ed', frequency: 1287 },
    { pair: ['in', 'g'], result: 'ing', frequency: 1156 },
    { pair: ['a', 't'], result: 'at', frequency: 1089 },
    { pair: ['i', 's'], result: 'is', frequency: 987 },
    { pair: ['o', 'u'], result: 'ou', frequency: 876 },
    { pair: ['e', 'n'], result: 'en', frequency: 823 },
    { pair: ['s', 't'], result: 'st', frequency: 798 },
    { pair: ['un', 'der'], result: 'under', frequency: 654 },
    { pair: ['st', 'and'], result: 'stand', frequency: 543 },
    { pair: ['under', 'stand'], result: 'understand', frequency: 421 },
    { pair: ['ing', 's'], result: 'ings', frequency: 398 },
    { pair: ['c', 'at'], result: 'cat', frequency: 356 },
    { pair: ['s', 'at'], result: 'sat', frequency: 312 },
    { pair: ['m', 'at'], result: 'mat', frequency: 287 },
    { pair: ['h', 'e'], result: 'he', frequency: 1654 },
    { pair: ['s', 'h'], result: 'sh', frequency: 543 },
    { pair: ['c', 'h'], result: 'ch', frequency: 487 },
    { pair: ['w', 'h'], result: 'wh', frequency: 432 }
];

// Create a map for quick lookup
const MERGE_MAP = new Map();
BPE_MERGE_RULES.forEach(rule => {
    MERGE_MAP.set(rule.pair.join('|'), rule);
});

// Simple vocabulary of common words (simulating a tiny vocabulary)
const VOCABULARY = [
    // Special tokens
    '<pad>', '<unk>', '<bos>', '<eos>',
    // Common words
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to',
    'and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'if', 'then', 'else',
    'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose',
    'this', 'that', 'these', 'those', 'here', 'there', 'now', 'then',
    'in', 'on', 'at', 'by', 'with', 'from', 'of', 'as', 'into', 'through',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
    'not', 'no', 'yes', 'all', 'some', 'any', 'none', 'each', 'every', 'both',
    'cat', 'dog', 'bird', 'fish', 'tree', 'house', 'car', 'book', 'word', 'world', 'fox',
    'sat', 'mat', 'hat', 'rat', 'bat', 'fat', 'flat', 'chat', 'that',
    'hello', 'world', 'good', 'bad', 'big', 'small', 'new', 'old', 'young', 'quick', 'brown', 'lazy',
    'man', 'woman', 'child', 'day', 'night', 'time', 'year', 'way', 'thing',
    'love', 'like', 'want', 'know', 'think', 'see', 'look', 'make', 'go', 'come',
    'take', 'get', 'give', 'find', 'tell', 'ask', 'use', 'try', 'leave', 'call', 'jump', 'jumps', 'over',
    'model', 'data', 'learn', 'train', 'test', 'input', 'output', 'layer', 'network',
    'attention', 'transformer', 'token', 'embed', 'vector', 'matrix', 'weight',
    // Code keywords
    'print', 'function', 'return', 'var', 'let', 'const',
    // Common punctuation as tokens
    '.', ',', '!', '?', "'", '"', '-', ':', ';', '(', ')', '[', ']', '{', '}',
    // Numbers
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    // Letters (for character fallback)
    ...'abcdefghijklmnopqrstuvwxyz'.split('')
];

// Create word to ID mapping
const WORD_TO_ID = new Map(VOCABULARY.map((word, i) => [word, i]));
const ID_TO_WORD = VOCABULARY;

// Embedding dimension
const EMBED_DIM = 64;

// Pre-computed embeddings (seeded by token ID)
const EMBEDDINGS = VOCABULARY.map((_, id) => randomVector(EMBED_DIM, id * 12345 + 67890));

/**
 * Tokenize a text string into token objects
 * @param {string} text - Input text
 * @returns {Array<{text: string, id: number}>} Array of token objects
 */
export function tokenize(text) {
    const tokens = [];
    const normalized = text.toLowerCase().trim();

    // Split into words and punctuation
    const parts = normalized.match(/[\w]+|[^\s\w]/g) || [];

    for (const part of parts) {
        if (WORD_TO_ID.has(part)) {
            // Whole word match
            tokens.push({ text: part, id: WORD_TO_ID.get(part) });
        } else {
            // Character fallback for unknown words
            for (const char of part) {
                if (WORD_TO_ID.has(char)) {
                    tokens.push({ text: char, id: WORD_TO_ID.get(char) });
                } else {
                    tokens.push({ text: char, id: WORD_TO_ID.get('<unk>') });
                }
            }
        }
    }

    return tokens;
}

/**
 * Get the text representation of a token ID
 * @param {number} id - Token ID
 * @returns {string} Token text
 */
export function idToToken(id) {
    return ID_TO_WORD[id] || '<unk>';
}

/**
 * Get embedding vector for a token ID
 * @param {number} tokenId - Token ID
 * @returns {number[]} Embedding vector (64-dimensional)
 */
export function getEmbedding(tokenId) {
    if (tokenId >= 0 && tokenId < EMBEDDINGS.length) {
        return [...EMBEDDINGS[tokenId]];
    }
    return randomVector(EMBED_DIM, tokenId);
}

/**
 * Generate positional encoding for a position
 * Uses sinusoidal encoding
 * @param {number} pos - Position in sequence
 * @param {number} dim - Embedding dimension
 * @returns {number[]} Positional encoding vector
 */
export function getPositionalEncoding(pos, dim = EMBED_DIM) {
    const pe = new Array(dim);
    for (let i = 0; i < dim; i++) {
        const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / dim);
        pe[i] = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
    }
    return pe;
}

/**
 * Get embeddings with positional encoding for a sequence of tokens
 * @param {Array<{text: string, id: number}>} tokens - Token objects
 * @returns {number[][]} Matrix of embeddings (seq_len x embed_dim)
 */
export function getEmbeddings(tokens) {
    return tokens.map((token, pos) => {
        const embedding = getEmbedding(token.id);
        const positional = getPositionalEncoding(pos);
        return embedding.map((e, i) => e + positional[i]);
    });
}

/**
 * Get vocabulary size
 * @returns {number} Size of vocabulary
 */
export function getVocabSize() {
    return VOCABULARY.length;
}

/**
 * Get embedding dimension
 * @returns {number} Embedding dimension
 */
export function getEmbedDim() {
    return EMBED_DIM;
}

/**
 * Decode token IDs back to text
 * @param {number[]} ids - Token IDs
 * @returns {string} Decoded text
 */
export function decode(ids) {
    return ids.map(id => idToToken(id)).join(' ');
}

/**
 * Get top-k most likely next tokens based on logits
 * @param {number[]} logits - Output logits
 * @param {number} k - Number of top tokens
 * @returns {Array<{id: number, text: string, prob: number}>} Top tokens
 */
export function topKTokens(logits, k = 5) {
    // Apply softmax to get probabilities
    const max = Math.max(...logits);
    const exps = logits.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map(x => x / sum);

    // Get indices and sort by probability
    const indexed = probs.map((prob, id) => ({ id, prob }));
    indexed.sort((a, b) => b.prob - a.prob);

    return indexed.slice(0, k).map(({ id, prob }) => ({
        id,
        text: idToToken(id),
        prob
    }));
}

// ============================================
// BPE Visualization Functions
// ============================================

/**
 * Simulate BPE tokenization with step-by-step merge history
 * @param {string} text - Input text to tokenize
 * @returns {Object} Object containing merge steps and final tokens
 */
export function simulateBPE(text) {
    const normalized = text.toLowerCase().trim();

    // Start with characters
    let currentTokens = normalized.split('');
    const mergeSteps = [];

    // Record initial state
    mergeSteps.push({
        step: 0,
        tokens: [...currentTokens],
        description: 'Initial characters',
        mergedPair: null,
        mergedResult: null,
        frequency: null
    });

    // Apply merges iteratively until no more can be applied
    let stepNum = 1;
    let changed = true;

    while (changed && stepNum < 20) { // Safety limit
        changed = false;

        // Find the highest-frequency applicable merge
        let bestMerge = null;
        let bestMergeIdx = -1;

        for (let i = 0; i < currentTokens.length - 1; i++) {
            const pair = currentTokens[i] + '|' + currentTokens[i + 1];
            const rule = MERGE_MAP.get(pair);

            if (rule && (!bestMerge || rule.frequency > bestMerge.frequency)) {
                bestMerge = rule;
                bestMergeIdx = i;
            }
        }

        if (bestMerge) {
            // Apply the merge
            const newTokens = [
                ...currentTokens.slice(0, bestMergeIdx),
                bestMerge.result,
                ...currentTokens.slice(bestMergeIdx + 2)
            ];

            mergeSteps.push({
                step: stepNum,
                tokens: [...newTokens],
                description: `Merge "${bestMerge.pair[0]}" + "${bestMerge.pair[1]}" → "${bestMerge.result}"`,
                mergedPair: bestMerge.pair,
                mergedResult: bestMerge.result,
                mergedIndex: bestMergeIdx,
                frequency: bestMerge.frequency
            });

            currentTokens = newTokens;
            changed = true;
            stepNum++;
        }
    }

    // Map final tokens to vocabulary IDs
    const finalTokens = currentTokens.map(t => {
        const id = WORD_TO_ID.get(t);
        return {
            text: t,
            id: id !== undefined ? id : WORD_TO_ID.get('<unk>')
        };
    });

    return {
        input: text,
        mergeSteps,
        finalTokens,
        totalMerges: mergeSteps.length - 1
    };
}

/**
 * Get available BPE merge rules for display
 * @returns {Array} Array of merge rules sorted by frequency
 */
export function getBPEMergeRules() {
    return [...BPE_MERGE_RULES].sort((a, b) => b.frequency - a.frequency);
}

/**
 * Build a merge tree structure for visualization
 * @param {Object} bpeResult - Result from simulateBPE
 * @returns {Object} Tree structure for D3 visualization
 */
export function buildMergeTree(bpeResult) {
    if (!bpeResult || bpeResult.mergeSteps.length === 0) {
        return null;
    }

    // Build tree bottom-up from merge steps
    const nodes = new Map();

    // Create leaf nodes for initial characters
    const initialChars = bpeResult.mergeSteps[0].tokens;
    initialChars.forEach((char, i) => {
        nodes.set(`${char}_${i}`, {
            name: char,
            id: `${char}_${i}`,
            isLeaf: true,
            position: i
        });
    });

    // Process merges to build tree
    let currentPositions = initialChars.map((c, i) => `${c}_${i}`);

    for (let i = 1; i < bpeResult.mergeSteps.length; i++) {
        const step = bpeResult.mergeSteps[i];
        const mergeIdx = step.mergedIndex;

        if (mergeIdx !== undefined && mergeIdx < currentPositions.length - 1) {
            const leftId = currentPositions[mergeIdx];
            const rightId = currentPositions[mergeIdx + 1];
            const newId = `${step.mergedResult}_${mergeIdx}_${i}`;

            // Create merged node
            nodes.set(newId, {
                name: step.mergedResult,
                id: newId,
                isLeaf: false,
                children: [nodes.get(leftId), nodes.get(rightId)],
                frequency: step.frequency,
                step: i
            });

            // Update positions
            currentPositions = [
                ...currentPositions.slice(0, mergeIdx),
                newId,
                ...currentPositions.slice(mergeIdx + 2)
            ];
        }
    }

    // Return root nodes (final tokens)
    return {
        name: 'root',
        children: currentPositions.map(id => nodes.get(id))
    };
}

/**
 * Get color for a token based on its merge depth
 * @param {number} depth - Merge depth (0 = character, higher = more merges)
 * @returns {string} CSS color
 */
export function getTokenColor(depth) {
    const colors = [
        '#ef4444', // Red - characters
        '#f97316', // Orange - first merge
        '#eab308', // Yellow - second merge
        '#22c55e', // Green - third merge
        '#06b6d4', // Cyan - fourth merge
        '#3b82f6', // Blue - fifth merge
        '#8b5cf6', // Purple - deeper
        '#ec4899'  // Pink - deepest
    ];
    return colors[Math.min(depth, colors.length - 1)];
}
