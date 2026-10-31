import { beforeEach, describe, expect, it } from 'vitest';
import calc from './malaysia-epf-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

// Contribution rows reproduce the EPF Third Schedule bands quoted by the sources named in data/my-2026.ts
// (band 2,980.01-3,000: 330/390; 4,980.01-5,000: 550/650; 9,900.01-10,000: 1,100/1,200; 500.01-520: 58/68).
// Projection values come from a separate node script (monthly dividend accrual, credited every 12 months).
const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const M = (s: string) => `MYR ${s}`;
const EE = 'Your contribution per month (employee)';
const ER = 'Employer contribution per month';

beforeEach(() => setCurrency('MYR'));

describe('malaysia epf calculator', () => {
	it('matches the worked example: RM4,000 wages, age 30 to 55', () => {
		const r = run();
		expect(metric(r, EE)).toBe(M('440.00'));
		expect(metric(r, ER)).toBe(M('520.00'));
		expect(metric(r, 'Total going into EPF per month')).toBe(M('960.00'));
		expect(metric(r, 'Total going into EPF per year')).toBe(M('11,520.00'));
		expect(r.primaryResult).toBe(M('957,290.39'));
		expect(metric(r, 'Contributions over the period')).toBe(M('409,860.00'));
		expect(metric(r, 'Dividends over the period')).toBe(M('527,430.39'));
	});

	it('Third Schedule band rows (citizen under 60)', () => {
		const at = (wage: string) => run({ wage });
		expect([metric(at('3000'), EE), metric(at('3000'), ER)]).toEqual([M('330.00'), M('390.00')]);
		expect([metric(at('2980.01'), EE), metric(at('2980.01'), ER)]).toEqual([M('330.00'), M('390.00')]);
		expect([metric(at('5000'), EE), metric(at('5000'), ER)]).toEqual([M('550.00'), M('650.00')]);
		expect([metric(at('10000'), EE), metric(at('10000'), ER)]).toEqual([M('1,100.00'), M('1,200.00')]);
		expect([metric(at('9900.01'), EE), metric(at('9900.01'), ER)]).toEqual([M('1,100.00'), M('1,200.00')]);
		expect([metric(at('500.01'), EE), metric(at('500.01'), ER)]).toEqual([M('58.00'), M('68.00')]);
	});

	it('employer rate drops from 13% to 12% just above RM5,000 (band top RM5,100)', () => {
		const r = run({ wage: '5000.01' });
		expect(metric(r, EE)).toBe(M('561.00'));
		expect(metric(r, ER)).toBe(M('612.00'));
	});

	it('wages above RM20,000 use the percentage on the actual wage, rounded up', () => {
		const r = run({ wage: '25000' });
		expect(metric(r, EE)).toBe(M('2,750.00'));
		expect(metric(r, ER)).toBe(M('3,000.00'));
		const odd = run({ wage: '20000.01' });
		expect(metric(odd, EE)).toBe(M('2,201.00'));
		expect(metric(odd, ER)).toBe(M('2,401.00'));
	});

	it('foreign employees pay 2% each, rounded up to the next ringgit', () => {
		const r = run({ who: 'foreign', wage: '3000' });
		expect(metric(r, EE)).toBe(M('60.00'));
		expect(metric(r, ER)).toBe(M('60.00'));
		expect(metric(run({ who: 'foreign', wage: '3000.5' }), EE)).toBe(M('61.00'));
	});

	it('one year with no pay rise and no dividend is just 12 months of contributions', () => {
		const r = run({ wage: '5000', age: '54', balance: '0', raise: '0', dividend: '0' });
		expect(r.primaryResult).toBe(M('14,400.00'));
	});

	it('one year at a 6% dividend earns 396 on monthly balances', () => {
		const r = run({ wage: '5000', age: '54', balance: '0', raise: '0', dividend: '6' });
		expect(r.primaryResult).toBe(M('14,796.00'));
		expect(metric(r, 'Dividends over the period')).toBe(M('396.00'));
	});

	it('foreign employee projected to 60: age 50, RM100,000 saved, 5% dividend', () => {
		const r = run({ who: 'foreign', wage: '3000', age: '50', retire: '60', balance: '100000', raise: '0', dividend: '5' });
		expect(r.primaryResult).toBe(M('181,416.70'));
	});

	it('pay rise compounds: RM8,000 wages, age 40 to 60, 5% rise, 5.5% dividend', () => {
		const r = run({ wage: '8000', age: '40', retire: '60', balance: '0', raise: '5', dividend: '5.5' });
		expect(r.primaryResult).toBe(M('1,202,175.93'));
	});

	it('already at the retirement age shows only today\'s contributions; bad input gives a dash', () => {
		const r = run({ age: '55', retire: '55' });
		expect(r.primaryResult).toBe(M('960.00'));
		expect(r.chart).toBeUndefined();
		expect(run({ wage: '' }).primaryResult).toBe('—');
		expect(run({ wage: '10' }).primaryResult).toBe('—');
		expect(run({ dividend: '-1' }).primaryResult).toBe('—');
	});
});
