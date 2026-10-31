import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num } from '../format';
import meta from './pace-calculator.meta';

/** Exact definition of the international mile. */
const KM_PER_MI = 1.609344;

/** Whole-second clock: "50:00", or "1:05:30" when the time reaches an hour. */
export function clock(sec: number): string {
	const t = Math.round(sec);
	const h = Math.floor(t / 3600);
	const m = Math.floor((t % 3600) / 60);
	const s = String(t % 60).padStart(2, '0');
	return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Minutes and seconds per unit, e.g. "5:00". */
export function pace(secPerUnit: number): string {
	const t = Math.round(secPerUnit);
	return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'What do you want to find?',
			type: 'select',
			display: 'segmented',
			default: 'pace',
			options: [
				{ label: 'Find pace', value: 'pace' },
				{ label: 'Find time', value: 'time' },
				{ label: 'Find distance', value: 'distance' }
			]
		},
		{
			id: 'unit',
			label: 'Distance unit',
			type: 'select',
			display: 'segmented',
			default: 'km',
			options: [
				{ label: 'Kilometres', value: 'km' },
				{ label: 'Miles', value: 'mi' }
			]
		},
		{
			id: 'distKm',
			label: 'Distance',
			type: 'number',
			default: 10,
			min: 0.01,
			max: 1000,
			step: 0.01,
			suffix: 'km',
			visibleWhen: (v) => v.mode !== 'distance' && v.unit !== 'mi'
		},
		{
			id: 'distMi',
			label: 'Distance',
			type: 'number',
			default: 6.2,
			min: 0.01,
			max: 620,
			step: 0.01,
			suffix: 'mi',
			visibleWhen: (v) => v.mode !== 'distance' && v.unit === 'mi'
		},
		{
			id: 'time',
			label: 'Time',
			type: 'duration',
			units: ['h', 'm', 's'],
			default: '0:50:0',
			visibleWhen: (v) => v.mode !== 'time'
		},
		{
			id: 'pace',
			label: 'Pace',
			type: 'duration',
			units: ['m', 's'],
			default: '5:0',
			help: 'Minutes and seconds for each unit of distance you chose above.',
			visibleWhen: (v) => v.mode !== 'pace'
		}
	],
	calculate(v): CalculationResult {
		const isMi = v.unit === 'mi';
		const unit = isMi ? 'mi' : 'km';
		const toKm = isMi ? KM_PER_MI : 1;
		const m = String(v.mode);

		// Distance in the chosen unit, total seconds, and seconds per chosen unit.
		let dist = isMi ? Number(v.distMi) : Number(v.distKm);
		let sec = Number(v.time);
		let perUnit = Number(v.pace);
		let primaryResult: string;
		let primaryLabel: string;
		let summary: string;

		if (m === 'pace') {
			if (!(dist > 0) || !(sec > 0)) return { primaryResult: DASH, primaryLabel: 'Pace', summary: 'Enter a distance and a time.' };
			perUnit = sec / dist;
			primaryResult = `${pace(perUnit)} per ${unit}`;
			primaryLabel = 'Pace';
			summary = `${num(dist, 2)} ${unit} in ${clock(sec)}.`;
		} else if (m === 'time') {
			if (!(dist > 0) || !(perUnit > 0)) return { primaryResult: DASH, primaryLabel: 'Finish time', summary: 'Enter a distance and a pace.' };
			sec = perUnit * dist;
			primaryResult = clock(sec);
			primaryLabel = 'Finish time';
			summary = `${num(dist, 2)} ${unit} at ${pace(perUnit)} per ${unit}.`;
		} else {
			if (!(sec > 0) || !(perUnit > 0)) return { primaryResult: DASH, primaryLabel: 'Distance', summary: 'Enter a time and a pace.' };
			dist = sec / perUnit;
			primaryResult = `${num(dist, 2)} ${unit}`;
			primaryLabel = 'Distance';
			summary = `${clock(sec)} at ${pace(perUnit)} per ${unit}.`;
		}

		const km = dist * toKm;
		const mi = km / KM_PER_MI;
		const hours = sec / 3600;
		if (!Number.isFinite(km) || !Number.isFinite(sec) || km <= 0 || sec <= 0)
			return { primaryResult: DASH, primaryLabel, summary: 'Check the numbers and try again.' };

		return {
			primaryResult,
			primaryLabel,
			summary,
			secondaryMetrics: [
				{ label: 'Pace per km', value: `${pace(sec / km)} per km` },
				{ label: 'Pace per mile', value: `${pace(sec / mi)} per mi` },
				{ label: 'Speed', value: `${num(km / hours, 2, 2)} km/h` },
				{ label: 'Speed (mph)', value: `${num(mi / hours, 2, 2)} mph` }
			]
		};
	},
	content: {
		intro:
			'Use this pace calculator to work out your running or walking pace, finish time or distance from any two of the three. It shows pace per kilometre and per mile, plus your speed.',
		howTo: [
			'Choose what you want to find: pace, finish time or distance.',
			'Pick kilometres or miles. The distance and pace are read in that unit.',
			'Enter the two values you know. Time is in hours, minutes and seconds. Pace is in minutes and seconds.',
			'Read the result, along with the pace per km and per mile and your speed.'
		],
		about: [
			{
				heading: 'What is pace?',
				paragraphs: [
					'Pace is how long it takes you to cover one unit of distance, usually a kilometre or a mile. A pace of 5:00 per km means five minutes for each kilometre. Runners use pace because it is easy to hold steady and to compare.',
					'Speed is the opposite idea: distance covered per hour. A pace of 5:00 per km is the same as 12 km/h. Many treadmills and bikes show speed, while running watches often show pace. For other speed conversions, try the [speed calculator](/speed-calculator).'
				]
			},
			{
				heading: 'How the calculator works',
				paragraphs: [
					'Pace, time and distance are linked by one simple formula. Pace equals time divided by distance. If you know any two, you can find the third.',
					'This tool changes between units for you. One mile is exactly 1.609344 km, so a pace of 5:00 per km is about 8:03 per mile. It also shows your speed in km/h and mph. If you only need a distance, the [distance calculator](/distance-calculator) can help. In the “find distance” mode here, the tool divides your time by your pace instead.'
				]
			},
			{
				heading: 'The three ways to use it',
				paragraphs: [
					'Choose “Find pace” when you know how far you went and how long it took. Choose “Find time” to see how long a distance will take at a pace you want to hold. Choose “Find distance” to see how far you would go in a set time at a chosen pace.',
					'For example, at 6:00 per km, you would cover 10 km in 1 hour. At the same pace, 45 minutes would take you 7.5 km. The same logic works for walking, cycling or swimming, if you pick a pace in minutes and seconds.'
				]
			},
			{
				heading: 'Pace and race times',
				paragraphs: [
					'The table shows what some steady paces mean over common race distances. A half marathon is 21.0975 km and a marathon is 42.195 km. Real races are rarely run at exactly even pace, so treat these as a guide. Your own fitness, training and the course all matter.'
				],
				table: {
					caption: 'Finish times at an even pace',
					columns: ['Pace per km', 'Per mile', '5 km', '10 km', 'Half marathon', 'Marathon'],
					rows: [
						['4:00', '6:26', '20:00', '40:00', '1:24:23', '2:48:47'],
						['5:00', '8:03', '25:00', '50:00', '1:45:29', '3:30:59'],
						['6:00', '9:39', '30:00', '1:00:00', '2:06:35', '4:13:10'],
						['7:00', '11:16', '35:00', '1:10:00', '2:27:41', '4:55:22']
					]
				}
			},
			{
				heading: 'Tips for setting a pace',
				paragraphs: ['Choosing a pace is partly about your goal and partly about how you feel. Some ideas:'],
				list: [
					'**Start easier than you think.** A pace you can hold while talking is a good base for most runs.',
					'**Build up slowly.** Add distance or speed a little at a time, and rest between harder sessions.',
					'**Use the calculator for race goals.** Enter your target time and distance to see the pace you need.',
					'**Allow for hills and weather.** They slow almost everyone down.',
					'**Count stops.** The time you enter includes any rest, so add it yourself.'
				]
			},
			{
				heading: 'Related tools and safety',
				paragraphs: [
					'To see how hard your body is working, try the [target heart rate calculator](/target-heart-rate-calculator). To estimate the energy you use, see the [calories burned calculator](/calories-burned-calculator).',
					'Please check with a doctor before you start a new exercise programme, especially if you have a health condition or have been inactive. Stop and get help if you feel chest pain, dizziness or severe breathlessness.'
				]
			}
		],
		formulas: [
			{
				title: 'Pace',
				expression: 'Pace = time ÷ distance',
				variables: [{ symbol: 'pace', meaning: 'seconds per kilometre or mile' }]
			},
			{
				title: 'Time and distance',
				expression: 'Time = pace × distance, and Distance = time ÷ pace',
				variables: []
			},
			{
				title: 'Speed',
				expression: 'Speed = distance ÷ time, in km/h or mph, where 1 mi = 1.609344 km',
				variables: []
			}
		],
		example: {
			title: 'A 10 km run in 50 minutes',
			steps: [
				'50 minutes = 3,000 seconds',
				'Pace = 3,000 s ÷ 10 km = 300 s per km, or 5:00 per km',
				'Per mile: 3,000 s ÷ 6.21 mi = 483 s, or 8:03 per mile',
				'Speed = 10 km ÷ (3,000 s ÷ 3,600 s per hour) = 12.00 km/h, or 7.46 mph'
			],
			result: 'Pace 5:00 per km (8:03 per mile), speed 12.00 km/h (7.46 mph).'
		},
		faq: [
			{
				q: 'How do I calculate my running pace?',
				a: 'Divide your time by your distance. For example, 50 minutes for 10 km is 5 minutes per km. Choose “Find pace” above, enter the distance and time, and the calculator does it for you.'
			},
			{
				q: 'How do I convert pace from per km to per mile?',
				a: 'Multiply the pace per km by 1.609. For example, 5:00 per km is about 8:03 per mile. The calculator does this for you.'
			},
			{
				q: 'Why does my watch show a different distance?',
				a: 'GPS devices estimate distance from satellite signals, which can drift on twisty routes or under tree cover. Treat the result as a close estimate.'
			},
			{
				q: 'Does the time include rest stops?',
				a: 'Only if you enter it. The calculator uses the total time you type in, so add any stops yourself.'
			},
			{
				q: 'What pace should I aim for?',
				a: 'There is no single right pace. Choose one that feels comfortable for the effort you want, and build up gradually.'
			}
		],
		sources: [
			{ title: 'World Health Organization — Physical activity', url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity' }
		],
		disclaimer:
			'These are estimates from the numbers you enter. Check with a doctor before starting a new exercise programme, especially if you have a health condition.'
	}
});
