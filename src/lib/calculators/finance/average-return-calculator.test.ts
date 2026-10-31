import { describe, expect, it } from 'vitest';
import calc from './average-return-calculator.calc';
import { defaultRaw, encodeRows, toValues } from '../../components/calculator/state';
import type { RowsInput, RowValue } from '../types';

const returns = calc.inputs.find((i) => i.id === 'returns') as RowsInput;
const rows = (rets: number[]): string =>
	encodeRows(
		returns,
		rets.map((r, i) => ({ label: `Year ${i + 1}`, ret: r }) as RowValue)
	);

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('average return calculator', () => {
	it('matches the default start and end example: 10,000 to 25,000 over 10 years', () => {
		// (2.5)^(1/10) − 1 = 9.5958%; total return 150%; gain $15,000
		const r = run();
		expect(r.primaryResult).toBe('9.6%');
		expect(r.secondaryMetrics?.[0].value).toBe('150%');
		expect(r.secondaryMetrics?.[1].value).toBe('$15,000.00');
		expect(r.secondaryMetrics?.[2].value).toBe('2.5×');
	});

	it('matches the yearly returns worked example', () => {
		// Growth factor 1.891049; arithmetic mean 71 ÷ 8 = 8.875%; annualized 8.2899%
		const r = run({ mode: 'yearly', returns: rows([25, -10, 15, 8, -5, 20, 12, 6]) });
		expect(r.primaryResult).toBe('8.29%');
		expect(r.secondaryMetrics?.[0].value).toBe('8.88%');
		expect(r.secondaryMetrics?.[1].value).toBe('0.59 points');
		expect(r.secondaryMetrics?.[3].value).toBe('$18,910.49');
		expect(r.secondaryMetrics?.[4].value).toBe('8 years');
	});

	it('gives 7.18% for 1,000 doubling to 2,000 over 10 years', () => {
		// 2^(1/10) − 1 = 7.1773%
		const r = run({ start: '1000', end: '2000', years: '10' });
		expect(r.primaryResult).toBe('7.18%');
	});

	it('shows zero arithmetic mean but −13.4% annualized for +50% then −50%', () => {
		// Arithmetic mean 0%; geometric = √0.75 − 1 = −13.397%; 10,000 falls to 7,500
		const r = run({ mode: 'yearly', start: '10000', returns: rows([50, -50]) });
		expect(r.primaryResult).toBe('-13.4%');
		expect(r.secondaryMetrics?.[0].value).toBe('0%');
		expect(r.secondaryMetrics?.[3].value).toBe('$7,500.00');
	});

	it('gives no overstatement when every year returns the same 10%', () => {
		// 1.1^3 = 1.331, so 1,000 becomes $1,331.00
		const r = run({ mode: 'yearly', start: '1000', returns: rows([10, 10, 10]) });
		expect(r.primaryResult).toBe('10%');
		expect(r.secondaryMetrics?.[1].value).toBe('0 points');
		expect(r.secondaryMetrics?.[3].value).toBe('$1,331.00');
	});

	it('returns a dash for a zero starting amount', () => {
		expect(run({ start: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash when a yearly return is −100% or lower', () => {
		expect(run({ mode: 'yearly', returns: rows([10, -100]) }).primaryResult).toBe('—');
	});
});
