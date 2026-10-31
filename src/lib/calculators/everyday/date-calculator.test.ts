import { describe, expect, it } from 'vitest';
import calc, { addBusinessDays, addMonths, parseISODate } from './date-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('date calculator', () => {
	it('matches the worked example: 31 Jan 2026 + 1 month + 10 days', () => {
		const r = run({ start: '2026-01-31', op: 'plus', months: '1', days: '10' });
		expect(r.primaryResult).toBe('Tuesday, March 10, 2026');
		expect(metric(r, 'ISO date')).toBe('2026-03-10');
		expect(metric(r, 'Days from start')).toBe('+38');
		expect(metric(r, 'Weeks and days apart')).toBe('5 weeks and 3 days');
	});

	it('clamps the day to the end of a shorter month (leap year)', () => {
		expect(run({ start: '2024-01-31', months: '1', days: '0' }).primaryResult).toBe('Thursday, February 29, 2024');
	});

	it('clamps when subtracting a month from the 31st', () => {
		expect(run({ start: '2026-03-31', op: 'minus', months: '1', days: '0' }).primaryResult).toBe(
			'Saturday, February 28, 2026'
		);
	});

	it('subtracts weeks and days', () => {
		// 10 March 2026 minus 2 weeks and 3 days = 17 days earlier
		const r = run({ start: '2026-03-10', op: 'minus', months: '0', weeks: '2', days: '3' });
		expect(r.primaryResult).toBe('Saturday, February 21, 2026');
		expect(metric(r, 'Days from start')).toBe('−17');
	});

	it('counts business days, skipping the weekend', () => {
		// Friday 30 Oct 2026: Mon 2 (1), Tue 3 (2), Wed 4 (3)
		const r = run({ mode: 'business', start: '2026-10-30', businessDays: '3' });
		expect(r.primaryResult).toBe('Wednesday, November 4, 2026');
		expect(metric(r, 'Calendar days from start')).toBe('+5');
		expect(metric(r, 'Weekend days skipped')).toBe('2');
	});

	it('does not count a weekend start day as a business day', () => {
		// Saturday 31 Oct 2026 + 1 business day = Monday 2 Nov 2026
		expect(run({ mode: 'business', start: '2026-10-31', businessDays: '1' }).primaryResult).toBe(
			'Monday, November 2, 2026'
		);
	});

	it('uses the default inputs (1 month after 15 Jan 2026)', () => {
		expect(run({}).primaryResult).toBe('Sunday, February 15, 2026');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ start: '2026-02-30' }).primaryResult).toBe('—');
		expect(run({ months: '-1' }).primaryResult).toBe('—');
		expect(run({ mode: 'business', businessDays: '1e309' }).primaryResult).toBe('—');
	});

	it('helpers clamp and skip weekends', () => {
		expect(addMonths(parseISODate('2023-01-31')!, 1).toISOString().slice(0, 10)).toBe('2023-02-28');
		expect(addBusinessDays(parseISODate('2026-10-30')!, 3).toISOString().slice(0, 10)).toBe('2026-11-04');
	});
});
