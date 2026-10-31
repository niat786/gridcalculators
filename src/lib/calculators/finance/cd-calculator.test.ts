import { describe, expect, it } from 'vitest';
import calc from './cd-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('cd calculator', () => {
	it('defaults: $10,000 at 4.5% APY for 12 months is $10,450', () => {
		const r = run();
		expect(r.primaryResult).toBe('$10,450.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$450.00');
		expect(r.secondaryMetrics?.[1].value).toBe('4.5%');
	});

	it('matches the worked example: 4.5% APR, monthly compounding', () => {
		const r = run({ basis: 'apr' });
		expect(r.primaryResult).toBe('$10,459.40');
		expect(r.secondaryMetrics?.[1].value).toBe('4.594%');
	});

	it('APY is unchanged by the compounding choice (daily, 24 months)', () => {
		// 10,000 × 1.05² = 11,025
		const r = run({ deposit: '10000', basis: 'apy', rate: '5', months: '24', compounding: 'daily' });
		expect(r.primaryResult).toBe('$11,025.00');
	});

	it('quarterly APY over 6 months: $5,000 at 4% is 5000 × 1.04^0.5', () => {
		const r = run({ deposit: '5000', basis: 'apy', rate: '4', months: '6', compounding: 'quarterly' });
		expect(r.primaryResult).toBe('$5,099.02');
	});

	it('returns a dash for invalid input', () => {
		const r = run({ deposit: '' });
		expect(r.primaryResult).toBe('—');
	});
});
