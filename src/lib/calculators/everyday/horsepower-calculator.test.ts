import { describe, expect, it } from 'vitest';
import calc from './horsepower-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('horsepower calculator', () => {
	it('matches the worked example: 300 lb·ft at 5,000 rpm is 285.6 hp', () => {
		// 300 × 5000 ÷ 5252 = 285.61 hp; 300 lb·ft = 406.7 N·m; 406.7 × 5000 ÷ 9549 = 213.0 kW
		const r = run();
		expect(r.primaryResult).toBe('285.6 hp');
		expect(r.secondaryMetrics?.[1].value).toBe('289.6 PS');
		expect(r.secondaryMetrics?.[2].value).toBe('213.0 kW');
		expect(r.secondaryMetrics?.[3].value).toBe('406.7 N·m');
	});

	it('shows kilowatts when asked: 100 lb·ft at 6,000 rpm is 85.2 kW', () => {
		// 100 × 6000 ÷ 5252 = 114.24 hp; 135.58 N·m × 6000 ÷ 9549 = 85.19 kW
		const r = run({ torqueLbft: '100', rpm: '6000', outUnit: 'kw' });
		expect(r.primaryResult).toBe('85.2 kW');
		expect(r.secondaryMetrics?.[0].value).toBe('114.2 hp');
	});

	it('works from N·m: 400 N·m at 4,000 rpm is 167.6 kW, 224.7 hp, 227.8 PS', () => {
		const r = run({ torqueUnit: 'nm', torqueNm: '400', rpm: '4000' });
		expect(r.secondaryMetrics?.[0].value).toBe('224.7 hp');
		expect(r.secondaryMetrics?.[1].value).toBe('227.8 PS');
		expect(r.secondaryMetrics?.[2].value).toBe('167.6 kW');
		expect(r.secondaryMetrics?.[3].value).toBe('295.0 lb·ft');
	});

	it('shows metric horsepower on request', () => {
		expect(run({ outUnit: 'ps' }).primaryResult).toBe('289.6 PS');
	});

	it('returns a dash for zero torque or a zero engine speed', () => {
		expect(run({ torqueLbft: '0' }).primaryResult).toBe('—');
		expect(run({ rpm: '0' }).primaryResult).toBe('—');
	});
});
