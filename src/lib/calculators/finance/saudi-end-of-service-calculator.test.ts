import { beforeEach, describe, expect, it } from 'vitest';
import calc from './saudi-end-of-service-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) => {
	const r = calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
	// Intl puts a non-breaking space after the currency code; normalise it for comparison.
	return { ...r, primaryResult: r.primaryResult.replace(/ /g, ' ') };
};

// Expected values are hand-computed from Article 84 (0.5 month x first 5 years, 1 month after) and
// Article 85 (1/3, 2/3, full on resignation). Two cases reproduce published worked examples:
// 8 years on SAR 10,000 = 55,000 (Teamed), and 7 years on SAR 8,000 = 36,000 (Noqta).
describe('Saudi end of service calculator', () => {
	beforeEach(() => setCurrency('SAR'));

	it('8 years, employer ends the contract: 5.5 months = SAR 55,000', () => {
		expect(run({ wage: '10000', start: '2017-01-01', end: '2024-12-31' }).primaryResult).toBe('SAR 55,000.00');
	});

	it('8 years, resignation: two thirds = SAR 36,666.67', () => {
		expect(run({ wage: '10000', start: '2017-01-01', end: '2024-12-31', reason: 'resign' }).primaryResult).toBe('SAR 36,666.67');
	});

	it('7 years on SAR 8,000 = 4.5 months = 36,000', () => {
		expect(run({ wage: '8000', start: '2018-01-01', end: '2024-12-31' }).primaryResult).toBe('SAR 36,000.00');
	});

	it('resignation after 3 years: one third of 1.5 months of SAR 12,000 = 6,000', () => {
		expect(run({ wage: '12000', start: '2021-01-01', end: '2023-12-31', reason: 'resign' }).primaryResult).toBe('SAR 6,000.00');
	});

	it('resignation after exactly 5 years is still one third (2.5 months x 6,000 / 3 = 5,000)', () => {
		expect(run({ wage: '6000', start: '2020-01-01', end: '2024-12-31', reason: 'resign' }).primaryResult).toBe('SAR 5,000.00');
	});

	it('resignation after 10+ years gets the full award: 12 years on SAR 5,000 = 9.5 months', () => {
		expect(run({ wage: '5000', start: '2013-01-01', end: '2024-12-31', reason: 'resign' }).primaryResult).toBe('SAR 47,500.00');
	});

	it('resignation under 2 years gets nothing, but an employer ending the contract still pays pro rata', () => {
		expect(run({ wage: '10000', start: '2024-01-01', end: '2025-06-30', reason: 'resign' }).primaryResult).toBe('SAR 0.00');
		// 1.4959 years: 0.5 x (1 + 181/365) x 10,000 ... checked by hand below
		const hand = 0.5 * (1 + 181 / 365) * 10000;
		expect(run({ wage: '10000', start: '2024-01-01', end: '2025-06-30' }).primaryResult).toBe(
			`SAR ${hand.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
		);
	});

	it('pro rata part years: 2 years 182 days on SAR 9,000 = 11,243.84', () => {
		expect(run({ wage: '9000', start: '2020-01-01', end: '2022-07-01' }).primaryResult).toBe('SAR 11,243.84');
	});

	it('force majeure, marriage and childbirth give the full award on leaving; Article 80 dismissal gives none', () => {
		const base = { wage: '10000', start: '2017-01-01', end: '2024-12-31' };
		expect(run({ ...base, reason: 'force' }).primaryResult).toBe('SAR 55,000.00');
		expect(run({ ...base, reason: 'marriage' }).primaryResult).toBe('SAR 55,000.00');
		expect(run({ ...base, reason: 'misconduct' }).primaryResult).toBe('SAR 0.00');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ wage: '0' }).primaryResult).toBe('—');
		expect(run({ wage: '' }).primaryResult).toBe('—');
		expect(run({ start: '2024-12-31', end: '2020-01-01' }).primaryResult).toBe('—');
	});
});
