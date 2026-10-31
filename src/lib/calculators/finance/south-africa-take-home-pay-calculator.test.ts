import { beforeEach, describe, expect, it } from 'vitest';
import calc from './south-africa-take-home-pay-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const R = (s: string) => `ZAR ${s}`;

beforeEach(() => setCurrency('ZAR'));

// Expected values were worked out separately with node from the SARS 2026/27 table, UIF ceiling and retirement cap.
describe('south africa take-home pay calculator', () => {
	it('matches the worked example: R35,000 a month, under 65', () => {
		const r = run({ salary: '35000' });
		expect(r.primaryResult).toBe(R('28,688.13'));
		expect(metric(r, 'PAYE per month')).toBe(R('6,134.75'));
		expect(metric(r, 'UIF per month')).toBe(R('177.12'));
	});

	it('deducts a retirement contribution before tax', () => {
		// R3,000 a month = R36,000 a year (below 27.5% of pay): PAYE 5,204.75
		const r = run({ salary: '35000', retirement: '3000' });
		expect(r.primaryResult).toBe(R('26,618.13'));
		expect(metric(r, 'PAYE per month')).toBe(R('5,204.75'));
	});

	it('caps the retirement deduction at R430,000 a year', () => {
		// R60,000 a month = R720,000 a year; only R430,000 is deductible
		const r = run({ salary: '150000', retirement: '60000', members: '1' });
		expect(metric(r, 'PAYE per month')).toBe(R('36,290.08'));
		expect(r.primaryResult).toBe(R('53,532.80'));
	});

	it('applies medical credits and takes the premium off net pay', () => {
		const r = run({ salary: '80000', members: '2', premium: '2500' });
		expect(metric(r, 'PAYE per month')).toBe(R('21,905.75'));
		expect(metric(r, 'Medical tax credit per month')).toBe(R('752.00'));
		expect(r.primaryResult).toBe(R('55,417.13'));
	});

	it('handles age rebates, low pay and the UIF ceiling', () => {
		expect(run({ salary: '50000', age: '65to74', retirement: '5000', members: '2', premium: '3000' }).primaryResult).toBe(R('34,113.05'));
		// below the tax threshold of R99,000 a year: no PAYE, UIF 1% of pay
		const low = run({ salary: '8000' });
		expect(metric(low, 'PAYE per month')).toBe(R('0.00'));
		expect(metric(low, 'UIF per month')).toBe(R('80.00'));
		expect(metric(run({ salary: '10000' }), 'PAYE per month')).toBe(R('315.00'));
		// UIF stops at the R17,712 ceiling
		expect(metric(run({ salary: '100000' }), 'UIF per month')).toBe(R('177.12'));
	});

	it('returns a dash for invalid input', () => {
		expect(run({ salary: '0' }).primaryResult).toBe('—');
		expect(run({ salary: '' }).primaryResult).toBe('—');
		expect(run({ salary: '10000', retirement: '9000', premium: '2000' }).primaryResult).toBe('—');
	});
});
