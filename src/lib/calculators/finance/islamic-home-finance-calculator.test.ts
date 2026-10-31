import { beforeEach, describe, expect, it } from 'vitest';
import calc from './islamic-home-finance-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

const run = (over: Record<string, string> = {}) => {
	const r = calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
	// Intl puts a non-breaking space after the currency code; normalise it for comparison.
	return {
		...r,
		primaryResult: r.primaryResult.replace(/ /g, ' '),
		metrics: (r.secondaryMetrics ?? []).map((m) => m.value.replace(/ /g, ' ')),
		rows: (r.table?.rows ?? []).map((row) => Object.fromEntries(Object.entries(row).map(([k, val]) => [k, val.replace(/ /g, ' ')])))
	};
};

// Expected values are hand-computed (node, from the textbook formulas):
//   Murabaha  = financed x (1 + flat x years) / months
//   Diminishing Musharakah / Ijara = financed x r / (1 - (1+r)^-n), r = rate / 12
describe('Islamic home finance calculator', () => {
	beforeEach(() => setCurrency('AED'));

	const base = { price: '1000000', down: '20', years: '25', flat: '3', rent: '5' };

	it('matches the worked example: AED 1,000,000, 20% down, 25 years, 3% flat vs 5% rent', () => {
		const r = run(base);
		expect(r.primaryResult).toBe('AED 4,666.67');
		expect(r.metrics[0]).toBe('AED 4,676.72');
		expect(r.metrics[1]).toBe('AED 600,000.00');
		expect(r.metrics[2]).toBe('AED 603,016.10');
	});

	it('shows the equivalent reducing-balance rate of a flat rate: 3% flat over 25 years = 4.98%', () => {
		expect(run(base).metrics[3]).toBe('4.98%');
	});

	it('names the cheaper structure and by how much: Murabaha by AED 3,016.10', () => {
		expect(run(base).metrics[4]).toBe('Murabaha is cheaper by AED 3,016.10');
	});

	it('another case: AED 500,000, no down payment, 10 years, 4% flat vs 6% rent', () => {
		// Murabaha: 500,000 x 1.4 / 120 = 5,833.33; DM: 5,551.03; flat 4% over 10 years = 7.11% reducing
		const r = run({ price: '500000', down: '0', years: '10', flat: '4', rent: '6' });
		expect(r.primaryResult).toBe('AED 5,833.33');
		expect(r.metrics[0]).toBe('AED 5,551.03');
		expect(r.metrics[3]).toBe('7.11%');
		expect(r.metrics[4]).toBe('Diminishing Musharakah is cheaper by AED 33,876.99');
	});

	it('zero rates: both structures simply repay the financed amount (800,000 / 180 = 4,444.44)', () => {
		const r = run({ price: '1000000', down: '20', years: '15', flat: '0', rent: '0' });
		expect(r.primaryResult).toBe('AED 4,444.44');
		expect(r.metrics[0]).toBe('AED 4,444.44');
		expect(r.metrics[4]).toBe('Same total cost');
	});

	it('first Diminishing Musharakah month is rent on the whole bank share: 800,000 x 5% / 12 = 3,333.33', () => {
		const r = run(base);
		expect(r.rows[6].dm).toBe('AED 3,333.33');
		expect(r.rows[7].dm).toBe('AED 1,343.39');
	});

	it('rejects invalid input', () => {
		expect(run({ price: '0' }).primaryResult).toBe('—');
		expect(run({ down: '100' }).primaryResult).toBe('—');
		expect(run({ years: '0' }).primaryResult).toBe('—');
		expect(run({ flat: '-1' }).primaryResult).toBe('—');
		expect(run({ price: '' }).primaryResult).toBe('—');
	});
});
