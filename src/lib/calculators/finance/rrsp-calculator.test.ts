import { beforeEach, describe, expect, it } from 'vitest';
import calc from './rrsp-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

beforeEach(() => setCurrency('CAD'));

// Expected values computed separately with node from the textbook annuity formula.
describe('rrsp calculator', () => {
	it('matches the worked example', () => {
		const r = run();
		expect(r.primaryResult).toBe('CA$252,784.90');
		expect(metric(r, 'Total contributed (incl. savings)')).toBe('CA$130,000.00');
		expect(metric(r, 'Investment growth')).toBe('CA$122,784.90');
		expect(metric(r, 'Tax refund per year')).toBe('CA$1,830.00');
		expect(metric(r, 'Total refunds over 20 years')).toBe('CA$36,600.00');
		expect(metric(r, 'New 2026 room (18% of earned income)')).toBe('CA$15,300.00');
	});

	it('ordinary annuity: $1,000 a year at 5% for 10 years', () => {
		expect(run({ savings: '0', contribution: '1000', rate: '5', years: '10', marginal: '30' }).primaryResult).toBe('CA$12,577.89');
	});

	it('start-of-year contributions earn one more year of growth', () => {
		expect(run({ savings: '0', contribution: '1000', rate: '5', years: '10', timing: 'start' }).primaryResult).toBe('CA$13,206.79');
	});

	it('zero return just adds up', () => {
		expect(run({ savings: '5000', contribution: '1000', rate: '0', years: '10' }).primaryResult).toBe('CA$15,000.00');
		expect(run({ savings: '25000', contribution: '12000', rate: '4.5', years: '30' }).primaryResult).toBe('CA$825,717.79');
	});

	it('2026 limit: 18% of earned income, capped at $33,810, less pension adjustment, plus carry-forward', () => {
		expect(metric(run({ earned: '100000' }), 'New 2026 room (18% of earned income)')).toBe('CA$18,000.00');
		const capped = run({ earned: '200000', pa: '2000', carry: '5000', contribution: '10000' });
		expect(metric(capped, 'New 2026 room (18% of earned income)')).toBe('CA$33,810.00');
		expect(metric(capped, 'Total 2026 deduction limit')).toBe('CA$36,810.00');
		expect(metric(capped, 'Room left after this year’s contribution')).toBe('CA$26,810.00');
	});

	it('warns when the contribution is above the room', () => {
		expect(run({ earned: '30000', contribution: '9000' }).summary).toMatch(/more than your 2026 room/);
	});

	it('invalid input returns a dash', () => {
		expect(run({ years: '0' }).primaryResult).toBe('—');
		expect(run({ rate: '' }).primaryResult).toBe('—');
		expect(run({ marginal: '-1' }).primaryResult).toBe('—');
	});
});
