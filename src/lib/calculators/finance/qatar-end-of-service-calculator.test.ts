import { beforeEach, describe, expect, it } from 'vitest';
import calc from './qatar-end-of-service-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) => {
	const r = calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
	// Intl puts a non-breaking space after the currency code; normalise it for comparison.
	return { ...r, primaryResult: r.primaryResult.replace(/ /g, ' ') };
};

// Expected values are hand-computed from Article 54 (3 weeks of basic wage per year, pro rata),
// not produced by the code under test: basic / 30 x 21 x years, or basic x 12 / 52 x 3 x years.
describe('Qatar end of service calculator', () => {
	beforeEach(() => setCurrency('QAR'));

	it('matches the worked example: 7 years on QAR 10,000 = 7 x 3 weeks x 2,333.33 = QAR 49,000', () => {
		expect(run({ basic: '10000', start: '2018-01-01', end: '2024-12-31' }).primaryResult).toBe('QAR 49,000.00');
	});

	it('one full year pays exactly 21 days of basic wage', () => {
		// 3000 / 30 x 21 = 2,100
		expect(run({ basic: '3000', start: '2024-01-01', end: '2024-12-31' }).primaryResult).toBe('QAR 2,100.00');
	});

	it('pays nothing under one year of service', () => {
		const r = run({ basic: '3000', start: '2024-01-01', end: '2024-11-30' });
		expect(r.primaryResult).toBe('QAR 0.00');
		expect(r.summary).toContain('No gratuity');
	});

	it('counts part years pro rata once a full year is completed', () => {
		// 2 years + 182/365 = 2.49863; 4000 / 30 x 21 x 2.49863 = 6,996.16
		expect(run({ basic: '4000', start: '2020-01-01', end: '2022-07-01' }).primaryResult).toBe('QAR 6,996.16');
	});

	it('weekly method: basic x 12 / 52 x 3 x 5 years on QAR 6,000 = 20,769.23', () => {
		expect(run({ basic: '6000', start: '2020-01-01', end: '2024-12-31', method: '52' }).primaryResult).toBe('QAR 20,769.23');
	});

	it('contract weeks above the floor: 4 weeks for 3 years on QAR 8,000 = 22,400', () => {
		// 8000 / 30 x 7 x 4 x 3 = 22,400
		expect(run({ basic: '8000', start: '2021-01-01', end: '2023-12-31', weeks: '4' }).primaryResult).toBe('QAR 22,400.00');
	});

	it('rejects weeks below the legal floor and invalid input', () => {
		expect(run({ weeks: '2' }).primaryResult).toBe('—');
		expect(run({ basic: '0' }).primaryResult).toBe('—');
		expect(run({ basic: '' }).primaryResult).toBe('—');
		expect(run({ start: '2025-01-01', end: '2024-01-01' }).primaryResult).toBe('—');
	});
});
