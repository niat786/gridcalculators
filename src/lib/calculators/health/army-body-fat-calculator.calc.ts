import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './army-body-fat-calculator.meta';

/** Army Directive 2026-13: a waist-to-height ratio below 0.55 meets the standard. */
export const WHTR_LIMIT = 0.55;

const inches = (v: InputValues) => v.units === 'in';
const cm = (v: InputValues) => v.units === 'cm';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'in',
			options: [
				{ label: 'Inches', value: 'in' },
				{ label: 'Centimeters', value: 'cm' }
			]
		},
		{ id: 'hIn', label: 'Height', type: 'number', default: 70, min: 48, max: 90, step: 0.5, suffix: 'in', width: 'half', visibleWhen: inches },
		{ id: 'wIn', label: 'Waist at the navel', type: 'number', default: 36, min: 15, max: 80, step: 0.5, suffix: 'in', width: 'half', visibleWhen: inches },
		{ id: 'hCm', label: 'Height', type: 'number', default: 178, min: 120, max: 230, step: 0.5, suffix: 'cm', width: 'half', visibleWhen: cm },
		{ id: 'wCm', label: 'Waist at the navel', type: 'number', default: 91, min: 40, max: 200, step: 0.5, suffix: 'cm', width: 'half', visibleWhen: cm }
	],
	calculate(v): CalculationResult {
		const metric = v.units === 'cm';
		const h = Number(metric ? v.hCm : v.hIn);
		const w = Number(metric ? v.wCm : v.wIn);
		const unit = metric ? 'cm' : 'in';
		if (!(h > 0) || !(w > 0) || !Number.isFinite(h + w)) {
			return { primaryResult: DASH, primaryLabel: 'Waist-to-height ratio', summary: 'Enter your height and waist.' };
		}
		const ratio = w / h;
		const pass = ratio < WHTR_LIMIT;
		const maxWaist = WHTR_LIMIT * h;
		return {
			primaryResult: num(ratio, 3, 3),
			primaryLabel: 'Waist-to-height ratio',
			summary: pass
				? `Meets the Army standard: your ratio is below ${WHTR_LIMIT}.`
				: `Above the Army standard of ${WHTR_LIMIT}. A confirmation measurement follows, then enrollment in the Army Body Composition Program.`,
			secondaryMetrics: [
				{ label: 'Result', value: pass ? 'Meets the standard' : 'Does not meet' },
				{ label: 'Army limit', value: `Below ${WHTR_LIMIT}` },
				{ label: 'Waist must be under', value: `${num(maxWaist, 1)} ${unit}` },
				{ label: pass ? 'Margin' : 'Waist to lose', value: `${num(Math.abs(maxWaist - w), 1)} ${unit}` }
			],
			gauge: {
				min: 0.35,
				max: 0.75,
				value: Math.min(0.75, Math.max(0.35, ratio)),
				bands: [
					{ to: WHTR_LIMIT, label: 'Meets' },
					{ to: 0.75, label: 'Above limit' }
				]
			}
		};
	},
	content: {
		intro:
			'Use this Army body fat calculator to check your measurements against the current US Army standard. Since Army Directive 2026-13 (announced July 2026), the Army uses the waist-to-height ratio instead of the tape test: a ratio below 0.55 meets the standard.',
		howTo: [
			'Choose inches or centimeters.',
			'Enter your height without shoes.',
			'Measure around your waist level with the navel, with the tape snug but not pressing into the skin, and enter it.',
			'Read your ratio and the largest waist that meets the standard for your height.'
		],
		about: [
			{
				heading: 'What changed in 2026?',
				paragraphs: [
					'In July 2026, the US Army announced that it was replacing the height and weight tables, the circumference-based tape test and the supplemental body fat assessments. The new tool is the waist-to-height ratio (WHtR). The change is described in Army Directive 2026-13.',
					'The Army says all soldiers are assessed twice a year. A ratio of less than 0.55 is the benchmark for meeting the standard. The same limit applies to every soldier. A September 2026 Army article adds that meeting the standard is mandatory regardless of Army Fitness Test scores.'
				]
			},
			{
				heading: 'How the ratio is worked out',
				paragraphs: [
					'The ratio is your waist circumference at the navel divided by your height, with both in the same units. A 70 inch soldier with a 36 inch waist has a ratio of 0.514, which is under 0.55.',
					'You can also work backwards. Multiply your height by 0.55 to get the largest waist that meets the standard. The calculator shows this as “Waist must be under”. At 70 inches, that is 38.5 inches.'
				],
				table: {
					caption: 'Largest waist that meets the standard (ratio under 0.55)',
					columns: ['Height', 'Waist must be under'],
					rows: [
						['64 in (163 cm)', '35.2 in (89.4 cm)'],
						['68 in (173 cm)', '37.4 in (95.0 cm)'],
						['72 in (183 cm)', '39.6 in (100.6 cm)'],
						['76 in (193 cm)', '41.8 in (106.2 cm)']
					]
				}
			},
			{
				heading: 'What happens if the ratio is 0.55 or higher',
				paragraphs: [
					'According to the Army, a soldier at 0.55 or above gets a confirmation measurement from another team on the same duty day. If it is still at or above the limit, the soldier is flagged and enrolled in the Army Body Composition Program (ABCP) until the standard is met. Commanders can also direct a check at any time.',
					'The Army also states that no separation actions for failing the ratio will happen during the initial 180-day assessment period. Rules like these can change. Please check current guidance with your unit and the official Army publications, such as AR 600-9.'
				]
			},
			{
				heading: 'About this self-check',
				paragraphs: [
					'This tool is only a self-check. Official results come from trained Army personnel who follow the directive. Small differences in where and how the tape is placed can change the ratio. So measure carefully, keep the tape level, and measure in the same way each time. Taking the reading at a similar time of day also helps.',
					'If your result is near or above 0.55, the Army suggests getting guidance from a Master Fitness Trainer or a registered dietitian. A waist ratio is not a medical diagnosis. For other views of body composition, try the [body fat calculator](/body-fat-calculator), the [BMI calculator](/bmi-calculator) or the [ideal weight calculator](/ideal-weight-calculator).'
				]
			},
			{
				heading: 'Staying healthy while you work on your waist',
				paragraphs: [
					'Slow and steady change is safest. The [calorie calculator](/calorie-calculator) can estimate daily needs, and the [TDEE calculator](/tdee-calculator) shows what you burn in a day. Please speak to a doctor before a large change in diet or exercise, especially if you have a health condition.'
				]
			}
		],
		formulas: [
			{
				title: 'Waist-to-height ratio (WHtR)',
				expression: 'WHtR = Waist at the navel ÷ Height',
				variables: [
					{ symbol: 'Waist', meaning: 'abdominal circumference at the navel, same units as height' },
					{ symbol: 'Standard', meaning: 'WHtR below 0.55 (0.55 or higher is flagged)' }
				]
			},
			{
				title: 'Largest waist that meets the standard',
				expression: 'Waist limit = 0.55 × Height',
				variables: [{ symbol: '0.55', meaning: 'the Army benchmark ratio' }]
			}
		],
		example: {
			title: 'A soldier 70 inches tall with a 36-inch waist',
			steps: ['WHtR: 36 ÷ 70 = 0.514', 'Largest waist that passes: 0.55 × 70 = 38.5 inches (must be under it)'],
			result: '0.514 meets the Army standard with 2.5 inches to spare.'
		},
		faq: [
			{
				q: 'What is the Army body fat standard now?',
				a: 'Since July 2026, the Army uses the waist-to-height ratio. A ratio below 0.55 meets the standard. The old tape test, height and weight tables and supplemental body fat assessments were replaced.'
			},
			{
				q: 'Is the standard different for men, women or older soldiers?',
				a: 'No. The 0.55 benchmark is the same for every soldier.'
			},
			{
				q: 'What happens if my ratio is 0.55 or higher?',
				a: 'A second team takes a confirmation measurement the same day. If it is still 0.55 or higher, you are flagged and enrolled in the Army Body Composition Program until you meet the standard.'
			},
			{
				q: 'Is a high fitness test score an exemption?',
				a: 'Not according to the Army. An Army article from September 2026 says meeting the standard is mandatory regardless of fitness test scores.'
			},
			{
				q: 'Is this calculator an official result?',
				a: 'No. It is a self-check. Official results come from trained Army personnel following the directive.'
			}
		],
		sources: [
			{ title: 'U.S. Army — Army modifies body composition program, adopts waist-to-height ratio (July 2026)', url: 'https://www.army.mil/article/293753/army_modifies_body_composition_program_adopts_waist_to_height_ratio' },
			{ title: 'U.S. Army — The full measure: the Army’s new WHtR standard (September 2026)', url: 'https://www.army.mil/article/295487/the_full_measure_the_armys_new_whtr_standard' }
		],
		disclaimer: 'A self-check only. Official results come from trained Army personnel following Army Directive 2026-13 and AR 600-9.'
	}
});
