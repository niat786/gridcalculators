import { describe, expect, it } from 'vitest';
import calc from './debt-to-income-ratio-calculator.calc';
import { defaultRaw, encodeRows, toValues } from '../../components/calculator/state';
import type { RowsInput, RowValue } from '../types';

const debts = calc.inputs.find((i) => i.id === 'debts') as RowsInput;
const rows = (list: RowValue[]) => encodeRows(debts, list);

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('debt-to-income ratio calculator', () => {
	it('matches the worked example: $6,000 income, $1,800 housing, $670 other debts', () => {
		const r = run();
		expect(r.primaryResult).toBe('41.2%');
		expect(r.secondaryMetrics?.[0].value).toBe('30.0%');
		expect(r.secondaryMetrics?.[1].value).toBe('$2,470.00');
		expect(r.secondaryMetrics?.[3].value).toBe('Manageable');
	});

	it('good band: $1,500 housing and no other debts on $6,000 is 25.0%', () => {
		const r = run({ housing: '1500', debts: '' });
		expect(r.primaryResult).toBe('25.0%');
		expect(r.secondaryMetrics?.[3].value).toBe('Good');
	});

	it('exactly 36% is still good', () => {
		// 1,800 ÷ 5,000 = 36%
		const r = run({ income: '5000', housing: '1800', debts: '' });
		expect(r.primaryResult).toBe('36.0%');
		expect(r.secondaryMetrics?.[3].value).toBe('Good');
	});

	it('high band: $1,800 housing plus a $1,000 loan on $4,000 is 70.0%', () => {
		const r = run({ income: '4000', housing: '1800', debts: rows([{ name: 'Loan', amount: 1000 }]) });
		expect(r.primaryResult).toBe('70.0%');
		expect(r.secondaryMetrics?.[3].value).toBe('High');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ income: '' }).primaryResult).toBe('—');
		expect(run({ debts: rows([{ name: 'Bad', amount: '' }]) }).primaryResult).toBe('—');
	});
});
