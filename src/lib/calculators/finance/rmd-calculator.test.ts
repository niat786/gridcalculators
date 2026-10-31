import { describe, expect, it } from 'vitest';
import calc, { distributionPeriod, startAge } from './rmd-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('RMD calculator', () => {
	it('matches the worked example', () => {
		expect(run().primaryResult).toBe('$19,607.84');
	});
	it('uses the IRS Uniform Lifetime Table', () => {
		expect(distributionPeriod(73)).toBe(26.5);
		expect(distributionPeriod(80)).toBe(20.2);
		expect(distributionPeriod(90)).toBe(12.2);
		expect(distributionPeriod(100)).toBe(6.4);
		expect(distributionPeriod(120)).toBe(2.0);
		expect(distributionPeriod(125)).toBe(2.0);
	});
	it('applies the SECURE 2.0 start ages', () => {
		expect(startAge(1950)).toBe(72);
		expect(startAge(1955)).toBe(73);
		expect(startAge(1960)).toBe(75);
	});
	it('shows no RMD before the start age', () => {
		const r = run({ born: '1960', year: '2026' });
		expect(r.primaryResult).toBe('$0');
		expect(r.summary).toContain('2035');
	});
	it('rejects impossible ages', () => {
		expect(run({ born: '2030' }).primaryResult).toBe('—');
	});
});
