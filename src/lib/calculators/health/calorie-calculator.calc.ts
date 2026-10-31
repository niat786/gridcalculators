import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './calorie-calculator.meta';

const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';

export const ACTIVITY: Record<string, { factor: number; label: string }> = {
	sedentary: { factor: 1.2, label: 'Sedentary: little or no exercise' },
	light: { factor: 1.375, label: 'Light: exercise 1–3 days a week' },
	moderate: { factor: 1.55, label: 'Moderate: exercise 3–5 days a week' },
	active: { factor: 1.725, label: 'Active: hard exercise 6–7 days a week' },
	extra: { factor: 1.9, label: 'Very active: physical job or training twice a day' }
};

/** Mifflin-St Jeor resting energy expenditure (kcal/day). */
export function mifflinStJeor(kg: number, cm: number, age: number, sex: string): number {
	return 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);
}

/** ~7,700 kcal per kg of body fat (≈3,500 per lb). */
const KCAL_PER_KG = 7700;

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
		if (!(kg > 0) || !(cm > 0) || !(age > 0) || !act) {
			return { primaryResult: DASH, primaryLabel: 'Maintenance calories', summary: 'Fill in every field.' };
		}

		const bmr = mifflinStJeor(kg, cm, age, String(v.sex));
		const tdee = bmr * act.factor;
		const floor = v.sex === 'male' ? 1500 : 1200;

		// Weekly rates in the person's own units.
		const rates = isImperial
			? [
					{ label: 'Mild weight loss (0.5 lb/week)', delta: -250 },
					{ label: 'Weight loss (1 lb/week)', delta: -500 },
					{ label: 'Fast weight loss (2 lb/week)', delta: -1000 },
					{ label: 'Mild weight gain (0.5 lb/week)', delta: 250 },
					{ label: 'Weight gain (1 lb/week)', delta: 500 }
				]
			: [
					{ label: 'Mild weight loss (0.25 kg/week)', delta: (-0.25 * KCAL_PER_KG) / 7 },
					{ label: 'Weight loss (0.5 kg/week)', delta: (-0.5 * KCAL_PER_KG) / 7 },
					{ label: 'Fast weight loss (1 kg/week)', delta: (-1 * KCAL_PER_KG) / 7 },
					{ label: 'Mild weight gain (0.25 kg/week)', delta: (0.25 * KCAL_PER_KG) / 7 },
					{ label: 'Weight gain (0.5 kg/week)', delta: (0.5 * KCAL_PER_KG) / 7 }
				];

		return {
			primaryResult: `${num(Math.round(tdee), 0)} kcal/day`,
			primaryLabel: 'Calories to maintain your weight',
			summary: `Resting rate ${num(Math.round(bmr), 0)} kcal × activity factor ${act.factor}.`,
			secondaryMetrics: [
				{ label: 'Resting metabolic rate (BMR)', value: `${num(Math.round(bmr), 0)} kcal` },
				{ label: 'Maintenance (TDEE)', value: `${num(Math.round(tdee), 0)} kcal` }
			],
			table: {
				title: 'Daily calories by goal',
				columns: [
					{ key: 'goal', label: 'Goal' },
					{ key: 'kcal', label: 'Calories / day', align: 'end' }
				],
				rows: [
					{ goal: 'Maintain weight', kcal: num(Math.round(tdee), 0) },
					...rates.map((r) => {
						const k = Math.round(tdee + r.delta);
						return {
							goal: r.label,
							kcal: k < floor ? `${num(k, 0)} (below ${num(floor, 0)}: not advised)` : num(k, 0)
						};
					})
				]
			}
		};
	},
	content: {
		intro:
			'Use this calorie calculator to estimate how many calories you burn each day. You’ll also see how many to eat to keep your weight steady, lose it slowly, or gain it.',
		howTo: [
			'Choose metric (kg and cm) or imperial (lb, feet and inches), then your sex.',
			'Enter your age, weight and height.',
			'Pick the activity level that best matches a normal week, not your best week.',
			'Read your maintenance calories, then look at the daily calories for each weight goal in the table.'
		],
		about: [
			{
				heading: 'What are maintenance calories?',
				paragraphs: [
					'A calorie (kcal) is a unit of energy. Your body uses it to breathe, think, digest food and move. Your maintenance calories are the amount you need each day to keep your weight the same.',
					'The NHS gives a rough guide of 2,000 kcal a day for an average woman and 2,500 kcal for an average man. However, it stresses that your own needs depend on your age, weight, height and how active you are. That is why a personal estimate is more useful.',
					'Eat less than you use and your body draws on stored fat. Eat more and you gain weight. In short, weight change comes from the balance between calories in and calories out.'
				]
			},
			{
				heading: 'How your daily calories are calculated',
				paragraphs: [
					'First, the calculator works out your resting metabolic rate (RMR) with the Mifflin-St Jeor equation. This is the energy your body uses at rest. It uses your weight, height, age and sex. You can see the full method in the formulas section below.',
					'Next, it multiplies that number by an activity factor from 1.2 (little or no exercise) to 1.9 (a very physical job or training twice a day). The result is your total daily energy expenditure (TDEE). You can explore each part with the [BMR calculator](/bmr-calculator) and the [TDEE calculator](/tdee-calculator).',
					'A review of common equations found Mifflin-St Jeor was the most reliable for healthy adults, both with and without obesity. Even so, it can be off for some individuals, so treat the answer as a starting point.'
				]
			},
			{
				heading: 'Calories for losing or gaining weight',
				paragraphs: [
					'The table under your result shows calories for slow weight loss, faster weight loss and weight gain. It uses a common rule of thumb: about 7,700 kcal is roughly one kilogram of body fat (about 3,500 kcal per pound).',
					'This rule is only an estimate. As you lose weight, your body needs fewer calories, so progress usually slows over time. Check your weight every week or two and adjust your plan if needed.',
					'The CDC says people who lose weight gradually and steadily, about 1 to 2 pounds (0.5 to 1 kg) a week, are more successful at keeping it off. Fast loss is harder to keep up. The calculator marks any target below 1,200 kcal for women or 1,500 kcal for men as not advised, because it is hard to get enough nutrients on so little food.'
				]
			},
			{
				heading: 'What can change your result',
				paragraphs: [
					'No equation knows your body perfectly. Muscle mass, genes, hormones, sleep, medicines and health conditions all change how many calories you burn. As a result, two people with the same numbers can need different amounts.',
					'This tool is made for healthy adults. It is not suitable during pregnancy or breastfeeding, or for people with a medical condition that affects weight or metabolism. If that is you, ask your doctor or a dietitian for advice.'
				]
			},
			{
				heading: 'Tips for using your calorie target',
				paragraphs: ['A few habits make the number more useful:'],
				list: [
					'**Choose the lower activity level** if you are unsure. People often overestimate how active they are.',
					'**Weigh yourself at the same time** each week, such as in the morning, and look at the trend.',
					'**Split the calories into protein, carbs and fat** with the [macro calculator](/macro-calculator).',
					'**Eat enough protein** to help keep muscle while you lose weight. The [protein calculator](/protein-calculator) can help.',
					'**See a doctor** before starting a big change, especially if you have a health condition or take medicine.'
				]
			}
		],
		formulas: [
			{
				title: 'Resting metabolic rate (Mifflin-St Jeor)',
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
			},
			{
				title: 'Goal calories',
				expression: 'Target = TDEE − (kg per week × 7,700 ÷ 7)',
				variables: [
					{ symbol: 'kg per week', meaning: 'how much weight you want to lose each week (use a negative number to gain)' },
					{ symbol: '7,700', meaning: 'the rough number of kcal in one kilogram of body fat' },
					{ symbol: '7', meaning: 'days in a week, to turn the weekly change into a daily one' }
				]
			}
		],
		example: {
			title: 'A 30-year-old woman, 70 kg, 170 cm, exercising 1–3 days a week',
			steps: [
				'BMR = 10 × 70 + 6.25 × 170 − 5 × 30 − 161',
				'BMR = 700 + 1,062.5 − 150 − 161 = 1,451.5 kcal',
				'TDEE = 1,451.5 × 1.375 = 1,995.8 kcal',
				'To lose 0.5 kg a week: 1,996 − 550 = 1,446 kcal'
			],
			result: 'About 1,996 kcal a day to maintain weight, or about 1,446 kcal to lose 0.5 kg a week.'
		},
		faq: [
			{
				q: 'How accurate is this calorie calculator?',
				a: 'The Mifflin-St Jeor equation is among the most reliable for healthy adults, but it can still be off for an individual. Treat the result as a starting point. Track your weight for a few weeks, then adjust.'
			},
			{
				q: 'How many calories should I eat a day to lose weight?',
				a: 'Eat a little less than your maintenance calories. A gap of about 500 kcal a day gives roughly 0.5 kg (1 lb) of loss a week. Pick a target from the table and stay above the minimum shown.'
			},
			{
				q: 'Why is there a minimum calorie level?',
				a: 'Below about 1,200 kcal for women or 1,500 kcal for men, it is hard to get enough nutrients. Very low-calorie diets should only be followed under medical supervision.'
			},
			{
				q: 'What is the difference between BMR and TDEE?',
				a: 'BMR is the energy your body uses at complete rest. TDEE adds the energy you use moving and exercising, so it is the number to base your daily intake on.'
			},
			{
				q: 'How fast should I lose weight?',
				a: 'A steady 0.5 to 1 kg (1 to 2 lb) a week is a common target. The CDC notes that people who lose weight gradually are more successful at keeping it off.'
			}
		],
		sources: [
			{ title: 'Mifflin MD et al. (1990), American Journal of Clinical Nutrition', url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/' },
			{ title: 'Frankenfield D et al. (2005), Journal of the American Dietetic Association: comparison of predictive equations for resting metabolic rate', url: 'https://pubmed.ncbi.nlm.nih.gov/15883556/' },
			{ title: 'NHS — Understanding calories', url: 'https://www.nhs.uk/live-well/healthy-weight/managing-your-weight/understanding-calories/' },
			{ title: 'NIDDK, NIH — Body Weight Planner', url: 'https://www.niddk.nih.gov/bwp' }
		],
		disclaimer:
			'These are general estimates for healthy adults. They are not suitable during pregnancy or for people with medical conditions. Ask a doctor or dietitian for personal advice.'
	}
});
