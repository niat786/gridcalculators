import { beforeEach, describe, expect, it } from 'vitest';
import calc from './singapore-income-tax-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

// Expected values were computed independently by hand from the band widths: cumulative tax of
// 0 / 200 / 550 / 3,350 / 7,950 / 13,950 / 21,150 / 28,750 / 36,550 / 44,550 / 84,150 / 199,150 at the band tops.
// ($199,150 on $1,000,000 is the published IRAS figure for the 24% threshold.)
const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;
const S = (s: string) => `SGD\u00a0${s}`;
/** Only Earned Income Relief (below 55: $1,000) applies, so income = chargeable + 1,000. */
const chargeableOf = (chargeable: number) => run({ cpf: '0', income: String(chargeable + 1000) });

beforeEach(() => setCurrency('SGD'));

describe('singapore income tax calculator YA 2026', () => {
	it('matches the worked example: $80,000 income, CPF $16,000', () => {
		const r = run();
		expect(r.primaryResult).toBe(S('2,160.00'));
		expect(metric(r, 'Total reliefs allowed')).toBe(S('17,000.00'));
		expect(metric(r, 'Chargeable income')).toBe(S('63,000.00'));
		expect(metric(r, 'Rate on your next dollar')).toBe('7%');
		expect(metric(r, 'Tax per month')).toBe(S('180.00'));
	});

	it('band tops: 20k, 30k, 40k, 80k, 120k, 160k', () => {
		expect(chargeableOf(20_000).primaryResult).toBe(S('0.00'));
		expect(chargeableOf(30_000).primaryResult).toBe(S('200.00'));
		expect(chargeableOf(40_000).primaryResult).toBe(S('550.00'));
		expect(chargeableOf(80_000).primaryResult).toBe(S('3,350.00'));
		expect(chargeableOf(120_000).primaryResult).toBe(S('7,950.00'));
		expect(chargeableOf(160_000).primaryResult).toBe(S('13,950.00'));
	});

	it('band tops: 200k to 500k', () => {
		expect(chargeableOf(200_000).primaryResult).toBe(S('21,150.00'));
		expect(chargeableOf(240_000).primaryResult).toBe(S('28,750.00'));
		expect(chargeableOf(280_000).primaryResult).toBe(S('36,550.00'));
		expect(chargeableOf(320_000).primaryResult).toBe(S('44,550.00'));
		expect(chargeableOf(500_000).primaryResult).toBe(S('84,150.00'));
	});

	it('top bands: $1m chargeable pays 199,150; above $1m is taxed at 24%', () => {
		expect(chargeableOf(1_000_000).primaryResult).toBe(S('199,150.00'));
		const r = chargeableOf(1_100_000);
		expect(r.primaryResult).toBe(S('223,150.00'));
		expect(metric(r, 'Rate on your next dollar')).toBe('24%');
	});

	it('one dollar into a band: $20,001 chargeable pays 2 cents', () => {
		expect(chargeableOf(20_001).primaryResult).toBe(S('0.02'));
	});

	it('Earned Income Relief by age: $1,000, $6,000, $8,000', () => {
		expect(metric(run({ age: 'u55' }), 'Earned Income Relief')).toBe(S('1,000.00'));
		expect(metric(run({ age: 'a55' }), 'Earned Income Relief')).toBe(S('6,000.00'));
		expect(metric(run({ age: 'a60' }), 'Earned Income Relief')).toBe(S('8,000.00'));
		// relief cannot exceed earned income
		const small = run({ income: '500', cpf: '0', age: 'a60' });
		expect(metric(small, 'Earned Income Relief')).toBe(S('500.00'));
		expect(small.primaryResult).toBe(S('0.00'));
	});

	it('total reliefs are capped at $80,000', () => {
		// income 200,000, reliefs claimed far above 80,000, so chargeable income is 120,000 and tax is 7,950
		const r = run({ income: '200000', cpf: '17760', other: '100000' });
		expect(metric(r, 'Total reliefs allowed')).toBe(S('80,000.00'));
		expect(metric(r, 'Chargeable income')).toBe(S('120,000.00'));
		expect(r.primaryResult).toBe(S('7,950.00'));
	});

	it('CPF top-up and SRS reliefs are capped: 8,000 + 8,000 and 15,300', () => {
		const r = run({ cpf: '0', topupSelf: '20000', topupFamily: '9000', srs: '20000' });
		// 1,000 EIR + 8,000 + 8,000 + 15,300 = 32,300
		expect(metric(r, 'Total reliefs allowed')).toBe(S('32,300.00'));
	});

	it('invalid input gives a dash', () => {
		expect(run({ income: '' }).primaryResult).toBe('—');
		expect(run({ income: '-1' }).primaryResult).toBe('—');
		expect(run({ cpf: 'abc' }).primaryResult).toBe('—');
	});
});
