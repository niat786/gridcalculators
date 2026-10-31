import { describe, expect, it } from 'vitest';
import calc, { finalNeeded, letterFor } from './grade-calculator.calc';
import { defaultRaw, encodeRows, toValues } from '../../components/calculator/state';
import type { RowsInput, RowValue } from '../types';

const grades = calc.inputs.find((i) => i.id === 'grades') as RowsInput;
const rows = (list: RowValue[]) => encodeRows(grades, list);

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('grade calculator', () => {
	it('gets the weighted average of the default assignments', () => {
		// (85×20 + 92×15 + 78×25 + 90×20) ÷ 80 = 6830 ÷ 80 = 85.375 → 85.38%, letter B
		const r = run();
		expect(r.primaryResult).toBe('85.38%');
		expect(r.secondaryMetrics?.[0].value).toBe('B');
		expect(r.secondaryMetrics?.[1].value).toBe('80%');
	});

	it('uses the weights directly when they add up to 100', () => {
		// (80×50 + 60×50) ÷ 100 = 70 → 70%, letter C
		const r = run({
			grades: rows([
				{ name: 'Coursework', grade: 80, weight: 50 },
				{ name: 'Exam', grade: 60, weight: 50 }
			])
		});
		expect(r.primaryResult).toBe('70%');
		expect(r.secondaryMetrics?.[0].value).toBe('C');
	});

	it('works out the score needed on the final: 88% now, 90% target, 20% weight', () => {
		// (90 − 88 × 0.8) ÷ 0.2 = 98
		const r = run({ mode: 'final', current: '88', desired: '90', finalWeight: '20' });
		expect(r.primaryResult).toBe('98%');
	});

	it('gives 85% when you already sit at your target: 85% now, 85% target, 30% weight', () => {
		// (85 − 85 × 0.7) ÷ 0.3 = 85
		expect(run({ mode: 'final', current: '85', desired: '85', finalWeight: '30' }).primaryResult).toBe('85%');
	});

	it('says when the target is out of reach (114% needed)', () => {
		// (90 − 82 × 0.75) ÷ 0.25 = 114
		const r = run({ mode: 'final', current: '82', desired: '90', finalWeight: '25' });
		expect(r.primaryResult).toBe('114%');
		expect(r.summary).toMatch(/above 100%/);
	});

	it('maps grades to letters and computes the final directly', () => {
		expect(letterFor(90)).toBe('A');
		expect(letterFor(79.9)).toBe('C');
		expect(finalNeeded(88, 90, 20)).toBeCloseTo(98, 9);
	});

	it('returns a dash for a missing weight or a zero final weight', () => {
		expect(run({ grades: rows([{ name: 'X', grade: 90, weight: '' }]) }).primaryResult).toBe('—');
		expect(run({ mode: 'final', finalWeight: '0' }).primaryResult).toBe('—');
	});
});
