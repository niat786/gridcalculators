import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './quadratic-formula-calculator.meta';

/** Round to six decimal places and remove a negative zero. */
const f = (x: number) => num(Math.round(x * 1e6) / 1e6 || 0, 6);

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'a',
			label: 'Coefficient a (x² term)',
			type: 'number',
			default: 1,
			step: 1,
			help: 'The equation is ax² + bx + c = 0. a cannot be 0.'
		},
		{ id: 'b', label: 'Coefficient b (x term)', type: 'number', default: -3, step: 1 },
		{ id: 'c', label: 'Constant c', type: 'number', default: 2, step: 1 }
	],
	calculate(v: InputValues): CalculationResult {
		const a = Number(v.a);
		const b = Number(v.b);
		const c = Number(v.c);
		const label = 'Roots (x)';

		if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a, b and c as numbers.' };
		}
		if (a === 0) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: 'a can’t be 0, because the equation would no longer be quadratic.'
			};
		}

		const disc = b * b - 4 * a * c;
		const axis = -b / (2 * a);
		const vertexY = -disc / (4 * a);
		const common = [
			{ label: 'Discriminant (b² − 4ac)', value: f(disc) },
			{ label: 'Vertex (x, y)', value: `(${f(axis)}, ${f(vertexY)})` },
			{ label: 'Axis of symmetry', value: `x = ${f(axis)}` },
			{ label: 'Parabola opens', value: a > 0 ? 'Upward' : 'Downward' }
		];

		if (disc > 0) {
			const root = Math.sqrt(disc);
			const r1 = (-b + root) / (2 * a);
			const r2 = (-b - root) / (2 * a);
			return {
				primaryResult: `${f(Math.min(r1, r2))} and ${f(Math.max(r1, r2))}`,
				primaryLabel: 'Two real roots (x)',
				summary: `The discriminant ${f(disc)} is positive, so x = (−b ± √Δ) ÷ 2a gives two different real roots.`,
				secondaryMetrics: common
			};
		}

		if (disc === 0) {
			return {
				primaryResult: f(axis),
				primaryLabel: 'One repeated root (x)',
				summary: 'The discriminant is 0, so both roots are the same: x = −b ÷ 2a.',
				secondaryMetrics: common
			};
		}

		const imaginary = Math.sqrt(-disc) / (2 * Math.abs(a));
		return {
			primaryResult: `${f(axis)} ± ${f(imaginary)}i`,
			primaryLabel: 'Complex roots (p ± qi)',
			summary: `The discriminant ${f(disc)} is negative, so there are no real roots. Here p = −b ÷ 2a and q = √(−Δ) ÷ 2|a|.`,
			secondaryMetrics: common
		};
	},
	content: {
		intro:
			'This quadratic formula calculator solves ax² + bx + c = 0 for x. It finds real or complex roots, and also the vertex and axis of symmetry of the parabola, so you can see the graph’s turning point.',
		howTo: [
			'Write your equation as ax² + bx + c = 0 and enter a, b and c. The value of a cannot be 0.',
			'Read the roots. The discriminant tells you whether they are two real numbers, one repeated number, or a complex pair.',
			'Use the vertex and axis of symmetry to find the turning point of the graph.',
			'Check the working line to see the discriminant and the sum used.'
		],
		about: [
			{
				heading: 'What is a quadratic equation?',
				paragraphs: [
					'A quadratic equation is an equation where the highest power of x is 2. The standard form is ax² + bx + c = 0. The letters a, b and c are called coefficients, and a must not be zero.',
					'The roots, also called solutions, are the x values that make the equation true. Graphically, they are the points where the parabola crosses the x-axis.',
					'Many real problems give quadratic equations. A ball thrown upwards follows a curved path, and a rectangle with a fixed area and a set perimeter can be described with one. Solving the equation tells you when or where the key value occurs.'
				]
			},
			{
				heading: 'How the quadratic formula works',
				paragraphs: [
					'The quadratic formula gives both roots in one step: x = (−b ± √(b² − 4ac)) ÷ 2a. The ± sign means you calculate two answers, one with plus and one with minus.',
					'Most of the work happens under the square root. The expression b² − 4ac is the discriminant. It is written Δ, and it decides what kind of roots you get.',
					'If you want to build a quadratic from its roots, you can reverse the process. Multiply the factors together, and the result is a quadratic with those roots. For a simpler route to the same answer, the [factor calculator](/factor-calculator) breaks numbers into their parts.'
				],
				table: {
					caption: 'What the discriminant tells you',
					columns: ['Discriminant Δ', 'Roots', 'Graph'],
					rows: [
						['Positive', 'Two different real roots', 'Crosses the x-axis twice'],
						['Zero', 'One repeated real root', 'Touches the x-axis once'],
						['Negative', 'Two complex roots', 'Never crosses the x-axis']
					]
				}
			},
			{
				heading: 'Vertex and axis of symmetry',
				paragraphs: [
					'Every parabola has a turning point, called the vertex. The axis of symmetry is the vertical line through the vertex. The graph is a mirror image on either side of it.',
					'The axis sits at x = −b ÷ 2a. The vertex is at that x value, and its y value is −Δ ÷ 4a. If a is positive, the parabola opens upwards and the vertex is the lowest point. If a is negative, it opens downwards and the vertex is the highest point.',
					'The roots are symmetrical around the axis too. When there are two real roots, the axis lies exactly halfway between them. That is a quick way to check your answer. For the slope of a straight line instead of a curve, use the [slope calculator](/slope-calculator).'
				]
			},
			{
				heading: 'Tips for solving by hand',
				paragraphs: ['Quadratic sums are easy to get wrong with signs. These habits help:'],
				list: [
					'**Move every term to one side.** The equation must equal zero before you read off a, b and c.',
					'**Keep the sign of b.** If the middle term is −3x, then b is −3, not 3.',
					'**Work out the discriminant first.** It tells you whether a real answer exists before you go further.',
					'**Check the roots.** Substitute each one back into the original equation. It should give zero.',
					'**Try factoring for simple cases.** If the numbers are small, the [root calculator](/root-calculator) can help with the square root step.'
				]
			}
		],
		formulas: [
			{
				title: 'Quadratic formula',
				expression: 'x = (−b ± √(b² − 4ac)) ÷ 2a',
				variables: [
					{ symbol: 'a, b, c', meaning: 'the coefficients of ax² + bx + c = 0' },
					{ symbol: '±', meaning: 'gives two roots: one with plus, one with minus' }
				]
			},
			{
				title: 'Discriminant',
				expression: 'Δ = b² − 4ac. Δ > 0: two real roots. Δ = 0: one repeated root. Δ < 0: complex roots.',
				variables: [{ symbol: 'Δ', meaning: 'the discriminant, the value under the square root' }]
			},
			{
				title: 'Vertex and axis of symmetry',
				expression: 'Axis: x = −b ÷ 2a.   Vertex: (−b ÷ 2a, −Δ ÷ 4a)',
				variables: [{ symbol: 'x', meaning: 'the x-coordinate of the turning point, which is also the axis of symmetry' }]
			}
		],
		example: {
			title: 'Solve x² − 3x + 2 = 0',
			steps: [
				'Read the coefficients: a = 1, b = −3, c = 2.',
				'Discriminant: (−3)² − 4 × 1 × 2 = 9 − 8 = 1, which is positive.',
				'Roots: (3 ± √1) ÷ 2 = (3 ± 1) ÷ 2.',
				'So x = (3 + 1) ÷ 2 = 2, or x = (3 − 1) ÷ 2 = 1.',
				'Vertex: the axis is x = 3 ÷ 2 = 1.5, and y = −1 ÷ 4 = −0.25.'
			],
			result: 'The roots are 1 and 2. The vertex is (1.5, −0.25), and the parabola opens upwards.'
		},
		faq: [
			{
				q: 'How do I solve a quadratic equation?',
				a: 'Write the equation as ax² + bx + c = 0, then enter a, b and c. Apply the quadratic formula, which gives the roots for x. The calculator does the arithmetic and shows the discriminant.'
			},
			{
				q: 'What does a negative discriminant mean?',
				a: 'It means the parabola never crosses the x-axis, so there are no real roots. The roots are complex numbers written as p ± qi, where i is the square root of −1.'
			},
			{
				q: 'Why can a not be zero?',
				a: 'If a is 0, the x² term disappears and the equation becomes linear, so the quadratic formula does not apply. The formula also divides by 2a, which would be division by zero.'
			},
			{
				q: 'How do I find the vertex of a parabola?',
				a: 'The x-coordinate of the vertex is −b ÷ 2a. Put that value back into the equation to get the y-coordinate. The axis of symmetry is the vertical line through the vertex.'
			},
			{
				q: 'Is the quadratic formula the only way to solve these?',
				a: 'No. Factoring and completing the square also work, and they can be quicker for simple numbers. The formula works for every quadratic, so it is a safe method when factoring is hard.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Quadratic Formula', url: 'https://mathworld.wolfram.com/QuadraticFormula.html' },
			{ title: 'Wolfram MathWorld: Parabola', url: 'https://mathworld.wolfram.com/Parabola.html' }
		]
	}
});
