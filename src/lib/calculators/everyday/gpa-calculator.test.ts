import { describe, expect, it } from 'vitest';
import calc from './gpa-calculator.calc';
import { defaultRaw, encodeRows, toValues } from '../../components/calculator/state';
import type { RowsInput, RowValue } from '../types';

const courses = calc.inputs.find((i) => i.id === 'courses') as RowsInput;
const rows = (list: RowValue[]) => encodeRows(courses, list);

const run = (over: Record<string, string | boolean> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('gpa calculator', () => {
	it('matches the worked example: four courses, 13 credits', () => {
		// (3 × 4.0 + 4 × 3.3 + 3 × 3.7 + 3 × 3.0) = 45.3; 45.3 ÷ 13 = 3.48
		const r = run();
		expect(r.primaryResult).toBe('3.48');
		expect(r.secondaryMetrics?.[0].value).toBe('13');
		expect(r.secondaryMetrics?.[1].value).toBe('45.30');
	});

	it('gives 4.00 for all A grades', () => {
		// 15 credits, all 4.0 → 4.00
		const r = run({
			courses: rows([
				{ name: 'A', credits: 5, grade: 'A' },
				{ name: 'B', credits: 5, grade: 'A+' },
				{ name: 'C', credits: 5, grade: 'A' }
			])
		});
		expect(r.primaryResult).toBe('4.00');
	});

	it('weights a minus grade and a failing grade by their credits', () => {
		// A− 3 credits = 11.1; C− 3 credits = 5.1; F 3 credits = 0; 16.2 ÷ 9 = 1.80
		const r = run({
			courses: rows([
				{ name: 'X', credits: 3, grade: 'A-' },
				{ name: 'Y', credits: 3, grade: 'C-' },
				{ name: 'Z', credits: 3, grade: 'F' }
			])
		});
		expect(r.primaryResult).toBe('1.80');
	});

	it('returns a dash when a course has no credits entered', () => {
		expect(run({ courses: rows([{ name: 'Blank', credits: '', grade: 'A' }]) }).primaryResult).toBe('—');
	});
});
