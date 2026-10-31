import { describe, expect, it } from 'vitest';
import calc from './retirement-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('retirement calculator', () => {
	it('matches the worked example', () => {
		const r = run();
		expect(r.primaryResult).toBe('$10,723.64');
		expect(r.secondaryMetrics?.[0].value).toBe('$2,031,621');
		expect(r.secondaryMetrics?.[1].value).toBe('$968,560');
		expect(r.secondaryMetrics?.[2].value).toBe('$5,112.42');
	});

	it('zero returns and no inflation: $12,000 saved over 120 months pays $100 a month for 10 years', () => {
		const r = run({
			age: '30',
			retireAge: '40',
			savings: '0',
			monthly: '100',
			preReturn: '0',
			retireYears: '10',
			postReturn: '0',
			inflation: '0'
		});
		expect(r.primaryResult).toBe('$100.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$12,000');
	});

	it('savings only: $10,000 with no return over 10 years pays $83.33 a month', () => {
		const r = run({
			age: '30',
			retireAge: '40',
			savings: '10000',
			monthly: '0',
			preReturn: '0',
			retireYears: '10',
			postReturn: '0',
			inflation: '0'
		});
		expect(r.primaryResult).toBe('$83.33');
		expect(r.secondaryMetrics?.[0].value).toBe('$10,000');
	});

	it('rejects a retirement age that is not after the current age', () => {
		const r = run({ age: '50', retireAge: '50' });
		expect(r.primaryResult).toBe('—');
	});

	it('returns a dash for invalid input', () => {
		const r = run({ savings: '' });
		expect(r.primaryResult).toBe('—');
	});
});
