import { defineCalculator, type CalculationResult, type InputValues, type RowValue } from '../types';
import { DASH, num, plural } from '../format';
import meta from './gpa-calculator.meta';

/** Common US 4.0 scale. Keys are the option values; labels use proper minus signs. */
const GRADES: { value: string; label: string; points: number }[] = [
	{ value: 'A+', label: 'A+', points: 4.0 },
	{ value: 'A', label: 'A', points: 4.0 },
	{ value: 'A-', label: 'A−', points: 3.7 },
	{ value: 'B+', label: 'B+', points: 3.3 },
	{ value: 'B', label: 'B', points: 3.0 },
	{ value: 'B-', label: 'B−', points: 2.7 },
	{ value: 'C+', label: 'C+', points: 2.3 },
	{ value: 'C', label: 'C', points: 2.0 },
	{ value: 'C-', label: 'C−', points: 1.7 },
	{ value: 'D+', label: 'D+', points: 1.3 },
	{ value: 'D', label: 'D', points: 1.0 },
	{ value: 'D-', label: 'D−', points: 0.7 },
	{ value: 'F', label: 'F', points: 0 }
];

const POINTS = new Map(GRADES.map((g) => [g.value, g.points]));

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'courses',
			label: 'Courses',
			type: 'rows',
			columns: [
				{ id: 'name', label: 'Course', type: 'text', default: '', placeholder: 'Course name' },
				{ id: 'credits', label: 'Credits', type: 'number', default: 3, min: 0, max: 30 },
				{
					id: 'grade',
					label: 'Grade',
					type: 'select',
					default: 'A',
					options: GRADES.map((g) => ({ label: g.label, value: g.value }))
				}
			],
			default: [
				{ name: 'Biology', credits: 3, grade: 'A' },
				{ name: 'Calculus', credits: 4, grade: 'B+' },
				{ name: 'English', credits: 3, grade: 'A-' },
				{ name: 'History', credits: 3, grade: 'B' }
			],
			minRows: 1,
			maxRows: 30,
			addLabel: 'Add course'
		}
	],
	calculate(v): CalculationResult {
		const rows = (v.courses as RowValue[]) ?? [];
		const invalid = (): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'GPA',
			summary: 'Enter credits for each course and pick a grade.'
		});

		let credits = 0;
		let qualityPoints = 0;
		for (const row of rows) {
			const c = Number(row.credits);
			const points = POINTS.get(String(row.grade));
			if (!Number.isFinite(c) || c < 0 || points === undefined) return invalid();
			credits += c;
			qualityPoints += c * points;
		}
		if (!(credits > 0)) return invalid();

		const gpa = qualityPoints / credits;
		return {
			primaryResult: num(gpa, 2, 2),
			primaryLabel: 'GPA',
			summary: `Unweighted, on the 4.0 scale, across ${plural(rows.length, 'course')}.`,
			secondaryMetrics: [
				{ label: 'Total credits', value: num(credits, 2, 0) },
				{ label: 'Quality points', value: num(qualityPoints, 2, 2) },
				{ label: 'Courses', value: num(rows.length, 0) }
			]
		};
	},
	content: {
		intro:
			'Work out your grade point average (GPA) on the common 4.0 scale. Enter each course with its credit hours and letter grade, and the calculator weights every grade by its credits.',
		howTo: [
			'Enter each course name and its credit hours.',
			'Pick the letter grade you earned or expect in each course.',
			'Add or remove rows to match your term.',
			'Read your GPA, the total credits and the quality points.'
		],
		about: [
			{
				heading: 'What a GPA measures',
				paragraphs: [
					'A GPA is an average of your grades. Each letter grade is worth a number of points. A grade in a course with more credits counts for more, so a B in a 4-credit course moves your GPA further than a B in a 1-credit lab.',
					'The result is usually shown to two decimal places, such as 3.48. Schools often use it for honours, scholarships, course entry and some jobs. If you are also planning the cost of study, the [college cost calculator](/college-cost-calculator) estimates fees and living costs.'
				]
			},
			{
				heading: 'The 4.0 scale used in the US',
				paragraphs: [
					'Most US high schools and colleges use a 4.0 scale. The table shows the common points for each letter grade. Some schools give an A+ extra points, and others do not use plus and minus grades at all.',
					'Check your school’s grading policy before you rely on the figure, because the exact scale can differ.'
				],
				table: {
					caption: 'Common 4.0 scale',
					columns: ['Letter grade', 'Grade points'],
					rows: [
						['A', '4.0'],
						['A−', '3.7'],
						['B+', '3.3'],
						['B', '3.0'],
						['B−', '2.7'],
						['C+', '2.3'],
						['C', '2.0'],
						['C−', '1.7'],
						['D+', '1.3'],
						['D', '1.0'],
						['D−', '0.7'],
						['F', '0.0']
					]
				}
			},
			{
				heading: 'GPA scales outside the US',
				paragraphs: [
					'Other countries use other systems, so a GPA from one place may not compare directly with another. In India, many universities report a CGPA on a 10-point scale. Nigerian universities often use a 5.0 scale.',
					'Germany works the other way round. There, 1.0 is the best grade and 5.0 is a fail. The UK usually gives degree classes, such as First or Upper Second, rather than a GPA. If you are moving between systems, ask the admissions office how they convert your grades.'
				]
			},
			{
				heading: 'Working out a cumulative GPA',
				paragraphs: [
					'Your cumulative GPA covers all of your courses so far. To update it, multiply your current GPA by your total credits to get your total quality points. Then add the points from the new term and divide by the new total credits.',
					'For example, a GPA of 3.2 over 60 credits gives 192 quality points. Adding 15 credits at 3.7 gives 55.5 more points. The new GPA is (192 + 55.5) ÷ 75 = 3.30. Use the [grade calculator](/grade-calculator) if you want to find the grade you need on a single course.'
				]
			},
			{
				heading: 'Things that can change your GPA',
				paragraphs: [
					'Some schools replace a grade when you retake a course. Others average both attempts, and some keep both on your record. Pass or fail courses usually do not count toward GPA at all.',
					'Honours, AP and other advanced courses may carry extra weight at some schools. This calculator does not add those points, so the result is unweighted. For a simple average of test scores, the [average calculator](/average-calculator) can help.'
				]
			}
		],
		formulas: [
			{
				title: 'Quality points',
				expression: 'Quality points = Σ (credits × grade points)',
				variables: [{ symbol: 'Σ', meaning: 'Add up over every course' }]
			},
			{
				title: 'GPA',
				expression: 'GPA = total quality points ÷ total credits',
				variables: [{ symbol: 'GPA', meaning: 'Grade point average on a 4.0 scale, rounded to two decimals' }]
			}
		],
		example: {
			title: 'Four courses in one term',
			steps: [
				'Biology, A, 3 credits: 3 × 4.0 = 12.0',
				'Calculus, B+, 4 credits: 4 × 3.3 = 13.2',
				'English, A−, 3 credits: 3 × 3.7 = 11.1',
				'History, B, 3 credits: 3 × 3.0 = 9.0',
				'Total: 45.3 quality points ÷ 13 credits = 3.48'
			],
			result: 'Your GPA is 3.48 on the 4.0 scale, from 13 credits.'
		},
		faq: [
			{
				q: 'How is GPA calculated?',
				a: 'Each letter grade is worth a set number of points, such as 4.0 for an A and 3.0 for a B. Multiply each grade by its credit hours, add the results, and divide by the total credit hours.'
			},
			{
				q: 'Is this a weighted or unweighted GPA?',
				a: 'This calculator gives an unweighted GPA on the 4.0 scale, where every A is 4.0 whatever the course difficulty. Some schools add extra points for honours or AP courses, so check your school’s rules.'
			},
			{
				q: 'Do plus and minus grades change the GPA?',
				a: 'Yes. An A− is 3.7 and a B+ is 3.3, while an A is 4.0 and a B is 3.0. Some schools use different values, so use your own institution’s scale if it differs.'
			},
			{
				q: 'What is a good GPA?',
				a: 'It depends on your goal. Many scholarships and graduate programmes set a minimum, and a GPA of 3.0 (a B average) is a common benchmark. Ask the programme what it requires.'
			},
			{
				q: 'How do I work out my cumulative GPA?',
				a: 'Add your existing quality points to the new term’s quality points, then divide by all your credits so far. The example above shows the steps.'
			}
		]
	}
});
