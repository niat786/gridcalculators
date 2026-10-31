import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './right-triangle-calculator.meta';

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

const is = (...modes: string[]) => (v: InputValues) => modes.includes(String(v.known));
const positive = (...xs: number[]) => xs.every((x) => Number.isFinite(x) && x > 0);
const acute = (x: number) => Number.isFinite(x) && x > 0 && x < 90;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'known',
			label: 'I know',
			type: 'select',
			display: 'menu',
			default: 'legs',
			options: [
				{ label: 'Two legs', value: 'legs' },
				{ label: 'A leg and the hypotenuse', value: 'legHyp' },
				{ label: 'A leg and an acute angle', value: 'legAngle' },
				{ label: 'The hypotenuse and an acute angle', value: 'hypAngle' }
			]
		},
		{ id: 'a', label: 'Leg a', type: 'number', default: 3, min: 0, visibleWhen: is('legs') },
		{ id: 'b', label: 'Leg b', type: 'number', default: 4, min: 0, visibleWhen: is('legs') },
		{
			id: 'legSide',
			label: 'Known leg',
			type: 'select',
			display: 'segmented',
			default: 'a',
			options: [
				{ label: 'Leg a', value: 'a' },
				{ label: 'Leg b', value: 'b' }
			],
			visibleWhen: is('legHyp', 'legAngle')
		},
		{
			id: 'leg',
			label: 'Known leg length',
			type: 'number',
			default: 3,
			min: 0,
			visibleWhen: is('legHyp', 'legAngle')
		},
		{
			id: 'c',
			label: 'Hypotenuse c',
			type: 'number',
			default: 5,
			min: 0,
			help: 'The longest side, opposite the right angle.',
			visibleWhen: is('legHyp', 'hypAngle')
		},
		{
			id: 'angle',
			label: 'Angle A',
			type: 'number',
			default: 30,
			min: 0,
			max: 90,
			suffix: '°',
			help: 'Acute angle A, opposite leg a. Enter a value above 0 and below 90.',
			visibleWhen: is('legAngle', 'hypAngle')
		}
	],
	calculate(v): CalculationResult {
		const known = String(v.known);
		const n = (k: string) => Number(v[k]);
		const fail = (summary: string): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Hypotenuse c',
			summary
		});

		let a: number;
		let b: number;
		let c: number;
		let working: string;
		const angleIn = n('angle');
		const leg = n('leg');
		const legIsB = String(v.legSide) === 'b';

		switch (known) {
			case 'legs': {
				a = n('a');
				b = n('b');
				if (!positive(a, b)) return fail('Enter both legs greater than zero.');
				c = Math.hypot(a, b);
				working = `√(${num(a, 4)}² + ${num(b, 4)}²) = ${num(c, 4)}`;
				break;
			}
			case 'legHyp': {
				c = n('c');
				if (!positive(leg, c)) return fail('Enter the known leg and the hypotenuse, both greater than zero.');
				if (c <= leg) return fail('The hypotenuse must be longer than the leg you know.');
				const other = Math.sqrt(c * c - leg * leg);
				if (legIsB) {
					b = leg;
					a = other;
					working = `Missing leg a: √(${num(c, 4)}² − ${num(leg, 4)}²) = ${num(other, 4)}`;
				} else {
					a = leg;
					b = other;
					working = `Missing leg b: √(${num(c, 4)}² − ${num(leg, 4)}²) = ${num(other, 4)}`;
				}
				break;
			}
			case 'legAngle': {
				if (!positive(leg) || !acute(angleIn)) return fail('Enter a leg above zero and an angle between 0° and 90°.');
				const t = angleIn * RAD;
				if (legIsB) {
					b = leg;
					a = leg * Math.tan(t);
					c = leg / Math.cos(t);
					working = `Hypotenuse: ${num(leg, 4)} ÷ cos ${num(angleIn, 4)}° = ${num(c, 4)}`;
				} else {
					a = leg;
					b = leg / Math.tan(t);
					c = leg / Math.sin(t);
					working = `Hypotenuse: ${num(leg, 4)} ÷ sin ${num(angleIn, 4)}° = ${num(c, 4)}`;
				}
				break;
			}
			case 'hypAngle': {
				c = n('c');
				if (!positive(c) || !acute(angleIn)) return fail('Enter a hypotenuse above zero and an angle between 0° and 90°.');
				const t = angleIn * RAD;
				a = c * Math.sin(t);
				b = c * Math.cos(t);
				working = `Legs: ${num(c, 4)} × sin ${num(angleIn, 4)}° = ${num(a, 4)} and ${num(c, 4)} × cos ${num(angleIn, 4)}° = ${num(b, 4)}`;
				break;
			}
			default:
				return fail('Pick what you know about the triangle.');
		}

		const angleA = Math.atan2(a, b) * DEG;
		const angleB = Math.atan2(b, a) * DEG;
		const area = (a * b) / 2;
		const perimeter = a + b + c;
		const height = (a * b) / c;

		return {
			primaryResult: num(c, 4),
			primaryLabel: 'Hypotenuse c',
			summary: working,
			secondaryMetrics: [
				{ label: 'Leg a', value: num(a, 4) },
				{ label: 'Leg b', value: num(b, 4) },
				{ label: 'Angle A (opposite a)', value: `${num(angleA, 4)}°` },
				{ label: 'Angle B (opposite b)', value: `${num(angleB, 4)}°` },
				{ label: 'Area', value: num(area, 4) },
				{ label: 'Perimeter', value: num(perimeter, 4) },
				{ label: 'Height to hypotenuse', value: num(height, 4) }
			]
		};
	},
	content: {
		intro:
			'This right triangle calculator solves a triangle with one 90° angle. Pick what you already know, enter it, and get every side, both acute angles, the area, the perimeter and the height to the hypotenuse.',
		howTo: [
			'Choose what you know: two legs, a leg and the hypotenuse, a leg and an acute angle, or the hypotenuse and an acute angle.',
			'Enter the measurements. For a leg, pick whether it is leg a or leg b. Angles are in degrees.',
			'Read the hypotenuse, the missing leg, both acute angles, the area, the perimeter and the height to the hypotenuse.',
			'Check the working line, which shows the formula used for the first step.'
		],
		about: [
			{
				heading: 'What is a right triangle?',
				paragraphs: [
					'A right triangle has one angle of exactly 90 degrees, called the right angle. The two sides that form the right angle are the legs. The side opposite the right angle is the hypotenuse, and it is always the longest side.',
					'The other two angles are called acute angles, because each is smaller than 90 degrees. They always add up to 90 degrees. So if you know one acute angle, you automatically know the other.',
					'Right triangles appear in ramps, roof frames, screens and maps. Once you know any two sides, or one side and one acute angle, you can solve the rest of the triangle. For a length between two points on a graph, the [distance calculator](/distance-calculator) uses the same right-triangle idea.'
				]
			},
			{
				heading: 'Four ways to solve a right triangle',
				paragraphs: [
					'A triangle is fixed by three facts. The right angle is one of them, so you need two more. The calculator offers four common pairs.',
					'If you know two legs, the Pythagorean theorem gives the hypotenuse. If you know a leg and the hypotenuse, it gives the missing leg. The [Pythagorean theorem calculator](/pythagorean-theorem-calculator) works through those two steps in detail.',
					'If you know an angle, trigonometry does the rest. The sine, cosine and tangent ratios link an angle to two sides. For example, the leg opposite an angle divided by the hypotenuse equals the sine of that angle.'
				],
				table: {
					caption: 'The main trigonometry ratios, for angle A and leg a opposite it',
					columns: ['Ratio', 'Formula', 'Example with A = 30°'],
					rows: [
						['Sine', 'opposite ÷ hypotenuse', 'sin 30° = 0.5'],
						['Cosine', 'adjacent ÷ hypotenuse', 'cos 30° ≈ 0.8660'],
						['Tangent', 'opposite ÷ adjacent', 'tan 30° ≈ 0.5774']
					]
				}
			},
			{
				heading: 'Area, perimeter and height',
				paragraphs: [
					'The area is half the product of the two legs. You can use either leg as the base, because the other leg is then the height. This is the same idea as the triangle formula in the [area calculator](/area-calculator).',
					'The perimeter is the total of all three sides. It is useful for fencing, edging or trim along the outside of a triangular piece.',
					'The height to the hypotenuse is the straight drop from the right-angle corner to the longest side. It is always shorter than either leg, so it helps when you need the slant of a roof or the depth of a corner.'
				]
			},
			{
				heading: 'Tips for accurate answers',
				paragraphs: ['Check your settings before you read the result. These steps prevent the most common errors:'],
				list: [
					'**Check the calculator mode.** Angles must be in degrees, not radians.',
					'**Label the legs.** Decide which leg is a and which is b, and keep that choice.',
					'**Enter angles below 90°.** Acute angles must be between 0 and 90 degrees.',
					'**Round at the end.** Keep extra decimals during the sum, then round the answer.',
					'**Compare with a sketch.** A quick drawing shows whether the hypotenuse is the longest side, as it should be.'
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
			{
				title: 'Acute angles',
				expression: 'tan A = a ÷ b,   sin A = a ÷ c,   cos A = b ÷ c,   A + B = 90°',
				variables: [{ symbol: 'A, B', meaning: 'the two acute angles; A is opposite leg a and B is opposite leg b' }]
			},
			{
				title: 'Area, perimeter and height',
				expression: 'Area = ½ × a × b,   Perimeter = a + b + c,   Height to hypotenuse h = a × b ÷ c',
				variables: [{ symbol: 'h', meaning: 'the distance from the right-angle corner to the hypotenuse' }]
			}
		],
		example: {
			title: 'A roof brace with legs of 8 ft and 15 ft',
			steps: [
				'Hypotenuse: c = √(8² + 15²) = √289 = 17 ft.',
				'Angle A: arctan(8 ÷ 15) = 28.0725°. Angle B = 90° − 28.0725° = 61.9275°.',
				'Area: ½ × 8 × 15 = 60 square ft. Perimeter: 8 + 15 + 17 = 40 ft.',
				'Height to hypotenuse: 8 × 15 ÷ 17 = 7.0588 ft.'
			],
			result:
				'The brace is 17 ft long. Its acute angles are 28.0725° and 61.9275°, its area is 60 square ft and its perimeter is 40 ft.'
		},
		faq: [
			{
				q: 'How do I solve a right triangle?',
				a: 'Enter two known facts, such as two legs, or one leg and one acute angle. The calculator uses the Pythagorean theorem and trigonometry to find the other sides and angles.'
			},
			{
				q: 'Which side is the hypotenuse?',
				a: 'The hypotenuse is the side opposite the right angle. It is always the longest side, so it is the only side that can be longer than both legs.'
			},
			{
				q: 'Why does a known leg need a longer hypotenuse?',
				a: 'A leg is always shorter than the hypotenuse. If the hypotenuse you enter is not longer than the known leg, no right triangle can exist, and the calculator says so.'
			},
			{
				q: 'Do the two acute angles add up to 90 degrees?',
				a: 'Yes. The two acute angles in any right triangle always add up to 90°. The calculator shows them to four decimal places, so they sum to 90 once rounded.'
			},
			{
				q: 'What is the height to the hypotenuse?',
				a: 'It is the perpendicular distance from the right-angle corner to the hypotenuse. It equals twice the area, divided by the hypotenuse.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Right Triangle', url: 'https://mathworld.wolfram.com/RightTriangle.html' },
			{ title: 'Wolfram MathWorld: Trigonometric Functions', url: 'https://mathworld.wolfram.com/TrigonometricFunctions.html' }
		]
	}
});
