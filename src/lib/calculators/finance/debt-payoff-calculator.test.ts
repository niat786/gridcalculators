import { describe, expect, it } from 'vitest';
import calc from './debt-payoff-calculator.calc';
import { defaultRaw, encodeRows, toValues } from '../../components/calculator/state';
import type { CalculationResult, RowsInput, RowValue } from '../types';

const run = (over: Record<string, string> = {}): CalculationResult =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: CalculationResult, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const rowsRaw = (rows: RowValue[]) => encodeRows(calc.inputs[0] as RowsInput, rows);

describe('debt payoff calculator', () => {
	it('matches the worked example (avalanche, defaults)', () => {
		const r = run();
		expect(r.primaryResult).toBe('29 months');
		expect(metric(r, 'Total interest')).toBe('$1,640.18');
		expect(metric(r, 'Total paid')).toBe('$15,240.18');
		expect(metric(r, 'Monthly budget')).toBe('$530.00');
		expect(r.table?.rows.map((x) => [x.debt, x.paid])).toEqual([
			['Credit card', 'Month 17'],
			['Personal loan', 'Month 18'],
			['Car loan', 'Month 29']
		]);
	});

	it('snowball clears the smallest balance first and costs more interest here', () => {
		const r = run({ strategy: 'snowball' });
		expect(r.primaryResult).toBe('29 months');
		expect(metric(r, 'Total interest')).toBe('$1,697.83');
		expect(r.table?.rows.map((x) => x.debt)).toEqual(['Personal loan', 'Credit card', 'Car loan']);
	});

	it('returns a dash when the budget cannot clear the debt within 100 years', () => {
		const debts = rowsRaw([{ name: 'Card', balance: 5000, apr: 24, minimum: 10 }]);
		const r = run({ debts, extra: '0' });
		expect(r.primaryResult).toBe('—');
	});

	it('returns a dash for a zero balance', () => {
		const debts = rowsRaw([{ name: 'Card', balance: 0, apr: 24, minimum: 50 }]);
		expect(run({ debts }).primaryResult).toBe('—');
	});
});
