import { beforeEach, describe, expect, it } from 'vitest';
import calc from './nsc-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) => calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-10-28'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
beforeEach(() => setCurrency('INR'));

describe('NSC calculator', () => {
	it('₹1,00,000 at 7.7% for 5 years is about ₹1,44,903 (inkl.com / PTI-style published figure)', () => {
		// 100000 x 1.077^5 = 144,903.38 (published reports show ₹1,44,903 and interest ₹44,903)
		const r = run({ amount: '100000', rate: '7.7' });
		expect(r.primaryResult).toBe('₹1,44,903.38');
		expect(metric(r, 'Interest earned')).toBe('₹44,903.38');
		expect(r.table!.rows.map((x) => x.value)).toEqual(['₹1,07,700.00', '₹1,15,992.90', '₹1,24,924.35', '₹1,34,543.53', '₹1,44,903.38']);
	});
	it('minimum ₹1,000 and a larger amount', () => {
		expect(run({ amount: '1000' }).primaryResult).toBe('₹1,449.03');
		expect(run({ amount: '500000' }).primaryResult).toBe('₹7,24,516.90');
	});
	it('another rate', () => {
		expect(run({ amount: '100000', rate: '7' }).primaryResult).toBe('₹1,40,255.17');
		expect(run({ amount: '100000', rate: '0' }).primaryResult).toBe('₹1,00,000.00');
	});
	it('large amount', () => {
		expect(run({ amount: '100000000000', rate: '0' }).primaryResult).toBe('₹1,00,00,00,00,000.00');
	});
	it('rejects invalid input', () => {
		expect(run({ amount: '999' }).primaryResult).toBe('—');
		expect(run({ amount: '1050' }).primaryResult).toBe('—');
		expect(run({ amount: '' }).primaryResult).toBe('—');
		expect(run({ rate: '-1' }).primaryResult).toBe('—');
		expect(run({ rate: 'x' }).primaryResult).toBe('—');
	});
});
