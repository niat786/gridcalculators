import { beforeEach, describe, expect, it } from 'vitest';
import calc from './statutory-maternity-pay-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

beforeEach(() => setCurrency('GBP'));

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('statutory maternity pay calculator', () => {
	it('£600 AWE: 6 × 540 + 33 × 194.32 = 3,240 + 6,412.56', () => {
		const r = run({ awe: '600' });
		expect(r.primaryResult).toBe('£9,652.56');
		expect(r.table?.rows.length).toBe(39);
		expect(r.table?.rows[5]).toEqual({ week: '6', rate: '£540.00', total: '£3,240.00' });
		expect(r.table?.rows[6].rate).toBe('£194.32');
	});
	it('£200 AWE: 90% = £180 is below the flat rate for all 39 weeks = 7,020', () => {
		expect(run({ awe: '200' }).primaryResult).toBe('£7,020.00');
	});
	it('£150 AWE: 39 × 135 = 5,265', () => {
		expect(run({ awe: '150' }).primaryResult).toBe('£5,265.00');
	});
	it('£129 AWE (the lower earnings limit) qualifies: 39 × 116.10 = 4,527.90', () => {
		expect(run({ awe: '129' }).primaryResult).toBe('£4,527.90');
	});
	it('below £129 or under 26 weeks of service gets nothing', () => {
		expect(run({ awe: '128.99' }).primaryResult).toBe('£0.00');
		expect(run({ awe: '600', service: false }).primaryResult).toBe('£0.00');
	});
	it('invalid input returns —', () => {
		expect(run({ awe: '' }).primaryResult).toBe('—');
	});
});
