import { describe, expect, it } from 'vitest';
import calc from './time-card-calculator.calc';
import { defaultRaw, encodeRows, toValues } from '../../components/calculator/state';
import type { RowsInput, RowValue } from '../types';

const shifts = calc.inputs.find((i) => i.id === 'shifts') as RowsInput;
const rows = (list: RowValue[]) => encodeRows(shifts, list);

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

const day = (start: string, end: string, breakMins: number): RowValue => ({ day: 'Day', start, end, breakMins });

describe('time card calculator', () => {
	it('matches the worked example: five 9 to 5 days with a 30-minute break is 37:30 and $750.00', () => {
		const r = run();
		expect(r.primaryResult).toBe('37:30');
		expect(metric(r, 'Decimal hours')).toBe('37.50');
		expect(metric(r, 'Regular hours')).toBe('37:30');
		expect(metric(r, 'Overtime hours')).toBe('0:00');
		expect(metric(r, 'Gross pay')).toBe('$750.00');
	});

	it('pays overtime after 40 hours: five 10-hour days is 50 hours, $1,100.00 at $20', () => {
		// 40 × $20 = $800; 10 × $20 × 1.5 = $300
		const r = run({ shifts: rows(Array.from({ length: 5 }, () => day('09:00', '19:00', 0))) });
		expect(r.primaryResult).toBe('50:00');
		expect(metric(r, 'Regular hours')).toBe('40:00');
		expect(metric(r, 'Overtime hours')).toBe('10:00');
		expect(metric(r, 'Gross pay')).toBe('$1,100.00');
	});

	it('counts an overnight shift: 22:00 to 06:00 with no break is 8 hours', () => {
		const r = run({ shifts: rows([day('22:00', '06:00', 0)]), rate: '0' });
		expect(r.primaryResult).toBe('8:00');
		expect(metric(r, 'Gross pay')).toBe('Add an hourly rate');
	});

	it('works out an uneven week with a 45-minute break: 9:15 to 15:00 minus 45 min is 5:00', () => {
		// 5h45 − 45 min = 5h00
		const r = run({ shifts: rows([day('09:15', '15:00', 45), day('08:00', '12:30', 0)]) });
		expect(r.primaryResult).toBe('9:30');
		expect(metric(r, 'Decimal hours')).toBe('9.50');
	});

	it('names the row when a time is not HH:MM', () => {
		const r = run({ shifts: rows([day('09:00', '17:00', 30), { day: 'Wed', start: '9am', end: '17:00', breakMins: 30 }]) });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toContain('Row 2 (Wed)');
	});

	it('returns a dash when the break is longer than the shift', () => {
		expect(run({ shifts: rows([day('09:00', '09:30', 60)]) }).primaryResult).toBe('—');
	});

	it('returns a dash for a negative break', () => {
		expect(run({ shifts: rows([day('09:00', '17:00', -5)]) }).primaryResult).toBe('—');
	});
});
