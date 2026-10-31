import { beforeEach, describe, expect, it } from 'vitest';
import calc, { gstSplit } from './gst-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';
import { GST_SLABS } from '../data/in-gst';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, starts: string) => r.secondaryMetrics?.find((m) => m.label.startsWith(starts))?.value;

describe('GST calculator', () => {
	beforeEach(() => setCurrency('INR'));

	it('slabs are the GST 2.0 set (no 12% or 28%)', () => {
		expect(GST_SLABS.map((s) => s.rate)).toEqual([0, 0.25, 1.5, 3, 5, 18, 40]);
	});

	it('default / worked example: add 18% to ₹10,000, within the state', () => {
		const r = run();
		expect(r.primaryResult).toBe('₹1,800.00');
		expect(metric(r, 'Price before GST')).toBe('₹10,000.00');
		expect(metric(r, 'Price with GST')).toBe('₹11,800.00');
		expect(metric(r, 'CGST')).toBe('₹900.00');
		expect(metric(r, 'SGST')).toBe('₹900.00');
	});

	it('remove 18% from ₹11,800 gives ₹10,000', () => {
		const r = run({ amount: '11800', mode: 'remove' });
		expect(r.primaryResult).toBe('₹1,800.00');
		expect(metric(r, 'Price before GST')).toBe('₹10,000.00');
	});

	it('remove 18% from ₹1,000 (÷ 1.18, not minus 18%)', () => {
		// 1000 ÷ 1.18 = 847.4576… → 847.46; GST 152.54; halves 76.27
		const r = run({ amount: '1000', mode: 'remove' });
		expect(metric(r, 'Price before GST')).toBe('₹847.46');
		expect(r.primaryResult).toBe('₹152.54');
		expect(metric(r, 'CGST')).toBe('₹76.27');
	});

	it('5% on ₹999.99 rounds to the paisa', () => {
		const r = run({ amount: '999.99', rate: '5' });
		expect(r.primaryResult).toBe('₹50.00');
		expect(metric(r, 'Price with GST')).toBe('₹1,049.99');
	});

	it('special rates: 3% gold removal and 0.25% rough diamonds split', () => {
		const g = run({ amount: '103000', rate: '3', mode: 'remove' });
		expect(g.primaryResult).toBe('₹3,000.00');
		expect(metric(g, 'Price before GST')).toBe('₹1,00,000.00');
		const d = run({ amount: '100', rate: '0.25' });
		expect(d.primaryResult).toBe('₹0.25');
		expect(metric(d, 'CGST')).toBe('₹0.13');
		expect(metric(d, 'SGST')).toBe('₹0.12');
	});

	it('inter-state shows IGST for the whole tax (40% on ₹5,000)', () => {
		const r = run({ amount: '5000', rate: '40', supply: 'inter' });
		expect(metric(r, 'IGST')).toBe('₹2,000.00');
		expect(metric(r, 'Price with GST')).toBe('₹7,000.00');
	});

	it('1.5% on ₹2,00,000 and 0% slab', () => {
		expect(run({ amount: '200000', rate: '1.5' }).primaryResult).toBe('₹3,000.00');
		expect(run({ amount: '500', rate: '0' }).primaryResult).toBe('₹0.00');
	});

	it('net + GST always equals gross, CGST + SGST equals GST', () => {
		for (const a of [0.01, 1, 99.99, 1234.56, 99999.99]) {
			for (const rate of [0.25, 1.5, 3, 5, 18, 40]) {
				for (const mode of ['add', 'remove'] as const) {
					const s = gstSplit(a, rate, mode);
					expect(s.netP + s.gstP).toBe(s.grossP);
					expect(s.cgstP + s.sgstP).toBe(s.gstP);
				}
			}
		}
	});

	it('invalid input gives a dash', () => {
		expect(run({ amount: '' }).primaryResult).toBe('—');
		expect(run({ amount: '-5' }).primaryResult).toBe('—');
		expect(run({ rate: '12' }).primaryResult).toBe('—');
		expect(run({ rate: '28' }).primaryResult).toBe('—');
	});
});
