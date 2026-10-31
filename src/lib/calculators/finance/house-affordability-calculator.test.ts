import { describe, expect, it } from 'vitest';
import calc from './house-affordability-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('house affordability calculator', () => {
	it('matches the worked example: $90,000 income, front-end rule binds', () => {
		// Housing 2,100 a month; loan 265,290.59 (bisection check); price 325,290.59
		const r = run();
		expect(r.primaryResult).toBe('$325,291');
		expect(metric(r, 'Loan amount')).toBe('$265,291');
		expect(metric(r, 'Max monthly housing')).toBe('$2,100.00');
		expect(metric(r, 'Principal & interest')).toBe('$1,676.82');
		expect(metric(r, 'Property tax (monthly)')).toBe('$298.18');
		expect(metric(r, 'Home insurance (monthly)')).toBe('$125.00');
		expect(r.summary).toMatch(/28% housing/);
	});

	it('lets the 36% back-end rule bind when debts are high', () => {
		// Front-end 1,400; back-end 36% × 5,000 − 1,000 = 800, so 800 is the housing budget
		// Loan 133,433.29 at 6% over 30 years (no tax or insurance); price 173,433.29
		const r = run({ income: '60000', debts: '1000', down: '40000', rate: '6', term: '30', tax: '0', insurance: '0' });
		expect(r.primaryResult).toBe('$173,433');
		expect(metric(r, 'Loan amount')).toBe('$133,433');
		expect(metric(r, 'Principal & interest')).toBe('$800.00');
		expect(r.summary).toMatch(/36% total debt/);
	});

	it('uses 1 ÷ n for the payment factor at a 0% rate', () => {
		// $120,000 income, no debts: housing 2,800; loan 2,800 × 360 = 1,008,000
		const r = run({ income: '120000', debts: '0', down: '0', rate: '0', term: '30', tax: '0', insurance: '0' });
		expect(r.primaryResult).toBe('$1,008,000');
	});

	it('returns a dash when debts use up the whole budget', () => {
		// 36% × 2,500 − 3,000 is negative, so there is no housing budget
		expect(run({ income: '30000', debts: '3000' }).primaryResult).toBe('—');
	});

	it('returns a dash for an empty income', () => {
		expect(run({ income: '' }).primaryResult).toBe('—');
	});
});
