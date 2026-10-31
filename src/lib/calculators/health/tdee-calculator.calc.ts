import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './tdee-calculator.meta';

const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';

export const ACTIVITY: Record<string, { factor: number; label: string; short: string }> = {
	sedentary: { factor: 1.2, label: 'Sedentary: little or no exercise', short: 'Sedentary' },
	light: { factor: 1.375, label: 'Light: exercise 1–3 days a week', short: 'Light' },
	moderate: { factor: 1.55, label: 'Moderate: exercise 3–5 days a week', short: 'Moderate' },
	active: { factor: 1.725, label: 'Active: hard exercise 6–7 days a week', short: 'Active' },
	extra: { factor: 1.9, label: 'Very active: physical job or training twice a day', short: 'Very active' }
};

/** Mifflin-St Jeor resting energy expenditure (kcal/day). */
export function mifflinStJeor(kg: number, cm: number, age: number, male: boolean): number {
	return 10 * kg + 6.25 * cm - 5 * age + (male ? 5 : -161);
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
		{
			id: 'sex',
			label: 'Sex',
			type: 'select',
			display: 'segmented',
			default: 'female',
			options: [
				{ label: 'Female', value: 'female' },
				{ label: 'Male', value: 'male' }
			]
		},
		{ id: 'age', label: 'Age', type: 'number', default: 30, min: 15, max: 80, step: 1, suffix: 'years', decimal: false, help: 'For ages 15 to 80' },
		{ id: 'kg', label: 'Weight', type: 'number', default: 70, min: 30, max: 300, step: 0.1, suffix: 'kg', visibleWhen: metric },
		{ id: 'cm', label: 'Height', type: 'number', default: 170, min: 120, max: 230, step: 0.1, suffix: 'cm', visibleWhen: metric },
		{ id: 'lb', label: 'Weight', type: 'number', default: 154, min: 66, max: 660, step: 0.1, suffix: 'lb', visibleWhen: imperial },
		{ id: 'ft', label: 'Height (feet)', type: 'number', default: 5, min: 4, max: 7, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: imperial },
		{ id: 'in', label: 'Height (inches)', type: 'number', default: 7, min: 0, max: 11.9, step: 0.1, suffix: 'in', width: 'half', visibleWhen: imperial },
		{
			id: 'activity',
			label: 'Activity level',
			type: 'select',
			display: 'menu',
			default: 'light',
			options: Object.entries(ACTIVITY).map(([value, a]) => ({ value, label: a.label }))
		}
	],
	calculate(v): CalculationResult {
		const isImperial = v.units === 'imperial';
		const kg = isImperial ? Number(v.lb) * 0.45359237 : Number(v.kg);
		const cm = isImperial ? (Number(v.ft) * 12 + Number(v.in)) * 2.54 : Number(v.cm);
		const age = Number(v.age);
		const act = ACTIVITY[String(v.activity)];
		if (![kg, cm, age].every(Number.isFinite) || !(kg > 0) || !(cm > 0) || !(age > 0) || !act) {
			return { primaryResult: DASH, primaryLabel: 'Maintenance calories (TDEE)', summary: 'Fill in every field.' };
		}

		const bmr = mifflinStJeor(kg, cm, age, v.sex === 'male');
		const tdee = Math.round(bmr * act.factor);

		return {
			primaryResult: `${num(tdee, 0)} kcal/day`,
			primaryLabel: 'Maintenance calories (TDEE)',
			summary: `Resting rate ${num(Math.round(bmr), 0)} kcal × activity factor ${act.factor} (${act.short.toLowerCase()}).`,
			secondaryMetrics: [
				{ label: 'Resting rate (BMR)', value: `${num(Math.round(bmr), 0)} kcal/day` },
				...Object.values(ACTIVITY).map((a) => ({
					label: `${a.short} (× ${a.factor})`,
					value: `${num(Math.round(bmr * a.factor), 0)} kcal/day`
				}))
			]
		};
	},
	content: {
		intro:
			'Use this TDEE calculator to estimate your total daily energy expenditure, the calories you burn in a typical day. It includes your resting needs plus movement and exercise, and it compares every activity level.',
		howTo: [
			'Choose metric (kg and cm) or imperial (lb, feet and inches), then your sex.',
			'Enter your age, weight and height.',
			'Pick the activity level that matches a typical week.',
			'Read your TDEE, then compare it with the other activity levels in the list.'
		],
		about: [
			{
				heading: 'What is TDEE?',
				paragraphs: [
					'Total daily energy expenditure (TDEE) is the number of calories you burn in a whole day. It is the amount you can eat to keep your weight the same.',
					'It has a few parts. Most of it is your resting energy, called [BMR](/bmr-calculator). The rest comes from moving, exercise, and digesting your food. As a result, an active person has a higher TDEE than an inactive person of the same size.'
				]
			},
			{
				heading: 'How TDEE is calculated',
				paragraphs: [
					'First, the tool finds your resting rate with the Mifflin-St Jeor equation. A published review found this equation the most reliable of the common ones for healthy adults. Then it multiplies the result by an activity factor.',
					'The factors are 1.2 for little or no exercise, 1.375 for light exercise, 1.55 for moderate, 1.725 for hard exercise and 1.9 for a very physical life. These are widely used estimates, not exact measurements.'
				],
				table: {
					caption: 'Activity levels used by this calculator',
					columns: ['Level', 'Factor', 'What it means'],
					rows: [
						['Sedentary', '1.2', 'Little or no exercise'],
						['Light', '1.375', 'Exercise 1 to 3 days a week'],
						['Moderate', '1.55', 'Exercise 3 to 5 days a week'],
						['Active', '1.725', 'Hard exercise 6 to 7 days a week'],
						['Very active', '1.9', 'Physical job, or training twice a day']
					]
				}
			},
			{
				heading: 'Which activity level should I pick?',
				paragraphs: [
					'Choose the level that fits an average week. Many people pick too high, because they remember their best days. If you sit most of the day and work out three times a week, “light” is often a fairer choice than “moderate”.',
					'Your job matters too. A nurse or builder who is on their feet all day moves much more than an office worker. Use your daily life, not only your workouts, to decide.'
				]
			},
			{
				heading: 'Why your TDEE changes over time',
				paragraphs: [
					'Your TDEE is not fixed. If you lose weight, your body is smaller, so it burns fewer calories. If you build muscle or start a more active job, it goes up.',
					'Age and health can matter too. For this reason, it is worth running the calculator again every few months, or after your weight changes by 5 kg (about 10 lb) or more.'
				]
			},
			{
				heading: 'Using your TDEE',
				paragraphs: [
					'To keep your weight steady, eat close to your TDEE. To lose weight slowly, eat a little less. To gain, eat a little more. The [calorie calculator](/calorie-calculator) turns your TDEE into daily targets for each goal.',
					'Next, you can split your calories into protein, carbs and fat with the [macro calculator](/macro-calculator). Track your weight for two to three weeks. If it does not change as you expect, adjust your intake by 100 to 200 kcal.',
					'TDEE is an estimate. Individual results can differ by a lot, so your own weight trend is the best guide. If you have a medical condition, are pregnant, or are changing your diet a lot, talk to a doctor or dietitian first.'
				]
			}
		],
		formulas: [
			{
				title: 'Resting rate (Mifflin-St Jeor)',
				expression: 'Men:   BMR = 10W + 6.25H − 5A + 5\nWomen: BMR = 10W + 6.25H − 5A − 161',
				variables: [
					{ symbol: 'W', meaning: 'weight in kilograms' },
					{ symbol: 'H', meaning: 'height in centimetres' },
					{ symbol: 'A', meaning: 'age in years' }
				]
			},
			{
				title: 'Total daily energy expenditure',
				expression: 'TDEE = BMR × activity factor',
				variables: [
					{ symbol: 'activity factor', meaning: '1.2 sedentary, 1.375 light, 1.55 moderate, 1.725 active, 1.9 very active' }
				]
			}
		],
		example: {
			title: 'A 30-year-old woman, 70 kg, 170 cm, exercising 1–3 days a week',
			steps: [
				'BMR = 10 × 70 + 6.25 × 170 − 5 × 30 − 161 = 1,451.5 kcal',
				'TDEE = 1,451.5 × 1.375 = 1,995.8 kcal',
				'Rounded: about 1,996 kcal a day'
			],
			result: 'About 1,996 kcal a day. The other activity levels give 1,742 to 2,758 kcal a day for the same person.'
		},
		faq: [
			{
				q: 'What is TDEE?',
				a: 'TDEE is your total daily energy expenditure: all the calories you burn in a day, including rest, movement, exercise and digestion. Eat about this much to keep your weight steady.'
			},
			{
				q: 'What is the difference between BMR and TDEE?',
				a: 'BMR is the energy used at complete rest. TDEE multiplies BMR by an activity factor, so it includes the energy used by movement and exercise.'
			},
			{
				q: 'Which activity level should I choose?',
				a: 'Pick the one that matches your usual week, not your best week. If you are between two levels, choose the lower one. Then adjust after a few weeks of tracking your weight.'
			},
			{
				q: 'How accurate is TDEE?',
				a: 'It is an estimate. Real needs can differ from the result by 10% or more, so use it as a starting point and watch your weight trend over several weeks.'
			},
			{
				q: 'Should I eat my TDEE to lose weight?',
				a: 'No. Eating at your TDEE keeps your weight steady. To lose weight, eat a little below it. The [calorie calculator](/calorie-calculator) shows safe daily targets.'
			}
		],
		sources: [
			{ title: 'Mifflin MD et al. (1990), American Journal of Clinical Nutrition', url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/' },
			{ title: 'Frankenfield D et al. (2005), Journal of the American Dietetic Association: comparison of predictive equations for resting metabolic rate', url: 'https://pubmed.ncbi.nlm.nih.gov/15883556/' },
			{ title: 'NIDDK, NIH — Body Weight Planner', url: 'https://www.niddk.nih.gov/bwp' }
		],
		disclaimer:
			'These are estimates for healthy adults. They are not suitable during pregnancy or for people with medical conditions. Ask a doctor or dietitian for personal advice.'
	}
});
