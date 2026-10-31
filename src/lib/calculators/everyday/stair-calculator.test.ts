import { describe, expect, it } from 'vitest';
import calc from './stair-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('stair calculator', () => {
	it('matches the worked example: 108 in rise gives 14 risers of 7.71 in', () => {
		const r = run();
		expect(r.primaryResult).toBe('14 risers');
		expect(metric(r, 'Actual riser height')).toBe('7.71 in');
		expect(metric(r, 'Number of treads')).toBe('13');
		expect(metric(r, 'Total run')).toBe('130 in');
		expect(metric(r, 'Stringer length')).toBe('169.01 in');
		expect(metric(r, 'Stair angle')).toBe('39.7°');
		expect(metric(r, 'Code check')).toBe('Within IRC R311.7.5');
	});

	it('uses a 100 in rise with a 7 in maximum riser: 15 risers, 14 treads', () => {
		// 100 ÷ 7 = 14.29, rounded up to 15 risers. Riser 6.67 in, run 14 × 10 = 140 in.
		const r = run({ totalIn: '100', riserIn: '7', treadIn: '10' });
		expect(r.primaryResult).toBe('15 risers');
		expect(metric(r, 'Actual riser height')).toBe('6.67 in');
		expect(metric(r, 'Total run')).toBe('140 in');
		expect(metric(r, 'Stringer length')).toBe('172.05 in');
	});

	it('works in centimetres: 274 cm with a 20 cm riser gives 14 risers', () => {
		// 274 ÷ 20 = 13.7, so 14 risers. Actual riser 274 ÷ 14 = 19.57 cm. 13 treads of 25.4 cm.
		const r = run({ unit: 'cm', totalCm: '274', riserCm: '20', treadCm: '25.4' });
		expect(r.primaryResult).toBe('14 risers');
		expect(metric(r, 'Actual riser height')).toBe('19.57 cm');
		expect(metric(r, 'Total run')).toBe('330.2 cm');
		expect(metric(r, 'Code check')).toBe('Within IRC R311.7.5');
	});

	it('flags a riser above 7¾ in', () => {
		// 108 ÷ 8.5 = 12.7, so 13 risers of 8.31 in: too tall
		const r = run({ riserIn: '8.5' });
		expect(r.primaryResult).toBe('13 risers');
		expect(metric(r, 'Code check')).toBe('Outside IRC R311.7.5');
		expect(r.summary).toContain('over 7¾ in');
	});

	it('flags a tread under 10 in', () => {
		const r = run({ treadIn: '9' });
		expect(metric(r, 'Code check')).toBe('Outside IRC R311.7.5');
		expect(r.summary).toContain('under 10 in');
	});

	it('returns a dash when the rise fits in a single riser', () => {
		expect(run({ totalIn: '6' }).primaryResult).toBe('—');
	});

	it('returns a dash for a blank or zero rise', () => {
		expect(run({ totalIn: '' }).primaryResult).toBe('—');
		expect(run({ totalIn: '0' }).primaryResult).toBe('—');
	});
});
