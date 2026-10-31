import { beforeEach, describe, expect, it } from 'vitest';
import calc from './pakistan-property-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { money, setCurrency } from '../format';

// Expected figures worked out by hand from the Finance Act 2026 rates (KPMG brief): 236K 1.25%, 236C 2.75%, and the
// section 37 capital gain schedule (15% flat for property acquired on/after 1 July 2024; taper table before that).
const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const m = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((x) => x.label === label)?.value;
const rs = (n: number) => money(n, true);

beforeEach(() => setCurrency('PKR'));

describe('pakistan property tax calculator, tax year 2027', () => {
	it('matches the worked example: buying Rs 20m as a filer', () => {
		const r = run({ mode: 'buy', value: '20000000' });
		expect(r.primaryResult).toBe(rs(250000));
		expect(m(r, 'Advance tax rate')).toBe('1.25%');
	});

	it('is flat at every value (no bands)', () => {
		expect(run({ mode: 'buy', value: '50000000' }).primaryResult).toBe(rs(625000));
		expect(run({ mode: 'buy', value: '50000001' }).primaryResult).toBe(rs(625000)); // 625,000.0125 rounds to whole rupees
		expect(run({ mode: 'buy', value: '150000000' }).primaryResult).toBe(rs(1875000));
	});

	it('sale: 2.75% of consideration', () => {
		expect(run({ mode: 'sell', value: '20000000' }).primaryResult).toBe(rs(550000));
		expect(run({ mode: 'sell', value: '100000000' }).primaryResult).toBe(rs(2750000));
	});

	it('late filers pay the same as filers', () => {
		expect(run({ mode: 'sell', status: 'late', value: '20000000' }).primaryResult).toBe(rs(550000));
		expect(run({ mode: 'buy', status: 'late', value: '20000000' }).primaryResult).toBe(rs(250000));
	});

	it('capital gains: acquired after 1 July 2024 is a flat 15% of the gain', () => {
		const r = run({ mode: 'sell', value: '20000000', cgt: 'true', cost: '15000000', acquired: 'after' });
		expect(m(r, 'Capital gain')).toBe(rs(5000000));
		expect(m(r, 'Capital gains tax')).toBe(rs(750000));
		expect(m(r, 'Advance tax + capital gains tax')).toBe(rs(550000 + 750000));
	});

	it('capital gains: older holdings follow the holding-period table', () => {
		const base = { mode: 'sell', value: '20000000', cgt: 'true', cost: '15000000', acquired: 'before' };
		// open plot held 3 years: 10% of 5m
		expect(m(run({ ...base, ptype: 'plot', years: '3' }), 'Capital gains tax')).toBe(rs(500000));
		// open plot over 3 and up to 4 years: 7.5%
		expect(m(run({ ...base, ptype: 'plot', years: '3.5' }), 'Capital gains tax')).toBe(rs(375000));
		// flat held 2 years: 7.5% of 8m gain
		expect(m(run({ ...base, cost: '12000000', ptype: 'flat', years: '2' }), 'Capital gains tax')).toBe(rs(600000));
		// flat over 2 years: nil
		expect(m(run({ ...base, ptype: 'flat', years: '2.5' }), 'Capital gains tax')).toBe(rs(0));
		// constructed property held 1 year: 15%; over 4 years: nil
		expect(m(run({ ...base, ptype: 'house', years: '1' }), 'Capital gains tax')).toBe(rs(750000));
		expect(m(run({ ...base, ptype: 'house', years: '4.5' }), 'Capital gains tax')).toBe(rs(0));
		// open plot over 6 years: nil; exactly 6 years: 2.5%
		expect(m(run({ ...base, ptype: 'plot', years: '6.5' }), 'Capital gains tax')).toBe(rs(0));
		expect(m(run({ ...base, ptype: 'plot', years: '6' }), 'Capital gains tax')).toBe(rs(125000));
	});

	it('no capital gains tax on a loss', () => {
		const r = run({ mode: 'sell', value: '10000000', cgt: 'true', cost: '12000000', acquired: 'after' });
		expect(m(r, 'Capital gain')).toBe(rs(0));
		expect(m(r, 'Capital gains tax')).toBe(rs(0));
	});

	it('zero value gives zero tax', () => {
		expect(run({ value: '0' }).primaryResult).toBe(rs(0));
	});

	it('returns a dash for invalid input', () => {
		expect(run({ status: 'non' }).primaryResult).toBe('—'); // not-on-ATL rates are not modelled
		expect(run({ value: '' }).primaryResult).toBe('—');
		expect(run({ value: '-1' }).primaryResult).toBe('—');
	});
});
