import { beforeEach, describe, expect, it } from 'vitest';
import calc, { cmhcPremiumRate, minDownPayment, paymentFor, qualifyingRate } from './canada-mortgage-stress-test-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('CAD'));

// Maximum prices below come from a separate brute-force scan (every $1 price checked against the
// qualifying-rate, GDS/TDS, CMHC premium, minimum down payment and $1.5M cap rules), not from this code.
describe('canada mortgage stress test calculator', () => {
	it('matches the worked example ($120,000 income, $100,000 down, 4.5%, 25 years)', () => {
		const r = run();
		expect(r.primaryResult).toBe('CA$601,031');
		expect(metric(r, 'Qualifying rate')).toBe('6.5%');
		expect(metric(r, 'Maximum mortgage')).toBe('CA$501,031');
		expect(metric(r, 'CMHC insurance premium (added to the loan)')).toBe('CA$14,029 (2.8%)');
		expect(metric(r, 'Payment at your contract rate')).toBe('CA$2,850.72');
		expect(metric(r, 'GDS at the qualifying rate')).toBe('39%');
		expect(metric(r, 'TDS at the qualifying rate')).toBe('43%');
	});

	it('qualifying rate is the greater of contract + 2% and 5.25%', () => {
		expect(qualifyingRate(4.5)).toBe(6.5);
		expect(qualifyingRate(2)).toBe(5.25);
		expect(qualifyingRate(3.25)).toBe(5.25);
		expect(metric(run({ rate: '2', down: '120000' }), 'Qualifying rate')).toBe('5.25%');
		expect(run({ rate: '2', down: '120000' }).primaryResult).toBe('CA$683,169');
	});

	it('less than 5% to 20% down: premium tier changes with the down payment', () => {
		const low = run({ down: '40000' });
		expect(low.primaryResult).toBe('CA$535,250');
		expect(metric(low, 'CMHC insurance premium (added to the loan)')).toMatch(/\(4%\)$/);
	});

	it('20% or more down: no premium', () => {
		const r = run({ down: '300000' });
		expect(r.primaryResult).toBe('CA$815,060');
		expect(metric(r, 'CMHC insurance premium (added to the loan)')).toBe('None (20% or more down)');
	});

	it('30-year amortization only for first-time buyers or new builds (premium +0.20%)', () => {
		const ftb = run({ amort: '30', firstTime: true, down: '60000' });
		expect(ftb.primaryResult).toBe('CA$593,169');
		expect(metric(ftb, 'CMHC insurance premium (added to the loan)')).toMatch(/\(3\.3%\)$/);
		expect(run({ amort: '30', firstTime: false, down: '60000' }).primaryResult).toBe('CA$559,574');
	});

	it('insured price cap of $1.5 million and condo fees count at 50%', () => {
		expect(run({ income: '400000', down: '150000' }).primaryResult).toBe('CA$1,499,999');
		expect(run({ condo: '450', debts: '1200', down: '80000' }).primaryResult).toBe('CA$446,697');
	});

	it('helper maths: premiums, minimum down payment, semi-annual payment', () => {
		expect(cmhcPremiumRate(0.95, 25)).toBeCloseTo(0.04, 12);
		expect(cmhcPremiumRate(0.9, 30)).toBeCloseTo(0.033, 12);
		expect(cmhcPremiumRate(0.8, 25)).toBe(0);
		expect(minDownPayment(400000)).toBe(20000);
		expect(minDownPayment(1000000)).toBe(75000);
		// $100,000 over 25 years at 6.5% compounded semi-annually
		expect(paymentFor(100000, 6.5, 25)).toBeCloseTo(669.82, 2);
	});

	it('income too low for any mortgage, and invalid input', () => {
		const low = run({ income: '20000', debts: '800' });
		expect(low.summary).toMatch(/no room/);
		expect(low.primaryResult).toBe('CA$100,000');
		expect(run({ income: '' }).primaryResult).toBe('—');
		expect(run({ income: '0' }).primaryResult).toBe('—');
		expect(run({ amort: '40' }).primaryResult).toBe('—');
	});
});
