import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './height-calculator.meta';

const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';

/** Mid-parental method: add 13 cm for a boy, subtract 13 cm for a girl, then average the parents. */
export const SEX_OFFSET_CM = 13;
/** Target range: the prediction plus or minus this many cm. */
export const RANGE_CM = 8.5;

/** Feet and inches text, e.g. "5 ft 10.5 in", from centimetres. */
export function feetInches(cm: number): string {
	const tenths = Math.round((cm / 2.54) * 10);
	const ft = Math.floor(tenths / 120);
	const rem = tenths - ft * 120;
	return `${ft} ft ${num(rem / 10, 1, 0)} in`;
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'metric',
			options: [
				{ label: 'Metric (cm)', value: 'metric' },
				{ label: 'Imperial (ft, in)', value: 'imperial' }
			]
		},
		{
			id: 'sex',
			label: "Child's sex",
			type: 'select',
			display: 'segmented',
			default: 'boy',
			options: [
				{ label: 'Boy', value: 'boy' },
				{ label: 'Girl', value: 'girl' }
			]
		},
		{ id: 'fatherCm', label: "Father's height", type: 'number', default: 180, min: 120, max: 230, step: 0.1, suffix: 'cm', visibleWhen: metric },
		{ id: 'motherCm', label: "Mother's height", type: 'number', default: 165, min: 120, max: 230, step: 0.1, suffix: 'cm', visibleWhen: metric },
		{ id: 'fatherFt', label: "Father's height (feet)", type: 'number', default: 5, min: 4, max: 7, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: imperial },
		{ id: 'fatherIn', label: "Father's height (inches)", type: 'number', default: 11, min: 0, max: 11.9, step: 0.1, suffix: 'in', width: 'half', visibleWhen: imperial },
		{ id: 'motherFt', label: "Mother's height (feet)", type: 'number', default: 5, min: 4, max: 7, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: imperial },
		{ id: 'motherIn', label: "Mother's height (inches)", type: 'number', default: 5, min: 0, max: 11.9, step: 0.1, suffix: 'in', width: 'half', visibleWhen: imperial }
	],
	calculate(v): CalculationResult {
		const parentCm = (p: 'father' | 'mother') =>
			v.units === 'metric'
				? Number(v[`${p}Cm`])
				: (Number(v[`${p}Ft`]) * 12 + Number(v[`${p}In`])) * 2.54;
		const father = parentCm('father');
		const mother = parentCm('mother');
		const invalid: CalculationResult = {
			primaryResult: DASH,
			primaryLabel: 'Predicted adult height',
			summary: "Enter both parents' heights."
		};
		if (!(father > 0) || !(mother > 0)) return invalid;

		const isBoy = v.sex === 'boy';
		const offset = isBoy ? SEX_OFFSET_CM : -SEX_OFFSET_CM;
		const mid = (father + mother + offset) / 2;
		const low = mid - RANGE_CM;
		const high = mid + RANGE_CM;
		const shown = v.units === 'imperial' ? feetInches(mid) : `${num(mid, 0)} cm`;

		return {
			primaryResult: shown,
			primaryLabel: 'Predicted adult height',
			summary:
				'This is a population average, and genetics explain only part of final height. Read it as a target range.',
			secondaryMetrics: [
				{ label: 'Target range', value: `${num(low, 1, 1)} to ${num(high, 1, 1)} cm` },
				{ label: 'Target range (ft, in)', value: `${feetInches(low)} to ${feetInches(high)}` },
				{ label: 'Average of the two parents', value: `${num((father + mother) / 2, 1, 1)} cm` },
				{ label: 'Sex adjustment applied', value: `${isBoy ? '+' : '−'}${num(SEX_OFFSET_CM / 2, 1, 1)} cm` }
			]
		};
	},
	content: {
		intro:
			"Estimate a child's likely adult height from the heights of both parents, using the mid-parental height method. The answer is a target range, not a forecast. It works for boys and girls in metric or imperial units.",
		howTo: [
			'Choose metric or imperial units, then choose whether the child is a boy or a girl.',
			"Enter the father's height and the mother's height.",
			'Read the predicted adult height and the target range around it.',
			'Use the result as a rough guide, and compare it with the child’s growth over time.'
		],
		about: [
			{
				heading: 'How the mid-parental method works',
				paragraphs: [
					'The mid-parental method takes the average of both parents’ heights. It then adjusts that average for the child’s sex, because adult men are usually taller than adult women. The result is a single estimate, with a range either side.',
					'Doctors and genetic counsellors have used this method for many years. It is simple, and it is more useful for the average child than for any one child.'
				]
			},
			{
				heading: 'Why 13 cm is added or taken away',
				paragraphs: [
					'In many populations, adult men are about 13 cm taller than adult women on average. The method adds 13 cm for a boy and takes 13 cm away for a girl. Each parent then contributes half of that difference to the average.',
					'Because of this, a boy’s predicted height is higher than the plain average of his parents, and a girl’s is lower. The adjustment is an average, so it may not match your family exactly.'
				]
			},
			{
				heading: 'Why predictions can be wrong',
				paragraphs: [
					'Many genes influence height, and they combine in complicated ways. A child can be taller or shorter than both parents, and this happens often. The method cannot see every gene, so it has limits.',
					'Nutrition, illness, sleep and the timing of puberty also affect final height. A child who grows early may finish a little shorter, and a child who grows late may finish taller.'
				]
			},
			{
				heading: 'Tracking growth instead',
				paragraphs: [
					'A height measured over time tells you more than a single prediction. Health services plot a child’s height on growth charts, which compare them with others of the same age and sex. The CDC charts are used in the US, the WHO growth standards are used for children under 5 in many countries, and the UK uses its own charts.',
					'If a child’s line on the chart moves away from its own path, speak to a doctor or nurse. They can check the growth and look for the cause.'
				]
			},
			{
				heading: 'Units and conversions',
				paragraphs: [
					'One inch is 2.54 cm, so the calculator converts between the two systems for you. A height of 179 cm is about 5 feet 10.5 inches. Use the same units for both parents to avoid mixing them up.',
					'For adults, the [BMI calculator](/bmi-calculator) uses height and weight together. To see how old a child is, the [age calculator](/age-calculator) counts years, months and days. For a rough healthy weight range for an adult of a given height, see the [ideal weight calculator](/ideal-weight-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Boys',
				expression: '(father’s height + mother’s height + 13 cm) ÷ 2',
				variables: [
					{ symbol: 'father’s height', meaning: "The father's height in cm" },
					{ symbol: 'mother’s height', meaning: "The mother's height in cm" }
				]
			},
			{
				title: 'Girls',
				expression: '(father’s height + mother’s height − 13 cm) ÷ 2',
				variables: [{ symbol: '13 cm', meaning: 'The average difference in adult height between men and women, split across both parents' }]
			},
			{
				title: 'Target range',
				expression: 'predicted height ± 8.5 cm',
				variables: [{ symbol: '8.5 cm', meaning: 'The commonly used half-width of the target range for the method' }]
			}
		],
		example: {
			title: 'A boy whose father is 180 cm and mother is 165 cm tall',
			steps: [
				'Add the parents and the adjustment: 180 + 165 + 13 = 358',
				'Divide by 2: 358 ÷ 2 = 179 cm',
				'Range: 179 − 8.5 = 170.5 cm to 179 + 8.5 = 187.5 cm'
			],
			result: 'Predicted adult height is 179 cm (about 5 ft 10.5 in), with a target range of 170.5 to 187.5 cm.'
		},
		faq: [
			{
				q: 'How accurate is this height predictor?',
				a: 'The target range is about 8.5 cm either side of the prediction. Many children finish within it, but some finish outside it, so treat the result as a rough guide.'
			},
			{
				q: 'Do genes decide a child’s height?',
				a: 'Genes explain only part of height. Nutrition, illness, sleep, hormones and the timing of puberty also play a part, which is why a prediction from parents can miss.'
			},
			{
				q: 'Should I use this instead of a growth chart?',
				a: 'No. A doctor or nurse plots a child’s height over time on a growth chart, which compares the child with others of the same age and sex. The growth pattern shows more than any single prediction.'
			},
			{
				q: 'Why add or subtract 13 cm?',
				a: 'On average, adult men are taller than adult women. The method adds 13 cm for a boy and subtracts 13 cm for a girl, then averages the two parents, so each parent contributes half of the difference.'
			},
			{
				q: 'What if one parent is not available?',
				a: 'The method needs both heights. If one parent is not known or not available, the prediction is not reliable, and a growth chart is a better guide.'
			}
		],
		sources: [
			{ title: 'CDC — Growth Charts', url: 'https://www.cdc.gov/growthcharts/' },
			{ title: 'American Academy of Pediatrics — HealthyChildren.org', url: 'https://www.healthychildren.org/' }
		],
		disclaimer:
			'This is an estimate for planning and curiosity only. Ask a pediatrician or doctor if you are worried about a child’s growth.'
	}
});
