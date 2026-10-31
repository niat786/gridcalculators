import { describe, expect, it } from 'vitest';
import calc from './pace-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (over: Record<string, string>, label: string) =>
	run(over).secondaryMetrics?.find((m) => m.label === label)?.value;

describe('pace calculator', () => {
	it('finds pace from 10 km in 50 minutes (the worked example)', () => {
		const over = { mode: 'pace', unit: 'km', distKm: '10', time: '0:50:0' };
		expect(run(over).primaryResult).toBe('5:00 per km');
		expect(metric(over, 'Pace per mile')).toBe('8:03 per mi');
		expect(metric(over, 'Speed')).toBe('12.00 km/h');
		expect(metric(over, 'Speed (mph)')).toBe('7.46 mph');
	});

	it('finds pace in miles and converts it to km', () => {
		const over = { mode: 'pace', unit: 'mi', distMi: '10', time: '0:50:0' };
		expect(run(over).primaryResult).toBe('5:00 per mi');
		expect(metric(over, 'Pace per km')).toBe('3:06 per km');
		expect(metric(over, 'Speed')).toBe('19.31 km/h');
	});

	it('finds a marathon pace from 26.2 miles in 4 hours', () => {
		const over = { mode: 'pace', unit: 'mi', distMi: '26.2', time: '4:0:0' };
		expect(run(over).primaryResult).toBe('9:10 per mi');
		expect(metric(over, 'Pace per km')).toBe('5:42 per km');
		expect(metric(over, 'Speed (mph)')).toBe('6.55 mph');
	});

	it('finds finish time from 10 km at 5:00 per km', () => {
		expect(run({ mode: 'time', unit: 'km', distKm: '10', pace: '5:0' }).primaryResult).toBe('50:00');
	});

	it('finds distance from 50 minutes at 5:00 per km', () => {
		expect(run({ mode: 'distance', unit: 'km', time: '0:50:0', pace: '5:0' }).primaryResult).toBe('10 km');
	});

	it('finds distance in miles from 50 minutes at 8:00 per mile', () => {
		expect(run({ mode: 'distance', unit: 'mi', time: '0:50:0', pace: '8:0' }).primaryResult).toBe('6.25 mi');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ mode: 'pace', distKm: '0', time: '0:50:0' }).primaryResult).toBe('—');
		expect(run({ mode: 'pace', distKm: '10', time: '0:0:0' }).primaryResult).toBe('—');
		expect(run({ mode: 'time', distKm: '10', pace: '0:0' }).primaryResult).toBe('—');
		expect(run({ mode: 'distance', time: '0:50:0', pace: 'abc' }).primaryResult).toBe('—');
	});
});
