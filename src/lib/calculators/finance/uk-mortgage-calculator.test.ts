import { describe, expect, it } from 'vitest';
import calc from './uk-mortgage-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('uk mortgage calculator', () => {
	it('matches the worked example: £300,000 price, £60,000 deposit, 4.5% over 25 years, repayment', () => {
		const r = run({ price: '300000', deposit: '60000', rate: '4.5', term: '25', type: 'repayment' });
		expect(r.primaryResult).toBe('£1,334.00');
		expect(metric(r, 'Loan amount')).toBe('£240,000.00');
		expect(metric(r, 'Loan to value')).toBe('80%');
		expect(metric(r, 'Total interest')).toBe('£160,199.38');
		expect(metric(r, 'Total repaid')).toBe('£400,199.38');
		expect(metric(r, 'Still owed at end of term')).toBe('£0.00');
	});

	it('charges interest only and still owes the full loan at the end', () => {
		const r = run({ price: '300000', deposit: '60000', rate: '4.5', term: '25', type: 'interest-only' });
		expect(r.primaryResult).toBe('£900.00');
		expect(metric(r, 'Total interest')).toBe('£270,000.00');
		expect(metric(r, 'Total repaid')).toBe('£510,000.00');
		expect(metric(r, 'Still owed at end of term')).toBe('£240,000.00');
	});

	it('divides the loan by the number of payments at 0%', () => {
		const r = run({ price: '200000', deposit: '20000', rate: '0', term: '20', type: 'repayment' });
		expect(r.primaryResult).toBe('£750.00');
		expect(metric(r, 'Total interest')).toBe('£0.00');
	});

	it('matches a 5.25% repayment over 30 years on a £250,000 price with £50,000 deposit', () => {
		const r = run({ price: '250000', deposit: '50000', rate: '5.25', term: '30', type: 'repayment' });
		expect(r.primaryResult).toBe('£1,104.41');
		expect(metric(r, 'Total interest')).toBe('£197,586.67');
	});

	it('returns a dash when the deposit is not below the price, or the price is missing', () => {
		expect(run({ price: '300000', deposit: '300000' }).primaryResult).toBe('—');
		expect(run({ price: '' }).primaryResult).toBe('—');
	});
});
