import { beforeEach, describe, expect, it } from 'vitest';
import calc from './bahrain-leaving-indemnity-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) => {
	const r = calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
	// Intl puts a non-breaking space after the currency code; normalise it for comparison.
	return {
		...r,
		primaryResult: r.primaryResult.replace(/ /g, ' '),
		metrics: (r.secondaryMetrics ?? []).map((m) => m.value.replace(/ /g, ' '))
	};
};

// Expected values are hand-computed from Article 116: wage x (0.5 x min(Y,3) + 1 x max(Y-3,0)), pro rata for part years.
describe('Bahrain leaving indemnity calculator', () => {
	beforeEach(() => setCurrency('BHD'));

	it('matches the worked example: 8 years on BHD 600 = 6.5 months = 3,900', () => {
		const r = run({ wage: '600', start: '2018-01-01', end: '2025-12-31' });
		expect(r.primaryResult).toBe('BHD 3,900.000');
	});

	it('2 years on BHD 500 = 1 month = 500', () => {
		expect(run({ wage: '500', start: '2023-01-01', end: '2024-12-31' }).primaryResult).toBe('BHD 500.000');
	});

	it('exactly 3 years on BHD 400 = 1.5 months = 600', () => {
		expect(run({ wage: '400', start: '2021-01-01', end: '2023-12-31' }).primaryResult).toBe('BHD 600.000');
	});

	it('6 years on BHD 600 = 1.5 + 3 months = 2,700', () => {
		expect(run({ wage: '600', start: '2019-01-01', end: '2024-12-31' }).primaryResult).toBe('BHD 2,700.000');
	});

	it('counts the part year pro rata: 2020-01-01 to 2024-06-30 on BHD 800', () => {
		// Y = 4 + 182/366 = 4.49727; months = 1.5 + 1.49727 = 2.99727; x 800 = 2,397.814
		expect(run({ wage: '800', start: '2020-01-01', end: '2024-06-30' }).primaryResult).toBe('BHD 2,397.814');
	});

	it('pays pro rata in the first year (Article 116 states no minimum service): 6 months on BHD 600', () => {
		// 2024-01-01 to 2024-06-30 = 182/366 = 0.49727 years x 0.5 x 600 = 149.18
		expect(run({ wage: '600', start: '2024-01-01', end: '2024-06-30' }).primaryResult).toBe('BHD 149.180');
	});

	it('splits the entitlement at 1 March 2024: 2018-01-01 to 2025-12-31 on BHD 600', () => {
		// Before 1 Mar 2024: Y = 6 + 60/366 = 6.16393; months 1.5 + 3.16393 = 4.66393 -> 2,798.361
		// After: total 3,900 - 2,798.361 = 1,101.639
		const r = run({ wage: '600', start: '2018-01-01', end: '2025-12-31' });
		expect(r.metrics[2]).toBe('BHD 2,798.361');
		expect(r.metrics[3]).toBe('BHD 1,101.639');
	});

	it('rejects invalid input', () => {
		expect(run({ wage: '0' }).primaryResult).toBe('—');
		expect(run({ wage: '' }).primaryResult).toBe('—');
		expect(run({ start: '2025-01-01', end: '2024-01-01' }).primaryResult).toBe('—');
	});
});
