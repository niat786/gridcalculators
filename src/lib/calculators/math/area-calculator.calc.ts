import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './area-calculator.meta';

const is = (...shapes: string[]) => (v: InputValues) => shapes.includes(String(v.shape));
const positive = (...xs: number[]) => xs.every((x) => Number.isFinite(x) && x > 0);

const ramanujanPerimeter = (a: number, b: number) =>
	Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'shape',
			label: 'Shape',
			type: 'select',
			display: 'menu',
			default: 'rectangle',
			options: [
				{ label: 'Rectangle', value: 'rectangle' },
				{ label: 'Square', value: 'square' },
				{ label: 'Triangle', value: 'triangle' },
				{ label: 'Circle', value: 'circle' },
				{ label: 'Ellipse', value: 'ellipse' },
				{ label: 'Trapezoid', value: 'trapezoid' },
				{ label: 'Parallelogram', value: 'parallelogram' },
				{ label: 'Sector (pie slice)', value: 'sector' }
			]
		},
		{ id: 'length', label: 'Length', type: 'number', default: 12, min: 0, visibleWhen: is('rectangle') },
		{ id: 'width', label: 'Width', type: 'number', default: 8, min: 0, visibleWhen: is('rectangle') },
		{ id: 'side', label: 'Side', type: 'number', default: 6, min: 0, visibleWhen: is('square') },
		{
			id: 'base',
			label: 'Base',
			type: 'number',
			default: 10,
			min: 0,
			visibleWhen: is('triangle', 'parallelogram')
		},
		{
			id: 'height',
			label: 'Height',
			type: 'number',
			default: 6,
			min: 0,
			help: 'Perpendicular height, measured straight up from the base.',
			visibleWhen: is('triangle', 'parallelogram', 'trapezoid')
		},
		{ id: 'p1', label: 'Parallel side 1', type: 'number', default: 12, min: 0, visibleWhen: is('trapezoid') },
		{ id: 'p2', label: 'Parallel side 2', type: 'number', default: 8, min: 0, visibleWhen: is('trapezoid') },
		{ id: 'radius', label: 'Radius', type: 'number', default: 5, min: 0, visibleWhen: is('circle', 'sector') },
		{
			id: 'semiMajor',
			label: 'Semi-major axis',
			type: 'number',
			default: 8,
			min: 0,
			help: 'Half of the longest width.',
			visibleWhen: is('ellipse')
		},
		{
			id: 'semiMinor',
			label: 'Semi-minor axis',
			type: 'number',
			default: 5,
			min: 0,
			help: 'Half of the shortest width.',
			visibleWhen: is('ellipse')
		},
		{
			id: 'angle',
			label: 'Angle',
			type: 'number',
			default: 90,
			min: 0,
			max: 360,
			suffix: '°',
			visibleWhen: is('sector')
		}
	],
	calculate(v): CalculationResult {
		const shape = String(v.shape);
		const n = (k: string) => Number(v[k]);
		const pi = Math.PI;
		const NEEDS_SIDES = 'Needs all side lengths';

		let area: number;
		let perimeter: number | undefined;
		let working: string;

		switch (shape) {
			case 'rectangle': {
				const l = n('length');
				const w = n('width');
				if (!positive(l, w)) return fail('Enter a length and width greater than zero.');
				area = l * w;
				perimeter = 2 * (l + w);
				working = `${num(l, 4)} × ${num(w, 4)} = ${num(area, 4)}`;
				break;
			}
			case 'square': {
				const s = n('side');
				if (!positive(s)) return fail('Enter a side length greater than zero.');
				area = s * s;
				perimeter = 4 * s;
				working = `${num(s, 4)}² = ${num(area, 4)}`;
				break;
			}
			case 'triangle': {
				const b = n('base');
				const h = n('height');
				if (!positive(b, h)) return fail('Enter a base and height greater than zero.');
				area = (b * h) / 2;
				working = `½ × ${num(b, 4)} × ${num(h, 4)} = ${num(area, 4)}`;
				break;
			}
			case 'circle': {
				const r = n('radius');
				if (!positive(r)) return fail('Enter a radius greater than zero.');
				area = pi * r * r;
				perimeter = 2 * pi * r;
				working = `π × ${num(r, 4)}² = ${num(area, 4)}`;
				break;
			}
			case 'ellipse': {
				const a = n('semiMajor');
				const b = n('semiMinor');
				if (!positive(a, b)) return fail('Enter both axes greater than zero.');
				area = pi * a * b;
				perimeter = ramanujanPerimeter(a, b);
				working = `π × ${num(a, 4)} × ${num(b, 4)} = ${num(area, 4)}`;
				break;
			}
			case 'trapezoid': {
				const p1 = n('p1');
				const p2 = n('p2');
				const h = n('height');
				if (!positive(p1, p2, h)) return fail('Enter both parallel sides and the height.');
				area = ((p1 + p2) / 2) * h;
				working = `½ × (${num(p1, 4)} + ${num(p2, 4)}) × ${num(h, 4)} = ${num(area, 4)}`;
				break;
			}
			case 'parallelogram': {
				const b = n('base');
				const h = n('height');
				if (!positive(b, h)) return fail('Enter a base and height greater than zero.');
				area = b * h;
				working = `${num(b, 4)} × ${num(h, 4)} = ${num(area, 4)}`;
				break;
			}
			case 'sector': {
				const r = n('radius');
				const t = n('angle');
				if (!positive(r)) return fail('Enter a radius greater than zero.');
				if (!(t > 0 && t <= 360)) return fail('Enter an angle above 0° and up to 360°.');
				area = (t / 360) * pi * r * r;
				perimeter = 2 * r + (t / 360) * 2 * pi * r;
				working = `(${num(t, 4)} ÷ 360) × π × ${num(r, 4)}² = ${num(area, 4)}`;
				break;
			}
			default:
				return fail('Pick a shape.');
		}

		return {
			primaryResult: num(area, 4),
			primaryLabel: 'Area',
			summary: working,
			secondaryMetrics: [
				{ label: 'Perimeter', value: perimeter === undefined ? NEEDS_SIDES : num(perimeter, 4) }
			]
		};
	},
	content: {
		intro:
			'This free area calculator works out the area and perimeter of common flat shapes. Pick a shape, enter its measurements, and the working appears as you type.',
		howTo: [
			'Choose the shape from the list, such as a rectangle, circle or triangle.',
			'Enter the measurements the form asks for. Use one unit for every length, such as metres or feet.',
			'Read the area in square units, and the perimeter in the same units as the lengths.',
			'Check the working line under the result. It shows each step, so you can compare it with your own sum.'
		],
		about: [
			{
				heading: 'What is area?',
				paragraphs: [
					'Area is the amount of flat space inside a shape. You measure it in square units, such as square metres (m²), square feet (ft²) or square centimetres (cm²).',
					'For example, picture a tile that is 1 metre on each side. Its area is 1 square metre. A floor that fits 20 of these tiles has an area of 20 m².',
					'However, perimeter is different. It measures the distance around the outside edge, so you use ordinary units such as metres or feet.'
				]
			},
			{
				heading: 'How to find the area of common shapes',
				paragraphs: [
					'Most area formulas come from the rectangle. A rectangle is a grid of squares, so you multiply its length by its width. The other formulas also build on this idea.',
					'A triangle is half of a parallelogram with the same base and height. Two copies of the same triangle fit together to make one. So you multiply the base by the height, then divide by two.',
					'A circle uses π (pi, about 3.14159). Its area is π times the radius squared. The radius is the distance from the centre to the edge. The table shows the same method for several shapes.'
				],
				table: {
					caption: 'Worked areas for common shapes',
					columns: ['Shape', 'Measurements', 'Area'],
					rows: [
						['Rectangle', 'Length 12, width 8', '96'],
						['Triangle', 'Base 10, height 6', '30'],
						['Circle', 'Radius 5', '78.54'],
						['Trapezoid', 'Parallel sides 12 and 8, height 6', '60'],
						['Sector (quarter circle)', 'Radius 5, angle 90°', '19.63']
					]
				}
			},
			{
				heading: 'Square units and conversions',
				paragraphs: [
					'Area units are squares of length units, so the conversion is not the same as for lengths. There are 100 centimetres in a metre, but there are 10,000 square centimetres in a square metre (100 × 100).',
					'The same rule applies to imperial units. A square foot is 12 inches by 12 inches, so one square foot holds 144 square inches. For larger spaces, an acre is 43,560 square feet.',
					'To avoid mistakes, convert every length to the same unit first. Then the area comes out in that unit, squared. The [square footage calculator](/square-footage-calculator) is useful for adding up several rooms.'
				]
			},
			{
				heading: 'Tips for accurate measurements',
				paragraphs: ['Small errors in a length grow in the area, so take a little care with your measurements:'],
				list: [
					'**Measure in one unit.** Mixing metres and centimetres is the most common mistake.',
					'**Use the straight height for a triangle.** A slanted side is longer than the height.',
					'**Split irregular shapes.** For an L-shaped room, find the area of two rectangles and add them together.',
					'**Halve the diameter for the radius.** Many tape measures show the distance across a circle, not from its centre.',
					'**Allow for waste.** When you buy paint or tiles, order a little extra. Check the product label for coverage.',
					'**Use the right tool for solids.** For boxes and cylinders, try the [volume calculator](/volume-calculator) or the [surface area calculator](/surface-area-calculator).'
				]
			}
		],
		formulas: [
			{ title: 'Rectangle', expression: 'Area = length × width,   Perimeter = 2 × (length + width)', variables: [] },
			{ title: 'Square', expression: 'Area = side²,   Perimeter = 4 × side', variables: [] },
			{ title: 'Triangle', expression: 'Area = ½ × base × height', variables: [{ symbol: 'height', meaning: 'the straight height from the base to the opposite corner' }] },
			{ title: 'Circle', expression: 'Area = π × r²,   Perimeter = 2 × π × r', variables: [{ symbol: 'r', meaning: 'radius, the distance from the centre to the edge' }] },
			{
				title: 'Ellipse',
				expression: 'Area = π × a × b,   Perimeter ≈ π × [3(a + b) − √((3a + b)(a + 3b))]',
				variables: [
					{ symbol: 'a', meaning: 'semi-major axis, half of the longest width' },
					{ symbol: 'b', meaning: 'semi-minor axis, half of the shortest width' }
				]
			},
			{ title: 'Trapezoid', expression: 'Area = ½ × (a + b) × height', variables: [{ symbol: 'a, b', meaning: 'the two parallel sides' }] },
			{ title: 'Parallelogram', expression: 'Area = base × height', variables: [] },
			{
				title: 'Sector',
				expression: 'Area = (θ ÷ 360) × π × r²,   Perimeter = 2r + (θ ÷ 360) × 2 × π × r',
				variables: [{ symbol: 'θ', meaning: 'angle of the slice, in degrees' }]
			}
		],
		example: {
			title: 'A rectangular patio that is 4.5 m by 3.2 m',
			steps: [
				'Area: 4.5 × 3.2 = 14.4 square metres (m²)',
				'Perimeter: 2 × (4.5 + 3.2) = 2 × 7.7 = 15.4 metres',
				'Both lengths are in metres, so no conversion is needed.'
			],
			result: 'The patio covers 14.4 square metres and needs 15.4 metres of edging.'
		},
		faq: [
			{
				q: 'How do I calculate the area of a shape?',
				a: 'Choose the shape, then enter the measurements it asks for. For a rectangle, multiply length by width. For a circle, multiply π by the radius squared. The calculator shows each step, so you can check the working.'
			},
			{
				q: 'What is the difference between area and perimeter?',
				a: 'Area measures the space inside a shape, in square units. Perimeter measures the distance around its outside edge, in ordinary units such as metres or feet.'
			},
			{
				q: 'Why is the triangle height not the slanted side?',
				a: 'The height is measured straight up from the base, at a right angle. A slanted side is longer than the height, unless the triangle is a right triangle.'
			},
			{
				q: 'Why does the calculator not show a perimeter for a triangle or trapezoid?',
				a: 'Their perimeters need every side length. The base and height alone do not give them. Enter all the sides and add them up to find the perimeter.'
			},
			{
				q: 'How many square metres are in an acre?',
				a: 'One acre is about 4,047 square metres, or exactly 43,560 square feet. Acres are common for land and farms, so check the units on any land listing.'
			},
			{
				q: 'What is π in the circle formula?',
				a: 'Pi (π) is the ratio of a circle’s distance around to its distance across. It is about 3.14159, and its decimal digits never end. Calculators use a close value.'
			}
		],
		sources: [
			{ title: 'NIST SP 811: Guide for the Use of the International System of Units (SI)', url: 'https://www.nist.gov/pml/special-publication-811' },
			{ title: 'Wolfram MathWorld: Ellipse', url: 'https://mathworld.wolfram.com/Ellipse.html' }
		]
	}
});

function fail(summary: string): CalculationResult {
	return { primaryResult: DASH, primaryLabel: 'Area', summary };
}
