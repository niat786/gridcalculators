import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num, pct } from '../format';
import meta from './ratio-calculator.meta';

const mode = (m: string) => (v: InputValues) => v.mode === m;

function gcd(a: number, b: number): number {
	let x = Math.abs(a);
	let y = Math.abs(b);
	while (y !== 0) {
		const t = x % y;
		x = y;
		y = t;
	}
	return x;
}

/**
 * Scale two positive numbers (up to six decimal places) to whole numbers, then divide out
 * their greatest common factor. Returns null when the values need more decimal places.
 */
function simplestRatio(a: number, b: number) {
	for (let k = 0; k <= 6; k++) {
		const scale = 10 ** k;
		const x = Math.round(a * scale);
		const y = Math.round(b * scale);
		if (Math.abs(x - a * scale) < 1e-7 && Math.abs(y - b * scale) < 1e-7) {
			const g = gcd(x, y);
			return { scale, x, y, g, p: x / g, q: y / g };
		}
	}
	return null;
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'What do you want to do?',
			type: 'select',
			display: 'segmented',
			default: 'simplify',
			options: [
				{ label: 'Simplify A : B', value: 'simplify' },
				{ label: 'Solve A : B = C : ?', value: 'solve' }
			]
		},
		{ id: 'a', label: 'Value A', type: 'number', default: 12, min: 0, help: 'Whole numbers or decimals.' },
		{ id: 'b', label: 'Value B', type: 'number', default: 18, min: 0 },
		{
			id: 'c',
			label: 'Value C',
			type: 'number',
			default: 8,
			min: 0,
			help: 'The first value of the second ratio. Its partner is the missing value.',
			visibleWhen: mode('solve')
		}
	],
	calculate(v: InputValues): CalculationResult {
		const a = Number(v.a);
		const b = Number(v.b);
		const solve = v.mode === 'solve';
		const label = solve ? 'Missing value (?)' : 'Simplest ratio';

		if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter two values greater than zero.' };
		}

		if (solve) {
			const c = Number(v.c);
			if (!Number.isFinite(c) || c < 0) {
				return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a value for C, zero or more.' };
			}
			const d = (b * c) / a;
			const simple = simplestRatio(a, b);
			return {
				primaryResult: num(d, 6),
				primaryLabel: label,
				summary: `${num(a, 6)} : ${num(b, 6)} = ${num(c, 6)} : ?, so ? = ${num(b, 6)} × ${num(c, 6)} ÷ ${num(a, 6)} = ${num(d, 6)}.`,
				secondaryMetrics: [
					{ label: 'Completed ratio', value: `${num(a, 6)} : ${num(b, 6)} = ${num(c, 6)} : ${num(d, 6)}` },
					{ label: 'Scale factor (C ÷ A)', value: num(c / a, 6) },
					{ label: 'A : B simplified', value: simple ? `${simple.p} : ${simple.q}` : DASH }
				]
			};
		}

		const simple = simplestRatio(a, b);
		if (!simple) return { primaryResult: DASH, primaryLabel: label, summary: 'Use no more than six decimal places.' };
		const { scale, x, y, g, p, q } = simple;

		let summary: string;
		if (scale === 1 && g === 1) summary = 'Both values are whole and already share no common factor.';
		else if (scale === 1) summary = `Divide both values by their greatest common factor, ${num(g, 0)}.`;
		else if (g === 1) summary = `Multiply both by ${num(scale, 0)} to get ${num(x, 0)} : ${num(y, 0)}, which has no common factor.`;
		else summary = `Multiply both by ${num(scale, 0)} to get ${num(x, 0)} : ${num(y, 0)}, then divide both by ${num(g, 0)}.`;

		return {
			primaryResult: `${p}:${q}`,
			primaryLabel: label,
			summary,
			secondaryMetrics: [
				{ label: 'Decimal (A ÷ B)', value: num(a / b, 6) },
				{ label: 'Share of A', value: pct((a / (a + b)) * 100, 2) },
				{ label: 'Share of B', value: pct((b / (a + b)) * 100, 2) }
			]
		};
	},
	content: {
		intro:
			'Simplify a ratio to its lowest whole-number terms, or solve a proportion to find a missing value. Works with whole numbers and decimals, so you can scale recipes, maps and mixes.',
		howTo: [
			'Choose Simplify A : B, or Solve A : B = C : ?.',
			'Enter Value A and Value B. For a proportion, also enter Value C.',
			'Read the simplest ratio, or the missing value. The shares and the working update as you type.'
		],
		about: [
			{
				heading: 'What is a ratio?',
				paragraphs: [
					'A ratio compares two amounts of the same kind. It is written A : B, and read as “A to B”. For example, if a bag has 12 red sweets and 18 green sweets, the ratio of red to green is 12 : 18.',
					'Order matters. The ratio 2 : 3 means two of the first thing for every three of the second. So 3 : 2 is a different ratio, even though it uses the same numbers.',
					'A ratio says nothing about the actual amounts. 2 : 3 could mean 2 cups and 3 cups, or 20 cups and 30 cups. Only the relationship is the same.'
				]
			},
			{
				heading: 'How to simplify a ratio',
				paragraphs: [
					'To simplify a ratio, find the greatest common factor (GCF) of the two numbers. Divide both numbers by it. For 12 : 18, the GCF is 6. So 12 ÷ 6 = 2 and 18 ÷ 6 = 3, and the simplest form is 2 : 3.',
					'Decimals work the same way. First, multiply both numbers by a power of 10 until they are whole. Then simplify. For example, 1.5 : 3 becomes 15 : 30, and dividing by 15 gives 1 : 2.',
					'Simplifying doesn’t change the relationship. 12 : 18, 2 : 3 and 4 : 6 all describe the same mix. To find a common factor by hand, the [GCF calculator](/gcf-calculator) is a quick check.'
				]
			},
			{
				heading: 'Shares of a total',
				paragraphs: [
					'A ratio splits a total into parts. Add the two parts to get the number of parts in the whole. Then each share is its part divided by that total.',
					'For the ratio 12 : 18, the total is 30. So A is 12 ÷ 30 = 40% of the whole, and B is 18 ÷ 30 = 60%. The calculator shows both shares with the result.',
					'This helps when you mix something. If a paint mix is 1 part paint to 4 parts thinner, the paint is 1 ÷ 5 = 20% of the mix, and the thinner is 80%. For percent problems, the [percentage calculator](/percentage-calculator) works the same way.'
				]
			},
			{
				heading: 'Solving a proportion',
				paragraphs: [
					'A proportion says two ratios are equal. Write it as A : B = C : ?, and find the missing value. Multiply B by C, then divide by A. So ? = B × C ÷ A.',
					'Take a recipe that uses 2 cups of flour to 3 cups of sugar. You want 4 cups of flour. Then 3 × 4 ÷ 2 = 6, so you need 6 cups of sugar. Check it: 2 : 3 and 4 : 6 both simplify to 2 : 3.',
					'The scale factor is C ÷ A. Here it is 4 ÷ 2 = 2, so every amount in the recipe doubles.'
				]
			},
			{
				heading: 'Tips for using ratios',
				paragraphs: [
					'Use the same unit on both sides. A ratio of 2 kilograms to 500 grams must be converted first, to 2,000 : 500, before you simplify it to 4 : 1.'
				],
				list: [
					'Write the ratio in the order the question gives it.',
					'Check your answer by multiplying both parts by the same number. The ratio should not change.',
					'For a ratio with three or more parts, such as 1 : 2 : 3, simplify it by dividing all parts by their common factor.',
					'Need to convert units first? The [unit converter](/unit-converter) helps.'
				]
			}
		],
		formulas: [
			{
				title: 'Simplify a ratio',
				expression: 'A : B = (A ÷ g) : (B ÷ g), where g is the greatest common factor of A and B',
				variables: [{ symbol: 'g', meaning: 'the largest whole number that divides both A and B' }]
			},
			{
				title: 'Solve a proportion',
				expression: 'A : B = C : D, so D = B × C ÷ A',
				variables: [
					{ symbol: 'D', meaning: 'the missing value' },
					{ symbol: 'C', meaning: 'the first value of the second ratio' }
				]
			},
			{
				title: 'Share of a total',
				expression: 'Share of A = A ÷ (A + B) × 100%',
				variables: [{ symbol: 'A + B', meaning: 'the total number of parts' }]
			}
		],
		example: {
			title: 'Simplify 12 : 18',
			steps: ['The greatest common factor of 12 and 18 is 6.', '12 ÷ 6 = 2 and 18 ÷ 6 = 3', 'So 12 : 18 is the same ratio as 2 : 3.'],
			result: 'The simplest form of 12 : 18 is 2 : 3.'
		},
		faq: [
			{
				q: 'How do I simplify a ratio with decimals?',
				a: 'Multiply both numbers by a power of 10 until they are whole, then divide both by their greatest common factor. For example, 0.5 : 0.75 becomes 50 : 75, and dividing by 25 gives 2 : 3.'
			},
			{
				q: 'How do I solve a proportion?',
				a: 'Cross-multiply. If A : B = C : D, then A × D = B × C, so D = B × C ÷ A. For example, in 2 : 3 = 4 : ?, the missing value is 3 × 4 ÷ 2 = 6.'
			},
			{
				q: 'Is a ratio the same as a fraction?',
				a: 'They are related but not the same. A ratio compares two quantities, such as 2 boys to 3 girls. A fraction describes one part of a whole. Both can be simplified in the same way.'
			},
			{
				q: 'Can a ratio have more than two parts?',
				a: 'Yes, such as 1 : 2 : 3, which has six parts in total. This calculator compares two values at a time, so for three parts, compare the first and second, then the second and third.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Ratio', url: 'https://en.wikipedia.org/wiki/Ratio' },
			{ title: 'Wikipedia — Proportionality (mathematics)', url: 'https://en.wikipedia.org/wiki/Proportionality_(mathematics)' }
		]
	}
});
