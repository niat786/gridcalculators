import { defineCalculator, type CalculationResult, type InputValues, type Table } from '../types';
import { DASH, num } from '../format';
import meta from './triangle-calculator.meta';

const RAD = Math.PI / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const clamp = (x: number) => Math.min(1, Math.max(-1, x));
const pos = (x: number) => Number.isFinite(x) && x > 0;
const angleOk = (x: number) => Number.isFinite(x) && x > 0 && x < 180;
const is = (...modes: string[]) => (v: InputValues) => modes.includes(String(v.mode));

/** One solved triangle. Side a is opposite angle A, and so on. */
interface Tri {
	a: number;
	b: number;
	c: number;
	A: number;
	B: number;
	C: number;
}
interface Solved {
	tris: Tri[];
	method: string;
}
type Outcome = Solved | { error: string };

function sss(a: number, b: number, c: number): Outcome {
	if (![a, b, c].every(pos)) return { error: 'Enter three sides greater than zero.' };
	if (a + b <= c || a + c <= b || b + c <= a)
		return { error: 'No triangle has these sides. The two shorter sides must add up to more than the longest side.' };
	const A = deg(Math.acos(clamp((b * b + c * c - a * a) / (2 * b * c))));
	const B = deg(Math.acos(clamp((a * a + c * c - b * b) / (2 * a * c))));
	return { tris: [{ a, b, c, A, B, C: 180 - A - B }], method: 'Law of cosines for angles A and B, then C from the angle sum' };
}

function sas(a: number, b: number, C: number): Outcome {
	if (!pos(a) || !pos(b) || !angleOk(C)) return { error: 'Enter two sides above zero and an angle between 0° and 180°.' };
	const c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(C * RAD));
	const A = deg(Math.acos(clamp((b * b + c * c - a * a) / (2 * b * c))));
	return { tris: [{ a, b, c, A, B: 180 - A - C, C }], method: 'Law of cosines for side c, then for angle A' };
}

function asa(A: number, B: number, c: number): Outcome {
	if (!pos(c) || !angleOk(A) || !angleOk(B)) return { error: 'Enter a side above zero and two angles between 0° and 180°.' };
	if (A + B >= 180) return { error: 'Angles A and B must add up to less than 180°.' };
	const C = 180 - A - B;
	const a = (c * Math.sin(A * RAD)) / Math.sin(C * RAD);
	const b = (c * Math.sin(B * RAD)) / Math.sin(C * RAD);
	return { tris: [{ a, b, c, A, B, C }], method: 'Angle C = 180° − A − B, then the law of sines' };
}

function aas(A: number, B: number, a: number): Outcome {
	if (!pos(a) || !angleOk(A) || !angleOk(B)) return { error: 'Enter a side above zero and two angles between 0° and 180°.' };
	if (A + B >= 180) return { error: 'Angles A and B must add up to less than 180°.' };
	const C = 180 - A - B;
	const b = (a * Math.sin(B * RAD)) / Math.sin(A * RAD);
	const c = (a * Math.sin(C * RAD)) / Math.sin(A * RAD);
	return { tris: [{ a, b, c, A, B, C }], method: 'Angle C = 180° − A − B, then the law of sines' };
}

function ssa(a: number, b: number, A: number): Outcome {
	if (!pos(a) || !pos(b) || !angleOk(A)) return { error: 'Enter two sides above zero and an angle between 0° and 180°.' };
	const method = 'Law of sines for angle B, checking for a second triangle';
	const s = (b * Math.sin(A * RAD)) / a;
	if (s > 1 + 1e-12) return { tris: [], method };
	const B1 = deg(Math.asin(Math.min(1, s)));
	// When sin B is 1 the two angles are the same (a right angle), so only one triangle exists.
	const candidates = Math.abs(s - 1) < 1e-12 ? [B1] : [B1, 180 - B1];
	const tris: Tri[] = [];
	for (const B of candidates) {
		const C = 180 - A - B;
		if (C <= 1e-9) continue;
		const c = (a * Math.sin(C * RAD)) / Math.sin(A * RAD);
		tris.push({ a, b, c, A, B, C });
	}
	return { tris, method };
}

const area = (t: Tri) => {
	const s = (t.a + t.b + t.c) / 2;
	return Math.sqrt(Math.max(0, s * (s - t.a) * (s - t.b) * (s - t.c)));
};

const byAngles = (t: Tri) => {
	const largest = Math.max(t.A, t.B, t.C);
	if (Math.abs(largest - 90) < 1e-9) return 'Right';
	return largest < 90 ? 'Acute' : 'Obtuse';
};

const bySides = (t: Tri) => {
	const same = (x: number, y: number) => Math.abs(x - y) < 1e-9;
	if (same(t.a, t.b) && same(t.b, t.c)) return 'Equilateral';
	if (same(t.a, t.b) || same(t.b, t.c) || same(t.a, t.c)) return 'Isosceles';
	return 'Scalene';
};

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Known measurements',
			type: 'select',
			display: 'menu',
			default: 'sss',
			options: [
				{ label: 'Three sides (SSS)', value: 'sss' },
				{ label: 'Two sides and the angle between them (SAS)', value: 'sas' },
				{ label: 'Two angles and the side between them (ASA)', value: 'asa' },
				{ label: 'Two angles and a side (AAS)', value: 'aas' },
				{ label: 'Two sides and an angle opposite one (SSA)', value: 'ssa' }
			]
		},
		{ id: 'sideA', label: 'Side a', type: 'number', default: 5, min: 0, help: 'Opposite angle A.', visibleWhen: is('sss', 'sas', 'aas', 'ssa') },
		{ id: 'sideB', label: 'Side b', type: 'number', default: 7, min: 0, help: 'Opposite angle B.', visibleWhen: is('sss', 'sas', 'ssa') },
		{
			id: 'sideC',
			label: 'Side c',
			type: 'number',
			default: 8,
			min: 0,
			help: 'Opposite angle C. In ASA, the side between angles A and B.',
			visibleWhen: is('sss', 'asa')
		},
		{ id: 'angleA', label: 'Angle A', type: 'number', default: 40, min: 0, max: 180, suffix: '°', visibleWhen: is('asa', 'aas', 'ssa') },
		{ id: 'angleB', label: 'Angle B', type: 'number', default: 60, min: 0, max: 180, suffix: '°', visibleWhen: is('asa', 'aas') },
		{
			id: 'angleC',
			label: 'Angle C',
			type: 'number',
			default: 60,
			min: 0,
			max: 180,
			suffix: '°',
			help: 'The angle between sides a and b.',
			visibleWhen: is('sas')
		}
	],
	calculate(v): CalculationResult {
		const mode = String(v.mode);
		const n = (k: string) => Number(v[k]);
		const stop = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Area', summary });

		let outcome: Outcome;
		switch (mode) {
			case 'sss':
				outcome = sss(n('sideA'), n('sideB'), n('sideC'));
				break;
			case 'sas':
				outcome = sas(n('sideA'), n('sideB'), n('angleC'));
				break;
			case 'asa':
				outcome = asa(n('angleA'), n('angleB'), n('sideC'));
				break;
			case 'aas':
				outcome = aas(n('angleA'), n('angleB'), n('sideA'));
				break;
			case 'ssa':
				outcome = ssa(n('sideA'), n('sideB'), n('angleA'));
				break;
			default:
				return stop('Pick which sides and angles you know.');
		}
		if ('error' in outcome) return stop(outcome.error);

		const { tris, method } = outcome;
		if (tris.length === 0)
			return stop('No triangle fits these measurements. Side a is too short to reach the third side at angle A.');

		const two = tris.length === 2;
		const areas = tris.map(area);
		const join = (xs: string[]) => xs.join(' and ');
		const sum = tris[0].A + tris[0].B + tris[0].C;

		const rows: [string, (t: Tri) => string][] = [
			['Side a', (t) => num(t.a, 4)],
			['Side b', (t) => num(t.b, 4)],
			['Side c', (t) => num(t.c, 4)],
			['Angle A', (t) => `${num(t.A, 4)}°`],
			['Angle B', (t) => `${num(t.B, 4)}°`],
			['Angle C', (t) => `${num(t.C, 4)}°`]
		];
		const table: Table = {
			title: 'Sides and angles',
			columns: two
				? [
						{ key: 'measure', label: 'Measure' },
						{ key: 't1', label: 'Triangle 1', align: 'end' },
						{ key: 't2', label: 'Triangle 2', align: 'end' }
					]
				: [
						{ key: 'measure', label: 'Measure' },
						{ key: 't1', label: 'Value', align: 'end' }
					],
			rows: rows.map(([measure, f]) => {
				const row: Record<string, string> = { measure, t1: f(tris[0]) };
				if (two) row.t2 = f(tris[1]);
				return row;
			})
		};

		return {
			primaryResult: two ? '2 triangles' : num(areas[0], 4),
			primaryLabel: two ? 'Possible triangles' : 'Area',
			summary: two
				? `${method}. Two triangles fit these measurements, so both are shown.`
				: `${method}. The angles add up to ${num(sum, 4)}°.`,
			secondaryMetrics: [
				{ label: 'Area (Heron)', value: join(areas.map((x) => num(x, 4))) },
				{ label: 'Perimeter', value: join(tris.map((t) => num(t.a + t.b + t.c, 4))) },
				{ label: 'Type by angles', value: join(tris.map(byAngles)) },
				{ label: 'Type by sides', value: join(tris.map(bySides)) }
			],
			table
		};
	},
	content: {
		intro:
			'This triangle calculator solves any triangle from the measurements you know. Choose three sides, two sides and an angle, or two angles and a side. It then gives every side, every angle, the area and the perimeter.',
		howTo: [
			'Choose the measurements you know: three sides, two sides and the angle between them, two angles and a side, or two sides and an angle opposite one.',
			'Enter the values. Side a is opposite angle A, side b is opposite angle B, and side c is opposite angle C. Angles are in degrees.',
			'Read the missing sides and angles, the area, the perimeter and the type of triangle.'
		],
		about: [
			{
				heading: 'What does it mean to solve a triangle?',
				paragraphs: [
					'A triangle has six measurements: three sides and three angles. To solve a triangle means to find all six, given enough of them. Some facts always hold. The three angles add up to 180 degrees, and the longest side sits opposite the largest angle.',
					'You need three independent facts to fix a triangle. Two angles alone are not enough, because many triangles can share the same angles. Three sides, or two sides with the angle between them, always fix one triangle.',
					'This calculator works out which rule to use from the mode you pick. It then applies the law of cosines or the law of sines, so you do not have to choose the rule yourself.'
				]
			},
			{
				heading: 'The two laws behind the calculator',
				paragraphs: [
					'The law of cosines is a general version of the Pythagorean theorem. For side c opposite angle C, it says c² = a² + b² − 2ab × cos C. When C is 90°, the cosine is zero and the rule becomes the Pythagorean theorem. Use it when you know three sides or two sides and the angle between them.',
					'The law of sines links each side to the angle opposite it. It says a ÷ sin A = b ÷ sin B = c ÷ sin C. Use it when you know two angles and a side, or a side and the angle opposite it.',
					'For a right triangle, you can use the [right triangle calculator](/right-triangle-calculator), which uses simpler steps. For the basic case of two legs, the [Pythagorean theorem calculator](/pythagorean-theorem-calculator) is also quick.'
				],
				table: {
					caption: 'Which measurements you know, and the rule used',
					columns: ['You know', 'Rule used', 'Unique triangle?'],
					rows: [
						['Three sides (SSS)', 'Law of cosines, then angles', 'Yes, if the sides form a triangle'],
						['Two sides and the angle between (SAS)', 'Law of cosines for the third side, then the angles', 'Yes'],
						['Two angles and the side between (ASA)', 'Angle sum, then the law of sines', 'Yes'],
						['Two angles and a side (AAS)', 'Angle sum, then the law of sines', 'Yes'],
						['Two sides and an angle opposite one (SSA)', 'Law of sines', 'Not always. It can give zero, one or two triangles']
					]
				}
			},
			{
				heading: 'Area, perimeter and triangle types',
				paragraphs: [
					'The perimeter is the sum of the three sides. The area can be found from the sides alone, using Heron’s formula. For a triangle with sides a, b and c, you first find the semi-perimeter s, which is half the perimeter. Then the area is √(s(s − a)(s − b)(s − c)).',
					'Triangles are also grouped by their angles and sides. An acute triangle has all angles below 90°, a right triangle has one angle of exactly 90°, and an obtuse triangle has one angle above 90°. An equilateral triangle has three equal sides, and an isosceles triangle has two.',
					'For a simple area with a known base and height, the [area calculator](/area-calculator) gives the answer in one step. This tool is better when you only have the sides or the angles.'
				]
			},
			{
				heading: 'Tips for solving triangles',
				paragraphs: ['Most mistakes come from angle units and from matching sides with the wrong angles. Keep these in mind:'],
				list: [
					'**Check the sum of sides.** The two shorter sides must add up to more than the longest side, or no triangle exists.',
					'**Use degrees.** Enter angles in degrees, not radians.',
					'**Match each side with its angle.** Side a sits opposite angle A, and the same pattern applies to b and c.',
					'**Look for a second answer.** With SSA, check whether a second triangle also fits the data.',
					'**Check the total.** The three angles should add up to 180° after rounding.'
				]
			}
		],
		formulas: [
			{
				title: 'Law of cosines',
				expression: 'c² = a² + b² − 2ab × cos C',
				variables: [{ symbol: 'C', meaning: 'angle opposite side c' }]
			},
			{
				title: 'Law of sines',
				expression: 'a ÷ sin A = b ÷ sin B = c ÷ sin C',
				variables: [{ symbol: 'A, B, C', meaning: 'the three angles' }]
			},
			{
				title: 'Angle sum',
				expression: 'A + B + C = 180°',
				variables: []
			},
			{
				title: 'Area (Heron’s formula)',
				expression: 's = (a + b + c) ÷ 2,   Area = √(s(s − a)(s − b)(s − c))',
				variables: [{ symbol: 's', meaning: 'the semi-perimeter, half of the perimeter' }]
			}
		],
		example: {
			title: 'A triangle with sides 3, 4 and 5',
			steps: [
				'Angle A: cos A = (4² + 5² − 3²) ÷ (2 × 4 × 5) = 0.8, so A = 36.8699°.',
				'Angle B: cos B = (3² + 5² − 4²) ÷ (2 × 3 × 5) = 0.6, so B = 53.1301°.',
				'Angle C: 180° − 36.8699° − 53.1301° = 90°.',
				'Perimeter: 3 + 4 + 5 = 12. Semi-perimeter s = 6.',
				'Area: √(6 × 3 × 2 × 1) = √36 = 6.'
			],
			result: 'The triangle has angles of 36.8699°, 53.1301° and 90°, a perimeter of 12 and an area of 6.'
		},
		faq: [
			{
				q: 'How do I find the angles of a triangle from its sides?',
				a: 'Enter the three sides in the calculator. It uses the law of cosines to find each angle, then checks that the angles add up to 180°. The angles are shown in degrees.'
			},
			{
				q: 'Why can some SSA triangles have two answers?',
				a: 'When you know two sides and an angle opposite one of them, the shorter side can swing to meet the base in two positions. Both can be valid, so the calculator shows each triangle it finds.'
			},
			{
				q: 'What is the perimeter of a triangle?',
				a: 'It is the total length of its three sides. Add a, b and c together. For sides 3, 4 and 5, the perimeter is 12.'
			},
			{
				q: 'Can I use this calculator for a right triangle?',
				a: 'Yes. It works for any triangle, including right triangles. For a right triangle, the angle between the two legs is 90°, so the result is the same as the Pythagorean theorem.'
			}
		],
		sources: [
			{ title: 'Wolfram MathWorld: Law of Sines', url: 'https://mathworld.wolfram.com/LawofSines.html' },
			{ title: 'Wolfram MathWorld: Law of Cosines', url: 'https://mathworld.wolfram.com/LawofCosines.html' }
		]
	}
});
