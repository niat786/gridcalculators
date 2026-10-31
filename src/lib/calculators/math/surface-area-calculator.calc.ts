import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './surface-area-calculator.meta';

const PI = Math.PI;
const SQRT3 = Math.sqrt(3);
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
				{ label: 'Sphere', value: 'sphere' },
				{ label: 'Cylinder', value: 'cylinder' },
				{ label: 'Cone', value: 'cone' },
				{ label: 'Square pyramid', value: 'pyramid' },
				{ label: 'Triangular prism (equilateral base)', value: 'prism' },
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
			visibleWhen: is('sphere', 'cylinder', 'cone', 'capsule')
		},
		{
			id: 'baseEdge',
			label: 'Base edge',
			type: 'number',
			default: 4,
			min: 0,
			help: 'Side of the square base, or of the triangular base.',
			visibleWhen: is('pyramid', 'prism')
		},
		{
			id: 'prismLength',
			label: 'Prism length',
			type: 'number',
			default: 10,
			min: 0,
			help: 'How far the triangle is extruded, end to end.',
			visibleWhen: is('prism')
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
		const fail = (summary: string): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Total surface area',
			summary
		});
		const sq = (x: number) => num(x, 4);

		let total: number;
		let working: string;
		let parts: [string, number][];

		switch (shape) {
			case 'cube': {
				const a = n('edge');
				if (!positive(a)) return fail('Enter an edge length greater than zero.');
				total = 6 * a * a;
				working = `6 × ${sq(a)}² = ${sq(total)}`;
				parts = [
					['One face', a * a],
					['Four side faces', 4 * a * a],
					['Top and bottom', 2 * a * a]
				];
				break;
			}
			case 'box': {
				const l = n('length');
				const w = n('width');
				const h = n('height');
				if (!positive(l, w, h)) return fail('Enter a length, width and height greater than zero.');
				total = 2 * (l * w + l * h + w * h);
				working = `2 × (${sq(l)} × ${sq(w)} + ${sq(l)} × ${sq(h)} + ${sq(w)} × ${sq(h)}) = ${sq(total)}`;
				parts = [
					['Top and bottom', 2 * l * w],
					['Front and back', 2 * l * h],
					['Left and right', 2 * w * h]
				];
				break;
			}
			case 'sphere': {
				const r = n('radius');
				if (!positive(r)) return fail('Enter a radius greater than zero.');
				total = 4 * PI * r * r;
				working = `4 × π × ${sq(r)}² = ${sq(total)}`;
				parts = [
					['Great circle area', PI * r * r],
					['Diameter', 2 * r]
				];
				break;
			}
			case 'cylinder': {
				const r = n('radius');
				const h = n('height');
				if (!positive(r, h)) return fail('Enter a radius and height greater than zero.');
				const curved = 2 * PI * r * h;
				const ends = 2 * PI * r * r;
				total = curved + ends;
				working = `2π × ${sq(r)} × ${sq(h)} + 2π × ${sq(r)}² = ${sq(total)}`;
				parts = [
					['Curved side', curved],
					['Top and bottom', ends]
				];
				break;
			}
			case 'cone': {
				const r = n('radius');
				const h = n('height');
				if (!positive(r, h)) return fail('Enter a radius and height greater than zero.');
				const slant = Math.sqrt(r * r + h * h);
				const curved = PI * r * slant;
				const base = PI * r * r;
				total = curved + base;
				working = `π × ${sq(r)} × ${sq(slant)} + π × ${sq(r)}² = ${sq(total)}`;
				parts = [
					['Slant height', slant],
					['Curved side', curved],
					['Base', base]
				];
				break;
			}
			case 'pyramid': {
				const s = n('baseEdge');
				const h = n('height');
				if (!positive(s, h)) return fail('Enter a base edge and height greater than zero.');
				const slant = Math.sqrt(h * h + (s / 2) ** 2);
				const sides = 2 * s * slant;
				const base = s * s;
				total = sides + base;
				working = `2 × ${sq(s)} × ${sq(slant)} + ${sq(s)}² = ${sq(total)}`;
				parts = [
					['Slant height of a side', slant],
					['Four triangular sides', sides],
					['Square base', base]
				];
				break;
			}
			case 'prism': {
				const s = n('baseEdge');
				const L = n('prismLength');
				if (!positive(s, L)) return fail('Enter a base edge and prism length greater than zero.');
				const triangle = (SQRT3 / 4) * s * s;
				const sides = 3 * s * L;
				total = 2 * triangle + sides;
				working = `2 × √3/4 × ${sq(s)}² + 3 × ${sq(s)} × ${sq(L)} = ${sq(total)}`;
				parts = [
					['One triangular end', triangle],
					['Two triangular ends', 2 * triangle],
					['Three rectangular sides', sides]
				];
				break;
			}
			case 'capsule': {
				const r = n('radius');
				const h = n('straight');
				if (!positive(r, h)) return fail('Enter a radius and straight length greater than zero.');
				const tube = 2 * PI * r * h;
				const ends = 4 * PI * r * r;
				total = tube + ends;
				working = `2π × ${sq(r)} × ${sq(h)} + 4π × ${sq(r)}² = ${sq(total)}`;
				parts = [
					['Curved tube', tube],
					['Two rounded ends', ends],
					['Overall length', h + 2 * r]
				];
				break;
			}
			default:
				return fail('Pick a shape.');
		}

		return {
			primaryResult: num(total, 4),
			primaryLabel: 'Total surface area',
			summary: working,
			secondaryMetrics: parts.map(([label, value]) => ({ label, value: num(value, 4) }))
		};
	},
	content: {
		intro:
			'This surface area calculator works out the total outside area of common 3D shapes. Choose a shape, enter its measurements, and get the total surface area, with the area of each part shown.',
		howTo: [
			'Choose the shape, such as a cube, box, sphere, cylinder or cone.',
			'Enter the measurements the form asks for, all in the same unit.',
			'Read the total surface area in square units, then check the breakdown of each face or curved part.'
		],
		about: [
			{
				heading: 'What is surface area?',
				paragraphs: [
					'Surface area is the total area of the outside of a 3D shape. Imagine peeling off the whole skin of a box and laying it flat. The total area of that flat sheet is the surface area.',
					'You measure it in square units, such as square centimetres or square feet. It is different from volume, which measures how much space the shape fills.',
					'For example, a box that is 6 cm long, 4 cm wide and 10 cm high has six faces. Its total surface area is 248 square cm, and its volume is 240 cubic cm.'
				]
			},
			{
				heading: 'How the surface area is calculated',
				paragraphs: [
					'Most shapes are made of simple parts. A box has three pairs of matching rectangles. You find the area of each rectangle, double each pair, and add the results. For the box above, the top and bottom give 2 × (6 × 4) = 48, the front and back give 2 × (6 × 10) = 120, and the two sides give 2 × (4 × 10) = 80.',
					'Curved shapes also need a formula. A sphere has surface area 4 × π × r², which is the same as four times the area of its great circle. A cylinder adds a curved side, which unrolls into a rectangle, to its two circular ends.',
					'Some shapes need an extra step. For a cone or a pyramid, you first find the slant height, the distance down the sloping face. The [Pythagorean theorem calculator](/pythagorean-theorem-calculator) helps with that step.'
				],
				table: {
					caption: 'Worked examples for common shapes',
					columns: ['Shape', 'Measurements', 'Surface area'],
					rows: [
						['Cube', 'Edge 4', '96'],
						['Box', 'Length 6, width 4, height 10', '248'],
						['Sphere', 'Radius 3', '113.10'],
						['Cylinder', 'Radius 3, height 10', '245.04'],
						['Cone', 'Radius 3, height 4', '75.40']
					]
				}
			},
			{
				heading: 'Surface area and real projects',
				paragraphs: [
					'As a result, surface area tells you how much material covers the outside of an object. It helps with paint, wrapping paper, fabric, metal sheet or insulation. Always measure the faces you need to cover, not the whole shape.',
					'For a room, the walls and ceiling are a surface area problem. The [area calculator](/area-calculator) handles flat faces one at a time, so you can add them together. For the space inside, use the [volume calculator](/volume-calculator).',
					'Most projects need extra material, because cut-offs and overlaps add waste. Cut-offs, overlaps and mistakes all add waste, so many people order a little more than the exact figure. Check the product label, because coverage is often given per square unit.'
				]
			},
			{
				heading: 'Tips for accurate results',
				paragraphs: ['Surface area problems are easy to get wrong when a shape has hidden faces. Keep these points in mind:'],
				list: [
					'**Count every face.** A closed box has six faces, but an open box has one face missing.',
					'**Use the slant height.** For a cone or pyramid, the height inside the shape is not the height of the sloping face.',
					'**Find the radius first.** For a circle or sphere, halve the diameter before you use any formula.',
					'**Keep one unit.** Mixing centimetres and metres multiplies the error.',
					'**Use the circle tool for the ends.** The [circle calculator](/circle-calculator) gives the area of each round face.'
				]
			}
		],
		formulas: [
			{ title: 'Cube', expression: 'Surface area = 6 × a²', variables: [{ symbol: 'a', meaning: 'edge length' }] },
			{
				title: 'Rectangular box',
				expression: 'Surface area = 2 × (lw + lh + wh)',
				variables: [
					{ symbol: 'l, w, h', meaning: 'length, width and height' }
				]
			},
			{ title: 'Sphere', expression: 'Surface area = 4 × π × r²', variables: [{ symbol: 'r', meaning: 'radius' }] },
			{
				title: 'Cylinder',
				expression: 'Surface area = 2 × π × r² + 2 × π × r × h',
				variables: [
					{ symbol: 'r', meaning: 'radius of the circular ends' },
					{ symbol: 'h', meaning: 'height of the curved side' }
				]
			},
			{
				title: 'Cone',
				expression: 'Surface area = π × r × s + π × r²,   where s = √(r² + h²)',
				variables: [{ symbol: 's', meaning: 'slant height, from the tip down the side to the rim' }]
			},
			{
				title: 'Square pyramid',
				expression: 'Surface area = 2 × b × s + b²,   where s = √(h² + (b ÷ 2)²)',
				variables: [
					{ symbol: 'b', meaning: 'side of the square base' },
					{ symbol: 's', meaning: 'slant height of one triangular side' }
				]
			}
		],
		example: {
			title: 'A box that is 6 cm long, 4 cm wide and 10 cm high',
			steps: [
				'Top and bottom: 2 × (6 × 4) = 48 square cm.',
				'Front and back: 2 × (6 × 10) = 120 square cm.',
				'Left and right: 2 × (4 × 10) = 80 square cm.',
				'Total: 48 + 120 + 80 = 248 square cm.'
			],
			result: 'The box has a total surface area of 248 square cm.'
		},
		faq: [
			{
				q: 'What is the difference between surface area and volume?',
				a: 'Surface area is the total area of the outside, in square units. Volume is the space inside, in cubic units. A box can have a large surface area and a small volume, or the other way round.'
			},
			{
				q: 'How do I find the surface area of a cylinder?',
				a: 'Add the two circular ends, which give 2 × π × r², to the curved side, which gives 2 × π × r × h. Enter the radius and height in the calculator to see each part.'
			},
			{
				q: 'Why does a cone need a slant height?',
				a: 'The sloping side of a cone is longer than its height. The slant height is the length of that side, so it is needed to find the curved area.'
			},
			{
				q: 'Is the surface area of a sphere four times its great circle?',
				a: 'Yes. The surface area of a sphere is 4 × π × r², and the area of its great circle is π × r². So the sphere’s surface is exactly four times that circle.'
			},
			{
				q: 'Does this calculator include an open top?',
				a: 'No. The cube and box formulas count all six faces. For an open box, subtract the area of the missing face from the total.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Surface Area', url: 'https://mathworld.wolfram.com/SurfaceArea.html' },
			{ title: 'Wolfram MathWorld: Sphere', url: 'https://mathworld.wolfram.com/Sphere.html' }
		]
	}
});
