import { describe, expect, it } from 'vitest';
import calc from './matrix-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const cells = (r: ReturnType<typeof run>) =>
	(r.table?.rows ?? []).map((row) => Object.entries(row).filter(([k]) => k !== 'row').map(([, v]) => v));

describe('matrix calculator', () => {
	it('multiplies [[1, 2], [3, 4]] by [[5, 6], [7, 8]] to get [[19, 22], [43, 50]]', () => {
		const r = run({ a: '1 2\n3 4', b: '5 6\n7 8', op: 'multiply' });
		expect(cells(r)).toEqual([
			['19', '22'],
			['43', '50']
		]);
		expect(r.long).toBe(true);
		expect(r.table?.columns.map((c) => c.label)).toEqual(['Row', 'c1', 'c2']);
	});

	it('multiplies the default 3 × 3 matrices to get [[2, 1, 7], [5, 3, 12], [16, 1, 7]]', () => {
		expect(cells(run())).toEqual([
			['2', '1', '7'],
			['5', '3', '12'],
			['16', '1', '7']
		]);
	});

	it('finds the determinant of the default matrix A as 18', () => {
		const r = run({ op: 'determinant' });
		expect(r.primaryResult).toBe('18');
		expect(r.long).toBeFalsy();
	});

	it('finds the determinant of [[1, 2], [3, 4]] as −2', () => {
		expect(run({ a: '1 2\n3 4', op: 'determinant' }).primaryResult).toBe('-2');
	});

	it('inverts [[4, 7], [2, 6]] to [[0.6, −0.7], [−0.2, 0.4]]', () => {
		expect(cells(run({ a: '4 7\n2 6', op: 'inverse' }))).toEqual([
			['0.6', '-0.7'],
			['-0.2', '0.4']
		]);
	});

	it('inverts the default 3 × 3 matrix, with 0.611111 in the first cell', () => {
		const rows = cells(run({ op: 'inverse' }));
		expect(rows[0]).toEqual(['0.611111', '-0.222222', '0.055556']);
		expect(rows[2]).toEqual(['0.055556', '-0.111111', '0.277778']);
	});

	it('returns a dash for the inverse of a singular matrix', () => {
		const r = run({ a: '1 2\n2 4', op: 'inverse' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toContain('singular');
	});

	it('transposes a 1 × 3 row into a 3 × 1 column', () => {
		const r = run({ a: '1 2 3', op: 'transpose' });
		expect(cells(r)).toEqual([['1'], ['2'], ['3']]);
		expect(r.secondaryMetrics?.[2].value).toBe('3 × 1');
	});

	it('adds and subtracts two 2 × 2 matrices', () => {
		expect(cells(run({ a: '1 2\n3 4', b: '4 3\n2 1', op: 'add' }))).toEqual([
			['5', '5'],
			['5', '5']
		]);
		expect(cells(run({ a: '1 2\n3 4', b: '4 3\n2 1', op: 'subtract' }))).toEqual([
			['-3', '-1'],
			['1', '3']
		]);
	});

	it('scales [[1, 2], [3, 4]] by −0.5 to [[−0.5, −1], [−1.5, −2]]', () => {
		expect(cells(run({ a: '1 2\n3 4', op: 'scale', scalar: '-0.5' }))).toEqual([
			['-0.5', '-1'],
			['-1.5', '-2']
		]);
	});

	it('returns a dash when the multiply sizes do not match', () => {
		const r = run({ a: '1 2\n3 4', b: '1 2 3\n4 5 6\n7 8 9', op: 'multiply' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toContain('columns of A must match');
	});

	it('returns a dash when add sizes do not match', () => {
		expect(run({ a: '1 2\n3 4', b: '1 2 3', op: 'add' }).primaryResult).toBe('—');
	});

	it('returns a dash for text that is not a number', () => {
		expect(run({ a: '1 x\n3 4', op: 'determinant' }).primaryResult).toBe('—');
	});

	it('returns a dash for uneven rows and for more than 6 rows', () => {
		expect(run({ a: '1 2\n3', op: 'transpose' }).primaryResult).toBe('—');
		expect(run({ a: '1\n2\n3\n4\n5\n6\n7', op: 'transpose' }).primaryResult).toBe('—');
	});
});
