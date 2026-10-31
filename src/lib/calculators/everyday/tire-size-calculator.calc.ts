import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './tire-size-calculator.meta';

const isText = (v: InputValues) => v.entry !== 'parts';
const isParts = (v: InputValues) => v.entry === 'parts';

/** A tire size such as 225/45R17, with an optional letter prefix (P, LT) and optional R. */
const SIZE = /^\s*(?:[A-Za-z]{1,2}\s*)?\d{3}\s*\/\s*\d{2,3}\s*R?\s*\d{2}\s*$/i;
const OPTIONAL_SIZE = /^\s*$|^\s*(?:[A-Za-z]{1,2}\s*)?\d{3}\s*\/\s*\d{2,3}\s*R?\s*\d{2}\s*$/i;

const MM_PER_IN = 25.4;
const MM_PER_MILE = 1609344;
const MM_PER_KM = 1000000;

export interface TireDims {
	width: number; // mm
	aspect: number; // %
	rim: number; // inches
}

/** Parse "225/45R17" into width (mm), aspect (%) and rim (in). Returns null when it does not match. */
export function parseTireSize(text: string): TireDims | null {
	const m = text.match(/(\d{3})\s*\/\s*(\d{2,3})\s*R?\s*(\d{2})/i);
	if (!m) return null;
	return { width: Number(m[1]), aspect: Number(m[2]), rim: Number(m[3]) };
}

/** Overall diameter in mm: rim diameter plus two sidewalls. */
export function overallDiameterMm(d: TireDims): number {
	const sidewall = (d.width * d.aspect) / 100;
	return d.rim * MM_PER_IN + 2 * sidewall;
}

const signed = (n: number, decimals: number) => (n > 0 ? '+' : '') + num(n, decimals, decimals);

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'entry',
			label: 'Enter the size as',
			type: 'select',
			display: 'segmented',
			default: 'text',
			options: [
				{ label: 'Tire size', value: 'text' },
				{ label: 'Width, aspect, rim', value: 'parts' }
			]
		},
		{
			id: 'sizeText',
			label: 'Tire size',
			type: 'text',
			default: '225/45R17',
			placeholder: '225/45R17',
			maxLength: 20,
			pattern: SIZE,
			patternMessage: 'Use the form 225/45R17.',
			visibleWhen: isText
		},
		{ id: 'width', label: 'Section width', type: 'number', default: 225, min: 100, max: 400, step: 1, suffix: 'mm', decimal: false, visibleWhen: isParts },
		{ id: 'aspect', label: 'Aspect ratio', type: 'number', default: 45, min: 20, max: 90, step: 1, suffix: '%', decimal: false, visibleWhen: isParts },
		{ id: 'rim', label: 'Rim diameter', type: 'number', default: 17, min: 10, max: 30, step: 1, suffix: 'in', decimal: false, visibleWhen: isParts },
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'imp',
			options: [
				{ label: 'Inches and mph', value: 'imp' },
				{ label: 'Millimetres and km/h', value: 'met' }
			]
		},
		{
			id: 'compare',
			label: 'Second size to compare (optional)',
			help: 'The speedometer is assumed to be calibrated for the first size.',
			type: 'text',
			default: '',
			placeholder: '235/40R18',
			maxLength: 20,
			pattern: OPTIONAL_SIZE,
			patternMessage: 'Use the form 235/40R18, or leave this blank.'
		}
	],
	calculate(v): CalculationResult {
		const imperial = v.units !== 'met';
		const dims: TireDims | null =
			v.entry === 'parts'
				? { width: Number(v.width), aspect: Number(v.aspect), rim: Number(v.rim) }
				: parseTireSize(String(v.sizeText));
		if (!dims || !(dims.width > 0) || !(dims.aspect > 0) || !(dims.rim > 0) || !Number.isFinite(dims.width + dims.aspect + dims.rim)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Overall diameter',
				summary: 'Enter a tire size such as 225/45R17, or a width, aspect ratio and rim diameter.'
			};
		}

		const sidewall = (dims.width * dims.aspect) / 100;
		const diameter = overallDiameterMm(dims);
		const circumference = Math.PI * diameter;
		const revs = (imperial ? MM_PER_MILE : MM_PER_KM) / circumference;
		const perWord = imperial ? 'mile' : 'km';

		const compareText = String(v.compare).trim();
		let diffValue = 'Not compared';
		let speedValue = 'Add a second size to compare';
		const speedLabel = imperial ? 'Actual speed at 60 mph on the speedometer' : 'Actual speed at 100 km/h on the speedometer';
		if (compareText !== '') {
			const other = parseTireSize(compareText);
			if (!other) {
				diffValue = 'Check the second size';
				speedValue = 'Check the second size';
			} else {
				const otherDiameter = overallDiameterMm(other);
				const pct = ((otherDiameter - diameter) / diameter) * 100;
				const actual = (imperial ? 60 : 100) * (otherDiameter / diameter);
				diffValue = `${signed(pct, 2)}%`;
				speedValue = `${num(actual, 1, 1)} ${imperial ? 'mph' : 'km/h'}`;
			}
		}

		return {
			primaryResult: imperial ? `${num(diameter / MM_PER_IN, 2, 2)} in` : `${num(diameter, 1, 1)} mm`,
			primaryLabel: 'Overall diameter',
			summary: `About ${num(revs, 0)} wheel turns per ${perWord} at this size.`,
			secondaryMetrics: [
				{ label: 'Sidewall height', value: imperial ? `${num(sidewall / MM_PER_IN, 2, 2)} in` : `${num(sidewall, 1, 1)} mm` },
				{ label: 'Rim diameter', value: imperial ? `${num(dims.rim, 0, 0)} in` : `${num(dims.rim * MM_PER_IN, 1, 1)} mm` },
				{
					label: 'Circumference',
					value: imperial ? `${num(circumference / MM_PER_IN, 1, 1)} in` : `${num(circumference, 1, 1)} mm`
				},
				{ label: `Revolutions per ${perWord}`, value: num(revs, 0, 0) },
				{ label: 'Diameter change (second size)', value: diffValue },
				{ label: speedLabel, value: speedValue }
			]
		};
	},
	content: {
		intro:
			'Read a tire size such as 225/45R17 and find its overall diameter, sidewall height and revolutions per mile or kilometre. Compare a second size to see how much the speedometer would read wrong.',
		howTo: [
			'Enter the tire size as printed on the sidewall, such as 225/45R17, or enter the width, aspect ratio and rim separately.',
			'Choose inches and mph, or millimetres and km/h.',
			'Optionally enter a second tire size to compare with the first.',
			'Read the overall diameter, the revolutions per distance and the speedometer error for the second size.'
		],
		about: [
			{
				heading: 'How to read a tire size',
				paragraphs: [
					'A common tire size is written like 225/45R17. The first number is the section width in millimetres, from sidewall to sidewall. The second number is the aspect ratio, which is the sidewall height as a percentage of the width. The R means radial construction, and the last number is the rim diameter in inches.',
					'So a 225/45R17 tire is 225 mm wide, its sidewall is 45% of that width, and it fits a 17 inch rim. Some sizes have a letter in front, such as P for passenger or LT for light truck. The letter does not change the maths.'
				]
			},
			{
				heading: 'Overall diameter and sidewall height',
				paragraphs: [
					'The sidewall height is the width times the aspect ratio. For 225/45R17, that is 225 × 0.45 = 101.25 mm, or about 3.99 inches. The overall diameter is the rim diameter plus two sidewalls, which gives about 634 mm or 24.97 inches.',
					'Overall diameter matters because it sets how far the tire travels in one turn. A taller tire covers more ground per turn, so the car travels a longer distance for each revolution.'
				]
			},
			{
				heading: 'Why a size change affects the speedometer',
				paragraphs: [
					'A speedometer counts wheel turns and converts them into speed using the original tire size. If you change to a larger tire, the car travels further per turn, so the real speed is higher than the speedometer shows. A smaller tire has the opposite effect.',
					'The calculator shows the error. For example, a 235/40R18 tire is about 1.7% larger in diameter than a 225/45R17, so at a 60 mph reading the true speed is about 61 mph. The [speed calculator](/speed-calculator) and [distance calculator](/distance-calculator) use the same kind of arithmetic. Small differences like this are normal, but larger changes can affect speed readings, the odometer and some electronic systems.'
				]
			},
			{
				heading: 'Tire rules and local practice',
				paragraphs: [
					'Tire sizes are written in the same format in most countries, because the size system follows an international standard. The European Tyre and Rim Technical Organisation, ETRTO, publishes that standard.',
					'Some countries have rules about changing the tire size on a vehicle, and some require the speedometer to read accurately. Check the rules where you drive, and the size listed in your vehicle handbook. The [unit converter](/unit-converter) helps if you need to switch between inches and millimetres.'
				]
			},
			{
				heading: 'Tips for choosing tire sizes',
				paragraphs: [
					'Keep the overall diameter close to the original size if you want the speedometer and the gearing to stay accurate. A change in size can also affect fuel use, which the [gas mileage calculator](/gas-mileage-calculator) can help you track. Make sure the load index and speed rating meet or exceed the original.',
					'Lower-profile tires, with a smaller aspect ratio, have shorter sidewalls. They can look sharp but are more easily damaged by potholes.'
				],
				list: [
					'Read the size on the sidewall of your current tire, not the rim.',
					'Do not mix different sizes on the same axle without expert advice.',
					'Check the tire pressure after a size change, because the load changes.',
					'Compare the new size against the old one before you buy.'
				]
			},
			{
				heading: 'Safety with tires',
				paragraphs: [
					'Tires carry the whole weight of the vehicle, and their condition affects braking and grip. Check the tread depth and the pressure at least monthly. Replace a tire with damage to the sidewall or cords.',
					'If you are unsure about a size, ask a qualified tire fitter. Fitting the wrong size can affect handling, clearance and stability.'
				]
			}
		],
		formulas: [
			{
				title: 'Sidewall height',
				expression: 'Sidewall = width × (aspect ratio ÷ 100)',
				variables: [
					{ symbol: 'width', meaning: 'the section width, in millimetres' },
					{ symbol: 'aspect ratio', meaning: 'the second number in the size, as a percentage' }
				]
			},
			{
				title: 'Overall diameter',
				expression: 'Diameter = rim diameter (mm) + 2 × sidewall',
				variables: [{ symbol: 'rim diameter', meaning: 'the last number in the size, in inches, converted to millimetres (× 25.4)' }]
			},
			{
				title: 'Revolutions per mile or kilometre',
				expression: 'Revolutions = distance ÷ (π × diameter)',
				variables: [{ symbol: 'distance', meaning: 'one mile (1,609,344 mm) or one kilometre (1,000,000 mm)' }]
			}
		],
		example: {
			title: 'A 225/45R17 tire',
			steps: [
				'Sidewall: 225 × 0.45 = 101.25 mm, or 3.99 inches',
				'Rim: 17 × 25.4 = 431.8 mm',
				'Overall diameter: 431.8 + 2 × 101.25 = 634.3 mm, or 24.97 inches',
				'Revolutions per mile: 1,609,344 ÷ (π × 634.3) = 808 turns'
			],
			result: 'The tire is 24.97 inches (634.3 mm) across and turns about 808 times per mile.'
		},
		faq: [
			{
				q: 'What do the numbers in a tire size mean?',
				a: 'In 225/45R17, 225 is the width in millimetres, 45 is the sidewall height as a percentage of the width, R is the construction type, and 17 is the rim diameter in inches.'
			},
			{
				q: 'How do I find the overall diameter of a tire?',
				a: 'Work out the sidewall height from the width and aspect ratio, double it, and add the rim diameter in millimetres. The calculator does this and gives the answer in inches or millimetres.'
			},
			{
				q: 'Will a bigger tire make my speedometer read slow?',
				a: 'Yes, usually. A larger tire covers more ground per turn, so the car goes faster than the speedometer shows. Check the calculator’s comparison for the exact size difference.'
			},
			{
				q: 'Is a tire size the same worldwide?',
				a: 'The format is the same in most countries, but local rules, markings and speed ratings vary. Check the sidewall and your vehicle handbook before you buy.'
			}
		],
		sources: [{ title: 'ETRTO, European Tyre and Rim Technical Organisation', url: 'https://www.etrto.org/' }]
	}
});
