import { describe, expect, it } from 'vitest';
import calc from './boat-loan-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('boat loan calculator', () => {
	it('matches the worked example: $45,000 boat, 5,000 down, 8.5% over 60 months', () => {
		const r = run();
		expect(r.primaryResult).toBe('$886.31');
		expect(r.secondaryMetrics?.[0].value).toBe('$43,200.00');
		expect(r.secondaryMetrics?.[1].value).toBe('$2,700.00');
		expect(r.secondaryMetrics?.[2].value).toBe('$9,978.85');
		expect(r.secondaryMetrics?.[3].value).toBe('$53,178.85');
		expect(r.secondaryMetrics?.[4].value).toBe('$58,178.85');
	});

	it('has no interest on a 0% loan, so the payment is the amount divided by the months', () => {
		// Financed = 30,000 − 10,000 trade-in = 20,000; 20,000 ÷ 60 = 333.33
		const r = run({ price: '30000', down: '0', trade: '10000', taxPct: '0', fees: '0', rate: '0', term: '60' });
		expect(r.primaryResult).toBe('$333.33');
		expect(r.secondaryMetrics?.[2].value).toBe('$0.00');
		expect(r.secondaryMetrics?.[4].value).toBe('$20,000.00');
	});

	it('taxes the price after trade-in when the toggle is on, and the full price when it is off', () => {
		// On: tax 10% × (20,000 − 5,000) = 1,500 → financed 20,000 + 1,500 − 2,000 − 5,000 = 14,500
		// Off: tax 10% × 20,000 = 2,000 → financed 15,000
		const on = run({ price: '20000', down: '2000', trade: '5000', taxPct: '10', fees: '0', rate: '12', term: '12', taxAfter: true });
		expect(on.secondaryMetrics?.[1].value).toBe('$1,500.00');
		expect(on.secondaryMetrics?.[0].value).toBe('$14,500.00');
		const off = run({ price: '20000', down: '2000', trade: '5000', taxPct: '10', fees: '0', rate: '12', term: '12', taxAfter: false });
		expect(off.secondaryMetrics?.[1].value).toBe('$2,000.00');
		expect(off.primaryResult).toBe('$1,332.73');
	});

	it('returns a dash when the down payment and trade-in cover the whole cost', () => {
		const r = run({ price: '10000', down: '10000', trade: '0', taxPct: '0', fees: '0' });
		expect(r.primaryResult).toBe('—');
	});

	it('returns a dash for a missing price', () => {
		expect(run({ price: '' }).primaryResult).toBe('—');
	});
});
