import { describe, expect, it } from 'vitest';
import calc from './tip-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('tip calculator', () => {
	it('uses an 18% tip for one person by default', () => {
		const r = run();
		expect(r.primaryResult).toBe('$59.00');
		expect(r.secondaryMetrics?.[0].value).toBe('$9.00');
		expect(r.secondaryMetrics?.[1].value).toBe('$59.00');
	});

	it('matches the worked example: $84.50 at 20% split three ways', () => {
		const r = run({ bill: '84.5', tipPct: '20', people: '3' });
		expect(r.primaryResult).toBe('$33.80');
		expect(r.secondaryMetrics?.map((m) => m.value)).toEqual(['$16.90', '$101.40', '$5.63', '$33.80']);
	});

	it('rounds each share up to the next whole dollar when asked', () => {
		expect(run({ bill: '84.5', tipPct: '20', people: '3', roundUp: true }).primaryResult).toBe('$34');
	});

	it('handles a zero tip', () => {
		expect(run({ bill: '40', tipPct: '0', people: '2' }).primaryResult).toBe('$20.00');
	});

	it('returns a dash for an empty bill or zero people', () => {
		expect(run({ bill: '' }).primaryResult).toBe('—');
		expect(run({ people: '0' }).primaryResult).toBe('—');
	});
});
