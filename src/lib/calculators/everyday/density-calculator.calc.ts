import { defineCalculator, type CalculationResult, type InputValues, type NumberInput } from '../types';
import { DASH, num } from '../format';
import meta from './density-calculator.meta';

/** Each unit as a multiple of the SI base unit (kg, m³, kg/m³). */
const MASS_KG: Record<string, number> = { kg: 1, g: 0.001, lb: 0.45359237 };
const VOLUME_M3: Record<string, number> = { m3: 1, L: 0.001, cm3: 0.000001, ft3: 0.028316846592 };
const DENSITY_KG_M3: Record<string, number> = { kgm3: 1, gcm3: 1000, lbft3: 0.45359237 / 0.028316846592 };

const MASS_LABEL: Record<string, string> = { kg: 'kg', g: 'g', lb: 'lb' };
const VOLUME_LABEL: Record<string, string> = { m3: 'm³', L: 'L', cm3: 'cm³', ft3: 'ft³' };
const DENSITY_LABEL: Record<string, string> = { kgm3: 'kg/m³', gcm3: 'g/cm³', lbft3: 'lb/ft³' };

/** Show a quantity field only when it is an input (not the answer) and its unit is chosen. */
const shown = (solveFor: string, unitKey: string, unit: string) => (v: InputValues) =>
	v.solve !== solveFor && v[unitKey] === unit;

const field = (
	id: string,
	label: string,
	suffix: string,
	def: number,
	step: number,
	visibleWhen: (v: InputValues) => boolean
): NumberInput => ({ id, label, type: 'number', default: def, min: 0, max: 1000000000, step, suffix, visibleWhen });

/** Three significant figures for large numbers, more decimals for small ones. */
const fmt = (x: number) => num(x, Math.abs(x) >= 1 ? 3 : 6);

const pos = (n: number) => Number.isFinite(n) && n > 0;

function invalid(label: string): CalculationResult {
	return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a mass, volume and density greater than zero.' };
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'solve',
			label: 'Solve for',
			type: 'select',
			display: 'segmented',
			default: 'density',
			options: [
				{ label: 'Density', value: 'density' },
				{ label: 'Mass', value: 'mass' },
				{ label: 'Volume', value: 'volume' }
			]
		},
		{
			id: 'massUnit',
			label: 'Mass unit',
			type: 'select',
			display: 'segmented',
			default: 'kg',
			options: [
				{ label: 'kg', value: 'kg' },
				{ label: 'g', value: 'g' },
				{ label: 'lb', value: 'lb' }
			]
		},
		field('mass_kg', 'Mass', 'kg', 2.7, 0.1, shown('mass', 'massUnit', 'kg')),
		field('mass_g', 'Mass', 'g', 2700, 1, shown('mass', 'massUnit', 'g')),
		field('mass_lb', 'Mass', 'lb', 5.95, 0.01, shown('mass', 'massUnit', 'lb')),
		{
			id: 'volumeUnit',
			label: 'Volume unit',
			type: 'select',
			display: 'menu',
			default: 'L',
			options: [
				{ label: 'Cubic metres (m³)', value: 'm3' },
				{ label: 'Litres (L)', value: 'L' },
				{ label: 'Cubic centimetres (cm³)', value: 'cm3' },
				{ label: 'Cubic feet (ft³)', value: 'ft3' }
			]
		},
		field('vol_m3', 'Volume', 'm³', 0.001, 0.0001, shown('volume', 'volumeUnit', 'm3')),
		field('vol_L', 'Volume', 'L', 1, 0.1, shown('volume', 'volumeUnit', 'L')),
		field('vol_cm3', 'Volume', 'cm³', 1000, 1, shown('volume', 'volumeUnit', 'cm3')),
		field('vol_ft3', 'Volume', 'ft³', 0.0353, 0.001, shown('volume', 'volumeUnit', 'ft3')),
		{
			id: 'densityUnit',
			label: 'Density unit',
			type: 'select',
			display: 'segmented',
			default: 'gcm3',
			help: 'Water is about 1 g/cm³, or 1,000 kg/m³.',
			options: [
				{ label: 'kg/m³', value: 'kgm3' },
				{ label: 'g/cm³', value: 'gcm3' },
				{ label: 'lb/ft³', value: 'lbft3' }
			]
		},
		field('den_kgm3', 'Density', 'kg/m³', 1000, 1, shown('density', 'densityUnit', 'kgm3')),
		field('den_gcm3', 'Density', 'g/cm³', 1, 0.001, shown('density', 'densityUnit', 'gcm3')),
		field('den_lbft3', 'Density', 'lb/ft³', 62.4, 0.1, shown('density', 'densityUnit', 'lbft3'))
	],
	calculate(v): CalculationResult {
		const solve = String(v.solve);
		const massUnit = String(v.massUnit);
		const volumeUnit = String(v.volumeUnit);
		const densityUnit = String(v.densityUnit);
		if (!(massUnit in MASS_KG) || !(volumeUnit in VOLUME_M3) || !(densityUnit in DENSITY_KG_M3)) {
			return invalid('Density');
		}

		// Every quantity in SI base units: kg, m³ and kg/m³.
		const massIn = Number(v[`mass_${massUnit}`]) * MASS_KG[massUnit];
		const volumeIn = Number(v[`vol_${volumeUnit}`]) * VOLUME_M3[volumeUnit];
		const densityIn = Number(v[`den_${densityUnit}`]) * DENSITY_KG_M3[densityUnit];

		if (solve === 'mass') {
			if (!pos(densityIn) || !pos(volumeIn)) return invalid('Mass');
			const kg = densityIn * volumeIn;
			return {
				primaryResult: `${fmt(kg / MASS_KG[massUnit])} ${MASS_LABEL[massUnit]}`,
				primaryLabel: 'Mass',
				summary: 'Density × volume.',
				secondaryMetrics: [
					{ label: 'In kilograms', value: `${fmt(kg)} kg` },
					{ label: 'In grams', value: `${fmt(kg / MASS_KG.g)} g` },
					{ label: 'In pounds', value: `${fmt(kg / MASS_KG.lb)} lb` }
				]
			};
		}

		if (solve === 'volume') {
			if (!pos(massIn) || !pos(densityIn)) return invalid('Volume');
			const m3 = massIn / densityIn;
			return {
				primaryResult: `${fmt(m3 / VOLUME_M3[volumeUnit])} ${VOLUME_LABEL[volumeUnit]}`,
				primaryLabel: 'Volume',
				summary: 'Mass ÷ density.',
				secondaryMetrics: [
					{ label: 'In cubic metres', value: `${fmt(m3)} m³` },
					{ label: 'In litres', value: `${fmt(m3 / VOLUME_M3.L)} L` },
					{ label: 'In cubic feet', value: `${fmt(m3 / VOLUME_M3.ft3)} ft³` }
				]
			};
		}

		// Solving for density: shown in the chosen unit and in all three common units.
		if (!pos(massIn) || !pos(volumeIn)) return invalid('Density');
		const rho = massIn / volumeIn;
		return {
			primaryResult: `${fmt(rho / DENSITY_KG_M3[densityUnit])} ${DENSITY_LABEL[densityUnit]}`,
			primaryLabel: 'Density',
			summary: 'Mass ÷ volume, shown in all three common density units.',
			secondaryMetrics: [
				{ label: 'In kg/m³', value: `${fmt(rho)} kg/m³` },
				{ label: 'In g/cm³', value: `${fmt(rho / DENSITY_KG_M3.gcm3)} g/cm³` },
				{ label: 'In lb/ft³', value: `${fmt(rho / DENSITY_KG_M3.lbft3)} lb/ft³` }
			]
		};
	},
	content: {
		intro:
			'Solve for density, mass or volume with one formula. Enter any two of the three, in metric or imperial units, and the density calculator gives the third in several units at once.',
		howTo: [
			'Choose what to solve for: density, mass or volume.',
			'Pick the units for the two values you know, such as kilograms and litres.',
			'Enter the two values. Use numbers above zero.',
			'Read the answer, with the same quantity in other units shown below it.'
		],
		about: [
			{
				heading: 'What is density?',
				paragraphs: [
					'Density is how much mass is packed into a given volume. A block of lead and a block of foam of the same size have very different masses, because lead is much denser. Density is written as mass divided by volume.',
					'Common units are grams per cubic centimetre (g/cm³), kilograms per cubic metre (kg/m³) and pounds per cubic foot (lb/ft³). Water is about 1 g/cm³, or 1,000 kg/m³, which is a useful reference point. For solutions in chemistry, the [molarity calculator](/molarity-calculator) uses the same mass and volume ideas.'
				]
			},
			{
				heading: 'How density, mass and volume fit together',
				paragraphs: [
					'The three quantities follow one rule. Mass equals density times volume, and volume equals mass divided by density. If you know any two, you can find the third, so the calculator rearranges the formula for you. The [mass calculator](/mass-calculator) uses the same rule with common materials, and the [volume calculator](/volume-calculator) gives the volume of common shapes.',
					'Units must match. A density in g/cm³ and a volume in litres must be converted before you multiply. The calculator converts everything to SI base units internally, so you can mix units freely.'
				]
			},
			{
				heading: 'Density changes with temperature and pressure',
				paragraphs: [
					'Most liquids and solids get slightly less dense as they warm up, because they expand. Water is a special case, and it is densest at about 4 °C. Gases change much more with pressure and temperature.',
					'So a reference density is only a guide. For precise work, use the density at the temperature and pressure you are working at. The data is usually given in engineering or materials tables.'
				],
				list: [
					'Water is about 1 g/cm³ at room temperature.',
					'Aluminium is about 2.7 g/cm³.',
					'Steel is about 7.85 g/cm³.',
					'Air is much less dense than water, at about 1.2 kg/m³ near sea level.'
				]
			},
			{
				heading: 'Tips for measuring density',
				paragraphs: [
					'For a solid, weigh it on accurate scales, then find its volume by displacing water in a measuring cylinder. For a liquid, weigh a known volume, for example in a calibrated flask.',
					'Use the mass and volume in the same system. A kitchen scale in pounds and a measuring jug in litres are fine, but convert before you divide. Repeat the measurement and average the results to reduce error.'
				]
			},
			{
				heading: 'Safety in the lab and at home',
				paragraphs: [
					'Some liquids are hazardous. Check the safety data sheet before you handle any chemical, and wear eye protection and gloves when you need to. Never taste or smell a substance to identify it.',
					'When you weigh or pour heavy objects, lift with your legs and use a trolley for large loads.'
				]
			}
		],
		formulas: [
			{
				title: 'Density',
				expression: 'density = mass ÷ volume',
				variables: [
					{ symbol: 'mass', meaning: 'the amount of matter, in kilograms, grams or pounds' },
					{ symbol: 'volume', meaning: 'the space it fills, in cubic metres, litres, cubic centimetres or cubic feet' }
				]
			},
			{
				title: 'Mass',
				expression: 'mass = density × volume',
				variables: [{ symbol: 'density', meaning: 'the density in the same system as the volume' }]
			},
			{
				title: 'Volume',
				expression: 'volume = mass ÷ density',
				variables: [{ symbol: 'volume', meaning: 'the space the mass occupies' }]
			}
		],
		example: {
			title: 'A 2.7 kg block with a volume of 1 litre',
			steps: [
				'Convert the volume: 1 litre is 0.001 cubic metres',
				'Density: 2.7 kg ÷ 0.001 m³ = 2,700 kg/m³',
				'In grams per cubic centimetre: 2,700 ÷ 1,000 = 2.7 g/cm³',
				'In pounds per cubic foot: 2,700 × 0.0624280 = 168.555 lb/ft³'
			],
			result: 'The density is 2.7 g/cm³, which is 2,700 kg/m³ or 168.555 lb/ft³.'
		},
		faq: [
			{
				q: 'What is the density of water?',
				a: 'About 1 g/cm³, or 1,000 kg/m³. It is slightly denser at 4 °C than at room temperature, but for everyday use 1 g/cm³ is accurate enough.'
			},
			{
				q: 'How do I convert g/cm³ to kg/m³?',
				a: 'Multiply by 1,000. For example, 2.7 g/cm³ equals 2,700 kg/m³. Going the other way, divide by 1,000.'
			},
			{
				q: 'What is the difference between density and weight?',
				a: 'Density is mass per volume, so it does not depend on how much of the material you have. Weight is a force, and it depends on gravity. The [weight calculator](/weight-calculator) shows how weight changes on other planets.'
			},
			{
				q: 'Is density the same as specific gravity?',
				a: 'Not quite. Specific gravity is the density of a material divided by the density of water, so it has no units. For most materials, the number is almost the same as density in g/cm³.'
			}
		],
		sources: [{ title: 'NIST, The International System of Units (SI), SP 330', url: 'https://www.nist.gov/pml/special-publication-330' }]
	}
});
