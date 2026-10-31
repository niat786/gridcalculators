import { describe, expect, it } from 'vitest';
import calc from './real-estate-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

/** No loan, no growth, no costs: the only moving parts are rent and the sale price. */
const cashOnly = {
	price: '100000',
	down: '100',
	rate: '0',
	term: '30',
	closing: '0',
	rent: '1000',
	rentGrowth: '0',
	vacancy: '0',
	expenses: '0',
	appreciation: '0',
	sellingCosts: '0',
	years: '1'
};

describe('real estate calculator', () => {
	it('matches the worked example: $300,000 rental, 25% down, 10 years, sold at year 10', () => {
		const r = run();
		expect(r.primaryResult).toBe('13.67%');
		expect(r.secondaryMetrics?.[0].value).toBe('$171,432.34');
		expect(r.secondaryMetrics?.[1].value).toBe('$188,238.13');
		expect(r.secondaryMetrics?.[2].value).toBe('8%');
		expect(r.secondaryMetrics?.[3].value).toBe('$84,000.00');
		expect(r.secondaryMetrics?.[4].value).toBe('$1,422.15');
	});

	it('returns 12% when 100,000 buys a property rented for 12,000 a year and sold for 100,000', () => {
		// Flows: −100,000, then 12,000 rent + 100,000 sale = 112,000 at year 1, so IRR = 12%
		const r = run(cashOnly);
		expect(r.primaryResult).toBe('12%');
		expect(r.secondaryMetrics?.[0].value).toBe('$12,000.00');
		expect(r.secondaryMetrics?.[1].value).toBe('$100,000.00');
	});

	it('returns 0% when a 0% loan and no growth leave no profit at all', () => {
		// 200,000 with 20% down, 0% interest: payments 444.44 a month = 5,333.33 a year
		// Balance after 1 year 154,666.67, so the sale returns 45,333.33 on top of the 5,333.33 year-1 cash flow
		// Net 40,000 back on 40,000 invested
		const r = run({ ...cashOnly, price: '200000', down: '20', rent: '0', years: '1' });
		expect(r.primaryResult).toBe('0%');
		expect(r.secondaryMetrics?.[0].value).toBe('$0.00');
	});

	it('returns a dash when the purchase price is zero', () => {
		expect(run({ price: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash when there is no cash invested', () => {
		expect(run({ down: '0', closing: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash for a holding period longer than 40 years', () => {
		expect(run({ years: '50' }).primaryResult).toBe('—');
	});
});
