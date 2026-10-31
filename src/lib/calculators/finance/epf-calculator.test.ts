import { beforeEach, describe, expect, it } from 'vitest';
import calc from './epf-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';
import { EPF_RATE, EPF_WAGE_CEILING } from '../data/in-epf';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const one = { age: '57', retireAge: '58', wage: '50000', raise: '0', balance: '0' };

// Reference numbers come from an independent closed-form script (scratchpad/epf-ref.js):
// monthly add c, interest = rate/1200 × Σ balances, 'next' Σ = 12B + 66c, 'same' Σ = 12B + 78c.
describe('EPF calculator', () => {
	beforeEach(() => setCurrency('INR'));

	it('data: 8.25% and the ₹25,000 ceiling from 17 Sep 2026', () => {
		expect(EPF_RATE).toBe(8.25);
		expect(EPF_WAGE_CEILING).toBe(25000);
	});

	it('worked example: wage above the ceiling, one year', () => {
		// employee 3000, EPS 2082.50, employer EPF 917.50 → 3917.50 a month; year 47,010; interest 1,777.57
		const r = run(one);
		expect(r.primaryResult).toBe('₹48,788');
		expect(metric(r, 'Your contributions')).toBe('₹36,000');
		expect(metric(r, 'Employer’s share into EPF')).toBe('₹11,010');
		expect(metric(r, 'Interest earned')).toBe('₹1,778');
		expect(metric(r, 'Employer share to EPS (pension, not in corpus)')).toBe('₹24,990');
	});

	it('interest from the same month gives a slightly higher result', () => {
		expect(run({ ...one, interestFrom: 'same' }).primaryResult).toBe('₹49,111');
	});

	it('wage exactly at the ceiling gives the same as above it', () => {
		expect(run({ ...one, wage: '25000' }).primaryResult).toBe('₹48,788');
	});

	it('full basic + DA basis doubles-plus the employee share', () => {
		const r = run({ ...one, basis: 'actual' });
		expect(r.primaryResult).toBe('₹1,23,510');
		expect(metric(r, 'Your contributions')).toBe('₹72,000');
	});

	it('wage below the ceiling, 30 years at ₹15,000 (3.67% to EPF)', () => {
		expect(run({ age: '28', retireAge: '58', wage: '15000', raise: '0', balance: '0' }).primaryResult).toBe('₹34,72,050');
	});

	it('raise and opening balance, 10 years', () => {
		const r = run({ age: '30', retireAge: '40', wage: '20000', raise: '10', balance: '100000', interestFrom: 'same' });
		expect(r.primaryResult).toBe('₹9,06,994');
		expect(metric(r, 'Interest earned')).toBe('₹3,53,442');
	});

	it('default 28-year case with 5% raises', () => {
		expect(run({ age: '30', retireAge: '58', wage: '50000', raise: '5', balance: '0' }).primaryResult).toBe('₹48,51,613');
	});

	it('zero rate: contributions only', () => {
		// 40,000 wage → ceiling 25,000 → 3,917.50 × 60 months
		expect(run({ age: '53', retireAge: '58', wage: '40000', raise: '0', rate: '0' }).primaryResult).toBe('₹2,35,050');
	});

	it('table has one row per year', () => {
		expect(run().table?.rows.length).toBe(28);
	});

	it('invalid input gives a dash', () => {
		expect(run({ age: '58' }).primaryResult).toBe('—');
		expect(run({ retireAge: '59' }).primaryResult).toBe('—');
		expect(run({ age: '40', retireAge: '40' }).primaryResult).toBe('—');
		expect(run({ wage: '' }).primaryResult).toBe('—');
		expect(run({ rate: '-2' }).primaryResult).toBe('—');
	});
});
