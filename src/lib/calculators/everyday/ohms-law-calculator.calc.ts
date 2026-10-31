import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './ohms-law-calculator.meta';

type Quantity = 'V' | 'I' | 'R' | 'P';
type Pair = 'VI' | 'VR' | 'VP' | 'IR' | 'IP' | 'RP';

const FIELD_ID: Record<Quantity, string> = { V: 'voltage', I: 'current', R: 'resistance', P: 'power' };
const LABEL: Record<Quantity, string> = { V: 'Voltage', I: 'Current', R: 'Resistance', P: 'Power' };
const UNIT: Record<Quantity, string> = { V: 'V', I: 'A', R: 'Ω', P: 'W' };
const PAIR_QUANTITIES: Record<Pair, [Quantity, Quantity]> = {
	VI: ['V', 'I'],
	VR: ['V', 'R'],
	VP: ['V', 'P'],
	IR: ['I', 'R'],
	IP: ['I', 'P'],
	RP: ['R', 'P']
};
const PAIR_FORMULAS: Record<Pair, string> = {
	VI: 'Resistance = V ÷ I and power = V × I.',
	VR: 'Current = V ÷ R and power = V² ÷ R.',
	VP: 'Current = P ÷ V and resistance = V² ÷ P.',
	IR: 'Voltage = I × R and power = I² × R.',
	IP: 'Voltage = P ÷ I and resistance = P ÷ I².',
	RP: 'Voltage = √(P × R) and current = √(P ÷ R).'
};

const PREFIXES: [number, string][] = [
	[1e9, 'G'],
	[1e6, 'M'],
	[1e3, 'k'],
	[1, ''],
	[1e-3, 'm'],
	[1e-6, 'µ']
];

/** Formats a value with the SI prefix that keeps the number between 1 and 1,000, e.g. "25.532 mA". */
export function withPrefix(x: number, unit: string): string {
	if (!Number.isFinite(x)) return DASH;
	if (x === 0) return `0 ${unit}`;
	const a = Math.abs(x);
	const [scale, prefix] = PREFIXES.find(([s]) => a >= s) ?? PREFIXES[PREFIXES.length - 1];
	return `${num(x / scale, 3)} ${prefix}${unit}`;
}

/** Work out all four quantities from two known values of the given pair. */
export function solve(pair: Pair, a: number, b: number): Record<Quantity, number> {
	switch (pair) {
		case 'VI':
			return { V: a, I: b, R: a / b, P: a * b };
		case 'VR':
			return { V: a, I: a / b, R: b, P: (a * a) / b };
		case 'VP':
			return { V: a, I: b / a, R: (a * a) / b, P: b };
		case 'IR':
			return { V: a * b, I: a, R: b, P: a * a * b };
		case 'IP':
			return { V: b / a, I: a, R: b / (a * a), P: b };
		case 'RP':
			return { V: Math.sqrt(a * b), I: Math.sqrt(b / a), R: a, P: b };
	}
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'pair',
			label: 'Known values',
			type: 'select',
			default: 'VR',
			display: 'menu',
			options: [
				{ label: 'Voltage and current', value: 'VI' },
				{ label: 'Voltage and resistance', value: 'VR' },
				{ label: 'Voltage and power', value: 'VP' },
				{ label: 'Current and resistance', value: 'IR' },
				{ label: 'Current and power', value: 'IP' },
				{ label: 'Resistance and power', value: 'RP' }
			]
		},
		{
			id: 'target',
			label: 'Solve for',
			type: 'select',
			default: 'P',
			display: 'segmented',
			options: [
				{ label: 'Voltage', value: 'V' },
				{ label: 'Current', value: 'I' },
				{ label: 'Resistance', value: 'R' },
				{ label: 'Power', value: 'P' }
			],
			help: 'The answer shown in large type. All four values are listed below it.'
		},
		{
			id: 'voltage',
			label: 'Voltage',
			type: 'number',
			default: 12,
			min: 0,
			max: 1000000000,
			suffix: 'V',
			visibleWhen: (v) => String(v.pair).includes('V')
		},
		{
			id: 'current',
			label: 'Current',
			type: 'number',
			default: 2,
			min: 0,
			max: 1000000000,
			suffix: 'A',
			visibleWhen: (v) => String(v.pair).includes('I')
		},
		{
			id: 'resistance',
			label: 'Resistance',
			type: 'number',
			default: 470,
			min: 0,
			max: 1000000000000,
			suffix: 'Ω',
			visibleWhen: (v) => String(v.pair).includes('R')
		},
		{
			id: 'power',
			label: 'Power',
			type: 'number',
			default: 24,
			min: 0,
			max: 1000000000000,
			suffix: 'W',
			visibleWhen: (v) => String(v.pair).includes('P')
		}
	],
	calculate(v: InputValues): CalculationResult {
		const pair = String(v.pair) as Pair;
		const target = String(v.target) as Quantity;
		const quantities = PAIR_QUANTITIES[pair];
		if (!quantities || !LABEL[target]) {
			return { primaryResult: DASH, primaryLabel: 'Result', summary: 'Pick two known values and a quantity to solve for.' };
		}

		const a = Number(v[FIELD_ID[quantities[0]]]);
		const b = Number(v[FIELD_ID[quantities[1]]]);
		if (!(a > 0) || !(b > 0) || !Number.isFinite(a) || !Number.isFinite(b)) {
			return {
				primaryResult: DASH,
				primaryLabel: LABEL[target],
				summary: `Enter two values above zero: ${LABEL[quantities[0]].toLowerCase()} and ${LABEL[quantities[1]].toLowerCase()}.`
			};
		}

		const s = solve(pair, a, b);
		const fmt = (q: Quantity) => withPrefix(s[q], UNIT[q]);

		return {
			primaryResult: fmt(target),
			primaryLabel: LABEL[target],
			summary: PAIR_FORMULAS[pair],
			secondaryMetrics: [
				{ label: 'Voltage', value: fmt('V') },
				{ label: 'Current', value: fmt('I') },
				{ label: 'Resistance', value: fmt('R') },
				{ label: 'Power', value: fmt('P') }
			]
		};
	},
	content: {
		intro:
			'Solve Ohm’s law for any circuit. Enter two known values, such as voltage and resistance, and the Ohm’s law calculator gives voltage, current, resistance and power, with SI prefixes like mA and kΩ.',
		howTo: [
			'Pick two values you already know, such as voltage and current.',
			'Enter those two values with their units. Use zero or more, not negative numbers.',
			'Choose the quantity you want as the main answer. The other three are listed below it.',
			'Check the formula shown under the result, so you know which relation was used.'
		],
		about: [
			{
				heading: 'What is Ohm’s law?',
				paragraphs: [
					'Ohm’s law links three quantities in a simple circuit. Voltage is the push that drives charge through a circuit, measured in volts. Current is the flow of charge, measured in amps. Resistance is how hard it is for current to flow, measured in ohms.',
					'The law says that voltage equals current times resistance. Power, measured in watts, is voltage times current. Because of these links, any two values let you find the other two.'
				]
			},
			{
				heading: 'The four quantities and their units',
				paragraphs: [
					'Voltage is written V, current is written I or A for amps, resistance is written R or with the Greek letter Ω (ohm), and power is written P or W for watts. Small values often use prefixes, such as milliamps (mA) for thousandths of an amp.',
					'In short, the calculator picks a prefix that keeps the number between 1 and 1,000. So 0.0255 A is shown as 25.532 mA, and 1,000 Ω as 1 kΩ. These are standard SI prefixes, and the same ones work in every country.'
				],
				table: {
					caption: 'SI prefixes used in the results',
					columns: ['Prefix', 'Symbol', 'Multiplier'],
					rows: [
						['giga', 'G', '1,000,000,000'],
						['mega', 'M', '1,000,000'],
						['kilo', 'k', '1,000'],
						['milli', 'm', '0.001'],
						['micro', 'µ', '0.000001']
					]
				}
			},
			{
				heading: 'Which pair should I use?',
				paragraphs: [
					'First, use the two values you can measure or read from a label. A battery gives voltage, and a resistor is marked with its resistance. Then solve for the quantity you need, such as the current that flows.',
					'Also, power is useful for checking that a part can survive the load. A resistor rated at one quarter watt, or 250 milliwatts, should not carry more power than that, or it can overheat. For a resistor colour code, the [resistor calculator](/resistor-calculator) gives the value.'
				]
			},
			{
				heading: 'Tips for using Ohm’s law',
				paragraphs: [
					'However, Ohm’s law applies best to simple, steady circuits. Real parts can change with temperature, and some components, such as diodes or lamps, do not follow the law at all.',
					'For wire losses over a long run, the [voltage drop calculator](/voltage-drop-calculator) applies the same ideas. For a household bill, the [electricity calculator](/electricity-calculator) uses the power you work out here.'
				],
				list: [
					'Check the units before you enter a value. A mA is one thousandth of an amp.',
					'Use the power rating of the part, not only the voltage, when you choose one.',
					'Round results only at the end, so small errors do not build up.'
				]
			},
			{
				heading: 'Electrical safety',
				paragraphs: [
					'The numbers in this calculator are safe to work with, but real electricity is not. Mains supply at 120 or 230 volts can kill. Never work inside a live panel, socket or fitting. Switch off and isolate the supply, and hire a licensed electrician for mains work.',
					'Some circuits hold a charge after they are switched off, such as large capacitors in power supplies. Discharge them safely before you touch them, and follow the manufacturer’s instructions.'
				]
			}
		],
		formulas: [
			{
				title: 'Ohm’s law',
				expression: 'V = I × R',
				variables: [
					{ symbol: 'V', meaning: 'voltage, in volts' },
					{ symbol: 'I', meaning: 'current, in amps' },
					{ symbol: 'R', meaning: 'resistance, in ohms' }
				]
			},
			{
				title: 'Power',
				expression: 'P = V × I, which is also P = I² × R, and P = V² ÷ R',
				variables: [{ symbol: 'P', meaning: 'power, in watts' }]
			},
			{
				title: 'Solving for each quantity',
				expression: 'I = V ÷ R\nR = V ÷ I\nV = √(P × R)',
				variables: [{ symbol: '√', meaning: 'the square root, used when voltage is found from power and resistance' }]
			}
		],
		example: {
			title: 'A 12 V supply across a 470 ohm resistor',
			steps: [
				'Current: 12 ÷ 470 = 0.025532 A, which is 25.532 mA',
				'Power: 12 × 0.025532 = 0.306383 W, which is 306.383 mW'
			],
			result: 'The current is 25.532 mA and the power is 306.383 mW, so a 1/4 watt resistor is too small here.'
		},
		faq: [
			{
				q: 'What is Ohm’s law in simple terms?',
				a: 'Voltage equals current times resistance. If you raise the voltage across a fixed resistor, the current rises in step. If you raise the resistance at a fixed voltage, the current falls.'
			},
			{
				q: 'What does 1 kΩ mean?',
				a: 'It means 1 kilo-ohm, which is 1,000 ohms. The k is the kilo prefix. Other prefixes include M for mega, which is a million ohms.'
			},
			{
				q: 'How do I find power from voltage and current?',
				a: 'Multiply them. Power in watts equals volts times amps. For example, 12 volts at 2 amps is 24 watts.'
			},
			{
				q: 'Is Ohm’s law safe to use with mains electricity?',
				a: 'The formula is the same, but the risk is not. Mains voltage can kill, so do not test or change mains circuits without training. Use a licensed electrician for that work.'
			}
		],
		sources: [{ title: 'NIST, The International System of Units (SI), SP 330', url: 'https://www.nist.gov/pml/special-publication-330' }]
	}
});
