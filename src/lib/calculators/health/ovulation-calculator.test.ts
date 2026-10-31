import { describe, expect, it } from 'vitest';
import calc from './ovulation-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (over: Record<string, string>, label: string) =>
	run(over).secondaryMetrics?.find((m) => m.label === label)?.value;

describe('ovulation calculator', () => {
	it('matches the worked example', () => {
		const over = { lmp: '2026-10-01', cycle: '28', period: '5' };
		expect(run(over).primaryResult).toBe('Thursday, October 15, 2026');
		expect(metric(over, 'Next period starts')).toBe('Oct 29, 2026');
		expect(metric(over, 'Next period ends')).toBe('Nov 2, 2026');
		expect(metric(over, 'Fertile window')).toBe('Oct 10 – Oct 16, 2026');
	});

	it('lists the next three cycles', () => {
		const rows = run({ lmp: '2026-10-01', cycle: '28', period: '5' }).table?.rows ?? [];
		expect(rows).toHaveLength(3);
		expect(rows[1]).toEqual({
			cycle: 'Cycle 2',
			period: 'Nov 26 – Nov 30, 2026',
			ovulation: 'Nov 12, 2026',
			window: 'Nov 7 – Nov 13, 2026'
		});
		expect(rows[2].ovulation).toBe('Dec 10, 2026');
		expect(rows[2].window).toBe('Dec 5 – Dec 11, 2026');
	});

	it('uses the cycle length: a 35-day cycle puts ovulation on 22 October', () => {
		expect(run({ lmp: '2026-10-01', cycle: '35', period: '5' }).primaryResult).toBe('Thursday, October 22, 2026');
		expect(metric({ lmp: '2026-10-01', cycle: '35', period: '5' }, 'Ovulation day of cycle')).toBe('Day 22');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ lmp: '' }).primaryResult).toBe('—');
		expect(run({ lmp: '2026-10-01', cycle: '19' }).primaryResult).toBe('—');
		expect(run({ lmp: '2026-10-01', period: '0' }).primaryResult).toBe('—');
		expect(run({ lmp: '2026-13-01' }).primaryResult).toBe('—');
	});
});
