import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './volume-calculator.meta';

const is = (...shapes: string[]) => (v: InputValues) => shapes.includes(String(v.shape));
const positive = (...xs: number[]) => xs.every((x) => Number.isFinite(x) && x > 0);

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'shape',
			label: 'Shape',
			type: 'select',
			display: 'menu',
			default: 'cylinder',
			options: [
				{ label: 'Cube', value: 'cube' },
				{ label: 'Rectangular box', value: 'box' },
				{ label: 'Cylinder', value: 'cylinder' },
				{ label: 'Cone', value: 'cone' },
				{ label: 'Sphere', value: 'sphere' },
				{ label: 'Hemisphere', value: 'hemisphere' },
				{ label: 'Square pyramid', value: 'pyramid' },
				{ label: 'Capsule', value: 'capsule' }
			]
		},
		{ id: 'edge', label: 'Edge length', type: 'number', default: 4, min: 0, visibleWhen: is('cube') },
		{ id: 'length', label: 'Length', type: 'number', default: 6, min: 0, visibleWhen: is('box') },
		{ id: 'width', label: 'Width', type: 'number', default: 4, min: 0, visibleWhen: is('box') },
		{
			id: 'height',
			label: 'Height',
			type: 'number',
			default: 10,
			min: 0,
			visibleWhen: is('box', 'cylinder', 'cone', 'pyramid')
		},
		{
			id: 'radius',
			label: 'Radius',
			type: 'number',
			default: 3,
			min: 0,
			visibleWhen: is('cylinder', 'cone', 'sphere', 'hemisphere', 'capsule')
		},
		{
			id: 'baseEdge',
			label: 'Base edge',
			type: 'number',
			default: 4,
			min: 0,
			help: 'Side length of the square base.',
			visibleWhen: is('pyramid')
		},
		{
			id: 'straight',
			label: 'Straight length',
			type: 'number',
			default: 5,
			min: 0,
			help: 'Length of the middle tube, not counting the two rounded ends.',
			visibleWhen: is('capsule')
		}
	],
	calculate(v): CalculationResult {
		const shape = String(v.shape);
		const n = (k: string) => Number(v[k]);
		const pi = Math.PI;
		const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Volume', summary });
		let volume: number;
		let area: number | undefined;
		let working: string;

		switch (shape) {
			case 'cube': {
				const a = n('edge');
				if (!positive(a)) return fail('Enter an edge length greater than zero.');
				volume = a ** 3;
				area = 6 * a * a;
				working = `${num(a, 4)}³ = ${num(volume, 4)}`;
				break;
			}
			case 'box': {
				const l = n('length');
				const w = n('width');
				const h = n('height');
				if (!positive(l, w, h)) return fail('Enter a length, width and height greater than zero.');
				volume = l * w * h;
				area = 2 * (l * w + l * h + w * h);
				working = `${num(l, 4)} × ${num(w, 4)} × ${num(h, 4)} = ${num(volume, 4)}`;
				break;
			}
			case 'cylinder': {
				const r = n('radius');
				const h = n('height');
				if (!positive(r, h)) return fail('Enter a radius and height greater than zero.');
				volume = pi * r * r * h;
				area = 2 * pi * r * r + 2 * pi * r * h;
				working = `π × ${num(r, 4)}² × ${num(h, 4)} = ${num(volume, 4)}`;
				break;
			}
			case 'cone': {
				const r = n('radius');
				const h = n('height');
				if (!positive(r, h)) return fail('Enter a radius and height greater than zero.');
				volume = (pi * r * r * h) / 3;
				working = `⅓ × π × ${num(r, 4)}² × ${num(h, 4)} = ${num(volume, 4)}`;
				break;
			}
			case 'sphere': {
				const r = n('radius');
				if (!positive(r)) return fail('Enter a radius greater than zero.');
				volume = (4 / 3) * pi * r ** 3;
				area = 4 * pi * r * r;
				working = `4/3 × π × ${num(r, 4)}³ = ${num(volume, 4)}`;
				break;
			}
			case 'hemisphere': {
				const r = n('radius');
				if (!positive(r)) return fail('Enter a radius greater than zero.');
				volume = (2 / 3) * pi * r ** 3;
				working = `2/3 × π × ${num(r, 4)}³ = ${num(volume, 4)}`;
				break;
			}
			case 'pyramid': {
				const s = n('baseEdge');
				const h = n('height');
				if (!positive(s, h)) return fail('Enter a base edge and height greater than zero.');
				volume = (s * s * h) / 3;
				working = `⅓ × ${num(s, 4)}² × ${num(h, 4)} = ${num(volume, 4)}`;
				break;
			}
			case 'capsule': {
				const r = n('radius');
				const h = n('straight');
				if (!positive(r, h)) return fail('Enter a radius and straight length greater than zero.');
				volume = pi * r * r * h + (4 / 3) * pi * r ** 3;
				working = `π × ${num(r, 4)}² × ${num(h, 4)} + 4/3 × π × ${num(r, 4)}³ = ${num(volume, 4)}`;
				break;
			}
			default:
				return fail('Pick a shape.');
		}

		const metrics = area === undefined ? [] : [{ label: 'Surface area', value: num(area, 4) }];
		return {
			primaryResult: num(volume, 4),
			primaryLabel: 'Volume',
			summary: working,
			secondaryMetrics: metrics
		};
	},
	content: {
		intro:
			'This volume calculator finds how much space a 3D shape fills. Choose a shape such as a box, cylinder, cone or sphere, enter its measurements, and get the volume. Some shapes also show their surface area.',
		howTo: [
			'Choose the shape, such as a cube, box, cylinder, cone or sphere.',
			'Enter the measurements the form asks for, all in the same unit.',
			'Read the volume in cubic units. Where it applies, also read the surface area.'
		],
		about: [
			{
				heading: 'What is volume?',
				paragraphs: [
					'Volume is the amount of space inside a 3D shape. It is measured in cubic units, such as cubic centimetres (cm³), cubic metres (m³) or cubic feet (ft³).',
					'A cubic centimetre is a cube that is 1 cm on every side. Picture filling a box with these small cubes. The number of cubes that fit is the volume in cm³.',
					'Volume is useful for containers and rooms. It tells you how much a tank holds, how much soil a raised bed needs, or how much air a room contains.'
				]
			},
			{
				heading: 'How volume is calculated',
				paragraphs: [
					'Many shapes follow one pattern. For a prism or cylinder, you multiply the area of the base by the height. A box is a rectangle base times a height. A cylinder is a circle base, with area π × r², times a height.',
					'Some shapes have a volume exactly one third of a matching prism. A cone fills one third of a cylinder with the same base and height. Similarly, a square pyramid fills one third of a box with the same base and height.',
					'A sphere needs its own formula, 4/3 × π × r³. The hemisphere, which is half a sphere, has 2/3 × π × r³. Because the radius is cubed, doubling the radius multiplies the volume by eight.'
				],
				table: {
					caption: 'Volume formulas for common shapes',
					columns: ['Shape', 'Volume', 'Example'],
					rows: [
						['Cube, edge 4', 'a³', '64'],
						['Box, 6 × 4 × 10', 'l × w × h', '240'],
						['Cylinder, radius 3, height 10', 'π × r² × h', '282.74'],
						['Cone, radius 3, height 10', '⅓ × π × r² × h', '94.25'],
						['Sphere, radius 3', '4/3 × π × r³', '113.10']
					]
				}
			},
			{
				heading: 'Volume in real projects',
				paragraphs: [
					'Volume helps with buying and filling, so it is useful for planning. For example, you can estimate how much concrete a footing needs, using the [concrete calculator](/concrete-calculator). For liquids, you can also link volume to weight with the [density calculator](/density-calculator).',
					'Volume and surface area often go together. A tank may need the same amount of paint as its outside area, while its capacity depends on the volume. Use the [surface area calculator](/surface-area-calculator) for the outside.',
					'For example, always check the units before you buy. Litres and cubic metres are different scales, and one cubic metre holds 1,000 litres. Converting to one unit first avoids costly mistakes.'
				]
			},
			{
				heading: 'Tips for accurate volumes',
				paragraphs: ['Volume is sensitive to small errors, because the height and radius are multiplied. Try these habits:'],
				list: [
					'**Use inside measurements for capacity.** The wall thickness of a container reduces what it can hold.',
					'**Measure the radius, not the diameter.** A cylinder with radius 3 is 6 cm across.',
					'**Cube the radius for spheres.** Doubling the radius makes the volume eight times bigger.',
					'**Check the shape.** A cone or pyramid needs the one-third factor. Leaving it out doubles the answer.',
					'**Use the base area tool for flat bases.** The [area calculator](/area-calculator) gives the base of a box or prism.'
				]
			}
		],
		formulas: [
			{ title: 'Cube', expression: 'Volume = a³,   Surface area = 6 × a²', variables: [{ symbol: 'a', meaning: 'edge length' }] },
			{
				title: 'Rectangular box',
				expression: 'Volume = l × w × h,   Surface area = 2 × (lw + lh + wh)',
				variables: [{ symbol: 'l, w, h', meaning: 'length, width and height' }]
			},
			{
				title: 'Cylinder',
				expression: 'Volume = π × r² × h,   Surface area = 2 × π × r² + 2 × π × r × h',
				variables: [
					{ symbol: 'r', meaning: 'radius of the circular ends' },
					{ symbol: 'h', meaning: 'height' }
				]
			},
			{ title: 'Cone', expression: 'Volume = ⅓ × π × r² × h', variables: [{ symbol: 'r', meaning: 'radius of the base' }] },
			{
				title: 'Sphere',
				expression: 'Volume = 4/3 × π × r³,   Surface area = 4 × π × r²',
				variables: [{ symbol: 'r', meaning: 'radius' }]
			},
			{ title: 'Hemisphere', expression: 'Volume = 2/3 × π × r³', variables: [{ symbol: 'r', meaning: 'radius' }] },
			{ title: 'Square pyramid', expression: 'Volume = ⅓ × b² × h', variables: [{ symbol: 'b', meaning: 'side of the square base' }] },
			{
				title: 'Capsule',
				expression: 'Volume = π × r² × h + 4/3 × π × r³',
				variables: [
					{ symbol: 'h', meaning: 'length of the straight middle section, not counting the rounded ends' },
					{ symbol: 'r', meaning: 'radius of the tube and the rounded ends' }
				]
			}
		],
		example: {
			title: 'A cylindrical can with a radius of 3 cm and a height of 10 cm',
			steps: [
				'Base area: π × 3² = π × 9 = 28.2743 square cm.',
				'Volume: 28.2743 × 10 = 282.74 cubic cm.',
				'Surface area: 2 × π × 3² + 2 × π × 3 × 10 = 56.5487 + 188.4956 = 245.04 square cm.'
			],
			result: 'The can holds about 282.74 cubic cm, which is about 282.74 millilitres. Its surface area is about 245.04 square cm.'
		},
		faq: [
			{
				q: 'How do I find the volume of a box?',
				a: 'Multiply the length by the width and by the height. A box that is 6 by 4 by 10 has a volume of 240 cubic units. Enter the three sides in the calculator to check.'
			},
			{
				q: 'What is the difference between volume and capacity?',
				a: 'Volume is the space an object takes up, and capacity is how much a container can hold. The two are close for an empty container, but the wall thickness makes capacity a little smaller.'
			},
			{
				q: 'Why is the cone volume one third of a cylinder?',
				a: 'A cone with the same base and height as a cylinder fills exactly one third of it. That is why its formula has the factor 1/3.'
			},
			{
				q: 'How many litres are in a cubic metre?',
				a: 'One cubic metre holds 1,000 litres. A cubic centimetre is one millilitre, so 1,000 cubic centimetres make a litre.'
			},
			{
				q: 'How many cubic centimetres are in a cubic metre?',
				a: 'There are 1,000,000 cubic centimetres in a cubic metre. Each metre is 100 centimetres, and 100 × 100 × 100 = 1,000,000.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Cone', url: 'https://mathworld.wolfram.com/Cone.html' },
			{ title: 'NIST SP 811: Guide for the Use of the International System of Units (SI)', url: 'https://www.nist.gov/pml/special-publication-811' }
		]
	}
});
