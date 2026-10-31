import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, num } from '../format';
import meta from './gravel-calculator.meta';

/** 1 cubic yard = 0.764554858 cubic metres. */
const M3_PER_YD3 = 0.764554858;
const FT3_PER_YD3 = 27;

const pos = (n: number) => Number.isFinite(n) && n > 0;

const imperialRect = (v: InputValues) => v.units === 'imperial' && v.shape === 'rectangle';
const imperialCircle = (v: InputValues) => v.units === 'imperial' && v.shape === 'circle';
const metricRect = (v: InputValues) => v.units === 'metric' && v.shape === 'rectangle';
const metricCircle = (v: InputValues) => v.units === 'metric' && v.shape === 'circle';
const imperial = (v: InputValues) => v.units === 'imperial';
const metric = (v: InputValues) => v.units === 'metric';

function invalid(summary: string): CalculationResult {
	return { primaryResult: DASH, primaryLabel: 'Gravel needed', summary };
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'shape',
			label: 'Shape',
			type: 'select',
			display: 'segmented',
			default: 'rectangle',
			options: [
				{ label: 'Rectangle', value: 'rectangle' },
				{ label: 'Circle', value: 'circle' }
			]
		},
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'imperial',
			options: [
				{ label: 'Feet and inches', value: 'imperial' },
				{ label: 'Metric (m, cm)', value: 'metric' }
			]
		},
		// Feet and inches: rectangle
		{ id: 'lenFt', label: 'Length (feet)', type: 'number', default: 20, min: 0, max: 1000, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: imperialRect },
		{ id: 'lenIn', label: 'Length (inches)', type: 'number', default: 0, min: 0, max: 11.5, step: 0.5, suffix: 'in', width: 'half', visibleWhen: imperialRect },
		{ id: 'widFt', label: 'Width (feet)', type: 'number', default: 10, min: 0, max: 1000, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: imperialRect },
		{ id: 'widIn', label: 'Width (inches)', type: 'number', default: 0, min: 0, max: 11.5, step: 0.5, suffix: 'in', width: 'half', visibleWhen: imperialRect },
		// Feet and inches: circle
		{ id: 'diaFt', label: 'Diameter (feet)', type: 'number', default: 10, min: 0, max: 1000, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: imperialCircle },
		{ id: 'diaIn', label: 'Diameter (inches)', type: 'number', default: 0, min: 0, max: 11.5, step: 0.5, suffix: 'in', width: 'half', visibleWhen: imperialCircle },
		// Metric: rectangle and circle
		{ id: 'lenM', label: 'Length', type: 'number', default: 6, min: 0, max: 1000, step: 0.1, suffix: 'm', width: 'half', visibleWhen: metricRect },
		{ id: 'widM', label: 'Width', type: 'number', default: 4, min: 0, max: 1000, step: 0.1, suffix: 'm', width: 'half', visibleWhen: metricRect },
		{ id: 'diaM', label: 'Diameter', type: 'number', default: 3, min: 0, max: 1000, step: 0.1, suffix: 'm', visibleWhen: metricCircle },
		// Depth
		{ id: 'depthIn', label: 'Depth', type: 'number', default: 3, min: 0.5, max: 36, step: 0.5, suffix: 'in', help: 'Two to four inches is common for paths and driveways.', visibleWhen: imperial },
		{ id: 'depthCm', label: 'Depth', type: 'number', default: 5, min: 0.5, max: 100, step: 0.5, suffix: 'cm', visibleWhen: metric },
		// Material and cost
		{
			id: 'densityTon',
			label: 'Density',
			type: 'number',
			default: 1.4,
			min: 0.1,
			max: 10,
			step: 0.01,
			suffix: 'tons/yd³',
			help: 'US tons of 2,000 lb. Check your supplier for their figure.',
			visibleWhen: imperial
		},
		{
			id: 'densityT',
			label: 'Density',
			type: 'number',
			default: 1.6,
			min: 0.1,
			max: 10,
			step: 0.01,
			suffix: 't/m³',
			help: 'Metric tonnes of 1,000 kg. Check your supplier for their figure.',
			visibleWhen: metric
		},
		{
			id: 'waste',
			label: 'Waste allowance',
			type: 'number',
			default: 10,
			min: 0,
			max: 50,
			step: 1,
			suffix: '%',
			help: 'Extra for spreading, settling and uneven ground.'
		},
		{
			id: 'priceTon',
			label: 'Price per ton (optional)',
			type: 'number',
			default: 40,
			min: 0,
			max: 100000,
			step: 0.01,
			prefix: '$',
			suffix: '/ton',
			help: 'Set to 0 to leave out the cost.',
			visibleWhen: imperial
		},
		{
			id: 'priceT',
			label: 'Price per tonne (optional)',
			type: 'number',
			default: 44,
			min: 0,
			max: 100000,
			step: 0.01,
			prefix: '$',
			suffix: '/tonne',
			help: 'Set to 0 to leave out the cost.',
			visibleWhen: metric
		}
	],
	calculate(v): CalculationResult {
		const isMetric = v.units === 'metric';
		const isRect = v.shape === 'rectangle';
		const waste = Number(v.waste);
		const density = Number(isMetric ? v.densityT : v.densityTon);
		const price = Number(isMetric ? v.priceT : v.priceTon);

		if (!Number.isFinite(waste) || waste < 0) return invalid('Enter a waste allowance of 0% or more.');
		if (!pos(density)) return invalid('Enter a density greater than zero.');
		if (!Number.isFinite(price) || price < 0) return invalid('The price cannot be negative.');

		// Volume before waste, in cubic metres and cubic yards.
		let volM3: number;
		let volYd3: number;
		if (isMetric) {
			const area = isRect ? Number(v.lenM) * Number(v.widM) : Math.PI * (Number(v.diaM) / 2) ** 2;
			const depth = Number(v.depthCm) / 100;
			const sizesOk = isRect ? pos(Number(v.lenM)) && pos(Number(v.widM)) : pos(Number(v.diaM));
			if (!sizesOk || !pos(depth)) return invalid('Enter sizes greater than zero for every dimension.');
			volM3 = area * depth;
			volYd3 = volM3 / M3_PER_YD3;
		} else {
			const len = Number(v.lenFt) + Number(v.lenIn) / 12;
			const wid = Number(v.widFt) + Number(v.widIn) / 12;
			const dia = Number(v.diaFt) + Number(v.diaIn) / 12;
			const area = isRect ? len * wid : Math.PI * (dia / 2) ** 2;
			const depthFt = Number(v.depthIn) / 12;
			const sizesOk = isRect ? pos(len) && pos(wid) : pos(dia);
			if (!sizesOk || !pos(depthFt)) return invalid('Enter sizes greater than zero for every dimension.');
			const volFt3 = area * depthFt;
			volYd3 = volFt3 / FT3_PER_YD3;
			volM3 = volYd3 * M3_PER_YD3;
		}

		const factor = 1 + waste / 100;
		const withWasteYd3 = volYd3 * factor;
		const withWasteM3 = volM3 * factor;
		// Weight is volume × density, in the matching unit: tons, or tonnes for metric.
		const weight = isMetric ? withWasteM3 * density : withWasteYd3 * density;
		const cost = weight * price;

		return {
			primaryResult: isMetric ? `${num(withWasteM3, 2, 2)} m³` : `${num(withWasteYd3, 2, 2)} cu yd`,
			primaryLabel: 'Gravel needed',
			summary: `Includes ${num(waste, 0)}% waste. Weight uses a density of ${num(density, 2, 2)} ${isMetric ? 't/m³' : 'tons/yd³'}.`,
			secondaryMetrics: [
				{ label: 'Volume before waste', value: `${num(volYd3, 2, 2)} cu yd (${num(volM3, 2, 2)} m³)` },
				{ label: 'Volume with waste', value: `${num(withWasteYd3, 2, 2)} cu yd (${num(withWasteM3, 2, 2)} m³)` },
				{ label: isMetric ? 'Weight in tonnes' : 'Weight in tons', value: `${num(weight, 2, 2)} ${isMetric ? 'tonnes' : 'tons'}` },
				{ label: 'Cost', value: price > 0 ? money(cost) : DASH }
			]
		};
	},
	content: {
		intro:
			'Estimate how much gravel or crushed stone a path, driveway, base or patio needs. The gravel calculator gives the volume in cubic yards or cubic metres, the weight in tons or tonnes, and the cost.',
		howTo: [
			'Choose a rectangle or a circle, then pick feet and inches or metres.',
			'Enter the size of the area and the depth of the gravel layer.',
			'Check the density, which depends on the stone. Use your supplier’s figure if you have one.',
			'Add a waste allowance, and an optional price per ton or tonne, then read the volume and the weight to order.'
		],
		about: [
			{
				heading: 'What is gravel volume?',
				paragraphs: [
					'Gravel is sold by weight in many places, but it is spread by volume. The [volume calculator](/volume-calculator) covers other shapes. This calculator starts with the volume you need, then converts it to weight so you can compare quotes. Suppliers may quote by the cubic yard, the cubic metre, the ton or the tonne.',
					'Gravel is used for driveways, paths, drainage, patios and the base under concrete or paving. The depth you choose matters more than most people expect. A few centimetres more depth can add a lot of material.'
				]
			},
			{
				heading: 'How gravel volume is calculated',
				paragraphs: [
					'The volume is the area of the surface times the depth. For a rectangle, the area is length times width. For a circle, the area is pi times the radius squared. The depth must be in the same unit as the area, so the calculator converts inches to feet, or centimetres to metres, for you.',
					'Weight comes from density. Multiply the volume by the density of the stone to get the weight. Crushed stone, river gravel and limestone have different densities, and wet material is heavier than dry. That is why the calculator asks for a density. The [density calculator](/density-calculator) works the same relationship in reverse.'
				]
			},
			{
				heading: 'Cubic yards, tons and tonnes',
				paragraphs: [
					'In the United States, a ton is 2,000 pounds, also called a short ton. A metric tonne is 1,000 kilograms, which is about 2,205 pounds. The difference is about 10%, so check which one your supplier uses before you order.',
					'One cubic yard is 27 cubic feet, or about 0.76 cubic metres. The metric default in this calculator is 1.6 tonnes per cubic metre. The exact figure depends on the stone, so use the supplier’s density when you can.'
				]
			},
			{
				heading: 'Tips for ordering gravel',
				paragraphs: [
					'Order a little extra. Gravel settles and spreads unevenly, and some sinks into the ground. Waste of 10% is a common starting point, but use more on soft or uneven ground.',
					'If you are laying gravel over soil, compare the result with the [mulch calculator](/mulch-calculator) for a planting bed, or the [concrete calculator](/concrete-calculator) for a base under a slab.'
				],
				list: [
					'Measure the depth at several points. Compacted gravel is thinner than loose gravel.',
					'Ask whether the price includes delivery. A short load can cost more per ton.',
					'Check the local rules for drainage, erosion control and permeable surfaces.',
					'Consider a weed membrane under the gravel if you want fewer weeds.'
				]
			},
			{
				heading: 'Safety with gravel and heavy loads',
				paragraphs: [
					'Gravel is heavy. A full wheelbarrow can be too much to push over soft ground, so take smaller loads. Wear gloves, sturdy boots and eye protection when you shovel or spread stone.',
					'Before you dig, contact your local utility locator service. In the United States, call 811. Stand well clear of a tipping truck when it unloads, because the load can shift suddenly.'
				]
			}
		],
		formulas: [
			{
				title: 'Volume',
				expression: 'Volume = area × depth',
				variables: [
					{ symbol: 'area', meaning: 'length × width for a rectangle, or π × (diameter ÷ 2)² for a circle' },
					{ symbol: 'depth', meaning: 'the thickness of the layer, in the same unit as the area' }
				]
			},
			{
				title: 'Volume with waste',
				expression: 'Volume with waste = volume × (1 + waste ÷ 100)',
				variables: [{ symbol: 'waste', meaning: 'the allowance for spreading, settling and uneven ground, as a percentage' }]
			},
			{
				title: 'Weight and cost',
				expression: 'Weight = volume with waste × density\nCost = weight × price per ton or tonne',
				variables: [
					{ symbol: 'density', meaning: 'tons per cubic yard, or tonnes per cubic metre, from your supplier' },
					{ symbol: 'price', meaning: 'the price per ton or tonne, if you set one' }
				]
			}
		],
		example: {
			title: 'A 20 ft by 10 ft area, 3 inches deep, at 1.4 tons per cubic yard',
			steps: [
				'Volume: 20 × 10 × (3 ÷ 12) = 50 cubic feet, or 50 ÷ 27 = 1.85 cubic yards',
				'With waste: 1.85 × 1.10 = 2.04 cubic yards',
				'Weight: 2.037 × 1.4 = 2.85 tons',
				'Cost at $40 per ton: 2.852 × $40 = $114.07'
			],
			result: 'Order about 2.04 cubic yards of gravel, which weighs about 2.85 tons and costs about $114.07.'
		},
		faq: [
			{
				q: 'How much gravel do I need for a driveway?',
				a: 'Work out the area in feet or metres, then multiply by the depth. Driveways often use a deeper base than paths, so check your plan and local practice. Add waste, then round up to the supplier’s smallest load.'
			},
			{
				q: 'How many tons are in a cubic yard of gravel?',
				a: 'It depends on the stone and how wet it is. This calculator uses 1.4 tons per cubic yard by default, but your supplier’s figure is the best guide. Change the density to match it.'
			},
			{
				q: 'Is a ton the same as a tonne?',
				a: 'No. A US ton is 2,000 pounds, and a metric tonne is 1,000 kilograms. The tonne is about 10% heavier, so check which unit your supplier uses.'
			},
			{
				q: 'Why does the calculator ask for a waste allowance?',
				a: 'Gravel spreads, settles and sinks into soft ground, so the final layer is often thinner than planned. A waste allowance covers that gap and avoids a shortage halfway through the job.'
			}
		],
		sources: [{ title: 'NIST, The International System of Units (SI), SP 330', url: 'https://www.nist.gov/pml/special-publication-330' }]
	}
});
