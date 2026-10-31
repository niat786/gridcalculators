import { describe, expect, it } from 'vitest';
import calc from './url-encode-decode.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('url encoder and decoder', () => {
	it('encodes a query value with encodeURIComponent', () => {
		expect(run({ mode: 'encode', method: 'component', plain: 'a b&c=d/e' }).primaryResult).toBe('a%20b%26c%3Dd%2Fe');
	});

	it('keeps URL structure with encodeURI and escapes non-ASCII as UTF-8', () => {
		expect(run({ mode: 'encode', method: 'url', plain: 'https://example.com/a b?x=1&y=é' }).primaryResult).toBe(
			'https://example.com/a%20b?x=1&y=%C3%A9'
		);
	});

	it('encodes the default phrase with the component method (worked example)', () => {
		expect(run({ mode: 'encode' }).primaryResult).toBe(
			'https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dcaf%C3%A9%20menu%20%26%20tea'
		);
	});

	it('matches the worked example: a phrase as a query value', () => {
		expect(run({ mode: 'encode', method: 'component', plain: 'café menu & tea' }).primaryResult).toBe(
			'caf%C3%A9%20menu%20%26%20tea'
		);
	});

	it('decodes a query value fully', () => {
		expect(run({ mode: 'decode', method: 'component', encoded: 'caf%C3%A9%20menu%20%26%20tea' }).primaryResult).toBe(
			'café menu & tea'
		);
		expect(run({ mode: 'decode', method: 'component', encoded: 'a%2Fb%20c' }).primaryResult).toBe('a/b c');
	});

	it('keeps reserved escapes in place with decodeURI', () => {
		expect(run({ mode: 'decode', method: 'url', encoded: 'a%2Fb%20c' }).primaryResult).toBe('a%2Fb c');
		expect(run({ mode: 'decode', method: 'url', encoded: 'x%26y%20z' }).primaryResult).toBe('x%26y z');
	});

	it('returns a dash for malformed % escapes', () => {
		expect(run({ mode: 'decode', encoded: '100%' }).primaryResult).toBe('—');
		expect(run({ mode: 'decode', encoded: '%zz' }).primaryResult).toBe('—');
		expect(run({ mode: 'decode', encoded: '%C3' }).primaryResult).toBe('—');
	});

	it('returns a dash for empty input', () => {
		expect(run({ mode: 'encode', plain: '' }).primaryResult).toBe('—');
	});
});
