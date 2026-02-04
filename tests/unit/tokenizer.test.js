import { idToToken, simulateBPE, tokenize } from '../../modules/tokenizer.js';

describe('tokenizer', () => {
    it('tokenizes known words and punctuation as whole tokens', () => {
        const tokens = tokenize('The cat sat.');
        expect(tokens.map((token) => token.text)).toEqual(['the', 'cat', 'sat', '.']);
    });

    it('falls back to <unk> for unknown characters', () => {
        const tokens = tokenize('@');

        expect(tokens).toHaveLength(1);
        expect(tokens[0].text).toBe('@');
        expect(idToToken(tokens[0].id)).toBe('<unk>');
    });

    it('produces deterministic BPE merges for "the"', () => {
        const result = simulateBPE('the');
        expect(result.finalTokens.map((token) => token.text)).toEqual(['the']);
        expect(result.totalMerges).toBe(2);
    });

    it('produces deterministic BPE merges for "standing"', () => {
        const result = simulateBPE('standing');
        expect(result.finalTokens.map((token) => token.text)).toEqual(['st', 'an', 'd', 'ing']);
        expect(result.totalMerges).toBe(4);
    });

    it('produces deterministic BPE merges for "xyz"', () => {
        const result = simulateBPE('xyz');
        expect(result.finalTokens.map((token) => token.text)).toEqual(['x', 'y', 'z']);
        expect(result.totalMerges).toBe(0);
    });
});
