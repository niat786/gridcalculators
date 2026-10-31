import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './voltage-drop-calculator.meta';

const imperial = (v: InputValues) => v.units === 'imperial';
const metric = (v: InputValues) => v.units === 'metric';
const awgSystem = (v: InputValues) => v.system === 'awg';
const mm2System = (v: InputValues) => v.system === 'mm2';

/**
 * DC resistance at 75 °C, ohms per 1000 ft, uncoated conductors (NEC Chapter 9, Table 8).
 * `cu` = copper, `al` = aluminum.
 */
export const AWG_OHMS_PER_1000FT: Record<string, { cu: number; al: number }> = {
	'14': { cu: 3.07, al: 5.06 },
	'12': { cu: 1.93, al: 3.18 },
	'10': { cu: 1.21, al: 2.0 },
	'8': { cu: 0.764, al: 1.26 },
	'6': { cu: 0.491, al: 0.808 },
	'4': { cu: 0.308, al: 0.508 },
	'3': { cu: 0.245, al: 0.403 },
	'2': { cu: 0.194, al: 0.319 },
	'1': { cu: 0.154, al: 0.253 },
	'1/0': { cu: 0.122, al: 0.201 },
	'2/0': { cu: 0.0967, al: 0.159 },
	'3/0': { cu: 0.0766, al: 0.126 },
	'4/0': { cu: 0.0608, al: 0.1 }
};

/** Resistivity at 75 °C, ohm·mm² per metre, for metric sizes. */
export const RESISTIVITY_OHM_MM2_PER_M = { copper: 0.02156, aluminum: 0.03547 };

const FT_PER_M = 1 / 0.3048;
const GUIDE_PERCENT = 3;

const AWG_OPTIONS = Object.keys(AWG_OHMS_PER_1000FT).map((k) => ({ value: k, label: `${k} AWG` }));
const MM2_OPTIONS = ['1.5', '2.5', '4', '6', '10', '16', '25', '35', '50', '70', '95'].map((k) => ({
	value: k,
	label: `${k} mm²`
}));

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'phase',
			label: 'Supply',
			type: 'select',
			display: 'segmented',
			default: 'single',
			options: [
				{ label: 'Single-phase', value: 'single' },
				{ label: 'Three-phase', value: 'three' }
			]
		},
		{
			id: 'material',
			label: 'Conductor',
			type: 'select',
			display: 'segmented',
			default: 'copper',
			options: [
				{ label: 'Copper', value: 'copper' },
				{ label: 'Aluminum', value: 'aluminum' }
			]
		},
		{
			id: 'system',
			label: 'Wire size system',
			type: 'select',
			display: 'segmented',
			default: 'awg',
			options: [
				{ label: 'AWG', value: 'awg' },
				{ label: 'Metric (mm²)', value: 'mm2' }
			]
		},
		{ id: 'awg', label: 'Wire size', type: 'select', default: '10', options: AWG_OPTIONS, visibleWhen: awgSystem },
		{ id: 'mm2', label: 'Wire size', type: 'select', default: '4', options: MM2_OPTIONS, visibleWhen: mm2System },
		{
			id: 'units',
			label: 'Length units',
			type: 'select',
			display: 'segmented',
			default: 'imperial',
			options: [
				{ label: 'Imperial (ft)', value: 'imperial' },
				{ label: 'Metric (m)', value: 'metric' }
			]
		},
		{ id: 'lengthFt', label: 'One-way length', type: 'number', default: 50, min: 1, max: 3000, step: 1, suffix: 'ft', visibleWhen: imperial },
		{ id: 'lengthM', label: 'One-way length', type: 'number', default: 15, min: 0.5, max: 900, step: 0.1, suffix: 'm', visibleWhen: metric },
		{ id: 'current', label: 'Current', type: 'number', default: 20, min: 0.1, max: 2000, step: 0.1, suffix: 'A' },
		{ id: 'volts', label: 'Supply voltage', type: 'number', default: 120, min: 1, max: 1000, step: 1, suffix: 'V', help: 'Line-to-line for three-phase.' }
	],
	calculate(v): CalculationResult {
		const fail = (summary: string): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Voltage drop',
			summary
		});

		const copper = v.material === 'copper';
		const three = v.phase === 'three';
		const current = Number(v.current);
		const volts = Number(v.volts);
		const lengthM = imperial(v) ? Number(v.lengthFt) / FT_PER_M : Number(v.lengthM);

		let ohmsPerM: number;
		if (v.system === 'mm2') {
			const area = Number(v.mm2);
			ohmsPerM = (copper ? RESISTIVITY_OHM_MM2_PER_M.copper : RESISTIVITY_OHM_MM2_PER_M.aluminum) / area;
		} else {
			const row = AWG_OHMS_PER_1000FT[String(v.awg)];
			if (!row) return fail('Pick a wire size.');
			// Ohms per 1000 ft → ohms per metre.
			ohmsPerM = (copper ? row.cu : row.al) / 1000 / 0.3048;
		}

		if (!(current > 0) || !(volts > 0) || !(lengthM > 0) || !(ohmsPerM > 0)) {
			return fail('Enter the length, current and voltage.');
		}

		// One-way resistance of the run, then the drop for the whole circuit.
		const resistance = ohmsPerM * lengthM;
		const factor = three ? Math.sqrt(3) : 2;
		const drop = factor * current * resistance;
		const atLoad = volts - drop;
		if (!(atLoad > 0)) {
			return fail('The drop is larger than the supply voltage. Check the wire size and length.');
		}

		const pct = (drop / volts) * 100;
		const within = pct <= GUIDE_PERCENT;

		return {
			primaryResult: `${num(pct, 2, 2)}%`,
			primaryLabel: 'Voltage drop',
			summary: `${num(drop, 2, 2)} V is lost along the run, leaving ${num(atLoad, 1, 1)} V at the load. ${
				within
					? 'That is within the 3% guide for a branch circuit.'
					: 'That is above the 3% guide for a branch circuit, so a larger wire or a shorter run would help.'
			}`,
			secondaryMetrics: [
				{ label: 'Volts dropped', value: `${num(drop, 2, 2)} V` },
				{ label: 'Voltage at the load', value: `${num(atLoad, 1, 1)} V` },
				{ label: 'Resistance, one way', value: `${num(resistance, 4, 4)} Ω` },
				{ label: 'Against the 3% guide', value: within ? 'Within 3%' : 'Above 3%' }
			]
		};
	},
	content: {
		intro:
			'Check how much voltage a wire run loses on the way to its load. The voltage drop calculator works for copper or aluminium wire in AWG or mm², for single-phase and three-phase supplies, and shows the percentage lost.',
		howTo: [
			'Choose single-phase or three-phase, then copper or aluminum for the conductor.',
			'Pick the wire size in AWG or mm², and enter the one-way length of the run.',
			'Enter the current the load draws, and the supply voltage.',
			'Read the percentage drop and the voltage left at the load. Compare the result with your local wiring rule.'
		],
		about: [
			{
				heading: 'What is voltage drop?',
				paragraphs: [
					'Every wire has some resistance, so some of the voltage is used up as the current flows along it. This loss is called voltage drop. The voltage that reaches the load is lower than the voltage at the source.',
					'A small drop is normal. A large drop makes lights dim, motors run hot and heaters work less well. It can also mean the wire is too thin for the current it carries.'
				]
			},
			{
				heading: 'How the drop is calculated',
				paragraphs: [
					'The current must travel to the load and back, so a single-phase circuit counts the length twice. The [ohms law calculator](/ohms-law-calculator) covers the same relationship between voltage, current and resistance. The drop is 2 × current × resistance of the one-way wire. For three-phase, the calculator uses the square root of 3 instead of 2.',
					'Resistance depends on the wire size and the metal. Copper has lower resistance than aluminum of the same size, so aluminum needs a larger wire for the same drop. The calculator uses resistance values at a conductor temperature of 75 °C.'
				]
			},
			{
				heading: 'Wire sizes and metric equivalents',
				paragraphs: [
					'In North America, wire is sized in AWG, where a higher number means a thinner wire. In most other countries, wire is sized by its cross-section in square millimetres, where a bigger number means a thicker wire.',
					'Use the size list that matches your cable markings. The calculator converts the length for you, so you can enter feet or metres. For a quick check of length units, the [unit converter](/unit-converter) helps.'
				]
			},
			{
				heading: 'What is a safe voltage drop?',
				paragraphs: [
					'Many wiring guides suggest keeping the drop within 3% for a branch circuit, and within about 5% for the whole run from the supply. The calculator uses 3% as its guide. Other national wiring rules, such as BS 7671 in the United Kingdom, set their own limits and methods.',
					'A drop above the guide is not always dangerous, but it is a sign to check the wire size, the length and the load. Your local rules have the final say.'
				]
			},
			{
				heading: 'Electrical safety for wire runs',
				paragraphs: [
					'An undersized wire can overheat, and that can start a fire. Always size wire to the rules in your area, not only to the voltage drop. Protect the circuit with a breaker or fuse of the right rating.',
					'Mains wiring must be done by a licensed electrician. Switch off and isolate the supply before you touch any cable, and never work on a live circuit. To estimate what the load uses, the [electricity calculator](/electricity-calculator) and the [resistor calculator](/resistor-calculator) give useful figures.'
				]
			}
		],
		formulas: [
			{
				title: 'Single-phase drop',
				expression: 'Drop = 2 × current × resistance',
				variables: [
					{ symbol: 'current', meaning: 'the current the load draws, in amps' },
					{ symbol: 'resistance', meaning: 'the one-way resistance of the wire, in ohms' }
				]
			},
			{
				title: 'Three-phase drop',
				expression: 'Drop = √3 × current × resistance',
				variables: [{ symbol: '√3', meaning: 'about 1.732, used for three-phase supplies' }]
			},
			{
				title: 'Percentage',
				expression: 'Percentage drop = (drop ÷ supply voltage) × 100',
				variables: [{ symbol: 'supply voltage', meaning: 'the voltage at the start of the run' }]
			}
		],
		example: {
			title: '10 AWG copper wire, 50 ft long, carrying 20 A on a 120 V single-phase supply',
			steps: [
				'Resistance, one way: 1.21 ohms per 1,000 ft × 50 ft ÷ 1,000 = 0.0605 ohm, using the table value for 10 AWG copper',
				'Drop: 2 × 20 × 0.0605 = 2.42 volts',
				'Percentage: 2.42 ÷ 120 × 100 = 2.02%',
				'Voltage at the load: 120 − 2.42 = 117.6 volts'
			],
			result: 'The drop is 2.02%, which is within the 3% guide.'
		},
		faq: [
			{
				q: 'What is an acceptable voltage drop?',
				a: 'A common guide is 3% on a branch circuit and about 5% for the whole run. Local wiring rules set the official limit, so check them. This calculator uses 3% as its guide.'
			},
			{
				q: 'Does copper or aluminum lose more voltage?',
				a: 'For the same size, aluminum has higher resistance and loses more voltage. An aluminum wire therefore often needs one size larger than copper for the same drop.'
			},
			{
				q: 'Why is three-phase drop calculated differently?',
				a: 'Three-phase supplies share the load across three conductors, so the current in each wire is calculated with the square root of 3 instead of 2.'
			},
			{
				q: 'Can I use this to pick a wire size for my house?',
				a: 'Use it as a check. Wire size must also meet current rating, protection and installation rules. A licensed electrician should size and install mains wiring.'
			}
		],
		sources: [{ title: 'NFPA, National Electrical Code (NEC), Chapter 9, Table 8', url: 'https://www.nfpa.org/' }],
		disclaimer:
			'This tool estimates voltage drop only. It does not replace local wiring rules. Work on mains wiring must be done by a licensed electrician.'
	}
});
