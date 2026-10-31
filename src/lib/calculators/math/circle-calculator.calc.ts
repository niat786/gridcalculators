import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './circle-calculator.meta';

const known = (value: string) => (v: InputValues) => v.known === value;

/** Radius from whichever measurement the person knows. NaN when it cannot be found. */
function radiusFrom(known: string, v: InputValues): number {
	const x = Number(v[known]);
	if (!Number.isFinite(x) || x <= 0) return NaN;
	switch (known) {
		case 'radius':
			return x;
		case 'diameter':
			return x / 2;
		case 'circumference':
			return x / (2 * Math.PI);
		case 'area':
			return Math.sqrt(x / Math.PI);
		default:
			return NaN;
	}
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'known',
			label: 'I know the',
			type: 'select',
			display: 'segmented',
			default: 'radius',
			options: [
				{ label: 'Radius', value: 'radius' },
				{ label: 'Diameter', value: 'diameter' },
				{ label: 'Circumference', value: 'circumference' },
				{ label: 'Area', value: 'area' }
			]
		},
		{ id: 'radius', label: 'Radius', type: 'number', default: 5, min: 0, visibleWhen: known('radius') },
		{ id: 'diameter', label: 'Diameter', type: 'number', default: 10, min: 0, visibleWhen: known('diameter') },
		{
			id: 'circumference',
			label: 'Circumference',
			type: 'number',
			default: 31.4159,
			min: 0,
			visibleWhen: known('circumference')
		},
		{ id: 'area', label: 'Area', type: 'number', default: 78.5398, min: 0, visibleWhen: known('area') }
	],
	calculate(v): CalculationResult {
		const r = radiusFrom(String(v.known), v);
		if (!Number.isFinite(r)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Area',
				summary: 'Enter a value greater than zero in the field you chose.'
			};
		}
		const d = 2 * r;
		const c = 2 * Math.PI * r;
		const a = Math.PI * r * r;
		return {
			primaryResult: num(a, 6),
			primaryLabel: 'Area',
			summary: `π × ${num(r, 6)}² = ${num(a, 6)}`,
			secondaryMetrics: [
				{ label: 'Radius', value: num(r, 6) },
				{ label: 'Diameter', value: num(d, 6) },
				{ label: 'Circumference', value: num(c, 6) }
			]
		};
	},
	content: {
		intro:
			'This circle calculator finds the radius, diameter, circumference and area from any one value you know. Choose that value first, and the other three appear below.',
		howTo: [
			'Choose which measurement you know: radius, diameter, circumference or area.',
			'Type that one value into the field that appears. Use one unit, such as centimetres or inches.',
			'Read the radius, diameter, circumference and area below.',
			'Check the working line under the result to see the formula used.'
		],
		about: [
			{
				heading: 'What are a circle’s radius, diameter and circumference?',
				paragraphs: [
					'A circle is every point that sits the same distance from one central point. The radius is that distance, from the centre to the edge.',
					'The diameter goes straight across the circle, through the centre. It is always twice the radius, so a radius of 5 cm gives a diameter of 10 cm.',
					'The circumference is the distance all the way around the edge. It is the circle’s perimeter, and it is always a little more than three times the diameter.',
					'A circle has no corners or straight sides. Every point on the edge is the same distance from the centre, which is why a wheel turns so smoothly.'
				]
			},
			{
				heading: 'How pi links the measurements',
				paragraphs: [
					'Every circle, large or small, has the same ratio between its circumference and its diameter. That ratio is π (pi), which is about 3.14159. So the circumference equals π times the diameter.',
					'The area uses the radius squared. For example, a 30 cm pizza has a radius of 15 cm, so its area is π × 15², or about 706.86 square centimetres. Because the radius is squared, doubling the radius makes the area four times bigger.',
					'As a result, small changes in the radius can change the area a lot. Check the radius carefully before you buy anything that depends on area, such as paint or fabric.',
					'For a slice of a circle, such as a pie slice, use the [area calculator](/area-calculator). It works out the area of a sector from its radius and angle.'
				]
			},
			{
				heading: 'Finding the radius from one measurement',
				paragraphs: [
					'If you know a value other than the radius, you can work backwards to the radius. Then you can find everything else. The table shows three examples that all describe the same circle, with a radius of 5. For a round container, such as a cylinder, the [volume calculator](/volume-calculator) uses this circle area as its base, and the [surface area calculator](/surface-area-calculator) covers its outside.'
				],
				table: {
					caption: 'The same circle, described three ways',
					columns: ['Value you know', 'How to find the radius', 'Radius'],
					rows: [
						['Diameter = 10', 'Divide by 2: 10 ÷ 2', '5'],
						['Circumference = 31.42', 'Divide by 2π: 31.42 ÷ 6.283', '5.00'],
						['Area = 78.54', 'Divide by π, then take the square root: √(78.54 ÷ 3.1416)', '5.00']
					]
				}
			},
			{
				heading: 'Tips for measuring round objects',
				paragraphs: [
					'Round things are often hard to measure exactly. Even a few millimetres of error can change the result, so these habits help you get a reliable number. They suit tables, wheels, pipes and garden beds alike.'
				],
				list: [
					'**Measure across the widest point.** Make sure the tape or ruler passes through the centre.',
					'**Wrap a string for the circumference.** Mark the length, then measure the string against a ruler.',
					'**Halve the diameter for the radius.** Many people measure the diameter first because it is easier to see.',
					'**Use the same unit throughout.** Mixing inches and centimetres gives the wrong area.',
					'**Check the rounding.** Keep extra decimals during the sum, and round only the final answer.'
				]
			}
		],
		formulas: [
			{ title: 'Diameter', expression: 'd = 2 × r', variables: [{ symbol: 'd', meaning: 'diameter, the distance across through the centre' }, { symbol: 'r', meaning: 'radius, the distance from the centre to the edge' }] },
			{
				title: 'Circumference',
				expression: 'C = 2 × π × r = π × d',
				variables: [{ symbol: 'C', meaning: 'circumference, the distance around the circle' }, { symbol: 'π', meaning: 'about 3.14159' }]
			},
			{ title: 'Area', expression: 'A = π × r²', variables: [{ symbol: 'A', meaning: 'area inside the circle, in square units' }] },
			{
				title: 'Finding the radius',
				expression: 'From diameter: r = d ÷ 2.   From circumference: r = C ÷ (2 × π).   From area: r = √(A ÷ π)',
				variables: []
			}
		],
		example: {
			title: 'A circle with a radius of 5 cm',
			steps: ['Diameter: 2 × 5 = 10 cm', 'Circumference: 2 × π × 5 = 31.415927 cm', 'Area: π × 5² = π × 25 = 78.539816 square cm'],
			result: 'The circle is 10 cm across, 31.415927 cm around and covers 78.539816 square cm.'
		},
		faq: [
			{
				q: 'How do I find the radius if I only know the area?',
				a: 'Divide the area by π, then take the square root. For an area of 78.54, the radius is √(78.54 ÷ 3.14159), which is about 5. Enter the area in the calculator and it does this for you.'
			},
			{
				q: 'What is the area of a circle with a diameter of 10?',
				a: 'The radius is half the diameter, so 5. Then the area is π × 5², which is about 78.54 square units. Choose Diameter in the calculator to see this.'
			},
			{
				q: 'Is π exactly 3.14?',
				a: 'No. π is an irrational number that starts 3.14159265, and its decimal digits never end or repeat. The calculator uses a precise value of π, so results are more accurate than 3.14.'
			},
			{
				q: 'What is the difference between circumference and area?',
				a: 'Circumference is the length of the outer edge, measured in units such as centimetres. Area is the flat space inside, measured in square units such as square centimetres.'
			},
			{
				q: 'Does doubling the radius double the area?',
				a: 'No. Doubling the radius makes the area four times bigger. A radius of 10 gives an area of about 314.16, compared with 78.54 for a radius of 5.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Circle', url: 'https://mathworld.wolfram.com/Circle.html' },
			{ title: 'Wolfram MathWorld: Pi', url: 'https://mathworld.wolfram.com/Pi.html' }
		]
	}
});
