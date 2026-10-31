import { describe, expect, it } from 'vitest';
import calc from './finance-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('finance (TVM) calculator', () => {
	it('defaults: save toward a $20,000 goal from $1,000 out and $100 a month, solve FV', () => {
		// 1,000 × 1.005¹²⁰ + 100 × 163.879 = 18,207.33
		expect(run().primaryResult).toBe('$18,207.33');
	});

	it('FV textbook: $1,000 invested at 5% for 10 years is $1,628.89', () => {
		const r = run({ solve: 'fv', pv: '-1000', pmt: '0', n: '10', iy: '5', py: '1' });
		expect(r.primaryResult).toBe('$1,628.89');
	});

	it('PMT textbook: $200,000 loan at 6% a year over 360 monthly payments is -$1,199.10', () => {
		const r = run({ solve: 'pmt', pv: '200000', fv: '0', n: '360', iy: '6', py: '12' });
		expect(r.primaryResult).toBe('-$1,199.10');
	});

	it('PV textbook: $200 a year for 10 years at 8% is worth $1,342.02 today', () => {
		const r = run({ solve: 'pv', pmt: '-200', fv: '0', n: '10', iy: '8', py: '1' });
		expect(r.primaryResult).toBe('$1,342.02');
	});

	it('N with logs: $1,000 to $2,000 at 7% takes 10.24 years', () => {
		// ln 2 ÷ ln 1.07 = 10.2448
		const r = run({ solve: 'n', pv: '-1000', pmt: '0', fv: '2000', iy: '7', py: '1' });
		expect(r.primaryResult).toBe('10.24 periods');
		expect(r.secondaryMetrics?.[2].value).toBe('10.24');
	});

	it('N on the default savings plan is 129.19 monthly periods', () => {
		expect(run({ solve: 'n' }).primaryResult).toBe('129.19 periods');
	});

	it('I/Y textbook: $1,000 doubling in 10 years is 7.1773% a year', () => {
		// 2^(1/10) − 1 = 0.071773
		const r = run({ solve: 'iy', pv: '-1000', pmt: '0', fv: '2000', n: '10', py: '1' });
		expect(r.primaryResult).toBe('7.1773%');
	});

	it('I/Y on the default savings plan is 7.5791% a year', () => {
		expect(run({ solve: 'iy' }).primaryResult).toBe('7.5791%');
	});

	it('beginning timing: $100 a month at 1% a month for 12 months, paid at the start, is $1,280.93', () => {
		const r = run({ solve: 'fv', pv: '0', pmt: '-100', n: '12', iy: '12', py: '12', timing: 'beginning' });
		expect(r.primaryResult).toBe('$1,280.93');
	});

	it('zero rate: $1,000 paid out over 10 periods returns $100 a period', () => {
		const r = run({ solve: 'pmt', pv: '-1000', fv: '0', n: '10', iy: '0', py: '1' });
		expect(r.primaryResult).toBe('$100.00');
	});

	it('returns a dash when no positive number of periods exists', () => {
		// Every cash flow is paid out and nothing is received, so the balance never reaches zero
		expect(run({ solve: 'n', pv: '-1000', pmt: '-100', fv: '0', iy: '6', py: '12' }).primaryResult).toBe('—');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ solve: 'fv', n: '0' }).primaryResult).toBe('—');
		expect(run({ solve: 'pv', iy: '' }).primaryResult).toBe('—');
	});
});
