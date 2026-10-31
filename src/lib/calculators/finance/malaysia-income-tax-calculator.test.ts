import { beforeEach, describe, expect, it } from 'vitest';
import calc from './malaysia-income-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

// Expected values were computed independently with a separate node script using the cumulative tax at each band
// (0, 150, 600, 1,500, 3,700, 9,400, 84,400, 136,400, 528,400), not by calling the code under test.
const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
/** Only the RM9,000 individual relief applies. */
const bare = { epf: '0', life: '0', socso: '0', lifestyle: '0' };

beforeEach(() => setCurrency('MYR'));

describe('malaysia income tax calculator YA 2026', () => {
	it('matches the worked example: RM72,000 income with default reliefs', () => {
		const r = run();
		expect(r.primaryResult).toBe('MYR\u00a01,846.50');
		expect(metric(r, 'Total reliefs')).toBe('MYR\u00a018,850.00');
		expect(metric(r, 'Chargeable income')).toBe('MYR\u00a053,150.00');
		expect(metric(r, 'Tax before rebates')).toBe('MYR\u00a01,846.50');
		expect(metric(r, 'RM400 rebate')).toBe('MYR\u00a00.00');
		expect(metric(r, 'Rate on your next ringgit')).toBe('11%');
	});

	it('chargeable income of exactly RM35,000 gets the RM400 rebate: 600 - 400 = 200', () => {
		const r = run({ ...bare, income: '44000' });
		expect(metric(r, 'Chargeable income')).toBe('MYR\u00a035,000.00');
		expect(metric(r, 'Tax before rebates')).toBe('MYR\u00a0600.00');
		expect(r.primaryResult).toBe('MYR\u00a0200.00');
	});

	it('one ringgit above RM35,000 loses the rebate: tax is 600.06', () => {
		const r = run({ ...bare, income: '44001' });
		expect(r.primaryResult).toBe('MYR\u00a0600.06');
		expect(metric(r, 'RM400 rebate')).toBe('MYR\u00a00.00');
	});

	it('band boundaries: 20,000 -> 150; 70,000 -> 3,700; 100,000 -> 9,400; 150,000 -> 21,900', () => {
		expect(run({ ...bare, income: '29000' }).primaryResult).toBe('MYR\u00a00.00'); // 20,000 chargeable: 150 tax, less 400 rebate
		expect(metric(run({ ...bare, income: '29000' }), 'Tax before rebates')).toBe('MYR\u00a0150.00');
		expect(run({ ...bare, income: '79000' }).primaryResult).toBe('MYR\u00a03,700.00');
		expect(run({ ...bare, income: '109000' }).primaryResult).toBe('MYR\u00a09,400.00');
		expect(run({ ...bare, income: '159000' }).primaryResult).toBe('MYR\u00a021,900.00');
	});

	it('top bands: RM2m chargeable -> 528,400; RM3m chargeable -> 828,400 at 30%', () => {
		expect(run({ ...bare, income: '2009000' }).primaryResult).toBe('MYR\u00a0528,400.00');
		const r = run({ ...bare, income: '3009000' });
		expect(r.primaryResult).toBe('MYR\u00a0828,400.00');
		expect(metric(r, 'Rate on your next ringgit')).toBe('30%');
	});

	it('zakat is a ringgit-for-ringgit rebate and cannot take tax below zero', () => {
		expect(run({ zakat: '500' }).primaryResult).toBe('MYR\u00a01,346.50');
		const big = run({ zakat: '5000' });
		expect(big.primaryResult).toBe('MYR\u00a00.00');
		expect(metric(big, 'Zakat rebate')).toBe('MYR\u00a01,846.50');
	});

	it('reliefs are capped: EPF 10,000 counts as 4,000 and life insurance 5,000 as 3,000', () => {
		const r = run({ epf: '10000', life: '5000' });
		expect(metric(r, 'Total reliefs')).toBe('MYR\u00a018,850.00');
	});

	it('spouse, 2 children and 1 child in higher education add 4,000 + 4,000 + 8,000 of relief', () => {
		const r = run({ spouse: true, kids: '2', kidsHigher: '1' });
		expect(metric(r, 'Total reliefs')).toBe('MYR\u00a034,850.00');
		expect(metric(r, 'Chargeable income')).toBe('MYR\u00a037,150.00');
		expect(r.primaryResult).toBe('MYR\u00a0729.00'); // 600 + 6% x 2,150
	});

	it('disabled individual adds RM7,000 of relief', () => {
		expect(metric(run({ disabled: true }), 'Total reliefs')).toBe('MYR\u00a025,850.00');
	});

	it('reliefs larger than income give zero tax, and invalid input gives a dash', () => {
		const r = run({ income: '10000' });
		expect(r.primaryResult).toBe('MYR\u00a00.00');
		expect(metric(r, 'Chargeable income')).toBe('MYR\u00a00.00');
		expect(run({ income: '' }).primaryResult).toBe('—');
		expect(run({ income: '-5' }).primaryResult).toBe('—');
		expect(run({ epf: 'abc' }).primaryResult).toBe('—');
	});
});
