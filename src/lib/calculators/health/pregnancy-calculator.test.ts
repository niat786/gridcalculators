import { describe, expect, it } from 'vitest';
import calc from './pregnancy-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (over: Record<string, string>, label: string) =>
	run(over).secondaryMetrics?.find((m) => m.label === label)?.value;

const row = (over: Record<string, string>, milestone: string) =>
	run(over).table?.rows.find((r) => r.milestone === milestone);

describe('pregnancy calculator', () => {
	it('matches the worked example due date', () => {
		expect(run({ lmp: '2026-01-10', cycle: '28', on: '2026-05-01' }).primaryResult).toBe('Saturday, October 17, 2026');
	});

	it('shifts the due date for a 35-day cycle', () => {
		expect(run({ lmp: '2026-01-10', cycle: '35', on: '2026-05-01' }).primaryResult).toBe('Saturday, October 24, 2026');
	});

	it('gives weeks and days, trimester and days to go', () => {
		const over = { lmp: '2026-01-10', cycle: '28', on: '2026-05-01' };
		expect(metric(over, 'How far along')).toBe('15 weeks, 6 days');
		expect(metric(over, 'Trimester')).toBe('Second trimester');
		expect(metric(over, 'Days to go')).toBe('169 days');
	});

	it('dates the milestones from the dating start', () => {
		const over = { lmp: '2026-01-10', cycle: '28', on: '2026-05-01' };
		expect(row(over, 'Anatomy scan')?.date).toBe('Sat, May 30, 2026');
		expect(row(over, 'Viability')?.date).toBe('Sat, Jun 27, 2026');
		expect(row(over, 'End of first trimester')?.date).toBe('Fri, Apr 17, 2026');
		expect(row(over, 'Due date')?.date).toBe('Sat, Oct 17, 2026');
		expect(row(over, 'End of first trimester')?.status).toBe('Reached');
		expect(row(over, 'Viability')?.status).toBe('Upcoming');
	});

	it('says so before the dating start', () => {
		expect(metric({ lmp: '2026-01-10', on: '2026-01-01' }, 'How far along')).toBe('Not started yet');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ lmp: '' }).primaryResult).toBe('—');
		expect(run({ lmp: '2026-01-10', cycle: '19' }).primaryResult).toBe('—');
		expect(run({ lmp: '2026-01-10', on: 'abc' }).primaryResult).toBe('—');
	});
});
