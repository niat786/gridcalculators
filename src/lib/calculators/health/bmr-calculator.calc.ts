import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './bmr-calculator.meta';

const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';

/** Mifflin-St Jeor resting energy expenditure (kcal/day). */
export function mifflinStJeor(kg: number, cm: number, age: number, male: boolean): number {
	return 10 * kg + 6.25 * cm - 5 * age + (male ? 5 : -161);
}

/** Harris-Benedict, revised by Roza and Shizgal (1984) (kcal/day). */
export function harrisBenedict(kg: number, cm: number, age: number, male: boolean): number {
	return male
		? 88.362 + 13.397 * kg + 4.799 * cm - 5.677 * age
		: 447.593 + 9.247 * kg + 3.098 * cm - 4.33 * age;
}

/** Katch-McArdle, from lean body mass (kcal/day). */
export function katchMcArdle(kg: number, bodyFatPct: number): number {
	return 370 + 21.6 * kg * (1 - bodyFatPct / 100);
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
			id: 'bodyFat',
			label: 'Body fat (optional)',
			type: 'number',
			default: 0,
			min: 0,
			max: 75,
			step: 0.1,
			suffix: '%',
			help: 'Leave at 0 if unknown. Only used for Katch-McArdle.'
		}
	],
	calculate(v): CalculationResult {
		const isImperial = v.units === 'imperial';
		const kg = isImperial ? Number(v.lb) * 0.45359237 : Number(v.kg);
		const cm = isImperial ? (Number(v.ft) * 12 + Number(v.in)) * 2.54 : Number(v.cm);
		const age = Number(v.age);
		const bodyFat = Number(v.bodyFat);
		const male = v.sex === 'male';
		if (![kg, cm, age, bodyFat].every(Number.isFinite) || !(kg > 0) || !(cm > 0) || !(age > 0) || bodyFat < 0 || bodyFat >= 75) {
			return { primaryResult: DASH, primaryLabel: 'Resting calories (BMR)', summary: 'Fill in every field.' };
		}

		const mifflin = Math.round(mifflinStJeor(kg, cm, age, male));
		const hb = Math.round(harrisBenedict(kg, cm, age, male));
		const useKatch = bodyFat > 0;
		const km = useKatch ? Math.round(katchMcArdle(kg, bodyFat)) : 0;

		return {
			primaryResult: `${num(mifflin, 0)} kcal/day`,
			primaryLabel: 'Resting calories (Mifflin-St Jeor)',
			summary: `10 × weight + 6.25 × height − 5 × age, then +5 for men or −161 for women.`,
			secondaryMetrics: [
				{ label: 'Harris-Benedict (revised 1984)', value: `${num(hb, 0)} kcal/day` },
				{ label: 'Katch-McArdle (uses body fat)', value: useKatch ? `${num(km, 0)} kcal/day` : 'Enter body fat %' },
				{ label: 'Body fat used', value: useKatch ? `${num(bodyFat, 1)}%` : 'Not used' }
			]
		};
	},
	content: {
		intro:
			'Use this BMR calculator to estimate your basal metabolic rate, the calories your body uses at complete rest. You can compare three well-known equations side by side.',
		howTo: [
			'Choose metric (kg and cm) or imperial (lb, feet and inches), then your sex.',
			'Enter your age, weight and height.',
			'If you know your body fat percentage, enter it to add the Katch-McArdle estimate. Otherwise, leave it at 0.',
			'Read the Mifflin-St Jeor result first, then compare it with the other equations.'
		],
		about: [
			{
				heading: 'What is BMR?',
				paragraphs: [
					'Basal metabolic rate (BMR) is the energy your body needs to stay alive while you rest. It pays for breathing, circulation, keeping warm and repairing cells. You use these calories even if you stay in bed all day.',
					'For most people, BMR is the largest part of the calories they burn in a day. The rest comes from digesting food and from movement, including exercise. Strictly, BMR is measured in a lab under very controlled conditions. Equations like these give an estimate that is also called resting metabolic rate (RMR).'
				]
			},
			{
				heading: 'How BMR is calculated',
				paragraphs: [
					'This tool shows three equations. Mifflin-St Jeor (1990) is the main result. It uses your weight, height, age and sex. A systematic review in the Journal of the American Dietetic Association found it the most reliable of the common equations for healthy adults, though errors still happen for individuals.',
					'Harris-Benedict is older. This version was revised in 1984, and it often gives a slightly higher number. Katch-McArdle is different, because it uses your lean body mass (everything except fat). So it can suit people who know their body fat and have a lot of muscle. You can estimate body fat with the [body fat calculator](/body-fat-calculator).',
					'The exact formulas are in the formulas section below. For your own results, a gap of 50 to 150 kcal between equations is normal.'
				]
			},
			{
				heading: 'What changes your BMR?',
				paragraphs: [
					'Several things move BMR up or down:'
				],
				list: [
					'**Body size.** A larger body uses more energy.',
					'**Muscle.** Lean tissue uses more energy at rest than fat does.',
					'**Age.** The equations lower the estimate as age rises, and needs often fall in later life as muscle is lost.',
					'**Sex.** On average, men have more lean mass than women of the same weight.',
					'**Health and medicines.** Thyroid conditions and some drugs can change it.'
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'Look at the main number first. It is the Mifflin-St Jeor estimate, in kcal per day. Then check the other two. If they are close, you can be more confident in the range.',
					'If they differ a lot, do not worry. Each equation was built from a different group of people. For example, Katch-McArdle depends on the body fat you enter, so a small error there changes the answer. A sensible approach is to treat the three numbers as a range, not one exact value.'
				]
			},
			{
				heading: 'From BMR to your daily calories',
				paragraphs: [
					'BMR is not the amount you should eat. You also move, work and exercise. To include that, multiply BMR by an activity factor. The [TDEE calculator](/tdee-calculator) does this for you.',
					'If you want a target for weight loss or gain, use the [calorie calculator](/calorie-calculator). Please do not eat below your BMR for long periods without a doctor’s advice. Eating too little can make it hard to get enough nutrients.'
				]
			}
		],
		formulas: [
			{
				title: 'Mifflin-St Jeor (primary result)',
				expression: 'Men:   BMR = 10W + 6.25H − 5A + 5\nWomen: BMR = 10W + 6.25H − 5A − 161',
				variables: [
					{ symbol: 'W', meaning: 'weight in kilograms' },
					{ symbol: 'H', meaning: 'height in centimetres' },
					{ symbol: 'A', meaning: 'age in years' }
				]
			},
			{
				title: 'Harris-Benedict, revised 1984',
				expression: 'Men:   BMR = 88.362 + 13.397W + 4.799H − 5.677A\nWomen: BMR = 447.593 + 9.247W + 3.098H − 4.330A',
				variables: [
					{ symbol: 'W', meaning: 'weight in kilograms' },
					{ symbol: 'H', meaning: 'height in centimetres' },
					{ symbol: 'A', meaning: 'age in years' }
				]
			},
			{
				title: 'Katch-McArdle (needs body fat %)',
				expression: 'BMR = 370 + 21.6 × LBM\nLBM = W × (1 − body fat ÷ 100)',
				variables: [
					{ symbol: 'LBM', meaning: 'lean body mass in kilograms' },
					{ symbol: 'W', meaning: 'weight in kilograms' }
				]
			}
		],
		example: {
			title: 'A 30-year-old woman, 70 kg, 170 cm',
			steps: [
				'Mifflin-St Jeor: 10 × 70 + 6.25 × 170 − 5 × 30 − 161 = 1,451.5 kcal',
				'Harris-Benedict: 447.593 + 9.247 × 70 + 3.098 × 170 − 4.330 × 30 = 1,491.6 kcal',
				'Rounded to whole calories, the primary result is 1,452 kcal a day'
			],
			result: 'About 1,452 kcal a day at complete rest (Mifflin-St Jeor), with Harris-Benedict close at 1,492.'
		},
		faq: [
			{
				q: 'What is a normal BMR?',
				a: 'There is no single normal value, because BMR depends on your size, age, sex and muscle. For a 30-year-old woman who weighs 70 kg and is 170 cm tall, Mifflin-St Jeor gives about 1,452 kcal a day.'
			},
			{
				q: 'Which BMR equation is most accurate?',
				a: 'For healthy adults, Mifflin-St Jeor was the most reliable of the common equations in a published review. Harris-Benedict is older and often runs a little higher. Katch-McArdle can be better if you know your body fat.'
			},
			{
				q: 'Do I need to enter body fat?',
				a: 'No. Leave it at 0 and the tool skips Katch-McArdle. If you do know it, the estimate uses lean mass, which can suit very muscular or very lean people.'
			},
			{
				q: 'Is BMR the same as the calories I need each day?',
				a: 'No. BMR covers only resting body functions. Your daily needs add the energy you use to move and exercise. Use the [TDEE calculator](/tdee-calculator) for that number.'
			},
			{
				q: 'Can I raise my BMR?',
				a: 'Building muscle with strength training can raise it a little, because muscle uses more energy than fat at rest. The change is usually small. Do not rely on supplements that promise a big boost.'
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
