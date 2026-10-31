import { defineCalculator, type CalculationResult, type InputValues, type RowValue } from '../types';
import { DASH, num, plural } from '../format';
import meta from './golf-handicap-calculator.meta';

/** Round half up to one decimal place. The small epsilon stops 14.45 from landing on 14.4. */
export const round1 = (x: number): number => Math.round((x + Number.EPSILON) * 10) / 10;

/** WHS Handicap Index table: how many of the lowest differentials to average, and the adjustment. */
export function whsRule(rounds: number): { use: number; adjust: number } | null {
	if (rounds < 3) return null;
	if (rounds === 3) return { use: 1, adjust: -2 };
	if (rounds === 4) return { use: 1, adjust: -1 };
	if (rounds === 5) return { use: 1, adjust: 0 };
	if (rounds === 6) return { use: 2, adjust: -1 };
	if (rounds <= 8) return { use: 2, adjust: 0 };
	if (rounds <= 11) return { use: 3, adjust: 0 };
	if (rounds <= 14) return { use: 4, adjust: 0 };
	if (rounds <= 16) return { use: 5, adjust: 0 };
	if (rounds <= 18) return { use: 6, adjust: 0 };
	if (rounds === 19) return { use: 7, adjust: 0 };
	return { use: 8, adjust: 0 };
}

/** Score differential = (113 ÷ slope) × (adjusted gross score − course rating − PCC), to one decimal. */
export function scoreDifferential(score: number, rating: number, slope: number, pcc: number): number {
	return round1((113 / slope) * (score - rating - pcc));
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'rounds',
			label: 'Rounds',
			type: 'rows',
			columns: [
				{ id: 'score', label: 'Adjusted gross', type: 'number', default: 90, min: 1, max: 200 },
				{ id: 'rating', label: 'Course rating', type: 'number', default: 72, min: 50, max: 90 },
				{ id: 'slope', label: 'Slope', type: 'number', default: 113, min: 55, max: 155 },
				{ id: 'pcc', label: 'PCC', type: 'number', default: 0, min: -10, max: 10 }
			],
			default: [
				{ score: 88, rating: 71.2, slope: 128, pcc: 0 },
				{ score: 92, rating: 72, slope: 131, pcc: 0 },
				{ score: 85, rating: 70.4, slope: 125, pcc: -1 },
				{ score: 90, rating: 71.2, slope: 126, pcc: 0 },
				{ score: 97, rating: 72, slope: 134, pcc: 0 },
				{ score: 94, rating: 72, slope: 129, pcc: 0 },
				{ score: 89, rating: 71.2, slope: 127, pcc: 0 }
			],
			minRows: 1,
			maxRows: 20,
			addLabel: 'Add round'
		},
		{ id: 'par', label: 'Par of the course', type: 'number', default: 72, min: 27, max: 80, decimal: false, help: 'For the course you are about to play.' },
		{ id: 'courseRating', label: 'Course rating', type: 'number', default: 72, min: 50, max: 90, step: 0.1, help: 'Rating of the course you are about to play.' },
		{ id: 'courseSlope', label: 'Slope rating', type: 'number', default: 130, min: 55, max: 155, decimal: false, help: 'Slope of the course you are about to play.' }
	],
	calculate(v: InputValues): CalculationResult {
		const rows = (v.rounds as RowValue[]) ?? [];
		const fail = (summary: string): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Handicap Index',
			summary
		});

		if (rows.length < 3) return fail('Enter at least 3 rounds to calculate a Handicap Index.');

		const diffs: number[] = [];
		for (const r of rows) {
			const score = Number(r.score);
			const rating = Number(r.rating);
			const slope = Number(r.slope);
			const pcc = Number(r.pcc);
			if (!(score > 0) || !(rating > 0) || !(slope >= 55 && slope <= 155) || !Number.isFinite(pcc)) {
				return fail('Check every round: the score, course rating and slope are needed.');
			}
			diffs.push(scoreDifferential(score, rating, slope, pcc));
		}

		const rule = whsRule(rows.length);
		const par = Number(v.par);
		const courseRating = Number(v.courseRating);
		const courseSlope = Number(v.courseSlope);
		if (!rule) return fail('Enter at least 3 rounds to calculate a Handicap Index.');
		if (!(par > 0) || !(courseRating > 0) || !(courseSlope >= 55 && courseSlope <= 155)) {
			return fail('Check the par, course rating and slope of the course you are playing.');
		}

		// Rank the differentials, keeping track of which rounds count.
		const ranked = diffs.map((d, i) => ({ d, i })).sort((a, b) => a.d - b.d);
		const counted = new Set(ranked.slice(0, rule.use).map((x) => x.i));
		const used = ranked.slice(0, rule.use).map((x) => x.d);
		const avg = used.reduce((a, b) => a + b, 0) / used.length;
		const index = Math.min(54, round1(avg + rule.adjust));
		const course = Math.round(index * (courseSlope / 113) + (courseRating - par));

		return {
			primaryResult: num(index, 1, 1),
			primaryLabel: 'Handicap Index',
			summary: `Average of the lowest ${num(rule.use, 0)} of ${plural(rows.length, 'round')}${
				rule.adjust !== 0 ? `, with an adjustment of ${num(rule.adjust, 1, 1)}` : ''
			}, rounded to one decimal.`,
			secondaryMetrics: [
				{ label: 'Differentials counted', value: num(rule.use, 0) },
				{ label: 'Average of counted differentials', value: num(avg, 2, 2) },
				{ label: 'Adjustment for this many rounds', value: num(rule.adjust, 1, 1) },
				{ label: 'Course handicap on this course', value: num(course, 0) }
			],
			table: {
				title: 'Score differentials',
				collapsed: true,
				columns: [
					{ key: 'round', label: 'Round' },
					{ key: 'differential', label: 'Differential', align: 'end' },
					{ key: 'counted', label: 'Counted', align: 'end' }
				],
				rows: diffs.map((d, i) => ({
					round: `Round ${num(i + 1, 0)}`,
					differential: num(d, 1, 1),
					counted: counted.has(i) ? 'Yes' : 'No'
				}))
			}
		};
	},
	content: {
		intro:
			'Work out your Handicap Index from your recent rounds using the World Handicap System (WHS), then turn it into a course handicap for the course you are about to play. It is a guide to your playing ability, not a score you must reach.',
		howTo: [
			'Enter each round: the adjusted gross score, the course rating and the slope rating. Enter the PCC only if your association has applied one.',
			'Add or remove rounds. At least three rounds are needed. The calculator uses up to 20.',
			'Enter the par, course rating and slope of the course you are playing.',
			'Read your Handicap Index and the course handicap for that course.'
		],
		about: [
			{
				heading: 'What a Handicap Index is',
				paragraphs: [
					'A Handicap Index shows how well a golfer can play on a course of standard difficulty. The lower the number, the better the player. The World Handicap System brought one method to golf clubs worldwide in 2020, so a handicap from one country can be compared with another.',
					'A handicap lets players of different levels compete fairly. A player with an index of 18 gets more strokes than a player with an index of 5, so both can enjoy the same match.'
				]
			},
			{
				heading: 'How the index is worked out',
				paragraphs: [
					'Each round is turned into a score differential. The differential compares your score with the course rating, and it is scaled by the slope. The calculator then looks at your rounds and uses only the best ones.',
					'With few rounds, the index uses only the best one or two. With 20 rounds, it uses the best eight. The result is then rounded to one decimal place, and it cannot go above 54.0.'
				]
			},
			{
				heading: 'Course rating and slope',
				paragraphs: [
					'The course rating is the score a scratch golfer, a player with no handicap, is expected to shoot on that course. The slope rating shows how much harder the course is for players who are not scratch. Standard slope is 113, and the slope range runs from 55 to 155.',
					'A course with a high slope penalises errors more. So the same index can give a different course handicap on a tough course than on an easier one. This is why the calculator asks for the course you are playing. If a scorecard lists distances in yards, the [unit converter](/unit-converter) can change them to metres.'
				]
			},
			{
				heading: 'Using the course handicap',
				paragraphs: [
					'The course handicap is the number of strokes you receive on that course, so it is the number you use to compare with the field. A course handicap of 17 means you receive 17 strokes across the round, spread across the holes by the club’s stroke index.',
					'Course handicaps can change between rounds, as the course rating and slope change, and as your index updates. For a quick check of how two numbers compare, the [average calculator](/average-calculator) works well.'
				]
			},
			{
				heading: 'Keeping your scores accurate',
				paragraphs: [
					'A handicap only works when scores are recorded honestly. Record every round you play, including the ones you do not enjoy. The WHS uses adjusted gross scores, which cap the score on each hole, so one bad hole does not spoil the index.',
					'If you are unsure how to record a hole or a round, ask your club or national association. They can explain the rules that apply to your round. To see how far apart your recent scores are, the [mean, median, mode and range calculator](/mean-median-mode-range-calculator) is useful.'
				]
			}
		],
		formulas: [
			{
				title: 'Score differential',
				expression: 'Differential = (113 ÷ slope) × (adjusted gross score − course rating − PCC), rounded to one decimal',
				variables: [
					{ symbol: '113', meaning: 'The reference slope rating used by the WHS' },
					{ symbol: 'PCC', meaning: 'Playing conditions adjustment, 0 when none applies' }
				]
			},
			{
				title: 'Handicap Index',
				expression: 'Index = average of the lowest differentials in the WHS table, plus the adjustment, rounded to one decimal, up to 54.0',
				variables: [
					{ symbol: '3 rounds', meaning: 'Lowest 1 differential, adjustment −2.0' },
					{ symbol: '6 rounds', meaning: 'Lowest 2 differentials, adjustment −1.0' },
					{ symbol: '20 rounds', meaning: 'Lowest 8 differentials, no adjustment' }
				]
			},
			{
				title: 'Course handicap',
				expression: 'Course handicap = Index × (slope ÷ 113) + (course rating − par), rounded to a whole number',
				variables: [
					{ symbol: 'slope', meaning: 'Slope rating of the course you are playing' },
					{ symbol: 'course rating', meaning: 'Course rating of the course you are playing' }
				]
			}
		],
		example: {
			title: 'Seven rounds, then a course with par 72, rating 72.0 and slope 130',
			steps: [
				'Differentials: 14.8, 17.3, 14.1, 16.9, 21.1, 19.3, 15.8',
				'Seven rounds count the lowest 2: 14.1 and 14.8, average 14.45, with no adjustment',
				'Index: 14.45 rounds to 14.5',
				'Course handicap: 14.5 × (130 ÷ 113) + (72.0 − 72) = 16.68, rounds to 17'
			],
			result: 'Handicap Index 14.5. Course handicap 17 on that course.'
		},
		faq: [
			{
				q: 'How many rounds do I need for a Handicap Index?',
				a: 'The WHS needs at least three scores. With fewer rounds the calculator cannot give an index. The index uses the lowest differentials from your most recent 20 rounds.'
			},
			{
				q: 'What is the difference between Handicap Index and course handicap?',
				a: 'Your Handicap Index describes your ability on a standard course. The course handicap adjusts it for the slope and rating of the course you play, so the number of strokes you receive fits that course.'
			},
			{
				q: 'What is PCC?',
				a: 'The Playing Conditions Calculation is an adjustment made when conditions differ from normal on a day. Your association may apply it, usually as a small plus or minus. Leave it at 0 if you do not know.'
			},
			{
				q: 'Does this include every WHS rule?',
				a: 'No. It covers the core formulas. It does not apply net double bogey limits to individual holes, 9-hole rounds or competition rules. Your club or national association has the final say.'
			},
			{
				q: 'Is a lower handicap better?',
				a: 'Yes. A lower Handicap Index means a player scores closer to par on a standard course. A handicap of 0 is a scratch player.'
			}
		],
		sources: [
			{ title: 'USGA — Rules of Handicapping (World Handicap System)', url: 'https://www.usga.org/' },
			{ title: 'The R&A — World Handicap System', url: 'https://www.randa.org/' }
		],
		disclaimer:
			'This calculator follows the core WHS steps. Your club, association or competition may apply other adjustments.'
	}
});
