import { defineCalculator, type CalculationResult, type InputValues, type NumberInput } from '../types';
import { DASH, money, num } from '../format';
import meta from './square-footage-calculator.meta';

const SQ_M_PER_SQ_FT = 0.09290304;

type Shape = 'rectangle' | 'circle' | 'triangle';

/** One dimension in both unit systems, shown only for its shape and the chosen units. */
const dim = (id: string, label: string, shape: Shape, def: { ft: number; m: number }): NumberInput[] => [
	{
		id: `${id}Ft`,
		label,
		type: 'number',
		default: def.ft,
		min: 0,
		max: 1000000,
		step: 0.1,
		suffix: 'ft',
		visibleWhen: (v: InputValues) => v.shape === shape && v.units === 'ft'
	},
	{
		id: `${id}M`,
		label,
		type: 'number',
		default: def.m,
		min: 0,
		max: 1000000,
		step: 0.1,
		suffix: 'm',
		visibleWhen: (v: InputValues) => v.shape === shape && v.units === 'm'
	}
];

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
				{ label: 'Circle', value: 'circle' },
				{ label: 'Triangle', value: 'triangle' }
			]
		},
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'ft',
			options: [
				{ label: 'Feet (sq ft)', value: 'ft' },
				{ label: 'Metres (sq m)', value: 'm' }
			]
		},
		...dim('rectLen', 'Length', 'rectangle', { ft: 12, m: 4 }),
		...dim('rectWid', 'Width', 'rectangle', { ft: 10, m: 3 }),
		...dim('circDia', 'Diameter', 'circle', { ft: 10, m: 2 }),
		...dim('triBase', 'Base', 'triangle', { ft: 10, m: 4 }),
		...dim('triHt', 'Height', 'triangle', { ft: 6, m: 3 }),
		{
			id: 'priceFt',
			label: 'Price per square foot (optional)',
			type: 'number',
			default: 5,
			min: 0,
			max: 100000,
			step: 0.01,
			prefix: '$',
			suffix: '/sq ft',
			help: 'Set to 0 to leave out the cost.',
			visibleWhen: (v) => v.units === 'ft'
		},
		{
			id: 'priceM',
			label: 'Price per square metre (optional)',
			type: 'number',
			default: 54,
			min: 0,
			max: 1000000,
			step: 0.01,
			prefix: '$',
			suffix: '/sq m',
			help: 'Set to 0 to leave out the cost.',
			visibleWhen: (v) => v.units === 'm'
		}
	],
	calculate(v): CalculationResult {
		const imperial = v.units === 'ft';
		const pick = (base: string) => Number(imperial ? v[`${base}Ft`] : v[`${base}M`]);
		const price = Number(imperial ? v.priceFt : v.priceM);
		const invalid = (): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Area',
			summary: 'Enter a size greater than zero for every measurement.'
		});

		let area: number;
		if (v.shape === 'circle') {
			const d = pick('circDia');
			if (!(d > 0) || !Number.isFinite(d)) return invalid();
			area = Math.PI * (d / 2) ** 2;
		} else if (v.shape === 'triangle') {
			const b = pick('triBase');
			const h = pick('triHt');
			if (!(b > 0) || !Number.isFinite(b) || !(h > 0) || !Number.isFinite(h)) return invalid();
			area = (b * h) / 2;
		} else {
			const l = pick('rectLen');
			const w = pick('rectWid');
			if (!(l > 0) || !Number.isFinite(l) || !(w > 0) || !Number.isFinite(w)) return invalid();
			area = l * w;
		}
		if (!Number.isFinite(price) || price < 0) {
			return { primaryResult: DASH, primaryLabel: 'Area', summary: 'The price cannot be negative.' };
		}

		const sqFt = imperial ? area : area / SQ_M_PER_SQ_FT;
		const sqM = imperial ? area * SQ_M_PER_SQ_FT : area;
		const cost = area * price;
		const unit = imperial ? 'sq ft' : 'sq m';

		return {
			primaryResult: `${num(area, 2, 2)} ${unit}`,
			primaryLabel: 'Area',
			summary: `${v.shape === 'circle' ? 'Circle' : v.shape === 'triangle' ? 'Triangle' : 'Rectangle'} area, in ${unit}.`,
			secondaryMetrics: [
				{ label: 'Area in square feet', value: `${num(sqFt, 2, 2)} sq ft` },
				{ label: 'Area in square metres', value: `${num(sqM, 2, 2)} sq m` },
				{ label: 'Total cost', value: price > 0 ? money(cost) : DASH }
			]
		};
	},
	content: {
		intro:
			'Work out the area of a rectangle, circle or triangle in square feet or square metres. Add a price per unit to see the total cost of flooring, paint, turf or any other material.',
		howTo: [
			'Choose the shape: rectangle, circle or triangle.',
			'Pick feet or metres, then enter the measurements. Use the same unit for every side.',
			'Optionally enter a price per square foot or square metre to see the cost.',
			'Read the area, then check the square feet and square metres figures if your supplier uses the other unit.'
		],
		about: [
			{
				heading: 'What is square footage?',
				paragraphs: [
					'Square footage is the area of a surface, measured in square feet. A square foot is a square that is one foot on each side. In metric countries, the same idea uses square metres, where one square metre is a square one metre on each side.',
					'Area tells you how much flooring, paint, turf or tile you need to cover a surface. It also helps you compare the size of two rooms or two plots of land.'
				]
			},
			{
				heading: 'How area is calculated',
				paragraphs: [
					'The formula depends on the shape. For a rectangle, multiply the length by the width. For a triangle, multiply the base by the height and divide by two. For a circle, multiply pi by the radius squared, where the radius is half the diameter.',
					'Square units always come from multiplying two lengths. So if you measure in feet, the answer is in square feet. If you measure in metres, the answer is in square metres. Mixing the two is a common mistake.'
				]
			},
			{
				heading: 'Feet and metres: converting the area',
				paragraphs: [
					'One square foot equals 0.092903 square metres. One square metre equals about 10.764 square feet. So a 120 square foot room is about 11.15 square metres. Most suppliers quote in one unit, and you may need to convert.',
					'Because area uses squares, the conversion factor is the length factor squared. One foot is 0.3048 metres, and 0.3048 squared is 0.092903. For more conversions, try the [unit converter](/unit-converter).'
				],
				table: {
					caption: 'Common room sizes in both units',
					columns: ['Room', 'Square feet', 'Square metres'],
					rows: [
						['10 ft × 12 ft', '120', '11.15'],
						['12 ft × 15 ft', '180', '16.72'],
						['20 ft × 20 ft', '400', '37.16']
					]
				}
			},
			{
				heading: 'Tips for measuring area',
				paragraphs: [
					'Measure each wall or edge at its longest point, then take the average if the room is uneven. For irregular shapes, split the area into rectangles and triangles, then add them together.',
					'When you buy material, add a waste allowance. For tiles and flooring, most people add about 5% to 10%. The [tile calculator](/tile-calculator) shows the waste for tile in more detail.'
				],
				list: [
					'Draw a simple sketch and label every measurement before you start.',
					'Measure to the nearest inch or centimetre, which is precise enough for most jobs.',
					'Subtract large fixed areas, such as a fireplace or a built-in unit, if you need the exact floor area.',
					'Use the same unit for the whole job to avoid mixing feet and metres.'
				]
			},
			{
				heading: 'What area does not tell you',
				paragraphs: [
					'Area is a flat measurement. It does not include height, so it will not give you the volume of a room, or how much paint or concrete you need by depth. For that, use the [concrete calculator](/concrete-calculator) or a volume calculator.',
					'Also, the price you enter is only as good as the quote. Taxes, delivery and installation are not included unless you add them yourself.'
				]
			}
		],
		formulas: [
			{
				title: 'Rectangle',
				expression: 'Area = length × width',
				variables: [
					{ symbol: 'length', meaning: 'the longer side, in feet or metres' },
					{ symbol: 'width', meaning: 'the shorter side, in the same unit as the length' }
				]
			},
			{
				title: 'Circle',
				expression: 'Area = π × (diameter ÷ 2)²',
				variables: [
					{ symbol: 'π', meaning: 'about 3.14159' },
					{ symbol: 'diameter', meaning: 'the distance across the circle through its centre' }
				]
			},
			{
				title: 'Triangle',
				expression: 'Area = (base × height) ÷ 2',
				variables: [
					{ symbol: 'base', meaning: 'the length of one side of the triangle' },
					{ symbol: 'height', meaning: 'the straight distance from that base to the opposite corner, at a right angle' }
				]
			},
			{
				title: 'Cost',
				expression: 'Cost = area × price per unit',
				variables: [{ symbol: 'price', meaning: 'the price for one square foot or one square metre' }]
			}
		],
		example: {
			title: 'A 12 ft by 10 ft rectangle at $5 per square foot',
			steps: [
				'Area: 12 × 10 = 120 square feet',
				'In metres: 120 × 0.092903 = 11.15 square metres',
				'Cost: 120 × $5 = $600.00'
			],
			result: 'The area is 120 square feet (11.15 square metres), and the material costs $600.00.'
		},
		faq: [
			{
				q: 'How do I calculate square footage?',
				a: 'Multiply the length by the width in feet. For example, a room 12 feet long and 10 feet wide is 120 square feet. For a circle or triangle, use the matching formula from this page.'
			},
			{
				q: 'How many square metres is 1,000 square feet?',
				a: 'About 92.9 square metres. Each square foot is 0.092903 square metres, so multiply 1,000 by that number.'
			},
			{
				q: 'Should I include walls when I measure a room?',
				a: 'No, for flooring you measure the floor only. Walls matter for paint, where you measure the wall area instead. Remove large fixed areas such as built-in units if you need an exact figure.'
			},
			{
				q: 'What is the difference between square footage and volume?',
				a: 'Square footage measures a flat area. Volume adds height or depth, so it is measured in cubic units. Use area for flooring and turf, and volume for concrete, soil or water.'
			},
			{
				q: 'Is the total cost including tax?',
				a: 'No. The cost is the area multiplied by the price you enter. Sales tax, VAT or GST, delivery and labour are not included, so add them to the total yourself.'
			}
		],
		sources: [{ title: 'NIST, The International System of Units (SI), SP 330', url: 'https://www.nist.gov/pml/special-publication-330' }]
	}
});
