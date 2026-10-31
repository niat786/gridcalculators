import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num } from '../format';
import meta from './one-rep-max-calculator.meta';

const PERCENTS = [95, 90, 85, 80, 75, 70, 65, 60, 55, 50];

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'unit',
			label: 'Unit',
			type: 'select',
			display: 'segmented',
			default: 'kg',
			options: [
				{ label: 'Kilograms (kg)', value: 'kg' },
				{ label: 'Pounds (lb)', value: 'lb' }
			]
		},
		{ id: 'weight', label: 'Weight lifted', type: 'number', default: 100, min: 1, max: 1000, step: 0.5, help: 'The load you lifted for the set' },
		{ id: 'reps', label: 'Reps completed', type: 'number', default: 5, min: 1, max: 12, step: 1, decimal: false, help: 'Between 1 and 12 reps' }
	],
	calculate(v): CalculationResult {
		const weight = Number(v.weight);
		const reps = Number(v.reps);
		const unit = v.unit === 'lb' ? 'lb' : 'kg';
		if (!Number.isFinite(weight) || !(weight > 0) || !Number.isInteger(reps) || reps < 1 || reps > 12) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Estimated one-rep max (Epley)',
				summary: 'Enter a weight above zero and 1 to 12 reps.'
			};
		}

		const epley = weight * (1 + reps / 30);
		const brzycki = (weight * 36) / (37 - reps);
		const lombardi = weight * Math.pow(reps, 0.1);
		const fmt = (x: number) => `${num(x, 1, 1)} ${unit}`;

		return {
			primaryResult: fmt(epley),
			primaryLabel: 'Estimated one-rep max (Epley)',
			summary: `${num(weight, 1)} ${unit} for ${num(reps, 0)} ${reps === 1 ? 'rep' : 'reps'}: weight × (1 + reps ÷ 30).`,
			secondaryMetrics: [
				{ label: 'Brzycki', value: fmt(brzycki) },
				{ label: 'Lombardi', value: fmt(lombardi) }
			],
			table: {
				title: 'Training loads (% of estimated 1RM)',
				columns: [
					{ key: 'percent', label: 'Percent of 1RM' },
					{ key: 'load', label: 'Load', align: 'end' }
				],
				rows: PERCENTS.map((p) => ({
					percent: `${p}%`,
					load: fmt((epley * p) / 100)
				}))
			}
		};
	},
	content: {
		intro:
			'Use this one rep max calculator to estimate the most you could lift for a single repetition, based on a set of 1 to 12 reps. A percentage chart then helps you plan your training loads.',
		howTo: [
			'Choose kilograms or pounds.',
			'Enter the weight you lifted and how many reps you completed with good form.',
			'Read the Epley estimate, compare it with Brzycki and Lombardi, and use the chart for training loads.'
		],
		about: [
			{
				heading: 'What is a one-rep max?',
				paragraphs: [
					'Your one-rep max (1RM) is the heaviest weight you can lift once with good form on a given exercise, such as the squat, bench press or deadlift. Coaches use it to set training loads as a percentage, for example “3 sets of 5 at 80%”.',
					'Testing a true 1RM is hard on the body and carries a risk of injury. For this reason, many people estimate it from a lighter set done to near-failure.'
				]
			},
			{
				heading: 'How the estimate works',
				paragraphs: [
					'The more reps you can do with a weight, the further it sits below your maximum. Three common formulas turn this idea into a number: Epley, Brzycki and Lombardi. The first is shown as the main result, and the other two let you compare.',
					'Epley multiplies your weight by 1 plus the reps divided by 30. Brzycki divides by a number that falls as reps rise. Lombardi raises the reps to the power of 0.10. The formulas section below shows each one.',
					'The estimates tend to be closer for sets of fewer reps, so a set of 3 to 5 gives a better guess than a set of 12. Your form and effort on the set matter too. A set that stopped well before failure will give a low estimate.'
				]
			},
			{
				heading: 'Using the percentage chart',
				paragraphs: [
					'The table under your result turns your estimated 1RM into training loads from 95% down to 50%. Heavier percentages are used for low reps and strength work, and lighter ones for higher reps and technique. Your coach or programme will tell you which percentages to use.',
					'For example, with an estimated 1RM of 116.7 kg, the chart gives these loads:'
				],
				table: {
					caption: 'Example loads for a 116.7 kg estimated 1RM',
					columns: ['Percent of 1RM', 'Load'],
					rows: [
						['90%', '105.0 kg'],
						['80%', '93.3 kg'],
						['70%', '81.7 kg'],
						['60%', '70.0 kg'],
						['50%', '58.3 kg']
					]
				}
			},
			{
				heading: 'Staying safe',
				paragraphs: [
					'Estimates are for planning only. Warm up well and use good form. For heavy lifts, train with a spotter or use safety bars. If you are new to lifting, learn the moves with light weights or a qualified coach first.',
					'Check with a doctor before heavy resistance training if you have a heart condition, high blood pressure, joint problems or an injury, or if you are pregnant. Young people who are still growing should train under qualified supervision.'
				]
			},
			{
				heading: 'Why strength training is worth it',
				paragraphs: [
					'The World Health Organization advises adults to do muscle-strengthening activities on two or more days a week. Strength training builds muscle, which supports your daily movement and your metabolism. To fuel it, check your [protein calculator](/protein-calculator) target. The [lean body mass calculator](/lean-body-mass-calculator) and [calories burned calculator](/calories-burned-calculator) can add more detail.'
				]
			}
		],
		formulas: [
			{
				title: 'Epley',
				expression: '1RM = weight × (1 + reps ÷ 30)',
				variables: [
					{ symbol: 'weight', meaning: 'load lifted for the set' },
					{ symbol: 'reps', meaning: 'repetitions completed' }
				]
			},
			{
				title: 'Brzycki',
				expression: '1RM = weight × 36 ÷ (37 − reps)',
				variables: []
			},
			{
				title: 'Lombardi',
				expression: '1RM = weight × reps^0.10',
				variables: []
			},
			{
				title: 'Training load',
				expression: 'Load = 1RM × percent ÷ 100',
				variables: []
			}
		],
		example: {
			title: 'A set of 5 reps at 100 kg',
			steps: [
				'Epley: 100 × (1 + 5 ÷ 30) = 100 × 1.1667 = 116.7 kg',
				'Brzycki: 100 × 36 ÷ (37 − 5) = 112.5 kg',
				'Lombardi: 100 × 5^0.10 = 117.5 kg',
				'A 75% load: 116.7 × 0.75 = 87.5 kg'
			],
			result: 'Estimated one-rep max of 116.7 kg (Epley), with the three formulas between 112.5 and 117.5 kg.'
		},
		faq: [
			{
				q: 'How do I calculate my one-rep max?',
				a: 'Lift a weight for as many good reps as you can, then use a formula. Epley is weight × (1 + reps ÷ 30). For 100 kg for 5 reps, that is about 116.7 kg. This calculator does it for you.'
			},
			{
				q: 'How accurate is a one-rep max estimate?',
				a: 'It is a guide, not a measurement. It is usually closer for sets of fewer reps, and it is only as good as the form and effort behind the set.'
			},
			{
				q: 'Should I test a true one-rep max?',
				a: 'Testing a true 1RM is demanding and carries a risk of injury. Use an estimate from a set of 3 to 5 reps, and get a coach or spotter if you attempt a heavy single.'
			},
			{
				q: 'Which formula should I use?',
				a: 'Epley is shown as the main result. Brzycki and Lombardi give similar numbers for most sets, so a gap of a few kilograms between them is normal.'
			},
			{
				q: 'Does my one-rep max differ for each exercise?',
				a: 'Yes. Each lift has its own 1RM, so calculate it separately for the squat, bench press, deadlift and so on. Update it as you get stronger.'
			}
		],
		sources: [
			{ title: 'National Strength and Conditioning Association', url: 'https://www.nsca.com/' },
			{ title: 'World Health Organization — Physical activity', url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity' }
		],
		disclaimer:
			'Estimates are for training planning only. Check with a doctor before starting heavy resistance training, and use a spotter or coach for near-maximal lifts.'
	}
});
