import { describe, expect, it } from 'vitest';
import calc from './roth-ira-calculator.calc';
import { rothAllowed } from '../data/ira-math';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('Roth IRA calculator', () => {
	it('gives the full limit below the phase-out', () => {
		expect(run().primaryResult).toBe('$7,500');
		expect(run({ age: '55' }).primaryResult).toBe('$8,600');
	});
	it('matches the worked phase-out example', () => {
		expect(rothAllowed('single', 160500, 30)).toBe(3750);
		expect(run({ magi: '160500' }).primaryResult).toBe('$3,750');
	});
	it('rounds up to $10 and keeps a $200 minimum', () => {
		expect(rothAllowed('single', 155001, 30)).toBe(6500); // 7500 − 7500×2001/15000 = 6499.5 → 6500
		expect(rothAllowed('mfj', 251900, 30)).toBe(200); // 75 → $200 minimum
	});
	it('gives zero above the range', () => {
		expect(run({ status: 'mfj', magi: '260000' }).primaryResult).toBe('$0');
	});
	it('rejects bad ages', () => {
		expect(run({ retire: '20' }).primaryResult).toBe('—');
	});
});
