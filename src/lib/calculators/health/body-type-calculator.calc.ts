import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './body-type-calculator.meta';

const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';

export type BodyShape =
	| 'Hourglass'
	| 'Bottom hourglass'
	| 'Top hourglass'
	| 'Spoon'
	| 'Triangle (pear)'
	| 'Inverted triangle'
	| 'Rectangle';

/**
 * Fit-guide rule set. All inputs are in inches. Thresholds are the common published
 * difference rules used by many clothing charts. They are a convention, not a medical standard.
 *
 *  - Hips at least 3.6 in larger than bust: bottom hourglass if hips are 10 in or more larger
 *    than the waist; spoon if the bust is 5 in or more larger than the waist; otherwise triangle (pear).
 *  - Bust at least 3.6 in larger than hips: top hourglass if the bust is 9 in or more larger than
 *    the waist; otherwise inverted triangle.
 *  - Bust and hips within 3.6 in of each other: hourglass if the waist is 9 in or more smaller
 *    than the bust or 10 in or more smaller than the hips; otherwise rectangle.
 */
export function bodyShape(bust: number, waist: number, hip: number): BodyShape {
	const hipMinusBust = hip - bust;
	const bustMinusWaist = bust - waist;
	const hipMinusWaist = hip - waist;
	if (hipMinusBust >= 3.6) {
		if (hipMinusWaist >= 10) return 'Bottom hourglass';
		if (bustMinusWaist >= 5) return 'Spoon';
		return 'Triangle (pear)';
	}
	if (hipMinusBust <= -3.6) {
		return bustMinusWaist >= 9 ? 'Top hourglass' : 'Inverted triangle';
	}
	return bustMinusWaist >= 9 || hipMinusWaist >= 10 ? 'Hourglass' : 'Rectangle';
}

const SUMMARY: Record<BodyShape, string> = {
	Hourglass: 'Bust and hips are close in size, with a clearly narrower waist.',
	'Bottom hourglass': 'Hips are fuller than the bust, and the waist is clearly narrower than the hips.',
	'Top hourglass': 'The bust is fuller than the hips, and the waist is clearly narrower than the bust.',
	Spoon: 'Hips are fuller than the bust, with a waist that is narrower than the bust but not by much against the hips.',
	'Triangle (pear)': 'Hips are fuller than the bust, and the bust and waist are close in size.',
	'Inverted triangle': 'The bust is fuller than the hips, and the waist is not clearly narrower than the bust.',
	Rectangle: 'Bust, waist and hips are close in size, with little waist definition.'
};

const IN_PER_CM = 1 / 2.54;

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
				{ label: 'Metric (cm)', value: 'metric' },
				{ label: 'Imperial (in)', value: 'imperial' }
			]
		},
		{ id: 'bustCm', label: 'Bust', type: 'number', default: 90, min: 50, max: 180, step: 0.1, suffix: 'cm', help: 'Around the fullest part of the bust.', visibleWhen: metric },
		{ id: 'waistCm', label: 'Waist', type: 'number', default: 70, min: 40, max: 160, step: 0.1, suffix: 'cm', help: 'Around the narrowest part of the torso.', visibleWhen: metric },
		{ id: 'highHipCm', label: 'High hip', type: 'number', default: 90, min: 50, max: 180, step: 0.1, suffix: 'cm', help: 'Around the top of the hip bones.', visibleWhen: metric },
		{ id: 'hipCm', label: 'Hip', type: 'number', default: 97, min: 60, max: 200, step: 0.1, suffix: 'cm', help: 'Around the fullest part of the hips.', visibleWhen: metric },
		{ id: 'bustIn', label: 'Bust', type: 'number', default: 35, min: 20, max: 70, step: 0.1, suffix: 'in', help: 'Around the fullest part of the bust.', visibleWhen: imperial },
		{ id: 'waistIn', label: 'Waist', type: 'number', default: 27.5, min: 15, max: 60, step: 0.1, suffix: 'in', help: 'Around the narrowest part of the torso.', visibleWhen: imperial },
		{ id: 'highHipIn', label: 'High hip', type: 'number', default: 35, min: 20, max: 70, step: 0.1, suffix: 'in', help: 'Around the top of the hip bones.', visibleWhen: imperial },
		{ id: 'hipIn', label: 'Hip', type: 'number', default: 38, min: 25, max: 80, step: 0.1, suffix: 'in', help: 'Around the fullest part of the hips.', visibleWhen: imperial }
	],
	calculate(v): CalculationResult {
		const isImperial = v.units === 'imperial';
		const toIn = (cm: string, inch: string) => (isImperial ? Number(v[inch]) : Number(v[cm]) * IN_PER_CM);
		const bust = toIn('bustCm', 'bustIn');
		const waist = toIn('waistCm', 'waistIn');
		const hip = toIn('hipCm', 'hipIn');
		const highHip = toIn('highHipCm', 'highHipIn');
		if (!(bust > 0) || !(waist > 0) || !(hip > 0) || !(highHip > 0)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Body shape',
				summary: 'Enter all four measurements. Each one is needed.'
			};
		}
		if (bust <= waist) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Body shape',
				summary: 'Check the measurements. The bust is usually larger than the waist.'
			};
		}

		const shape = bodyShape(bust, waist, hip);
		const unit = isImperial ? 'in' : 'cm';
		const show = (inches: number) => {
			const x = isImperial ? inches : inches / IN_PER_CM;
			return `${x < 0 ? '−' : '+'}${num(Math.abs(x), 1, 1)} ${unit}`;
		};

		return {
			primaryResult: shape,
			primaryLabel: 'Body shape',
			summary: `${SUMMARY[shape]} A fit guide only.`,
			secondaryMetrics: [
				{ label: 'Hips minus bust', value: show(hip - bust) },
				{ label: 'Bust minus waist', value: show(bust - waist) },
				{ label: 'Hips minus waist', value: show(hip - waist) },
				{ label: 'High hip minus waist', value: show(highHip - waist) }
			]
		};
	},
	content: {
		intro:
			'Use this body type calculator to compare your bust, waist and hip measurements and see which general silhouette they match, such as hourglass, pear or rectangle. It is a guide for choosing clothes, not a measure of health.',
		howTo: [
			'Choose centimetres or inches.',
			'Measure your bust, waist, high hip and hip, and enter each one. Keep the tape level and snug, not tight.',
			'Read your shape and the differences between your measurements.'
		],
		about: [
			{
				heading: 'What is a body type or body shape?',
				paragraphs: [
					'Body shape, or silhouette, describes how your bust, waist and hips compare. Clothing guides group these proportions into names such as hourglass, pear (triangle), inverted triangle and rectangle.',
					'These names come from fashion and tailoring, not from medicine. There is no official standard, so different brands and charts use slightly different rules. No shape is healthier or better than another.'
				]
			},
			{
				heading: 'How this calculator decides',
				paragraphs: [
					'It compares three differences: hips minus bust, bust minus waist, and hips minus waist. All the rules work in inches, so centimetres are converted first. The thresholds are 3.6 in (about 9.1 cm) for bust and hips to count as clearly different, and 9 or 10 in (about 22.9 or 25.4 cm) for a defined waist.',
					'If your hips are clearly larger than your bust, the result is a bottom hourglass, spoon or pear. If your bust is clearly larger, the result is a top hourglass or an inverted triangle. If they are close, it is an hourglass when the waist is well defined, and a rectangle when it is not.'
				],
				table: {
					caption: 'The seven shapes in this calculator',
					columns: ['Shape', 'In short'],
					rows: [
						['Hourglass', 'Bust and hips close, waist clearly narrower'],
						['Bottom hourglass', 'Hips fuller than bust, waist clearly narrower than hips'],
						['Top hourglass', 'Bust fuller than hips, waist clearly narrower than bust'],
						['Spoon', 'Hips fuller than bust, waist narrower than bust'],
						['Triangle (pear)', 'Hips fuller than bust, bust and waist close'],
						['Inverted triangle', 'Bust fuller than hips, waist not clearly narrower'],
						['Rectangle', 'Bust, waist and hips close in size']
					]
				}
			},
			{
				heading: 'How to take your measurements',
				paragraphs: [
					'Stand up straight and relax. Use a soft tape measure over thin clothing or underwear. A tape that is too tight or too loose gives a different shape.'
				],
				list: [
					'**Bust:** around the fullest part of the chest, with the tape level across the back.',
					'**Waist:** around the narrowest part of your middle, usually just above the navel.',
					'**High hip:** around the top of the hip bones.',
					'**Hip:** around the fullest part of the hips and bottom.',
					'Measure twice, and take the readings at the same time of day.'
				]
			},
			{
				heading: 'Using your result for clothes',
				paragraphs: [
					'Your shape can help you pick cuts that feel comfortable, but it is only a starting point. Always check the size chart of the brand you are buying from, because cut, fabric and stretch change the fit.',
					'Many people sit between two shapes, and bodies change over time. Treat the result as a guide, not a label.'
				]
			},
			{
				heading: 'If you are thinking about health',
				paragraphs: [
					'Body shape is not a health test. Health agencies use other measures, such as waist size and waist-to-hip ratio, and the World Health Organization has published guidance on how to measure them. You can also try the [BMI calculator](/bmi-calculator), the [body fat calculator](/body-fat-calculator) or the [ideal weight calculator](/ideal-weight-calculator).',
					'None of these tools is a diagnosis. If you have questions about your weight or body, please talk to a doctor. If you are pregnant, your measurements will change, so this guide will not apply.'
				]
			}
		],
		formulas: [
			{
				title: 'Shape rules (in inches)',
				expression:
					'Hips − bust ≥ 3.6: bottom hourglass if hips − waist ≥ 10, spoon if bust − waist ≥ 5, otherwise triangle (pear)',
				variables: [{ symbol: '3.6', meaning: 'The difference that makes one measurement clearly larger than the other' }]
			},
			{
				title: 'Other shapes',
				expression:
					'Bust − hips ≥ 3.6: top hourglass if bust − waist ≥ 9, otherwise inverted triangle. Otherwise: hourglass if bust − waist ≥ 9 or hips − waist ≥ 10, else rectangle',
				variables: [{ symbol: '9 and 10', meaning: 'The waist difference that shows a defined waist' }]
			},
			{
				title: 'Conversion',
				expression: '1 cm = 0.3937 in, and every rule above is applied in inches',
				variables: [{ symbol: 'in', meaning: 'Inches' }]
			}
		],
		example: {
			title: 'Bust 90 cm, waist 70 cm, hip 97 cm',
			steps: [
				'Convert to inches: bust 35.4 in, waist 27.6 in, hip 38.2 in',
				'Hips minus bust: 7 cm, which is 2.8 in and under 3.6 in',
				'Bust minus waist: 20 cm, which is 7.9 in. Hips minus waist: 27 cm, which is 10.6 in and at least 10 in',
				'Result: the bust and hips are close and the waist is defined, so the shape is hourglass'
			],
			result: 'Body shape: hourglass. The fit guide suggests clothes that follow the waist.'
		},
		faq: [
			{
				q: 'What is my body type?',
				a: 'Enter your bust, waist, high hip and hip measurements above. The calculator compares them and names the closest shape, such as hourglass, pear or rectangle. It is a fashion guide only.'
			},
			{
				q: 'Is my body type a health measure?',
				a: 'No. It describes the shape of your measurements for clothing fit. It does not measure health, body fat or fitness, and no shape is healthier than another.'
			},
			{
				q: 'Why do the charts disagree?',
				a: 'There is no official standard for body shape. Clothing brands use different rules and cut patterns, so the same measurements can match different shapes on different charts.'
			},
			{
				q: 'Why is high hip measured?',
				a: 'It shows how the hips and waist sit together. It appears in the results for reference, but the shape rules use the full hip measurement.'
			},
			{
				q: 'How do I get a better fit?',
				a: 'Use the size chart of the brand you are buying from, and compare your bust, waist and hip with its figures. Try items on when you can, because cut and fabric change the fit.'
			}
		],
		sources: [
			{ title: 'World Health Organization — Waist circumference and waist-hip ratio: report of an expert consultation', url: 'https://who.int/publications/i/item/9789241501491' }
		],
		disclaimer:
			'This is a fashion fit guide, not a health measure. No body shape is better or worse than another, and brands cut clothes differently, so check the size chart on the item you are buying.'
	}
});
