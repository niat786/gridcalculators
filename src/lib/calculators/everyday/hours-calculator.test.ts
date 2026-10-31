import { describe, expect, it } from 'vitest';
import calc, { clock12, hoursAndMinutes } from './hours-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('hours calculator', () => {
	it('uses the default 9:00 to 5:30 with a 30-minute break = 8:00', () => {
		const r = run({});
		expect(r.primaryResult).toBe('8:00');
		expect(metric(r, 'Decimal hours')).toBe('8.00');
		expect(metric(r, 'Total minutes')).toBe('480');
		expect(metric(r, 'Time before break')).toBe('8:30');
	});

	it('handles an overnight shift: 10:00 PM to 6:30 AM with a 45-minute break = 7:45', () => {
		const r = run({ start: '22:00', end: '06:30', breakMins: '45' });
		expect(r.primaryResult).toBe('7:45');
		expect(metric(r, 'Decimal hours')).toBe('7.75');
		expect(metric(r, 'Total minutes')).toBe('465');
		expect(r.summary).toContain('past midnight');
	});

	it('handles a day shift with no break: 9:00 to 12:15 = 3:15', () => {
		const r = run({ start: '09:00', end: '12:15', breakMins: '0' });
		expect(r.primaryResult).toBe('3:15');
		expect(metric(r, 'Decimal hours')).toBe('3.25');
	});

	it('counts zero hours when the start and end times match', () => {
		expect(run({ start: '08:00', end: '08:00', breakMins: '0' }).primaryResult).toBe('0:00');
	});

	it('returns a dash for a negative or non-numeric break', () => {
		expect(run({ breakMins: '-1' }).primaryResult).toBe('—');
		expect(run({ breakMins: 'abc' }).primaryResult).toBe('—');
	});

	it('returns a dash when the break is longer than the shift', () => {
		expect(run({ start: '09:00', end: '09:30', breakMins: '60' }).primaryResult).toBe('—');
	});

	it('returns a dash for an invalid time', () => {
		expect(run({ start: '' }).primaryResult).toBe('—');
	});

	it('formats minutes as 12-hour clock times and h:mm', () => {
		expect(clock12(0)).toBe('12:00 AM');
		expect(clock12(13 * 60 + 5)).toBe('1:05 PM');
		expect(hoursAndMinutes(465)).toBe('7:45');
	});
});
