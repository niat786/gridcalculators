import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num } from '../format';
import meta from './target-heart-rate-calculator.meta';

const ZONES = [
	{ name: 'Zone 1 (very light)', from: 50, to: 60 },
	{ name: 'Zone 2 (light)', from: 60, to: 70 },
	{ name: 'Zone 3 (aerobic)', from: 70, to: 80 },
	{ name: 'Zone 4 (hard)', from: 80, to: 90 },
	{ name: 'Zone 5 (maximum)', from: 90, to: 100 }
];

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'age',
			label: 'Age',
			type: 'number',
			default: 35,
			min: 10,
			max: 100,
			step: 1,
			suffix: 'years',
			decimal: false,
			help: 'For ages 10 to 100'
		},
		{
			id: 'restingHr',
			label: 'Resting heart rate (optional)',
			type: 'number',
			default: 0,
			min: 0,
			max: 120,
			step: 1,
			suffix: 'bpm',
			decimal: false,
			help: 'Leave at 0 if unknown. Adding it switches to the Karvonen method.'
		}
	],
	calculate(v): CalculationResult {
		const age = Number(v.age);
		const rest = Number(v.restingHr);
		if (!Number.isFinite(age) || !(age > 0) || !Number.isFinite(rest) || rest < 0) {
			return { primaryResult: DASH, primaryLabel: 'Estimated maximum heart rate', summary: 'Enter your age.' };
		}

		const max = 220 - age;
		const karvonen = rest > 0;
		if (karvonen && (rest < 30 || rest >= max)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Estimated maximum heart rate',
				summary: 'Check your resting heart rate, or leave it at 0.'
			};
		}

		const bound = (pct: number) => (karvonen ? Math.round(rest + ((max - rest) * pct) / 100) : Math.round((max * pct) / 100));

		return {
			primaryResult: `${num(max, 0)} bpm`,
			primaryLabel: 'Estimated maximum heart rate (220 − age)',
			summary: karvonen
				? 'Zones use the Karvonen method: resting rate + percentage × heart rate reserve.'
				: 'Zones are a percentage of your maximum. Add your resting rate for a more personal range.',
			secondaryMetrics: [
				{ label: 'Method', value: karvonen ? 'Karvonen' : 'Percent of maximum' },
				{ label: 'Heart rate reserve', value: karvonen ? `${num(max - rest, 0)} bpm` : '—' },
				{ label: 'Resting heart rate', value: karvonen ? `${num(rest, 0)} bpm` : 'Not entered' }
			],
			table: {
				title: 'Heart rate zones',
				columns: [
					{ key: 'zone', label: 'Zone' },
					{ key: 'intensity', label: 'Intensity' },
					{ key: 'bpm', label: 'Heart rate', align: 'end' }
				],
				rows: ZONES.map((z) => ({
					zone: z.name,
					intensity: `${z.from}–${z.to}%`,
					bpm: `${num(bound(z.from), 0)}–${num(bound(z.to), 0)} bpm`
				}))
			}
		};
	},
	content: {
		intro:
			'Use this target heart rate calculator to find your estimated maximum heart rate and five training zones based on it. Add your resting heart rate to get zones that take your fitness into account.',
		howTo: [
			'Enter your age.',
			'Optionally enter your resting heart rate, taken first thing in the morning before you get up.',
			'Read your maximum heart rate, then match your target to the zone table.',
			'Check your pulse during exercise, and stay in the zone that suits your plan.'
		],
		about: [
			{
				heading: 'What is a target heart rate?',
				paragraphs: [
					'Your heart rate is the number of times your heart beats in a minute (bpm). It rises when you exercise. A target heart rate is the range you aim for during activity so that the effort is right for your goal.',
					'The range is given as a percentage of your maximum heart rate, which is the fastest your heart can safely beat. Working in a zone helps you avoid doing too little to get a benefit, or too much too soon.'
				]
			},
			{
				heading: 'How the zones are calculated',
				paragraphs: [
					'The calculator estimates your maximum heart rate as 220 minus your age. The CDC and the American Heart Association both describe this simple rule. Each zone is then a percentage of that maximum.',
					'If you enter your resting heart rate, the tool uses the Karvonen method. It works from your heart rate reserve, which is your maximum minus your resting rate. The zone is your resting rate plus a percentage of that reserve. As a result, a fitter person with a low resting rate gets a slightly different range from a less fit person of the same age.'
				],
				table: {
					caption: 'Zones in this calculator',
					columns: ['Zone', 'Share of maximum', 'Example at age 40 (max 180 bpm)'],
					rows: [
						['Zone 1 (very light)', '50% to 60%', '90 to 108 bpm'],
						['Zone 2 (light)', '60% to 70%', '108 to 126 bpm'],
						['Zone 3 (aerobic)', '70% to 80%', '126 to 144 bpm'],
						['Zone 4 (hard)', '80% to 90%', '144 to 162 bpm'],
						['Zone 5 (maximum)', '90% to 100%', '162 to 180 bpm']
					]
				}
			},
			{
				heading: 'How the zone names compare with health guidance',
				paragraphs: [
					'The zone numbers above are the common 5-zone model used by fitness trackers. Health agencies describe intensity a little differently. The CDC says a moderate-intensity target is 50% to 70% of your maximum heart rate. It says a vigorous-intensity target is 70% to 85%.',
					'So if a guideline asks for “moderate” activity, aim for zones 1 and 2, about 50% to 70%. For “vigorous” activity, aim for about 70% to 85%. Use the percentages rather than the names.'
				]
			},
			{
				heading: 'How accurate is 220 minus age?',
				paragraphs: [
					'It is a rough average. Real maximum heart rates vary a lot from person to person. Researchers (Tanaka and colleagues, 2001) proposed another formula, 208 minus 0.7 times your age, which fit adults better in their data. Even so, your own maximum can differ by 10 or more beats a minute from either formula.',
					'Some medicines, such as beta blockers, lower your heart rate, so these zones may not apply. A doctor can advise you, and may suggest a supervised exercise test. If you are also thinking about weight, the [TDEE calculator](/tdee-calculator) shows the calories you use in a day.'
				]
			},
			{
				heading: 'Checking your pulse and staying safe',
				paragraphs: [
					'To check your pulse, press two fingers on the inside of your wrist. Count the beats for 30 seconds and double it. A typical resting heart rate for adults is 60 to 100 bpm, according to the American Heart Association.',
					'Talk to a doctor before you start a hard exercise plan if you have heart or lung conditions, or take heart medicine. Stop and get help if you feel chest pain, faint or very short of breath. For calories used in a workout, try the [calories burned calculator](/calories-burned-calculator). The [pace calculator](/pace-calculator) helps you plan a run.'
				]
			}
		],
		formulas: [
			{
				title: 'Maximum heart rate',
				expression: 'Max HR = 220 − age',
				variables: [{ symbol: 'age', meaning: 'your age in years' }]
			},
			{
				title: 'Zone from percentage of maximum',
				expression: 'Zone HR = max HR × zone %',
				variables: []
			},
			{
				title: 'Zone from Karvonen (with resting heart rate)',
				expression: 'Zone HR = resting HR + zone % × (max HR − resting HR)',
				variables: [{ symbol: 'max HR − resting HR', meaning: 'your heart rate reserve' }]
			}
		],
		example: {
			title: 'A 40-year-old with no resting heart rate entered',
			steps: [
				'Max HR = 220 − 40 = 180 bpm',
				'Zone 50–60%: 180 × 0.50 = 90 bpm and 180 × 0.60 = 108 bpm',
				'Zone 80–90%: 180 × 0.80 = 144 bpm and 180 × 0.90 = 162 bpm'
			],
			result: 'Max HR of 180 bpm. The 50–60% zone runs from 90 to 108 bpm.'
		},
		faq: [
			{
				q: 'What is my target heart rate for exercise?',
				a: 'For moderate activity, aim for 50% to 70% of your maximum heart rate. For vigorous activity, aim for 70% to 85%. Your maximum is roughly 220 minus your age.'
			},
			{
				q: 'Is 220 minus age accurate?',
				a: 'It is a rough population average. Individual maximums can differ by 10 or more beats a minute. A supervised exercise test gives a more accurate figure.'
			},
			{
				q: 'What is the Karvonen method?',
				a: 'It uses your heart rate reserve, the gap between your maximum and resting heart rate, so zones reflect your fitness as well as your age. It is usually more personal than a simple percentage.'
			},
			{
				q: 'Which zone should I train in?',
				a: 'Most people benefit from a mix. Lighter zones can be held for long sessions. Vigorous and maximum zones are short and hard, so use them with care and build up slowly.'
			},
			{
				q: 'What if I take medicine that affects my heart rate?',
				a: 'Some medicines, such as beta blockers, slow the heart. These zones may then be too high. Ask your doctor or pharmacist what target is right for you.'
			}
		],
		sources: [
			{ title: 'CDC — Target heart rate and estimated maximum heart rate (archived)', url: 'https://webarchive.library.unt.edu/web/20120920235201/http://www.cdc.gov/physicalactivity/everyone/measuring/heartrate.html' },
			{ title: 'American Heart Association — Target heart rates', url: 'https://www.heart.org/en/healthy-living/fitness/fitness-basics/target-heart-rates' },
			{ title: 'Tanaka H et al. (2001), Journal of the American College of Cardiology: Age-predicted maximal heart rate revisited', url: 'https://pubmed.ncbi.nlm.nih.gov/11153730/' }
		],
		disclaimer:
			'Heart rate zones are estimates. If you have heart or lung conditions, take heart medication or feel unwell during exercise, get medical advice before you train.'
	}
});
