import { beforeEach, describe, expect, it } from 'vitest';
import calc from './transfer-duty-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const R = (s: string) => `ZAR ${s}`;

beforeEach(() => setCurrency('ZAR'));

// Expected values were worked out separately by hand from the SARS transfer duty table (not by the code under test).
describe('south africa transfer duty calculator', () => {
	it('matches the worked example: R2,500,000', () => {
		const r = run({ price: '2500000' });
		expect(r.primaryResult).toBe(R('67,200.00'));
		expect(metric(r, 'Effective rate')).toBe('2.69%');
	});

	it('is zero up to R1,210,000 and 3% above it', () => {
		expect(run({ price: '1000000' }).primaryResult).toBe(R('0.00'));
		expect(run({ price: '1210000' }).primaryResult).toBe(R('0.00'));
		expect(run({ price: '1210001' }).primaryResult).toBe(R('0.03'));
		expect(run({ price: '1500000' }).primaryResult).toBe(R('8,700.00'));
	});

	it('matches the bracket boundaries', () => {
		expect(run({ price: '1663800' }).primaryResult).toBe(R('13,614.00'));
		expect(run({ price: '2000000' }).primaryResult).toBe(R('33,786.00'));
		expect(run({ price: '2994800' }).primaryResult).toBe(R('106,784.00'));
		expect(run({ price: '5000000' }).primaryResult).toBe(R('327,356.00'));
		expect(run({ price: '13310000' }).primaryResult).toBe(R('1,241,456.00'));
	});

	it('uses 13% above R13,310,000', () => {
		const r = run({ price: '15000000' });
		expect(r.primaryResult).toBe(R('1,461,156.00'));
		expect(metric(r, 'Bracket rate on top rand')).toBe('13%');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ price: '' }).primaryResult).toBe('—');
		expect(run({ price: '-1' }).primaryResult).toBe('—');
	});
});
