import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './horsepower-calculator.meta';

const isLbFt = (v: InputValues) => v.torqueUnit !== 'nm';
const isNm = (v: InputValues) => v.torqueUnit === 'nm';

/** 1 lb·ft expressed in N·m. */
const NM_PER_LBFT = 1.3558179483;
/** 1 metric horsepower (PS) is 735.49875 W. */
const WATTS_PER_PS = 735.49875;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'torqueUnit',
			label: 'Torque unit',
			type: 'select',
			display: 'segmented',
			default: 'lbft',
			options: [
				{ label: 'Pound-feet (lb·ft)', value: 'lbft' },
				{ label: 'Newton-metres (N·m)', value: 'nm' }
			]
		},
		{ id: 'torqueLbft', label: 'Torque', type: 'number', default: 300, min: 0, max: 5000, step: 1, suffix: 'lb·ft', visibleWhen: isLbFt },
		{ id: 'torqueNm', label: 'Torque', type: 'number', default: 407, min: 0, max: 6800, step: 1, suffix: 'N·m', visibleWhen: isNm },
		{ id: 'rpm', label: 'Engine speed', type: 'number', default: 5000, min: 1, max: 30000, step: 10, suffix: 'rpm', decimal: false },
		{
			id: 'outUnit',
			label: 'Show power in',
			type: 'select',
			display: 'segmented',
			default: 'hp',
			options: [
				{ label: 'hp', value: 'hp' },
				{ label: 'PS', value: 'ps' },
				{ label: 'kW', value: 'kw' }
			]
		}
	],
	calculate(v): CalculationResult {
		const fromNm = isNm(v);
		const torque = Number(fromNm ? v.torqueNm : v.torqueLbft);
		const rpm = Number(v.rpm);
		if (!(torque > 0) || !(rpm > 0)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Power',
				summary: 'Enter a torque and an engine speed, both above zero.'
			};
		}
		const torqueLbFt = fromNm ? torque / NM_PER_LBFT : torque;
		const torqueNm = fromNm ? torque : torque * NM_PER_LBFT;

		const hp = (torqueLbFt * rpm) / 5252;
		const kw = (torqueNm * rpm) / 9549;
		const ps = (kw * 1000) / WATTS_PER_PS;

		const shown =
			v.outUnit === 'ps' ? `${num(ps, 1, 1)} PS` : v.outUnit === 'kw' ? `${num(kw, 1, 1)} kW` : `${num(hp, 1, 1)} hp`;

		return {
			primaryResult: shown,
			primaryLabel: 'Engine power',
			summary: `${num(torqueLbFt, 1, 1)} lb·ft at ${num(rpm, 0)} rpm.`,
			secondaryMetrics: [
				{ label: 'Horsepower (hp)', value: `${num(hp, 1, 1)} hp` },
				{ label: 'Metric horsepower (PS)', value: `${num(ps, 1, 1)} PS` },
				{ label: 'Kilowatts (kW)', value: `${num(kw, 1, 1)} kW` },
				{
					label: fromNm ? 'Torque in lb·ft' : 'Torque in N·m',
					value: fromNm ? `${num(torqueLbFt, 1, 1)} lb·ft` : `${num(torqueNm, 1, 1)} N·m`
				}
			]
		};
	},
	content: {
		intro:
			'Convert engine torque and speed into power. The horsepower calculator works from torque in pound-feet or newton-metres and engine speed in rpm, and shows the result in horsepower, metric horsepower (PS) or kilowatts.',
		howTo: [
			'Choose pound-feet or newton-metres, to match the torque figure you have.',
			'Enter the torque, and the engine speed in revolutions per minute (rpm).',
			'Pick the unit you want the main result in: hp, PS or kW.',
			'Read the power in all three units, and check the torque conversion below.'
		],
		about: [
			{
				heading: 'Torque, speed and power',
				paragraphs: [
					'Torque is the turning force an engine produces. Speed is how fast the shaft turns. Power is the rate at which the engine does work, which is torque times speed. A large engine can make a lot of torque at low speed, while a small high-revving engine can make similar power at high speed.',
					'Power is what you feel as acceleration and top speed. Torque is what you feel when you pull a load from a standstill.'
				]
			},
			{
				heading: 'Horsepower, PS and kilowatts',
				paragraphs: [
					'Horsepower (hp) was defined by James Watt in the 18th century as a way to compare engines with horses. The version used here is mechanical horsepower, equal to 745.7 watts. Metric horsepower (PS) is slightly smaller, at about 735.5 watts. Kilowatts (kW) are the SI unit, and most countries now quote engine power in kilowatts.',
					'So a 200 hp engine is about 149 kW. Many European and Asian car makers quote PS, which is close to but not the same as hp.'
				],
				table: {
					caption: 'Power units compared',
					columns: ['Unit', 'Watts', 'Common use'],
					rows: [
						['Horsepower (hp)', '745.7', 'United States and some other markets'],
						['Metric horsepower (PS)', '735.5', 'Germany, Japan and others, for cars and motorbikes'],
						['Kilowatt (kW)', '1,000', 'The SI unit, used in most countries']
					]
				}
			},
			{
				heading: 'How the formulas work',
				paragraphs: [
					'In pound-feet and rpm, horsepower equals torque times rpm divided by 5,252. The number 5,252 comes from converting rotation into the imperial unit of power. In newton-metres, kilowatts equal torque times rpm divided by 9,549.',
					'Because the two systems use different units, the calculator converts torque first. One pound-foot is about 1.356 newton-metres. Check the units before you enter a number, since a torque figure in the wrong unit gives a very wrong power.'
				]
			},
			{
				heading: 'Why published figures differ',
				paragraphs: [
					'Manufacturers quote power under different test rules. Some report net power, which includes accessories such as the alternator, and others report gross power on a test bench. The test standard and the altitude can change the number too.',
					'So the calculator tells you what the numbers imply, not the official rating. Use the figure in the owner’s manual or the manufacturer’s data when you need an exact value. For fuel use at a given power, the [fuel cost calculator](/fuel-cost-calculator) can help plan a trip.'
				]
			},
			{
				heading: 'Tips for comparing engines',
				paragraphs: [
					'Compare like with like. Use the same unit and the same test standard, or the comparison means little. If a figure is shown in PS, convert it before you compare it with a horsepower rating.',
					'If you want to know how an engine performs on a real road, the [speed calculator](/speed-calculator) and the [engine horsepower calculator](/engine-horsepower-calculator) give a rough picture from time and speed.'
				],
				list: [
					'Use the torque and speed at the same point in the rev range.',
					'Check whether the figure is net or gross, and at the crank or the wheels.',
					'Remember that wheel power is always lower than engine power, because of drivetrain losses.',
					'Use the unit converter for quick checks between hp, PS and kW.'
				]
			}
		],
		formulas: [
			{
				title: 'Horsepower',
				expression: 'hp = torque (lb·ft) × rpm ÷ 5,252',
				variables: [
					{ symbol: 'torque', meaning: 'the turning force, in pound-feet' },
					{ symbol: 'rpm', meaning: 'the engine speed, in revolutions per minute' }
				]
			},
			{
				title: 'Kilowatts',
				expression: 'kW = torque (N·m) × rpm ÷ 9,549',
				variables: [{ symbol: 'N·m', meaning: 'newton-metres, the SI unit of torque' }]
			},
			{
				title: 'Conversions',
				expression: '1 lb·ft = 1.3558 N·m\n1 hp = 0.7457 kW\n1 PS = 0.7355 kW',
				variables: [{ symbol: 'PS', meaning: 'metric horsepower, also called Pferdestärke' }]
			}
		],
		example: {
			title: 'An engine making 300 lb·ft of torque at 5,000 rpm',
			steps: [
				'Horsepower: 300 × 5,000 ÷ 5,252 = 285.6 hp',
				'Kilowatts: 300 lb·ft is about 406.7 N·m, so 406.7 × 5,000 ÷ 9,549 = 213.0 kW',
				'Metric horsepower: 213.0 kW ÷ 0.73550 = 289.6 PS'
			],
			result: 'The engine makes about 285.6 hp, which is 213.0 kW or 289.6 PS.'
		},
		faq: [
			{
				q: 'How do I calculate horsepower from torque?',
				a: 'Multiply the torque in pound-feet by the rpm, then divide by 5,252. The result is horsepower. The calculator does this, and shows the answer in other units too.'
			},
			{
				q: 'Is PS the same as hp?',
				a: 'No. Metric horsepower (PS) is about 1.4% smaller than mechanical horsepower (hp). A 100 hp engine is about 101 PS.'
			},
			{
				q: 'How many kW is 100 hp?',
				a: 'About 74.6 kW. One horsepower is 0.7457 kW, so multiply 100 by that.'
			},
			{
				q: 'Why is my engine rated lower than this calculation?',
				a: 'Ratings use test standards that account for accessories and losses. The calculator uses your torque and speed as given, so it shows the power those inputs imply.'
			}
		],
		sources: [{ title: 'NIST, The International System of Units (SI), SP 330', url: 'https://www.nist.gov/pml/special-publication-330' }]
	}
});
