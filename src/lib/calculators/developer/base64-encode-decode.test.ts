import { describe, expect, it } from 'vitest';
import calc from './base64-encode-decode.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('base64 encoder and decoder', () => {
	it('matches the worked example', () => {
		const r = run({ mode: 'encode', plain: 'Hello, World!' });
		expect(r.primaryResult).toBe('SGVsbG8sIFdvcmxkIQ==');
	});

	it('encodes UTF-8 bytes, not UTF-16 code units', () => {
		// "Café" is 5 bytes in UTF-8 (é = C3 A9), giving 8 characters.
		expect(run({ mode: 'encode', plain: 'Café' }).primaryResult).toBe('Q2Fmw6k=');
	});

	it('switches to the URL-safe alphabet without padding', () => {
		// "???" encodes to "Pz8/" and "??" to "Pz8=" in standard Base64.
		expect(run({ mode: 'encode', plain: '???', urlSafe: false }).primaryResult).toBe('Pz8/');
		expect(run({ mode: 'encode', plain: '???', urlSafe: true }).primaryResult).toBe('Pz8_');
		expect(run({ mode: 'encode', plain: '??', urlSafe: true }).primaryResult).toBe('Pz8');
	});

	it('decodes standard Base64 back to text', () => {
		expect(run({ mode: 'decode', encoded: 'SGVsbG8sIFdvcmxkIQ==' }).primaryResult).toBe('Hello, World!');
	});

	it('decodes URL-safe Base64 without padding, and ignores line breaks', () => {
		expect(run({ mode: 'decode', encoded: 'Pz8_' }).primaryResult).toBe('???');
		expect(run({ mode: 'decode', encoded: 'SGVsbG8s\nIFdvcmxk\nIQ==' }).primaryResult).toBe('Hello, World!');
	});

	it('reports invalid Base64 as a dash with a reason', () => {
		const r = run({ mode: 'decode', encoded: 'SGVsbG8!' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toMatch(/stray characters/);
	});

	it('reports bytes that are not UTF-8 text as a dash', () => {
		// "/w==" is the single byte FF, which is never valid UTF-8.
		expect(run({ mode: 'decode', encoded: '/w==' }).primaryResult).toBe('—');
	});

	it('returns a dash for empty input', () => {
		expect(run({ mode: 'encode', plain: '' }).primaryResult).toBe('—');
		expect(run({ mode: 'decode', encoded: '   ' }).primaryResult).toBe('—');
	});
});
