import { beforeEach, describe, expect, it } from 'vitest';
import calc from './step-up-sip-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('step-up SIP calculator', () => {
	beforeEach(() => setCurrency('INR'));

	it('matches the default case: ₹10,000 rising 10% a year, 12%, 10 years', () => {
		// Independent month-by-month check (node): contribution at start of month, then × 1.01.
		// Maturity 33,74,326.26; invested 12,00,000 × (1 + 1.1 + … + 1.1^9) = 19,12,490.95
		// Flat SIP 23,23,390.76. Extra = 33,74,326 − 23,23,391 = 10,50,935 (rounded values).
		const r = run({ monthly: '10000', stepType: 'percent', stepPct: '10', rate: '12', years: '10' });
		expect(r.primaryResult).toBe('₹33,74,326');
		expect(metric(r, 'Total invested (step-up)')).toBe('₹19,12,491');
		expect(metric(r, 'Monthly SIP in final year')).toBe('₹23,579');
		expect(metric(r, 'Flat SIP value')).toBe('₹23,23,391');
		expect(metric(r, 'Flat SIP invested')).toBe('₹12,00,000');
		expect(metric(r, 'Extra from step-up')).toBe('₹10,50,935');
	});

	it('reproduces the flat SIP in a published 20-year example', () => {
		// upgrowth.in step-up SIP calculator page: flat corpus for ₹10,000 a month, 12%, 20 years is ₹99.9 lakh (9,991,479.19)
		const r = run({ monthly: '10000', stepType: 'percent', stepPct: '0', rate: '12', years: '20' });
		expect(r.primaryResult).toBe('₹99,91,479');
		expect(metric(r, 'Extra from step-up')).toBe('₹0');
	});

	it('a 0% step-up gives the same result as a flat SIP', () => {
		const r = run({ monthly: '10000', stepType: 'percent', stepPct: '0', rate: '12', years: '10' });
		expect(r.primaryResult).toBe('₹23,23,391');
		expect(metric(r, 'Total invested (step-up)')).toBe('₹12,00,000');
	});

	it('adds a fixed yearly amount when the fixed step-up is chosen', () => {
		// Year 1: 10,000; year y: 10,000 + (y − 1) × 1,000. Invested = 12 × 145,000 = 17,40,000.
		// Independent month-by-month check: maturity 31,45,356.24
		const r = run({ monthly: '10000', stepType: 'fixed', stepAmount: '1000', rate: '12', years: '10' });
		expect(r.primaryResult).toBe('₹31,45,356');
		expect(metric(r, 'Total invested (step-up)')).toBe('₹17,40,000');
		expect(metric(r, 'Monthly SIP in final year')).toBe('₹19,000');
	});

	it('the year-by-year table ends at the maturity value', () => {
		const r = run({ monthly: '10000', stepType: 'percent', stepPct: '10', rate: '12', years: '10' });
		expect(r.table?.rows).toHaveLength(10);
		expect(r.table?.rows[0].monthly).toBe('₹10,000');
		expect(r.table?.rows[1].monthly).toBe('₹11,000');
		expect(r.table?.rows[9].value).toBe('₹33,74,326');
	});

	it('shows only the step-up field that matches the chosen type', () => {
		const pct = calc.inputs.find((i) => i.id === 'stepPct');
		const amt = calc.inputs.find((i) => i.id === 'stepAmount');
		const percentValues = toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), stepType: 'percent' });
		const fixedValues = toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), stepType: 'fixed' });
		expect(pct?.type === 'number' && pct.visibleWhen?.(percentValues)).toBe(true);
		expect(amt?.type === 'number' && amt.visibleWhen?.(percentValues)).toBe(false);
		expect(amt?.type === 'number' && amt.visibleWhen?.(fixedValues)).toBe(true);
	});

	it('returns a dash for invalid input', () => {
		expect(run({ monthly: '' }).primaryResult).toBe('—');
		expect(run({ monthly: '10000', years: '0' }).primaryResult).toBe('—');
		expect(run({ monthly: '10000', stepType: 'percent', stepPct: '-1' }).primaryResult).toBe('—');
	});
});
