import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './pythagorean-theorem-calculator.meta';

/** Show a field unless it is the side being solved for. */
const notSolving = (side: string) => (v: InputValues) => v.solve !== side;

const ok = (x: number) => Number.isFinite(x) && x > 0;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'solve',
			label: 'Solve for',
			type: 'select',
			display: 'segmented',
			default: 'c',
			options: [
				{ label: 'Hypotenuse c', value: 'c' },
				{ label: 'Leg a', value: 'a' },
				{ label: 'Leg b', value: 'b' }
			]
		},
		{ id: 'a', label: 'Leg a', type: 'number', default: 3, min: 0, visibleWhen: notSolving('a') },
		{ id: 'b', label: 'Leg b', type: 'number', default: 4, min: 0, visibleWhen: notSolving('b') },
		{
			id: 'c',
			label: 'Hypotenuse c',
			type: 'number',
			default: 5,
			min: 0,
			help: 'The longest side, opposite the right angle.',
			visibleWhen: notSolving('c')
		}
	],
	calculate(v): CalculationResult {
		const solve = String(v.solve);
		const given = (k: string) => Number(v[k]);
		const fail = (summary: string): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: solve === 'c' ? 'Hypotenuse c' : solve === 'a' ? 'Leg a' : 'Leg b',
			summary
		});

		let a: number;
		let b: number;
		let c: number;
		switch (solve) {
			case 'c':
				a = given('a');
				b = given('b');
				if (!ok(a) || !ok(b)) return fail('Enter both legs greater than zero.');
				c = Math.sqrt(a * a + b * b);
				break;
			case 'a':
				b = given('b');
				c = given('c');
				if (!ok(b) || !ok(c)) return fail('Enter leg b and the hypotenuse, both greater than zero.');
				if (c <= b) return fail('The hypotenuse must be longer than leg b, so no leg a exists.');
				a = Math.sqrt(c * c - b * b);
				break;
			case 'b':
				a = given('a');
				c = given('c');
				if (!ok(a) || !ok(c)) return fail('Enter leg a and the hypotenuse, both greater than zero.');
				if (c <= a) return fail('The hypotenuse must be longer than leg a, so no leg b exists.');
				b = Math.sqrt(c * c - a * a);
				break;
			default:
				return fail('Pick the side to solve for.');
		}

		const angleA = (Math.atan2(a, b) * 180) / Math.PI;
		const angleB = (Math.atan2(b, a) * 180) / Math.PI;
		const area = (a * b) / 2;
		const label = solve === 'c' ? 'Hypotenuse c' : solve === 'a' ? 'Leg a' : 'Leg b';
		const solved = solve === 'c' ? c : solve === 'a' ? a : b;
		const working =
			solve === 'c'
				? `√(${num(a, 4)}² + ${num(b, 4)}²) = ${num(c, 4)}`
				: solve === 'a'
					? `√(${num(c, 4)}² − ${num(b, 4)}²) = ${num(a, 4)}`
					: `√(${num(c, 4)}² − ${num(a, 4)}²) = ${num(b, 4)}`;

		return {
			primaryResult: num(solved, 4),
			primaryLabel: label,
			summary: working,
			secondaryMetrics: [
				{ label: 'Leg a', value: num(a, 4) },
				{ label: 'Leg b', value: num(b, 4) },
				{ label: 'Hypotenuse c', value: num(c, 4) },
				{ label: 'Angle opposite a', value: `${num(angleA, 4)}°` },
				{ label: 'Angle opposite b', value: `${num(angleB, 4)}°` },
				{ label: 'Area', value: num(area, 4) }
			]
		};
	},
	content: {
		intro:
			'This Pythagorean theorem calculator solves a right triangle. Enter any two sides to find the third, then read off the two acute angles and the area. It is a free tool for students, builders and anyone with a right angle to check.',
		howTo: [
			'Choose the side you want to find: the hypotenuse c, leg a or leg b.',
			'Enter the two sides you know. The hypotenuse is always the longest side, opposite the right angle.',
			'Read the missing side, the two acute angles in degrees and the area.',
			'Check the working line to see the sum the calculator used.'
		],
		about: [
			{
				heading: 'What is the Pythagorean theorem?',
				paragraphs: [
					'The Pythagorean theorem is a rule about right triangles. A right triangle has one corner of exactly 90 degrees. The two sides that meet at that corner are called the legs, and the longest side, opposite the corner, is the hypotenuse.',
					'The rule says that the square of the hypotenuse equals the sum of the squares of the two legs. In symbols, a² + b² = c². It is named after the Greek mathematician Pythagoras, although many cultures knew it long before him.',
					'For example, a 3 m leg and a 4 m leg give a hypotenuse of 5 m, because 3² + 4² = 9 + 16 = 25, and √25 = 5. Sets of whole numbers like this are called Pythagorean triples.'
				]
			},
			{
				heading: 'How to find a missing side',
				paragraphs: [
					'If you know both legs, find the hypotenuse. Square each leg, add the results, and take the square root. This is the step the calculator takes when you choose c.',
					'If you know the hypotenuse and one leg, rearrange the rule. Subtract the square of the known leg from the square of the hypotenuse, then take the square root. The rule needs the hypotenuse to be longer than the leg you know. Otherwise, no right triangle is possible.',
					'Once you have all three sides, you can find the angles. The angle opposite a leg equals the inverse tangent of that leg divided by the other leg. Two angles always add up to 90 degrees, so the third angle is the right angle.'
				],
				table: {
					caption: 'Common whole-number right triangles',
					columns: ['Leg a', 'Leg b', 'Hypotenuse c'],
					rows: [
						['3', '4', '5'],
						['5', '12', '13'],
						['8', '15', '17'],
						['7', '24', '25']
					]
				}
			},
			{
				heading: 'Where the theorem is used',
				paragraphs: [
					'Builders use the theorem to check corners. A common method is the 3-4-5 rule: mark 3 units along one wall and 4 units along the other. If the diagonal between the marks is 5 units, the corner is square.',
					'Navigation and design use it too. For example, a straight walk across a rectangular park is its diagonal, and you can find that length with the same rule. For points on a graph, the [distance calculator](/distance-calculator) uses the same idea.',
					'Triangles that are not right-angled need other rules, such as the law of cosines. For those, the [triangle calculator](/triangle-calculator) is a better fit. You can also find the area of any triangle with the [area calculator](/area-calculator).'
				]
			},
			{
				heading: 'Tips for reliable results',
				paragraphs: ['Small slips with squares and roots cause most errors. These habits keep your sums on track:'],
				list: [
					'**Check the hypotenuse first.** It must be the longest side, or the numbers cannot form a right triangle.',
					'**Use one unit.** Convert metres and centimetres to the same unit before you start.',
					'**Square before adding.** Do not add the sides first and then square them.',
					'**Round at the end.** Keep extra decimal places during the sum, so the answer stays accurate.',
					'**Check the result.** Square the new side and confirm that the two legs add up to it.'
				]
			}
		],
		formulas: [
			{
				title: 'Pythagorean theorem',
				expression: 'a² + b² = c²',
				variables: [
					{ symbol: 'a, b', meaning: 'the two legs, which meet at the right angle' },
					{ symbol: 'c', meaning: 'the hypotenuse, opposite the right angle' }
				]
			},
			{ title: 'Hypotenuse', expression: 'c = √(a² + b²)', variables: [] },
			{ title: 'A missing leg', expression: 'a = √(c² − b²)   or   b = √(c² − a²)', variables: [] },
			{
				title: 'Angles and area',
				expression: 'Angle opposite a = arctan(a ÷ b).   Area = ½ × a × b',
				variables: [{ symbol: 'arctan', meaning: 'inverse tangent, which gives an angle in degrees' }]
			}
		],
		example: {
			title: 'A ladder leaning against a wall, with a 5 m base and a 12 m height',
			steps: [
				'Hypotenuse: c = √(5² + 12²) = √(25 + 144) = √169 = 13 m.',
				'Angle opposite the 5 m leg: arctan(5 ÷ 12) = 22.6199°.',
				'Angle opposite the 12 m leg: 90° − 22.6199° = 67.3801°, or 67.38° to two decimals.',
				'Area: ½ × 5 × 12 = 30 square metres.'
			],
			result: 'The ladder is 13 m long, and its acute angles are about 22.62° and 67.38°.'
		},
		faq: [
			{
				q: 'How do I use the Pythagorean theorem?',
				a: 'Square the two legs, add the results, and take the square root. For legs of 3 and 4, the hypotenuse is √(9 + 16) = 5. To find a missing leg, subtract the square of the known leg from the square of the hypotenuse, then take the square root.'
			},
			{
				q: 'Which side is the hypotenuse?',
				a: 'The hypotenuse is the side opposite the right angle. It is always the longest side of a right triangle.'
			},
			{
				q: 'Why does a missing leg need a longer hypotenuse?',
				a: 'A leg is always shorter than the hypotenuse, so c² − b² must be positive. If the hypotenuse is not longer than the known leg, no right triangle can exist.'
			},
			{
				q: 'Do the two acute angles add up to 90 degrees?',
				a: 'Yes. In any right triangle, the two acute angles add up to 90°. The calculator shows them to four decimal places, so they sum to 90 once rounded.'
			},
			{
				q: 'Does the theorem work for triangles that are not right-angled?',
				a: 'No. The rule only works when one angle is exactly 90 degrees. For other triangles, use the law of sines or the law of cosines, which the triangle calculator covers.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Pythagorean Theorem', url: 'https://mathworld.wolfram.com/PythagoreanTheorem.html' },
			{ title: 'Wolfram MathWorld: Right Triangle', url: 'https://mathworld.wolfram.com/RightTriangle.html' }
		]
	}
});
