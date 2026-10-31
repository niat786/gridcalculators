import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num, plural } from '../format';
import meta from './tile-calculator.meta';

const imperial = (v: InputValues) => v.units === 'imperial';
const metric = (v: InputValues) => v.units === 'metric';

const pos = (n: number) => Number.isFinite(n) && n > 0;

function invalid(summary: string): CalculationResult {
	return { primaryResult: DASH, primaryLabel: 'Tiles to buy', summary };
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'imperial',
			options: [
				{ label: 'Feet and inches', value: 'imperial' },
				{ label: 'Metres and centimetres', value: 'metric' }
			]
		},
		// Feet and inches
		{ id: 'roomLenFt', label: 'Room length', type: 'number', default: 12, min: 0.5, max: 1000, step: 0.5, suffix: 'ft', width: 'half', visibleWhen: imperial },
		{ id: 'roomWidFt', label: 'Room width', type: 'number', default: 10, min: 0.5, max: 1000, step: 0.5, suffix: 'ft', width: 'half', visibleWhen: imperial },
		{ id: 'tileWIn', label: 'Tile width', type: 'number', default: 12, min: 0.5, max: 120, step: 0.5, suffix: 'in', width: 'half', visibleWhen: imperial },
		{ id: 'tileHIn', label: 'Tile height', type: 'number', default: 12, min: 0.5, max: 120, step: 0.5, suffix: 'in', width: 'half', visibleWhen: imperial },
		{
			id: 'groutIn',
			label: 'Grout gap',
			type: 'number',
			default: 0.125,
			min: 0,
			max: 1,
			step: 0.0625,
			suffix: 'in',
			help: 'A typical joint is 1/8 in.',
			visibleWhen: imperial
		},
		// Metres and centimetres
		{ id: 'roomLenM', label: 'Room length', type: 'number', default: 3.6, min: 0.1, max: 1000, step: 0.1, suffix: 'm', width: 'half', visibleWhen: metric },
		{ id: 'roomWidM', label: 'Room width', type: 'number', default: 3, min: 0.1, max: 1000, step: 0.1, suffix: 'm', width: 'half', visibleWhen: metric },
		{ id: 'tileWCm', label: 'Tile width', type: 'number', default: 30, min: 0.5, max: 300, step: 0.5, suffix: 'cm', width: 'half', visibleWhen: metric },
		{ id: 'tileHCm', label: 'Tile height', type: 'number', default: 30, min: 0.5, max: 300, step: 0.5, suffix: 'cm', width: 'half', visibleWhen: metric },
		{
			id: 'groutMm',
			label: 'Grout gap',
			type: 'number',
			default: 3,
			min: 0,
			max: 25,
			step: 0.5,
			suffix: 'mm',
			help: 'A typical joint is 2 to 3 mm.',
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
			help: 'Extra for cuts, breakage and edge pieces.'
		},
		{
			id: 'perBox',
			label: 'Tiles per box (optional)',
			type: 'number',
			default: 10,
			min: 0,
			max: 10000,
			step: 1,
			decimal: false,
			help: 'Set to 0 to leave out the box count.'
		}
	],
	calculate(v): CalculationResult {
		const isMetric = v.units === 'metric';
		// Work in inches (feet and inches) or centimetres (metric), so grout and tiles share one unit.
		const roomL = Number(isMetric ? v.roomLenM : v.roomLenFt) * (isMetric ? 100 : 12);
		const roomW = Number(isMetric ? v.roomWidM : v.roomWidFt) * (isMetric ? 100 : 12);
		const tileW = Number(isMetric ? v.tileWCm : v.tileWIn);
		const tileH = Number(isMetric ? v.tileHCm : v.tileHIn);
		const grout = isMetric ? Number(v.groutMm) / 10 : Number(v.groutIn);
		const waste = Number(v.waste);
		const perBox = Number(v.perBox);

		if (!pos(roomL) || !pos(roomW) || !pos(tileW) || !pos(tileH)) {
			return invalid('Enter a room size and tile size greater than zero.');
		}
		if (!Number.isFinite(grout) || grout < 0) return invalid('Enter a grout gap of 0 or more.');
		if (!Number.isFinite(waste) || waste < 0) return invalid('Enter a waste allowance of 0% or more.');
		if (!Number.isInteger(perBox) || perBox < 0) return invalid('Enter tiles per box as a whole number, 0 or more.');

		// Tiles across and down, counting each grout joint once per tile.
		// A small epsilon stops exact fits from adding an extra row or column.
		const across = Math.ceil((roomL + grout) / (tileW + grout) - 1e-9);
		const down = Math.ceil((roomW + grout) / (tileH + grout) - 1e-9);
		const tiles = across * down;
		const tilesWithWaste = Math.ceil(tiles * (1 + waste / 100) - 1e-9);
		const boxes = perBox > 0 ? Math.ceil(tilesWithWaste / perBox - 1e-9) : null;

		const perSquare = isMetric ? 10000 : 144;
		const unit = isMetric ? 'sq m' : 'sq ft';
		const roomArea = (roomL * roomW) / perSquare;
		const covered = (tilesWithWaste * tileW * tileH) / perSquare;

		return {
			primaryResult: plural(tilesWithWaste, 'tile'),
			primaryLabel: 'Tiles to buy',
			summary: `Includes ${num(waste, 0)}% extra for cuts and breakage.`,
			secondaryMetrics: [
				{ label: 'Room area', value: `${num(roomArea, 2)} ${unit}` },
				{ label: 'Tiles before waste', value: plural(tiles, 'tile') },
				{ label: 'Boxes', value: boxes === null ? DASH : plural(boxes, 'box', 'boxes') },
				{ label: 'Area covered by tiles', value: `${num(covered, 2)} ${unit}` }
			]
		};
	},
	content: {
		intro:
			'Work out how many tiles, and how many boxes, you need for a floor or wall. The tile calculator includes the grout gap between tiles and an allowance for cuts and breakage.',
		howTo: [
			'Choose feet and inches, or metres and centimetres, to match your tile sizes.',
			'Enter the room length and width, then the width and height of one tile.',
			'Enter the grout gap, which is the joint between tiles, and a waste allowance. The defaults are a common starting point.',
			'Add tiles per box if you know it, then read the tiles to buy and the box count.'
		],
		about: [
			{
				heading: 'What the tile calculator measures',
				paragraphs: [
					'Tiles come in fixed sizes, and they are sold in boxes. This calculator counts how many whole tiles fit across and down the room, then adds extra for cuts. You get the number of tiles, the boxes to order and the area the tiles will cover.',
					'Tile sizes are often given as a name, such as 30 × 30 cm or 12 × 12 inches. Enter the exact size printed on the box, because a tile that is a few millimetres different changes the count.'
				]
			},
			{
				heading: 'How the tile count is worked out',
				paragraphs: [
					'The calculator counts the grout joints as well as the tiles. Each tile plus one joint takes up a fixed width, so the room is measured in those units. Rounding up gives whole tiles, because you cannot buy part of one. The [area calculator](/area-calculator) gives the area of a room or a single tile if you want to check the maths.',
					'Then the waste allowance is added. Waste covers cuts at walls, broken tiles and edge pieces. For example, a 10% allowance on 120 tiles gives 132 tiles. Tiles with a strong pattern or diagonal layout need more waste.'
				]
			},
			{
				heading: 'Grout gaps and tile sizes around the world',
				paragraphs: [
					'In feet and inches, a typical grout joint is about 1/8 inch. In metric countries, a joint of 2 to 3 mm is common for most floor and wall tiles. Some rectified tiles, which have very straight edges, are laid with narrower joints.',
					'Many suppliers in metric markets sell tiles by the square metre rather than by the box. If that is your case, multiply the tiles to buy by the area of one tile, or ask the supplier to confirm the box size. The [unit converter](/unit-converter) helps if you need to switch between units.'
				]
			},
			{
				heading: 'Tips for buying tile',
				paragraphs: [
					'Buy all your tiles at once, and from the same batch. Tiles from different batches can vary a little in colour, and a small top-up later may not match. Keep a few spare tiles for future repairs.',
					'Measure the area first with the [square footage calculator](/square-footage-calculator) if you also need to price the job. Then compare the result with your count.'
				],
				list: [
					'Check the tile size on the box, not on the label or the sample.',
					'Add more waste for diagonal layouts, patterns and small rooms with many corners.',
					'Check the number of tiles per box before you multiply, because boxes differ.',
					'Keep the tile box labels, so you can order the same batch if you need more.'
				]
			},
			{
				heading: 'Safety when you cut and lay tile',
				paragraphs: [
					'Cutting ceramic, porcelain or stone tile can release fine silica dust, which can damage the lungs. Wet cutting keeps the dust down. When you cut dry, wear a dust mask that fits well, and work in a ventilated space.',
					'Wet floors are slippery, so keep the area clear and wipe spills at once. Wear gloves when you handle grout and adhesive, because they can irritate the skin.'
				]
			}
		],
		formulas: [
			{
				title: 'Tiles across and down',
				expression: 'Across = ⌈(room length + grout) ÷ (tile width + grout)⌉\nDown = ⌈(room width + grout) ÷ (tile height + grout)⌉',
				variables: [
					{ symbol: '⌈ ⌉', meaning: 'round up to the next whole number' },
					{ symbol: 'grout', meaning: 'the width of one joint, in the same unit as the tile and room' }
				]
			},
			{
				title: 'Tiles to buy',
				expression: 'Tiles to buy = ⌈ across × down × (1 + waste ÷ 100) ⌉',
				variables: [{ symbol: 'waste', meaning: 'the allowance for cuts and breakage, as a percentage' }]
			},
			{
				title: 'Boxes',
				expression: 'Boxes = ⌈ tiles to buy ÷ tiles per box ⌉',
				variables: [{ symbol: 'tiles per box', meaning: 'the number printed on the box' }]
			}
		],
		example: {
			title: 'A 12 ft by 10 ft room with 12 in tiles, 1/8 in grout and 10% waste',
			steps: [
				'Across: (144 + 0.125) ÷ (12 + 0.125) = 11.9, rounded up to 12 tiles',
				'Down: (120 + 0.125) ÷ (12 + 0.125) = 9.9, rounded up to 10 tiles',
				'Tiles before waste: 12 × 10 = 120 tiles',
				'With waste: 120 × 1.10 = 132 tiles. At 10 tiles per box, that is 14 boxes.'
			],
			result: 'Buy 132 tiles, which is 14 boxes of 10. The tiles cover 132 square feet.'
		},
		faq: [
			{
				q: 'How many tiles do I need for a room?',
				a: 'Measure the room and the tile. Count the tiles across and down, including the grout gaps, then add 5% to 10% for waste. The calculator does this for you and rounds up to whole tiles.'
			},
			{
				q: 'What is a good waste allowance for tile?',
				a: 'Most people use 10% for a simple square room. Use more for diagonal layouts, patterns or many corners, and less if the room is very simple and you have spare tiles from the same batch.'
			},
			{
				q: 'Should I include grout when counting tiles?',
				a: 'Yes. Grout joints take up space between tiles. Leaving them out makes the count a little too low, especially in rooms with many tiles.'
			},
			{
				q: 'Why are my tiles from different boxes not matching?',
				a: 'Natural stone and ceramic tiles can vary in shade from one batch to the next. Buy all the tiles at once, and check the batch number on the box.'
			}
		],
		sources: [{ title: 'Tile Council of North America, installation guidelines', url: 'https://www.tcnatile.com/' }]
	}
});
