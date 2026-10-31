import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './fat-intake-calculator.meta';

const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';
const target = (v: InputValues) => v.mode === 'target';
const estimate = (v: InputValues) => v.mode === 'estimate';

/** Activity factors used with the Mifflin-St Jeor equation (same as the calorie calculator). */
const ACTIVITY: Record<string, { factor: number; label: string }> = {
	sedentary: { factor: 1.2, label: 'Sedentary: little or no exercise' },
	light: { factor: 1.375, label: 'Light: exercise 1–3 days a week' },
	moderate: { factor: 1.55, label: 'Moderate: exercise 3–5 days a week' },
	active: { factor: 1.725, label: 'Active: hard exercise 6–7 days a week' },
	extra: { factor: 1.9, label: 'Very active: physical job or training twice a day' }
};

/** Acceptable Macronutrient Distribution Range for total fat, share of calories. */
export const FAT_MIN_SHARE = 0.2;
export const FAT_MAX_SHARE = 0.35;
/** Saturated fat ceiling, share of calories. */
export const SAT_FAT_MAX_SHARE = 0.1;
/** Energy per gram of fat, kcal. */
const KCAL_PER_G_FAT = 9;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Calories',
			type: 'select',
			display: 'segmented',
			default: 'target',
			options: [
				{ label: 'I know my target', value: 'target' },
				{ label: 'Estimate mine', value: 'estimate' }
			]
		},
		{ id: 'kcal', label: 'Daily calories', type: 'number', default: 2000, min: 800, max: 6000, decimal: false, suffix: 'kcal', visibleWhen: target },
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'metric',
			options: [
				{ label: 'Metric (kg, cm)', value: 'metric' },
				{ label: 'Imperial (lb, ft)', value: 'imperial' }
			],
			visibleWhen: estimate
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
			],
			visibleWhen: estimate
		},
		{ id: 'age', label: 'Age', type: 'number', default: 30, min: 15, max: 80, step: 1, suffix: 'years', decimal: false, help: 'For ages 15 to 80', visibleWhen: estimate },
		{ id: 'kg', label: 'Weight', type: 'number', default: 70, min: 30, max: 300, step: 0.1, suffix: 'kg', visibleWhen: (v) => estimate(v) && metric(v) },
		{ id: 'cm', label: 'Height', type: 'number', default: 170, min: 120, max: 230, step: 0.1, suffix: 'cm', visibleWhen: (v) => estimate(v) && metric(v) },
		{ id: 'lb', label: 'Weight', type: 'number', default: 154, min: 66, max: 660, step: 0.1, suffix: 'lb', visibleWhen: (v) => estimate(v) && imperial(v) },
		{ id: 'ft', label: 'Height (feet)', type: 'number', default: 5, min: 4, max: 7, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: (v) => estimate(v) && imperial(v) },
		{ id: 'in', label: 'Height (inches)', type: 'number', default: 7, min: 0, max: 11.9, step: 0.1, suffix: 'in', width: 'half', visibleWhen: (v) => estimate(v) && imperial(v) },
		{
			id: 'activity',
			label: 'Activity level',
			type: 'select',
			display: 'menu',
			default: 'light',
			options: Object.entries(ACTIVITY).map(([value, a]) => ({ value, label: a.label })),
			visibleWhen: estimate
		}
	],
	calculate(v): CalculationResult {
		const fail = (summary: string): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Fat per day',
			summary
		});

		let kcal: number;
		if (v.mode === 'estimate') {
			const isImperial = v.units === 'imperial';
			const kg = isImperial ? Number(v.lb) * 0.45359237 : Number(v.kg);
			const cm = isImperial ? (Number(v.ft) * 12 + Number(v.in)) * 2.54 : Number(v.cm);
			const age = Number(v.age);
			const act = ACTIVITY[String(v.activity)];
			if (!(kg > 0) || !(cm > 0) || !(age > 0) || !act) return fail('Fill in every field to estimate your calories.');
			// Mifflin-St Jeor resting energy, times the activity factor.
			const bmr = 10 * kg + 6.25 * cm - 5 * age + (v.sex === 'male' ? 5 : -161);
			kcal = Math.round(bmr * act.factor);
		} else {
			kcal = Math.round(Number(v.kcal));
		}
		if (!(kcal > 0)) return fail('Enter your daily calories.');

		const fatLow = (kcal * FAT_MIN_SHARE) / KCAL_PER_G_FAT;
		const fatHigh = (kcal * FAT_MAX_SHARE) / KCAL_PER_G_FAT;
		const fatMid = (kcal * ((FAT_MIN_SHARE + FAT_MAX_SHARE) / 2)) / KCAL_PER_G_FAT;
		const satMax = Math.floor((kcal * SAT_FAT_MAX_SHARE) / KCAL_PER_G_FAT);

		return {
			primaryResult: `${num(fatLow, 0)}–${num(fatHigh, 0)} g`,
			primaryLabel: 'Fat per day (20–35% of calories)',
			summary: `Keep saturated fat below 10% of calories, which is ${num(satMax, 0)} g or less a day at ${num(kcal, 0)} kcal.`,
			secondaryMetrics: [
				{ label: 'Calories used', value: `${num(kcal, 0)} kcal` },
				{ label: 'Fat calories (20–35%)', value: `${num(kcal * FAT_MIN_SHARE, 0)}–${num(kcal * FAT_MAX_SHARE, 0)} kcal` },
				{ label: 'Saturated fat limit (under 10%)', value: `${num(satMax, 0)} g or less` },
				{ label: 'Middle of the range (27.5%)', value: `${num(fatMid, 0)} g` }
			]
		};
	},
	content: {
		intro:
			'Use this fat intake calculator to work out how many grams of fat fit a daily calorie target. It shows the 20% to 35% range for total fat and the limit for saturated fat, which is kept under 10% of calories.',
		howTo: [
			'Choose whether you know your calorie target or want an estimate from your details.',
			'Enter your calories, or your sex, age, weight, height and activity level.',
			'Read the grams of fat for the range, and the saturated fat limit.'
		],
		about: [
			{
				heading: 'What is dietary fat?',
				paragraphs: [
					'Fat is one of the three main nutrients that give you energy. It provides 9 kcal per gram, which is more than twice as much as protein or carbohydrate. Also, your body needs fat to absorb vitamins A, D, E and K and to build cells.',
					'Fats come in different types. For example, unsaturated fats are found in olive oil, nuts, seeds and fish. However, saturated fats are found in butter, cheese, fatty meat and palm and coconut oil. Trans fats, mostly from industrial processing, are the type to keep as low as possible.'
				]
			},
			{
				heading: 'How much fat is recommended?',
				paragraphs: [
					'The National Academies set an Acceptable Macronutrient Distribution Range (AMDR) for fat in adults of 20% to 35% of daily calories. This calculator uses that range. The Dietary Guidelines for Americans also advise keeping saturated fat below 10% of daily calories.',
					'Other health bodies use similar ideas. For example, the World Health Organization advises that total fat stay at or below 30% of energy, with saturated fat under 10% and trans fat under 1%. It also says unsaturated fats are preferred. So check the advice for where you live.'
				],
				table: {
					caption: 'Fat guidance',
					columns: ['Measure', 'Share of calories', 'At 2,000 kcal a day'],
					rows: [
						['Total fat (US range)', '20% to 35%', '44 to 78 g'],
						['Total fat (WHO)', '30% or less', '67 g or less'],
						['Saturated fat', 'Under 10%', '22 g or less'],
						['Trans fat (WHO)', 'Under 1%', 'Under 2.2 g']
					]
				}
			},
			{
				heading: 'How this calculator works',
				paragraphs: [
					'If you know your daily calories, enter them. If not, the tool estimates them with the Mifflin-St Jeor equation and an activity factor. You can read more about this in the [calorie calculator](/calorie-calculator).',
					'Next, it takes 20% and 35% of your calories and divides by 9 to get grams. It also divides 10% of your calories by 9 to give the saturated fat limit.'
				]
			},
			{
				heading: 'Choosing healthier fats',
				paragraphs: [
					'The kind of fat matters as much as the amount. The usual advice is to replace some saturated fat with unsaturated fat, because this can help lower LDL (“bad”) cholesterol. Here are some easy swaps:'
				],
				list: [
					'Cook with olive or rapeseed oil instead of butter or ghee where you can.',
					'Eat fish, including oily fish, once or twice a week.',
					'Snack on a small handful of nuts or seeds.',
					'Choose lean cuts of meat, and trim visible fat.',
					'Check labels for “partially hydrogenated” oils, which are a source of trans fat.'
				]
			},
			{
				heading: 'Using the results',
				paragraphs: [
					'These are general targets for healthy adults. Your best intake may differ if you have heart disease, high cholesterol, diabetes or another condition, so talk to a doctor or dietitian.',
					'Fat is only part of your plan. If you want to set protein and carbs too, try the [macro calculator](/macro-calculator), the [carbohydrate calculator](/carbohydrate-calculator) and the [protein calculator](/protein-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Fat grams',
				expression: 'Grams of fat = calories from fat ÷ 9',
				variables: [
					{ symbol: '9', meaning: 'Energy in kcal per gram of fat' },
					{ symbol: 'calories from fat', meaning: 'Daily calories × 20% (low end) or × 35% (high end)' }
				]
			},
			{
				title: 'Saturated fat limit',
				expression: 'Grams of saturated fat ≤ (daily calories × 10%) ÷ 9',
				variables: [{ symbol: '10%', meaning: 'Upper share of calories from saturated fat' }]
			},
			{
				title: 'Estimated calories (estimate mode)',
				expression: 'Calories = (10 × kg + 6.25 × cm − 5 × age + 5 for men, −161 for women) × activity factor',
				variables: [{ symbol: 'activity factor', meaning: 'From 1.2 (sedentary) to 1.9 (very active)' }]
			}
		],
		example: {
			title: 'A daily target of 2,000 calories',
			steps: [
				'Low end: 2,000 × 20% = 400 kcal from fat, and 400 ÷ 9 = 44.4 g',
				'High end: 2,000 × 35% = 700 kcal from fat, and 700 ÷ 9 = 77.8 g',
				'Saturated fat: 2,000 × 10% = 200 kcal, and 200 ÷ 9 = 22.2 g, so keep it at 22 g or less'
			],
			result: 'Fat: 44 to 78 g a day. Saturated fat: 22 g or less.'
		},
		faq: [
			{
				q: 'How much fat should I eat a day?',
				a: 'For adults, 20% to 35% of daily calories is the standard range in the US. At 2,000 kcal that is about 44 to 78 g. The World Health Organization advises keeping total fat to 30% of calories or less.'
			},
			{
				q: 'What share of calories should come from saturated fat?',
				a: 'Less than 10% of daily calories, according to the Dietary Guidelines for Americans and the WHO. At 2,000 kcal, that is about 22 g or less. Try to replace some with unsaturated fats.'
			},
			{
				q: 'Why does fat have 9 calories per gram?',
				a: 'Fat stores more energy per gram than carbohydrate or protein, which each provide about 4 kcal. The figure of 9 is the standard value used on food labels.'
			},
			{
				q: 'Is the fat range the same in every country?',
				a: 'No. This calculator follows the US range of 20% to 35%. The WHO advises 30% or less, and other countries set their own limits. Use your own country’s guidance where it differs.'
			},
			{
				q: 'Does this cover carbohydrate and protein?',
				a: 'No. It covers fat only. Carbohydrate and protein fill the rest of your calories. Use the [macro calculator](/macro-calculator) to see a full split.'
			}
		],
		sources: [
			{ title: 'National Academies — Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids (2005)', url: 'https://nap.nationalacademies.org/catalog/10490' },
			{ title: 'Dietary Guidelines for Americans', url: 'https://www.dietaryguidelines.gov/' },
			{ title: 'World Health Organization — Healthy diet', url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' }
		],
		disclaimer:
			'These are general targets for healthy adults, not personal medical advice. Speak to a doctor or dietitian if you have a health condition or follow a medical diet.'
	}
});
