import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './body-fat-calculator.meta';

const LB = 0.45359237;
const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';
const female = (v: InputValues) => v.sex === 'female';

/** U.S. Navy circumference formula. All lengths in centimetres; returns body fat in %. */
export function navyBodyFat(male: boolean, heightCm: number, neckCm: number, waistCm: number, hipCm: number): number {
	if (male) {
		return 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
	}
	return 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm)) - 450;
}

/** ACE body fat categories (thresholds are the upper limit of each band). */
export function aceCategory(bodyFat: number, male: boolean): string {
	const [essential, athletes, fitness, average] = male ? [6, 14, 18, 25] : [14, 21, 25, 32];
	if (bodyFat < essential) return 'Essential';
	if (bodyFat < athletes) return 'Athletes';
	if (bodyFat < fitness) return 'Fitness';
	if (bodyFat < average) return 'Average';
	return 'Above average';
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
				{ label: 'Imperial (lb, in)', value: 'imperial' }
			]
		},
		{
			id: 'sex',
			label: 'Sex',
			type: 'select',
			display: 'segmented',
			default: 'male',
			options: [
				{ label: 'Male', value: 'male' },
				{ label: 'Female', value: 'female' }
			]
		},
		{ id: 'kg', label: 'Weight', type: 'number', default: 80, min: 30, max: 300, step: 0.1, suffix: 'kg', visibleWhen: metric },
		{ id: 'lb', label: 'Weight', type: 'number', default: 176, min: 66, max: 660, step: 0.1, suffix: 'lb', visibleWhen: imperial },
		{ id: 'cm', label: 'Height', type: 'number', default: 178, min: 120, max: 230, step: 0.1, suffix: 'cm', visibleWhen: metric },
		{ id: 'ft', label: 'Height (feet)', type: 'number', default: 5, min: 4, max: 7, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: imperial },
		{ id: 'in', label: 'Height (inches)', type: 'number', default: 10, min: 0, max: 11.9, step: 0.1, suffix: 'in', width: 'half', visibleWhen: imperial },
		{ id: 'neckCm', label: 'Neck', type: 'number', default: 38, min: 20, max: 70, step: 0.1, suffix: 'cm', help: 'Measured just below the larynx', visibleWhen: metric },
		{ id: 'neckIn', label: 'Neck', type: 'number', default: 15, min: 8, max: 28, step: 0.1, suffix: 'in', help: 'Measured just below the larynx', visibleWhen: imperial },
		{ id: 'waistCm', label: 'Waist', type: 'number', default: 85, min: 40, max: 200, step: 0.1, suffix: 'cm', help: 'Measured at the navel', visibleWhen: metric },
		{ id: 'waistIn', label: 'Waist', type: 'number', default: 33.5, min: 15, max: 80, step: 0.1, suffix: 'in', help: 'Measured at the navel', visibleWhen: imperial },
		{ id: 'hipCm', label: 'Hip', type: 'number', default: 100, min: 50, max: 200, step: 0.1, suffix: 'cm', help: 'Widest point of the hips', visibleWhen: (v) => metric(v) && female(v) },
		{ id: 'hipIn', label: 'Hip', type: 'number', default: 39, min: 20, max: 80, step: 0.1, suffix: 'in', help: 'Widest point of the hips', visibleWhen: (v) => imperial(v) && female(v) }
	],
	calculate(v): CalculationResult {
		const imp = v.units === 'imperial';
		const male = v.sex !== 'female';
		const kg = imp ? Number(v.lb) * LB : Number(v.kg);
		const heightCm = imp ? (Number(v.ft) * 12 + Number(v.in)) * 2.54 : Number(v.cm);
		const neck = imp ? Number(v.neckIn) * 2.54 : Number(v.neckCm);
		const waist = imp ? Number(v.waistIn) * 2.54 : Number(v.waistCm);
		const hip = male ? 0 : imp ? Number(v.hipIn) * 2.54 : Number(v.hipCm);
		const inputs = [kg, heightCm, neck, waist, ...(male ? [] : [hip])];
		const label = 'Body fat';
		if (!inputs.every((x) => Number.isFinite(x) && x > 0)) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Fill in every measurement.' };
		}
		if (waist <= neck) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Waist must be wider than neck. Re-measure both.' };
		}

		const bodyFat = navyBodyFat(male, heightCm, neck, waist, hip);
		if (!Number.isFinite(bodyFat) || bodyFat <= 0 || bodyFat >= 100) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Check your measurements.' };
		}

		const fatKg = kg * (bodyFat / 100);
		const leanKg = kg - fatKg;
		const mass = (x: number) => (imp ? `${num(x / LB, 1, 1)} lb` : `${num(x, 1, 1)} kg`);
		const category = aceCategory(bodyFat, male);

		return {
			primaryResult: `${num(bodyFat, 1, 1)}%`,
			primaryLabel: label,
			summary: `ACE category: ${category}. U.S. Navy estimate from your tape measurements.`,
			secondaryMetrics: [
				{ label: 'ACE category', value: category },
				{ label: 'Fat mass', value: mass(fatKg) },
				{ label: 'Lean mass', value: mass(leanKg) }
			]
		};
	},
	content: {
		intro:
			'Use this body fat calculator to estimate your body fat percentage from simple tape measurements, using the U.S. Navy method. You’ll also see your fat mass, lean mass and where you sit on the ACE categories.',
		howTo: [
			'Choose metric (kg and cm) or imperial (lb and inches), then your sex.',
			'Enter your weight and height.',
			'Measure your neck just below the larynx and your waist at the navel. Women also measure the widest part of the hips.',
			'Read your body fat %, fat mass, lean mass and ACE category.'
		],
		about: [
			{
				heading: 'What is body fat percentage?',
				paragraphs: [
					'Body fat percentage is the share of your total weight that is fat. The rest is lean mass: muscle, bone, organs and water. Your body needs some fat for energy, hormones and to protect organs, so zero is not healthy or possible.',
					'It tells you more about your body make-up than weight or BMI does. Two people can weigh the same and have very different body fat. For a quick comparison, try the [BMI calculator](/bmi-calculator) too.'
				]
			},
			{
				heading: 'How the U.S. Navy method works',
				paragraphs: [
					'The method uses height, neck and waist measurements for men. For women it also uses hip size. These numbers go into a formula that uses logarithms. It comes from research by Hodgdon and Beckett at the U.S. Naval Health Research Center in 1984.',
					'It needs only a tape measure, which makes it easy to repeat at home. However, it is an estimate. It can differ from clinical methods, such as a DXA scan, and the gap can be several percentage points for some people.',
					'The result also gives your fat mass and lean mass in kg or lb. You can read more on lean mass with the [lean body mass calculator](/lean-body-mass-calculator).'
				]
			},
			{
				heading: 'Body fat categories (ACE)',
				paragraphs: [
					'The American Council on Exercise (ACE) groups body fat into bands. These are fitness ranges and not medical limits. Women have higher numbers because they need more essential fat.'
				],
				table: {
					caption: 'ACE body fat categories used by this calculator',
					columns: ['Category', 'Men', 'Women'],
					rows: [
						['Essential fat', 'Below 6%', 'Below 14%'],
						['Athletes', '6% to 13.9%', '14% to 20.9%'],
						['Fitness', '14% to 17.9%', '21% to 24.9%'],
						['Average', '18% to 24.9%', '25% to 31.9%'],
						['Above average', '25% or more', '32% or more']
					]
				}
			},
			{
				heading: 'How to measure well',
				paragraphs: [
					'Small errors in the tape change the answer, so take care. Measure at the same time of day, ideally in the morning before eating. Keep the tape snug but not tight, and level all the way round.'
				],
				list: [
					'**Neck:** just below the larynx (Adam’s apple), sloping slightly down at the front.',
					'**Waist:** at the navel, relaxed, without pulling your stomach in.',
					'**Hips (women):** at the widest part.',
					'Take each measurement twice and use the average.'
				]
			},
			{
				heading: 'Using your result',
				paragraphs: [
					'Use the number to track change over time, not to judge yourself. Measure again every four to six weeks, in the same way. A trend is more reliable than a single reading.',
					'The result does not diagnose any condition. If you are worried about your weight or body fat, please talk to a doctor. The [ideal weight calculator](/ideal-weight-calculator) and the [army body fat calculator](/army-body-fat-calculator) give other views.'
				]
			}
		],
		formulas: [
			{
				title: 'Men',
				expression: 'Body fat % = 495 ÷ (1.0324 − 0.19077 × log₁₀(waist − neck) + 0.15456 × log₁₀(height)) − 450',
				variables: [
					{ symbol: 'waist, neck, height', meaning: 'measurements in centimetres' }
				]
			},
			{
				title: 'Women',
				expression: 'Body fat % = 495 ÷ (1.29579 − 0.35004 × log₁₀(waist + hip − neck) + 0.22100 × log₁₀(height)) − 450',
				variables: [
					{ symbol: 'hip', meaning: 'widest hip measurement in centimetres (women only)' }
				]
			},
			{
				title: 'Fat mass and lean mass',
				expression: 'Fat mass = weight × body fat %\nLean mass = weight − fat mass',
				variables: []
			}
		],
		example: {
			title: 'A man, 178 cm tall, 80 kg, with a 38 cm neck and an 85 cm waist',
			steps: [
				'Waist minus neck: 85 − 38 = 47 cm, and log₁₀(47) = 1.6721',
				'log₁₀(178) = 2.2504',
				'Denominator: 1.0324 − 0.19077 × 1.6721 + 0.15456 × 2.2504 = 1.0612',
				'Body fat: 495 ÷ 1.0612 − 450 = 16.4%',
				'Fat mass: 80 × 0.164 = 13.1 kg, so lean mass is 80 − 13.1 = 66.9 kg'
			],
			result: 'About 16.4% body fat (fat mass 13.1 kg, lean mass 66.9 kg), in the ACE fitness range for men.'
		},
		faq: [
			{
				q: 'How accurate is this body fat calculator?',
				a: 'It is an estimate. Tape methods can differ from clinical tests such as DXA by several percentage points. Careful, repeated measuring helps, and the trend over time is more useful than one reading.'
			},
			{
				q: 'Where exactly should I measure?',
				a: 'Neck: just below the larynx, sloping slightly down at the front. Waist: at the navel, relaxed. Hips (women): at the widest point. Keep the tape level and snug.'
			},
			{
				q: 'What is a healthy body fat percentage?',
				a: 'It depends on age, sex and fitness. The ACE bands treat 14% to 24.9% for men and 21% to 31.9% for women as fitness to average. These are fitness guides, not medical targets.'
			},
			{
				q: 'Why do women have a higher body fat percentage?',
				a: 'Women need more essential fat for hormone and reproductive health. For this reason, the ACE bands for women are higher than those for men.'
			},
			{
				q: 'Can I use this during pregnancy?',
				a: 'No. Your waist and hips change in pregnancy, so the formula does not apply. Use the [pregnancy weight gain calculator](/pregnancy-weight-gain-calculator) for guidance and ask your midwife or doctor.'
			}
		],
		sources: [
			{ title: 'Hodgdon JA & Beckett MB (1984), Naval Health Research Center', url: 'https://www.nhrc.navy.mil/' },
			{ title: 'American Council on Exercise — Guidelines for percentage of body fat', url: 'https://www.acefitness.org/resources/everyone/blog/112/what-are-the-guidelines-for-percentage-of-body-fat-loss/' },
			{ title: 'CDC — About adult BMI', url: 'https://www.cdc.gov/bmi/adult-calculator/index.html' }
		],
		disclaimer:
			'Tape measurements give an estimate only and are less precise than clinical tests. Talk to a doctor or health professional about your body composition.'
	}
});
