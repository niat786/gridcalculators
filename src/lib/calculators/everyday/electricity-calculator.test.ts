import { describe, expect, it } from 'vitest';
import calc from './electricity-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('electricity calculator', () => {
	it('matches the worked example: 100 W, 8 hours a day, 30 days, $0.17 per kWh', () => {
		// 100 × 8 ÷ 1,000 = 0.8 kWh a day; × 30 = 24 kWh; 24 × 0.17 = $4.08
		// 0.8 × 365 = 292 kWh; 292 × 0.17 = $49.64 a year
		const r = run();
		expect(r.primaryResult).toBe('$4.08');
		expect(r.primaryLabel).toBe('Monthly cost');
		expect(r.secondaryMetrics?.[0].value).toBe('0.8 kWh');
		expect(r.secondaryMetrics?.[1].value).toBe('24 kWh');
		expect(r.secondaryMetrics?.[2].value).toBe('292 kWh');
		expect(r.secondaryMetrics?.[3].value).toBe('$0.14');
		expect(r.secondaryMetrics?.[4].value).toBe('$49.64');
	});

	it('handles a 1,500 W heater: 2 hours a day, 20 days, $0.12 per kWh', () => {
		// 1,500 × 2 ÷ 1,000 = 3 kWh a day; × 20 = 60 kWh; 60 × 0.12 = $7.20
		// 3 × 365 = 1,095 kWh; 1,095 × 0.12 = $131.40
		const r = run({ power: '1500', hours: '2', days: '20', price: '0.12' });
		expect(r.primaryResult).toBe('$7.20');
		expect(r.secondaryMetrics?.[2].value).toBe('1,095 kWh');
		expect(r.secondaryMetrics?.[4].value).toBe('$131.40');
	});

	it('multiplies the energy for two 60 W devices running 24 hours a day', () => {
		// 60 × 24 × 2 ÷ 1,000 = 2.88 kWh a day; × 30 = 86.4 kWh; 86.4 × 0.20 = $17.28
		// 2.88 × 365 = 1,051.2 kWh; 1,051.2 × 0.20 = $210.24 a year
		const r = run({ power: '60', hours: '24', days: '30', price: '0.2', quantity: '2' });
		expect(r.primaryResult).toBe('$17.28');
		expect(r.secondaryMetrics?.[0].value).toBe('2.88 kWh');
		expect(r.secondaryMetrics?.[1].value).toBe('86.4 kWh');
		expect(r.secondaryMetrics?.[2].value).toBe('1,051 kWh');
		expect(r.secondaryMetrics?.[4].value).toBe('$210.24');
	});

	it('returns a dash for more than 24 hours a day', () => {
		expect(run({ hours: '25' }).primaryResult).toBe('—');
	});

	it('returns a dash for a negative power rating', () => {
		expect(run({ power: '-5' }).primaryResult).toBe('—');
	});
});
