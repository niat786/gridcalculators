import { beforeEach, describe, expect, it } from 'vitest';
import calc, { landTransferTax } from './land-transfer-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const base = { province: 'ON', price: 0, firstTime: false, toronto: false, singleFamily: true, newBuild: false, nsRate: 1.5, qcRate: 1.5, assessed: 0, mortgage: 0 };
const tax = (o: Partial<typeof base>) => landTransferTax({ ...base, ...o });

beforeEach(() => setCurrency('CAD'));

// Expected values were added up by hand band by band (and checked against the official quick formulas on ontario.ca).
describe('land transfer tax calculator', () => {
	it('matches the worked example: $800,000 in Ontario', () => {
		const r = run({ province: 'ON', price: '800000' });
		expect(r.primaryResult).toBe('CA$12,475.00');
		expect(metric(r, 'Share of the price')).toBe('1.56%');
	});

	it('Ontario bands: 275 + 1,950 + 2,250 + 2% over $400,000; 2.5% above $2 million for houses only', () => {
		expect(tax({ price: 55000 }).total).toBe(275);
		expect(tax({ price: 250000 }).total).toBe(2225);
		expect(tax({ price: 400000 }).total).toBe(4475); // ontario.ca worked example
		expect(tax({ price: 500000 }).total).toBe(6475);
		expect(tax({ price: 2000000 }).total).toBe(36475);
		expect(tax({ price: 2500000 }).total).toBe(48975);
		expect(tax({ price: 2500000, singleFamily: false }).total).toBe(46475);
	});

	it('Ontario first-time buyer refund is capped at $4,000 and never exceeds the tax', () => {
		expect(tax({ price: 500000, firstTime: true }).total).toBe(2475);
		expect(tax({ price: 300000, firstTime: true }).total).toBe(0);
		expect(tax({ price: 368000, firstTime: true }).total).toBe(0);
	});

	it('Toronto adds the municipal tax and its own rebate (up to $4,475)', () => {
		expect(tax({ price: 500000, toronto: true }).total).toBe(12950);
		expect(tax({ price: 500000, toronto: true, firstTime: true }).total).toBe(4475);
		expect(tax({ price: 400000, toronto: true, firstTime: true }).total).toBe(475);
		// $3.5M: Ontario 36,475 + 1.5M × 2.5% = 73,975; Toronto 61,475 + 0.5M × 4.4% = 83,475
		const big = tax({ price: 3500000, toronto: true });
		expect(big.provincial).toBe(73975);
		expect(big.municipal).toBe(83475);
		expect(big.total).toBe(157450);
	});

	it('British Columbia: bands, extra 2% over $3 million, first-time and new-build exemptions', () => {
		expect(tax({ province: 'BC', price: 800000 }).total).toBe(14000);
		expect(tax({ province: 'BC', price: 800000, firstTime: true }).total).toBe(6000);
		expect(tax({ province: 'BC', price: 500000, firstTime: true }).total).toBe(0);
		// partial: $8,000 × (860,000 − 850,000) / 25,000 = 3,200 off 15,000
		expect(tax({ province: 'BC', price: 850000, firstTime: true }).total).toBe(11800);
		expect(tax({ province: 'BC', price: 860000, firstTime: true }).total).toBe(15200);
		// new build: tax 20,500 × (1,150,000 − 1,125,000) / 50,000 = 10,250 off
		expect(tax({ province: 'BC', price: 1125000, newBuild: true }).total).toBe(10250);
		expect(tax({ province: 'BC', price: 1000000, newBuild: true }).total).toBe(0);
		expect(tax({ province: 'BC', price: 3500000 }).total).toBe(93000);
	});

	it('Manitoba, New Brunswick, Nova Scotia and Prince Edward Island', () => {
		expect(tax({ province: 'MB', price: 400000 }).total).toBe(5650);
		expect(tax({ province: 'MB', price: 30000 }).total).toBe(0);
		expect(tax({ province: 'NB', price: 300000 }).total).toBe(3000);
		expect(tax({ province: 'NB', price: 300000, assessed: 320000 }).total).toBe(3200);
		expect(tax({ province: 'NS', price: 400000, nsRate: 1.5 }).total).toBe(6000);
		expect(tax({ province: 'NS', price: 400000, nsRate: 1 }).total).toBe(4000);
		expect(tax({ province: 'PE', price: 250000 }).total).toBe(2500);
		expect(tax({ province: 'PE', price: 30000 }).total).toBe(0);
		expect(tax({ province: 'PE', price: 30001 }).total).toBeCloseTo(300.01, 8);
	});

	it('Quebec welcome tax with the 2026 thresholds and a municipal rate above $500,000', () => {
		expect(tax({ province: 'QC', price: 400000 }).total).toBeCloseTo(4110.5, 8);
		expect(tax({ province: 'QC', price: 700000, qcRate: 2 }).total).toBeCloseTo(9610.5, 8);
		expect(run({ province: 'QC', price: '400000' }).primaryResult).toBe('CA$4,110.50');
	});

	it('Newfoundland and Labrador registration fees', () => {
		expect(tax({ province: 'NL', price: 300000, mortgage: 250000 }).total).toBe(2396);
		expect(tax({ province: 'NL', price: 300000, mortgage: 2000000 }).total).toBe(6298);
		expect(tax({ province: 'NL', price: 500 }).total).toBe(100);
	});

	it('invalid input returns a dash', () => {
		expect(run({ price: '' }).primaryResult).toBe('—');
		expect(run({ price: '0' }).primaryResult).toBe('—');
		expect(run({ province: 'NS', nsRate: '9' }).primaryResult).toBe('—');
	});
});
