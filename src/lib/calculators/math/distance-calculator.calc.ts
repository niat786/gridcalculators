import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './distance-calculator.meta';

const is3d = (v: InputValues) => String(v.mode) === '3d';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Dimensions',
			type: 'select',
			display: 'segmented',
			default: '2d',
			options: [
				{ label: '2D', value: '2d' },
				{ label: '3D', value: '3d' }
			]
		},
		{ id: 'x1', label: 'x₁', type: 'number', default: 1, width: 'half' },
		{ id: 'y1', label: 'y₁', type: 'number', default: 2, width: 'half' },
		{ id: 'z1', label: 'z₁', type: 'number', default: 3, width: 'half', visibleWhen: is3d },
		{ id: 'x2', label: 'x₂', type: 'number', default: 4, width: 'half' },
		{ id: 'y2', label: 'y₂', type: 'number', default: 6, width: 'half' },
		{ id: 'z2', label: 'z₂', type: 'number', default: 15, width: 'half', visibleWhen: is3d }
	],
	calculate(v): CalculationResult {
		const threeD = is3d(v);
		const n = (k: string) => Number(v[k]);
		const fail = (summary: string): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Distance',
			summary
		});

		const x1 = n('x1');
		const y1 = n('y1');
		const x2 = n('x2');
		const y2 = n('y2');
		const z1 = threeD ? n('z1') : 0;
		const z2 = threeD ? n('z2') : 0;
		const all = threeD ? [x1, y1, z1, x2, y2, z2] : [x1, y1, x2, y2];
		if (!all.every(Number.isFinite)) return fail('Enter a number for every coordinate.');

		const dx = x2 - x1;
		const dy = y2 - y1;
		const dz = z2 - z1;
		const distance = threeD ? Math.hypot(dx, dy, dz) : Math.hypot(dx, dy);
		const mid = threeD
			? `(${num((x1 + x2) / 2, 4)}, ${num((y1 + y2) / 2, 4)}, ${num((z1 + z2) / 2, 4)})`
			: `(${num((x1 + x2) / 2, 4)}, ${num((y1 + y2) / 2, 4)})`;

		const working = threeD
			? `√(${num(Math.abs(dx), 4)}² + ${num(Math.abs(dy), 4)}² + ${num(Math.abs(dz), 4)}²) = ${num(distance, 4)}`
			: `√(${num(Math.abs(dx), 4)}² + ${num(Math.abs(dy), 4)}²) = ${num(distance, 4)}`;

		const slope = dx === 0 ? 'Undefined (vertical line)' : num(dy / dx, 4);

		return {
			primaryResult: num(distance, 4),
			primaryLabel: 'Distance',
			summary: working,
			secondaryMetrics: threeD
				? [
						{ label: 'Change in x (Δx)', value: num(dx, 4) },
						{ label: 'Change in y (Δy)', value: num(dy, 4) },
						{ label: 'Change in z (Δz)', value: num(dz, 4) },
						{ label: 'Midpoint', value: mid }
					]
				: [
						{ label: 'Change in x (Δx)', value: num(dx, 4) },
						{ label: 'Change in y (Δy)', value: num(dy, 4) },
						{ label: 'Midpoint', value: mid },
						{ label: 'Slope', value: slope }
					]
		};
	},
	content: {
		intro:
			'This distance calculator finds the straight-line distance between two points. Enter their coordinates in 2D or 3D to get the distance, the midpoint and, for 2D points, the slope of the line between them.',
		howTo: [
			'Choose 2D for points on a flat plane, or 3D for points in space.',
			'Enter the x and y coordinates of the first and second point. In 3D, also enter the z coordinates.',
			'Read the distance, the midpoint and the change in each coordinate. The slope appears in 2D.',
			'Check the working line to see the formula the calculator used.'
		],
		about: [
			{
				heading: 'What is a coordinate?',
				paragraphs: [
					'A coordinate tells you where a point sits. On a flat graph, you use two numbers, written as (x, y). The x number tells you how far to go across, and the y number tells you how far to go up.',
					'In 3D, you add a third number, z, for height or depth. So a point written as (2, 5, 1) sits 2 units across, 5 up and 1 out from the origin.',
					'The origin is the point (0, 0) in 2D, or (0, 0, 0) in 3D. Every other point is measured from there.'
				]
			},
			{
				heading: 'How the distance is found',
				paragraphs: [
					'The distance between two points is the length of the straight line joining them. To find it, first work out the change in each coordinate. Subtract the first point’s x from the second point’s x, and do the same for y.',
					'Next, square each change, add the squares, and take the square root. This is the distance formula. It is built on the Pythagorean theorem, because the changes form the two short sides of a right triangle.',
					'In 3D, you do the same with three changes instead of two. For example, a drone that moves 3 m across, 4 m forward and 12 m up has travelled √(9 + 16 + 144) = 13 m in a straight line. You can check each step with the [Pythagorean theorem calculator](/pythagorean-theorem-calculator).'
				],
				table: {
					caption: 'Worked examples of the distance formula',
					columns: ['Points', 'Changes (Δx, Δy)', 'Distance'],
					rows: [
						['(0, 0) and (3, 4)', '3, 4', '5'],
						['(1, 2) and (4, 6)', '3, 4', '5'],
						['(−3, −1) and (2, 11)', '5, 12', '13'],
						['(0, 0) and (1, 1)', '1, 1', '√2 ≈ 1.4142']
					]
				}
			},
			{
				heading: 'Midpoint and slope',
				paragraphs: [
					'The midpoint is the point exactly halfway between the two points. You find it by averaging each coordinate. Add the two x values and divide by two, then do the same for y.',
					'The slope tells you how steep the line is. It is the change in y divided by the change in x, often called rise over run. A slope of 2 means the line rises 2 units for every 1 unit it moves across.',
					'A line that is perfectly upright has no slope, because its change in x is zero and you cannot divide by zero. The calculator shows this as undefined. To explore lines further, try the [slope calculator](/slope-calculator).'
				]
			},
			{
				heading: 'Limits of this calculator',
				paragraphs: [
					'This calculator measures straight lines on a flat plane, or in ordinary 3D space. It treats each unit as the same length in every direction, and it does not use map or GPS data.',
					'So it is not a tool for the distance between two cities. Those points lie on the curved surface of the Earth, which needs a different method. Use it for graphs, drawings, models and homework.',
					'For right triangles with two known sides, the [right triangle calculator](/right-triangle-calculator) finds the third side and the angles.'
				]
			}
		],
		formulas: [
			{
				title: 'Distance in 2D',
				expression: 'd = √((x₂ − x₁)² + (y₂ − y₁)²)',
				variables: [{ symbol: 'x₁, y₁', meaning: 'coordinates of the first point' }, { symbol: 'x₂, y₂', meaning: 'coordinates of the second point' }]
			},
			{
				title: 'Distance in 3D',
				expression: 'd = √((x₂ − x₁)² + (y₂ − y₁)² + (z₂ − z₁)²)',
				variables: [{ symbol: 'z₁, z₂', meaning: 'the height or depth coordinate of each point' }]
			},
			{
				title: 'Midpoint',
				expression: 'M = ((x₁ + x₂) ÷ 2, (y₁ + y₂) ÷ 2, (z₁ + z₂) ÷ 2)',
				variables: [{ symbol: 'M', meaning: 'the point halfway between the two points' }]
			},
			{
				title: 'Slope (2D only)',
				expression: 'm = (y₂ − y₁) ÷ (x₂ − x₁)',
				variables: [{ symbol: 'm', meaning: 'rise over run; undefined when x₁ = x₂' }]
			}
		],
		example: {
			title: 'The points (−3, −1) and (2, 11) on a flat plane',
			steps: [
				'Change in x: 2 − (−3) = 5. Change in y: 11 − (−1) = 12.',
				'Distance: √(5² + 12²) = √(25 + 144) = √169 = 13.',
				'Midpoint: ((−3 + 2) ÷ 2, (−1 + 11) ÷ 2) = (−0.5, 5).',
				'Slope: 12 ÷ 5 = 2.4.'
			],
			result: 'The points are 13 units apart. Their midpoint is (−0.5, 5) and the line through them has a slope of 2.4.'
		},
		faq: [
			{
				q: 'How do I calculate the distance between two points?',
				a: 'Subtract the x values and the y values to get the two changes. Square each change, add them, and take the square root. For (0, 0) and (3, 4), the distance is √(9 + 16) = 5.'
			},
			{
				q: 'Why is the distance formula based on the Pythagorean theorem?',
				a: 'The changes in x and y form the two legs of a right triangle. The straight line between the points is its hypotenuse. In 3D, the same idea is applied with one more change.'
			},
			{
				q: 'What does an undefined slope mean?',
				a: 'When the two points share the same x value, the line is vertical. Dividing by a change of zero is not possible, so the slope is undefined.'
			},
			{
				q: 'Does the order of the two points matter?',
				a: 'No. Swapping the points changes the sign of each change, but squaring removes the sign. So the distance and the midpoint stay the same.'
			},
			{
				q: 'Can I use this calculator for distance on a map?',
				a: 'Not for real map distances. This tool measures a straight line on a flat plane. Distances between latitude and longitude points on the Earth need a different method.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Distance', url: 'https://mathworld.wolfram.com/Distance.html' },
			{ title: 'Wolfram MathWorld: Slope', url: 'https://mathworld.wolfram.com/Slope.html' }
		]
	}
});
