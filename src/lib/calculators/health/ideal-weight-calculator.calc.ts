import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './ideal-weight-calculator.meta';

const LB = 0.45359237;
const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';

/** Height at which the formulas below apply: 5 feet (152.4 cm). */
const MIN_INCHES = 60;

/** Formula estimates in kilograms. `over` is height in inches above 5 feet. */
export const formulas: { label: string; estimate: (male: boolean, over: number) => number }[] = [
	{ label: 'Robinson (1983)', estimate: (m, o) => (m ? 52 + 1.9 * o : 49 + 1.7 * o) },
	{ label: 'Miller (1983)', estimate: (m, o) => (m ? 56.2 + 1.41 * o : 53.1 + 1.36 * o) },
	{ label: 'Devine (1974)', estimate: (m, o) => (m ? 50 + 2.3 * o : 45.5 + 2.3 * o) },
	{ label: 'Hamwi (1964)', estimate: (m, o) => (m ? 48 + 2.7 * o : 45.5 + 2.2 * o) }
];

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'sex',
			label: 'Sex',
			type: 'select',
			display: 'segmented',
			default: 'male',
			options: [
				{ label: 'Male', value: 'male' },
				{ label: 'Female', value: 'female' }
			]
		},
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'metric',
			options: [
				{ label: 'Metric (kg, cm)', value: 'metric' },
				{ label: 'Imperial (lb, ft)', value: 'imperial' }
			]
		},
		{ id: 'cm', label: 'Height', type: 'number', default: 175, min: 120, max: 230, step: 0.1, suffix: 'cm', visibleWhen: metric },
		{ id: 'ft', label: 'Height (feet)', type: 'number', default: 5, min: 4, max: 7, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: imperial },
		{ id: 'in', label: 'Height (inches)', type: 'number', default: 9, min: 0, max: 11.9, step: 0.1, suffix: 'in', width: 'half', visibleWhen: imperial }
	],
	calculate(v): CalculationResult {
		const imp = v.units === 'imperial';
		const male = v.sex !== 'female';
		const inches = imp ? Number(v.ft) * 12 + Number(v.in) : Number(v.cm) / 2.54;
		const cm = imp ? inches * 2.54 : Number(v.cm);
		const unit = imp ? 'lb' : 'kg';
		const toUnit = (kg: number) => (imp ? kg / LB : kg);

		if (!Number.isFinite(inches) || inches < MIN_INCHES) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Healthy weight range',
				summary: 'These formulas need a height of at least 5 ft (152.4 cm).'
			};
		}

		const m = cm / 100;
		const low = toUnit(18.5 * m * m);
		const high = toUnit(24.9 * m * m);
		const over = inches - MIN_INCHES;

		return {
			primaryResult: `${num(low, 1, 1)}–${num(high, 1, 1)} ${unit}`,
			primaryLabel: 'Healthy weight range (BMI 18.5 to 24.9)',
			summary: 'The weight range for a healthy body mass index at your height.',
			secondaryMetrics: formulas.map((f) => ({
				label: f.label,
				value: `${num(toUnit(f.estimate(male, over)), 1, 1)} ${unit}`
			}))
		};
	},
	content: {
		intro:
			'Use this ideal weight calculator to find the healthy weight range for your height, based on a body mass index (BMI) of 18.5 to 24.9. You can also compare four classic formula estimates.',
		howTo: [
			'Choose your sex and metric (cm) or imperial (feet and inches) units.',
			'Enter your height. The four formulas need a height of at least 5 feet (152.4 cm).',
			'Read your healthy weight range, then compare it with the formula estimates.'
		],
		about: [
			{
				heading: 'What is an ideal weight?',
				paragraphs: [
					'There is no single perfect weight for a person. Healthy bodies come in many shapes, so a range is more honest than one number. This tool gives you both: a range, and four formula estimates for comparison.',
					'The main result is the weight range that gives a BMI from 18.5 to 24.9 at your height. The World Health Organization (WHO) calls this the healthy weight band for adults. A BMI below 18.5 is underweight, and 25 or more is overweight.'
				]
			},
			{
				heading: 'The four formulas',
				paragraphs: [
					'The Devine, Robinson, Miller and Hamwi formulas all start from a base weight at 5 feet and add a set amount for every extra inch. Men and women use different numbers. Devine’s formula was first published in 1974 to help with drug dosing, and the others grew from similar clinical uses.',
					'They give different answers because each came from a different group of people and time. As a result, you may see a gap of a few kilograms between them. None of them knows your muscle, bone size or age.',
					'For that reason, use the BMI range as your main guide. The formulas are best seen as a rough check.'
				]
			},
			{
				heading: 'What an ideal weight range cannot tell you',
				paragraphs: [
					'Height-based numbers ignore your body make-up. A muscular person may weigh more than the range and still be healthy. An older adult may sit inside the range but have little muscle.',
					'Health risks can also start at a lower BMI in some groups. For example, the NHS uses lower BMI cut-offs for people of South Asian, Chinese, other Asian, Middle Eastern, Black African or African-Caribbean background. If this applies to you, ask your doctor which range to aim for.',
					'This tool is for adults. Children and teens need growth charts. During pregnancy, use the [pregnancy weight gain calculator](/pregnancy-weight-gain-calculator) instead.'
				]
			},
			{
				heading: 'Next steps',
				paragraphs: ['Your weight is only one piece of the picture. These tools can add more detail:'],
				list: [
					'Check your own BMI with the [BMI calculator](/bmi-calculator).',
					'Estimate your body fat with the [body fat calculator](/body-fat-calculator).',
					'See your muscle and fat split with the [lean body mass calculator](/lean-body-mass-calculator).',
					'Plan daily calories with the [calorie calculator](/calorie-calculator).',
					'Talk to a doctor if you are worried about being under or over your range, or if your weight changes without a clear reason.'
				]
			}
		],
		formulas: [
			{
				title: 'Healthy weight range',
				expression: 'Lower = 18.5 × height (m)²\nUpper = 24.9 × height (m)²',
				variables: [{ symbol: 'height (m)', meaning: 'your height in metres (cm ÷ 100)' }]
			},
			{
				title: 'Robinson (1983)',
				expression: 'Men: 52 + 1.9 × (inches over 5 ft)\nWomen: 49 + 1.7 × (inches over 5 ft)',
				variables: [{ symbol: 'result', meaning: 'weight in kilograms' }]
			},
			{
				title: 'Miller (1983)',
				expression: 'Men: 56.2 + 1.41 × (inches over 5 ft)\nWomen: 53.1 + 1.36 × (inches over 5 ft)',
				variables: [{ symbol: 'result', meaning: 'weight in kilograms' }]
			},
			{
				title: 'Devine (1974)',
				expression: 'Men: 50 + 2.3 × (inches over 5 ft)\nWomen: 45.5 + 2.3 × (inches over 5 ft)',
				variables: [{ symbol: 'result', meaning: 'weight in kilograms' }]
			},
			{
				title: 'Hamwi (1964)',
				expression: 'Men: 48 + 2.7 × (inches over 5 ft)\nWomen: 45.5 + 2.2 × (inches over 5 ft)',
				variables: [{ symbol: 'result', meaning: 'weight in kilograms' }]
			}
		],
		example: {
			title: 'A man who is 175 cm tall',
			steps: [
				'Height in metres: 175 ÷ 100 = 1.75 m',
				'Lower limit: 18.5 × 1.75² = 56.7 kg',
				'Upper limit: 24.9 × 1.75² = 76.3 kg',
				'Robinson: 52 + 1.9 × 8.9 inches over 5 ft = 68.9 kg'
			],
			result: 'A healthy BMI range of 56.7 to 76.3 kg. The four formulas give 68.7 to 72.0 kg for the same height.'
		},
		faq: [
			{
				q: 'What is my ideal weight for my height?',
				a: 'A healthy range is the weight that gives a BMI of 18.5 to 24.9 at your height. The tool shows that range in kg or lb. Any weight inside it counts as a healthy BMI for adults, according to the WHO.'
			},
			{
				q: 'Why is there a range rather than one ideal weight?',
				a: 'Healthy body weight varies from person to person, so a range is more useful than a single number. It leaves room for different builds, muscle and frame sizes.'
			},
			{
				q: 'Are these formulas accurate?',
				a: 'They are rough. They were made for uses such as drug dosing and general clinical estimates. They ignore body composition, frame size and age, so use them for comparison only.'
			},
			{
				q: 'Why do the formulas give different answers?',
				a: 'Each one came from a different group of people and a different time. The gaps are usually a few kilograms, which is why the BMI range is the main result.'
			},
			{
				q: 'Should I try to reach my ideal weight?',
				a: 'Not necessarily. Health depends on more than weight, including fitness, diet and where you carry fat. Talk to your doctor before you set a weight goal, especially if you have a health condition.'
			}
		],
		sources: [
			{ title: 'World Health Organization — Obesity and overweight', url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight' },
			{ title: 'CDC — About adult BMI', url: 'https://www.cdc.gov/bmi/adult-calculator/index.html' },
			{ title: 'NHS — What is the body mass index (BMI)?', url: 'https://www.nhs.uk/common-health-questions/lifestyle/what-is-the-body-mass-index-bmi/' }
		],
		disclaimer:
			'The formulas and BMI range are general estimates for adults. They do not account for muscle, bone or body composition. Talk to a doctor or health professional about your weight.'
	}
});
