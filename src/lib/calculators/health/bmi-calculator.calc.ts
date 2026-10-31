import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './bmi-calculator.meta';

const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';

/** WHO adult BMI classification. */
export function bmiCategory(bmi: number): string {
	if (bmi < 18.5) return 'Underweight';
	if (bmi < 25) return 'Healthy weight';
	if (bmi < 30) return 'Overweight';
	return 'Obesity';
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
				{ label: 'Metric (kg, cm)', value: 'metric' },
				{ label: 'Imperial (lb, ft)', value: 'imperial' }
			]
		},
		{ id: 'kg', label: 'Weight', type: 'number', default: 70, min: 1, max: 500, step: 0.1, suffix: 'kg', visibleWhen: metric },
		{ id: 'cm', label: 'Height', type: 'number', default: 175, min: 50, max: 272, step: 0.1, suffix: 'cm', visibleWhen: metric },
		{ id: 'lb', label: 'Weight', type: 'number', default: 154, min: 2, max: 1100, step: 0.1, suffix: 'lb', visibleWhen: imperial },
		{ id: 'ft', label: 'Height (feet)', type: 'number', default: 5, min: 1, max: 8, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: imperial },
		{ id: 'in', label: 'Height (inches)', type: 'number', default: 9, min: 0, max: 11.9, step: 0.1, suffix: 'in', width: 'half', visibleWhen: imperial }
	],
	calculate(v): CalculationResult {
		let kg: number;
		let m: number;
		if (v.units === 'imperial') {
			kg = Number(v.lb) * 0.45359237;
			m = (Number(v.ft) * 12 + Number(v.in)) * 0.0254;
		} else {
			kg = Number(v.kg);
			m = Number(v.cm) / 100;
		}
		if (!(kg > 0) || !(m > 0)) {
			return { primaryResult: DASH, primaryLabel: 'Your BMI', summary: 'Enter your weight and height.' };
		}
		const bmi = kg / (m * m);
		const low = 18.5 * m * m;
		const high = 24.9 * m * m;
		const toLb = (x: number) => x / 0.45359237;
		const range =
			v.units === 'imperial'
				? `${num(toLb(low), 1)}–${num(toLb(high), 1)} lb`
				: `${num(low, 1)}–${num(high, 1)} kg`;

		return {
			primaryResult: num(bmi, 1, 1),
			primaryLabel: 'Your BMI',
			summary: `${bmiCategory(bmi)} (adult WHO classification).`,
			gauge: {
				min: 12,
				max: 42,
				value: bmi,
				bands: [
					{ to: 18.5, label: 'Underweight' },
					{ to: 25, label: 'Healthy' },
					{ to: 30, label: 'Overweight' },
					{ to: 42, label: 'Obesity' }
				]
			},
			secondaryMetrics: [
				{ label: 'Category', value: bmiCategory(bmi) },
				{ label: 'Healthy weight for your height', value: range },
				{ label: 'BMI Prime', value: num(bmi / 25, 2, 2) }
			]
		};
	},
	content: {
		intro:
			'Work out your body mass index (BMI) from your height and weight. You’ll see your BMI, its adult category and the healthy weight range for your height, in kg or lb.',
		howTo: [
			'Choose metric (kg and cm) or imperial (lb, feet and inches).',
			'Enter your weight and your height without shoes.',
			'Read your BMI, its category and the healthy weight range for your height.',
			'Use the result as a starting point. Then look at the other measures below, such as your waist size.'
		],
		about: [
			{
				heading: 'What is BMI?',
				paragraphs: [
					'Body mass index (BMI) is a simple number that compares your weight with your height. Doctors and health services use it to screen adults for weight-related health risks.',
					'The idea is old. A Belgian scientist, Adolphe Quetelet, described it in the 1830s. Later, in 1972, researcher Ancel Keys gave it the name “body mass index”.',
					'BMI is quick and free, so it works well as a first check. However, it doesn’t measure body fat directly. For that reason, it is a screening tool, not a diagnosis.'
				]
			},
			{
				heading: 'BMI categories for adults',
				paragraphs: [
					'The World Health Organization (WHO) uses the same BMI ranges for men and women aged 20 and over. Your category is shown under your result.'
				],
				table: {
					caption: 'Adult BMI categories (WHO)',
					columns: ['BMI', 'Category'],
					rows: [
						['Below 18.5', 'Underweight'],
						['18.5 to 24.9', 'Healthy weight'],
						['25 to 29.9', 'Overweight'],
						['30 to 34.9', 'Obesity class I'],
						['35 to 39.9', 'Obesity class II'],
						['40 or more', 'Obesity class III']
					]
				}
			},
			{
				heading: 'Lower cut-offs for some ethnic groups',
				paragraphs: [
					'Health risks such as type 2 diabetes can start at a lower BMI in some groups. So a WHO expert group suggested extra “action points” of 23 and 27.5 for people of Asian descent.',
					'In the UK, the NHS uses similar lower thresholds for people with a South Asian, Chinese, other Asian, Middle Eastern, Black African or African-Caribbean background. For these groups, a BMI of 23 or more counts as overweight. Likewise, 27.5 or more counts as obesity.',
					'If this applies to you, keep it in mind when you read your result. Your doctor can tell you which cut-offs your country uses.'
				]
			},
			{
				heading: 'What BMI doesn’t tell you',
				paragraphs: [
					'BMI only looks at your total weight. It can’t tell muscle from fat, and it doesn’t show where you carry your fat. As a result, it can mislead in some cases:'
				],
				list: [
					'**Muscular people**, such as athletes, can have a high BMI but little body fat.',
					'**Older adults** often lose muscle, so their BMI can look normal even when body fat is high.',
					'**Pregnant women** should not use BMI. Weight gain during pregnancy is expected.',
					'**Children and teens** need a BMI-for-age percentile instead, because they are still growing.'
				]
			},
			{
				heading: 'Other measures to check',
				paragraphs: [
					'Because BMI has limits, it helps to look at more than one number. For example, your waist size shows fat around your middle, which is linked to heart disease and diabetes. A common guide is to keep your waist to less than half your height.',
					'You can also estimate your body fat with our [body fat calculator](/body-fat-calculator), or see a realistic target with the [ideal weight calculator](/ideal-weight-calculator).',
					'If you want to change your weight, start with how much energy you use. The [BMR calculator](/bmr-calculator) shows the calories your body burns at rest. Then the [calorie calculator](/calorie-calculator) turns that into a daily target.'
				]
			}
		],
		formulas: [
			{
				title: 'Metric',
				expression: 'BMI = weight (kg) ÷ height (m)²',
				variables: [
					{ symbol: 'weight', meaning: 'your weight in kilograms' },
					{ symbol: 'height', meaning: 'your height in metres (cm ÷ 100), multiplied by itself' }
				]
			},
			{
				title: 'Imperial',
				expression: 'BMI = 703 × weight (lb) ÷ height (in)²',
				variables: [{ symbol: '703', meaning: 'the conversion factor between pounds and inches and the metric formula' }]
			},
			{
				title: 'BMI Prime',
				expression: 'BMI Prime = BMI ÷ 25',
				variables: [{ symbol: '25', meaning: 'the upper limit of the healthy range; 1.0 means you are right at that limit' }]
			}
		],
		example: {
			title: 'An adult who weighs 70 kg and is 175 cm tall',
			steps: [
				'Convert height to metres: 175 cm ÷ 100 = 1.75 m',
				'Square the height: 1.75 × 1.75 = 3.0625',
				'Divide weight by that: 70 ÷ 3.0625 = 22.86'
			],
			result: 'BMI ≈ 22.9, which is in the healthy weight range (18.5 to 24.9).'
		},
		faq: [
			{
				q: 'What is a healthy BMI for adults?',
				a: 'For most adults, a BMI from 18.5 to 24.9 is a healthy weight. Below 18.5 is underweight, 25 to 29.9 is overweight, and 30 or more is obesity. Some groups, including people of Asian descent, may use lower cut-offs.'
			},
			{
				q: 'Is BMI the same for men and women?',
				a: 'Yes. Adults use the same formula and the same categories, whatever their sex. However, women tend to have more body fat than men at the same BMI.'
			},
			{
				q: 'Is BMI accurate for everyone?',
				a: 'No. BMI doesn’t measure body fat directly. So it can overestimate fat in muscular people and underestimate it in older adults. Use it as a first check, together with your waist size.'
			},
			{
				q: 'Can I use this BMI calculator for children?',
				a: 'No. Children and teens need a BMI-for-age percentile, which compares them with others of the same age and sex. Ask a doctor, or use a child BMI chart from your health service.'
			},
			{
				q: 'What is BMI Prime?',
				a: 'BMI Prime is your BMI divided by 25, the top of the healthy range. A value of 1.0 sits right at that limit, so 0.9 is under it and 1.2 is 20% above it.'
			},
			{
				q: 'How can I lower my BMI safely?',
				a: 'Aim for slow, steady change of about 0.5 to 1 kg a week. Eat a little less than you burn, move more, and sleep well. For example, the [TDEE calculator](/tdee-calculator) shows how many calories you burn in a day.'
			}
		],
		sources: [
			{ title: 'World Health Organization — Obesity and overweight', url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight' },
			{ title: 'CDC — About adult BMI', url: 'https://www.cdc.gov/bmi/adult-calculator/index.html' },
			{ title: 'NHS — What is the body mass index (BMI)?', url: 'https://www.nhs.uk/common-health-questions/lifestyle/what-is-the-body-mass-index-bmi/' }
		],
		disclaimer:
			'BMI is a screening tool, not a diagnosis. Talk to a doctor or health professional about your weight and health.'
	}
});
