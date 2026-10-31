import { describe, expect, it } from 'vitest';
import calc from './period-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('period calculator', () => {
	const over = { lmp: '2026-10-01', cycle: '28', period: '5', on: '2026-10-01' };

	it('matches the worked example: next period 29 October 2026, ovulation 15 October', () => {
		const r = run(over);
		expect(r.primaryResult).toBe('Thursday, October 29, 2026');
		expect(metric(r, 'Period ends')).toBe('Nov 2, 2026');
		expect(metric(r, 'Days until it starts')).toBe('28 days');
		expect(metric(r, 'Estimated ovulation')).toBe('Oct 15, 2026');
	});

	it('lists six periods with start, end and ovulation', () => {
		const rows = run(over).table?.rows ?? [];
		expect(rows).toHaveLength(6);
		expect(rows[1]).toEqual({
			period: 'Period 2',
			starts: 'Nov 26, 2026',
			ends: 'Nov 30, 2026',
			ovulation: 'Nov 12, 2026'
		});
		expect(rows[2].starts).toBe('Dec 24, 2026');
		expect(rows[5]).toEqual({ period: 'Period 6', starts: 'Mar 18, 2027', ends: 'Mar 22, 2027', ovulation: 'Mar 4, 2027' });
	});

	it('uses a 32-day cycle and a 7-day period', () => {
		const r = run({ lmp: '2026-10-01', cycle: '32', period: '7', on: '2026-10-01' });
		expect(r.primaryResult).toBe('Monday, November 2, 2026');
		expect(metric(r, 'Period ends')).toBe('Nov 8, 2026');
		expect(metric(r, 'Estimated ovulation')).toBe('Oct 19, 2026');
	});

	it('starts from the first period on or after the calculate-from date', () => {
		// 2 November is past the 29 October period, so the next one is 26 November.
		const r = run({ ...over, on: '2026-11-02' });
		expect(r.primaryResult).toBe('Thursday, November 26, 2026');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ ...over, lmp: '' }).primaryResult).toBe('—');
		expect(run({ ...over, cycle: '19' }).primaryResult).toBe('—');
		expect(run({ ...over, period: '1' }).primaryResult).toBe('—');
		expect(run({ ...over, on: '2026-02-30' }).primaryResult).toBe('—');
	});
});
