import { describe, expect, it } from 'vitest';
import calc from './shoe-size-conversion.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('shoe size converter', () => {
	it('converts a men’s US 9', () => {
		const r = run();
		expect(r.primaryResult).toBe('EU 42');
		expect(r.secondaryMetrics?.[1].value).toBe('8.5');
	});
	it('converts EU to US for women', () => {
		expect(run({ who: 'women', system: 'eu', eu: '38' }).primaryResult).toBe('US 7.5');
	});
	it('finds a size from foot length', () => {
		expect(run({ system: 'cm', cm: '27.4' }).primaryResult).toBe('EU 42–43');
	});
	it('refuses sizes far outside the chart', () => {
		expect(run({ us: '19' }).primaryResult).toBe('—');
	});
});
