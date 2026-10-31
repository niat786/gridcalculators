import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './calories-burned-calculator.meta';

const metric = (v: InputValues) => v.units === 'metric';
const imperial = (v: InputValues) => v.units === 'imperial';

/**
 * MET values (multiples of resting energy use) from the Compendium of Physical Activities,
 * Ainsworth et al. (2011). Rounded to one decimal place as published.
 */
export const ACTIVITIES: { id: string; label: string; met: number }[] = [
	{ id: 'walk-3', label: 'Walking, 2.8–3.2 mph (moderate pace)', met: 3.5 },
	{ id: 'walk-35', label: 'Walking, 3.5 mph', met: 4.3 },
	{ id: 'hike', label: 'Hiking, cross country', met: 6.0 },
	{ id: 'run-5', label: 'Running, 5 mph (12 min/mile)', met: 8.3 },
	{ id: 'run-6', label: 'Running, 6 mph (10 min/mile)', met: 9.8 },
	{ id: 'run-8', label: 'Running, 8 mph (7.5 min/mile)', met: 11.8 },
	{ id: 'bike-leisure', label: 'Cycling, under 10 mph (leisure)', met: 4.0 },
	{ id: 'bike-moderate', label: 'Cycling, 12–13.9 mph (moderate)', met: 8.0 },
	{ id: 'swim', label: 'Swimming laps, freestyle (moderate)', met: 5.8 },
	{ id: 'rope', label: 'Jumping rope (moderate)', met: 11.8 },
	{ id: 'row', label: 'Rowing machine (moderate)', met: 4.8 },
	{ id: 'elliptical', label: 'Elliptical trainer (moderate)', met: 5.0 },
	{ id: 'lift', label: 'Weight training (moderate, 8–15 reps)', met: 3.5 },
	{ id: 'yoga', label: 'Yoga (hatha)', met: 2.5 },
	{ id: 'basketball', label: 'Basketball (general)', met: 6.5 },
	{ id: 'tennis', label: 'Tennis (singles)', met: 8.0 }
];

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'units',
			label: 'Units',
			type: 'select',
			display: 'segmented',
			default: 'metric',
			options: [
				{ label: 'Metric (kg)', value: 'metric' },
				{ label: 'Imperial (lb)', value: 'imperial' }
			]
		},
		{ id: 'kg', label: 'Body weight', type: 'number', default: 70, min: 20, max: 300, step: 0.1, suffix: 'kg', visibleWhen: metric },
		{ id: 'lb', label: 'Body weight', type: 'number', default: 154, min: 44, max: 660, step: 0.1, suffix: 'lb', visibleWhen: imperial },
		{
			id: 'activity',
			label: 'Activity',
			type: 'select',
			display: 'menu',
			default: 'walk-35',
			options: ACTIVITIES.map((a) => ({ value: a.id, label: a.label }))
		},
		{
			id: 'duration',
			label: 'Duration',
			type: 'duration',
			units: ['h', 'm'],
			default: '0:45',
			help: 'Hours and minutes of activity'
		}
	],
	calculate(v): CalculationResult {
		const imp = v.units === 'imperial';
		const kg = imp ? Number(v.lb) * 0.45359237 : Number(v.kg);
		const hours = Number(v.duration) / 3600;
		const act = ACTIVITIES.find((a) => a.id === v.activity);
		if (!act || ![kg, hours].every(Number.isFinite) || !(kg > 0) || !(hours > 0)) {
			return { primaryResult: DASH, primaryLabel: 'Calories burned', summary: 'Enter your weight and a duration above zero.' };
		}

		const kcal = act.met * kg * hours;
		const perHour = act.met * kg;

		return {
			primaryResult: `${num(Math.round(kcal), 0)} kcal`,
			primaryLabel: 'Calories burned',
			summary: `${act.met} METs × ${num(kg, 1, 1)} kg × ${num(hours, 2, 2)} hours.`,
			secondaryMetrics: [
				{ label: 'MET value', value: num(act.met, 1, 1) },
				{ label: 'Calories per hour', value: `${num(Math.round(perHour), 0)} kcal` },
				{ label: 'Duration', value: `${num(Math.round(hours * 60), 0)} min` }
			],
			table: {
				title: 'Same weight and time, other activities',
				columns: [
					{ key: 'activity', label: 'Activity' },
					{ key: 'kcal', label: 'Calories', align: 'end' }
				],
				rows: ACTIVITIES.map((a) => ({
					activity: a.label,
					kcal: `${num(Math.round(a.met * kg * hours), 0)} kcal`
				})),
				collapsed: true
			}
		};
	},
	content: {
		intro:
			'Use this calories burned calculator to estimate the energy you use in an activity, from your body weight, the activity and how long you do it. You can also compare the same time spent on other activities.',
		howTo: [
			'Choose metric (kg) or imperial (lb) units and enter your body weight.',
			'Pick the activity closest to what you did.',
			'Enter how long you did it in hours and minutes.',
			'Read the calories burned, then open the table to compare other activities.'
		],
		about: [
			{
				heading: 'What is a MET?',
				paragraphs: [
					'A MET, or metabolic equivalent, is a way to describe how hard an activity is. One MET is the energy you use at rest. An activity of 4 METs uses about four times as much energy as resting.',
					'The MET values here come from the Compendium of Physical Activities (Ainsworth and colleagues, 2011). Researchers use it to compare activities. Walking at 3.5 mph is 4.3 METs, and running at 6 mph is 9.8 METs.'
				]
			},
			{
				heading: 'How calories burned are calculated',
				paragraphs: [
					'The formula multiplies the MET value by your weight in kilograms and by the time in hours. One MET is about 1 kcal per kilogram per hour. So a heavier body, a harder activity or a longer session all raise the total.',
					'For example, a 70 kg person burns about 686 kcal in an hour of running at 6 mph (9.8 × 70). The same person burns about 175 kcal in an hour of hatha yoga (2.5 × 70). The table shows the same comparison for all 16 activities.'
				]
			},
			{
				heading: 'What the number includes',
				paragraphs: [
					'The result is the total energy used during the activity. That includes the energy your body would use at rest in that time. As a result, the “extra” calories above resting are a bit lower, by about 1 kcal for each kilogram of body weight per hour.',
					'MET values are averages for groups of people. Your real burn depends on your fitness, technique, terrain, wind and body make-up. Watches and apps use heart rate or motion, so their numbers may differ. Treat all of them as estimates.'
				]
			},
			{
				heading: 'How much activity do adults need?',
				paragraphs: [
					'The World Health Organization advises adults to do at least 150 to 300 minutes of moderate-intensity activity a week, or 75 to 150 minutes of vigorous activity. It also advises muscle-strengthening activities on two or more days a week.',
					'Any movement counts, because doing a little is better than doing none. To see what this means for your food intake, use the [TDEE calculator](/tdee-calculator) or the [calorie calculator](/calorie-calculator). For running or walking goals, try the [pace calculator](/pace-calculator).'
				]
			},
			{
				heading: 'Staying safe',
				paragraphs: [
					'Check with a doctor before you start a new exercise programme. This matters most if you have a heart condition, high blood pressure, diabetes or joint problems, or have been inactive for a long time. Stop and seek help if you feel chest pain, severe breathlessness or dizziness.',
					'Also, do not use this tool to decide how much to eat after exercise, since eating too little is not safe. A dietitian can give advice that fits your health.'
				]
			}
		],
		formulas: [
			{
				title: 'Calories burned',
				expression: 'kcal = MET × weight (kg) × duration (hours)',
				variables: [
					{ symbol: 'MET', meaning: 'metabolic equivalent for the activity, from the Compendium of Physical Activities' },
					{ symbol: 'weight', meaning: 'body weight in kilograms' },
					{ symbol: 'duration', meaning: 'time spent in hours' }
				]
			}
		],
		example: {
			title: 'A 70 kg person walking at 3.5 mph for 45 minutes',
			steps: [
				'MET for walking at 3.5 mph = 4.3',
				'Duration: 45 ÷ 60 = 0.75 hours',
				'Calories: 4.3 × 70 × 0.75 = 225.75 kcal'
			],
			result: 'About 226 kcal burned.'
		},
		faq: [
			{
				q: 'How many calories do I burn walking for 30 minutes?',
				a: 'It depends on your weight and pace. At 3.5 mph, a 70 kg person burns about 150 kcal in 30 minutes (4.3 × 70 × 0.5). Enter your own weight above for your estimate.'
			},
			{
				q: 'What is a MET?',
				a: 'A MET is a multiple of your resting energy use. One MET is about 1 kcal per kilogram per hour. Vigorous activities have higher MET values than gentle ones.'
			},
			{
				q: 'Why do my watch or app show different numbers?',
				a: 'Devices use heart rate or motion sensors and personal data, so they can be more or less precise than a MET estimate. Treat any single number as approximate.'
			},
			{
				q: 'Does this include the calories I would have burned anyway?',
				a: 'Yes. The result is the total energy used during the activity, including the resting energy you would use anyway. The extra above rest is lower by about 1 kcal per kg for each hour.'
			},
			{
				q: 'Which exercise burns the most calories?',
				a: 'In this list, running at 8 mph and jumping rope have the highest MET value, 11.8. Still, the best activity is one you enjoy and can keep doing safely.'
			}
		],
		sources: [
			{ title: 'Ainsworth BE et al. (2011), 2011 Compendium of Physical Activities', url: 'https://pubmed.ncbi.nlm.nih.gov/21681120/' },
			{ title: 'World Health Organization — Physical activity', url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity' }
		],
		disclaimer:
			'Calorie estimates are approximate and vary with fitness, technique and conditions. Check with a doctor before starting a new exercise programme.'
	}
});
