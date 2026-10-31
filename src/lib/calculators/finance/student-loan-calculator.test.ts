import { describe, expect, it } from 'vitest';
import calc from './student-loan-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('student loan calculator', () => {
	it('matches the worked example: $35,000 at 5.8% over 10 years with $100 extra', () => {
		const r = run({ extra: '100' });
		expect(r.primaryResult).toBe('$385.07');
		expect(metric(r, 'Total interest')).toBe('$11,207.90');
		expect(metric(r, 'Payoff time with extra')).toBe('7 years 5 months');
		expect(metric(r, 'Total interest with extra')).toBe('$8,143.87');
		expect(metric(r, 'Months saved')).toBe('31 months');
		expect(metric(r, 'Interest saved')).toBe('$3,064.03');
	});

	it('shows no savings when there is no extra payment', () => {
		const r = run({ extra: '0' });
		expect(r.primaryResult).toBe('$385.07');
		expect(metric(r, 'Months saved')).toBe('0 months');
		expect(metric(r, 'Interest saved')).toBe('$0.00');
	});

	it('handles a 25-year term independently checked by bisection', () => {
		// $50,000 at 7% over 300 payments: 353.3896 per month, total interest 56,016.88
		const r = run({ balance: '50000', rate: '7', years: '25', extra: '0' });
		expect(r.primaryResult).toBe('$353.39');
		expect(metric(r, 'Total interest')).toBe('$56,016.88');
	});

	it('divides evenly at a 0% rate', () => {
		const r = run({ balance: '12000', rate: '0', years: '10', extra: '0' });
		expect(r.primaryResult).toBe('$100.00');
		expect(metric(r, 'Total interest')).toBe('$0.00');
	});

	it('returns a dash for an empty balance', () => {
		expect(run({ balance: '' }).primaryResult).toBe('—');
	});
});
