import { beforeEach, describe, expect, it } from 'vitest';
import calc from './bangladesh-income-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

// Expected values were computed independently by hand from the Finance Act 2026 slabs (10% / 15% / 20% / 25% / 30%
// after the tax-free limit). For the cumulative checks: first three slabs after the limit pay 30,000 + 60,000 + 100,000.
const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const T = (s: string) => `BDT ${s}`;
/** Taxable income entered directly: no salary exemption, no investment. */
const net = (taxable: number, extra: Record<string, string | boolean> = {}) =>
	run({ salary: '0', exempt: false, other: String(taxable), invest: '0', ...extra });

beforeEach(() => setCurrency('BDT'));

describe('bangladesh income tax calculator AY 2027-28', () => {
	it('matches the worked example: salary 1,200,000, investment 100,000', () => {
		const r = run();
		expect(r.primaryResult).toBe(T('35,000'));
		expect(metric(r, 'Taxable income')).toBe(T('800,000'));
		expect(metric(r, 'Tax-free limit')).toBe(T('400,000'));
		expect(metric(r, 'Tax on the slabs')).toBe(T('45,000'));
		expect(metric(r, 'Investment rebate')).toBe(T('10,000'));
		expect(metric(r, 'Minimum tax applied')).toBe('No');
	});

	it('tax-free limit boundary: 400,000 pays nothing; 400,001 pays the minimum tax of 5,000', () => {
		const a = net(400_000);
		expect(a.primaryResult).toBe(T('0'));
		const b = net(400_001);
		expect(b.primaryResult).toBe(T('5,000'));
		expect(metric(b, 'Minimum tax applied')).toBe('Yes');
	});

	it('slab boundaries for a general taxpayer: 700,000 -> 30,000; 1,100,000 -> 90,000; 1,600,000 -> 190,000; 3,600,000 -> 690,000', () => {
		expect(net(700_000).primaryResult).toBe(T('30,000'));
		expect(net(1_100_000).primaryResult).toBe(T('90,000'));
		expect(net(1_600_000).primaryResult).toBe(T('190,000'));
		expect(net(3_600_000).primaryResult).toBe(T('690,000'));
	});

	it('top slab at 30%: 5,000,000 -> 690,000 + 30% of 1,400,000 = 1,110,000', () => {
		const r = net(5_000_000);
		expect(r.primaryResult).toBe(T('1,110,000'));
		expect(metric(r, 'Rate on your next taka')).toBe('30%');
	});

	it('category limits: women 450,000, disability and third gender 525,000, fighters 550,000', () => {
		expect(net(450_000, { category: 'women' }).primaryResult).toBe(T('0'));
		expect(net(600_000, { category: 'women' }).primaryResult).toBe(T('15,000'));
		expect(net(525_000, { category: 'disabled' }).primaryResult).toBe(T('0'));
		expect(net(525_000, { category: 'third' }).primaryResult).toBe(T('0'));
		expect(net(550_000, { category: 'fighter' }).primaryResult).toBe(T('0'));
		expect(net(700_000, { category: 'fighter' }).primaryResult).toBe(T('15,000'));
		expect(metric(net(700_000, { category: 'fighter' }), 'Tax-free limit')).toBe(T('550,000'));
	});

	it('parent or guardian of a person with a disability gets 50,000 more', () => {
		const r = net(450_000, { dependant: true });
		expect(r.primaryResult).toBe(T('0'));
		expect(metric(r, 'Tax-free limit')).toBe(T('450,000'));
	});

	it('salary exemption is one-third up to 500,000: salary 3,000,000 -> taxable 2,500,000, tax 415,000', () => {
		const r = run({ salary: '3000000', invest: '0' });
		expect(metric(r, 'Taxable income')).toBe(T('2,500,000'));
		expect(r.primaryResult).toBe(T('415,000'));
		// switched off: the whole salary is taxable
		expect(metric(run({ salary: '3000000', invest: '0', exempt: false }), 'Taxable income')).toBe(T('3,000,000'));
	});

	it('investment rebate is the lowest of 3% of income, 10% of investment and 750,000', () => {
		// taxable 1,000,000: slab tax 75,000; 3% of income = 30,000
		expect(net(1_000_000).primaryResult).toBe(T('75,000'));
		expect(net(1_000_000, { invest: '5000000' }).primaryResult).toBe(T('45,000'));
		expect(net(1_000_000, { invest: '100000' }).primaryResult).toBe(T('65,000'));
		// taxable 40,000,000: slab tax 11,610,000; both 3% (1.2m) and 10% of 10m (1m) exceed the 750,000 cap
		const big = net(40_000_000, { invest: '10000000' });
		expect(metric(big, 'Investment rebate')).toBe(T('750,000'));
		expect(big.primaryResult).toBe(T('10,860,000'));
	});

	it('minimum tax: 5,000, or 1,000 for a first-time taxpayer, even after the rebate', () => {
		expect(net(401_000).primaryResult).toBe(T('5,000'));
		expect(net(401_000, { newTaxpayer: true }).primaryResult).toBe(T('1,000'));
		// rebate would wipe out the 5,500 tax (taxable 455,000, tax 5,500, rebate 5,500): minimum still applies
		const r = net(455_000, { invest: '1000000' });
		expect(metric(r, 'Investment rebate')).toBe(T('5,500'));
		expect(r.primaryResult).toBe(T('5,000'));
	});

	it('returns a dash for invalid input', () => {
		expect(run({ salary: '' }).primaryResult).toBe('—');
		expect(run({ salary: '-1' }).primaryResult).toBe('—');
		expect(run({ other: 'abc' }).primaryResult).toBe('—');
		expect(run({ invest: '' }).primaryResult).toBe('—');
	});

	it('zero income gives zero tax', () => {
		expect(run({ salary: '0', invest: '0' }).primaryResult).toBe(T('0'));
	});
});
