import { describe, expect, it } from 'vitest';
import calc, { hms } from './speed-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('speed calculator', () => {
	it('matches the worked example: 150 km in 2:30:00 is 60 km/h', () => {
		const r = run();
		expect(r.primaryResult).toBe('60 km/h');
		expect(metric(r, 'Speed in mph')).toBe('37.28');
		expect(metric(r, 'Speed in m/s')).toBe('16.67');
		expect(metric(r, 'Speed in knots')).toBe('32.4');
		expect(metric(r, 'Distance')).toBe('150 km');
		expect(metric(r, 'Time')).toBe('2:30:00');
	});

	it('solves distance: 60 km/h for 2:30:00 is 150 km', () => {
		expect(run({ solve: 'distance', speed: '60', speedUnit: 'km/h', time: '2:30:0', distUnit: 'km' }).primaryResult).toBe(
			'150 km'
		);
	});

	it('solves time: 100 mi at 50 mph is 2:00:00', () => {
		const r = run({ solve: 'time', distance: '100', distUnit: 'mi', speed: '50', speedUnit: 'mph' });
		expect(r.primaryResult).toBe('2:00:00');
		expect(metric(r, 'Speed in km/h')).toBe('80.47');
	});

	it('solves speed in mph: 100 mi in 2 hours is 50 mph', () => {
		const r = run({ solve: 'speed', distance: '100', distUnit: 'mi', time: '2:0:0', speedUnit: 'mph' });
		expect(r.primaryResult).toBe('50 mph');
		expect(metric(r, 'Speed in m/s')).toBe('22.35');
	});

	it('solves speed in m/s: 1 km in 4 minutes 10 seconds', () => {
		// 1000 m ÷ 250 s = 4 m/s
		const r = run({ solve: 'speed', distance: '1', distUnit: 'km', time: '0:4:10', speedUnit: 'm/s' });
		expect(r.primaryResult).toBe('4 m/s');
	});

	it('returns a dash when solving speed with a zero time', () => {
		expect(run({ solve: 'speed', distance: '150', time: '0:0:0' }).primaryResult).toBe('—');
	});

	it('returns a dash when solving time with a zero speed', () => {
		expect(run({ solve: 'time', distance: '100', speed: '0' }).primaryResult).toBe('—');
	});

	it('formats seconds as h:mm:ss', () => {
		expect(hms(9000)).toBe('2:30:00');
		expect(hms(59.6)).toBe('0:01:00');
	});
});
