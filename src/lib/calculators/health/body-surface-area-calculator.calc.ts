import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './body-surface-area-calculator.meta';

const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';

/** Mosteller (1987): BSA = √(height cm × weight kg ÷ 3600), in m². */
export const mosteller = (cm: number, kg: number): number => Math.sqrt((cm * kg) / 3600);

/** Du Bois and Du Bois (1916): BSA = 0.007184 × weight^0.425 × height^0.725, in m². */
export const duBois = (cm: number, kg: number): number => 0.007184 * Math.pow(kg, 0.425) * Math.pow(cm, 0.725);

/** Haycock et al. (1978): BSA = 0.024265 × weight^0.5378 × height^0.3964, in m². */
export const haycock = (cm: number, kg: number): number => 0.024265 * Math.pow(kg, 0.5378) * Math.pow(cm, 0.3964);

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
		{ id: 'cm', label: 'Height', type: 'number', default: 175, min: 50, max: 250, step: 0.1, suffix: 'cm', visibleWhen: metric },
		{ id: 'kg', label: 'Weight', type: 'number', default: 70, min: 1, max: 500, step: 0.1, suffix: 'kg', visibleWhen: metric },
		{ id: 'ft', label: 'Height (feet)', type: 'number', default: 5, min: 1, max: 8, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: imperial },
		{ id: 'in', label: 'Height (inches)', type: 'number', default: 9, min: 0, max: 11.9, step: 0.1, suffix: 'in', width: 'half', visibleWhen: imperial },
		{ id: 'lb', label: 'Weight', type: 'number', default: 154, min: 2, max: 1100, step: 0.1, suffix: 'lb', visibleWhen: imperial }
	],
	calculate(v): CalculationResult {
		const isImperial = v.units === 'imperial';
		const cm = isImperial ? (Number(v.ft) * 12 + Number(v.in)) * 2.54 : Number(v.cm);
		const kg = isImperial ? Number(v.lb) * 0.45359237 : Number(v.kg);
		if (!(cm > 0) || !(kg > 0)) {
			return { primaryResult: DASH, primaryLabel: 'Body surface area', summary: 'Enter your height and weight.' };
		}

		const m = mosteller(cm, kg);
		const d = duBois(cm, kg);
		const h = haycock(cm, kg);
		const values = [m, d, h];
		const lo = Math.min(...values);
		const hi = Math.max(...values);

		return {
			primaryResult: `${num(m, 2, 2)} m²`,
			primaryLabel: 'Body surface area (Mosteller)',
			summary: 'The Mosteller formula is the simplest of the three and is widely used in clinical practice.',
			secondaryMetrics: [
				{ label: 'Du Bois', value: `${num(d, 2, 2)} m²` },
				{ label: 'Haycock', value: `${num(h, 2, 2)} m²` },
				{ label: 'Range across the three', value: `${num(lo, 2, 2)} to ${num(hi, 2, 2)} m²` }
			]
		};
	},
	content: {
		intro:
			'Use this body surface area calculator to estimate your BSA in square metres from your height and weight. It shows the Mosteller, Du Bois and Haycock formulas side by side.',
		howTo: [
			'Choose metric (kg and cm) or imperial (lb, feet and inches) units.',
			'Enter your height and weight.',
			'Read the Mosteller result, then compare it with Du Bois and Haycock.'
		],
		about: [
			{
				heading: 'What is body surface area?',
				paragraphs: [
					'Body surface area (BSA) is an estimate of the total area of your skin, in square metres (m²). It is worked out from your height and weight, because measuring the real surface of a body is not practical.',
					'BSA is not a measure of health or fitness. It is a number that clinicians use in certain medical calculations, so most people only meet it when a doctor or pharmacist asks for it.'
				]
			},
			{
				heading: 'What is BSA used for?',
				paragraphs: [
					'The most common use is dosing some medicines, especially chemotherapy. Early research found that effects were more consistent when doses were based on BSA than on body weight alone. BSA is also used to describe how much of the skin is affected by burns, and to index heart output (the cardiac index).',
					'Kidney tests use it too. The [GFR calculator](/gfr-calculator) reports kidney function per 1.73 m² of body surface, which is a standard adult size. Your care team decides which numbers apply to you. Please do not change a dose yourself using any online tool.'
				]
			},
			{
				heading: 'How the three formulas compare',
				paragraphs: [
					'Du Bois and Du Bois published the first widely used formula in 1916. Mosteller proposed a much simpler one in 1987, with a single square root. Haycock and colleagues published their formula in 1978, and tested it in infants, children and adults.',
					'For most adults, the three results are within a few hundredths of a square metre of each other. Still, different BSA equations can give larger differences for people who are very small, very large or very tall. This is one reason clinicians choose one formula and use it consistently.'
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'BSA rises with both height and weight, but not in a straight line. For example, a person who weighs 70 kg has a Mosteller BSA of about 1.76 m² at 160 cm tall, and about 1.92 m² at 190 cm tall.',
					'There is no “good” or “bad” BSA. It is a size measure, so a larger body has a larger value. The number only matters for the calculation it is used in.'
				]
			},
			{
				heading: 'Things to keep in mind',
				paragraphs: [
					'BSA depends only on height and weight. It does not consider muscle, body fat or body shape. Two people with the same numbers can have different real surface areas.',
					'BSA is not the same as body mass index. If you want a weight-for-height measure, try the [BMI calculator](/bmi-calculator). For body make-up, see the [body fat calculator](/body-fat-calculator) or the [lean body mass calculator](/lean-body-mass-calculator). If you have a question about a medicine dose, ask your doctor or pharmacist.'
				]
			}
		],
		formulas: [
			{
				title: 'Mosteller (primary)',
				expression: 'BSA = √(height (cm) × weight (kg) ÷ 3600)',
				variables: [{ symbol: '√', meaning: 'Square root' }]
			},
			{
				title: 'Du Bois',
				expression: 'BSA = 0.007184 × weight^0.425 × height^0.725',
				variables: [{ symbol: '^', meaning: 'Raised to the power shown' }]
			},
			{
				title: 'Haycock',
				expression: 'BSA = 0.024265 × weight^0.5378 × height^0.3964',
				variables: [{ symbol: 'm²', meaning: 'Square metres, the unit for all three formulas' }]
			}
		],
		example: {
			title: 'An adult who is 175 cm tall and weighs 70 kg',
			steps: [
				'Mosteller: √(175 × 70 ÷ 3600) = √3.403 = 1.84 m²',
				'Du Bois: 0.007184 × 70^0.425 × 175^0.725 = 1.85 m²',
				'Haycock: 0.024265 × 70^0.5378 × 175^0.3964 = 1.85 m²'
			],
			result: 'Body surface area is 1.84 m² by Mosteller, with the other two formulas giving 1.85 m².'
		},
		faq: [
			{
				q: 'How do I calculate body surface area?',
				a: 'Use the Mosteller formula: multiply your height in cm by your weight in kg, divide by 3,600, and take the square root. A person 175 cm tall who weighs 70 kg has a BSA of about 1.84 m².'
			},
			{
				q: 'Which formula should I use?',
				a: 'Mosteller is the main result here because it is simple and widely used. The three formulas usually agree within a few hundredths of a square metre. Your clinical team decides which one to use for your care.'
			},
			{
				q: 'Where does the Mosteller formula come from?',
				a: 'Mosteller proposed it in 1987 as a simpler alternative to the Du Bois formula, which dates from 1916. It gives results close to Du Bois for typical adult sizes.'
			},
			{
				q: 'Is BSA the same as body mass index?',
				a: 'No. BMI compares weight with height squared, while BSA estimates the outer surface area of the body. They measure different things and are used for different purposes.'
			},
			{
				q: 'Can I use this to work out a medicine dose?',
				a: 'No. This tool is for education. Doses are set by your doctor or pharmacist, who consider your health, other medicines and the exact formula they use.'
			}
		],
		sources: [
			{ title: 'Mosteller RD (1987), New England Journal of Medicine: Simplified calculation of body-surface area', url: 'https://pubmed.ncbi.nlm.nih.gov/3657876/' },
			{ title: 'Haycock GB et al. (1978), Journal of Pediatrics: Geometric method for measuring body surface area', url: 'https://pubmed.ncbi.nlm.nih.gov/650346/' },
			{ title: 'StatPearls — Body surface area', url: 'https://www.statpearls.com/sp/al/13/18427/' }
		],
		disclaimer:
			'BSA is used in clinical settings, including drug dosing. These results are for education only. Your care team sets any dose or medical decision.'
	}
});
