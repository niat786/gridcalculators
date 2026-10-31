import { beforeEach, describe, expect, it } from 'vitest';
import calc from './scss-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) => calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-10-28'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
beforeEach(() => setCurrency('INR'));

describe('SCSS calculator', () => {
	it('₹30 lakh at 8.2% pays ₹61,500 a quarter (the widely published figure)', () => {
		const r = run({ amount: '3000000', rate: '8.2' });
		expect(r.primaryResult).toBe('₹61,500.00');
		expect(metric(r, 'Interest each year')).toBe('₹2,46,000.00');
		expect(metric(r, 'Interest over 5 years')).toBe('₹12,30,000.00');
		expect(metric(r, 'Total received after 5 years')).toBe('₹42,30,000.00');
	});
	it('₹10 lakh at 8.2% and ₹15 lakh at 7%', () => {
		expect(run({ amount: '1000000', rate: '8.2' }).primaryResult).toBe('₹20,500.00');
		expect(run({ amount: '1500000', rate: '7' }).primaryResult).toBe('₹26,250.00');
	});
	it('minimum ₹1,000 pays ₹20.50 a quarter', () => {
		expect(run({ amount: '1000', rate: '8.2' }).primaryResult).toBe('₹20.50');
	});
	it('limit edge: exactly ₹30 lakh is fine, ₹30,01,000 is not', () => {
		expect(run({ amount: '3000000' }).primaryResult).not.toBe('—');
		expect(run({ amount: '3001000' }).primaryResult).toBe('—');
	});
	it('rejects invalid input', () => {
		expect(run({ amount: '999' }).primaryResult).toBe('—');
		expect(run({ amount: '1500' }).primaryResult).toBe('—');
		expect(run({ amount: '' }).primaryResult).toBe('—');
		expect(run({ rate: '-2' }).primaryResult).toBe('—');
		expect(run({ rate: '0' }).primaryResult).toBe('₹0.00');
	});
});
