import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './half-life-calculator.meta';

const LN2 = Math.LN2;
const pos = (x: number) => Number.isFinite(x) && x > 0;
const notSolving = (s: string) => (v: InputValues) => String(v.solve) !== s;

/** Tiny amounts (after many half-lives) read better in scientific form. */
const amount = (x: number) => (x !== 0 && Math.abs(x) < 0.0001 ? x.toExponential(3) : num(x, 4));

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'solve',
			label: 'Solve for',
			type: 'select',
			display: 'menu',
			default: 'remaining',
			options: [
				{ label: 'Remaining amount N', value: 'remaining' },
				{ label: 'Starting amount N₀', value: 'initial' },
				{ label: 'Time elapsed t', value: 'time' },
				{ label: 'Half-life T', value: 'halfLife' }
			]
		},
		{
			id: 'initial',
			label: 'Starting amount N₀',
			type: 'number',
			default: 100,
			min: 0,
			help: 'Any unit, such as grams, atoms or becquerels.',
			visibleWhen: notSolving('initial')
		},
		{
			id: 'remaining',
			label: 'Remaining amount N',
			type: 'number',
			default: 25,
			min: 0,
			help: 'The amount left after the time elapsed. Same unit as the starting amount.',
			visibleWhen: notSolving('remaining')
		},
		{
			id: 'time',
			label: 'Time elapsed t',
			type: 'number',
			default: 20,
			min: 0,
			help: 'Any time unit works, as long as half-life uses the same one.',
			visibleWhen: notSolving('time')
		},
		{
			id: 'halfLife',
			label: 'Half-life T',
			type: 'number',
			default: 10,
			min: 0,
			help: 'Time for half of the sample to decay. Use the same time unit as elapsed time.',
			visibleWhen: notSolving('halfLife')
		}
	],
	calculate(v): CalculationResult {
		const solve = String(v.solve);
		const n = (k: string) => Number(v[k]);
		const labels: Record<string, string> = {
			remaining: 'Remaining amount N',
			initial: 'Starting amount N₀',
			time: 'Time elapsed t',
			halfLife: 'Half-life T'
		};
		const fail = (summary: string): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: labels[solve] ?? 'Remaining amount N',
			summary
		});

		let N0 = n('initial');
		let N = n('remaining');
		let t = n('time');
		let T = n('halfLife');
		let working: string;

		switch (solve) {
			case 'remaining': {
				if (!pos(N0) || !Number.isFinite(t) || t < 0 || !pos(T))
					return fail('Enter a starting amount and half-life above zero, and a time of zero or more.');
				N = N0 * Math.pow(0.5, t / T);
				working = `N = ${amount(N0)} × (1/2)^(${amount(t)} ÷ ${amount(T)}) = ${amount(N)}`;
				break;
			}
			case 'initial': {
				if (!pos(N) || !Number.isFinite(t) || t < 0 || !pos(T))
					return fail('Enter a remaining amount and half-life above zero, and a time of zero or more.');
				N0 = N / Math.pow(0.5, t / T);
				working = `N₀ = ${amount(N)} ÷ (1/2)^(${amount(t)} ÷ ${amount(T)}) = ${amount(N0)}`;
				break;
			}
			case 'time': {
				if (!pos(N0) || !pos(N) || !pos(T) || N > N0)
					return fail('Enter a remaining amount above zero that is no more than the starting amount, and a half-life above zero.');
				t = T * Math.log2(N0 / N);
				working = `t = ${amount(T)} × log₂(${amount(N0)} ÷ ${amount(N)}) = ${amount(t)}`;
				break;
			}
			case 'halfLife': {
				if (!pos(N0) || !pos(N) || !pos(t) || N >= N0)
					return fail('Enter a starting amount, a remaining amount and a time above zero, with the remaining amount below the starting amount.');
				T = t / Math.log2(N0 / N);
				working = `T = ${amount(t)} ÷ log₂(${amount(N0)} ÷ ${amount(N)}) = ${amount(T)}`;
				break;
			}
			default:
				return fail('Pick the value to solve for.');
		}

		const lambda = LN2 / T;
		const meanLife = T / LN2;
		const halfLives = t / T;

		return {
			primaryResult: amount(solve === 'remaining' ? N : solve === 'initial' ? N0 : solve === 'time' ? t : T),
			primaryLabel: labels[solve],
			summary: working,
			secondaryMetrics: [
				{ label: 'Starting amount N₀', value: amount(N0) },
				{ label: 'Remaining amount N', value: amount(N) },
				{ label: 'Time elapsed t', value: amount(t) },
				{ label: 'Half-life T', value: amount(T) },
				{ label: 'Decay constant λ', value: `${num(lambda, 6)} per time unit` },
				{ label: 'Mean lifetime τ', value: `${num(meanLife, 4)} time units` },
				{ label: 'Half-lives elapsed', value: num(halfLives, 4) }
			]
		};
	},
	content: {
		intro:
			'This half-life calculator solves decay problems for radioactive material and any other amount that halves at a steady rate. Enter three of the four values, choose the one to solve for, and get the decay constant and mean lifetime too.',
		howTo: [
			'Choose the value to solve for: remaining amount, starting amount, time elapsed or half-life.',
			'Enter the other three values. Use the same time unit for elapsed time and half-life, such as days, years or seconds.',
			'Read the result. The answer uses the same unit as your time values.',
			'Check the decay constant, mean lifetime and number of half-lives elapsed below.'
		],
		about: [
			{
				heading: 'What is a half-life?',
				paragraphs: [
					'A half-life is the time it takes for half of a sample to decay. Decay means that unstable atoms change into other atoms or forms, and each one releases energy as it does.',
					'Every half-life cuts the remaining amount in half. After one half-life, half is left. After two, a quarter is left. After three, an eighth is left. The amount never quite reaches zero, but it gets very small.',
					'For example, half-lives differ widely. Some isotopes decay in fractions of a second, while others take thousands of years. For example, carbon-14 has a half-life of about 5,730 years, which is why it is used to date old organic material.'
				]
			},
			{
				heading: 'How the decay formula works',
				paragraphs: [
					'Decay is exponential, not a straight line. The amount left after time t is N = N₀ × (1/2)^(t ÷ T). The exponent counts the number of half-lives that have passed, so the formula is a simple power.',
					'The same formula is used beyond physics. Medicine uses an elimination half-life to describe how long a drug takes to fall to half its level in the body. Cooling, cell counts and some population models follow similar curves when the decay rate is steady.',
					'You can solve for any of the four values by rearranging the formula. Solving for time or half-life needs a logarithm, which the [log calculator](/log-calculator) can help you check. Use the [exponent calculator](/exponent-calculator) to test the power in the formula.'
				],
				table: {
					caption: 'How much remains after each half-life, starting from 100',
					columns: ['Half-lives elapsed', 'Fraction remaining', 'Amount left'],
					rows: [
						['0', '1', '100'],
						['1', '1/2', '50'],
						['2', '1/4', '25'],
						['3', '1/8', '12.5'],
						['4', '1/16', '6.25'],
						['10', '1/1024', 'about 0.098']
					]
				}
			},
			{
				heading: 'Decay constant and mean lifetime',
				paragraphs: [
					'The decay constant, written λ, is the fraction of the sample that decays in one unit of time. It equals ln 2 divided by the half-life. A shorter half-life gives a larger decay constant.',
					'The mean lifetime, written τ, is the average time a single unit survives before it decays. It is the half-life divided by ln 2, so it is about 1.44 times longer than the half-life. Many people are surprised by this, because the average is longer than the midpoint.',
					'These two numbers help when you compare isotopes or compare a sample with a theoretical model. The calculator shows both, so you do not have to compute them by hand.'
				]
			},
			{
				heading: 'Tips for accurate results',
				paragraphs: ['Half-life problems are simple, but unit errors are common. Keep these points in mind:'],
				list: [
					'**Match the time units.** A half-life in years needs an elapsed time in years.',
					'**Use whole numbers of half-lives when you can.** Results are easy to check when the time is 1, 2 or 3 half-lives.',
					'**Keep the remaining amount below the start.** Remaining cannot be larger than the starting amount.',
					'**Use scientific notation for tiny amounts.** After many half-lives, the number can become very small. The [scientific notation calculator](/scientific-notation-calculator) makes it easier to read.',
					'**Turn a fraction into a percent.** To find the percent left, multiply the fraction remaining by 100, or use the [percentage calculator](/percentage-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Remaining amount',
				expression: 'N = N₀ × (1/2)^(t ÷ T)',
				variables: [
					{ symbol: 'N₀', meaning: 'starting amount' },
					{ symbol: 'N', meaning: 'amount remaining after time t' },
					{ symbol: 't', meaning: 'time elapsed' },
					{ symbol: 'T', meaning: 'half-life, the time for half the sample to decay' }
				]
			},
			{
				title: 'Solving for time or half-life',
				expression: 't = T × log₂(N₀ ÷ N)   and   T = t ÷ log₂(N₀ ÷ N)',
				variables: [{ symbol: 'log₂', meaning: 'logarithm base 2, so log₂(8) = 3' }]
			},
			{
				title: 'Decay constant and mean lifetime',
				expression: 'λ = ln 2 ÷ T = 0.6931 ÷ T,   τ = 1 ÷ λ = T ÷ ln 2',
				variables: [
					{ symbol: 'λ', meaning: 'decay constant, the fraction that decays per unit of time' },
					{ symbol: 'τ', meaning: 'mean lifetime, the average time one atom or particle survives' }
				]
			}
		],
		example: {
			title: 'A 500-gram sample with a half-life of 15 days, after 45 days',
			steps: [
				'Half-lives elapsed: 45 ÷ 15 = 3.',
				'Remaining: N = 500 × (1/2)³ = 500 ÷ 8 = 62.5 g.',
				'Decay constant: λ = 0.6931 ÷ 15 = 0.04621 per day.',
				'Mean lifetime: τ = 15 ÷ 0.6931 = 21.6404 days.'
			],
			result: 'After 45 days, 62.5 grams remain. The decay constant is 0.04621 per day and the mean lifetime is 21.6404 days.'
		},
		faq: [
			{
				q: 'What does half-life mean?',
				a: 'It is the time it takes for half of a sample to decay. Each equal period of one half-life cuts the remaining amount in half, so the amount left falls more slowly over time.'
			},
			{
				q: 'How do I calculate the remaining amount after a half-life?',
				a: 'Multiply the starting amount by (1/2) raised to the number of half-lives. For 100 units after 2 half-lives, the amount left is 100 × (1/2)² = 25.'
			},
			{
				q: 'Can I mix time units, such as years and days?',
				a: 'No. Elapsed time and half-life must use the same unit. Convert one of them first, and the answer is in that same unit.'
			},
			{
				q: 'Why is the mean lifetime longer than the half-life?',
				a: 'The mean lifetime is the average survival time, and some atoms last much longer than one half-life. It equals the half-life divided by ln 2, which is about 1.4427 times the half-life.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Exponential Decay', url: 'https://mathworld.wolfram.com/ExponentialDecay.html' },
			{ title: 'Wolfram MathWorld: Logarithm', url: 'https://mathworld.wolfram.com/Logarithm.html' }
		]
	}
});
