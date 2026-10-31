import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './macro-calculator.meta';

const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';

const ACTIVITY: Record<string, number> = {
	sedentary: 1.2,
	light: 1.375,
	moderate: 1.55,
	active: 1.725,
	extra: 1.9
};

const GOALS: Record<string, { delta: number; label: string }> = {
	lose: { delta: -500, label: 'Lose weight' },
	maintain: { delta: 0, label: 'Maintain weight' },
	gain: { delta: 500, label: 'Gain weight' }
};

/** Percentage of calories from protein / carbs / fat. */
const SPLITS: Record<string, { label: string; protein: number; carbs: number; fat: number }> = {
	balanced: { label: 'Balanced (30 / 40 / 30)', protein: 30, carbs: 40, fat: 30 },
	lowcarb: { label: 'Low-carb (40 / 20 / 40)', protein: 40, carbs: 20, fat: 40 },
	highprotein: { label: 'High-protein (40 / 35 / 25)', protein: 40, carbs: 35, fat: 25 }
};

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
			options: [
				{ value: 'sedentary', label: 'Sedentary: little or no exercise' },
				{ value: 'light', label: 'Light: exercise 1–3 days a week' },
				{ value: 'moderate', label: 'Moderate: exercise 3–5 days a week' },
				{ value: 'active', label: 'Active: hard exercise 6–7 days a week' },
				{ value: 'extra', label: 'Very active: physical job or training twice a day' }
			]
		},
		{
			id: 'goal',
			label: 'Goal',
			type: 'select',
			display: 'segmented',
			default: 'maintain',
			options: [
				{ label: 'Lose', value: 'lose' },
				{ label: 'Maintain', value: 'maintain' },
				{ label: 'Gain', value: 'gain' }
			]
		},
		{
			id: 'split',
			label: 'Diet split (protein / carbs / fat)',
			type: 'select',
			display: 'menu',
			default: 'balanced',
			options: Object.entries(SPLITS).map(([value, s]) => ({ value, label: s.label }))
		}
	],
	calculate(v): CalculationResult {
		const isImperial = v.units === 'imperial';
		const kg = isImperial ? Number(v.lb) * 0.45359237 : Number(v.kg);
		const cm = isImperial ? (Number(v.ft) * 12 + Number(v.in)) * 2.54 : Number(v.cm);
		const age = Number(v.age);
		const activity = ACTIVITY[String(v.activity)];
		const goal = GOALS[String(v.goal)];
		const split = SPLITS[String(v.split)];
		if (![kg, cm, age].every(Number.isFinite) || !(kg > 0) || !(cm > 0) || !(age > 0) || !activity || !goal || !split) {
			return { primaryResult: DASH, primaryLabel: 'Daily calorie target', summary: 'Fill in every field.' };
		}

		const male = v.sex === 'male';
		const bmr = 10 * kg + 6.25 * cm - 5 * age + (male ? 5 : -161);
		const tdee = Math.round(bmr * activity);
		const target = Math.round(tdee + goal.delta);
		const floor = male ? 1500 : 1200;

		// Calories and grams per macro. Grams use 4 kcal per gram for protein and carbs, 9 for fat.
		const protein = { kcal: Math.round((target * split.protein) / 100), per: 4 };
		const carbs = { kcal: Math.round((target * split.carbs) / 100), per: 4 };
		const fat = { kcal: Math.round((target * split.fat) / 100), per: 9 };
		const grams = (m: { kcal: number; per: number }) => Math.round(m.kcal / m.per);
		const totalKcal = protein.kcal + carbs.kcal + fat.kcal;

		const change = goal.delta === 0 ? '0 kcal/day' : `${goal.delta > 0 ? '+' : '−'}${num(Math.abs(goal.delta), 0)} kcal/day`;
		const floorNote = target < floor ? ` Below ${num(floor, 0)} kcal, which is not advised without medical supervision.` : '';

		return {
			primaryResult: `${num(target, 0)} kcal/day`,
			primaryLabel: 'Daily calorie target',
			summary: `Maintenance ${num(tdee, 0)} kcal, adjusted for your goal.${floorNote}`,
			secondaryMetrics: [
				{ label: 'Maintenance (TDEE)', value: `${num(tdee, 0)} kcal/day` },
				{ label: 'Calorie change', value: change },
				{ label: 'Protein per kg of body weight', value: `${num(grams(protein) / kg, 1, 1)} g` }
			],
			table: {
				title: `Daily macros: ${split.label}`,
				columns: [
					{ key: 'macro', label: 'Macro' },
					{ key: 'share', label: 'Share', align: 'end' },
					{ key: 'grams', label: 'Grams per day', align: 'end' },
					{ key: 'kcal', label: 'Calories per day', align: 'end' }
				],
				rows: [
					{ macro: 'Protein (4 kcal/g)', share: `${split.protein}%`, grams: `${num(grams(protein), 0)} g`, kcal: `${num(protein.kcal, 0)} kcal` },
					{ macro: 'Carbs (4 kcal/g)', share: `${split.carbs}%`, grams: `${num(grams(carbs), 0)} g`, kcal: `${num(carbs.kcal, 0)} kcal` },
					{ macro: 'Fat (9 kcal/g)', share: `${split.fat}%`, grams: `${num(grams(fat), 0)} g`, kcal: `${num(fat.kcal, 0)} kcal` },
					{ macro: 'Total', share: '100%', grams: '—', kcal: `${num(totalKcal, 0)} kcal` }
				]
			}
		};
	},
	content: {
		intro:
			'Use this macro calculator to turn your daily calorie goal into grams of protein, carbohydrate and fat. Pick a goal and a diet split, and see how many grams of each macronutrient you get.',
		howTo: [
			'Choose metric (kg and cm) or imperial (lb, feet and inches), then enter your sex, age, weight and height.',
			'Pick your activity level and whether you want to lose, maintain or gain weight.',
			'Choose a diet split: balanced, low-carb or high-protein.',
			'Read your daily calorie target and the grams of each macro in the table.'
		],
		about: [
			{
				heading: 'What are macros?',
				paragraphs: [
					'Macros, short for macronutrients, are the three nutrients that give you energy: protein, carbohydrate and fat. Each one has a set energy value. Protein and carbohydrate give 4 kcal per gram, and fat gives 9 kcal per gram.',
					'Because fat has more than twice the energy per gram, the same number of calories weighs less in fat than in carbs. That is why the gram figures in the table do not follow the percentages directly.'
				]
			},
			{
				heading: 'How your macros are calculated',
				paragraphs: [
					'First, the tool estimates your resting calories with the Mifflin-St Jeor equation, then multiplies by your activity level to get your maintenance calories (TDEE). Next, it adds or subtracts 500 kcal if you want to gain or lose weight.',
					'Then it splits your calorie target by the percentages of the diet you choose. It divides each share by 4 or 9 to give grams. The [calorie calculator](/calorie-calculator) explains the first steps in more detail, and the [TDEE calculator](/tdee-calculator) shows your maintenance number.',
					'A 500 kcal gap is a common way to aim for about 0.5 kg (1 lb) of change a week. It is a rough rule, and real progress varies.'
				]
			},
			{
				heading: 'The three diet splits',
				paragraphs: [
					'The Institute of Medicine (now the National Academy of Medicine) set Acceptable Macronutrient Distribution Ranges (AMDR) for adults. They suggest 10% to 35% of calories from protein, 45% to 65% from carbohydrate and 20% to 35% from fat. Staying inside these ranges is linked to a lower risk of chronic disease while meeting nutrient needs.',
					'The three splits here are common choices. Compared with the AMDR, the balanced split is a little low in carbs. The low-carb split is well below the carbohydrate range, and the high-protein split is above the protein range. They are not wrong for everyone, but they are not the standard guidance.'
				],
				table: {
					caption: 'Splits in this calculator (share of calories)',
					columns: ['Split', 'Protein', 'Carbs', 'Fat'],
					rows: [
						['Balanced', '30%', '40%', '30%'],
						['Low-carb', '40%', '20%', '40%'],
						['High-protein', '40%', '35%', '25%'],
						['AMDR for adults (guide)', '10% to 35%', '45% to 65%', '20% to 35%']
					]
				}
			},
			{
				heading: 'Check your protein per kilogram',
				paragraphs: [
					'The result shows your protein in grams per kg of body weight. For a healthy adult, the Recommended Dietary Allowance is 0.8 g per kg. Many active people eat more than that. Use the [protein calculator](/protein-calculator) to see ranges for your goal.',
					'If your protein per kg looks very high, you can choose the balanced split instead. High protein intakes can be a problem for people with kidney disease, so ask your doctor first if that applies to you.'
				]
			},
			{
				heading: 'Tips for using your macros',
				paragraphs: ['Macros work best as a flexible guide. A few ideas:'],
				list: [
					'**Hit your calories first.** Then use macros to fine-tune.',
					'**Aim for a range**, such as within 5 to 10 g of each target, instead of an exact number.',
					'**Choose whole foods** with fibre, such as vegetables, fruit, beans and whole grains.',
					'**Review every few weeks.** Update the calculator when your weight changes.',
					'**Get advice** from a doctor or dietitian if you have diabetes, kidney disease or another condition, or if you are pregnant.'
				]
			}
		],
		formulas: [
			{
				title: 'Daily calorie target',
				expression: 'TDEE = BMR × activity factor\nTarget = TDEE + goal change (−500, 0 or +500 kcal)',
				variables: [{ symbol: 'BMR', meaning: 'resting calories from the Mifflin-St Jeor equation' }]
			},
			{
				title: 'Grams per macro',
				expression: 'Calories = target × split %\nProtein and carbs (g) = calories ÷ 4\nFat (g) = calories ÷ 9',
				variables: [
					{ symbol: '4', meaning: 'kcal per gram of protein or carbohydrate' },
					{ symbol: '9', meaning: 'kcal per gram of fat' }
				]
			}
		],
		example: {
			title: 'A 30-year-old woman, 70 kg, 170 cm, light activity, maintaining weight, balanced split',
			steps: [
				'TDEE = 1,451.5 × 1.375 = 1,995.8, so the target is 1,996 kcal a day',
				'Protein 30%: 1,996 × 0.30 = 599 kcal, and 599 ÷ 4 = 150 g',
				'Carbs 40%: 1,996 × 0.40 = 798 kcal, and 798 ÷ 4 = 200 g',
				'Fat 30%: 1,996 × 0.30 = 599 kcal, and 599 ÷ 9 = 67 g'
			],
			result: 'About 1,996 kcal a day, made up of 150 g protein, 200 g carbs and 67 g fat.'
		},
		faq: [
			{
				q: 'How do I calculate my macros?',
				a: 'Work out your daily calories, then split them by percentage between protein, carbs and fat. Divide protein and carb calories by 4, and fat calories by 9, to get grams. This calculator does all of it for you.'
			},
			{
				q: 'Which split should I choose?',
				a: 'The balanced split suits most people. Low-carb moves calories from carbs to fat, and high-protein raises protein. Choose the one you can keep up, and ask a dietitian if you have a health condition.'
			},
			{
				q: 'How much protein do I need?',
				a: 'The RDA for healthy adults is 0.8 g per kg of body weight a day. Many active adults eat more. The protein per kg figure in the results lets you check where you are.'
			},
			{
				q: 'Why are protein and carbs 4 kcal per gram?',
				a: 'These are the standard energy values used for food labels. Fat provides 9 kcal per gram, which is why the same calories weigh less in fat.'
			},
			{
				q: 'Do I have to count macros to lose weight?',
				a: 'No. Total calories matter most for weight change. Macros can help with fullness, muscle and food choices, but counting them is optional.'
			}
		],
		sources: [
			{ title: 'National Academies — Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids (2005)', url: 'https://nap.nationalacademies.org/catalog/10490' },
			{ title: 'Dietary Guidelines for Americans', url: 'https://www.dietaryguidelines.gov/' },
			{ title: 'NIDDK, NIH — Body Weight Planner', url: 'https://www.niddk.nih.gov/bwp' }
		],
		disclaimer:
			'These are general estimates for healthy adults. They are not suitable during pregnancy or for people with medical conditions. Ask a doctor or dietitian for personal advice.'
	}
});
