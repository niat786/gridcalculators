import { describe, expect, it } from 'vitest';
import calc from './va-mortgage-calculator.calc';
import { vaFundingFee } from '../data/us-loans';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('VA mortgage calculator', () => {
	it('matches the worked example', () => {
		const r = run();
		expect(r.primaryResult).toBe('$2,974.76');
		expect(r.secondaryMetrics?.[4].value).toBe('$8,600');
	});
	it('uses the VA funding fee chart', () => {
		expect(vaFundingFee(0, true)).toBe(0.0215);
		expect(vaFundingFee(0, false)).toBe(0.033);
		expect(vaFundingFee(0.05, false)).toBe(0.015);
		expect(vaFundingFee(0.1, true)).toBe(0.0125);
	});
	it('charges no fee when exempt', () => {
		expect(run({ use: 'exempt' }).secondaryMetrics?.[4].value).toBe('$0');
	});
	it('rejects a 100% down payment', () => {
		expect(run({ down: '100' }).primaryResult).toBe('—');
	});
});
