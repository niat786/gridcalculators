import { describe, expect, it } from 'vitest';
import calc from './payback-period-calculator.calc';
import { defaultRaw, encodeRows, toValues } from '../../components/calculator/state';
import type { RowsInput, RowValue } from '../types';

const flows = calc.inputs.find((i) => i.id === 'flows') as RowsInput;
const rows = (amounts: (number | string)[]): string =>
	encodeRows(
		flows,
		amounts.map((a, i) => ({ label: `Year ${i + 1}`, amount: a }) as RowValue)
	);

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('payback period calculator', () => {
	it('matches the even-cash-flow worked example: $50,000 for $15,000 a year over 10 years at 10%', () => {
		// Simple 50,000 ÷ 15,000 = 3.33; discounted 4.26; NPV = −50,000 + 92,168.51 = 42,168.51
		const r = run();
		expect(r.primaryResult).toBe('3.33 years');
		expect(r.secondaryMetrics?.[0].value).toBe('4.26 years');
		expect(r.secondaryMetrics?.[1].value).toBe('$42,168.51');
		expect(r.secondaryMetrics?.[2].value).toBe('$150,000.00');
		expect(r.secondaryMetrics?.[3].value).toBe('$100,000.00');
	});

	it('matches the uneven default: inflows 6k to 20k over 6 years at 10%', () => {
		// Running totals 6k, 15k, 27k, 42k, 60k, so simple payback = 4 + (50,000 − 42,000) ÷ 18,000 = 4.44
		// Discounted payback 5.59; NPV 4,619.60
		const r = run({ mode: 'uneven', flows: rows([6000, 9000, 12000, 15000, 18000, 20000]) });
		expect(r.primaryResult).toBe('4.44 years');
		expect(r.secondaryMetrics?.[0].value).toBe('5.59 years');
		expect(r.secondaryMetrics?.[1].value).toBe('$4,619.60');
	});

	it('gives exact simple payback of 4.17 years with no discounting', () => {
		// Running totals 4k, 10k, 18k, 28k, 40k. 30,000 is reached in year 5: 4 + 2,000 ÷ 12,000
		// At 0% the NPV is 40,000 − 30,000 = 10,000
		const r = run({ mode: 'uneven', investment: '30000', rate: '0', flows: rows([4000, 6000, 8000, 10000, 12000]) });
		expect(r.primaryResult).toBe('4.17 years');
		expect(r.secondaryMetrics?.[0].value).toBe('4.17 years');
		expect(r.secondaryMetrics?.[1].value).toBe('$10,000.00');
	});

	it('reports not reached when the inflows never recover the investment', () => {
		const r = run({ mode: 'uneven', investment: '50000', rate: '10', flows: rows([1000, 1000]) });
		expect(r.primaryResult).toBe('Not reached');
		expect(r.secondaryMetrics?.[0].value).toBe('Not reached');
	});

	it('returns a dash when the yearly inflow is zero in even mode', () => {
		expect(run({ inflow: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash for a negative inflow in uneven mode', () => {
		expect(run({ mode: 'uneven', flows: rows([1000, -500]) }).primaryResult).toBe('—');
	});
});

describe('payback period: inflow ends before payback', () => {
	it('says Not reached when the even inflows stop too early', async () => {
		const calc = (await import('./payback-period-calculator.calc')).default;
		const { defaultRaw, toValues } = await import('../../components/calculator/state');
		const raw = defaultRaw(calc.inputs, '2026-10-28');
		const ids = calc.inputs.map((i) => i.id);
		const over: Record<string, string> = {};
		for (const id of ids) {
			if (/invest/i.test(id)) over[id] = '20000';
			if (/^inflow$|annual|yearly/i.test(id)) over[id] = '5000';
		}
		over.years = '3';
		const r = calc.calculate(toValues(calc.inputs, { ...raw, ...over }));
		expect(r.primaryResult).toBe('Not reached');
	});
});
