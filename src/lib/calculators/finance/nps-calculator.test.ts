import { beforeEach, describe, expect, it } from 'vitest';
import calc, { minAnnuityPct, npsCorpus } from './nps-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) => calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-10-28'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label.startsWith(label))?.value;
beforeEach(() => setCurrency('INR'));

// Expected values from the future-value-of-an-annuity formula C x ((1+i)^n - 1) / i with i = rate/12, worked out in node.
describe('NPS calculator', () => {
	it('default case: age 30, ₹10,000 a month, 10%, retire at 60 (reproduces the page example)', () => {
		const r = run();
		expect(metric(r, 'Corpus at age 60')).toBe('₹2,26,04,879.25');
		expect(metric(r, 'Lump sum')).toBe('₹1,35,62,927.55');
		expect(metric(r, 'Tax-free part')).toBe('₹1,35,62,927.55');
		expect(metric(r, 'Taxable part')).toBe('₹0.00');
		expect(r.primaryResult).toBe('₹45,209.76');
		expect(metric(r, 'Corpus in today')).toBe('₹52,30,259.29');
		expect(metric(r, 'You contribute')).toBe('₹36,00,000.00');
	});

	it('non-government subscribers cannot go below 20% annuity; 80% lump sum is only 60% tax-free', () => {
		const r = run({ annuityPct: '0' });
		expect(metric(r, 'Annuity share used')).toBe('20%');
		expect(metric(r, 'Lump sum')).toBe('₹1,80,83,903.40');
		expect(metric(r, 'Tax-free part')).toBe('₹1,35,62,927.55');
		expect(metric(r, 'Taxable part')).toBe('₹45,20,975.85');
		expect(r.primaryResult).toBe('₹22,604.88'); // 20% x corpus x 6% / 12
	});

	it('government subscribers keep the 40% minimum', () => {
		const r = run({ type: 'gov', annuityPct: '0' });
		expect(metric(r, 'Annuity share used')).toBe('40%');
		expect(r.primaryResult).toBe('₹45,209.76');
		expect(metric(r, 'Taxable part')).toBe('₹0.00');
	});

	it('a small non-government corpus (up to ₹8 lakh) can be taken entirely as a lump sum', () => {
		// 3,000 a month, 8%, 10 years: 3000 x ((1+0.08/12)^120 - 1)/(0.08/12) = 5,48,838.11
		const r = run({ monthly: '3000', return: '8', age: '50', annuityPct: '0' });
		expect(metric(r, 'Corpus at age 60')).toBe('₹5,48,838.11');
		expect(metric(r, 'Lump sum')).toBe('₹5,48,838.11');
		expect(metric(r, 'Tax-free part')).toBe('₹3,29,302.86'); // 60%
		expect(r.primaryResult).toBe('₹0.00');
	});

	it('starting corpus plus contributions', () => {
		// 5,00,000 x (1+0.08/12)^240 + 5000 x ((1+0.08/12)^240 - 1)/(0.08/12) = 54,08,503.46
		const r = run({ opening: '500000', monthly: '5000', return: '8', age: '40' });
		expect(metric(r, 'Corpus at age 60')).toBe('₹54,08,503.46');
		expect(run({ opening: '500000', monthly: '0', return: '0', age: '40' }).secondaryMetrics![0].value).toBe('₹5,00,000.00');
	});

	it('yearly increase in the contribution', () => {
		// sum over years k=1..10 of 10000 x 1.1^(k-1) x FV of 12 monthly payments grown to year 10 = 30,20,679.64
		const r = run({ age: '50', stepup: '10' });
		expect(metric(r, 'Corpus at age 60')).toBe('₹30,20,679.64');
		expect(npsCorpus(0, 10000, 10, 10, 10).corpus).toBeCloseTo(3020679.64, 1);
	});

	it('retiring later than 60 gives more years', () => {
		// 10,000 x ((1+0.1/12)^120 - 1)/(0.1/12) = 20,48,449.79 for 10 years
		const r = run({ retire: '65', age: '55' });
		expect(metric(r, 'Corpus at age 65')).toBe('₹20,48,449.79');
	});

	it('minimum annuity rules', () => {
		expect(minAnnuityPct('nongov', 800_000)).toBe(0);
		expect(minAnnuityPct('nongov', 800_001)).toBe(20);
		expect(minAnnuityPct('gov', 1)).toBe(40);
	});

	it('rejects invalid input', () => {
		expect(run({ retire: '59' }).primaryResult).toBe('—');
		expect(run({ age: '60' }).primaryResult).toBe('—');
		expect(run({ age: '17' }).primaryResult).toBe('—');
		expect(run({ retire: '86' }).primaryResult).toBe('—');
		expect(run({ monthly: '0', opening: '0' }).primaryResult).toBe('—');
		expect(run({ monthly: '' }).primaryResult).toBe('—');
		expect(run({ return: '-1' }).primaryResult).toBe('—');
		expect(run({ age: '30.5' }).primaryResult).toBe('—');
	});

	it('handles large contributions', () => {
		const r = run({ monthly: '100000000', return: '0', annuityPct: '100' });
		expect(metric(r, 'Corpus at age 60')).toBe('₹36,00,00,00,000.00');
	});
});
