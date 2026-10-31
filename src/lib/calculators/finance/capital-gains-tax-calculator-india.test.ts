import { beforeEach, describe, expect, it } from 'vitest';
import calc, { addMonths, ciiFor, parseIso, wholeMonths } from './capital-gains-tax-calculator-india.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';
import { CII, CII_LATEST_FY_START } from '../data/in-cg-fy2026-27';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('INR'));

// All expected numbers below were worked out by hand / with node from the statute's rates, not from the code under test.
describe('capital gains tax calculator (India)', () => {
	it('long-term listed equity: 12.5% above the ₹1.25 lakh exemption, plus 4% cess', () => {
		// gain 9,00,000 - 5,00,000 = 4,00,000; taxable 2,75,000 x 12.5% = 34,375; cess 1,375
		const r = run({ asset: 'equity', buyDate: '2024-01-10', sellDate: '2025-03-01', cost: '500000', sale: '900000' });
		expect(r.primaryResult).toBe('₹35,750.00');
		expect(metric(r, 'Tax before cess')).toBe('₹34,375.00');
		expect(metric(r, 'Exempt part of the gain')).toBe('₹1,25,000.00');
	});

	it('shares the ₹1.25 lakh exemption with gains already booked this year', () => {
		// exemption left 25,000; taxable 3,75,000 x 12.5% = 46,875; x 1.04 = 48,750
		const r = run({ asset: 'equity', buyDate: '2024-01-10', sellDate: '2025-03-01', used: '100000' });
		expect(r.primaryResult).toBe('₹48,750.00');
		const none = run({ asset: 'equity', buyDate: '2024-01-10', sellDate: '2025-03-01', used: '200000' });
		expect(none.primaryResult).toBe('₹52,000.00'); // exemption fully used: 4,00,000 x 12.5% x 1.04
	});

	it('short-term listed equity: 20% flat', () => {
		// 1,00,000 -> 1,50,000 in 6 months: 50,000 x 20% = 10,000 + 400 cess
		const r = run({ asset: 'equity', buyDate: '2025-06-01', sellDate: '2025-12-01', cost: '100000', sale: '150000' });
		expect(r.primaryResult).toBe('₹10,400.00');
	});

	it('equity sold without STT gets no special rate or exemption', () => {
		const lt = run({ asset: 'equity', stt: false, buyDate: '2024-01-10', sellDate: '2025-03-01', cost: '500000', sale: '900000' });
		expect(lt.primaryResult).toBe('₹52,000.00'); // 4,00,000 x 12.5% x 1.04
		const st = run({ asset: 'equity', stt: false, buyDate: '2025-06-01', sellDate: '2025-12-01', cost: '100000', sale: '150000', slab: '30' });
		expect(st.primaryResult).toBe('₹15,600.00'); // 50,000 x 30% x 1.04
	});

	it('holding period boundary: exactly 12 months is still short-term, a day later is long-term', () => {
		const on = run({ asset: 'equity', buyDate: '2024-08-01', sellDate: '2025-08-01', cost: '100000', sale: '150000' });
		expect(on.primaryResult).toBe('₹10,400.00');
		const after = run({ asset: 'equity', buyDate: '2024-08-01', sellDate: '2025-08-02', cost: '100000', sale: '150000' });
		expect(after.primaryResult).toBe('₹0.00'); // 50,000 is inside the ₹1.25 lakh exemption
	});

	it('gold and other assets need more than 24 months; short-term uses your slab rate', () => {
		const short = run({ asset: 'gold', buyDate: '2024-08-01', sellDate: '2026-08-01', cost: '300000', sale: '400000', slab: '20' });
		expect(short.primaryResult).toBe('₹20,800.00'); // 1,00,000 x 20% x 1.04
		const long = run({ asset: 'gold', buyDate: '2024-08-01', sellDate: '2026-08-02', cost: '300000', sale: '400000', slab: '20' });
		expect(long.primaryResult).toBe('₹13,000.00'); // 1,00,000 x 12.5% x 1.04
	});

	it('unlisted shares: 24-month rule and 12.5% without indexation', () => {
		const r = run({ asset: 'unlisted', buyDate: '2023-06-01', sellDate: '2026-01-15', cost: '200000', sale: '600000' });
		expect(r.primaryResult).toBe('₹52,000.00'); // 4,00,000 x 12.5% x 1.04
		const s = run({ asset: 'unlisted', buyDate: '2025-06-01', sellDate: '2026-01-15', cost: '200000', sale: '600000', slab: '10' });
		expect(s.primaryResult).toBe('₹41,600.00'); // 4,00,000 x 10% x 1.04
	});

	it('other listed securities (gold ETF) use the 12-month rule', () => {
		const r = run({ asset: 'listed', buyDate: '2024-08-01', sellDate: '2025-08-02', cost: '100000', sale: '200000' });
		expect(r.primaryResult).toBe('₹13,000.00'); // 1,00,000 x 12.5% x 1.04, no ₹1.25 lakh exemption
	});

	it('debt fund bought after 1 April 2023 is always taxed at the slab rate', () => {
		const r = run({ asset: 'debtmf', buyDate: '2024-01-01', sellDate: '2026-03-01', cost: '500000', sale: '600000', slab: '30' });
		expect(r.primaryResult).toBe('₹31,200.00'); // 1,00,000 x 30% x 1.04
		expect(run({ asset: 'debtmf', buyDate: '2022-01-01', sellDate: '2026-03-01' }).primaryResult).toBe('—');
	});

	it('property: reproduces the worked example (12.5% beats 20% with indexation)', () => {
		// ₹50 lakh bought June 2023, sold Jan 2026 for ₹90 lakh. A = 12.5% x 40,00,000 = 5,00,000.
		// Indexed cost 50,00,000 x 376/348 = 54,02,298.85; gain 35,97,701.15; B = 20% = 7,19,540.23. Lower = 5,00,000; +4% = 5,20,000
		const r = run({ asset: 'property', taxpayer: 'res', buyDate: '2023-06-01', sellDate: '2026-01-15', cost: '5000000', sale: '9000000' });
		expect(r.primaryResult).toBe('₹5,20,000.00');
		expect(metric(r, 'Tax at 12.5%, no indexation')).toBe('₹5,00,000.00');
		expect(metric(r, 'Tax at 20%, with indexation')).toBe('₹7,19,540.23');
	});

	it('property bought long ago: 20% with indexation is lower', () => {
		// cost 10,00,000 in June 2005 (CII 117), sold Sept 2025 (CII 376) for 60,00,000.
		// Indexed cost 10,00,000 x 376/117 = 32,13,675.21; gain 27,86,324.79; 20% = 5,57,264.96; A = 6,25,000 (higher). x 1.04 = 5,79,555.56
		const r = run({ asset: 'property', taxpayer: 'res', buyDate: '2005-06-01', sellDate: '2025-09-01', cost: '1000000', sale: '6000000' });
		expect(r.primaryResult).toBe('₹5,79,555.56');
		expect(r.summary).toContain('with indexation');
	});

	it('property with cost of improvement and selling expenses', () => {
		// cost 20,00,000 (June 2005, CII 117), improvement 5,00,000 (May 2010, FY2010 CII 167), sale 1,20,00,000 in Feb 2026 (FY2025, 376), expenses 1,00,000.
		// A = 12.5% x (1,20,00,000 - 1,00,000 - 25,00,000) = 11,75,000.
		// Indexed cost 20,00,000 x 376/117 = 64,27,350.43; improvement 5,00,000 x 376/167 = 11,25,748.50; gain 43,46,901.07; B = 8,69,380.21
		const r = run({
			asset: 'property', taxpayer: 'res', buyDate: '2005-06-01', sellDate: '2026-02-01', cost: '2000000', sale: '12000000',
			expenses: '100000', improvement: '500000', improveDate: '2010-05-01'
		});
		expect(metric(r, 'Tax at 12.5%, no indexation')).toBe('₹11,75,000.00');
		expect(metric(r, 'Tax at 20%, with indexation')).toBe('₹8,69,380.21');
		expect(metric(r, 'Indexed cost (cost + improvement)')).toBe('₹75,53,098.93');
		expect(r.primaryResult).toBe('₹9,04,155.42'); // 8,69,380.21 x 1.04
	});

	it('property: no indexation for other taxpayers or for property bought on/after 23 July 2024', () => {
		const other = run({ asset: 'property', taxpayer: 'other', buyDate: '2005-06-01', sellDate: '2025-09-01', cost: '1000000', sale: '6000000' });
		expect(other.primaryResult).toBe('₹6,50,000.00'); // 50,00,000 x 12.5% x 1.04
		const newer = run({ asset: 'property', taxpayer: 'res', buyDate: '2024-07-23', sellDate: '2026-09-01', cost: '1000000', sale: '6000000' });
		expect(newer.primaryResult).toBe('₹6,50,000.00');
	});

	it('property short-term (24 months or less) is taxed at the slab rate', () => {
		const r = run({ asset: 'property', buyDate: '2025-02-01', sellDate: '2026-01-15', cost: '5000000', sale: '5500000', slab: '30' });
		expect(r.primaryResult).toBe('₹1,56,000.00'); // 5,00,000 x 30% x 1.04
	});

	it('sale after FY 2026-27 has no notified CII, so indexation is not applied', () => {
		const r = run({ asset: 'property', taxpayer: 'res', buyDate: '2005-06-01', sellDate: '2027-06-01', cost: '1000000', sale: '6000000' });
		expect(r.primaryResult).toBe('₹6,50,000.00');
		expect(r.summary).toContain('not notified');
	});

	it('adds surcharge before cess', () => {
		const r = run({ asset: 'equity', buyDate: '2025-06-01', sellDate: '2025-12-01', cost: '100000', sale: '150000', surcharge: '10' });
		expect(r.primaryResult).toBe('₹11,440.00'); // 10,000 x 1.10 x 1.04
	});

	it('a loss or zero gain means zero tax', () => {
		const loss = run({ asset: 'equity', buyDate: '2025-06-01', sellDate: '2025-12-01', cost: '150000', sale: '100000' });
		expect(loss.primaryResult).toBe('₹0.00');
		expect(metric(loss, 'Capital gain')).toBe('−₹50,000.00');
		expect(run({ asset: 'gold', cost: '100', sale: '100' }).primaryResult).toBe('₹0.00');
	});

	it('rejects invalid input', () => {
		expect(run({ cost: '' }).primaryResult).toBe('—');
		expect(run({ sale: 'abc' }).primaryResult).toBe('—');
		expect(run({ buyDate: '2026-01-01', sellDate: '2025-01-01' }).primaryResult).toBe('—');
		expect(run({ sellDate: '2024-07-22', buyDate: '2020-01-01' }).primaryResult).toBe('—'); // old rates not covered
		expect(run({ sellDate: '2024-07-23', buyDate: '2020-01-01' }).primaryResult).not.toBe('—');
		expect(run({ buyDate: 'nope' }).primaryResult).toBe('—');
		expect(run({ cost: '-5' }).primaryResult).toBe('—');
		expect(run({ asset: 'property', improvement: '100000', improveDate: '2030-01-01', buyDate: '2005-06-01' }).primaryResult).toBe('—');
	});

	it('handles very large values', () => {
		const r = run({ asset: 'gold', buyDate: '2020-01-01', sellDate: '2026-01-15', cost: '0', sale: '100000000000', slab: '30' });
		expect(r.primaryResult).toBe('₹13,00,00,00,000.00'); // 1e11 x 12.5% x 1.04 = 13,000,000,000
	});
});

describe('date and index helpers', () => {
	it('adds months clamped to month end', () => {
		expect(new Date(addMonths(parseIso('2024-08-31')!, 6)).toISOString().slice(0, 10)).toBe('2025-02-28');
		expect(new Date(addMonths(parseIso('2024-02-29')!, 12)).toISOString().slice(0, 10)).toBe('2025-02-28');
	});
	it('counts whole months', () => {
		expect(wholeMonths(parseIso('2023-06-01')!, parseIso('2026-01-15')!)).toBe(31);
		expect(wholeMonths(parseIso('2023-06-20')!, parseIso('2026-01-15')!)).toBe(30);
	});
	it('maps dates to the financial year CII', () => {
		expect(ciiFor(parseIso('2026-03-31')!)).toBe(376);
		expect(ciiFor(parseIso('2026-04-01')!)).toBe(384);
		expect(ciiFor(parseIso('1990-01-01')!)).toBe(100);
		expect(ciiFor(parseIso('2027-04-01')!)).toBeNull();
		expect(CII[CII_LATEST_FY_START]).toBe(384);
	});
	it('rejects impossible dates', () => {
		expect(parseIso('2025-02-30')).toBeNull();
	});
});
