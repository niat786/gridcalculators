import { describe, expect, it } from 'vitest';
import calc from './molecular-weight-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const row = (r: ReturnType<typeof run>, element: string) => r.table?.rows.find((x) => x.element === element);

describe('molecular weight calculator', () => {
	it('gives H2O 18.015 g/mol', () => {
		const r = run({ formula: 'H2O' });
		expect(r.primaryResult).toBe('18.015 g/mol');
		expect(row(r, 'H')).toEqual({ element: 'H', count: '2', mass: '1.008', percent: '11.19%' });
		expect(row(r, 'O')?.count).toBe('1');
	});

	it('gives NaCl 58.44 g/mol', () => {
		expect(run({ formula: 'NaCl' }).primaryResult).toBe('58.44 g/mol');
	});

	it('gives C6H12O6 180.156 g/mol, with the default C first and H second in the table', () => {
		const r = run();
		expect(r.primaryResult).toBe('180.156 g/mol');
		expect(r.table?.rows.map((x) => x.element)).toEqual(['C', 'H', 'O']);
		expect(r.secondaryMetrics?.[1].value).toBe('24');
	});

	it('gives CuSO4·5H2O 249.677 g/mol, and the same with * as the separator', () => {
		expect(run({ formula: 'CuSO4·5H2O' }).primaryResult).toBe('249.677 g/mol');
		expect(run({ formula: 'CuSO4*5H2O' }).primaryResult).toBe('249.677 g/mol');
		expect(run({ formula: 'CuSO4·5H2O' }).secondaryMetrics?.[0].value).toBe('4');
	});

	it('expands the bracket in Ca(OH)2 to 74.092 g/mol', () => {
		const r = run({ formula: 'Ca(OH)2' });
		expect(r.primaryResult).toBe('74.092 g/mol');
		expect(row(r, 'O')?.count).toBe('2');
	});

	it('handles nested brackets and subscript digits: (NH₄)₂SO₄ is 132.134 g/mol', () => {
		expect(run({ formula: '(NH₄)₂SO₄' }).primaryResult).toBe('132.134 g/mol');
		expect(run({ formula: '((NH4)2)2' }).primaryResult).toBe('72.156 g/mol');
	});

	it('gives UO2 270.028 g/mol, which covers the heavy elements in the table', () => {
		expect(run({ formula: 'UO2' }).primaryResult).toBe('270.028 g/mol');
	});

	it('returns a dash for a lower-case element symbol', () => {
		const r = run({ formula: 'h2o' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toContain('capital letter');
	});

	it('returns a dash for an unknown element, an open bracket or an empty formula', () => {
		expect(run({ formula: 'Xx2' }).primaryResult).toBe('—');
		expect(run({ formula: 'Ca(OH' }).primaryResult).toBe('—');
		expect(run({ formula: 'C6H12O6)' }).primaryResult).toBe('—');
		expect(run({ formula: '   ' }).primaryResult).toBe('—');
	});
});
