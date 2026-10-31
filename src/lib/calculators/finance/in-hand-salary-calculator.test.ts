import { beforeEach, describe, expect, it } from 'vitest';
import calc from './in-hand-salary-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

// Expected values computed by hand / node (gross, PF 12% on min(basic, 25,000), tax per slabs/rebate/cess).
const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('INR'));

describe('in-hand salary calculator', () => {
	it('12L CTC, capped PF, new regime: 94,000 a month, no tax', () => {
		const r = run();
		expect(r.primaryResult).toBe('₹94,000.00');
		expect(metric(r, 'Annual income tax')).toBe('₹0');
		expect(metric(r, 'Monthly employee PF')).toBe('₹3,000.00');
	});
	it('PF on full basic: 12L CTC -> PF 72,000; gross 11,28,000; in-hand 88,000', () => {
		const r = run({ pfBase: 'full' });
		expect(r.primaryResult).toBe('₹88,000.00');
		expect(metric(r, 'Monthly gross salary')).toBe('₹94,000.00');
	});
	it('employer PF outside CTC and gratuity: 12L CTC, gratuity 4.81% of 6L = 28,860', () => {
		// gross = 1,200,000 - 28,860 = 1,171,140; in-hand = (1,171,140 - 36,000)/12 = 94,595
		expect(run({ employerPfInCtc: false, gratuity: true }).primaryResult).toBe('₹94,595.00');
	});
	it('24L CTC new regime: gross 23,64,000, PF 36,000, tax 2,83,140', () => {
		// taxable 22,89,000: slab tax 2,00,000 + 25% x 2,89,000 = 2,72,250; +4% cess = 2,83,140
		const r = run({ ctc: '2400000' });
		expect(metric(r, 'Annual income tax')).toBe('₹2,83,140');
		expect(r.primaryResult).toBe('₹1,70,405.00');
	});
	it('Maharashtra professional tax of 2,500 a year and a too-low salary guard', () => {
		expect(metric(run({ state: 'MH' }), 'Monthly deductions in total')).toBe('₹3,208.33');
		expect(run({ state: 'KA', ctc: '300000' }).primaryResult).toBe('—');
	});
	it('invalid input returns a dash', () => {
		expect(run({ ctc: '' }).primaryResult).toBe('—');
		expect(run({ basicPct: '0' }).primaryResult).toBe('—');
	});
});
