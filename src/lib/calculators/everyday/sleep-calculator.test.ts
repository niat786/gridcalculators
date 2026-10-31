import { describe, expect, it } from 'vitest';
import calc, { clock12 } from './sleep-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

/** The bedtime or wake-up column of the options table, in row order (6, 5, 4 cycles). */
const column = (r: ReturnType<typeof run>) => r.table?.rows.map((row) => row.time);

describe('sleep calculator', () => {
	it('wake at 7:00 AM: bedtimes 9:45 PM, 11:15 PM and 12:45 AM', () => {
		const r = run({ mode: 'wake', wake: '07:00' });
		expect(r.primaryResult).toBe('11:15 PM');
		expect(column(r)).toEqual(['9:45 PM', '11:15 PM', '12:45 AM']);
		expect(r.table?.rows.map((row) => row.hours)).toEqual(['9 hours', '7.5 hours', '6 hours']);
	});

	it('wake at 6:30 AM crosses midnight for the 4-cycle option', () => {
		expect(column(run({ mode: 'wake', wake: '06:30' }))).toEqual(['9:15 PM', '10:45 PM', '12:15 AM']);
	});

	it('bedtime 11:00 PM: wake-up times 8:15 AM, 6:45 AM and 5:15 AM', () => {
		const r = run({ mode: 'bed', bed: '23:00' });
		expect(r.primaryResult).toBe('6:45 AM');
		expect(column(r)).toEqual(['8:15 AM', '6:45 AM', '5:15 AM']);
	});

	it('bedtime 10:00 PM: wake-up times wrap past midnight into the morning', () => {
		expect(column(run({ mode: 'bed', bed: '22:00' }))).toEqual(['7:15 AM', '5:45 AM', '4:15 AM']);
	});

	it('returns a dash for an invalid time', () => {
		expect(run({ mode: 'wake', wake: '' }).primaryResult).toBe('—');
		expect(run({ mode: 'bed', bed: 'xx' }).primaryResult).toBe('—');
	});

	it('formats times as h:mm AM/PM', () => {
		expect(clock12(0)).toBe('12:00 AM');
		expect(clock12(12 * 60)).toBe('12:00 PM');
		expect(clock12(9 * 60 + 5)).toBe('9:05 AM');
	});
});
