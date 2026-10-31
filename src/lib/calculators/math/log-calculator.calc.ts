import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './log-calculator.meta';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'x',
			label: 'Number (x)',
			type: 'number',
			default: 1000,
			min: 0,
			help: 'Must be greater than 0.'
		},
		{
			id: 'b',
			label: 'Base (b)',
			type: 'number',
			default: 10,
			min: 0,
			help: 'Must be greater than 0 and not equal to 1. Use 10 for common logs, 2 for binary, or e for natural logs.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const x = Number(v.x);
		const b = Number(v.b);
		const label = 'Logarithm';
		if (!Number.isFinite(x) || x <= 0) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: 'The number must be greater than 0. The log of zero or a negative number is not a real number.'
			};
		}
		if (!Number.isFinite(b) || b <= 0 || b === 1) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: 'The base must be greater than 0 and not equal to 1.'
			};
		}

		const lnX = Math.log(x);
		const lnB = Math.log(b);
		const result = lnX / lnB;

		return {
			primaryResult: num(result, 6),
			primaryLabel: `Logarithm, base ${num(b, 6)}`,
			summary: `Change of base: log_b(x) = ln(x) ÷ ln(b) = ${num(lnX, 6)} ÷ ${num(lnB, 6)} = ${num(result, 6)}, because ${num(b, 6)} raised to that power gives ${num(x, 6)}.`,
			secondaryMetrics: [
				{ label: 'Natural log, ln(x)', value: num(lnX, 6) },
				{ label: 'Common log, log₁₀(x)', value: num(Math.log10(x), 6) },
				{ label: 'Binary log, log₂(x)', value: num(Math.log2(x), 6) },
				{ label: 'Check: b to the power of the result', value: num(Math.pow(b, result), 6) }
			]
		};
	},
	content: {
		intro:
			'Find the logarithm of a positive number in any base. A logarithm answers one question: what power must the base be raised to, to get this number? The calculator also shows the natural, common and binary logs of the same number.',
		howTo: [
			'Type the number x. It must be greater than 0.',
			'Type the base b. It must be greater than 0 and not equal to 1. The default is 10.',
			'Read the logarithm. The extra results show ln, log base 10 and log base 2 of the same number, plus a check.'
		],
		about: [
			{
				heading: 'What a logarithm means',
				paragraphs: [
					'A logarithm is the reverse of a power. Since 10³ = 1,000, the logarithm of 1,000 in base 10 is 3. We write this as log₁₀(1,000) = 3.',
					'Here are a few more. Since 2³ = 8, the logarithm of 8 in base 2 is 3. Since 3⁴ = 81, the logarithm of 81 in base 3 is 4. In each case, the logarithm is the power.',
					'If you know a power, you can flip it into a logarithm. The [exponent calculator](/exponent-calculator) works in the forward direction, from base and power to the answer.'
				]
			},
			{
				heading: 'Common, natural and binary logs',
				paragraphs: [
					'Three bases come up often. The common log uses base 10, and it is the one many calculators label “log”. It is used for scales such as pH and decibels.',
					'The natural log uses base e, which is about 2.71828. It is written ln, and it appears in growth, decay and compound interest. The binary log uses base 2, and it is useful in computing, where data is counted in bits.',
					'The calculator shows all three for your number, so you can compare them. For example, log₂(1,024) is 10, because 2¹⁰ = 1,024.'
				]
			},
			{
				heading: 'Why logs turn multiplying into adding',
				paragraphs: [
					'Logs turn multiplication into addition. Multiply 100 by 1,000 to get 100,000. In logs, 2 + 3 = 5, because the logs of 100 and 1,000 are 2 and 3. And log₁₀(100,000) is 5.',
					'For this reason, logs were used for hard calculations before calculators existed. People looked up logs in tables, added them, then found the answer again.',
					'The same idea helps when numbers are very different in size. A log scale shows each step as the same distance, so the small and large values both fit on one chart.'
				]
			},
			{
				heading: 'Logs in any base: change of base',
				paragraphs: [
					'Most calculators only have keys for base 10 and base e. To find a log in any other base, use the change of base formula. Divide the natural log of the number by the natural log of the base.',
					'For example, to find log₃(81), calculate ln(81) ÷ ln(3). This is 4.394449 ÷ 1.098612, which is 4. Check: 3⁴ = 81. The calculator does this step and shows the check.'
				]
			},
			{
				heading: 'Using logs to count doublings',
				paragraphs: [
					'Logs help you find how many times something must double. Suppose a value starts at 1 and doubles each year, and you want it to pass 1,000. The answer is log₂(1,000), which is about 9.97.',
					'You can’t have 9.97 years, so the value passes 1,000 in the tenth year. After nine doublings it is 512, and after ten it is 1,024. Use the [scientific calculator](/scientific-calculator) to try your own numbers with the log keys.',
					'A log also shrinks very large numbers. The log of 1,000,000 in base 10 is 6, which is easier to compare than the number itself. For more on very large numbers, see [scientific notation](/scientific-notation-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Definition',
				expression: 'logᵦ(x) = y   means   bʸ = x',
				variables: [
					{ symbol: 'b', meaning: 'the base, greater than 0 and not 1' },
					{ symbol: 'x', meaning: 'the number, greater than 0' },
					{ symbol: 'y', meaning: 'the power the base must be raised to' }
				]
			},
			{
				title: 'Change of base',
				expression: 'logᵦ(x) = ln(x) ÷ ln(b)   and   logᵦ(x) = log₁₀(x) ÷ log₁₀(b)',
				variables: [
					{ symbol: 'ln', meaning: 'the natural log, which uses base e (about 2.71828)' },
					{ symbol: 'log₁₀', meaning: 'the common log, which uses base 10' }
				]
			}
		],
		example: {
			title: 'Log base 3 of 81',
			steps: [
				'Use change of base: log₃(81) = ln(81) ÷ ln(3).',
				'ln(81) ≈ 4.394449 and ln(3) ≈ 1.098612.',
				'4.394449 ÷ 1.098612 ≈ 4.',
				'Check: 3⁴ = 81.'
			],
			result: 'log₃(81) = 4, because 3 raised to the power 4 is 81.'
		},
		faq: [
			{
				q: 'Why must the base not be 1?',
				a: 'Raising 1 to any power always gives 1. So a base of 1 can never reach a number other than 1, and the logarithm would not be defined for most numbers.'
			},
			{
				q: 'Why can’t the number be zero or negative?',
				a: 'A positive base raised to any real power always gives a positive result. So no real power produces 0 or a negative number, and the log is undefined there.'
			},
			{
				q: 'What is the difference between ln and log?',
				a: 'On most calculators, “log” means base 10, and “ln” means the natural log, base e. Both are logs, so the change of base formula converts between any pair.'
			},
			{
				q: 'What is the log of 1?',
				a: 'It is 0 in any base, because any valid base to the power 0 equals 1. For example, log₁₀(1) = 0.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Logarithm', url: 'https://en.wikipedia.org/wiki/Logarithm' },
			{ title: 'Wikipedia — Natural logarithm', url: 'https://en.wikipedia.org/wiki/Natural_logarithm' }
		]
	}
});
