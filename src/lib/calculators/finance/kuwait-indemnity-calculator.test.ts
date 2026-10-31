import { beforeEach, describe, expect, it } from 'vitest';
import calc from './kuwait-indemnity-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) => {
	const r = calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
	// Intl puts a non-breaking space after the currency code; normalise it for comparison.
	return { ...r, primaryResult: r.primaryResult.replace(/ /g, ' ') };
};

// Expected values are hand-computed from Articles 51 and 53 (15 days a year for 5 years, a month after, cap 18 months,
// resignation 0 / 1/2 / 2/3 / full), not produced by the code under test. The 7-year KD 600 case also matches the
// worked example in the HAQQ Kuwait guide (KD 2,930.77 / 1,953.85 with 26 days; KD 2,700 / 1,800 with 30 days).
describe('Kuwait indemnity calculator', () => {
	beforeEach(() => setCurrency('KWD'));

	it('7 years on KWD 600, divided by 26: 5 x 15 x 600/26 + 2 x 600 = 2,930.769', () => {
		expect(run({ wage: '600', start: '2018-01-01', end: '2024-12-31' }).primaryResult).toBe('KWD 2,930.769');
	});

	it('same case divided by 30 = 1,500 + 1,200 = 2,700', () => {
		expect(run({ wage: '600', start: '2018-01-01', end: '2024-12-31', divisor: '30' }).primaryResult).toBe('KWD 2,700.000');
	});

	it('resignation after 7 years pays two thirds: 1,953.846 (÷ 26) and 1,800 (÷ 30)', () => {
		expect(run({ wage: '600', start: '2018-01-01', end: '2024-12-31', reason: 'resign' }).primaryResult).toBe('KWD 1,953.846');
		expect(run({ wage: '600', start: '2018-01-01', end: '2024-12-31', reason: 'resign', divisor: '30' }).primaryResult).toBe('KWD 1,800.000');
	});

	it('resignation bands: 2 years = nothing, 3 years = half, 4 years = half, exactly 5 = two thirds, 10 = full', () => {
		const base = { wage: '450', divisor: '30', reason: 'resign' };
		expect(run({ ...base, start: '2022-01-01', end: '2023-12-31' }).primaryResult).toBe('KWD 0.000');
		// 3 x 15 x 450/30 = 675, half = 337.5
		expect(run({ ...base, start: '2021-01-01', end: '2023-12-31' }).primaryResult).toBe('KWD 337.500');
		// 4 x 15 x 450/30 = 900, half = 450
		expect(run({ ...base, start: '2020-01-01', end: '2023-12-31' }).primaryResult).toBe('KWD 450.000');
		// 5 x 15 x 450/30 = 1125, two thirds = 750
		expect(run({ ...base, start: '2020-01-01', end: '2024-12-31' }).primaryResult).toBe('KWD 750.000');
		// 10 years: 1125 + 5 x 450 = 3375, full
		expect(run({ ...base, start: '2015-01-01', end: '2024-12-31' }).primaryResult).toBe('KWD 3,375.000');
	});

	it('employer-ended contract pays in full even under 3 years: 2 years on KWD 450 ÷ 30 = 450', () => {
		expect(run({ wage: '450', divisor: '30', start: '2022-01-01', end: '2023-12-31' }).primaryResult).toBe('KWD 450.000');
	});

	it('10 years on KWD 800 ÷ 26: 5 x 15 x 800/26 + 5 x 800 = 6,307.692', () => {
		expect(run({ wage: '800', start: '2015-01-01', end: '2024-12-31' }).primaryResult).toBe('KWD 6,307.692');
	});

	it('caps the indemnity at 18 months of wage', () => {
		// 25 years on KWD 1,000 ÷ 30: 2,500 + 20 x 1,000 = 22,500 > 18,000
		const r = run({ wage: '1000', divisor: '30', start: '2000-01-01', end: '2024-12-31' });
		expect(r.primaryResult).toBe('KWD 18,000.000');
		expect(r.secondaryMetrics?.[4].value).toContain('applied');
	});

	it('rejects invalid input', () => {
		expect(run({ wage: '0' }).primaryResult).toBe('—');
		expect(run({ wage: '' }).primaryResult).toBe('—');
		expect(run({ start: '2025-01-01', end: '2024-01-01' }).primaryResult).toBe('—');
	});
});
