import { describe, expect, it } from 'vitest';
import calc from './mileage-calculator.calc';
import { defaultRaw, encodeRows, toValues } from '../../components/calculator/state';
import type { RowsInput, RowValue } from '../types';

const trips = calc.inputs.find((i) => i.id === 'trips') as RowsInput;

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('mileage calculator', () => {
	it('matches the worked example: 1,250 miles at $0.725 is $906.25', () => {
		const r = run();
		expect(r.primaryResult).toBe('$906.25');
		expect(metric(r, 'Total miles')).toBe('1,250');
		expect(metric(r, 'Rate per mile')).toBe('$0.725');
		expect(metric(r, 'Trips logged')).toBe('Not used');
	});

	it('uses the 70-cent rate: 1,000 miles is $700.00', () => {
		expect(run({ miles: '1000', rate: '0.70' }).primaryResult).toBe('$700.00');
	});

	it('sums a trip log: 12.5 + 40 + 7.3 = 59.8 miles, $41.86 at $0.70', () => {
		const r = run({ mode: 'trips', rate: '0.70' });
		expect(r.primaryResult).toBe('$41.86');
		expect(metric(r, 'Total miles')).toBe('59.8');
		expect(metric(r, 'Trips logged')).toBe('3 trips');
		expect(r.table?.rows[1].amount).toBe('$28.00');
	});

	it('counts a single logged trip: 100 miles at $0.725 is $72.50', () => {
		const list: RowValue[] = [{ date: '2026-04-01', purpose: 'Site survey', miles: 100 }];
		const r = run({ mode: 'trips', trips: encodeRows(trips, list), rate: '0.725' });
		expect(r.primaryResult).toBe('$72.50');
		expect(metric(r, 'Trips logged')).toBe('1 trip');
	});

	it('returns a dash when the total miles are blank', () => {
		expect(run({ miles: '' }).primaryResult).toBe('—');
	});

	it('returns a dash when a trip has no miles', () => {
		const list: RowValue[] = [{ date: '2026-04-01', purpose: 'Visit', miles: '' as unknown as number }];
		const r = run({ mode: 'trips', trips: encodeRows(trips, list) });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toContain('trip 1');
	});

	it('returns a dash for a negative rate', () => {
		expect(run({ rate: '-0.5' }).primaryResult).toBe('—');
	});
});
