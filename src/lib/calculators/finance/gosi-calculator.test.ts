import { beforeEach, describe, expect, it } from 'vitest';
import calc from './gosi-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) => {
	const r = calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-10-28'), ...over }));
	// Intl puts a non-breaking space after the currency code; normalise it for comparison.
	return {
		...r,
		primaryResult: r.primaryResult.replace(/ /g, ' '),
		metrics: (r.secondaryMetrics ?? []).map((m) => m.value.replace(/ /g, ' '))
	};
};

// Expected values are hand-computed from the GOSI rates: annuities A% each side, SANED 0.75% each side, occupational
// hazards 2% employer only, on basic + housing capped at SAR 45,000.
describe('GOSI calculator', () => {
	beforeEach(() => setCurrency('SAR'));

	it('matches the worked example: Saudi who joined before 3 July 2024, SAR 10,000 = 975 + 1,175 = 2,150', () => {
		const r = run({ who: 'saudi', joined: 'old', basic: '8000', housing: '2000' });
		expect(r.primaryResult).toBe('SAR 2,150.00');
		expect(r.metrics[0]).toBe('SAR 975.00');
		expect(r.metrics[1]).toBe('SAR 1,175.00');
	});

	it('legacy contributors are not affected by the new schedule, whatever the month', () => {
		expect(run({ who: 'saudi', joined: 'old', basic: '8000', housing: '2000', month: '2029-01-01' }).primaryResult).toBe('SAR 2,150.00');
	});

	it('new entrant, October 2026: annuities 10% each side = 1,075 + 1,275 = 2,350', () => {
		const r = run({ who: 'saudi', joined: 'new', basic: '8000', housing: '2000', month: '2026-10-28' });
		expect(r.primaryResult).toBe('SAR 2,350.00');
		expect(r.metrics[3]).toBe('10%');
	});

	it('new entrant schedule: 9% to June 2025, 9.5% July 2025, 10.5% July 2027, 11% July 2028', () => {
		const base = { who: 'saudi', joined: 'new', basic: '8000', housing: '2000' };
		expect(run({ ...base, month: '2024-07-03' }).primaryResult).toBe('SAR 2,150.00');
		expect(run({ ...base, month: '2025-06-30' }).primaryResult).toBe('SAR 2,150.00');
		// 10.25% + 12.25% = 22.5% of 10,000
		expect(run({ ...base, month: '2025-07-01' }).primaryResult).toBe('SAR 2,250.00');
		expect(run({ ...base, month: '2026-06-30' }).primaryResult).toBe('SAR 2,250.00');
		// 11.25% + 13.25% = 24.5%
		expect(run({ ...base, month: '2027-07-01' }).primaryResult).toBe('SAR 2,450.00');
		// 11.75% + 13.75% = 25.5%
		expect(run({ ...base, month: '2028-07-01' }).primaryResult).toBe('SAR 2,550.00');
		expect(run({ ...base, month: '2031-01-01' }).primaryResult).toBe('SAR 2,550.00');
	});

	it('non-Saudi: employer pays 2%, employee nothing: SAR 10,000 = 200', () => {
		const r = run({ who: 'expat', basic: '8000', housing: '2000' });
		expect(r.primaryResult).toBe('SAR 200.00');
		expect(r.metrics[0]).toBe('SAR 0.00');
		expect(r.metrics[1]).toBe('SAR 200.00');
	});

	it('caps the contribution wage at SAR 45,000: legacy Saudi on 60,000 = 4,387.50 + 5,287.50', () => {
		const r = run({ who: 'saudi', joined: 'old', basic: '50000', housing: '10000' });
		expect(r.primaryResult).toBe('SAR 9,675.00');
		expect(r.metrics[0]).toBe('SAR 4,387.50');
		expect(r.metrics[1]).toBe('SAR 5,287.50');
	});

	it('exactly at the cap is not capped: SAR 45,000 gives the same amounts', () => {
		expect(run({ who: 'saudi', joined: 'old', basic: '40000', housing: '5000' }).primaryResult).toBe('SAR 9,675.00');
	});

	it('non-Saudi minimum wage for the hazards branch is SAR 400: wage 300 pays 8', () => {
		expect(run({ who: 'expat', basic: '300', housing: '0' }).primaryResult).toBe('SAR 8.00');
	});

	it('rejects invalid input, a Saudi under the SAR 1,500 annuities minimum, and a new-entrant month before the law', () => {
		expect(run({ basic: '0', housing: '0' }).primaryResult).toBe('—');
		expect(run({ basic: '' }).primaryResult).toBe('—');
		expect(run({ who: 'saudi', joined: 'old', basic: '1000', housing: '200' }).primaryResult).toBe('—');
		expect(run({ who: 'saudi', joined: 'new', month: '2024-06-01' }).primaryResult).toBe('—');
	});
});
