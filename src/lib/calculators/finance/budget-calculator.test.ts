import { describe, expect, it } from 'vitest';
import calc from './budget-calculator.calc';
import { defaultRaw, encodeRows, toValues } from '../../components/calculator/state';
import type { RowsInput, RowValue } from '../types';

const expenses = calc.inputs.find((i) => i.id === 'expenses') as RowsInput;
const rows = (list: RowValue[]) => encodeRows(expenses, list);

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('budget calculator', () => {
	it('matches the worked example: $4,000 pay, six expenses', () => {
		const r = run();
		expect(r.primaryResult).toBe('$800.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$2,000.00');
		expect(r.secondaryMetrics?.[1].value).toBe('$1,200.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$2,940.00');
		expect(r.secondaryMetrics?.[3].value).toBe('$1,060.00');
	});

	it('compares each category with its target', () => {
		const rowsOut = run().table?.rows ?? [];
		expect(rowsOut[0].status).toBe('$30.00 over');
		expect(rowsOut[1].status).toBe('$790.00 under');
		expect(rowsOut[2].status).toBe('$300.00 short');
	});

	it('with no expenses, shows only the targets', () => {
		const r = run({ expenses: '' });
		expect(r.summary).toMatch(/\$2,000\.00 for needs/);
		expect(r.secondaryMetrics?.[2].value).toBe('$0.00');
		expect(r.secondaryMetrics?.[3].value).toBe('$4,000.00');
	});

	it('reports savings above target and an overspend on income', () => {
		const r = run({
			income: '3000',
			expenses: rows([
				{ name: 'Rent', amount: 2000, category: 'needs' },
				{ name: 'Fund', amount: 1000, category: 'savings' }
			])
		});
		// targets 1,500 / 900 / 600; needs 2,000 is 500 over, savings 1,000 is 400 above
		expect(r.table?.rows[0].status).toBe('$500.00 over');
		expect(r.table?.rows[2].status).toBe('$400.00 above');
		expect(r.secondaryMetrics?.[3].label).toBe('Left after expenses');
		expect(r.secondaryMetrics?.[3].value).toBe('$0.00');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ income: '0' }).primaryResult).toBe('—');
		expect(run({ expenses: rows([{ name: 'Blank', amount: '', category: 'needs' }]) }).primaryResult).toBe('—');
	});
});
