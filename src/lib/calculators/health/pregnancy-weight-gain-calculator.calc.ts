import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './pregnancy-weight-gain-calculator.meta';

const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';

const LB_TO_KG = 0.45359237;

type Cat = 'under' | 'normal' | 'over' | 'obese';
const CAT_LABEL: Record<Cat, string> = {
	under: 'Underweight',
	normal: 'Normal weight',
	over: 'Overweight',
	obese: 'Obesity'
};
const CAT_BMI: Record<Cat, string> = {
	under: 'Underweight (below 18.5)',
	normal: 'Normal weight (18.5 to 24.9)',
	over: 'Overweight (25 to 29.9)',
	obese: 'Obesity (30 and over)'
};

/** IOM 2009 total gain for one baby, in lb. */
const SINGLE_TOTAL: Record<Cat, [number, number]> = {
	under: [28, 40],
	normal: [25, 35],
	over: [15, 25],
	obese: [11, 20]
};
/** IOM 2009 total gain for twins, in lb. No range is set for underweight. */
const TWINS_TOTAL: Record<Cat, [number, number] | null> = {
	under: null,
	normal: [37, 54],
	over: [31, 50],
	obese: [25, 42]
};
/** IOM 2009 weekly gain after the first trimester for one baby, in lb per week. */
const SINGLE_RATE: Record<Cat, [number, number]> = {
	under: [1.0, 1.3],
	normal: [0.8, 1.0],
	over: [0.5, 0.7],
	obese: [0.4, 0.6]
};

function category(bmi: number): Cat {
	if (bmi < 18.5) return 'under';
	if (bmi < 25) return 'normal';
	if (bmi < 30) return 'over';
	return 'obese';
}

/** "3.0–5.2 kg (6.7–11.4 lb)", with the user's own unit first. */
function gain(loLb: number, hiLb: number, lbDecimals: number, imp: boolean): string {
	const lb = `${num(loLb, lbDecimals, lbDecimals)}–${num(hiLb, lbDecimals, lbDecimals)} lb`;
	const kg = `${num(loLb * LB_TO_KG, 1, 1)}–${num(hiLb * LB_TO_KG, 1, 1)} kg`;
	return imp ? `${lb} (${kg})` : `${kg} (${lb})`;
}

function pace(lo: number, hi: number, imp: boolean): string {
	return imp
		? `${num(lo, 1, 1)}–${num(hi, 1, 1)} lb a week`
		: `${num(lo * LB_TO_KG, 2, 2)}–${num(hi * LB_TO_KG, 2, 2)} kg a week`;
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
		{ id: 'kg', label: 'Weight before pregnancy', type: 'number', default: 65, min: 30, max: 300, step: 0.1, suffix: 'kg', visibleWhen: metric },
		{ id: 'cm', label: 'Height', type: 'number', default: 165, min: 120, max: 230, step: 0.1, suffix: 'cm', visibleWhen: metric },
		{ id: 'lb', label: 'Weight before pregnancy', type: 'number', default: 143, min: 66, max: 660, step: 0.1, suffix: 'lb', visibleWhen: imperial },
		{ id: 'ft', label: 'Height (feet)', type: 'number', default: 5, min: 4, max: 7, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: imperial },
		{ id: 'in', label: 'Height (inches)', type: 'number', default: 5, min: 0, max: 11.9, step: 0.1, suffix: 'in', width: 'half', visibleWhen: imperial },
		{
			id: 'pregnancy',
			label: 'Pregnancy',
			type: 'select',
			display: 'segmented',
			default: 'single',
			options: [
				{ label: 'One baby', value: 'single' },
				{ label: 'Twins', value: 'twins' }
			]
		},
		{
			id: 'week',
			label: 'Current week of pregnancy',
			type: 'number',
			default: 20,
			min: 1,
			max: 42,
			step: 1,
			decimal: false,
			suffix: 'weeks',
			help: 'From 1 to 42'
		}
	],
	calculate(v): CalculationResult {
		const label = 'Recommended gain by week';
		const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: label, summary });

		const isImperial = v.units === 'imperial';
		const kg = isImperial ? Number(v.lb) * LB_TO_KG : Number(v.kg);
		const cm = isImperial ? (Number(v.ft) * 12 + Number(v.in)) * 2.54 : Number(v.cm);
		const week = Number(v.week);
		const twins = v.pregnancy === 'twins';
		if (!(kg > 0) || !(cm > 0) || !Number.isFinite(kg) || !Number.isFinite(cm)) return fail('Enter your weight and height before pregnancy.');
		if (!Number.isInteger(week) || week < 1 || week > 42) return fail('Enter the current week of pregnancy, from 1 to 42.');

		const bmi = kg / ((cm / 100) ** 2);
		const cat = category(bmi);
		const trimester = week <= 13 ? 'First trimester' : week <= 27 ? 'Second trimester' : 'Third trimester';
		const bmiText = `${num(bmi, 1, 1)} (${CAT_LABEL[cat]})`;
		const totalPair = twins ? TWINS_TOTAL[cat] : SINGLE_TOTAL[cat];
		const totalText = totalPair ? gain(totalPair[0], totalPair[1], 0, isImperial) : 'Not set by the IOM';

		const table = {
			title: 'Total recommended gain (IOM 2009)',
			columns: [
				{ key: 'bmi', label: 'Pre-pregnancy BMI' },
				{ key: 'single', label: 'One baby', align: 'end' as const },
				{ key: 'twins', label: 'Twins', align: 'end' as const }
			],
			rows: (['under', 'normal', 'over', 'obese'] as Cat[]).map((c) => {
				const s = SINGLE_TOTAL[c];
				const t = TWINS_TOTAL[c];
				return {
					bmi: CAT_BMI[c],
					single: gain(s[0], s[1], 0, isImperial),
					twins: t ? gain(t[0], t[1], 0, isImperial) : 'No guideline'
				};
			})
		};

		// Twins get total ranges only. Underweight twins have no range at all.
		if (twins) {
			if (!totalPair) {
				return {
					primaryResult: 'No guideline',
					primaryLabel: 'Total gain for twins',
					summary: 'The IOM did not set a range for underweight people expecting twins. Ask your care team what suits you.',
					secondaryMetrics: [
						{ label: 'Pre-pregnancy BMI', value: bmiText },
						{ label: 'Total gain goal', value: totalText },
						{ label: 'Pace after week 13', value: 'Not set' },
						{ label: 'Trimester', value: trimester }
					],
					table
				};
			}
			return {
				primaryResult: totalText,
				primaryLabel: 'Total gain for twins',
				summary: 'For twins the IOM gives total ranges only. Ask your care team for week-by-week advice.',
				secondaryMetrics: [
					{ label: 'Pre-pregnancy BMI', value: bmiText },
					{ label: 'Total gain goal', value: totalText },
					{ label: 'Pace after week 13', value: 'Ask your care team' },
					{ label: 'Trimester', value: trimester }
				],
				table
			};
		}

		// One baby: first trimester 1.1 to 4.4 lb in total (scaled by week), then the weekly rate.
		const [rLo, rHi] = SINGLE_RATE[cat];
		const after = Math.max(0, week - 13);
		const loLb = week <= 13 ? (1.1 * week) / 13 : 1.1 + rLo * after;
		const hiLb = week <= 13 ? (4.4 * week) / 13 : 4.4 + rHi * after;

		return {
			primaryResult: gain(loLb, hiLb, 1, isImperial),
			primaryLabel: `Recommended gain by week ${week}`,
			summary: `Based on a pre-pregnancy BMI of ${num(bmi, 1, 1)}. These are guides, and your care team can tailor them.`,
			secondaryMetrics: [
				{ label: 'Pre-pregnancy BMI', value: bmiText },
				{ label: 'Total gain goal', value: totalText },
				{ label: 'Pace after week 13', value: pace(rLo, rHi, isImperial) },
				{ label: 'Trimester', value: trimester }
			],
			table
		};
	},
	content: {
		intro:
			'Use this pregnancy weight gain calculator to see how much weight gain is generally recommended at your current week of pregnancy. It uses your weight before pregnancy and whether you expect one baby or twins, based on the 2009 Institute of Medicine (IOM) guidelines.',
		howTo: [
			'Choose metric or imperial units, then enter your weight and height before pregnancy.',
			'Choose one baby or twins, and enter your current week of pregnancy.',
			'Read the recommended gain for this week, then compare it with the total goal in the table.'
		],
		about: [
			{
				heading: 'How much weight should you gain in pregnancy?',
				paragraphs: [
					'The 2009 guidelines from the Institute of Medicine (IOM, now the National Academy of Medicine) give a range of total weight gain. The range depends on your body mass index (BMI) before pregnancy. If you started with a lower BMI, the range is higher. If you started with a higher BMI, the range is lower.',
					'The weight comes from more than the baby. It includes the placenta, amniotic fluid, a larger uterus and breasts, extra blood and body fluid, and some stored fat. For this reason, gain is not only “baby weight”.'
				]
			},
			{
				heading: 'Recommended total gain for one baby',
				paragraphs: [
					'These are the IOM ranges for a single baby. The tool picks your row from your pre-pregnancy BMI. Gain is meant to be slow and steady after the first trimester.'
				],
				table: {
					caption: 'IOM 2009 weight gain for one baby',
					columns: ['Pre-pregnancy BMI', 'Total gain', 'Weekly gain after week 13'],
					rows: [
						['Underweight (below 18.5)', '28 to 40 lb (12.7 to 18.1 kg)', '1.0 to 1.3 lb (0.45 to 0.59 kg)'],
						['Normal weight (18.5 to 24.9)', '25 to 35 lb (11.3 to 15.9 kg)', '0.8 to 1.0 lb (0.36 to 0.45 kg)'],
						['Overweight (25 to 29.9)', '15 to 25 lb (6.8 to 11.3 kg)', '0.5 to 0.7 lb (0.23 to 0.32 kg)'],
						['Obesity (30 and over)', '11 to 20 lb (5.0 to 9.1 kg)', '0.4 to 0.6 lb (0.18 to 0.27 kg)']
					]
				}
			},
			{
				heading: 'Twins and the first trimester',
				paragraphs: [
					'For twins, the IOM gives total ranges only. They are 37 to 54 lb for normal weight, 31 to 50 lb for overweight, and 25 to 42 lb for obesity. No range was set for underweight people expecting twins. Please ask your care team for week-by-week advice if you are expecting twins.',
					'In the first 13 weeks, the guidelines expect a small gain of about 1.1 to 4.4 lb (0.5 to 2 kg). Some people gain nothing or lose a little because of nausea. This is common, but tell your midwife or doctor if you cannot keep food or drink down.'
				]
			},
			{
				heading: 'Use these numbers with care',
				paragraphs: [
					'These are guides, not targets. Many healthy pregnancies fall outside them. Your care team looks at your health, your baby’s growth and your own situation, not only one number.',
					'Guidelines also differ between countries. For example, NICE in the UK found too little evidence to recommend specific weight gain amounts, and it advises against dieting during pregnancy. Follow the advice your own midwife or doctor gives you.',
					'You do not need to “eat for two”. If you are worried about gaining too much or too little, talk to your care team. Never try to lose weight in pregnancy without medical advice.'
				]
			},
			{
				heading: 'Related tools',
				paragraphs: [
					'Your pre-pregnancy BMI sets your range. You can check it with the [BMI calculator](/bmi-calculator). To see your weeks and trimester, use the [pregnancy calculator](/pregnancy-calculator) or the [due date calculator](/due-date-calculator).',
					'The [calorie calculator](/calorie-calculator) and [TDEE calculator](/tdee-calculator) are not designed for use during pregnancy. Ask a dietitian or your care team how much to eat.'
				]
			}
		],
		formulas: [
			{
				title: 'Pre-pregnancy BMI',
				expression: 'BMI = weight in kg ÷ (height in m)²',
				variables: [{ symbol: 'BMI', meaning: 'body mass index before pregnancy, used to choose the category' }]
			},
			{
				title: 'First trimester (up to week 13)',
				expression: 'Gain = 1.1 to 4.4 lb in total by week 13, scaled by week ÷ 13',
				variables: []
			},
			{
				title: 'After week 13, one baby',
				expression:
					'Gain = first trimester total + weekly rate × (week − 13)\nWeekly rates: underweight 1.0–1.3, normal 0.8–1.0, overweight 0.5–0.7, obesity 0.4–0.6 lb a week',
				variables: []
			}
		],
		example: {
			title: 'A woman, 65 kg and 165 cm before pregnancy, at week 20 with one baby',
			steps: [
				'BMI = 65 ÷ 1.65² = 23.9, in the normal weight range',
				'Low end at week 20: 1.1 + 0.8 × (20 − 13) = 6.7 lb',
				'High end at week 20: 4.4 + 1.0 × (20 − 13) = 11.4 lb',
				'In kilograms: 6.7 lb = 3.0 kg and 11.4 lb = 5.2 kg',
				'Total goal for normal weight with one baby: 25 to 35 lb (11.3 to 15.9 kg)'
			],
			result: 'About 3.0 to 5.2 kg (6.7 to 11.4 lb) gained by week 20, on the way to 25 to 35 lb by the end.'
		},
		faq: [
			{
				q: 'How much weight should I gain during pregnancy?',
				a: 'The IOM range depends on your pre-pregnancy BMI. For one baby it is 25 to 35 lb (11.3 to 15.9 kg) at a normal weight, and 28 to 40 lb if underweight. It is 15 to 25 lb if overweight and 11 to 20 lb with obesity.'
			},
			{
				q: 'Are these numbers targets I need to hit?',
				a: 'No. They are ranges that cover most healthy pregnancies. Weight gain varies a lot, and your care team looks at your growth and wellbeing as a whole rather than one number.'
			},
			{
				q: 'What if I was overweight or had obesity before pregnancy?',
				a: 'A higher pre-pregnancy BMI comes with a lower recommended gain. It is not a judgement, and your care team can help you plan.'
			},
			{
				q: 'Why are the totals higher for twins?',
				a: 'Two babies need more energy, and the uterus and placenta grow more. The IOM sets only total ranges for twins, so weekly figures are not shown.'
			},
			{
				q: 'Why is there no range for underweight twins?',
				a: 'The IOM did not set a range for this group. Your care team can advise on what is right for you.'
			},
			{
				q: 'What about the first trimester?',
				a: 'Many people gain little in the first 13 weeks, and some lose weight because of nausea. The calculator assumes a gain of 1.1 to 4.4 lb by week 13.'
			}
		],
		sources: [
			{ title: 'Institute of Medicine (2009) — Weight Gain During Pregnancy: Reexamining the Guidelines', url: 'https://nap.nationalacademies.org/catalog/12584' },
			{ title: 'NICE (UK) — Maternal and child nutrition guidance, as reported by GPonline', url: 'https://www.gponline.com/dont-diet-during-pregnancy-aim-healthy-weight-before-nice-says/article/1018822' }
		],
		disclaimer:
			'Based on the 2009 IOM guidelines for healthy pregnancies. This is not medical advice. Ask your midwife, doctor or care team about your own weight gain.'
	}
});
