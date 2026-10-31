import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './molarity-calculator.meta';

type VolumeUnit = 'mL' | 'L';
type Solve = 'molarity' | 'mass' | 'volume';

const fail = (summary: string): CalculationResult => ({
	primaryResult: DASH,
	primaryLabel: 'Result',
	summary
});

const isPositive = (x: number) => Number.isFinite(x) && x > 0;
const isZeroOrMore = (x: number) => Number.isFinite(x) && x >= 0;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'solve',
			label: 'Solve for',
			type: 'select',
			default: 'molarity',
			display: 'menu',
			options: [
				{ label: 'Molarity, from mass and volume', value: 'molarity' },
				{ label: 'Mass for a target molarity', value: 'mass' },
				{ label: 'Volume for a target molarity', value: 'volume' }
			]
		},
		{
			id: 'mass',
			label: 'Mass of solute',
			type: 'number',
			default: 5.844,
			min: 0,
			max: 10000000,
			suffix: 'g',
			visibleWhen: (v) => v.solve !== 'mass'
		},
		{
			id: 'molarMass',
			label: 'Molar mass',
			type: 'number',
			default: 58.44,
			min: 0,
			max: 100000,
			suffix: 'g/mol',
			help: 'Add up the atomic masses in the formula. Table salt (NaCl) is 58.44 g/mol.'
		},
		{
			id: 'targetM',
			label: 'Target molarity',
			type: 'number',
			default: 0.5,
			min: 0,
			max: 100,
			suffix: 'M',
			help: 'Moles of solute per litre of solution.',
			visibleWhen: (v) => v.solve !== 'molarity'
		},
		{
			id: 'volume',
			label: 'Volume of solution',
			type: 'number',
			default: 100,
			min: 0,
			max: 10000000,
			visibleWhen: (v) => v.solve !== 'volume'
		},
		{
			id: 'volumeUnit',
			label: 'Volume unit',
			type: 'select',
			default: 'mL',
			display: 'segmented',
			options: [
				{ label: 'mL', value: 'mL' },
				{ label: 'L', value: 'L' }
			]
		}
	],
	calculate(v: InputValues): CalculationResult {
		const solve = String(v.solve) as Solve;
		const unit = String(v.volumeUnit) as VolumeUnit;
		const litres = (x: number) => (unit === 'mL' ? x / 1000 : x);
		const fromLitres = (x: number) => (unit === 'mL' ? x * 1000 : x);

		const molarMass = Number(v.molarMass);
		if (!isPositive(molarMass)) return fail('Enter a molar mass above zero.');

		let molarity: number;
		let moles: number;
		let mass: number;
		let volumeL: number;

		if (solve === 'molarity') {
			mass = Number(v.mass);
			volumeL = litres(Number(v.volume));
			if (!isZeroOrMore(mass) || !isPositive(volumeL)) return fail('Enter a mass of zero or more, and a volume above zero.');
			moles = mass / molarMass;
			molarity = moles / volumeL;
		} else if (solve === 'mass') {
			molarity = Number(v.targetM);
			volumeL = litres(Number(v.volume));
			if (!isZeroOrMore(molarity) || !isPositive(volumeL)) return fail('Enter a target molarity and a volume above zero.');
			moles = molarity * volumeL;
			mass = moles * molarMass;
		} else {
			mass = Number(v.mass);
			molarity = Number(v.targetM);
			if (!isZeroOrMore(mass) || !isPositive(molarity)) return fail('Enter a mass of zero or more and a target molarity above zero.');
			moles = mass / molarMass;
			volumeL = moles / molarity;
		}

		if (![molarity, moles, mass, volumeL].every(Number.isFinite)) return fail('Check the values; the result is not a finite number.');

		const volumeOut = `${num(fromLitres(volumeL), 2)} ${unit}`;
		const summary =
			solve === 'molarity'
				? `Molarity = moles ÷ litres: ${num(mass, 4)} g ÷ ${num(molarMass, 4)} g/mol = ${num(moles, 5)} mol in ${num(volumeL, 4)} L.`
				: solve === 'mass'
					? `Mass = molarity × litres × molar mass: ${num(molarity, 4)} M × ${num(volumeL, 4)} L × ${num(molarMass, 4)} g/mol.`
					: `Volume = moles ÷ molarity: ${num(moles, 4)} mol ÷ ${num(molarity, 4)} M.`;

		const primary =
			solve === 'molarity'
				? { primaryResult: `${num(molarity, 4)} M`, primaryLabel: 'Molarity' }
				: solve === 'mass'
					? { primaryResult: `${num(mass, 3)} g`, primaryLabel: 'Mass needed' }
					: { primaryResult: volumeOut, primaryLabel: 'Volume needed' };

		return {
			...primary,
			summary,
			secondaryMetrics: [
				{ label: 'Molarity', value: `${num(molarity, 4)} M` },
				{ label: 'Moles of solute', value: `${num(moles, 5)} mol` },
				{ label: 'Mass of solute', value: `${num(mass, 3)} g` },
				{ label: 'Volume of solution', value: volumeOut }
			]
		};
	},
	content: {
		intro:
			'Work out the molarity of a solution, or the mass or volume you need to reach a target molarity. The molarity calculator uses moles per litre and the molar mass of the solute.',
		howTo: [
			'Choose what to solve for: molarity, the mass needed, or the volume needed.',
			'Enter the molar mass of the solute. Add up the atomic masses in its formula, or use a known value such as 58.44 g/mol for table salt.',
			'Enter the known values, such as the mass and the volume, or the target molarity.',
			'Read the answer, with the moles of solute and the other values listed below it.'
		],
		about: [
			{
				heading: 'What is molarity?',
				paragraphs: [
					'Molarity is the number of moles of a substance dissolved in one litre of solution. It is written M, and a 1 M solution contains one mole per litre. It is one of the most common ways chemists express concentration.',
					'A mole is a fixed number of particles, about 6.022 × 10²³. You do not need that number to use this calculator, because the molar mass links grams to moles.'
				]
			},
			{
				heading: 'How molarity is calculated',
				paragraphs: [
					'First, convert the mass of solute to moles by dividing by the molar mass. Then divide the moles by the volume of the solution in litres. The result is molarity.',
					'The volume must be the volume of the finished solution, not just the solvent you added. Dissolving a solid can change the total volume a little, so most people measure the final volume in a volumetric flask.'
				]
			},
			{
				heading: 'Finding molar mass',
				paragraphs: [
					'Molar mass is the mass of one mole of a substance, in grams per mole. For a compound, add up the atomic masses of every atom in the formula. Sodium chloride, NaCl, is about 58.44 g/mol because sodium is about 22.99 and chlorine is about 35.45.',
					'If you are unsure of the formula, the [molecular weight calculator](/molecular-weight-calculator) works out the molar mass for you.'
				]
			},
			{
				heading: 'Tips for making a solution',
				paragraphs: [
					'Weigh the solid on a balance, dissolve it in part of the solvent, then top up to the final volume. This order gives a more accurate concentration than adding all the solvent first.',
					'Use the [density calculator](/density-calculator) if you need to convert a liquid from mass to volume. For very small or very large numbers, the [scientific notation calculator](/scientific-notation-calculator) keeps the figures tidy.'
				],
				list: [
					'Use the grade of chemical the method calls for, such as analytical grade.',
					'Check the formula weight on the bottle label, especially for hydrates.',
					'Write down the date, the concentration and the solvent on every container.',
					'Round only at the end of a calculation.'
				]
			},
			{
				heading: 'Chemical safety',
				paragraphs: [
					'Many chemicals are harmful to skin, eyes and lungs. Read the safety data sheet before you handle any substance, and wear eye protection and gloves. Work in a ventilated area, and never taste or smell a chemical to identify it.',
					'When you dilute a concentrated acid, always add the acid slowly to water, never water to acid. Adding water to acid can cause the liquid to spatter and burn you. Dispose of chemicals according to local rules, not down the drain unless the label allows it.'
				]
			}
		],
		formulas: [
			{
				title: 'Molarity',
				expression: 'M = moles ÷ litres\nmoles = mass (g) ÷ molar mass (g/mol)',
				variables: [
					{ symbol: 'M', meaning: 'molarity, in moles per litre' },
					{ symbol: 'litres', meaning: 'the volume of the finished solution, in litres' }
				]
			},
			{
				title: 'Mass for a target molarity',
				expression: 'mass (g) = M × litres × molar mass (g/mol)',
				variables: [{ symbol: 'M × litres', meaning: 'the number of moles you need' }]
			},
			{
				title: 'Volume for a target molarity',
				expression: 'litres = moles ÷ M',
				variables: [{ symbol: 'moles', meaning: 'mass divided by molar mass' }]
			}
		],
		example: {
			title: 'Making 100 mL of 0.5 M sodium chloride',
			steps: [
				'Convert the volume: 100 mL is 0.1 litres',
				'Moles needed: 0.5 × 0.1 = 0.05 mol',
				'Mass: 0.05 × 58.44 = 2.922 g'
			],
			result: 'Dissolve 2.922 g of NaCl, then top up to 100 mL of final solution.'
		},
		faq: [
			{
				q: 'What is the molarity of a solution?',
				a: 'It is the moles of solute dissolved per litre of solution. For example, 1 mole of salt in 1 litre of water gives a 1 M solution. Divide the mass by the molar mass, then by the litres.'
			},
			{
				q: 'What is the difference between molarity and molality?',
				a: 'Molarity uses the volume of the solution, while molality uses the mass of the solvent. Molarity changes slightly with temperature because liquid volume does, so molality is used when precision matters.'
			},
			{
				q: 'Where do I find the molar mass?',
				a: 'Add up the atomic masses in the formula, or look it up in a trusted reference such as the NIST Chemistry WebBook or the IUPAC atomic weight tables.'
			},
			{
				q: 'Can I use this calculator for a mixture of salts?',
				a: 'Work out each solute separately. Add the moles and volumes as needed, but check the method first, because some mixtures change the volume or react with each other.'
			}
		],
		sources: [
			{ title: 'IUPAC Gold Book, molarity', url: 'https://goldbook.iupac.org/' },
			{ title: 'NIST Chemistry WebBook', url: 'https://webbook.nist.gov/chemistry/' }
		],
		disclaimer:
			'This tool does the arithmetic only. Check the chemical safety data and your lab procedure before you prepare any solution.'
	}
});
