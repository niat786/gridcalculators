import { describe, expect, it } from 'vitest';
import calc from './irr-calculator.calc';
import { defaultRaw, encodeRows, toValues } from '../../components/calculator/state';
import type { RowsInput, RowValue } from '../types';

const flows = calc.inputs.find((i) => i.id === 'flows') as RowsInput;
const rows = (amounts: (number | string)[]): string =>
	encodeRows(
		flows,
		amounts.map((a, i) => ({ label: `Year ${i}`, amount: a }) as RowValue)
	);

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('irr calculator', () => {
	it('matches the worked example: −$10,000 then five years of returns', () => {
		// Solve NPV = 0: IRR ≈ 19.25%. NPV at 8%: 2,948.72. Running total turns positive in
		// period 3: 2 + 3,000 ÷ 4,000 = 2.75 periods.
		const r = run();
		expect(r.primaryResult).toBe('19.25%');
		expect(r.secondaryMetrics?.[0].value).toBe('$2,948.72');
		expect(r.secondaryMetrics?.[1].value).toBe('2.75 periods');
		expect(r.summary).toContain('above');
	});

	it('gives exactly 10% for a $100 investment that returns $110', () => {
		// −100 + 110 ÷ 1.10 = 0, so NPV at 10% is zero
		const r = run({ flows: rows([-100, 110]), rate: '10' });
		expect(r.primaryResult).toBe('10%');
		expect(r.secondaryMetrics?.[0].value).toBe('$0.00');
	});

	it('gives exactly 10% for −1,000 followed by 1,331 after three periods', () => {
		// 1,000 × 1.1³ = 1,331, so IRR = 10%
		const r = run({ flows: rows([-1000, 0, 0, 1331]), rate: '8' });
		expect(r.primaryResult).toBe('10%');
	});

	it('finds the payback period by interpolation: 2.50 periods', () => {
		// Running totals: −1,000, −600, −200, +200. Payback = 2 + 200 ÷ 400 = 2.5
		const r = run({ flows: rows([-1000, 400, 400, 400]) });
		expect(r.secondaryMetrics?.[1].value).toBe('2.50 periods');
	});

	it('returns a dash when every cash flow is positive', () => {
		const r = run({ flows: rows([100, 200]) });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toContain('at least one negative and one positive');
	});

	it('returns a dash when a cash flow amount is missing', () => {
		expect(run({ flows: rows([-1000, '']) }).primaryResult).toBe('—');
	});
});
