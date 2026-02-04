import {
    applyCausalMask,
    scaledDotProductAttention,
    softmax
} from '../../modules/math-utils.js';

describe('math-utils', () => {
    it('softmax returns a normalized distribution and preserves ordering', () => {
        const input = [1, 3, 2];
        const probs = softmax(input);

        const sum = probs.reduce((acc, value) => acc + value, 0);
        expect(sum).toBeCloseTo(1, 10);
        expect(probs[1]).toBeGreaterThan(probs[2]);
        expect(probs[2]).toBeGreaterThan(probs[0]);
    });

    it('applyCausalMask sets upper-triangular entries to -Infinity', () => {
        const masked = applyCausalMask([
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
        ]);

        expect(masked[0][1]).toBe(-Infinity);
        expect(masked[0][2]).toBe(-Infinity);
        expect(masked[1][2]).toBe(-Infinity);

        expect(masked[1][0]).toBe(4);
        expect(masked[2][0]).toBe(7);
        expect(masked[2][1]).toBe(8);
    });

    it('scaledDotProductAttention returns expected matrix dimensions', () => {
        const Q = [
            [1, 0],
            [0, 1]
        ];
        const K = [
            [1, 0],
            [0, 1]
        ];
        const V = [
            [10, 0],
            [0, 20]
        ];

        const { weights, output } = scaledDotProductAttention(Q, K, V, true);

        expect(weights).toHaveLength(2);
        expect(weights[0]).toHaveLength(2);
        expect(weights[1]).toHaveLength(2);

        expect(output).toHaveLength(2);
        expect(output[0]).toHaveLength(2);
        expect(output[1]).toHaveLength(2);

        expect(weights[0].reduce((acc, value) => acc + value, 0)).toBeCloseTo(1, 10);
        expect(weights[1].reduce((acc, value) => acc + value, 0)).toBeCloseTo(1, 10);

        // First token cannot attend to future tokens under causal masking.
        expect(weights[0][1]).toBe(0);
    });
});
