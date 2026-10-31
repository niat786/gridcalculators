import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './mulch-calculator.meta';

const FT3_PER_YD3 = 27;
const SMALL_BAG_FT3 = 2;
const LARGE_BAG_FT3 = 3;

const isRect = (v: InputValues) => v.shape === 'rectangle';
const isCircle = (v: InputValues) => v.shape === 'circle';

const pos = (n: number) => Number.isFinite(n) && n > 0;

function invalid(summary: string): CalculationResult {
	return { primaryResult: DASH, primaryLabel: 'Mulch needed', summary };
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
		{ id: 'lenFt', label: 'Length', type: 'number', default: 20, min: 0.5, max: 1000, step: 0.5, suffix: 'ft', width: 'half', visibleWhen: isRect },
		{ id: 'widFt', label: 'Width', type: 'number', default: 15, min: 0.5, max: 1000, step: 0.5, suffix: 'ft', width: 'half', visibleWhen: isRect },
		{ id: 'diaFt', label: 'Diameter', type: 'number', default: 12, min: 0.5, max: 1000, step: 0.5, suffix: 'ft', visibleWhen: isCircle },
		{
			id: 'depthIn',
			label: 'Depth',
			type: 'number',
			default: 3,
			min: 0.5,
			max: 24,
			step: 0.5,
			suffix: 'in',
			help: 'Most beds use 2 to 3 inches of mulch.'
		},
		{
			id: 'price2',
			label: 'Price per 2 cu ft bag (optional)',
			type: 'number',
			default: 4.5,
			min: 0,
			max: 10000,
			step: 0.01,
			prefix: '$',
			suffix: '/bag',
			help: 'Set to 0 to leave out the cost.'
		},
		{
			id: 'price3',
			label: 'Price per 3 cu ft bag (optional)',
			type: 'number',
			default: 6.75,
			min: 0,
			max: 10000,
			step: 0.01,
			prefix: '$',
			suffix: '/bag',
			help: 'Set to 0 to leave out the cost.'
		}
	],
	calculate(v): CalculationResult {
		const rect = v.shape === 'rectangle';
		const len = Number(v.lenFt);
		const wid = Number(v.widFt);
		const dia = Number(v.diaFt);
		const depthIn = Number(v.depthIn);
		const price2 = Number(v.price2);
		const price3 = Number(v.price3);

		if (rect ? !pos(len) || !pos(wid) : !pos(dia)) {
			return invalid('Enter a length and width, or a diameter, greater than zero.');
		}
		if (!pos(depthIn)) return invalid('Enter a depth greater than zero.');
		if (!(price2 >= 0) || !(price3 >= 0)) return invalid('The price cannot be negative.');

		const area = rect ? len * wid : Math.PI * (dia / 2) ** 2;
		// Volume = area × depth. Depth is in inches, so divide by 12 to get feet.
		const volFt3 = area * (depthIn / 12);
		const volYd3 = volFt3 / FT3_PER_YD3;
		// A small epsilon stops exact multiples from adding an extra bag.
		const bags2 = Math.ceil(volFt3 / SMALL_BAG_FT3 - 1e-9);
		const bags3 = Math.ceil(volFt3 / LARGE_BAG_FT3 - 1e-9);

		return {
			primaryResult: `${num(volYd3, 2, 2)} cu yd`,
			primaryLabel: 'Mulch needed',
			summary: `Covers ${num(area, 1)} sq ft at ${num(depthIn, 1)} inches deep.`,
			secondaryMetrics: [
				{ label: 'Volume in cubic feet', value: `${num(volFt3, 2)} cu ft` },
				{ label: '2 cu ft bags', value: plural(bags2, 'bag') },
				{ label: '3 cu ft bags', value: plural(bags3, 'bag') },
				{ label: 'Cost with 2 cu ft bags', value: price2 > 0 ? money(bags2 * price2) : DASH },
				{ label: 'Cost with 3 cu ft bags', value: price3 > 0 ? money(bags3 * price3) : DASH }
			]
		};
	},
	content: {
		intro:
			'Work out how much mulch a garden bed, border or circle of trees needs. The mulch calculator gives the volume in cubic yards and the number of 2 cu ft and 3 cu ft bags, with the cost if you enter a price.',
		howTo: [
			'Choose a rectangle for a bed, or a circle for a tree ring or round border.',
			'Enter the length and width in feet, or the diameter for a circle.',
			'Set the depth in inches. Most beds use 2 to 3 inches.',
			'Enter the price for each bag size if you want the cost, then read the volume and bag count.'
		],
		about: [
			{
				heading: 'What mulch does for a garden',
				paragraphs: [
					'Mulch is a layer of material spread over soil. It helps keep moisture in, slows weeds and keeps the soil cooler in hot weather. Common types include bark chips, wood chips, shredded leaves and compost.',
					'Mulch breaks down over time, so the layer gets thinner each year. That is why you top it up, and why the depth in this calculator matters.'
				]
			},
			{
				heading: 'How mulch volume is calculated',
				paragraphs: [
					'Volume is the area of the bed times the depth. The [square footage calculator](/square-footage-calculator) gives the area first if you need it, and the [volume calculator](/volume-calculator) covers other shapes. Measure the bed in feet, and convert the depth from inches to feet by dividing by 12. Then the volume is in cubic feet, which you can convert to cubic yards by dividing by 27.',
					'Mulch bags are often sold by cubic feet, although many countries use litres. A 2 cu ft bag holds two cubic feet of material, and a 3 cu ft bag holds three. The calculator rounds up the number of bags, so you never fall short.'
				]
			},
			{
				heading: 'Depth and how much to use',
				paragraphs: [
					'Two to three inches is a common depth for most garden beds. Deeper mulch can keep water in and weeds down, but too much can hold too much moisture against plants and roots. Less than two inches may not be enough to suppress weeds.',
					'Keep mulch a few centimetres away from the stems and trunks of plants. Piling mulch high against a tree trunk can cause rot, so many extension services advise against it.'
				]
			},
			{
				heading: 'Bags or bulk: which is cheaper?',
				paragraphs: [
					'For a small bed, bags are convenient. For a large area, a bulk delivery is usually cheaper per cubic foot, although it needs space to tip and spread. Compare the price per cubic foot or per cubic yard before you choose.',
					'The calculator gives the cost for both bag sizes, so you can compare prices. The [gravel calculator](/gravel-calculator) works in the same way for stone.'
				],
				list: [
					'Clear weeds and dig out roots before you spread mulch.',
					'Water the bed before and after you spread mulch.',
					'Top up each year rather than piling a deep layer all at once.',
				]
			},
			{
				heading: 'Safety when you handle mulch',
				paragraphs: [
					'Some mulches, especially old or damp wood chips and compost, can grow mould. Wear a dust mask when you open bags or shovel dry material. Wash your hands afterwards.',
					'If you buy mulch that has been treated or dyed, check the label. Keep pets away from freshly spread mulch.'
				]
			}
		],
		formulas: [
			{
				title: 'Volume',
				expression: 'Volume (cubic feet) = area × (depth ÷ 12)',
				variables: [
					{ symbol: 'area', meaning: 'length × width for a rectangle, or π × (diameter ÷ 2)² for a circle, in square feet' },
					{ symbol: 'depth ÷ 12', meaning: 'the depth in inches, converted to feet' }
				]
			},
			{
				title: 'Cubic yards',
				expression: 'Volume (cubic yards) = volume (cubic feet) ÷ 27',
				variables: [{ symbol: '27', meaning: 'the number of cubic feet in one cubic yard' }]
			},
			{
				title: 'Bags and cost',
				expression: 'Bags = ⌈ volume (cubic feet) ÷ bag size ⌉\nCost = bags × price per bag',
				variables: [{ symbol: 'bag size', meaning: '2 cubic feet or 3 cubic feet, as printed on the bag' }]
			}
		],
		example: {
			title: 'A 20 ft by 15 ft bed, 3 inches deep',
			steps: [
				'Area: 20 × 15 = 300 square feet',
				'Volume: 300 × (3 ÷ 12) = 75 cubic feet',
				'In cubic yards: 75 ÷ 27 = 2.78 cubic yards',
				'2 cu ft bags: 75 ÷ 2 = 37.5, rounded up to 38 bags. At $4.50 each, that is $171.00.',
				'3 cu ft bags: 75 ÷ 3 = 25 bags. At $6.75 each, that is $168.75.'
			],
			result: 'Buy about 2.78 cubic yards, which is 38 bags of 2 cubic feet or 25 bags of 3 cubic feet.'
		},
		faq: [
			{
				q: 'How much mulch do I need for a garden bed?',
				a: 'Measure the bed in feet, multiply the length by the width, then multiply by the depth in feet. Use 2 to 3 inches as a starting depth. The calculator does this and shows the bags you need.'
			},
			{
				q: 'How deep should mulch be?',
				a: 'Two to three inches is common for most garden beds. Thinner mulch may not stop weeds, and very deep mulch can hold too much moisture around plants.'
			},
			{
				q: 'Is 2 cubic feet of mulch the same as one bag?',
				a: 'Only if the bag says so. Most bags are labelled 2 cubic feet or 3 cubic feet, but yields vary by brand, so check the label before you order.'
			},
			{
				q: 'Can I use this calculator for a tree ring?',
				a: 'Yes, choose a circle and enter the diameter of the ring. Keep the mulch away from the trunk, because a deep pile against the bark can cause rot.'
			}
		],
		sources: [{ title: 'eXtension, land-grant university garden and landscape guidance', url: 'https://extension.org/' }]
	}
});
