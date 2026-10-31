import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './mass-calculator.meta';

const isCustom = (v: InputValues) => v.material === 'custom';
const customKg = (v: InputValues) => isCustom(v) && v.densityUnit !== 'lbft3';
const customLb = (v: InputValues) => isCustom(v) && v.densityUnit === 'lbft3';

/** Typical densities in kg per cubic metre. */
const PRESETS: Record<string, number> = {
	water: 1000,
	steel: 7850,
	aluminium: 2700,
	concrete: 2400,
	pine: 500,
	gold: 19300
};

/** Cubic metres in one unit of volume. */
const M3_PER: Record<string, number> = {
	m3: 1,
	L: 0.001,
	mL: 0.000001,
	ft3: 0.0283168466,
	in3: 0.000016387064,
	gal: 0.003785411784
};

const KG_PER_LB = 0.45359237;
const LB_PER_KG = 2.20462262;
const LB_FT3_PER_KG_M3 = 0.0624279606;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'material',
			label: 'Material',
			type: 'select',
			default: 'water',
			options: [
				{ label: 'Water (1,000 kg/m³)', value: 'water' },
				{ label: 'Steel (7,850 kg/m³)', value: 'steel' },
				{ label: 'Aluminium (2,700 kg/m³)', value: 'aluminium' },
				{ label: 'Concrete (2,400 kg/m³)', value: 'concrete' },
				{ label: 'Wood, pine (500 kg/m³)', value: 'pine' },
				{ label: 'Gold (19,300 kg/m³)', value: 'gold' },
				{ label: 'Custom density', value: 'custom' }
			]
		},
		{
			id: 'densityUnit',
			label: 'Density unit',
			type: 'select',
			display: 'segmented',
			default: 'kgm3',
			visibleWhen: isCustom,
			options: [
				{ label: 'kg/m³', value: 'kgm3' },
				{ label: 'lb/ft³', value: 'lbft3' }
			]
		},
		{ id: 'customKg', label: 'Density', type: 'number', default: 2000, min: 1, max: 30000, step: 1, suffix: 'kg/m³', visibleWhen: customKg },
		{ id: 'customLb', label: 'Density', type: 'number', default: 125, min: 0.1, max: 1900, step: 0.1, suffix: 'lb/ft³', visibleWhen: customLb },
		{ id: 'volume', label: 'Volume', type: 'number', default: 20, min: 0, max: 1000000000, step: 0.01 },
		{
			id: 'volumeUnit',
			label: 'Volume unit',
			type: 'select',
			default: 'L',
			options: [
				{ label: 'Litres (L)', value: 'L' },
				{ label: 'Cubic metres (m³)', value: 'm3' },
				{ label: 'Millilitres (cm³)', value: 'mL' },
				{ label: 'Cubic feet (ft³)', value: 'ft3' },
				{ label: 'Cubic inches (in³)', value: 'in3' },
				{ label: 'US gallons (gal)', value: 'gal' }
			]
		}
	],
	calculate(v): CalculationResult {
		let densityKg: number;
		if (v.material === 'custom') {
			densityKg = v.densityUnit === 'lbft3' ? Number(v.customLb) / LB_FT3_PER_KG_M3 : Number(v.customKg);
		} else {
			densityKg = PRESETS[String(v.material)];
		}
		const perM3 = M3_PER[String(v.volumeUnit)];
		const volume = Number(v.volume);
		if (!(densityKg > 0) || !(perM3 > 0) || !(volume > 0)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Mass',
				summary: 'Pick a material and enter a volume above zero.'
			};
		}
		const volumeM3 = volume * perM3;
		const kg = densityKg * volumeM3;

		return {
			primaryResult: `${num(kg, 2)} kg`,
			primaryLabel: 'Mass',
			summary: `Mass = density × volume = ${num(densityKg, 0)} kg/m³ × ${num(volumeM3, 6)} m³.`,
			secondaryMetrics: [
				{ label: 'Mass in pounds', value: `${num(kg * LB_PER_KG, 2, 2)} lb` },
				{ label: 'Mass in grams', value: `${num(kg * 1000, 0)} g` },
				{ label: 'Density used', value: `${num(densityKg, 1)} kg/m³` },
				{ label: 'Volume in cubic metres', value: `${num(volumeM3, 6)} m³` }
			]
		};
	},
	content: {
		intro:
			'Find the mass of a material from its volume. Pick a common material such as water, steel or concrete, or enter your own density, and the mass calculator gives the answer in kilograms, pounds and grams.',
		howTo: [
			'Pick a material from the list, or choose custom density and enter your own value.',
			'Enter the volume, then choose its unit, such as litres, cubic feet or gallons.',
			'Read the mass in kilograms, then check pounds and grams if you need them.',
			'Check the density used in the summary, so you know which value the answer depends on.'
		],
		about: [
			{
				heading: 'What is mass?',
				paragraphs: [
					'Mass is the amount of matter in an object. It is measured in kilograms or grams in the metric system, and in pounds in the imperial system. Mass does not change when you move an object to another place.',
					'Mass is often confused with weight. Weight is the force of gravity on that mass. In everyday shopping, the two are used as if they were the same, which is fine on Earth.'
				]
			},
			{
				heading: 'How mass is calculated from volume',
				paragraphs: [
					'If you know the density of a material and the volume you have, the mass is density times volume. The calculator converts the volume to cubic metres, multiplies by the density in kilograms per cubic metre, and gives the mass in kilograms.',
					'The conversion is the part that most often causes mistakes. One US gallon is about 3.785 litres, and one cubic foot is about 28.32 litres. The calculator handles these for you, so you only need to pick the unit on the form. The [volume calculator](/volume-calculator) works out the volume of common shapes, and the [unit converter](/unit-converter) covers other units.'
				]
			},
			{
				heading: 'Typical densities for common materials',
				paragraphs: [
					'The materials in this calculator use typical values. Real materials vary with the alloy, the grade, the moisture content and the temperature, so the true density can be a little different.',
					'For example, wet timber is heavier than dry timber, and concrete mixes differ by aggregate and water content. When you need an exact figure, use the supplier’s data sheet.'
				],
				table: {
					caption: 'Typical densities used in this calculator',
					columns: ['Material', 'Density (kg/m³)'],
					rows: [
						['Water', '1,000'],
						['Steel', '7,850'],
						['Aluminium', '2,700'],
						['Concrete', '2,400'],
						['Pine wood', '500'],
						['Gold', '19,300']
					]
				}
			},
			{
				heading: 'Tips for estimating mass',
				paragraphs: [
					'Use the mass to check that a load is within a safe limit. A cubic metre of water weighs a tonne, so a few cubic metres of material can be far heavier than you expect.',
					'If you are planning a lift, a trailer or a shipment, add a margin for packaging and for extra material. The [density calculator](/density-calculator) can work out the density from a measured mass and volume.'
				],
				list: [
					'Use the same material type on the calculator as the one you are moving.',
					'Check the rated capacity of any lifting gear, trolley or vehicle before you load it.',
					'Count the packaging and fixings as extra mass.',
					'Round up when you plan a load, so you do not underestimate it.'
				]
			},
			{
				heading: 'Lifting and load safety',
				paragraphs: [
					'Heavy loads cause serious injuries. Use mechanical lifting aids, such as trolleys or hoists, for loads over the safe limit for one person. Lift with your legs, keep the load close to your body, and get help when needed.',
					'Overloading a vehicle or lifting equipment can cause it to fail. Check the manufacturer’s rating before you use it.'
				]
			}
		],
		formulas: [
			{
				title: 'Mass from density and volume',
				expression: 'mass = density × volume',
				variables: [
					{ symbol: 'density', meaning: 'the density of the material, in kilograms per cubic metre' },
					{ symbol: 'volume', meaning: 'the space the material fills, in cubic metres' }
				]
			},
			{
				title: 'Unit conversions',
				expression: '1 US gallon = 3.785 litres\n1 cubic foot = 28.32 litres\n1 kg = 2.2046 lb',
				variables: [{ symbol: 'lb', meaning: 'pounds, the imperial unit of mass' }]
			}
		],
		example: {
			title: '20 litres of water',
			steps: [
				'Convert the volume: 20 litres is 0.02 cubic metres',
				'Mass: 1,000 kg/m³ × 0.02 m³ = 20 kg',
				'In pounds: 20 × 2.20462 = 44.09 lb',
				'In grams: 20 × 1,000 = 20,000 g'
			],
			result: 'Twenty litres of water weighs about 20 kg, or 44.09 lb.'
		},
		faq: [
			{
				q: 'How do I find the mass of something from its volume?',
				a: 'Multiply the density of the material by the volume, in consistent units. The calculator does this, so choose the material and the volume unit.'
			},
			{
				q: 'What is the mass of a litre of water?',
				a: 'About 1 kilogram, or 2.2 pounds. Water is about 1,000 kg per cubic metre, and a litre is one thousandth of a cubic metre.'
			},
			{
				q: 'Is mass the same as weight?',
				a: 'No. Mass is the amount of matter, and weight is the force of gravity on it. Weight changes with gravity, but mass does not. The [weight calculator](/weight-calculator) shows the difference.'
			},
			{
				q: 'Why does my material have a different density here?',
				a: 'These are typical values. Your material may have a different grade, moisture level or temperature, so enter a custom density from the supplier if you have one.'
			}
		],
		sources: [{ title: 'NIST, The International System of Units (SI), SP 330', url: 'https://www.nist.gov/pml/special-publication-330' }]
	}
});
