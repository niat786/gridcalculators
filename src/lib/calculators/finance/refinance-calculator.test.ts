import { describe, expect, it } from 'vitest';
import calc from './refinance-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('refinance calculator', () => {
	it('matches the worked example: $300,000 at 6.5% with 25 years left, refinanced at 5.5% for 30 years', () => {
		const r = run({
			balance: '300000',
			currentRate: '6.5',
			remaining: '25',
			newRate: '5.5',
			newTerm: '30',
			closing: '4000'
		});
		expect(r.primaryResult).toBe('$1,703.37');
		expect(metric(r, 'Current monthly payment')).toBe('$2,025.62');
		expect(metric(r, 'Monthly savings')).toBe('$322.25');
		expect(metric(r, 'Break-even point')).toBe('13 months');
		expect(metric(r, 'Lifetime interest, current loan')).toBe('$307,686.45');
		expect(metric(r, 'Lifetime interest, new loan')).toBe('$313,212.12');
		expect(metric(r, 'Lifetime interest difference')).toBe('$5,525.68 more');
	});

	it('shows no break-even point when the new loan is longer and cheaper, but costs more in total interest', () => {
		const r = run({
			balance: '300000',
			currentRate: '7',
			remaining: '25',
			newRate: '5',
			newTerm: '15',
			closing: '0'
		});
		expect(r.primaryResult).toBe('$2,372.38');
		expect(metric(r, 'Monthly savings')).toBe('-$252.04');
		expect(metric(r, 'Break-even point')).toBe('None (no monthly savings)');
		expect(metric(r, 'Lifetime interest difference')).toBe('$209,072.72 less');
	});

	it('handles a 0% loan with no change in payment', () => {
		const r = run({
			balance: '120000',
			currentRate: '0',
			remaining: '10',
			newRate: '0',
			newTerm: '10',
			closing: '0'
		});
		expect(r.primaryResult).toBe('$1,000.00');
		expect(metric(r, 'Monthly savings')).toBe('$0.00');
		expect(metric(r, 'Lifetime interest difference')).toBe('No difference');
	});

	it('returns a dash for an empty balance', () => {
		expect(run({ balance: '' }).primaryResult).toBe('—');
	});
});
