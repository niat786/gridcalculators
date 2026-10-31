import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num } from '../format';
import meta from './slope-calculator.meta';

/** Keeps float noise such as -1e-17 from showing as "-0". */
const tidy = (x: number) => (Math.abs(x) < 1e-12 ? 0 : x);

/** Number with a true minus sign (−) for negatives, for display. */
const sgn = (x: number) => (x < 0 ? '−' : '') + num(Math.abs(tidy(x)), 6);

/** Angle in degrees to four decimal places, with a true minus sign. */
const degrees = (x: number) => (x < 0 ? '−' : '') + num(Math.abs(tidy(x)), 4) + '°';

function lineEquation(m: number, b: number): string {
	if (m === 0) return `y = ${sgn(b)}`;
	const coefficient = Math.abs(m) === 1 ? '' : num(Math.abs(m), 6);
	const term = `${m < 0 ? '−' : ''}${coefficient}x`;
	if (b === 0) return `y = ${term}`;
	return `y = ${term} ${b > 0 ? '+' : '−'} ${num(Math.abs(b), 6)}`;
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'x1', label: 'x of point 1', type: 'number', default: 2, width: 'half' },
		{ id: 'y1', label: 'y of point 1', type: 'number', default: 3, width: 'half' },
		{ id: 'x2', label: 'x of point 2', type: 'number', default: 6, width: 'half' },
		{ id: 'y2', label: 'y of point 2', type: 'number', default: 11, width: 'half' }
	],
	calculate(v): CalculationResult {
		const x1 = Number(v.x1);
		const y1 = Number(v.y1);
		const x2 = Number(v.x2);
		const y2 = Number(v.y2);
		if (![x1, y1, x2, y2].every(Number.isFinite)) {
			return { primaryResult: DASH, primaryLabel: 'Slope', summary: 'Enter x and y for both points.' };
		}
		if (x1 === x2 && y1 === y2) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Slope',
				summary: 'The two points are the same, so they do not define a line.'
			};
		}

		const dx = x2 - x1;
		const dy = y2 - y1;
		const distance = Math.hypot(dx, dy);

		if (dx === 0) {
			return {
				primaryResult: 'Undefined',
				primaryLabel: 'Slope',
				summary: `Both x values are ${num(x1, 6)}, so the line is vertical: Δx = 0 and the slope is Δy ÷ 0.`,
				secondaryMetrics: [
					{ label: 'Angle', value: '90°' },
					{ label: 'Distance', value: num(distance, 6) },
					{ label: 'Y-intercept', value: 'None' },
					{ label: 'Equation', value: `x = ${sgn(x1)}` }
				]
			};
		}

		const m = tidy(dy / dx);
		const b = tidy(y1 - m * x1);
		const angle = tidy((Math.atan(m) * 180) / Math.PI);
		return {
			primaryResult: sgn(m),
			primaryLabel: 'Slope',
			summary: `(${sgn(y2)} − ${sgn(y1)}) ÷ (${sgn(x2)} − ${sgn(x1)}) = ${sgn(m)}`,
			secondaryMetrics: [
				{ label: 'Angle', value: degrees(angle) },
				{ label: 'Distance', value: num(distance, 6) },
				{ label: 'Y-intercept', value: sgn(b) },
				{ label: 'Equation', value: lineEquation(m, b) }
			]
		};
	},
	content: {
		intro:
			'This slope calculator finds the slope of the straight line through two points. It also gives the angle of the line, the distance between the points and the equation of the line, y = mx + b.',
		howTo: [
			'Enter the x and y values of the first point.',
			'Enter the x and y values of the second point.',
			'Read the slope, angle, distance, y-intercept and the equation of the line.'
		],
		about: [
			{
				heading: 'What is slope?',
				paragraphs: [
					'Slope measures how steep a line is. It compares the rise, the change up or down, with the run, the change across. A line that climbs 2 units for every 1 unit across has a slope of 2.',
					'A positive slope means the line goes up from left to right. A negative slope means it goes down. A slope of zero is flat, and an upright line has no slope at all.',
					'Slope is often written as m. In the equation y = mx + b, m is the slope and b is the point where the line crosses the y-axis.'
				]
			},
			{
				heading: 'How the slope is calculated',
				paragraphs: [
					'Start with two points, such as (2, 3) and (6, 11). Subtract the first x from the second x to get the run, which is 4. Then subtract the first y from the second y to get the rise, which is 8.',
					'Divide the rise by the run, so 8 ÷ 4 = 2. The line has a slope of 2. Because the slope is the same between any two points on a straight line, the choice of points does not change the answer.',
					'Next, find the intercept. Put one point into y = mx + b, and solve for b. Here, 3 = 2 × 2 + b, so b = −1. That gives the equation y = 2x − 1.'
				],
				table: {
					caption: 'Slope values and what they look like',
					columns: ['Slope', 'Direction', 'Example'],
					rows: [
						['2', 'Steep, rising', 'Rises 2 for every 1 across'],
						['1', 'Rising at 45°', 'Rises 1 for every 1 across'],
						['0.5', 'Gentle, rising', 'Rises 1 for every 2 across'],
						['0', 'Flat', 'Same height everywhere'],
						['−1', 'Falling at 45°', 'Drops 1 for every 1 across'],
						['Undefined', 'Vertical', 'Same x value for both points']
					]
				}
			},
			{
				heading: 'Slope in everyday life',
				paragraphs: [
					'Slope appears in many real places. For example, road builders use a percent grade, which is the slope multiplied by 100. A 5% grade rises 5 metres for every 100 metres along the road.',
					'Ramps follow a similar rule. Many accessibility standards, including the ADA in the United States, set a maximum ramp slope of 1 in 12, which is about 8.3%. Check the rules in your area before you build one.',
					'Slope also describes money and data. A rate of change on a graph, such as cost against hours, has a slope that shows how fast the cost grows. To find the length of the line itself, use the [distance calculator](/distance-calculator). For a curve instead of a straight line, the [quadratic formula calculator](/quadratic-formula-calculator) finds the turning point of a parabola.'
				]
			},
			{
				heading: 'Tips for reading a slope',
				paragraphs: ['Small sign errors are the most common mistake. These checks help you spot them:'],
				list: [
					'**Keep the order the same.** Take both x values and both y values from the same point order.',
					'**Watch the signs.** A negative number minus another negative number needs care.',
					'**Check the direction.** A rising line should have a positive slope when you read left to right.',
					'**Use the equation to test a point.** Put a known point into y = mx + b. It should be true.',
					'**Compare the angle.** The angle is the arctan of the slope, so a steeper line has a larger angle. To turn a slope into angles of a triangle, see the [right triangle calculator](/right-triangle-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Slope',
				expression: 'm = (y₂ − y₁) ÷ (x₂ − x₁)',
				variables: [{ symbol: 'm', meaning: 'slope, the rise for each unit of run' }]
			},
			{
				title: 'Angle',
				expression: 'θ = arctan(m)',
				variables: [{ symbol: 'θ', meaning: 'the angle the line makes with the x-axis, in degrees' }]
			},
			{
				title: 'Distance',
				expression: 'd = √((x₂ − x₁)² + (y₂ − y₁)²)',
				variables: [{ symbol: 'd', meaning: 'straight-line distance between the two points' }]
			},
			{
				title: 'Equation of the line',
				expression: 'y = mx + b,   where b = y₁ − m × x₁',
				variables: [{ symbol: 'b', meaning: 'the y-intercept, where the line crosses the y-axis' }]
			}
		],
		example: {
			title: 'A line through (2, 3) and (6, 11)',
			steps: [
				'Slope: (11 − 3) ÷ (6 − 2) = 8 ÷ 4 = 2.',
				'Intercept: b = 3 − 2 × 2 = −1.',
				'Equation: y = 2x − 1.',
				'Check with the second point: 2 × 6 − 1 = 11, which matches.'
			],
			result: 'The line rises 2 units for every 1 unit across, and crosses the y-axis at −1.'
		},
		faq: [
			{
				q: 'How do I find the slope of a line?',
				a: 'Divide the change in y by the change in x between two points on the line. For (2, 3) and (6, 11), the slope is 8 ÷ 4 = 2. Enter both points in the calculator to check.'
			},
			{
				q: 'What does an undefined slope mean?',
				a: 'The two points have the same x value, so the line is vertical. Dividing by a zero change in x is not possible, so the slope is undefined. Its equation is x = a constant.'
			},
			{
				q: 'What is a slope of zero?',
				a: 'A slope of zero means the line is horizontal. The two points have the same y value, and the equation is y = b.'
			},
			{
				q: 'Does it matter which point is first?',
				a: 'No. Swapping the two points changes the signs of both the rise and the run. The slope and the equation stay the same.'
			},
			{
				q: 'What is a 5% grade?',
				a: 'A 5% grade means the slope is 0.05. The road rises 5 units for every 100 units along it. Multiply the slope by 100 to get the percent grade.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Slope', url: 'https://mathworld.wolfram.com/Slope.html' },
			{ title: 'ADA Standards for Accessible Design (2010)', url: 'https://www.ada.gov/law-and-regs/design-standards/2010-stds/' }
		]
	}
});
