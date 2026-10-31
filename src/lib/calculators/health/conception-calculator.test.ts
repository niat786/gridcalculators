import { describe, expect, it } from 'vitest';
import calc from './conception-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('conception calculator', () => {
	it('works back from a due date of 1 July 2027 (266 days)', () => {
		const r = run({ mode: 'due', due: '2027-07-01' });
		expect(r.primaryResult).toBe('Thursday, October 8, 2026');
		expect(metric(r, 'Likely window')).toBe('Oct 6 – Oct 10, 2026');
	});

	it('uses the last period: 1 October 2026 with a 28-day cycle gives 15 October', () => {
		const r = run({ mode: 'lmp', lmp: '2026-10-01', cycle: '28' });
		expect(r.primaryResult).toBe('Thursday, October 15, 2026');
		expect(metric(r, 'Likely window')).toBe('Oct 10 – Oct 16, 2026');
		expect(metric(r, 'Due date for this timing')).toBe('Jul 8, 2027');
	});

	it('moves conception later for a 35-day cycle: 22 October', () => {
		const r = run({ mode: 'lmp', lmp: '2026-10-01', cycle: '35' });
		expect(r.primaryResult).toBe('Thursday, October 22, 2026');
		expect(metric(r, 'Likely window')).toBe('Oct 17 – Oct 23, 2026');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ mode: 'due', due: '' }).primaryResult).toBe('—');
		expect(run({ mode: 'lmp', lmp: '2026-10-01', cycle: '19' }).primaryResult).toBe('—');
		expect(run({ mode: 'lmp', lmp: '2026-13-01', cycle: '28' }).primaryResult).toBe('—');
	});
});
