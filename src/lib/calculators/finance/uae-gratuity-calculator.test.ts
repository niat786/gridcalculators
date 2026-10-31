import { beforeEach, describe, expect, it } from 'vitest';
import calc from './uae-gratuity-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) => {
	const r = calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
	// Intl puts a non-breaking space after the currency code; normalise it for comparison.
	return { ...r, primaryResult: r.primaryResult.replace(/\u00a0/g, ' ') };
};

// Expected values below are hand-computed (21 days x min(Y,5) + 30 days x rest, x basic / 30),
// not produced by the code under test. Article 51 of Decree-Law 33/2021 gives the 21/30-day rule.
describe('UAE gratuity calculator', () => {
	beforeEach(() => setCurrency('AED'));

	it('matches the worked example: 7 years on AED 8,000 = 165 days = AED 44,000', () => {
		const r = run({ basic: '8000', start: '2018-01-01', end: '2024-12-31' });
		expect(r.primaryResult).toBe('AED 44,000.00');
		expect(r.secondaryMetrics?.[1].value).toBe('165');
	});

	it('5 years exactly: 105 days of AED 5,000 / 30', () => {
		expect(run({ basic: '5000', start: '2020-01-01', end: '2024-12-31' }).primaryResult).toBe('AED 17,500.00');
	});

	it('7 years on AED 6,000 = 33,000 (21 x 5 x 200 + 30 x 2 x 200)', () => {
		expect(run({ basic: '6000', start: '2018-01-01', end: '2024-12-31' }).primaryResult).toBe('AED 33,000.00');
	});

	it('counts part years pro rata: 2.4986 years at 21 days on AED 5,000', () => {
		// 21 x (2 + 182/365) x 5000 / 30 = 8,745.21
		expect(run({ basic: '5000', start: '2020-01-01', end: '2022-07-01' }).primaryResult).toBe('AED 8,745.21');
	});

	it('pro rata after 5 years: 6.4959 years on AED 9,000', () => {
		// (105 + 30 x 1.495890) x 9000 / 30 = 44,963.01
		expect(run({ basic: '9000', start: '2017-01-01', end: '2023-06-30' }).primaryResult).toBe('AED 44,963.01');
	});

	it('excludes unpaid absence days from service', () => {
		// 6 calendar years less 365 unpaid days = 5 years -> 17,500
		expect(run({ basic: '5000', start: '2019-01-01', end: '2024-12-31', unpaid: '365' }).primaryResult).toBe('AED 17,500.00');
	});

	it('caps the total at 24 months of basic wage', () => {
		// 40 years on AED 1,000: 105 + 35 x 30 = 1,155 days x 33.33 = 38,500 > 24,000
		const r = run({ basic: '1000', start: '1985-01-01', end: '2024-12-31' });
		expect(r.primaryResult).toBe('AED 24,000.00');
		expect(r.secondaryMetrics?.[4].value).toContain('applied');
	});

	it('yearly / 365 method', () => {
		// 105 x 5000 x 12 / 365 = 17,260.27
		expect(run({ basic: '5000', start: '2020-01-01', end: '2024-12-31', daily: '365' }).primaryResult).toBe('AED 17,260.27');
	});

	it('pays nothing under one year, and exactly one year pays 21 days', () => {
		expect(run({ basic: '5000', start: '2024-01-01', end: '2024-11-30' }).primaryResult).toBe('AED 0.00');
		// 1 full year = 21 days x 3000/30 = 2,100
		expect(run({ basic: '3000', start: '2023-01-01', end: '2023-12-31' }).primaryResult).toBe('AED 2,100.00');
	});

	it('DIFC shows that DEWS applies instead of a gratuity amount', () => {
		const r = run({ where: 'difc' });
		expect(r.primaryResult).toBe('DEWS applies');
		expect(r.secondaryMetrics?.[0].value).toBe('—');
		expect(r.summary).toContain('5.83%');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ basic: '0' }).primaryResult).toBe('—');
		expect(run({ basic: '' }).primaryResult).toBe('—');
		expect(run({ start: '2024-12-31', end: '2020-01-01' }).primaryResult).toBe('—');
	});
});
