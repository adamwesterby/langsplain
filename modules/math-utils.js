/**
 * Math utilities for transformer computations
 * Provides softmax, matrix operations, and toy computations
 */

/**
 * Compute softmax of an array of numbers
 * @param {number[]} arr - Input array
 * @returns {number[]} Probability distribution
 */
export function softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
}

/**
 * Matrix multiplication (2D arrays)
 * @param {number[][]} A - First matrix (m x n)
 * @param {number[][]} B - Second matrix (n x p)
 * @returns {number[][]} Result matrix (m x p)
 */
export function matmul(A, B) {
    const m = A.length;
    const n = A[0].length;
    const p = B[0].length;

    const result = Array(m).fill(null).map(() => Array(p).fill(0));

    for (let i = 0; i < m; i++) {
        for (let j = 0; j < p; j++) {
            for (let k = 0; k < n; k++) {
                result[i][j] += A[i][k] * B[k][j];
            }
        }
    }

    return result;
}

/**
 * Matrix-vector multiplication
 * @param {number[][]} M - Matrix (m x n)
 * @param {number[]} v - Vector (n)
 * @returns {number[]} Result vector (m)
 */
export function matvec(M, v) {
    return M.map(row => row.reduce((sum, val, i) => sum + val * v[i], 0));
}

/**
 * Transpose a matrix
 * @param {number[][]} M - Input matrix
 * @returns {number[][]} Transposed matrix
 */
export function transpose(M) {
    const rows = M.length;
    const cols = M[0].length;
    const result = Array(cols).fill(null).map(() => Array(rows).fill(0));

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            result[j][i] = M[i][j];
        }
    }

    return result;
}

/**
 * Dot product of two vectors
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Dot product
 */
export function dot(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

/**
 * Scale a vector by a scalar
 * @param {number[]} v - Vector
 * @param {number} s - Scalar
 * @returns {number[]} Scaled vector
 */
export function scale(v, s) {
    return v.map(x => x * s);
}

/**
 * Add two vectors element-wise
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number[]} Sum vector
 */
export function vadd(a, b) {
    return a.map((x, i) => x + b[i]);
}

/**
 * L2 normalize a vector
 * @param {number[]} v - Vector
 * @returns {number[]} Normalized vector
 */
export function normalize(v) {
    const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    return norm > 0 ? v.map(x => x / norm) : v;
}

/**
 * Generate a seeded random number (simple LCG)
 * @param {number} seed - Seed value
 * @returns {function} Random number generator
 */
export function seededRandom(seed) {
    let s = seed;
    return function() {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

/**
 * Generate a random vector with seeded randomness
 * @param {number} dim - Dimension
 * @param {number} seed - Seed
 * @returns {number[]} Random vector with values in [-1, 1]
 */
export function randomVector(dim, seed) {
    const rng = seededRandom(seed);
    return Array(dim).fill(0).map(() => rng() * 2 - 1);
}

/**
 * Generate a random matrix with seeded randomness
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 * @param {number} seed - Seed
 * @returns {number[][]} Random matrix
 */
export function randomMatrix(rows, cols, seed) {
    const rng = seededRandom(seed);
    return Array(rows).fill(null).map(() =>
        Array(cols).fill(0).map(() => (rng() * 2 - 1) * 0.1)
    );
}

/**
 * Apply causal mask to attention scores
 * @param {number[][]} scores - Attention scores (seq_len x seq_len)
 * @returns {number[][]} Masked scores
 */
export function applyCausalMask(scores) {
    const n = scores.length;
    return scores.map((row, i) =>
        row.map((val, j) => j > i ? -Infinity : val)
    );
}

/**
 * Compute scaled dot-product attention
 * @param {number[][]} Q - Query matrix (seq_len x d_k)
 * @param {number[][]} K - Key matrix (seq_len x d_k)
 * @param {number[][]} V - Value matrix (seq_len x d_v)
 * @param {boolean} causal - Apply causal mask
 * @returns {{weights: number[][], output: number[][]}} Attention weights and output
 */
export function scaledDotProductAttention(Q, K, V, causal = true) {
    const d_k = Q[0].length;
    const scale = Math.sqrt(d_k);

    // Q @ K^T
    const KT = transpose(K);
    let scores = matmul(Q, KT);

    // Scale
    scores = scores.map(row => row.map(x => x / scale));

    // Apply causal mask if needed
    if (causal) {
        scores = applyCausalMask(scores);
    }

    // Softmax per row
    const weights = scores.map(row => softmax(row));

    // Weights @ V
    const output = matmul(weights, V);

    return { weights, output };
}

/**
 * Layer normalization
 * @param {number[]} x - Input vector
 * @param {number} eps - Epsilon for numerical stability
 * @returns {number[]} Normalized vector
 */
export function layerNorm(x, eps = 1e-5) {
    const mean = x.reduce((a, b) => a + b, 0) / x.length;
    const variance = x.reduce((sum, val) => sum + (val - mean) ** 2, 0) / x.length;
    const std = Math.sqrt(variance + eps);
    return x.map(val => (val - mean) / std);
}

/**
 * GELU activation function
 * @param {number} x - Input value
 * @returns {number} Activated value
 */
export function gelu(x) {
    return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));
}

/**
 * Apply GELU to a vector
 * @param {number[]} v - Input vector
 * @returns {number[]} Activated vector
 */
export function geluVec(v) {
    return v.map(gelu);
}
