import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './protein-calculator.meta';

const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';

const LB_TO_KG = 0.45359237;
const KG_TO_LB = 2.2046226218;
const KCAL_PER_GRAM_PROTEIN = 4;

/** Grams of protein per kg of body weight for each activity or goal. */
export const GOALS: Record<string, { label: string; low: number; high: number }> = {
	sedentary: { label: 'Sedentary adult: RDA, 0.8 g per kg', low: 0.8, high: 0.8 },
	active: { label: 'Active adult: 1.2 to 1.6 g per kg', low: 1.2, high: 1.6 },
	strength: { label: 'Strength training or building muscle: 1.6 to 2.2 g per kg', low: 1.6, high: 2.2 },
	older: { label: 'Adult 65 or older: 1.0 to 1.2 g per kg', low: 1.0, high: 1.2 }
};

const ok = (n: number) => Number.isFinite(n) && n > 0;

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
				{ label: 'Metric (kg)', value: 'metric' },
				{ label: 'Imperial (lb)', value: 'imperial' }
			]
		},
		{ id: 'kg', label: 'Body weight', type: 'number', default: 70, min: 30, max: 300, step: 0.1, suffix: 'kg', visibleWhen: metric },
		{ id: 'lb', label: 'Body weight', type: 'number', default: 154, min: 66, max: 660, step: 0.1, suffix: 'lb', visibleWhen: imperial },
		{
			id: 'goal',
			label: 'Activity or goal',
			type: 'select',
			display: 'menu',
			default: 'active',
			options: Object.entries(GOALS).map(([value, g]) => ({ value, label: g.label }))
		}
	],
	calculate(v): CalculationResult {
		const label = 'Daily protein target';
		const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: label, summary });

		const isImperial = v.units === 'imperial';
		const kg = isImperial ? Number(v.lb) * LB_TO_KG : Number(v.kg);
		const goal = GOALS[String(v.goal)];
		if (!ok(kg) || !goal) return fail('Enter your body weight and choose an activity or goal.');

		const lo = kg * goal.low;
		const hi = kg * goal.high;
		const fixed = goal.low === goal.high;
		const grams = (a: number, b: number) => (fixed ? `${num(a, 0)}` : `${num(a, 0)}–${num(b, 0)}`);
		const perKg = fixed ? `${num(goal.low, 1, 1)}` : `${num(goal.low, 1, 1)}–${num(goal.high, 1, 1)}`;
		const perMeal = (n: number) => `${grams(lo / n, hi / n)} g`;

		return {
			primaryResult: `${grams(lo, hi)} g/day`,
			primaryLabel: label,
			summary: `${perKg} g of protein for each kg of body weight.`,
			secondaryMetrics: [
				{ label: 'Per kg of body weight', value: `${perKg} g/kg` },
				{ label: 'Calories from protein', value: `${grams(lo * KCAL_PER_GRAM_PROTEIN, hi * KCAL_PER_GRAM_PROTEIN)} kcal` },
				{ label: 'Body weight used', value: `${num(kg, 1, 1)} kg (${num(kg * KG_TO_LB, 1, 1)} lb)` }
			],
			table: {
				title: 'Protein per meal',
				columns: [
					{ key: 'meals', label: 'Meals per day' },
					{ key: 'perMeal', label: 'Protein per meal', align: 'end' }
				],
				rows: [
					{ meals: '3 meals', perMeal: perMeal(3) },
					{ meals: '4 meals', perMeal: perMeal(4) }
				]
			}
		};
	},
	content: {
		intro:
			'Use this protein calculator to find your daily protein target in grams, based on your body weight and your activity level or goal. A table shows how the total splits across three or four meals.',
		howTo: [
			'Choose metric (kg) or imperial (lb) units and enter your body weight.',
			'Pick the option that best fits your activity level or goal.',
			'Read your daily grams, then use the table to plan grams per meal.'
		],
		about: [
			{
				heading: 'Why protein matters',
				paragraphs: [
					'Protein is a nutrient made of amino acids. Your body uses it to build and repair muscle, skin and other tissues, and to make enzymes and hormones. You need some every day, because the body does not store it the way it stores fat.',
					'Protein gives 4 kcal per gram. It also tends to keep you full after a meal. For a full split of calories, see the [macro calculator](/macro-calculator).'
				]
			},
			{
				heading: 'How much protein do you need?',
				paragraphs: [
					'For healthy adults, the Recommended Dietary Allowance (RDA) is 0.8 g of protein per kg of body weight a day. This figure comes from the Dietary Reference Intakes set by the National Academies. It is the amount that meets the needs of most healthy people, not a target for best results.',
					'Needs can be higher in some groups. The PROT-AGE study group recommended that people over 65 eat at least 1.0 to 1.2 g per kg a day, and more if they are active. A large analysis of strength training studies found that muscle gains levelled off at around 1.6 g per kg a day, with a top estimate of about 2.2 g per kg.',
					'The “active adult” range of 1.2 to 1.6 g per kg is a commonly used guide for people who exercise regularly. However, it is a practical estimate and not a hard rule.'
				],
				table: {
					caption: 'Daily protein ranges used in this calculator',
					columns: ['Group', 'Grams per kg of body weight'],
					rows: [
						['Sedentary adult (RDA)', '0.8'],
						['Adult 65 or older', '1.0 to 1.2'],
						['Active adult', '1.2 to 1.6'],
						['Strength training or building muscle', '1.6 to 2.2']
					]
				}
			},
			{
				heading: 'Spreading protein across meals',
				paragraphs: [
					'The table shows protein per meal for three or four meals. First, spreading protein through the day is a practical way to reach your total. Also, it is easier than eating it all at dinner.',
					'Ideas for each meal include eggs, yogurt, milk, cheese, fish, chicken, beans, lentils, tofu and nuts. Plant foods can meet your needs too, so you do not need meat. Eating a mix of sources across the day helps you get all the amino acids.'
				]
			},
			{
				heading: 'Who should be careful',
				paragraphs: [
					'Most healthy adults can eat more than the RDA without harm. But if you have kidney disease or another kidney condition, a high protein intake may not suit you. Please ask a doctor or dietitian before you increase protein.',
					'This calculator is not for pregnancy, breastfeeding, children or people with medical conditions, because their needs differ. If you are also planning weight loss, the [calorie calculator](/calorie-calculator) can set your daily calories. Then the [lean body mass calculator](/lean-body-mass-calculator) shows how much of your weight is muscle and other lean tissue.'
				]
			}
		],
		formulas: [
			{
				title: 'Daily protein',
				expression: 'Protein (g) = body weight (kg) × grams per kg',
				variables: [
					{ symbol: 'grams per kg', meaning: '0.8 (sedentary), 1.2 to 1.6 (active), 1.6 to 2.2 (strength), 1.0 to 1.2 (age 65 and over)' }
				]
			},
			{
				title: 'Per meal',
				expression: 'Protein per meal (g) = daily grams ÷ number of meals',
				variables: []
			},
			{
				title: 'Calories from protein',
				expression: 'kcal = grams × 4',
				variables: [{ symbol: '4', meaning: 'kcal per gram of protein' }]
			}
		],
		example: {
			title: 'An active adult, 70 kg',
			steps: [
				'Low end: 70 × 1.2 = 84 g a day',
				'High end: 70 × 1.6 = 112 g a day',
				'Three meals: 84 ÷ 3 = 28 g and 112 ÷ 3 = 37 g per meal',
				'Four meals: 84 ÷ 4 = 21 g and 112 ÷ 4 = 28 g per meal'
			],
			result: 'About 84 to 112 g of protein a day, or 28 to 37 g per meal with three meals.'
		},
		faq: [
			{
				q: 'How much protein do I need per day?',
				a: 'Healthy adults need at least 0.8 g per kg of body weight a day. That is about 56 g for a 70 kg adult. Active people, strength trainers and people over 65 are often advised to eat more.'
			},
			{
				q: 'Where do these numbers come from?',
				a: 'The 0.8 g per kg figure is the RDA for healthy adults. It is the minimum most people need. The higher ranges come from studies of older adults and of people who train, so they are guides rather than rules.'
			},
			{
				q: 'Is more protein always better?',
				a: 'No. Intakes well above these ranges add little for most people, and high intakes can be a problem for people with kidney disease. Spreading protein across the day is a practical way to reach your target.'
			},
			{
				q: 'How much protein is in common foods?',
				a: 'As a rough guide, 100 g of cooked chicken breast has about 30 g of protein, and two large eggs have about 12 g. Check food labels or USDA FoodData Central for exact amounts.'
			},
			{
				q: 'Can I get enough protein from plants?',
				a: 'Yes. Beans, lentils, tofu, soy and other plant foods can meet your target. Some are lower in certain amino acids, so mixing sources across the day helps.'
			}
		],
		sources: [
			{ title: 'National Academies — Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids (2005)', url: 'https://nap.nationalacademies.org/catalog/10490' },
			{ title: 'Bauer J et al. (2013), PROT-AGE Study Group, Journal of the American Medical Directors Association', url: 'https://digital.library.adelaide.edu.au/dspace/handle/2440/80029' },
			{ title: 'Morton RW et al. (2018), British Journal of Sports Medicine: protein supplementation and resistance training', url: 'https://pubmed.ncbi.nlm.nih.gov/28698222/' }
		],
		disclaimer:
			'These are general targets for healthy adults. If you have kidney disease, your needs can be different, and a high protein intake may not suit you. Ask a doctor or dietitian before changing your protein intake.'
	}
});
