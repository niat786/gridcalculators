import { defineCalculator, type CalculationResult, type InputValues, type RowValue } from '../types';
import { DASH, num, pct, plural } from '../format';
import meta from './grade-calculator.meta';

const weighted = (v: InputValues) => v.mode === 'weighted';
const final = (v: InputValues) => v.mode === 'final';

/** Common letter bands. Schools vary, so check your own grading policy. */
export function letterFor(score: number): string {
	if (score >= 90) return 'A';
	if (score >= 80) return 'B';
	if (score >= 70) return 'C';
	if (score >= 60) return 'D';
	return 'F';
}

/** Score needed on the final: (desired − current × (1 − w)) ÷ w, with w as a fraction. */
export function finalNeeded(current: number, desired: number, weightPct: number): number {
	const w = weightPct / 100;
	return (desired - current * (1 - w)) / w;
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'What do you want to find?',
			type: 'select',
			display: 'segmented',
			default: 'weighted',
			options: [
				{ label: 'Weighted average', value: 'weighted' },
				{ label: 'Final exam needed', value: 'final' }
			]
		},
		{
			id: 'grades',
			label: 'Assignments',
			type: 'rows',
			columns: [
				{ id: 'name', label: 'Assignment', type: 'text', default: '', placeholder: 'Assignment name' },
				{ id: 'grade', label: 'Grade', type: 'number', default: 85, min: 0, max: 200, suffix: '%' },
				{ id: 'weight', label: 'Weight', type: 'number', default: 20, min: 0, max: 100, suffix: '%' }
			],
			default: [
				{ name: 'Homework', grade: 85, weight: 20 },
				{ name: 'Quizzes', grade: 92, weight: 15 },
				{ name: 'Midterm', grade: 78, weight: 25 },
				{ name: 'Project', grade: 90, weight: 20 }
			],
			minRows: 1,
			maxRows: 30,
			addLabel: 'Add assignment',
			visibleWhen: weighted
		},
		{
			id: 'current',
			label: 'Current grade',
			type: 'number',
			default: 88,
			min: 0,
			max: 200,
			step: 0.1,
			suffix: '%',
			visibleWhen: final
		},
		{
			id: 'desired',
			label: 'Desired grade',
			type: 'number',
			default: 90,
			min: 0,
			max: 200,
			step: 0.1,
			suffix: '%',
			visibleWhen: final
		},
		{
			id: 'finalWeight',
			label: 'Final exam weight',
			type: 'number',
			default: 20,
			min: 0.1,
			max: 100,
			step: 0.1,
			suffix: '%',
			visibleWhen: final
		}
	],
	calculate(v): CalculationResult {
		if (v.mode === 'final') {
			const current = Number(v.current);
			const desired = Number(v.desired);
			const weight = Number(v.finalWeight);
			if (
				!Number.isFinite(current) || current < 0 ||
				!Number.isFinite(desired) || desired < 0 ||
				!Number.isFinite(weight) || weight <= 0 || weight > 100
			) {
				return {
					primaryResult: DASH,
					primaryLabel: 'Score needed on the final',
					summary: 'Enter your current grade, the grade you want and a final exam weight above 0%.'
				};
			}

			const needed = finalNeeded(current, desired, weight);
			const shown = Math.max(needed, 0);
			const w = weight / 100;
			let summary: string;
			if (needed <= 0) summary = 'You already have enough for your target. Any final score keeps you there.';
			else if (needed > 100) summary = 'That is above 100%, so the target is out of reach on this exam.';
			else summary = `You need ${pct(needed, 2)} on the final to finish with ${pct(desired, 2)}.`;

			return {
				primaryResult: pct(shown, 2),
				primaryLabel: 'Score needed on the final',
				summary,
				secondaryMetrics: [
					{ label: 'From current grade', value: pct(current * (1 - w), 2) },
					{ label: 'From final exam', value: pct(shown * w, 2) },
					{ label: 'Target grade', value: pct(desired, 2) }
				]
			};
		}

		const rows = (v.grades as RowValue[]) ?? [];
		let weightedSum = 0;
		let totalWeight = 0;
		for (const row of rows) {
			const g = Number(row.grade);
			const w = Number(row.weight);
			if (!Number.isFinite(g) || g < 0 || !Number.isFinite(w) || w < 0) {
				return {
					primaryResult: DASH,
					primaryLabel: 'Current grade',
					summary: 'Enter a grade and a weight for every assignment.'
				};
			}
			weightedSum += g * w;
			totalWeight += w;
		}
		if (!(totalWeight > 0)) {
			return { primaryResult: DASH, primaryLabel: 'Current grade', summary: 'Enter at least one weight above 0%.' };
		}

		const grade = weightedSum / totalWeight;
		const letter = letterFor(grade);
		return {
			primaryResult: pct(grade, 2),
			primaryLabel: 'Current grade',
			summary:
				totalWeight === 100
					? `Letter grade ${letter}. The weights add up to 100%.`
					: `Letter grade ${letter}. The weights add up to ${num(totalWeight, 1, 0)}%, so the average is scaled to that total.`,
			secondaryMetrics: [
				{ label: 'Letter grade', value: letter },
				{ label: 'Weights counted', value: `${num(totalWeight, 1, 0)}%` },
				{ label: 'Assignments', value: plural(rows.length, 'assignment') }
			]
		};
	},
	content: {
		intro:
			'Find your current grade in a course from the scores and weights of your assignments, or work out the score you need on a final exam to reach the grade you want. It works for any school or course that uses percentages.',
		howTo: [
			'Choose “Weighted average” to grade your work so far, or “Final exam needed” to plan for the exam.',
			'For a weighted average, enter each assignment with its score and its share of the course.',
			'For the final exam, enter your current grade, your target grade and the exam’s weight.',
			'Read the grade or the score you need.'
		],
		about: [
			{
				heading: 'How a weighted grade works',
				paragraphs: [
					'Not every assignment counts the same. A final project worth 30% of the course matters more than a 5% quiz. A weighted grade multiplies each score by its weight, then divides by the total weight.',
					'In the default example, homework (85%, weight 20), quizzes (92%, weight 15), midterm (78%, weight 25) and project (90%, weight 20) add up to 80% of the course. The weighted grade is about 85.4%. The remaining 20% is not graded yet, so the figure is a current grade, not a final one.'
				]
			},
			{
				heading: 'Turning a percentage into a letter',
				paragraphs: [
					'Many schools use letter grades. A common scale is 90 and above for an A, 80 to 89 for a B, 70 to 79 for a C and 60 to 69 for a D. Anything below 60 is usually an F.',
					'Schools and countries use different cut-offs, and some use a plus or minus. Check your syllabus, because the calculator uses this common scale.'
				],
				table: {
					caption: 'A common percentage scale',
					columns: ['Percentage', 'Letter grade'],
					rows: [
						['90 and above', 'A'],
						['80 to 89', 'B'],
						['70 to 79', 'C'],
						['60 to 69', 'D'],
						['Below 60', 'F']
					]
				}
			},
			{
				heading: 'Planning for a final exam',
				paragraphs: [
					'The “Final exam needed” mode works backwards from your goal. It takes your current grade, keeps the part of it that still counts after the exam, and asks what the exam must score to fill the gap.',
					'If the answer is above 100%, the target is out of reach on that exam alone. If it is below zero, your current grade already meets the target. The [GPA calculator](/gpa-calculator) can then show how that course affects your overall average.'
				]
			},
			{
				heading: 'Scores out of a total',
				paragraphs: [
					'Many tests are marked in points, such as 45 out of 50. To turn that into a percentage, divide the score by the total and multiply by 100. For example, 45 ÷ 50 × 100 = 90%.',
					'Enter the percentage in the grade box. The [percentage calculator](/percentage-calculator) can do this in one step.'
				]
			},
			{
				heading: 'Tips for keeping track of your grade',
				paragraphs: [
					'Check the weights in your syllabus before you enter them. If they are written as points rather than percentages, convert them first. Some courses also drop the lowest score, which changes the average.',
					'Ask your teacher how extra credit and late work are counted. Small changes in the weights can move your final grade more than you expect. For a plain average of scores with equal weight, the [average calculator](/average-calculator) is quicker.'
				],
				list: [
					'Enter the weights exactly as the syllabus gives them.',
					'Use the “Final exam needed” mode early, so you know your target early.',
					'Recalculate after each graded piece of work.'
				]
			}
		],
		formulas: [
			{
				title: 'Weighted average',
				expression: 'Grade = Σ (score × weight) ÷ Σ weight',
				variables: [
					{ symbol: 'score', meaning: 'Your percentage on one assignment' },
					{ symbol: 'weight', meaning: 'That assignment’s share of the course' }
				]
			},
			{
				title: 'Final exam needed',
				expression: 'Score needed = (desired − current × (1 − w)) ÷ w',
				variables: [
					{ symbol: 'desired', meaning: 'The overall course grade you want, as a percentage' },
					{ symbol: 'current', meaning: 'Your grade before the final, as a percentage' },
					{ symbol: 'w', meaning: 'The final exam’s weight as a fraction, for example 0.2 for 20%' }
				]
			}
		],
		example: {
			title: 'Final exam needed: current grade 88%, target 90%, final worth 20%',
			steps: [
				'Share from current grade: 88 × (1 − 0.2) = 70.4',
				'Remaining share needed: 90 − 70.4 = 19.6',
				'Score on the final: 19.6 ÷ 0.2 = 98'
			],
			result: 'You need 98% on the final exam to finish with 90%.'
		},
		faq: [
			{
				q: 'What letter grade is 85%?',
				a: 'On a common scale, 90 and above is an A. Scores from 80 to 89 are a B, 70 to 79 a C and 60 to 69 a D. Below 60 is usually an F. Your school may use different cut-offs.'
			},
			{
				q: 'What if my weights do not add up to 100%?',
				a: 'The calculator divides by the total weight you entered, so your grade is still a fair average of the work you have so far.'
			},
			{
				q: 'Can the score needed be over 100%?',
				a: 'Yes. If the answer is above 100%, the target cannot be reached on that exam alone, and the calculator says so.'
			},
			{
				q: 'How do I find the grade I need on my final?',
				a: 'Choose “Final exam needed”, then enter your current grade, the grade you want and the exam’s weight. The result is the score you need on the exam.'
			},
			{
				q: 'How do I convert points to a percentage?',
				a: 'Divide your points by the total points and multiply by 100. For 36 out of 40, that is 36 ÷ 40 × 100 = 90%.'
			}
		]
	}
});
