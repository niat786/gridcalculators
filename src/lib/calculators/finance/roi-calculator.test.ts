import { describe, expect, it } from 'vitest';
import calc from './roi-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('roi calculator', () => {
	it('$10,000 to $14,000 over 1 year (default) gives 40% ROI and $4,000 gain', () => {
		const r = run();
		expect(r.primaryResult).toBe('40%');
		expect(metric(r, 'Gain or loss')).toBe('$4,000.00');
		expect(metric(r, 'Annualized ROI')).toBe('40%');
	});

	it('$10,000 to $14,000 over 2 years gives 18.32% annualized ROI (worked example)', () => {
		const r = run({ years: '2' });
		expect(r.primaryResult).toBe('40%');
		expect(metric(r, 'Annualized ROI')).toBe('18.32%');
	});

	it('a loss: $5,000 to $4,000 over 3 years gives -20% ROI and -7.17% a year', () => {
		const r = run({ invested: '5000', returned: '4000', years: '3' });
		expect(r.primaryResult).toBe('-20%');
		expect(metric(r, 'Gain or loss')).toBe('-$1,000.00');
		expect(metric(r, 'Annualized ROI')).toBe('-7.17%');
	});

	it('a blank length is treated as 1 year: $1,000 to $2,000 gives 100%', () => {
		const r = run({ invested: '1000', returned: '2000', years: '' });
		expect(r.primaryResult).toBe('100%');
		expect(metric(r, 'Annualized ROI')).toBe('100%');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ invested: '0' }).primaryResult).toBe('—');
		expect(run({ invested: 'abc' }).primaryResult).toBe('—');
		expect(run({ returned: '-5' }).primaryResult).toBe('—');
		expect(run({ years: '0' }).primaryResult).toBe('—');
	});
});
