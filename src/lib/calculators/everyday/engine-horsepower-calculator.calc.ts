import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './engine-horsepower-calculator.meta';

const isEt = (v: InputValues) => v.method !== 'trap';
const isTrap = (v: InputValues) => v.method === 'trap';
const imperial = (v: InputValues) => v.units !== 'met';
const metric = (v: InputValues) => v.units === 'met';

const KG_TO_LB = 2.20462262;
const KMH_TO_MPH = 0.621371;
const HP_TO_KW = 0.7456998716;

/** Hale's elapsed-time estimate: hp = weight ÷ (ET ÷ 5.825)³, weight in lb, ET in seconds. */
export function haleHpFromEt(weightLb: number, etSeconds: number): number {
	return weightLb / Math.pow(etSeconds / 5.825, 3);
}

/** Hale's trap-speed estimate: hp = weight × (MPH ÷ 234)³, weight in lb, speed in mph. */
export function haleHpFromTrap(weightLb: number, mph: number): number {
	return weightLb * Math.pow(mph / 234, 3);
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'method',
			label: 'Estimate from',
			type: 'select',
			display: 'segmented',
			default: 'et',
			options: [
				{ label: 'Elapsed time', value: 'et' },
				{ label: 'Trap speed', value: 'trap' }
			]
		},
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'imp',
			options: [
				{ label: 'Pounds and mph', value: 'imp' },
				{ label: 'Kilograms and km/h', value: 'met' }
			]
		},
		{ id: 'weightLb', label: 'Vehicle weight', type: 'number', default: 3000, min: 500, max: 10000, step: 1, suffix: 'lb', decimal: false, visibleWhen: imperial },
		{ id: 'weightKg', label: 'Vehicle weight', type: 'number', default: 1361, min: 200, max: 4500, step: 1, suffix: 'kg', decimal: false, visibleWhen: metric },
		{ id: 'et', label: 'Quarter-mile time', type: 'number', default: 13, min: 5, max: 30, step: 0.01, suffix: 's', visibleWhen: isEt },
		{ id: 'trapMph', label: 'Trap speed', type: 'number', default: 105, min: 30, max: 250, step: 0.1, suffix: 'mph', visibleWhen: (v) => isTrap(v) && imperial(v) },
		{ id: 'trapKmh', label: 'Trap speed', type: 'number', default: 169, min: 50, max: 400, step: 0.1, suffix: 'km/h', visibleWhen: (v) => isTrap(v) && metric(v) }
	],
	calculate(v): CalculationResult {
		const weightLb = metric(v) ? Number(v.weightKg) * KG_TO_LB : Number(v.weightLb);
		if (!(weightLb > 0)) {
			return { primaryResult: DASH, primaryLabel: 'Estimated engine power', summary: 'Enter the vehicle weight.' };
		}

		let hp: number;
		let basis: string;
		let method: string;
		if (v.method === 'trap') {
			const mph = metric(v) ? Number(v.trapKmh) * KMH_TO_MPH : Number(v.trapMph);
			if (!(mph > 0)) {
				return { primaryResult: DASH, primaryLabel: 'Estimated engine power', summary: 'Enter a trap speed above zero.' };
			}
			hp = haleHpFromTrap(weightLb, mph);
			basis = `${num(mph, 1, 1)} mph trap speed`;
			method = 'Hale trap speed';
		} else {
			const et = Number(v.et);
			if (!(et > 0)) {
				return { primaryResult: DASH, primaryLabel: 'Estimated engine power', summary: 'Enter a quarter-mile time above zero.' };
			}
			hp = haleHpFromEt(weightLb, et);
			basis = `${num(et, 2, 2)} s quarter mile`;
			method = 'Hale elapsed time';
		}

		return {
			primaryResult: `${num(hp, 0)} hp`,
			primaryLabel: 'Estimated engine power',
			summary: `Estimate for a car weighing ${num(weightLb, 0)} lb, from a ${basis}.`,
			secondaryMetrics: [
				{ label: 'Kilowatts (kW)', value: `${num(hp * HP_TO_KW, 0)} kW` },
				{ label: 'Weight used', value: `${num(weightLb, 0)} lb` },
				{ label: 'Pounds per hp', value: `${num(weightLb / hp, 1, 1)} lb/hp` },
				{ label: 'Method', value: method }
			]
		};
	},
	content: {
		intro:
			'Estimate how much power a car makes from its weight and a quarter-mile time or trap speed. This engine horsepower calculator gives a rough figure in horsepower and kilowatts, using a formula widely known as Hale’s.',
		howTo: [
			'Choose pounds and mph, or kilograms and km/h, to match your figures.',
			'Enter the vehicle weight, including the driver and fuel, if you know it.',
			'Pick elapsed time for a quarter-mile run, or trap speed for the speed at the end of the run.',
			'Read the estimated horsepower, the kilowatts and the pounds per horsepower.'
		],
		about: [
			{
				heading: 'What this estimate does',
				paragraphs: [
					'A quarter-mile run is a standard drag race distance. The time it takes, and the speed at the end of the run, tell you a lot about how much power is pushing the car. This calculator turns those figures into a power estimate.',
					'The result is an estimate, not a measurement. It does not know about the gearing, the drivetrain, the tyres, the grip or the driver. The [tire size calculator](/tire-size-calculator) shows how tyre size changes speed readings. For a true figure, an engine dyno test is the only reliable method.'
				]
			},
			{
				heading: 'How the estimate is worked out',
				paragraphs: [
					'For elapsed time, the formula is weight divided by the quarter-mile time divided by 5.825, all cubed. For trap speed, it is weight times the trap speed divided by 234, all cubed. Both are rules of thumb built from track data.',
					'Heavier cars need more power for the same time, and faster times need more power for the same weight. Because the power rises with the cube of the time or speed ratio, small changes in time make a big change in the estimate.'
				]
			},
			{
				heading: 'Using time or trap speed',
				paragraphs: [
					'Elapsed time is the total time from the start line to the finish line. Trap speed is the speed measured near the finish. Trap speed is less affected by the start, so it can be more useful when the launch varies.',
					'Both methods assume a fairly typical car. Four-wheel drive, turbo lag or a very short gear ratio can make the real power differ from the estimate.'
				]
			},
			{
				heading: 'Pounds per horsepower',
				paragraphs: [
					'The calculator also shows pounds per horsepower, which is the weight divided by the power. A lower number means more power for each pound, and usually quicker acceleration. The figure varies widely between cars, so compare it only with similar vehicles.',
					'Motorbikes, trucks and electric vehicles are very different, so this formula is designed for petrol and diesel cars. For a broader view of speed and distance, the [speed calculator](/speed-calculator) is useful. For torque and rpm figures, use the [horsepower calculator](/horsepower-calculator).'
				],
				list: [
					'Use a weight that includes the fuel and driver for the run.',
					'Check your time against the official timing slip, not a stopwatch.',
					'Compare estimates made with the same method, not elapsed time against trap speed.',
					'Treat the number as a guide, and get a dyno test for an exact figure. For fuel costs on a trip, the [fuel cost calculator](/fuel-cost-calculator) helps.'
				]
			},
			{
				heading: 'Safety and legal notes',
				paragraphs: [
					'Drag racing and fast driving on public roads are dangerous, and they are illegal in most places. Racing on a public road can cause a crash that injures or kills people who are not in the race.',
					'If you want to test performance, use a closed track with the correct safety equipment, and follow the event rules.'
				]
			}
		],
		formulas: [
			{
				title: 'From elapsed time',
				expression: 'hp = weight (lb) ÷ (quarter-mile time ÷ 5.825)³',
				variables: [
					{ symbol: 'weight', meaning: 'the vehicle weight in pounds' },
					{ symbol: 'time', meaning: 'the quarter-mile time in seconds' },
					{ symbol: '5.825', meaning: 'a constant from the rule of thumb' }
				]
			},
			{
				title: 'From trap speed',
				expression: 'hp = weight (lb) × (trap speed (mph) ÷ 234)³',
				variables: [{ symbol: '234', meaning: 'a constant from the rule of thumb' }]
			},
			{
				title: 'Kilowatts and pounds per horsepower',
				expression: 'kW = hp × 0.7457\nlb per hp = weight ÷ hp',
				variables: [{ symbol: 'lb per hp', meaning: 'pounds of vehicle weight for each horsepower' }]
			}
		],
		example: {
			title: 'A 3,000 lb car with a 13.00 second quarter mile',
			steps: [
				'Divide the time by 5.825: 13.00 ÷ 5.825 = 2.2318',
				'Cube it: 2.2318³ = 11.12',
				'Divide the weight: 3,000 ÷ 11.12 = 270 hp',
				'Kilowatts: 270 × 0.7457 = 201 kW',
				'Pounds per horsepower: 3,000 ÷ 270 = 11.1 lb/hp'
			],
			result: 'The estimate is about 270 hp, or 201 kW, which is about 11.1 pounds per horsepower.'
		},
		faq: [
			{
				q: 'How do I estimate horsepower from a quarter-mile time?',
				a: 'Divide the time by 5.825, cube the result, then divide the vehicle weight in pounds by it. The answer is a rough estimate of horsepower.'
			},
			{
				q: 'Is the trap speed method more accurate?',
				a: 'It is not always more accurate, but it is less affected by the start. Use the same method when you compare two cars, so the results are fair.'
			},
			{
				q: 'Why does the weight matter so much?',
				a: 'The estimate scales with weight. A heavier car needs more power to run the same time, so the weight you enter changes the answer directly.'
			},
			{
				q: 'Can I use this for a motorbike or an electric car?',
				a: 'The formula is built for petrol and diesel cars. Motorbikes and electric cars have different drivetrains and power delivery, so the estimate is less reliable for them.'
			}
		],
		sources: [{ title: 'NIST, The International System of Units (SI), SP 330', url: 'https://www.nist.gov/pml/special-publication-330' }]
	}
});
