import { describe, expect, it } from 'vitest';
import calc, { monthsAndDays, weekdaysIn } from './day-counter.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('day counter', () => {
	it('counts 1 Jan to 15 Mar 2026 (end day not included)', () => {
		const r = run({ start: '2026-01-01', end: '2026-03-15', includeEnd: false });
		expect(r.primaryResult).toBe('73 days');
		expect(metric(r, 'Weeks and days')).toBe('10 weeks and 3 days');
		expect(metric(r, 'Months and days (calendar)')).toBe('2 months and 14 days');
		expect(metric(r, 'Business days (Mon–Fri)')).toBe('52');
		expect(metric(r, 'Hours')).toBe('1,752');
	});

	it('adds one day when the end day is included', () => {
		const r = run({ start: '2026-01-01', end: '2026-03-15', includeEnd: true });
		expect(r.primaryResult).toBe('74 days');
		expect(metric(r, 'Weeks and days')).toBe('10 weeks and 4 days');
		expect(metric(r, 'Months and days (calendar)')).toBe('2 months and 15 days');
		expect(metric(r, 'Hours')).toBe('1,776');
	});

	it('uses the default dates (1 Jan to today, 15 Jan 2026)', () => {
		const r = run({});
		expect(r.primaryResult).toBe('14 days');
		expect(metric(r, 'Weeks and days')).toBe('2 weeks and 0 days');
		expect(metric(r, 'Business days (Mon–Fri)')).toBe('10');
	});

	it('counts backwards when the end date is earlier', () => {
		const r = run({ start: '2026-03-15', end: '2026-01-01' });
		expect(r.primaryResult).toBe('73 days');
		expect(r.summary).toContain('backwards');
	});

	it('returns a dash for an invalid date', () => {
		expect(run({ start: '' }).primaryResult).toBe('—');
		expect(run({ end: '2026-13-01' }).primaryResult).toBe('—');
	});

	it('counts weekdays in a span without the end date', () => {
		// Thursday 1 Jan 2026 to Thursday 15 Jan: Thu, Fri, Mon-Fri, Mon-Wed = 10
		expect(weekdaysIn(new Date(Date.UTC(2026, 0, 1)), 14)).toBe(10);
	});

	it('splits calendar months and days', () => {
		const from = new Date(Date.UTC(2026, 0, 31));
		// 31 Jan + 1 month clamps to 28 Feb, so 1 March is 1 month and 1 day after 31 Jan
		expect(monthsAndDays(from, new Date(Date.UTC(2026, 2, 1)))).toEqual({ months: 1, days: 1 });
	});
});
