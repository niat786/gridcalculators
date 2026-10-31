import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num, pct } from '../format';
import meta from './percent-error-calculator.meta';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'measured',
			label: 'Experimental (measured) value',
			type: 'number',
			default: 9.8,
			help: 'The value you got from your measurement.'
		},
		{
			id: 'accepted',
			label: 'Theoretical (true) value',
			type: 'number',
			default: 9.81,
			help: 'The accepted or expected value. It cannot be 0.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const m = Number(v.measured);
		const t = Number(v.accepted);
		const label = 'Percent error';

		if (!Number.isFinite(m) || !Number.isFinite(t)) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a measured value and a theoretical value.' };
		}
		if (t === 0) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: 'The theoretical value can’t be zero, because the error is divided by it.'
			};
		}

		const absolute = Math.abs(m - t);
		const error = (absolute / Math.abs(t)) * 100;
		const signed = ((m - t) / Math.abs(t)) * 100;

		return {
			primaryResult: pct(error, 4),
			primaryLabel: label,
			summary: `|${num(m, 6)} − ${num(t, 6)}| ÷ |${num(t, 6)}| × 100 = ${pct(error, 4)}`,
			secondaryMetrics: [
				{ label: 'Absolute error', value: num(absolute, 6) },
				{ label: 'Signed percent error', value: `${signed > 0 ? '+' : ''}${pct(signed, 4)}` },
				{
					label: 'Direction',
					value: m > t ? 'Measured value is higher' : m < t ? 'Measured value is lower' : 'Matches the true value'
				}
			]
		};
	},
	content: {
		intro:
			'This percent error calculator compares your measured value with the true or accepted value. It shows how far off the measurement is as a percentage of the true value, which is useful for lab reports and homework.',
		howTo: [
			'Enter the value you measured in the experimental box.',
			'Enter the accepted or theoretical value in the second box. It cannot be zero.',
			'Read the percent error. The signed percent error shows whether you were above or below the true value.'
		],
		about: [
			{
				heading: 'What is percent error?',
				paragraphs: [
					'Percent error shows how close a measurement is to a known value. Scientists and students use it when an experiment gives a result that should match a textbook or a standard value.',
					'It is a relative measure. An error of 1 unit matters more for a value of 2 than for a value of 2,000. Dividing by the true value puts every error on the same scale, so you can compare experiments with different units.',
					'For example, if you measure a length as 9.8 cm when the true length is 10 cm, the error is 0.2 cm. As a percentage of 10 cm, that is 2%.'
				]
			},
			{
				heading: 'How the percent error is calculated',
				paragraphs: [
					'First, subtract the true value from the measured value. Then take the absolute value, which removes the minus sign, because the size of the error matters more than its direction.',
					'Next, divide by the true value. Finally, multiply by 100 to turn the result into a percentage. The absolute value means the percent error is always zero or positive.',
					'The calculator also gives a signed percent error. A plus sign means your measurement was higher than the true value, and a minus sign means it was lower.'
				],
				table: {
					caption: 'Percent error for a true value of 10',
					columns: ['Measured value', 'Absolute error', 'Percent error'],
					rows: [
						['9.8', '0.2', '2%'],
						['10.5', '0.5', '5%'],
						['10', '0', '0%'],
						['8', '2', '20%']
					]
				}
			},
			{
				heading: 'Reading the result',
				paragraphs: [
					'A small percent error means your measurement is close to the accepted value. There is no universal cut-off for a good result. An error of a few percent may be fine for a school experiment but too large for precise industrial work.',
					'Some measurements have a built-in standard. For example, standard gravity is defined as 9.80665 m/s², and 9.81 m/s² is a common rounded value. A result of 9.8 m/s² is therefore close, and the percent error shows how close.',
					'Results with more decimal places can look more precise than they are. Report the percent error with a sensible number of significant figures, based on the equipment you used. The [scientific notation calculator](/scientific-notation-calculator) helps with very large or very small values.'
				]
			},
			{
				heading: 'Tips for lab and homework work',
				paragraphs: ['Percent error questions are usually graded on method as well as the answer. Keep these steps clear:'],
				list: [
					'**Show the formula.** Write the percent error formula before you put in the numbers.',
					'**Keep the units consistent.** Convert both values to the same unit before you subtract.',
					'**Use the accepted value as the base.** Do not divide by your own measurement.',
					'**Discuss the cause.** Explain likely sources of error, such as instrument limits or reading the scale at an angle. If you repeat the measurement, the [standard deviation calculator](/standard-deviation-calculator) shows how much your readings spread.',
					'**Check the percentage.** Convert the answer to a percent with the [percentage calculator](/percentage-calculator) if you need a different format.'
				]
			}
		],
		formulas: [
			{
				title: 'Percent error',
				expression: 'Percent error = |Measured − True| ÷ |True| × 100',
				variables: [
					{ symbol: 'Measured', meaning: 'the experimental value' },
					{ symbol: 'True', meaning: 'the theoretical or accepted value' },
					{ symbol: '| |', meaning: 'absolute value, which removes any minus sign' }
				]
			},
			{
				title: 'Signed percent error',
				expression: 'Signed percent error = (Measured − True) ÷ |True| × 100',
				variables: [{ symbol: '+ or −', meaning: 'positive when the measurement is above the true value, negative when it is below' }]
			}
		],
		example: {
			title: 'Measured g of 9.8 m/s² against 9.81 m/s²',
			steps: [
				'Absolute error: |9.8 − 9.81| = 0.01.',
				'Divide by the true value: 0.01 ÷ 9.81 = 0.00101937.',
				'Multiply by 100: 0.00101937 × 100 = 0.1019%.',
				'Direction: 9.8 is below 9.81, so the signed percent error is −0.1019%.'
			],
			result: 'The percent error is 0.1019%. The measured value is slightly lower than the true value.'
		},
		faq: [
			{
				q: 'How do I calculate percent error?',
				a: 'Subtract the true value from the measured value, take the absolute value, divide by the true value, and multiply by 100. For a measured 9.8 against a true 10, the percent error is 2%.'
			},
			{
				q: 'What is a good percent error?',
				a: 'It depends on the experiment. A small percent error means the measurement is close to the accepted value. Acceptable limits depend on the equipment and the field, so check your course or lab guidelines.'
			},
			{
				q: 'What is the difference between percent error and percent difference?',
				a: 'Percent error compares a measurement with a known true value. Percent difference compares two measured values with each other, and uses their average as the base.'
			},
			{
				q: 'Why are the vertical bars used?',
				a: 'The bars make the error a size, not a direction. A reading 2 too high and a reading 2 too low both have an absolute error of 2.'
			},
			{
				q: 'Can the true value be zero?',
				a: 'No. The true value is the divisor, and dividing by zero is not possible. In that case, compare the absolute error instead, because a percentage has no meaning.'
			}
		],
		sources: [
			{ title: 'NIST SP 811: Guide for the Use of the International System of Units (SI)', url: 'https://www.nist.gov/pml/special-publication-811' },
			{ title: 'Wolfram MathWorld: Percentage', url: 'https://mathworld.wolfram.com/Percentage.html' }
		]
	}
});
