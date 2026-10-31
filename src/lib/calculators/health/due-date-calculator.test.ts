import { describe, expect, it } from 'vitest';
import calc from './due-date-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (over: Record<string, string>, label: string) =>
	run(over).secondaryMetrics?.find((m) => m.label === label)?.value;

describe('due date calculator', () => {
	it('matches the worked example from the last period', () => {
		expect(run({ method: 'lmp', lmp: '2026-01-10', cycle: '28', on: '2026-03-01' }).primaryResult).toBe('Saturday, October 17, 2026');
	});

	it('adds the cycle difference from 28 days', () => {
		// 35-day cycle: 280 + 7 days after 10 January 2026
		expect(run({ method: 'lmp', lmp: '2026-01-10', cycle: '35' }).primaryResult).toBe('Saturday, October 24, 2026');
	});

	it('adds 266 days to a conception date', () => {
		expect(run({ method: 'conception', conception: '2026-01-24' }).primaryResult).toBe('Saturday, October 17, 2026');
	});

	it('adds 263 days for a day-3 embryo and 261 days for a day-5 embryo', () => {
		expect(run({ method: 'ivf', transfer: '2026-01-27', embryo: '3' }).primaryResult).toBe('Saturday, October 17, 2026');
		expect(run({ method: 'ivf', transfer: '2026-01-27', embryo: '5' }).primaryResult).toBe('Thursday, October 15, 2026');
	});

	it('gives gestational age, trimester and days to go on the chosen date', () => {
		const over = { method: 'lmp', lmp: '2026-01-10', cycle: '28', on: '2026-03-01' };
		expect(metric(over, 'Gestational age')).toBe('7 weeks, 1 day');
		expect(metric(over, 'Trimester')).toBe('First trimester');
		expect(metric(over, 'Days to go')).toBe('230 days');
	});

	it('reports a past due date and the second trimester', () => {
		expect(metric({ method: 'lmp', lmp: '2026-01-10', on: '2026-10-20' }, 'Days to go')).toBe('Past due by 3 days');
		expect(metric({ method: 'lmp', lmp: '2026-01-10', on: '2026-05-01' }, 'Trimester')).toBe('Second trimester');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ method: 'lmp', lmp: '' }).primaryResult).toBe('—');
		expect(run({ method: 'lmp', lmp: '2026-01-10', cycle: '50' }).primaryResult).toBe('—');
		expect(run({ method: 'conception', conception: '2026-02-30' }).primaryResult).toBe('—');
		expect(run({ method: 'lmp', lmp: '2026-01-10', on: 'abc' }).primaryResult).toBe('—');
	});
});
