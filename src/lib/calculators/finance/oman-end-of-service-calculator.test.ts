import { beforeEach, describe, expect, it } from 'vitest';
import calc from './oman-end-of-service-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) => {
	const r = calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
	// Intl puts a non-breaking space after the currency code; normalise it for comparison.
	return { ...r, primaryResult: r.primaryResult.replace(/ /g, ' ') };
};

// Expected values are hand-computed. Article 61 of Royal Decree 53/2023: one basic wage per year, pro rata.
// Service up to 31 July 2023 uses the old rate (half a basic wage a year for the first 3 years, then one).
describe('Oman end of service calculator', () => {
	beforeEach(() => setCurrency('OMR'));

	it('reproduces the Ministry of Labour example: RO 500, from 1 Aug 2021 to 31 Jul 2025 = 2 x 250 + 2 x 500 = 1,500', () => {
		const r = run({ basic: '500', start: '2021-08-01', end: '2025-07-31' });
		expect(r.primaryResult).toBe('OMR 1,500.000');
	});

	it('service entirely under the new law: 3 years on RO 600 = 1,800', () => {
		expect(run({ basic: '600', start: '2024-01-01', end: '2026-12-31' }).primaryResult).toBe('OMR 1,800.000');
	});

	it('service entirely under the old law: 5 years on RO 400 = (0.5 x 3 + 2) x 400 = 1,400', () => {
		expect(run({ basic: '400', start: '2018-01-01', end: '2022-12-31' }).primaryResult).toBe('OMR 1,400.000');
	});

	it('long service across the change: 11 years on RO 700 = 9.5 months = 6,650', () => {
		// 0.5 x 3 + (P - 3) + (11 - P) = 9.5 whatever P is, as long as P >= 3
		expect(run({ basic: '700', start: '2016-01-01', end: '2026-12-31' }).primaryResult).toBe('OMR 6,650.000');
	});

	it('pro rata after the change: 1 Oct 2023 to 31 Mar 2025 on RO 450', () => {
		// 1 + 182/365 = 1.49863 years x 450 = 674.384
		expect(run({ basic: '450', start: '2023-10-01', end: '2025-03-31' }).primaryResult).toBe('OMR 674.384');
	});

	it('part year across 31 July 2023: 1 Jan 2023 to 31 Dec 2024 on RO 300', () => {
		// old part 212/365 = 0.58082 yr at 0.5; rest 1.41918 yr at 1; months = 1.70959; x 300 = 512.877
		expect(run({ basic: '300', start: '2023-01-01', end: '2024-12-31' }).primaryResult).toBe('OMR 512.877');
	});

	it('rejects invalid input', () => {
		expect(run({ basic: '0' }).primaryResult).toBe('—');
		expect(run({ basic: '' }).primaryResult).toBe('—');
		expect(run({ start: '2025-01-01', end: '2024-01-01' }).primaryResult).toBe('—');
	});
});
