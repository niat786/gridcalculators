import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './speed-calculator.meta';

type DistUnit = 'km' | 'mi' | 'm';
type SpeedUnit = 'km/h' | 'mph' | 'm/s' | 'knots';

/** Metres in one distance unit. */
const METRES: Record<DistUnit, number> = { km: 1000, mi: 1609.344, m: 1 };
/** Metres per second in one speed unit. A knot is 1,852 m per hour. */
const MPS: Record<SpeedUnit, number> = { 'km/h': 1000 / 3600, mph: 0.44704, 'm/s': 1, knots: 1852 / 3600 };

/** Whole seconds to h:mm:ss. */
export function hms(seconds: number): string {
	const total = Math.round(seconds);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const fail = (summary: string): CalculationResult => ({
	primaryResult: DASH,
	primaryLabel: 'Result',
	summary
});

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'solve',
			label: 'Solve for',
			type: 'select',
			default: 'speed',
			display: 'menu',
			options: [
				{ label: 'Speed', value: 'speed' },
				{ label: 'Distance', value: 'distance' },
				{ label: 'Time', value: 'time' }
			]
		},
		{
			id: 'distance',
			label: 'Distance',
			type: 'number',
			default: 150,
			min: 0,
			max: 1000000000,
			visibleWhen: (v) => v.solve !== 'distance'
		},
		{
			id: 'distUnit',
			label: 'Distance unit',
			type: 'select',
			default: 'km',
			display: 'segmented',
			options: [
				{ label: 'km', value: 'km' },
				{ label: 'mi', value: 'mi' },
				{ label: 'm', value: 'm' }
			]
		},
		{
			id: 'time',
			label: 'Time',
			type: 'duration',
			units: ['h', 'm', 's'],
			default: '2:30:0',
			visibleWhen: (v) => v.solve !== 'time',
			help: 'Hours, minutes and seconds.'
		},
		{
			id: 'speed',
			label: 'Speed',
			type: 'number',
			default: 60,
			min: 0,
			max: 1000000000,
			visibleWhen: (v) => v.solve !== 'speed'
		},
		{
			id: 'speedUnit',
			label: 'Speed unit',
			type: 'select',
			default: 'km/h',
			display: 'segmented',
			options: [
				{ label: 'km/h', value: 'km/h' },
				{ label: 'mph', value: 'mph' },
				{ label: 'm/s', value: 'm/s' },
				{ label: 'knots', value: 'knots' }
			]
		}
	],
	calculate(v: InputValues): CalculationResult {
		const solve = String(v.solve);
		const distUnit = String(v.distUnit) as DistUnit;
		const speedUnit = String(v.speedUnit) as SpeedUnit;
		if (!(distUnit in METRES) || !(speedUnit in MPS)) return fail('Pick a distance unit and a speed unit.');

		// Work in metres, metres per second and seconds, then convert for display.
		let metres: number;
		let mps: number;
		let seconds: number;
		if (solve === 'speed') {
			metres = Number(v.distance) * METRES[distUnit];
			seconds = Number(v.time);
			if (!(metres >= 0) || !(seconds > 0) || !Number.isFinite(metres) || !Number.isFinite(seconds)) {
				return fail('Enter a distance of zero or more, and a time above zero.');
			}
			mps = metres / seconds;
		} else if (solve === 'distance') {
			mps = Number(v.speed) * MPS[speedUnit];
			seconds = Number(v.time);
			if (!(mps >= 0) || !(seconds >= 0) || !Number.isFinite(mps) || !Number.isFinite(seconds)) {
				return fail('Enter a speed of zero or more, and a time.');
			}
			metres = mps * seconds;
		} else if (solve === 'time') {
			metres = Number(v.distance) * METRES[distUnit];
			mps = Number(v.speed) * MPS[speedUnit];
			if (!(metres >= 0) || !(mps > 0) || !Number.isFinite(metres) || !Number.isFinite(mps)) {
				return fail('Enter a distance of zero or more, and a speed above zero.');
			}
			seconds = metres / mps;
		} else {
			return fail('Pick speed, distance or time to solve for.');
		}

		const speedIn = (u: SpeedUnit) => num(mps / MPS[u], 2);
		const distance = metres / METRES[distUnit];
		const distanceText = `${num(distance, 2)} ${distUnit}`;
		const time = hms(seconds);

		const summary =
			solve === 'speed'
				? `Speed = distance ÷ time, using ${distanceText} in ${time}.`
				: solve === 'distance'
					? `Distance = speed × time, using ${speedIn(speedUnit)} ${speedUnit} for ${time}.`
					: `Time = distance ÷ speed, using ${distanceText} at ${speedIn(speedUnit)} ${speedUnit}.`;

		const primary =
			solve === 'speed'
				? { primaryResult: `${speedIn(speedUnit)} ${speedUnit}`, primaryLabel: 'Speed' }
				: solve === 'distance'
					? { primaryResult: distanceText, primaryLabel: 'Distance' }
					: { primaryResult: time, primaryLabel: 'Time (h:mm:ss)' };

		return {
			...primary,
			summary,
			secondaryMetrics: [
				{ label: 'Speed in km/h', value: speedIn('km/h') },
				{ label: 'Speed in mph', value: speedIn('mph') },
				{ label: 'Speed in m/s', value: speedIn('m/s') },
				{ label: 'Speed in knots', value: speedIn('knots') },
				{ label: 'Distance', value: distanceText },
				{ label: 'Time', value: time }
			]
		};
	},
	content: {
		intro:
			'Solve for speed, distance or time when you know the other two. Speed is shown in km/h, mph, m/s and knots, so you can compare figures from maps, cars, boats and planes.',
		howTo: [
			'Choose what you want to solve for: speed, distance or time.',
			'Enter the two values you know, and pick the distance unit and the speed unit.',
			'Enter time as hours, minutes and seconds. Leave a box empty to count it as zero.',
			'Read the main answer, then the speed in each unit below it.'
		],
		about: [
			{
				heading: 'Average speed and the basic formula',
				paragraphs: [
					'Speed is how far something travels in a given time. The basic formula is distance divided by time. This gives your average speed over the whole trip, including any stops, slow sections and traffic. Speed and time are linked, so doubling your speed halves the time for the same distance.',
					'A speedometer shows your speed at one moment. Your average speed is usually lower than the top speeds you reach, because it includes time spent slowing down, waiting or stopping. Averages are useful for planning, because they include the stops you will really make.'
				]
			},
			{
				heading: 'Speed units around the world',
				paragraphs: [
					'Most of the world measures road speed in kilometres per hour (km/h). The US and the UK use miles per hour (mph) on road signs, so check the signs before you drive abroad. Canada, Australia and most of Europe use km/h.',
					'Ships and aircraft use knots, which are nautical miles per hour. Weather services often report wind in knots or metres per second. Scientists and many sports use metres per second (m/s). Each unit is useful in its own setting, so the calculator shows all four.'
				]
			},
			{
				heading: 'Why the distance unit matters',
				paragraphs: [
					'A mile is 1.609344 kilometres, and a nautical mile is exactly 1,852 metres. Mixing them up can give a very different answer. For example, a boat that goes 10 knots travels 10 nautical miles in an hour, which is about 18.5 km.',
					'When you enter a distance, choose the unit printed on your map or route. The calculator converts it for you before it works out the answer. If a route has several legs, work out each one separately and add the times.'
				]
			},
			{
				heading: 'Planning travel time',
				paragraphs: [
					'To find how long a trip will take, choose “Time” as the answer. Enter the distance and your expected average speed. For example, 300 km at 80 km/h takes 3.75 hours, which is 3 hours and 45 minutes.',
					'Remember that rest stops, fuel stops and border checks add time. Allow extra minutes on longer trips, and check the average speed you expect on that road, not the speed limit. The [time calculator](/time-calculator) can add those stops to your arrival time.'
				]
			},
			{
				heading: 'Speed and running pace',
				paragraphs: [
					'Runners and walkers usually think in pace, which is minutes per kilometre or per mile, rather than speed. Pace is the inverse of speed, so a faster pace means a lower number of minutes.',
					'To work out pace from a race time, the [pace calculator](/pace-calculator) is the right tool. For fuel use on a long drive, the [fuel cost calculator](/fuel-cost-calculator) shows the cost of the trip.'
				]
			}
		],
		formulas: [
			{
				title: 'Speed',
				expression: 'Speed = distance ÷ time',
				variables: [{ symbol: 'speed', meaning: 'Distance covered per unit of time' }]
			},
			{
				title: 'Distance and time',
				expression: 'Distance = speed × time, and time = distance ÷ speed',
				variables: []
			},
			{
				title: 'Unit conversions',
				expression: '1 mi = 1.609344 km, 1 knot = 1.852 km/h, 1 m/s = 3.6 km/h, 1 mph = 1.609344 km/h',
				variables: []
			}
		],
		example: {
			title: '150 km in 2 hours 30 minutes',
			steps: [
				'Time = 2 h 30 min = 2.5 hours.',
				'Speed = 150 km ÷ 2.5 h = 60 km/h.',
				'In mph: 60 ÷ 1.609344 = 37.28 mph.',
				'In m/s: 150 000 m ÷ 9 000 s = 16.67 m/s.'
			],
			result: 'The speed is 60 km/h, or 37.28 mph, 16.67 m/s and 32.4 knots.'
		},
		faq: [
			{
				q: 'What is the formula for speed?',
				a: 'Speed equals distance divided by time. Travelling 150 km in 2.5 hours is an average speed of 60 km/h.'
			},
			{
				q: 'Is this average speed or instant speed?',
				a: 'It gives average speed over the whole trip. It does not show how fast you were going at any single moment.'
			},
			{
				q: 'Why is my average speed lower than my speedometer?',
				a: 'Average speed includes stops, traffic and slow sections. A short burst of high speed does not raise the average much over a long trip.'
			},
			{
				q: 'How many km/h is a knot?',
				a: 'One knot is one nautical mile per hour, which is 1.852 km/h. Ships and aircraft use knots.'
			},
			{
				q: 'Can I enter the time in minutes only?',
				a: 'Yes. Leave hours and seconds empty, or enter 0 for them, and put the minutes in the middle box.'
			}
		],
		sources: [{ title: 'NIST — SI Units and conversion factors (Special Publication 811)', url: 'https://www.nist.gov/pml/special-publication-811' }]
	}
});
