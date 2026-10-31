import { describe, expect, it } from 'vitest';
import calc from './rent-vs-buy-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (result: ReturnType<typeof run>, label: string) =>
	result.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('rent vs buy calculator', () => {
	it('matches the worked example: 10 years, $400,000 home, 20% down, 6.5%, against $2,000 rent', () => {
		const r = run({ years: '10' });
		expect(r.primaryResult).toBe('Buying');
		expect(r.primaryLabel).toBe('Cheaper over 10 years');
		expect(metric(r, 'Buying net cost')).toBe('$199,982');
		expect(metric(r, 'Renting net cost')).toBe('$224,822');
		expect(metric(r, 'Difference')).toBe('$24,840');
		expect(metric(r, 'Break-even year')).toBe('Year 8');
		expect(metric(r, 'Monthly principal and interest')).toBe('$2,022.62');
		expect(r.summary).toBe('Over 10 years, buying costs $24,840 less than renting.');
		expect(r.table?.rows).toHaveLength(10);
	});

	it('finds renting cheaper over 5 years when prices are flat and rent is low', () => {
		const r = run({
			years: '5',
			price: '300000',
			down: '10',
			rate: '7',
			tax: '1.5',
			appreciation: '0',
			rent: '1200',
			rentIncrease: '3',
			invest: '6'
		});
		expect(r.primaryResult).toBe('Renting');
		expect(metric(r, 'Buying net cost')).toBe('$154,934');
		expect(metric(r, 'Renting net cost')).toBe('$66,305');
		expect(metric(r, 'Difference')).toBe('$88,630');
		expect(metric(r, 'Break-even year')).toBe('Not within 5 years');
	});

	it('stops mortgage payments after a 15-year term within a 20-year comparison', () => {
		const r = run({ years: '20', term: '15', rate: '5' });
		expect(r.primaryResult).toBe('Buying');
		expect(metric(r, 'Buying net cost')).toBe('$112,110');
		expect(metric(r, 'Renting net cost')).toBe('$512,625');
		expect(metric(r, 'Break-even year')).toBe('Year 4');
	});

	it('returns a dash when the years are missing', () => {
		expect(run({ years: '' }).primaryResult).toBe('—');
		expect(run({ price: '' }).primaryResult).toBe('—');
	});
});
