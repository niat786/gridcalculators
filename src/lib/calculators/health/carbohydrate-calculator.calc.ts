import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './carbohydrate-calculator.meta';

const metricEstimate = (v: InputValues) => v.mode === 'estimate' && v.units === 'metric';
const imperialEstimate = (v: InputValues) => v.mode === 'estimate' && v.units === 'imperial';
const estimate = (v: InputValues) => v.mode === 'estimate';
const direct = (v: InputValues) => v.mode === 'direct';

const LB_TO_KG = 0.45359237;
const KCAL_PER_GRAM_CARB = 4;

/** Activity factors applied to resting calories (same scale as the calorie calculator). */
export const ACTIVITY: Record<string, { factor: number; label: string }> = {
	sedentary: { factor: 1.2, label: 'Sedentary: little or no exercise' },
	light: { factor: 1.375, label: 'Light: exercise 1–3 days a week' },
	moderate: { factor: 1.55, label: 'Moderate: exercise 3–5 days a week' },
	active: { factor: 1.725, label: 'Active: hard exercise 6–7 days a week' },
	extra: { factor: 1.9, label: 'Very active: physical job or training twice a day' }
};

/** Dietary Guidelines for Americans: carbohydrate supplies 45 to 65 percent of daily calories. */
export const CARB_SHARES = [
	{ key: 'low', label: 'Low', pct: 45 },
	{ key: 'middle', label: 'Middle', pct: 55 },
	{ key: 'high', label: 'High', pct: 65 }
];

const ok = (n: number) => Number.isFinite(n) && n > 0;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Calorie target from',
			type: 'select',
			display: 'segmented',
			default: 'estimate',
			options: [
				{ label: 'Estimate', value: 'estimate' },
				{ label: 'Enter calories', value: 'direct' }
			]
		},
		{
			id: 'kcal',
			label: 'Daily calories',
			type: 'number',
			default: 2000,
			min: 800,
			max: 6000,
			step: 1,
			decimal: false,
			suffix: 'kcal/day',
			visibleWhen: direct
		},
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'metric',
			visibleWhen: estimate,
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
			visibleWhen: estimate,
			options: [
				{ label: 'Female', value: 'female' },
				{ label: 'Male', value: 'male' }
			]
		},
		{ id: 'age', label: 'Age', type: 'number', default: 30, min: 15, max: 80, step: 1, suffix: 'years', decimal: false, visibleWhen: estimate, help: 'For ages 15 to 80' },
		{ id: 'kg', label: 'Weight', type: 'number', default: 70, min: 30, max: 300, step: 0.1, suffix: 'kg', visibleWhen: metricEstimate },
		{ id: 'cm', label: 'Height', type: 'number', default: 170, min: 120, max: 230, step: 0.1, suffix: 'cm', visibleWhen: metricEstimate },
		{ id: 'lb', label: 'Weight', type: 'number', default: 154, min: 66, max: 660, step: 0.1, suffix: 'lb', visibleWhen: imperialEstimate },
		{ id: 'ft', label: 'Height (feet)', type: 'number', default: 5, min: 4, max: 7, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: imperialEstimate },
		{ id: 'in', label: 'Height (inches)', type: 'number', default: 7, min: 0, max: 11.9, step: 0.1, suffix: 'in', width: 'half', visibleWhen: imperialEstimate },
		{
			id: 'activity',
			label: 'Activity level',
			type: 'select',
			display: 'menu',
			default: 'light',
			visibleWhen: estimate,
			options: Object.entries(ACTIVITY).map(([value, a]) => ({ value, label: a.label }))
		}
	],
	calculate(v): CalculationResult {
		const label = 'Daily carbohydrate range';
		const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: label, summary });

		let target: number;
		if (v.mode === 'direct') {
			target = Number(v.kcal);
			if (!ok(target)) return fail('Enter your daily calories.');
		} else {
			const isImperial = v.units === 'imperial';
			const kg = isImperial ? Number(v.lb) * LB_TO_KG : Number(v.kg);
			const cm = isImperial ? (Number(v.ft) * 12 + Number(v.in)) * 2.54 : Number(v.cm);
			const age = Number(v.age);
			const act = ACTIVITY[String(v.activity)];
			if (!ok(kg) || !ok(cm) || !ok(age) || !act) return fail('Fill in every field, or enter your daily calories instead.');
			const bmr = 10 * kg + 6.25 * cm - 5 * age + (v.sex === 'male' ? 5 : -161);
			target = Math.round(bmr * act.factor);
		}

		const levels = CARB_SHARES.map((s) => {
			const kcal = Math.round((target * s.pct) / 100);
			return { ...s, kcal, grams: Math.round(kcal / KCAL_PER_GRAM_CARB) };
		});
		const [low, mid, high] = levels;
		const source = v.mode === 'direct' ? `the ${num(target, 0)} kcal you entered` : `an estimated ${num(target, 0)} kcal a day`;

		return {
			primaryResult: `${num(low.grams, 0)}–${num(high.grams, 0)} g/day`,
			primaryLabel: label,
			summary: `Based on ${source}, with 45 to 65 percent from carbohydrate.`,
			secondaryMetrics: [
				{ label: 'Middle of range (55%)', value: `${num(mid.grams, 0)} g` },
				{ label: 'Calorie target', value: `${num(target, 0)} kcal/day` },
				{ label: 'Calories from carbs (55%)', value: `${num(mid.kcal, 0)} kcal` }
			],
			table: {
				title: 'Carbohydrate levels',
				columns: [
					{ key: 'level', label: 'Level' },
					{ key: 'share', label: 'Share of calories', align: 'end' },
					{ key: 'kcal', label: 'Calories / day', align: 'end' },
					{ key: 'grams', label: 'Grams / day', align: 'end' }
				],
				rows: levels.map((l) => ({
					level: l.label,
					share: `${l.pct}%`,
					kcal: `${num(l.kcal, 0)} kcal`,
					grams: `${num(l.grams, 0)} g`
				}))
			}
		};
	},
	content: {
		intro:
			'Use this carbohydrate calculator to turn your daily calories into grams of carbs. Enter a calorie target you already know, or estimate one from your body and activity, and see the amounts at 45%, 55% and 65% of your intake.',
		howTo: [
			'Choose whether to estimate your calories or enter a daily target you already know.',
			'If you estimate, enter your sex, age, weight, height and activity level.',
			'Read your daily carbohydrate range and the grams at each level in the table.'
		],
		about: [
			{
				heading: 'What are carbohydrates?',
				paragraphs: [
					'Carbohydrates, or carbs, are one of the three main nutrients that give you energy. The others are protein and fat. Carbs include sugars, starches and fibre, and they are found in grains, fruit, vegetables, beans, milk and sweet foods.',
					'Carbohydrate provides about 4 kcal per gram. Your body breaks most of it into glucose, which fuels your brain and muscles. However, fibre is a carb that you do not fully digest, but it supports gut health.'
				]
			},
			{
				heading: 'How many carbs do you need?',
				paragraphs: [
					'The National Academies set an Acceptable Macronutrient Distribution Range (AMDR) for adults. It suggests that 45% to 65% of daily calories come from carbohydrate. This range is also used in the Dietary Guidelines for Americans. It leaves room for different eating patterns, and many people sit somewhere in the middle.',
					'This calculator shows the low (45%), middle (55%) and high (65%) ends of that range, in calories and grams. Also, people who are very active often need more carbs, and others need fewer. A dietitian can tailor this to you.',
					'The tool does not set a minimum or maximum for you. It is a guide to the usual range.'
				],
				table: {
					caption: 'Carbohydrate AMDR for adults',
					columns: ['Share of calories', 'At 2,000 kcal a day'],
					rows: [
						['45%', '225 g'],
						['55%', '275 g'],
						['65%', '325 g']
					]
				}
			},
			{
				heading: 'How this calculator works',
				paragraphs: [
					'If you know your calories, enter them. If not, the tool estimates them. First, it finds your resting calories with the Mifflin-St Jeor equation. Then it multiplies by your activity factor to reach your daily calories.',
					'Next, it takes 45%, 55% and 65% of those calories and divides by 4 to get grams. For a deeper look at the first step, see the [TDEE calculator](/tdee-calculator) and [BMR calculator](/bmr-calculator).'
				]
			},
			{
				heading: 'Choosing better carbs',
				paragraphs: [
					'The type of carb matters as much as the amount. Whole grains, vegetables, fruit, beans and lentils bring fibre, vitamins and minerals. Sugary drinks and sweets bring energy with fewer nutrients.',
					'The World Health Organization advises that free sugars (added sugars and those in juice and honey) stay below 10% of your daily energy. It is a good idea to check food labels for added sugars.',
					'If you have diabetes or prediabetes, or you follow a low-carb diet for medical reasons, please talk to your doctor or dietitian. Your carbohydrate needs may differ a lot from this range. To split all your calories between nutrients, use the [macro calculator](/macro-calculator). For fat, see the [fat intake calculator](/fat-intake-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Calorie target (estimate)',
				expression: 'Men:   BMR = 10W + 6.25H − 5A + 5\nWomen: BMR = 10W + 6.25H − 5A − 161\nTarget = BMR × activity factor (1.2 to 1.9)',
				variables: [
					{ symbol: 'W', meaning: 'weight in kilograms' },
					{ symbol: 'H', meaning: 'height in centimetres' },
					{ symbol: 'A', meaning: 'age in years' }
				]
			},
			{
				title: 'Grams of carbohydrate',
				expression: 'Calories from carbs = target × share (45%, 55% or 65%)\nGrams = calories ÷ 4',
				variables: [{ symbol: '4', meaning: 'kcal per gram of carbohydrate' }]
			}
		],
		example: {
			title: 'A 30-year-old woman, 70 kg, 170 cm, light activity',
			steps: [
				'BMR = 10 × 70 + 6.25 × 170 − 5 × 30 − 161 = 1,451.5 kcal',
				'Target = 1,451.5 × 1.375 = 1,996 kcal a day',
				'Low, 45%: 1,996 × 0.45 = 898 kcal, and 898 ÷ 4 = 225 g',
				'Middle, 55%: 1,996 × 0.55 = 1,098 kcal, and 1,098 ÷ 4 = 275 g',
				'High, 65%: 1,996 × 0.65 = 1,297 kcal, and 1,297 ÷ 4 = 324 g'
			],
			result: 'About 225 to 324 g of carbohydrate a day, with 275 g at the middle of the range.'
		},
		faq: [
			{
				q: 'How many carbs should I eat a day?',
				a: 'For most adults, 45% to 65% of daily calories is the standard range. At 2,000 kcal that is about 225 to 325 g. Your best amount depends on your health, activity and goals.'
			},
			{
				q: 'Do carbs cause weight gain?',
				a: 'Carbohydrate does not cause weight gain on its own. Total calories matter most for body weight, and the carbohydrate share is a way of deciding what those calories are made of.'
			},
			{
				q: 'Are all carbs the same?',
				a: 'No. Whole grains, fruit, vegetables, beans and dairy bring fibre and other nutrients. Many added sugars and refined grains give fewer of these, so fill most of your grams with whole-food sources.'
			},
			{
				q: 'Why does the calculator use 4 calories per gram?',
				a: 'Carbohydrate and protein each provide about 4 kilocalories per gram, the standard figure used on food labels. Fat provides 9.'
			},
			{
				q: 'Is a low-carb diet safe?',
				a: 'It depends on the person. Some people use low-carb diets under medical care, for example with diabetes. If you want to go below the usual range, talk to a doctor or dietitian first.'
			}
		],
		sources: [
			{ title: 'National Academies — Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids (2005)', url: 'https://nap.nationalacademies.org/catalog/10490' },
			{ title: 'Dietary Guidelines for Americans', url: 'https://www.dietaryguidelines.gov/' },
			{ title: 'World Health Organization — Healthy diet', url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' }
		],
		disclaimer:
			'These are general estimates for healthy adults, not a diet plan. If you have diabetes or another medical condition, ask a doctor or dietitian about your carbohydrate intake.'
	}
});
