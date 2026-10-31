import { beforeEach, describe, expect, it } from 'vitest';
import calc from './advance-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-10-28'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const col = (r: ReturnType<typeof run>, key: string) => r.table!.rows.map((x) => x[key]);

beforeEach(() => setCurrency('INR'));

// Expected figures worked out by hand from sections 404, 408 and 425 of the Income-tax Act, 2025.
describe('advance tax calculator (India)', () => {
	it('splits ₹1,70,000 (₹2,50,000 tax less ₹80,000 TDS) into 15/45/75/100%', () => {
		const r = run();
		expect(r.primaryResult).toBe('₹1,70,000.00');
		expect(col(r, 'cum')).toEqual(['₹25,500.00', '₹76,500.00', '₹1,27,500.00', '₹1,70,000.00']);
		expect(col(r, 'inst')).toEqual(['₹25,500.00', '₹51,000.00', '₹51,000.00', '₹42,500.00']);
		expect(col(r, 'due')).toEqual(['15 Jun 2026', '15 Sep 2026', '15 Dec 2026', '15 Mar 2027']);
		expect(metric(r, 'Advance tax needed?')).toBe('Yes');
	});

	it('shows the next due date from the chosen date', () => {
		expect(metric(run({ asOf: '2026-10-28' }), 'Next due date')).toBe('15 Dec 2026: have paid ₹1,27,500.00 in total');
		expect(metric(run({ asOf: '2026-12-15' }), 'Next due date')).toContain('15 Dec 2026');
		expect(metric(run({ asOf: '2026-12-16' }), 'Next due date')).toContain('15 Mar 2027');
		expect(metric(run({ asOf: '2026-04-01' }), 'Next due date')).toContain('15 Jun 2026');
		expect(metric(run({ asOf: '2027-03-16' }), 'Next due date')).toBe('All FY 2026-27 dates have passed');
	});

	it('threshold: ₹9,999 after TDS is not payable, exactly ₹10,000 is', () => {
		const below = run({ tax: '59999', tds: '50000' });
		expect(below.primaryResult).toBe('₹0.00');
		expect(metric(below, 'Advance tax needed?')).toContain('No');
		const at = run({ tax: '60000', tds: '50000' });
		expect(at.primaryResult).toBe('₹10,000.00');
		expect(col(at, 'cum')).toEqual(['₹1,500.00', '₹4,500.00', '₹7,500.00', '₹10,000.00']);
	});

	it('TDS larger than the tax means nothing to pay', () => {
		const r = run({ tax: '100000', tds: '150000' });
		expect(r.primaryResult).toBe('₹0.00');
		expect(metric(r, 'Tax after TDS')).toBe('₹0.00');
	});

	it('resident senior citizens with no business income are exempt', () => {
		const r = run({ senior: true, tax: '900000', tds: '0' });
		expect(r.primaryResult).toBe('₹0.00');
		expect(metric(r, 'Advance tax needed?')).toBe('No (senior citizen)');
	});

	it('presumptive taxation: everything by 15 March', () => {
		const r = run({ presumptive: true });
		expect(r.table!.rows).toHaveLength(1);
		expect(col(r, 'due')).toEqual(['15 Mar 2027']);
		expect(col(r, 'inst')).toEqual(['₹1,70,000.00']);
	});

	it('interest if nothing is paid: 3% on 15/45/75% and 1% on 100% (reproduces the page example)', () => {
		// 25,500 x 3% + 76,500 x 3% + 1,27,500 x 3% + 1,70,000 x 1% = 765 + 2,295 + 3,825 + 1,700 = 8,585
		const r = run({ interest: true });
		expect(metric(r, 'Interest on shortfall (section 425)')).toBe('₹8,585.00');
		expect(col(r, 'interest')).toEqual(['₹765.00', '₹2,295.00', '₹3,825.00', '₹1,700.00']);
	});

	it('interest on partial payments', () => {
		// tax after TDS 1,00,000. Required 15,000 / 45,000 / 75,000 / 1,00,000.
		// Paid 10,000 (under the 12% harbour of 12,000): 5,000 x 3% = 150. Paid 30,000 (under 36,000): 15,000 x 3% = 450.
		// Paid 75,000: 0. Paid 1,00,000: 0.
		const r = run({ tax: '100000', tds: '0', interest: true, paid1: '10000', paid2: '30000', paid3: '75000', paid4: '100000' });
		expect(col(r, 'interest')).toEqual(['₹150.00', '₹450.00', '₹0.00', '₹0.00']);
		expect(metric(r, 'Interest on shortfall (section 425)')).toBe('₹600.00');
	});

	it('safe harbour: 12% by June and 36% by September means no interest for those dates', () => {
		const r = run({ tax: '100000', tds: '0', interest: true, paid1: '12000', paid2: '36000', paid3: '75000', paid4: '90000' });
		expect(col(r, 'short')).toEqual(['₹3,000.00', '₹9,000.00', '₹0.00', '₹10,000.00']);
		expect(col(r, 'interest')).toEqual(['₹0.00', '₹0.00', '₹0.00', '₹100.00']); // March: 10,000 x 1%
		// just under the harbour: 11,999 -> 3,001 x 3% = 90.03
		const u = run({ tax: '100000', tds: '0', interest: true, paid1: '11999', paid2: '45000', paid3: '75000', paid4: '100000' });
		expect(col(u, 'interest')[0]).toBe('₹90.03');
	});

	it('the 36% harbour does not cover December', () => {
		const r = run({ tax: '100000', tds: '0', interest: true, paid1: '15000', paid2: '45000', paid3: '40000', paid4: '100000' });
		// totals cannot fall -> error
		expect(r.primaryResult).toBe('—');
		const ok = run({ tax: '100000', tds: '0', interest: true, paid1: '15000', paid2: '45000', paid3: '45000', paid4: '100000' });
		expect(col(ok, 'interest')[2]).toBe('₹900.00'); // 30,000 x 3%
	});

	it('presumptive payers pay 1% interest on a March shortfall only', () => {
		const r = run({ tax: '100000', tds: '0', presumptive: true, interest: true, paid4: '60000' });
		expect(col(r, 'interest')).toEqual(['₹400.00']);
	});

	it('no interest when advance tax is not due', () => {
		const r = run({ tax: '30000', tds: '25000', interest: true });
		expect(metric(r, 'Interest on shortfall (section 425)')).toBe('₹0.00');
	});

	it('rejects invalid input', () => {
		expect(run({ tax: '' }).primaryResult).toBe('—');
		expect(run({ tds: 'abc' }).primaryResult).toBe('—');
		expect(run({ tax: '-1' }).primaryResult).toBe('—');
		expect(run({ asOf: 'bad' }).primaryResult).toBe('—');
		expect(run({ interest: true, paid1: '' }).primaryResult).toBe('—');
	});

	it('handles very large values', () => {
		const r = run({ tax: '100000000000', tds: '0' });
		expect(r.primaryResult).toBe('₹1,00,00,00,00,000.00');
	});
});
