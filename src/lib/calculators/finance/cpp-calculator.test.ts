import { beforeEach, describe, expect, it } from 'vitest';
import calc, { ageFactor, pensionAt65 } from './cpp-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('CAD'));

// Expected values computed separately with node from the simplified formula and the Canada.ca age adjustments.
describe('cpp calculator', () => {
	it('matches the worked example: $60,000 average earnings, 35 years, age 65', () => {
		const r = run();
		expect(r.primaryResult).toBe('CA$1,088.22');
		expect(metric(r, 'Estimated yearly CPP')).toBe('CA$13,058.63');
		expect(metric(r, 'Years counted (of 39)')).toBe('35');
	});

	it('maximum earnings and 39 years give the 2026 maximum at 65', () => {
		expect(run({ earnings: '74600', years: '39' }).primaryResult).toBe('CA$1,507.65');
		// above the limit and beyond 39 years adds nothing
		expect(run({ earnings: '120000', years: '45' }).primaryResult).toBe('CA$1,507.65');
	});

	it('starting at 60 is 36% lower, at 70 42% higher, 0.6% and 0.7% per month in between', () => {
		expect(run({ earnings: '74600', years: '39', ageYears: '60' }).primaryResult).toBe('CA$964.90');
		expect(run({ earnings: '74600', years: '39', ageYears: '70' }).primaryResult).toBe('CA$2,140.86');
		expect(run({ earnings: '74600', years: '39', ageYears: '62', ageMonths: '6' }).primaryResult).toBe('CA$1,236.27');
		expect(run({ earnings: '74600', years: '39', ageYears: '67' }).primaryResult).toBe('CA$1,760.94');
		expect(ageFactor(-60)).toBeCloseTo(0.64, 12);
		expect(ageFactor(60)).toBeCloseTo(1.42, 12);
		expect(ageFactor(120)).toBeCloseTo(1.42, 12);
	});

	it('fewer years and lower earnings scale the pension', () => {
		expect(run({ earnings: '18650', years: '39' }).primaryResult).toBe('CA$376.91');
		expect(run({ earnings: '74600', years: '20' }).primaryResult).toBe('CA$773.15');
		expect(pensionAt65(0, 39)).toBe(0);
	});

	it('invalid input returns a dash', () => {
		expect(run({ ageYears: '59' }).primaryResult).toBe('—');
		expect(run({ ageYears: '70', ageMonths: '3' }).primaryResult).toBe('—');
		expect(run({ years: '50' }).primaryResult).toBe('—');
		expect(run({ earnings: '' }).primaryResult).toBe('—');
	});
});
