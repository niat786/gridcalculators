import { beforeEach, describe, expect, it } from 'vitest';
import calc, { loanFromPayment, netIncome, paymentFor } from './borrowing-power-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('AUD'));

// Expected figures computed independently in node from the ATO 2026-27 rates, the 3% APRA buffer and the annuity formula.
describe('borrowing power calculator (Australia)', () => {
	it('matches the worked example', () => {
		// net 77,480 → 6,456.67/mo; spare 3,456.67; PV at 9% over 360 months = 429,600.98
		const r = run();
		expect(r.primaryResult).toBe('A$429,601');
		expect(metric(r, 'Take-home income')).toBe('A$6,456.67/mo');
		expect(metric(r, 'Spare for repayments')).toBe('A$3,456.67/mo');
		expect(metric(r, 'Assessment rate')).toBe('9%');
	});

	it('combines two incomes, HELP, dependants, debts and credit cards', () => {
		// 90k with HELP + 70k, 2 dependants × 400, expenses 4,500, debts 500, cards 15,000 × 3.8% = 570,
		// 6.2% + 3% = 9.2% over 25 years → 471,404.04 (node)
		const r = run({ income1: '90000', help1: true, income2: '70000', dependants: '2', expenses: '4500', debts: '500', cards: '15000', rate: '6.2', term: '25' });
		expect(r.primaryResult).toBe('A$471,404');
		expect(metric(r, 'Debt and card commitments')).toBe('A$1,070.00/mo');
	});

	it('gives a small amount when spare cash is thin', () => {
		// net 50,000 → 3,644.17/mo; spare 144.17 → 17,917.30
		expect(run({ income1: '50000', expenses: '3500' }).primaryResult).toBe('A$17,917');
	});

	it('gives nothing when expenses exceed take-home pay', () => {
		const r = run({ income1: '50000', expenses: '5000' });
		expect(r.primaryResult).toBe('A$0');
		expect(r.summary).toContain('no borrowing capacity');
	});

	it('handles a zero interest rate (buffer still applies)', () => {
		// 0% + 3% = 3%: spare 7,202.50 over 360 months at 3% = 1,708,356.52
		expect(run({ income1: '150000', expenses: '2000', rate: '0' }).primaryResult).toBe('A$1,708,357');
	});

	it('annuity helpers are consistent', () => {
		const p = paymentFor(500_000, 6, 360);
		expect(p).toBeCloseTo(2997.75, 2);
		expect(loanFromPayment(p, 6, 360)).toBeCloseTo(500_000, 4);
		expect(loanFromPayment(100, 0, 12)).toBe(1200);
		expect(netIncome(100_000, false)).toBeCloseTo(77_480, 6);
	});

	it('rejects invalid input', () => {
		expect(run({ income1: '' }).primaryResult).toBe('—');
		expect(run({ income1: '0' }).primaryResult).toBe('—');
		expect(run({ term: '0' }).primaryResult).toBe('—');
	});
});
