import { describe, expect, it } from 'vitest';
import calc from './target-heart-rate-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const zone = (r: ReturnType<typeof run>, name: string) => r.table?.rows.find((x) => x.zone === name)?.bpm;

describe('target heart rate calculator', () => {
	it('uses percent of maximum when resting heart rate is 0 (age 40)', () => {
		const r = run({ age: '40', restingHr: '0' });
		expect(r.primaryResult).toBe('180 bpm');
		expect(zone(r, 'Zone 1 (very light)')).toBe('90–108 bpm');
		expect(zone(r, 'Zone 5 (maximum)')).toBe('162–180 bpm');
	});

	it('uses the Karvonen method when resting heart rate is given (age 30, resting 60)', () => {
		const r = run({ age: '30', restingHr: '60' });
		expect(r.primaryResult).toBe('190 bpm');
		expect(zone(r, 'Zone 1 (very light)')).toBe('125–138 bpm');
		expect(zone(r, 'Zone 2 (light)')).toBe('138–151 bpm');
		expect(zone(r, 'Zone 5 (maximum)')).toBe('177–190 bpm');
	});

	it('uses the Karvonen method for age 50 with resting 70', () => {
		const r = run({ age: '50', restingHr: '70' });
		expect(r.primaryResult).toBe('170 bpm');
		expect(zone(r, 'Zone 1 (very light)')).toBe('120–130 bpm');
		expect(zone(r, 'Zone 4 (hard)')).toBe('150–160 bpm');
		expect(zone(r, 'Zone 5 (maximum)')).toBe('160–170 bpm');
	});

	it('returns a dash for an invalid age', () => {
		expect(run({ age: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash when resting heart rate is not below maximum', () => {
		expect(run({ age: '35', restingHr: '190' }).primaryResult).toBe('—');
	});
});
