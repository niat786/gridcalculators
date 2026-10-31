import { describe, expect, it } from 'vitest';
import calc, { isLeapYear, isoWeek, zellerWeekday } from './day-of-the-week-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

describe('day of the week calculator', () => {
	it('finds Wednesday, day 301, ISO week 44 for 28 Oct 2026', () => {
		const r = run({ date: '2026-10-28' });
		expect(r.primaryResult).toBe('Wednesday');
		expect(metric(r, 'Day of the year')).toBe('301 of 365');
		expect(metric(r, 'ISO week number')).toBe('Week 44');
		expect(metric(r, 'Quarter')).toBe('Q4 (October to December)');
		expect(metric(r, 'Leap year')).toBe('No');
	});

	it('handles a leap day and a year that starts on a Saturday', () => {
		const leap = run({ date: '2024-02-29' });
		expect(leap.primaryResult).toBe('Thursday');
		expect(metric(leap, 'Day of the year')).toBe('60 of 366');
		expect(metric(leap, 'ISO week number')).toBe('Week 9');
		expect(metric(leap, 'Leap year')).toBe('Yes');

		const newYear = run({ date: '2000-01-01' });
		expect(newYear.primaryResult).toBe('Saturday');
		// 1 Jan 2000 falls in week 52 of ISO year 1999
		expect(metric(newYear, 'ISO week number')).toBe('Week 52');
	});

	it('finds the Moon-landing day was a Sunday', () => {
		expect(run({ date: '1969-07-20' }).primaryResult).toBe('Sunday');
	});

	it('uses the default date (15 Jan 2026 is a Thursday)', () => {
		expect(run({}).primaryResult).toBe('Thursday');
	});

	it('returns a dash for an invalid date', () => {
		expect(run({ date: '2026-02-30' }).primaryResult).toBe('—');
		expect(run({ date: 'abc' }).primaryResult).toBe('—');
	});

	it('Zeller’s congruence agrees with the JavaScript calendar for every day 1800–2200', () => {
		for (let y = 1800; y <= 2200; y++) {
			for (let m = 1; m <= 12; m++) {
				const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
				for (let d = 1; d <= days; d++) {
					const expected = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
					if (zellerWeekday(y, m, d) !== expected) {
						throw new Error(`Zeller mismatch on ${y}-${m}-${d}`);
					}
				}
			}
		}
	});

	it('Zeller’s congruence gives the known weekdays', () => {
		expect(NAMES[zellerWeekday(2026, 10, 28)]).toBe('Wednesday');
		expect(NAMES[zellerWeekday(2000, 1, 1)]).toBe('Saturday');
		expect(NAMES[zellerWeekday(1969, 7, 20)]).toBe('Sunday');
	});

	it('applies the leap-year rule, including century years', () => {
		expect(isLeapYear(2024)).toBe(true);
		expect(isLeapYear(2000)).toBe(true);
		expect(isLeapYear(1900)).toBe(false);
		expect(isLeapYear(2026)).toBe(false);
	});

	it('ISO week handles dates that belong to the neighbouring ISO year', () => {
		// 2021-01-01 is a Friday and belongs to week 53 of ISO year 2020
		expect(isoWeek(2021, 1, 1, zellerWeekday(2021, 1, 1))).toBe(53);
	});
});
