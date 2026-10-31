import { describe, expect, it } from 'vitest';
import calc from './common-factor-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('common factor calculator', () => {
	it('lists the common factors of 24, 36 and 60', () => {
		const r = run();
		expect(r.primaryResult).toBe('1, 2, 3, 4, 6, 12');
		expect(r.long).toBe(true);
		expect(metric(r, 'Greatest common factor')).toBe('12');
		expect(metric(r, 'Number of common factors')).toBe('6');
	});

	it('gives 1, 2, 3, 6 for 12 and 18', () => {
		const r = run({ values: '12, 18' });
		expect(r.primaryResult).toBe('1, 2, 3, 6');
		expect(metric(r, 'Greatest common factor')).toBe('6');
		expect(metric(r, 'Number of common factors')).toBe('4');
	});

	it('gives only 1 for 17 and 31', () => {
		const r = run({ values: '17, 31' });
		expect(r.primaryResult).toBe('1');
		expect(metric(r, 'Number of common factors')).toBe('1');
	});

	it('handles 1,000,000,000,000 and 500,000,000,000 with 156 common factors', () => {
		const r = run({ values: '1000000000000, 500000000000' });
		expect(metric(r, 'Greatest common factor')).toBe('500,000,000,000');
		expect(metric(r, 'Number of common factors')).toBe('156');
		expect(r.primaryResult.split(', ')).toHaveLength(156);
		expect(r.primaryResult.startsWith('1, 2, 4, 5, 8, 10, 16, 20')).toBe(true);
	});

	it('returns a dash for decimals', () => {
		expect(run({ values: '2.5, 4' }).primaryResult).toBe('—');
	});

	it('returns a dash for zero or negative numbers', () => {
		expect(run({ values: '0, 5' }).primaryResult).toBe('—');
		expect(run({ values: '-4, 8' }).primaryResult).toBe('—');
	});

	it('returns a dash when only one number is entered', () => {
		expect(run({ values: '12' }).primaryResult).toBe('—');
	});
});
