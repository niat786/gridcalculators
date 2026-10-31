import { describe, expect, it } from 'vitest';
import calc from './sample-size-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('sample size calculator', () => {
	it('gives 385 for 95% confidence, 50% proportion and ±5% (the default)', () => {
		const r = run();
		expect(r.primaryResult).toBe('385');
		expect(metric(r, 'Z value')).toBe('1.959964');
		expect(metric(r, 'Before population correction')).toBe('385');
	});

	it('gives 1,068 for a ±3% margin', () => {
		expect(run({ moe: '3' }).primaryResult).toBe('1,068');
	});

	it('gives 664 for 99% confidence and ±5%', () => {
		expect(run({ level: '99' }).primaryResult).toBe('664');
	});

	it('gives 279 for a population of 1,000 (finite correction from 385)', () => {
		const r = run({ pop: '1000' });
		expect(r.primaryResult).toBe('279');
		expect(metric(r, 'Before population correction')).toBe('385');
	});

	it('gives 371 for a population of 10,000', () => {
		expect(run({ pop: '10000' }).primaryResult).toBe('371');
	});

	it('gives a margin of error of ±4.8999% for n = 400 at 95% and 50%', () => {
		const r = run({ mode: 'moe', sampleN: '400' });
		expect(r.primaryResult).toBe('±4.8999%');
		expect(r.primaryLabel).toBe('Margin of error');
	});

	it('gives ±3.7974% for n = 400 in a population of 1,000', () => {
		expect(run({ mode: 'moe', sampleN: '400', pop: '1000' }).primaryResult).toBe('±3.7974%');
	});

	it('returns a dash for a margin of error of 0', () => {
		expect(run({ moe: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash for a proportion of 0%', () => {
		expect(run({ p: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash when the sample is bigger than the population', () => {
		expect(run({ mode: 'moe', sampleN: '500', pop: '400' }).primaryResult).toBe('—');
	});

	it('returns a dash for text that is not a number', () => {
		expect(run({ moe: 'abc' }).primaryResult).toBe('—');
	});
});
