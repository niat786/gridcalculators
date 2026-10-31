import { defineCalculator, type CalculationResult, type InputValues, type Table } from '../types';
import { DASH, num } from '../format';
import meta from './matrix-calculator.meta';

const MAX_SIZE = 6;
const NBSP = ' ';

type Matrix = number[][];

const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Result', summary });

/** Reads "1 2 3" or "1, 2, 3" per line. Returns the matrix or an error message naming the matrix. */
function parseMatrix(raw: string, name: string): Matrix | string {
	const lines = raw
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l !== '');
	if (lines.length === 0) return `Enter the rows of matrix ${name}, one row per line.`;
	if (lines.length > MAX_SIZE) return `Matrix ${name} has ${lines.length} rows. The limit is ${MAX_SIZE}.`;
	const rows: Matrix = [];
	for (const line of lines) {
		const tokens = line.split(/[\s,]+/).filter((t) => t !== '');
		const row = tokens.map((t) => Number(t));
		const bad = tokens.find((t, i) => !Number.isFinite(row[i]));
		if (bad !== undefined) return `Matrix ${name} has a value that is not a number: “${bad}”.`;
		if (row.length > MAX_SIZE) return `Matrix ${name} has ${row.length} columns. The limit is ${MAX_SIZE}.`;
		rows.push(row);
	}
	const cols = rows[0].length;
	const ragged = rows.findIndex((r) => r.length !== cols);
	if (ragged !== -1) {
		return `Matrix ${name} is uneven: row 1 has ${cols} numbers and row ${ragged + 1} has ${rows[ragged].length}. Every row needs the same count.`;
	}
	return rows;
}

const dims = (m: Matrix): string => `${m.length} × ${m[0].length}`;

/** Treat tiny floating-point noise as zero so results never show −0 or 1e-16. */
const clean = (x: number): number => (Math.abs(x) < 1e-12 ? 0 : x);
const fmt = (x: number): string => num(clean(x), 6);

function multiply(a: Matrix, b: Matrix): Matrix {
	return a.map((row) =>
		Array.from({ length: b[0].length }, (_, j) => row.reduce((acc, x, k) => acc + x * b[k][j], 0))
	);
}

function transpose(m: Matrix): Matrix {
	return m[0].map((_, j) => m.map((row) => row[j]));
}

/** Determinant by Gaussian elimination with partial pivoting. */
function determinant(m: Matrix): number {
	const a = m.map((r) => [...r]);
	const n = a.length;
	let det = 1;
	for (let k = 0; k < n; k++) {
		let p = k;
		for (let i = k + 1; i < n; i++) if (Math.abs(a[i][k]) > Math.abs(a[p][k])) p = i;
		if (a[p][k] === 0) return 0;
		if (p !== k) {
			[a[p], a[k]] = [a[k], a[p]];
			det = -det;
		}
		det *= a[k][k];
		for (let i = k + 1; i < n; i++) {
			const f = a[i][k] / a[k][k];
			for (let j = k; j < n; j++) a[i][j] -= f * a[k][j];
		}
	}
	return det;
}

/**
 * Inverse by Gauss–Jordan elimination with partial pivoting. Returns null when the matrix is
 * singular (a pivot is zero to within rounding), because then no inverse exists.
 */
function inverse(m: Matrix): Matrix | null {
	const n = m.length;
	const scale = Math.max(1, ...m.flat().map(Math.abs));
	const a = m.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
	for (let k = 0; k < n; k++) {
		let p = k;
		for (let i = k + 1; i < n; i++) if (Math.abs(a[i][k]) > Math.abs(a[p][k])) p = i;
		if (Math.abs(a[p][k]) < 1e-12 * scale) return null;
		[a[p], a[k]] = [a[k], a[p]];
		const pivot = a[k][k];
		for (let j = 0; j < 2 * n; j++) a[k][j] /= pivot;
		for (let i = 0; i < n; i++) {
			if (i === k) continue;
			const f = a[i][k];
			for (let j = 0; j < 2 * n; j++) a[i][j] -= f * a[k][j];
		}
	}
	return a.map((r) => r.slice(n));
}

/** Plain-text grid: non-breaking spaces keep columns lined up even where the browser collapses line breaks. */
function gridText(m: Matrix): string {
	const cells = m.map((r) => r.map(fmt));
	const widths = cells[0].map((_, j) => Math.max(...cells.map((r) => r[j].length)));
	return cells
		.map((r) => `[${r.map((c, j) => NBSP.repeat(widths[j] - c.length) + c).join(NBSP.repeat(2))}]`)
		.join('\n');
}

function gridTable(m: Matrix): Table {
	return {
		title: 'Result as a table',
		columns: [
			{ key: 'row', label: 'Row' },
			...m[0].map((_, j) => ({ key: `c${j + 1}`, label: `c${j + 1}`, align: 'end' as const }))
		],
		rows: m.map((r, i) => {
			const row: Record<string, string> = { row: `r${i + 1}` };
			r.forEach((x, j) => (row[`c${j + 1}`] = fmt(x)));
			return row;
		})
	};
}

const NEEDS_B = ['add', 'subtract', 'multiply'];

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'a',
			label: 'Matrix A',
			type: 'text',
			multiline: true,
			monospace: true,
			default: '2 1 0\n1 3 1\n0 1 4',
			maxLength: 600,
			pattern: /^[\s\d.,+\-]*$/,
			patternMessage: 'Use numbers, spaces, commas, decimal points and minus signs. One row per line.',
			help: 'One row per line. Separate numbers with spaces or commas. Up to 6 × 6.'
		},
		{
			id: 'b',
			label: 'Matrix B',
			type: 'text',
			multiline: true,
			monospace: true,
			default: '1 0 2\n0 1 3\n4 0 1',
			maxLength: 600,
			pattern: /^[\s\d.,+\-]*$/,
			patternMessage: 'Use numbers, spaces, commas, decimal points and minus signs. One row per line.',
			help: 'Used for add, subtract and multiply.',
			visibleWhen: (v: InputValues) => NEEDS_B.includes(String(v.op))
		},
		{
			id: 'op',
			label: 'Operation',
			type: 'select',
			display: 'menu',
			default: 'multiply',
			options: [
				{ label: 'A + B', value: 'add' },
				{ label: 'A − B', value: 'subtract' },
				{ label: 'A × B', value: 'multiply' },
				{ label: 'Transpose of A (Aᵀ)', value: 'transpose' },
				{ label: 'Determinant of A', value: 'determinant' },
				{ label: 'Inverse of A (A⁻¹)', value: 'inverse' },
				{ label: 'A × scalar', value: 'scale' }
			]
		},
		{
			id: 'scalar',
			label: 'Scalar (k)',
			type: 'number',
			default: 2,
			help: 'Every entry of A is multiplied by this number.',
			visibleWhen: (v: InputValues) => v.op === 'scale'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const op = String(v.op);
		const a = parseMatrix(String(v.a), 'A');
		if (typeof a === 'string') return fail(a);
		const sizeA = dims(a);

		if (op === 'transpose') {
			const t = transpose(a);
			return matrixResult('Transpose of A', t, sizeA, 'Not used');
		}
		if (op === 'determinant') {
			if (a.length !== a[0].length) {
				return fail(`The determinant needs a square matrix. A is ${sizeA}, so enter the same number of rows and columns.`);
			}
			const d = clean(determinant(a));
			return {
				primaryResult: fmt(d),
				primaryLabel: 'Determinant of A',
				summary:
					d === 0
						? 'The determinant is 0, so this matrix has no inverse.'
						: 'A non-zero determinant means the matrix has an inverse.',
				secondaryMetrics: [
					{ label: 'Size of A', value: sizeA },
					{ label: 'Size of B', value: 'Not used' },
					{ label: 'Result size', value: 'Single number' }
				]
			};
		}
		if (op === 'inverse') {
			if (a.length !== a[0].length) {
				return fail(`An inverse needs a square matrix. A is ${sizeA}, so enter the same number of rows and columns.`);
			}
			const inv = inverse(a);
			if (inv === null) {
				return {
					primaryResult: DASH,
					primaryLabel: 'Inverse of A',
					summary:
						'This matrix is singular: its determinant is zero, so no inverse exists. Check that the rows are not multiples of each other.',
					secondaryMetrics: [
						{ label: 'Size of A', value: sizeA },
						{ label: 'Size of B', value: 'Not used' },
						{ label: 'Result size', value: 'None' }
					]
				};
			}
			return matrixResult('Inverse of A', inv, sizeA, 'Not used');
		}
		if (op === 'scale') {
			const k = Number(v.scalar);
			if (!Number.isFinite(k)) return fail('Enter a scalar number.');
			return matrixResult(
				`A × ${fmt(k)}`,
				a.map((r) => r.map((x) => x * k)),
				sizeA,
				'Not used'
			);
		}

		if (!NEEDS_B.includes(op)) return fail('Choose an operation.');
		const b = parseMatrix(String(v.b), 'B');
		if (typeof b === 'string') return fail(b);
		const sizeB = dims(b);

		if (op === 'multiply') {
			if (a[0].length !== b.length) {
				return fail(
					`To multiply, the columns of A must match the rows of B. A is ${sizeA} and B is ${sizeB}. Make A's columns equal to B's rows.`
				);
			}
			return matrixResult('A × B', multiply(a, b), sizeA, sizeB);
		}
		if (sizeA !== sizeB) {
			return fail(`To ${op === 'add' ? 'add' : 'subtract'}, A and B must be the same size. A is ${sizeA} and B is ${sizeB}.`);
		}
		const sign = op === 'add' ? 1 : -1;
		return matrixResult(
			op === 'add' ? 'A + B' : 'A − B',
			a.map((r, i) => r.map((x, j) => x + sign * b[i][j])),
			sizeA,
			sizeB
		);
	},
	content: {
		intro:
			'This matrix calculator adds, subtracts and multiplies matrices. It also finds the transpose, the determinant, the inverse and a scalar multiple, for matrices up to 6 × 6. Enter one row per line.',
		howTo: [
			'Enter matrix A, one row per line, with the numbers separated by spaces or commas.',
			'For add, subtract or multiply, enter matrix B too. Check that its size fits the operation.',
			'Choose the operation. For a scalar multiple, enter the number k.',
			'Read the result grid, and check the size and the summary below it.'
		],
		about: [
			{
				heading: 'What is a matrix?',
				paragraphs: [
					'A matrix is a rectangular grid of numbers arranged in rows and columns. Its size is written as rows × columns, so a matrix with 2 rows and 3 columns is a 2 × 3 matrix.',
					'Each number is called an entry. The entry in row 1, column 2 is written a₁₂. Matrices are used to store data tables, to solve sets of equations and to describe transformations such as rotating or stretching a shape.',
					'Matrices follow their own rules. For example, A × B usually does not equal B × A, so the order of multiplication matters. For plain distances between two points, the [distance calculator](/distance-calculator) is simpler.'
				]
			},
			{
				heading: 'How the operations work',
				paragraphs: [
					'To add or subtract two matrices, they must be the same size. You add or subtract the entries in the same position. For example, the entry in row 1, column 1 of A + B is a₁₁ + b₁₁.',
					'To multiply A by B, the number of columns in A must equal the number of rows in B. Each entry of the result is the dot product of a row of A and a column of B. Multiply the pairs, then add the products. The result has the rows of A and the columns of B.',
					'Also, the transpose swaps rows and columns. A scalar multiple multiplies every entry by the same number k. Both keep the size of the matrix, except the transpose, which swaps its rows and columns.'
				],
				table: {
					caption: 'Matrix sizes needed for each operation',
					columns: ['Operation', 'Size rule', 'Result size'],
					rows: [
						['A + B or A − B', 'A and B must be the same size', 'Same as A'],
						['A × B', 'Columns of A = rows of B', 'Rows of A × columns of B'],
						['Aᵀ (transpose)', 'Any size', 'Columns of A × rows of A'],
						['k × A', 'Any size', 'Same as A'],
						['det(A) or A⁻¹', 'A must be square', 'One number, or the same size as A']
					]
				}
			},
			{
				heading: 'Determinant and inverse',
				paragraphs: [
					'The determinant is a single number that describes a square matrix. For a 2 × 2 matrix [[a, b], [c, d]], it is ad − bc. For larger matrices, it is found by elimination or by expanding along a row. If the determinant is zero, the matrix is singular.',
					'The inverse of A, written A⁻¹, is the matrix that undoes A. For example, it reverses a transformation. Multiplying A by its inverse gives the identity matrix, which has 1s on the diagonal and 0s elsewhere. A singular matrix has no inverse, because the division would be by zero.',
					'For a 2 × 2 matrix, the inverse is (1 ÷ det) multiplied by the matrix [[d, −b], [−c, a]]. The absolute value of the determinant also gives the area scaling of a transformation, which is why it links to the [area calculator](/area-calculator).'
				]
			},
			{
				heading: 'Tips for entering matrices',
				paragraphs: ['Most errors come from the layout of the numbers rather than the arithmetic. These checks help:'],
				list: [
					'**Count the columns in each row.** Every row needs the same number of entries.',
					'**Use the right size for B.** For A × B, the columns of A must match the rows of B.',
					'**Use square matrices for determinants.** Determinants and inverses need the same number of rows and columns.',
					'**Watch for multiples.** If one row is a multiple of another, the determinant is zero.',
					'**Use the determinant to test a system.** A non-zero determinant means a 2 × 2 system of linear equations has exactly one solution. For equations with x², try the [quadratic formula calculator](/quadratic-formula-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Matrix product',
				expression: '(AB)ᵢⱼ = Σₖ aᵢₖ × bₖⱼ',
				variables: [
					{ symbol: 'i, j', meaning: 'the row and column of the result' },
					{ symbol: 'k', meaning: 'runs over the columns of A and the rows of B' }
				]
			},
			{
				title: 'Determinant of a 2 × 2 matrix',
				expression: 'det [[a, b], [c, d]] = ad − bc',
				variables: [{ symbol: 'det', meaning: 'the determinant, a single number' }]
			},
			{
				title: 'Inverse of a 2 × 2 matrix',
				expression: 'A⁻¹ = (1 ÷ (ad − bc)) × [[d, −b], [−c, a]]',
				variables: [{ symbol: 'A⁻¹', meaning: 'the inverse, which exists only when ad − bc is not zero' }]
			},
			{
				title: 'Transpose and scalar multiple',
				expression: '(Aᵀ)ᵢⱼ = aⱼᵢ,   (kA)ᵢⱼ = k × aᵢⱼ',
				variables: [{ symbol: 'k', meaning: 'the scalar, a single number' }]
			}
		],
		example: {
			title: 'Find the inverse of A = [[2, 1], [1, 3]]',
			steps: [
				'Determinant: 2 × 3 − 1 × 1 = 6 − 1 = 5.',
				'Swap the diagonal entries and change the signs of the others: [[3, −1], [−1, 2]].',
				'Divide every entry by 5: A⁻¹ = [[0.6, −0.2], [−0.2, 0.4]].',
				'Check: A × A⁻¹ = [[1, 0], [0, 1]], the identity matrix.'
			],
			result: 'The inverse of A is [[0.6, −0.2], [−0.2, 0.4]], and the determinant of A is 5.'
		},
		faq: [
			{
				q: 'How do I multiply two matrices?',
				a: 'Multiply each row of the first matrix by each column of the second, pair by pair, then add the products. The number of columns in the first matrix must equal the number of rows in the second.'
			},
			{
				q: 'What does a determinant of zero mean?',
				a: 'It means the matrix is singular. Its rows or columns are linked, so it has no inverse. For a 2 × 2 matrix, a zero determinant means ad = bc.'
			},
			{
				q: 'Why does the calculator say a matrix has no inverse?',
				a: 'An inverse exists only for a square matrix with a non-zero determinant. If the determinant is zero, the division needed for the inverse is impossible.'
			},
			{
				q: 'Is A × B the same as B × A?',
				a: 'Usually not. Matrix multiplication depends on order, so the two products can differ, and one may not even be possible.'
			},
			{
				q: 'What is the largest matrix this calculator accepts?',
				a: 'Up to 6 rows and 6 columns for each matrix. Enter the rows one per line, with every row the same length.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Matrix', url: 'https://mathworld.wolfram.com/Matrix.html' },
			{ title: 'Wolfram MathWorld: Determinant', url: 'https://mathworld.wolfram.com/Determinant.html' }
		]
	}
});

function matrixResult(label: string, m: Matrix, sizeA: string, sizeB: string): CalculationResult {
	return {
		primaryResult: gridText(m),
		primaryLabel: label,
		long: true,
		summary: `${label}, shown as a grid. The result is ${dims(m)}.`,
		secondaryMetrics: [
			{ label: 'Size of A', value: sizeA },
			{ label: 'Size of B', value: sizeB },
			{ label: 'Result size', value: dims(m) }
		],
		table: gridTable(m)
	};
}
