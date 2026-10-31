import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './weight-calculator.meta';

const isKg = (v: InputValues) => v.massUnit !== 'lb';
const isLb = (v: InputValues) => v.massUnit === 'lb';

/** Standard gravity on Earth, in m/s² (defined value). */
const EARTH_G = 9.80665;
const KG_PER_LB = 0.45359237;
const LB_PER_KG = 2.20462262;
const LBF_PER_N = 0.2248089431;

/** Surface gravity in m/s², from NASA's planetary fact sheet. */
const GRAVITY: Record<string, number> = {
	earth: EARTH_G,
	moon: 1.62,
	mercury: 3.7,
	venus: 8.87,
	mars: 3.71,
	jupiter: 24.79,
	saturn: 10.44,
	uranus: 8.87,
	neptune: 11.15,
	pluto: 0.62
};

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'massUnit',
			label: 'Mass unit',
			type: 'select',
			display: 'segmented',
			default: 'kg',
			options: [
				{ label: 'Kilograms (kg)', value: 'kg' },
				{ label: 'Pounds (lb)', value: 'lb' }
			]
		},
		{ id: 'massKg', label: 'Mass', type: 'number', default: 70, min: 0.01, max: 100000, step: 0.1, suffix: 'kg', visibleWhen: isKg },
		{ id: 'massLb', label: 'Mass', type: 'number', default: 154, min: 0.01, max: 220000, step: 0.1, suffix: 'lb', visibleWhen: isLb },
		{
			id: 'body',
			label: 'Where',
			type: 'select',
			default: 'earth',
			options: [
				{ label: 'Earth (9.81 m/s²)', value: 'earth' },
				{ label: 'Moon (1.62 m/s²)', value: 'moon' },
				{ label: 'Mercury (3.70 m/s²)', value: 'mercury' },
				{ label: 'Venus (8.87 m/s²)', value: 'venus' },
				{ label: 'Mars (3.71 m/s²)', value: 'mars' },
				{ label: 'Jupiter (24.79 m/s²)', value: 'jupiter' },
				{ label: 'Saturn (10.44 m/s²)', value: 'saturn' },
				{ label: 'Uranus (8.87 m/s²)', value: 'uranus' },
				{ label: 'Neptune (11.15 m/s²)', value: 'neptune' },
				{ label: 'Pluto (0.62 m/s²)', value: 'pluto' }
			]
		}
	],
	calculate(v): CalculationResult {
		const kg = isLb(v) ? Number(v.massLb) * KG_PER_LB : Number(v.massKg);
		const g = GRAVITY[String(v.body)];
		if (!(kg > 0) || g === undefined) {
			return { primaryResult: DASH, primaryLabel: 'Weight', summary: 'Enter a mass above zero and pick a body.' };
		}
		const weightN = kg * g;
		const scaleKg = weightN / EARTH_G;
		const scaleLb = scaleKg * LB_PER_KG;
		const lbf = weightN * LBF_PER_N;
		const share = (g / EARTH_G) * 100;

		return {
			primaryResult: `${num(weightN, 2, 2)} N`,
			primaryLabel: 'Weight',
			summary: `That is ${num(share, 1, 1)}% of your weight on Earth.`,
			secondaryMetrics: [
				{ label: 'Scale reading (kg)', value: `${num(scaleKg, 2, 2)} kg` },
				{ label: 'Scale reading (lb)', value: `${num(scaleLb, 2, 2)} lb` },
				{ label: 'Weight in pounds-force', value: `${num(lbf, 2, 2)} lbf` },
				{ label: 'Gravity used', value: `${num(g, 2, 2)} m/s²` },
				{ label: 'Mass', value: `${num(kg, 2, 2)} kg` }
			]
		};
	},
	content: {
		intro:
			'Find how much an object weighs on Earth, the Moon, Mars or another planet. Enter a mass in kilograms or pounds, pick a world, and the weight calculator gives the force in newtons and the scale reading.',
		howTo: [
			'Choose kilograms or pounds, then enter the mass of the object.',
			'Pick the body, such as Earth, the Moon or Mars.',
			'Read the weight in newtons, which is the force, and the scale reading, which is the mass a scale would show.',
			'Compare with the Earth figure to see how much lighter or heavier the object would feel.'
		],
		about: [
			{
				heading: 'Mass and weight are different',
				paragraphs: [
					'Mass is the amount of matter in something. It stays the same wherever you take it. Weight is the force that gravity pulls on that mass. It is measured in newtons (N) in the SI system, or in pounds-force (lbf) in the imperial system.',
					'On Earth, most people use kilograms or pounds to mean weight. Strictly speaking, a kilogram is a unit of mass, and the newton is the unit of weight.'
				]
			},
			{
				heading: 'How weight depends on gravity',
				paragraphs: [
					'Weight is mass times the gravity of the body where you stand. The Earth’s standard gravity is 9.80665 metres per second squared. The Moon’s surface gravity is about 1.62 metres per second squared, which is roughly one-sixth of Earth’s.',
					'So a 70 kg person weighs about 686 newtons on Earth and about 113 newtons on the Moon. The mass is still 70 kg, but the pull is much weaker. If you know the volume of an object too, the [density calculator](/density-calculator) gives its mass.'
				],
				table: {
					caption: 'Surface gravity of some bodies (NASA)',
					columns: ['Body', 'Gravity (m/s²)', 'Share of Earth gravity'],
					rows: [
						['Moon', '1.62', 'about 16.5%'],
						['Mars', '3.71', 'about 38%'],
						['Jupiter', '24.79', 'about 253%'],
						['Pluto', '0.62', 'about 6%']
					]
				}
			},
			{
				heading: 'What a scale reading means',
				paragraphs: [
					'A bathroom scale or a spring scale measures force, then shows it as a mass. It assumes Earth gravity. So on the Moon, the scale reading is the weight divided by Earth’s gravity, which is about 11.56 kg for a 70 kg person.',
					'This is why a scale reading is a mass, not a weight, and why a true weight on another world needs the newton figure.'
				]
			},
			{
				heading: 'Tips for using weight figures',
				paragraphs: [
					'Use newtons for engineering, force and structural work. Use kilograms for everyday mass, such as food, shipping and sports equipment. The [mass calculator](/mass-calculator) handles the everyday side.',
					'When you convert between units, check the system. A pound-force is about 4.45 newtons, and a pound is a unit of mass, so the two are not interchangeable. The [unit converter](/unit-converter) helps with other conversions.'
				],
				list: [
					'Write down the unit next to every number, such as kg or N.',
					'Use the same gravity figure for a whole calculation.',
					'Remember that the scale on your bathroom floor reads mass on Earth.',
					'Check the source of the planetary values before you use them in a report.'
				]
			},
			{
				heading: 'Safety and heavy loads',
				paragraphs: [
					'Heavy loads can cause injury, and the weight of an object tells you how much help you may need to move it. Use trolleys, hoists or two people for anything that is too heavy to lift safely on your own.',
					'Check the rated load of any lifting equipment before you use it. The rated figure is the maximum safe load, not a target.'
				]
			}
		],
		formulas: [
			{
				title: 'Weight',
				expression: 'Weight (N) = mass (kg) × gravity (m/s²)',
				variables: [
					{ symbol: 'mass', meaning: 'the amount of matter, in kilograms' },
					{ symbol: 'gravity', meaning: 'the surface gravity of the body, such as 9.80665 m/s² on Earth' }
				]
			},
			{
				title: 'Scale reading',
				expression: 'Scale reading (kg) = weight (N) ÷ 9.80665',
				variables: [{ symbol: '9.80665', meaning: 'the standard gravity on Earth, in m/s²' }]
			},
			{
				title: 'Pounds-force',
				expression: 'Weight (lbf) = weight (N) × 0.2248',
				variables: [{ symbol: '0.2248', meaning: 'pounds-force in one newton' }]
			}
		],
		example: {
			title: 'A 70 kg person on the Moon',
			steps: [
				'Weight: 70 × 1.62 = 113.40 newtons',
				'Share of Earth: 1.62 ÷ 9.80665 = 16.5%',
				'Scale reading: 113.40 ÷ 9.80665 = 11.56 kg',
				'In pounds: 11.56 × 2.20462 = 25.49 lb'
			],
			result: 'The person weighs 113.40 N on the Moon. A scale there would show about 11.56 kg.'
		},
		faq: [
			{
				q: 'How much would I weigh on the Moon?',
				a: 'About one-sixth of your Earth weight. The force is roughly 16.5% of the Earth value. Enter your mass and choose the Moon to see the exact figure.'
			},
			{
				q: 'What is the difference between a newton and a kilogram?',
				a: 'A kilogram measures mass, and a newton measures force. On Earth, 1 kg of mass has a weight of about 9.8 N. The newton is the correct unit for weight.'
			},
			{
				q: 'Why does a scale on the Moon show a different reading?',
				a: 'Scales measure the force you push down with and convert it to mass using Earth gravity. On the Moon, the pull is weaker, so the reading is lower, even though your mass is the same.'
			},
			{
				q: 'Where do the planetary gravity values come from?',
				a: 'They come from NASA’s planetary fact sheet, which gives the surface gravity of each body. Values are rounded, so small differences are normal.'
			}
		],
		sources: [{ title: 'NASA, planetary fact sheet', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/' }]
	}
});
