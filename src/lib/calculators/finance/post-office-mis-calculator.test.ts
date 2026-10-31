import { beforeEach, describe, expect, it } from 'vitest';
import calc from './post-office-mis-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) => calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-10-28'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
beforeEach(() => setCurrency('INR'));

describe('Post Office MIS calculator', () => {
	it('₹9 lakh single at 7.4% pays ₹5,550 a month (the widely published figure)', () => {
		const r = run({ type: 'single', amount: '900000', rate: '7.4' });
		expect(r.primaryResult).toBe('₹5,550.00');
		expect(metric(r, 'Interest each year')).toBe('₹66,600.00');
		expect(metric(r, 'Interest over 5 years')).toBe('₹3,33,000.00');
		expect(metric(r, 'Total received after 5 years')).toBe('₹12,33,000.00');
	});
	it('₹15 lakh joint at 7.4% pays ₹9,250 a month', () => {
		const r = run({ type: 'joint', amount: '1500000', rate: '7.4' });
		expect(r.primaryResult).toBe('₹9,250.00');
		expect(metric(r, 'Interest over 5 years')).toBe('₹5,55,000.00');
	});
	it('₹1 lakh at 7.4% and a different rate', () => {
		expect(run({ amount: '100000', rate: '7.4' }).primaryResult).toBe('₹616.67');
		expect(run({ amount: '600000', rate: '6' }).primaryResult).toBe('₹3,000.00');
	});
	it('limits: single stops at ₹9 lakh, joint at ₹15 lakh', () => {
		expect(run({ type: 'single', amount: '901000' }).primaryResult).toBe('—');
		expect(run({ type: 'joint', amount: '901000' }).primaryResult).not.toBe('—');
		expect(run({ type: 'joint', amount: '1501000' }).primaryResult).toBe('—');
	});
	it('rejects invalid input', () => {
		expect(run({ amount: '999' }).primaryResult).toBe('—');
		expect(run({ amount: '1500' }).primaryResult).toBe('—');
		expect(run({ amount: '' }).primaryResult).toBe('—');
		expect(run({ rate: '-1' }).primaryResult).toBe('—');
	});
});
