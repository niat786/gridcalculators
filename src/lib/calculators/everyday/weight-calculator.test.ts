import { describe, expect, it } from 'vitest';
import calc from './weight-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('weight calculator', () => {
	it('70 kg on Earth weighs 686.47 N and reads 70 kg on the scale', () => {
		// 70 × 9.80665 = 686.4655 N
		const r = run();
		expect(r.primaryResult).toBe('686.47 N');
		expect(r.secondaryMetrics?.[0].value).toBe('70.00 kg');
		expect(r.secondaryMetrics?.[1].value).toBe('154.32 lb');
	});

	it('matches the worked example: 70 kg on the Moon is 113.40 N, a scale reading of 11.56 kg', () => {
		// 70 × 1.62 = 113.40 N; 113.40 ÷ 9.80665 = 11.5636 kg; × 2.20462 = 25.49 lb
		const r = run({ body: 'moon' });
		expect(r.primaryResult).toBe('113.40 N');
		expect(r.secondaryMetrics?.[0].value).toBe('11.56 kg');
		expect(r.secondaryMetrics?.[1].value).toBe('25.49 lb');
	});

	it('100 kg on Jupiter is 2,479.00 N and reads 252.79 kg', () => {
		// 100 × 24.79 = 2479 N; 2479 ÷ 9.80665 = 252.79 kg; × 2.20462 = 557.30 lb
		const r = run({ massKg: '100', body: 'jupiter' });
		expect(r.primaryResult).toBe('2,479.00 N');
		expect(r.secondaryMetrics?.[0].value).toBe('252.79 kg');
		expect(r.secondaryMetrics?.[1].value).toBe('557.30 lb');
	});

	it('takes pounds: 154 lb on Mars is 259.16 N', () => {
		// 154 lb = 69.853 kg; × 3.71 = 259.16 N
		const r = run({ massUnit: 'lb', massLb: '154', body: 'mars' });
		expect(r.primaryResult).toBe('259.16 N');
		expect(r.secondaryMetrics?.[0].value).toBe('26.43 kg');
	});

	it('returns a dash for a zero or missing mass', () => {
		expect(run({ massKg: '0' }).primaryResult).toBe('—');
		expect(run({ massKg: '' }).primaryResult).toBe('—');
	});
});
