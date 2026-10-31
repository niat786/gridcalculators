import { beforeEach, describe, expect, it } from 'vitest';
import calc from './tfsa-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';
import { TFSA_LIMITS, tfsaCumulativeRoom } from '../data/ca-tax-2026';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('CAD'));

// Expected room totals were summed by hand from the CRA limits table (sums checked with node).
describe('tfsa calculator', () => {
	it('matches the worked example: eligible since 2009, $60,000 in, $10,000 out earlier', () => {
		const r = run();
		expect(r.primaryResult).toBe('CA$59,000.00');
		expect(metric(r, 'Total room since you became eligible')).toBe('CA$109,000.00');
		expect(metric(r, 'First year of room')).toBe('2009');
		expect(metric(r, 'Projected balance after 20 years')).toBe('CA$284,527.63');
		expect(metric(r, 'Tax-free growth in projection')).toBe('CA$124,527.63');
	});

	it('cumulative room by starting year', () => {
		expect(tfsaCumulativeRoom(2009)).toBe(109_000);
		expect(tfsaCumulativeRoom(1990)).toBe(109_000); // nothing before 2009
		expect(tfsaCumulativeRoom(2012)).toBe(94_000);
		expect(tfsaCumulativeRoom(2015)).toBe(78_000);
		expect(tfsaCumulativeRoom(2019)).toBe(51_500);
		expect(tfsaCumulativeRoom(2024)).toBe(21_000);
		expect(tfsaCumulativeRoom(2026)).toBe(7_000);
		expect(TFSA_LIMITS[2015]).toBe(10_000);
	});

	it('uses the later of the year you turned 18 and the year you became resident', () => {
		const a = run({ born18: '2015', resident: '2009', contributed: '0', withdrawn: '0' });
		expect(a.primaryResult).toBe('CA$78,000.00');
		const b = run({ born18: '1990', resident: '2019', contributed: '0', withdrawn: '0' });
		expect(b.primaryResult).toBe('CA$51,500.00');
		expect(metric(b, 'First year of room')).toBe('2019');
		expect(run({ born18: '2026', resident: '2009', contributed: '0', withdrawn: '0' }).primaryResult).toBe('CA$7,000.00');
	});

	it('withdrawals add back and over-contribution is flagged', () => {
		expect(run({ born18: '2024', contributed: '5000', withdrawn: '1000' }).primaryResult).toBe('CA$17,000.00');
		const over = run({ born18: '2024', contributed: '30000', withdrawn: '0' });
		expect(over.primaryResult).toBe('CA$0.00');
		expect(over.summary).toMatch(/CA\$9,000.00 more than your room/);
	});

	it('zero return projection just adds up', () => {
		expect(metric(run({ balance: '1000', yearly: '500', rate: '0', years: '10' }), 'Projected balance after 10 years')).toBe('CA$6,000.00');
	});

	it('invalid input returns a dash', () => {
		expect(run({ born18: '1800' }).primaryResult).toBe('—');
		expect(run({ born18: '2030' }).primaryResult).toBe('—');
		expect(run({ years: '' }).primaryResult).toBe('—');
	});
});
