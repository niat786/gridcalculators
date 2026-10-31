import { beforeEach, describe, expect, it } from 'vitest';
import calc from './uk-student-loan-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

beforeEach(() => setCurrency('GBP'));

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

const zero = { auto: false, rate: '0', growth: '0' };

describe('uk student loan calculator', () => {
	it('0% interest: £3,000 at £75 a month clears in exactly 40 months', () => {
		// Plan 1 threshold £26,900; salary £36,900 → 9% × 10,000 ÷ 12 = £75
		const r = run({ ...zero, plan: 'plan1', salary: '36900', balance: '3000', firstYear: '2020' });
		expect(r.primaryResult).toBe('£75.00');
		expect(metric(r, 'Outcome')).toBe('Repaid in 3 years 4 months');
		expect(metric(r, 'Total repaid')).toBe('£3,000.00');
		expect(metric(r, 'Last payment')).toBe('April 2029'); // Jan 2026 + 39 months
	});
	it('write-off: £23.25 a month until April 2045 (25 years after 2020) = 231 payments', () => {
		const r = run({ ...zero, plan: 'plan1', salary: '30000', balance: '50000', firstYear: '2020' });
		expect(r.primaryResult).toBe('£23.25');
		expect(metric(r, 'Total repaid')).toBe('£5,370.75');
		expect(metric(r, 'Balance written off')).toBe('£44,629.25');
		expect(metric(r, 'Written off in')).toBe('April 2045');
	});
	it('6% interest, £90 a month on £10,000: 163 payments, total £14,633.26 (closed-form annuity)', () => {
		const r = run({ auto: false, rate: '6', growth: '0', plan: 'plan1', salary: '38900', balance: '10000', firstYear: '2015' });
		expect(metric(r, 'Outcome')).toBe('Repaid in 13 years 7 months');
		expect(metric(r, 'Total repaid')).toBe('£14,633.26');
		expect(metric(r, 'Interest charged')).toBe('£4,633.26');
		expect(metric(r, 'Last payment')).toBe('July 2039');
	});
	it('current rates: Plan 1/4/5 4.1%, Postgraduate 6%, Plan 2 slides with income and caps at 6%', () => {
		const rate = (plan: string, salary = '40000') => metric(run({ plan, salary }), 'Interest rate now');
		expect(rate('plan1')).toBe('4.1%');
		expect(rate('plan4')).toBe('4.1%');
		expect(rate('plan5')).toBe('4.1%');
		expect(rate('pg')).toBe('6%');
		expect(rate('plan2', '29385')).toBe('4.1%');
		expect(rate('plan2', '40000')).toBe('5.46%'); // 4.1% + 3% × (40,000 − 29,385) ÷ 23,500
		expect(rate('plan2', '60000')).toBe('6%'); // 7.1% capped
	});
	it('repayment thresholds: Plan 2 £29,385, Plan 5 £25,000, Plan 4 £33,795, Postgraduate 6% over £21,000', () => {
		expect(run({ plan: 'plan2', salary: '29385' }).primaryResult).toBe('£0.00');
		expect(run({ plan: 'plan2', salary: '41385' }).primaryResult).toBe('£90.00');
		expect(run({ plan: 'plan5', salary: '37000', today: '2026-06-15' }).primaryResult).toBe('£90.00');
		expect(run({ plan: 'plan4', salary: '45795' }).primaryResult).toBe('£90.00');
		expect(run({ plan: 'pg', salary: '36000' }).primaryResult).toBe('£75.00'); // 6% × 15,000 ÷ 12
	});
	it('Plan 5 repays nothing before April 2026', () => {
		expect(run({ plan: 'plan5', salary: '37000' }).primaryResult).toBe('£0.00'); // calculation starts January 2026
	});
	it('a salary under the threshold repays nothing until written off', () => {
		const r = run({ plan: 'plan2', salary: '20000', growth: '0' });
		expect(metric(r, 'Total repaid')).toBe('£0.00');
	});
	it('invalid input returns —', () => {
		expect(run({ balance: '0' }).primaryResult).toBe('—');
		expect(run({ salary: '' }).primaryResult).toBe('—');
	});
});
