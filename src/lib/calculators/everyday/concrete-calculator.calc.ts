import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num, plural } from '../format';
import meta from './concrete-calculator.meta';

/** 1 m³ = 35.3146667 ft³. */
const FT3_PER_M3 = 35.3146667;
/** Yield of a single bag, in cubic feet. */
const BAG_60_FT3 = 0.45;
const BAG_80_FT3 = 0.6;

const pos = (x: number) => Number.isFinite(x) && x > 0;

/** Show a field only for one unit system and one kind of shape (slab, or round column/hole). */
const show = (units: 'imperial' | 'metric', kind: 'slab' | 'round') => (v: InputValues) =>
	v.units === units && (kind === 'slab' ? v.shape === 'slab' : v.shape !== 'slab');

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'shape',
			label: 'Shape',
			type: 'select',
			display: 'menu',
			default: 'slab',
			options: [
				{ label: 'Slab or footing', value: 'slab' },
				{ label: 'Round column', value: 'column' },
				{ label: 'Round hole or post', value: 'hole' }
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
		// Feet and inches: slab
		{ id: 'lenFt', label: 'Length (feet)', type: 'number', default: 10, min: 0, max: 1000, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: show('imperial', 'slab') },
		{ id: 'lenIn', label: 'Length (inches)', type: 'number', default: 0, min: 0, max: 11.9, step: 0.5, suffix: 'in', width: 'half', visibleWhen: show('imperial', 'slab') },
		{ id: 'widFt', label: 'Width (feet)', type: 'number', default: 12, min: 0, max: 1000, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: show('imperial', 'slab') },
		{ id: 'widIn', label: 'Width (inches)', type: 'number', default: 0, min: 0, max: 11.9, step: 0.5, suffix: 'in', width: 'half', visibleWhen: show('imperial', 'slab') },
		{ id: 'thIn', label: 'Thickness', type: 'number', default: 4, min: 0.5, max: 60, step: 0.5, suffix: 'in', visibleWhen: show('imperial', 'slab') },
		// Feet and inches: round column, hole or post
		{ id: 'diaIn', label: 'Diameter', type: 'number', default: 12, min: 0.5, max: 240, step: 0.5, suffix: 'in', visibleWhen: show('imperial', 'round') },
		{ id: 'hFt', label: 'Height or depth (feet)', type: 'number', default: 8, min: 0, max: 1000, step: 1, suffix: 'ft', decimal: false, width: 'half', visibleWhen: show('imperial', 'round') },
		{ id: 'hIn', label: 'Height or depth (inches)', type: 'number', default: 0, min: 0, max: 11.9, step: 0.5, suffix: 'in', width: 'half', visibleWhen: show('imperial', 'round') },
		// Metric: slab
		{ id: 'lenM', label: 'Length', type: 'number', default: 3, min: 0, max: 1000, step: 0.01, suffix: 'm', visibleWhen: show('metric', 'slab') },
		{ id: 'widM', label: 'Width', type: 'number', default: 4, min: 0, max: 1000, step: 0.01, suffix: 'm', visibleWhen: show('metric', 'slab') },
		{ id: 'thCm', label: 'Thickness', type: 'number', default: 10, min: 0.5, max: 2000, step: 0.5, suffix: 'cm', visibleWhen: show('metric', 'slab') },
		// Metric: round column, hole or post
		{ id: 'diaCm', label: 'Diameter', type: 'number', default: 30, min: 0.5, max: 5000, step: 0.5, suffix: 'cm', visibleWhen: show('metric', 'round') },
		{ id: 'hM', label: 'Height or depth', type: 'number', default: 2.4, min: 0, max: 1000, step: 0.01, suffix: 'm', visibleWhen: show('metric', 'round') },
		{
			id: 'waste',
			label: 'Waste allowance',
			type: 'number',
			default: 10,
			min: 0,
			max: 50,
			step: 1,
			suffix: '%',
			help: 'Extra for spills, uneven ground and over-digging.'
		}
	],
	calculate(v): CalculationResult {
		const imperial = v.units === 'imperial';
		const isSlab = v.shape === 'slab';
		const waste = Number(v.waste);
		if (!Number.isFinite(waste) || waste < 0) {
			return { primaryResult: DASH, primaryLabel: 'Concrete needed', summary: 'Enter a waste allowance of 0% or more.' };
		}

		// Volume in cubic feet (imperial) or cubic metres (metric), before waste.
		let volFt3: number;
		let volM3: number;
		if (imperial) {
			const length = Number(v.lenFt) + Number(v.lenIn) / 12;
			const width = Number(v.widFt) + Number(v.widIn) / 12;
			const thickness = Number(v.thIn) / 12;
			const height = Number(v.hFt) + Number(v.hIn) / 12;
			const diameter = Number(v.diaIn) / 12;
			if (isSlab) {
				if (!pos(length) || !pos(width) || !pos(thickness)) return invalid();
				volFt3 = length * width * thickness;
			} else {
				if (!pos(diameter) || !pos(height)) return invalid();
				volFt3 = Math.PI * (diameter / 2) ** 2 * height;
			}
			volM3 = volFt3 / FT3_PER_M3;
		} else {
			const length = Number(v.lenM);
			const width = Number(v.widM);
			const thickness = Number(v.thCm) / 100;
			const height = Number(v.hM);
			const diameter = Number(v.diaCm) / 100;
			if (isSlab) {
				if (!pos(length) || !pos(width) || !pos(thickness)) return invalid();
				volM3 = length * width * thickness;
			} else {
				if (!pos(diameter) || !pos(height)) return invalid();
				volM3 = Math.PI * (diameter / 2) ** 2 * height;
			}
			volFt3 = volM3 * FT3_PER_M3;
		}

		const factor = 1 + waste / 100;
		const withWasteFt3 = volFt3 * factor;
		const withWasteM3 = volM3 * factor;
		const cubicYards = withWasteFt3 / 27;
		// A tiny epsilon stops exact multiples from rounding up an extra bag.
		const bags60 = Math.ceil(withWasteFt3 / BAG_60_FT3 - 1e-9);
		const bags80 = Math.ceil(withWasteFt3 / BAG_80_FT3 - 1e-9);

		return {
			primaryResult: imperial ? `${num(cubicYards, 2, 2)} cu yd` : `${num(withWasteM3, 2, 2)} m³`,
			primaryLabel: 'Concrete needed',
			summary: `Includes ${num(waste, 0)}% waste. Bag counts are for mixing by hand.`,
			secondaryMetrics: [
				{ label: 'Volume before waste', value: `${num(volFt3 / 27, 2, 2)} cu yd (${num(volM3, 2, 2)} m³)` },
				{ label: 'Volume with waste', value: `${num(cubicYards, 2, 2)} cu yd (${num(withWasteM3, 2, 2)} m³)` },
				{ label: '60 lb bags (0.45 cu ft each)', value: plural(bags60, 'bag') },
				{ label: '80 lb bags (0.6 cu ft each)', value: plural(bags80, 'bag') }
			]
		};
	},
	content: {
		intro:
			'Estimate how much concrete a slab, footing, column or post needs. You get the volume in cubic yards or cubic metres, plus the number of 60 lb and 80 lb bags if you mix by hand.',
		howTo: [
			'Choose the shape: a slab or footing, a round column, or a round hole or post.',
			'Pick feet and inches or metres and centimetres, then enter the size of the shape.',
			'Set a waste allowance. The default of 10% covers spills, over-digging and uneven ground.',
			'Read the volume to order. If you mix by hand, use the bag count instead.'
		],
		about: [
			{
				heading: 'What this concrete calculator does',
				paragraphs: [
					'Concrete is sold by volume. Ready-mix trucks deliver it in cubic yards or cubic metres, and bagged mixes state a yield per bag. This tool turns the size of your pour into a volume, so you know how much to order. If you only need the area first, the [square footage calculator](/square-footage-calculator) works that out.',
					'Most people order a little extra. Concrete is hard to fix once it sets, so a small surplus is safer than a shortage. For that reason, the calculator adds 10% by default. You can change it.'
				]
			},
			{
				heading: 'How concrete volume is calculated',
				paragraphs: [
					'A slab or footing is a box. Multiply its length, width and thickness. A round column, post or hole is a cylinder. Its volume is the area of the circle at the top times the height or depth.',
					'First, make sure every measurement uses the same unit. Thickness is often given in inches or centimetres, while the other sides may be in feet or metres. Converting before you multiply avoids the most common error. The [volume calculator](/volume-calculator) shows the same steps for other shapes. For example, 4 inches is one third of a foot, not 4 feet.'
				]
			},
			{
				heading: 'Cubic yards, cubic metres and bags',
				paragraphs: [
					'One cubic yard is 27 cubic feet, or about 0.76 cubic metres. One cubic metre is about 35.3 cubic feet, or 1.31 cubic yards. Many suppliers outside North America sell concrete by the cubic metre, so check which unit your quote uses.',
					'A 60 lb bag yields about 0.45 cubic feet of mixed concrete. An 80 lb bag yields about 0.6 cubic feet. Bag yields vary a little by brand, so read the figure printed on the bag. Mixing by hand is slow for anything larger than a small patio or a few posts. For loose materials, the [gravel calculator](/gravel-calculator) and [mulch calculator](/mulch-calculator) use the same volume steps.'
				],
				table: {
					caption: 'Common bag yields used in this calculator',
					columns: ['Bag size', 'Yield (cubic feet)', 'Yield (litres, approx.)'],
					rows: [
						['60 lb (about 27 kg)', '0.45', '13'],
						['80 lb (about 36 kg)', '0.6', '17']
					]
				}
			},
			{
				heading: 'Tips for ordering concrete',
				paragraphs: [
					'Measure the pour where it will sit, not the size of the plan on paper. Check the thickness at several points, because the ground is rarely perfectly level.',
					'Ask the supplier about delivery time, minimum order and the cost of a short load. These details matter as much as the volume.'
				],
				list: [
					'Add 5% to 10% for waste on simple slabs. Add more for uneven ground or lots of over-digging.',
					'Round to the nearest quarter yard or half cubic metre if your supplier sells that way, but ask first.',
					'Order a little more for steps, curbs or a lip around the edge, because they add volume.',
					'Have people, tools and forms ready before the truck arrives, so the pour is not held up.',
					'Check local rules for footing depth, steel reinforcement and formwork before you pour.'
				]
			},
			{
				heading: 'Safety when you work with concrete',
				paragraphs: [
					'Wet concrete is alkaline and can cause burns on skin. Wear waterproof gloves, long sleeves, boots and eye protection. If it gets in your eyes, rinse them with clean water for at least 15 minutes and seek medical help.',
					'Before you dig for a footing or post, contact your local utility locator service. In the United States, call 811. Many other countries have a similar service. Hitting a buried cable or pipe can cause serious injury.'
				]
			}
		],
		formulas: [
			{
				title: 'Slab or footing',
				expression: 'Volume = length × width × thickness',
				variables: [
					{ symbol: 'length, width', meaning: 'the sides of the slab, in the same unit' },
					{ symbol: 'thickness', meaning: 'the depth of the pour, converted to the same unit as the sides' }
				]
			},
			{
				title: 'Round column, hole or post',
				expression: 'Volume = π × (diameter ÷ 2)² × height',
				variables: [
					{ symbol: 'π', meaning: 'about 3.14159' },
					{ symbol: 'diameter', meaning: 'the finished width of the column, or the width of the hole' },
					{ symbol: 'height', meaning: 'the height of the column, or the depth of the hole' }
				]
			},
			{
				title: 'Waste and bags',
				expression: 'Volume with waste = volume × (1 + waste ÷ 100)\nBags = volume in cubic feet ÷ bag yield',
				variables: [
					{ symbol: 'waste', meaning: 'the waste allowance as a percentage, for example 10' },
					{ symbol: 'bag yield', meaning: '0.45 cubic feet for a 60 lb bag, 0.6 cubic feet for an 80 lb bag' }
				]
			}
		],
		example: {
			title: 'A 10 ft by 12 ft slab, 4 inches thick, with 10% waste',
			steps: [
				'Volume: 10 × 12 × (4 ÷ 12) = 40 cubic feet',
				'With waste: 40 × 1.10 = 44 cubic feet, or 44 ÷ 27 = 1.63 cubic yards',
				'60 lb bags: 44 ÷ 0.45 = 97.8, rounded up to 98 bags',
				'80 lb bags: 44 ÷ 0.6 = 73.3, rounded up to 74 bags'
			],
			result: 'Order about 1.63 cubic yards, or 98 bags of 60 lb concrete.'
		},
		faq: [
			{
				q: 'How much concrete should I order for a slab?',
				a: 'Work out the volume, add 5% to 10% for waste and uneven ground, then round up. Ask your supplier for their smallest increment, because many sell in set amounts. Bagged mix needs the bag count instead.'
			},
			{
				q: 'Is a 60 lb bag the same as an 80 lb bag?',
				a: 'No. A 60 lb bag yields about 0.45 cubic feet of mixed concrete and an 80 lb bag yields about 0.6 cubic feet. Check the yield on the bag, because brands differ.'
			},
			{
				q: 'Why does a round column use a different formula?',
				a: 'A round column is a cylinder, so its volume is the area of its circular top times its height. Use the finished diameter of the column, and the depth for a hole or post.'
			},
			{
				q: 'How thick should a concrete slab be?',
				a: 'Thickness depends on the load, the ground and local rules. Many light slabs for paths or patios are 4 inches (about 10 cm) thick, while driveways and heavy loads often need more. Check your local building code.'
			},
			{
				q: 'Does this calculator include steel reinforcement?',
				a: 'No. It measures only the concrete. Steel bars or mesh take up a small amount of space, and they are sized by your engineer or local code, not by this tool.'
			}
		],
		sources: [{ title: 'American Concrete Institute', url: 'https://www.concrete.org/' }]
	}
});

function invalid(): CalculationResult {
	return {
		primaryResult: DASH,
		primaryLabel: 'Concrete needed',
		summary: 'Enter sizes greater than zero for every dimension.'
	};
}
