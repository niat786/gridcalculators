import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './lean-body-mass-calculator.meta';

const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';

const LB_TO_KG = 0.45359237;
const KG_TO_LB = 2.2046226218;

/** Boer (1984). Weight in kg, height in cm. Returns lean body mass in kg. */
export function boer(w: number, h: number, male: boolean): number {
	return male ? 0.407 * w + 0.267 * h - 19.2 : 0.252 * w + 0.473 * h - 48.3;
}

/** James (1976). Weight in kg, height in cm. Returns lean body mass in kg. */
export function james(w: number, h: number, male: boolean): number {
	const ratio = (w / h) ** 2;
	return male ? 1.1 * w - 128 * ratio : 1.07 * w - 148 * ratio;
}

/** Hume (1966). Weight in kg, height in cm. Returns lean body mass in kg. */
export function hume(w: number, h: number, male: boolean): number {
	return male ? 0.3281 * w + 0.33929 * h - 29.5336 : 0.29569 * w + 0.41813 * h - 43.2933;
}

const ok = (n: number) => Number.isFinite(n) && n > 0;
/** Remove binary floating-point noise so values like 49.75 round the way a person expects. */
const clean = (x: number) => Math.round(x * 1e6) / 1e6;

export default defineCalculator({
	meta,
	inputs: [
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
		{ id: 'kg', label: 'Weight', type: 'number', default: 70, min: 30, max: 300, step: 0.1, suffix: 'kg', visibleWhen: metric },
		{ id: 'cm', label: 'Height', type: 'number', default: 170, min: 120, max: 230, step: 0.1, suffix: 'cm', visibleWhen: metric },
		{ id: 'lb', label: 'Weight', type: 'number', default: 154, min: 66, max: 660, step: 0.1, suffix: 'lb', visibleWhen: imperial },
		{ id: 'ft', label: 'Height (feet)', type: 'number', default: 5, min: 4, max: 7, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: imperial },
		{ id: 'in', label: 'Height (inches)', type: 'number', default: 7, min: 0, max: 11.9, step: 0.1, suffix: 'in', width: 'half', visibleWhen: imperial }
	],
	calculate(v): CalculationResult {
		const label = 'Lean body mass (Boer)';
		const isImperial = v.units === 'imperial';
		const kg = isImperial ? Number(v.lb) * LB_TO_KG : Number(v.kg);
		const cm = isImperial ? (Number(v.ft) * 12 + Number(v.in)) * 2.54 : Number(v.cm);
		if (!ok(kg) || !ok(cm)) return { primaryResult: DASH, primaryLabel: label, summary: 'Enter your weight and height.' };

		const male = v.sex === 'male';
		const unit = isImperial ? 'lb' : 'kg';
		const out = (x: number) => (isImperial ? x * KG_TO_LB : x);

		const lbm = {
			boer: clean(boer(kg, cm, male)),
			james: clean(james(kg, cm, male)),
			hume: clean(hume(kg, cm, male))
		};
		const fatMass = clean(kg - lbm.boer);
		if (!(lbm.boer > 0) || !(lbm.james > 0) || !(lbm.hume > 0) || fatMass < 0) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'These measurements are outside the range the formulas cover.' };
		}

		const fatPct = (fatMass / kg) * 100;
		const all = [lbm.boer, lbm.james, lbm.hume].map(out);
		const row = (name: string, x: number) => ({
			formula: name,
			lean: `${num(out(x), 1, 1)} ${unit}`,
			fat: `${num(((kg - x) / kg) * 100, 1, 1)}%`
		});

		return {
			primaryResult: `${num(out(lbm.boer), 1, 1)} ${unit}`,
			primaryLabel: label,
			summary: `The Boer result implies about ${num(fatPct, 1, 1)}% body fat.`,
			secondaryMetrics: [
				{ label: 'Body weight', value: `${num(out(kg), 1, 1)} ${unit}` },
				{ label: 'Fat mass (Boer)', value: `${num(out(fatMass), 1, 1)} ${unit}` },
				{ label: 'Implied body fat (Boer)', value: `${num(fatPct, 1, 1)}%` },
				{ label: 'Range across formulas', value: `${num(Math.min(...all), 1, 1)}–${num(Math.max(...all), 1, 1)} ${unit}` }
			],
			table: {
				title: 'Lean body mass by formula',
				columns: [
					{ key: 'formula', label: 'Formula' },
					{ key: 'lean', label: 'Lean mass', align: 'end' },
					{ key: 'fat', label: 'Implied body fat', align: 'end' }
				],
				rows: [row('Boer (1984)', lbm.boer), row('James (1976)', lbm.james), row('Hume (1966)', lbm.hume)]
			}
		};
	},
	content: {
		intro:
			'Use this lean body mass calculator to estimate your weight without stored body fat, and the body fat percentage that estimate implies. It shows three published formulas side by side.',
		howTo: [
			'Choose your sex, then metric (kg and cm) or imperial (lb, feet and inches) units.',
			'Enter your body weight and height.',
			'Read the Boer result, then compare the James and Hume formulas in the table.'
		],
		about: [
			{
				heading: 'What is lean body mass?',
				paragraphs: [
					'Lean body mass (LBM) is the weight of everything in your body except stored body fat. It includes muscle, bone, organs, skin, water and the small amount of essential fat your body needs to work.',
					'Your fat mass is the rest of your weight. So body weight equals lean mass plus fat mass. Knowing both gives you a clearer picture than weight alone, because two people with the same weight can have very different body make-up.'
				]
			},
			{
				heading: 'The three formulas',
				paragraphs: [
					'Boer (1984), James (1976) and Hume (1966) are all equations that estimate lean mass from height, weight and sex. Boer’s formula was developed to help adjust body fluid volumes, and Hume’s was published in a clinical pathology journal. They were built from groups of adults, so they work best for people who are close to average build.',
					'The primary result here is Boer. The three formulas often agree within a kilogram or two. The spread between them shows you how much uncertainty there is in the estimate.',
					'The tool also shows an implied body fat percentage. It is your weight minus the lean mass, divided by your weight. Because the formulas use only height and weight, they cannot see how much muscle you really have.'
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'Use the number as a rough guide. If you lift weights and have a lot of muscle, your real lean mass may be higher than the formulas say. On the other hand, if you carry more fat than average for your height, it may be lower. In both cases, the formulas cannot tell, because they only see height, weight and sex.',
					'For a better view of body fat, try the [body fat calculator](/body-fat-calculator), which uses tape measurements. It also helps to check your [BMI](/bmi-calculator). For a precise measurement, ask a clinic about a DXA scan or similar test.'
				]
			},
			{
				heading: 'Why lean mass matters',
				paragraphs: [
					'Muscle helps you move, stay strong and keep your balance as you age. For this reason, many people want to track it. When you try to lose weight, keeping lean mass is a common goal. Eating enough protein and doing strength exercise can help. The [protein calculator](/protein-calculator) gives a daily target.',
					'Lean mass also affects how many calories you burn at rest. In fact, it is a main input to one BMR method. The Katch-McArdle equation in the [BMR calculator](/bmr-calculator) uses lean mass for that reason. If you have a health concern about your weight or muscle, talk to a doctor or dietitian.'
				]
			}
		],
		formulas: [
			{
				title: 'Boer formula (primary result)',
				expression: 'Men:   LBM = 0.407W + 0.267H − 19.2\nWomen: LBM = 0.252W + 0.473H − 48.3',
				variables: [
					{ symbol: 'LBM', meaning: 'lean body mass in kilograms' },
					{ symbol: 'W', meaning: 'body weight in kilograms' },
					{ symbol: 'H', meaning: 'height in centimetres' }
				]
			},
			{
				title: 'James formula',
				expression: 'Men:   LBM = 1.1W − 128 × (W ÷ H)²\nWomen: LBM = 1.07W − 148 × (W ÷ H)²',
				variables: []
			},
			{
				title: 'Hume formula',
				expression: 'Men:   LBM = 0.3281W + 0.33929H − 29.5336\nWomen: LBM = 0.29569W + 0.41813H − 43.2933',
				variables: []
			},
			{
				title: 'Implied body fat',
				expression: 'Fat mass = W − LBM\nBody fat % = fat mass ÷ W × 100',
				variables: []
			}
		],
		example: {
			title: 'A woman, 70 kg, 170 cm',
			steps: [
				'Boer: 0.252 × 70 + 0.473 × 170 − 48.3 = 17.64 + 80.41 − 48.3 = 49.75 kg',
				'Fat mass: 70 − 49.75 = 20.25 kg',
				'Implied body fat: 20.25 ÷ 70 × 100 = 28.9%',
				'James gives 49.8 kg and Hume gives 48.5 kg, close to the Boer result'
			],
			result: 'About 49.8 kg of lean body mass, with an implied body fat of 28.9%.'
		},
		faq: [
			{
				q: 'What is lean body mass?',
				a: 'Lean body mass is everything in your body except stored body fat. It includes muscle, bone, organs, water and the essential fat your body needs to work normally.'
			},
			{
				q: 'How do I calculate my lean body mass?',
				a: 'Use a formula such as Boer, which needs your sex, weight and height. This calculator does it for you. For a measured value, a DXA scan or similar test is more accurate than any formula.'
			},
			{
				q: 'Which formula should I use?',
				a: 'Boer is the primary result here. The three formulas agree closely for most adults, and a difference of a kilogram or two is normal. The range shows how much the choice matters.'
			},
			{
				q: 'Is the implied body fat the same as a body fat test?',
				a: 'No. It comes from weight and height alone, so it cannot separate muscle from fat the way a scan can. Treat it as a rough guide.'
			},
			{
				q: 'Can I use this during pregnancy or for children?',
				a: 'No. The formulas were built for healthy adults. Pregnancy and growth change body make-up, so ask a doctor for advice.'
			}
		],
		sources: [
			{ title: 'Boer P (1984), American Journal of Physiology: Estimated lean body mass as an index for normalization of body fluid volumes in humans', url: 'https://pubmed.ncbi.nlm.nih.gov/6496691/' },
			{ title: 'Hume R (1966), Journal of Clinical Pathology: Prediction of lean body mass from height and weight', url: 'https://jcp.bmj.com/content/19/4/389' }
		],
		disclaimer:
			'These are estimates from population formulas, not a body composition test. Results can differ more for athletes, older adults and people with very high or low body fat. Ask a doctor or dietitian for personal advice.'
	}
});
