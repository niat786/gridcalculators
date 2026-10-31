import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, plural } from '../format';
import meta from './pregnancy-calculator.meta';

const DAY = 86_400_000;
/** Pregnancy dating runs 280 days (40 weeks) from its start to the due date. */
const TERM_DAYS = 280;

/** Parse YYYY-MM-DD as a UTC date, returned in milliseconds. NaN when invalid. */
export function parseISODate(s: unknown): number {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
	if (!m) return NaN;
	const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
	return new Date(t).getUTCMonth() === +m[2] - 1 ? t : NaN;
}

function formatDate(t: number): string {
	return new Date(t).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function formatShort(t: number): string {
	return new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** Trimester from gestational age in days: first to 13w6d, second to 27w6d, third from 28w0d. */
export function trimesterOf(days: number): string {
	if (days <= 97) return 'First trimester';
	if (days <= 195) return 'Second trimester';
	return 'Third trimester';
}

/** Milestones as days after dating start (week 0, day 0). */
export const MILESTONES = [
	{ milestone: 'End of first trimester', days: 97, weeks: '13 weeks, 6 days' },
	{ milestone: 'Anatomy scan', days: 140, weeks: 'About 20 weeks' },
	{ milestone: 'Viability', days: 168, weeks: 'About 24 weeks' },
	{ milestone: 'Full term', days: 273, weeks: '39 weeks' },
	{ milestone: 'Due date', days: 280, weeks: '40 weeks' }
];

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'lmp',
			label: 'First day of last period',
			type: 'date',
			default: '2026-02-01'
		},
		{
			id: 'cycle',
			label: 'Cycle length',
			type: 'number',
			default: 28,
			min: 21,
			max: 45,
			step: 1,
			decimal: false,
			suffix: 'days',
			help: 'Usually 21 to 45 days. Leave at 28 if you are not sure.'
		},
		{
			id: 'on',
			label: 'Calculate as of',
			type: 'date',
			default: 'today',
			help: 'Defaults to today'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const lmp = parseISODate(v.lmp);
		const cycle = Number(v.cycle);
		const on = parseISODate(v.on);
		if (Number.isNaN(lmp)) return { primaryResult: DASH, primaryLabel: 'Estimated due date', summary: 'Enter the first day of your last period.' };
		if (!Number.isInteger(cycle) || cycle < 21 || cycle > 45)
			return { primaryResult: DASH, primaryLabel: 'Estimated due date', summary: 'Cycle length must be a whole number from 21 to 45 days.' };
		if (Number.isNaN(on)) return { primaryResult: DASH, primaryLabel: 'Estimated due date', summary: 'Enter a valid date to calculate as of.' };

		// Dating starts 280 days before the due date; a longer or shorter cycle moves that start.
		const due = lmp + (TERM_DAYS + cycle - 28) * DAY;
		const start = due - TERM_DAYS * DAY;
		const ga = Math.round((on - start) / DAY);
		const togo = Math.round((due - on) / DAY);
		const notStarted = ga < 0;

		const gaText = notStarted ? 'Not started yet' : `${plural(Math.floor(ga / 7), 'week')}, ${plural(ga % 7, 'day')}`;
		const toGoText = togo > 0 ? plural(togo, 'day') : togo === 0 ? 'Due today' : `Past due by ${plural(-togo, 'day')}`;

		return {
			primaryResult: formatDate(due),
			primaryLabel: 'Estimated due date',
			summary: notStarted
				? `That date is before dating starts on ${formatDate(start)}.`
				: `You are ${gaText} along on ${formatDate(on)}.`,
			secondaryMetrics: [
				{ label: 'How far along', value: gaText },
				{ label: 'Trimester', value: notStarted ? DASH : trimesterOf(ga) },
				{ label: 'Days to go', value: toGoText },
				{ label: 'Dating start', value: formatDate(start) }
			],
			table: {
				title: 'Key milestones',
				columns: [
					{ key: 'milestone', label: 'Milestone' },
					{ key: 'weeks', label: 'Gestational age' },
					{ key: 'date', label: 'Date', align: 'end' },
					{ key: 'status', label: 'Status', align: 'end' }
				],
				rows: MILESTONES.map((m) => ({
					milestone: m.milestone,
					weeks: m.weeks,
					date: formatShort(start + m.days * DAY),
					status: !notStarted && ga >= m.days ? 'Reached' : 'Upcoming'
				}))
			}
		};
	},
	content: {
		intro:
			'Use this pregnancy calculator to see how many weeks and days pregnant you are, your due date and your trimester, starting from the first day of your last period. A table lists the dates of key milestones.',
		howTo: [
			'Enter the first day of your last period.',
			'Enter your cycle length if you know it. Leave it at 28 if you are not sure.',
			'Choose the date to calculate as of. It defaults to today.',
			'Read your due date, how far along you are, and the milestone dates in the table.'
		],
		about: [
			{
				heading: 'How pregnancy weeks are counted',
				paragraphs: [
					'Doctors count pregnancy from the first day of your last menstrual period, not from the day of conception. This is called gestational age. Conception usually happens about two weeks later, so you are already “2 weeks pregnant” when it happens.',
					'A full pregnancy is counted as 40 weeks, or 280 days. ACOG, the American College of Obstetricians and Gynecologists, describes this as the standard convention for the due date. Weeks are shown as weeks and days, for example 15 weeks and 6 days.'
				]
			},
			{
				heading: 'The three trimesters',
				paragraphs: [
					'Pregnancy is split into three parts. ACOG defines them by gestational age. This tool uses the same limits.'
				],
				table: {
					caption: 'Trimesters (ACOG)',
					columns: ['Trimester', 'Weeks'],
					rows: [
						['First', 'Start to 13 weeks 6 days'],
						['Second', '14 weeks 0 days to 27 weeks 6 days'],
						['Third', '28 weeks 0 days to birth']
					]
				}
			},
			{
				heading: 'Key milestones in the table',
				paragraphs: [
					'The milestone table gives a date for each stage, and says whether you have reached it. Many health services offer a detailed mid-pregnancy ultrasound around 18 to 22 weeks, but the timing depends on where you live. Your midwife or doctor will tell you when yours is.',
					'Doctors call birth between 20 weeks and 25 weeks 6 days “periviable”. At these early weeks, a baby’s chance of survival is uncertain and changes a lot from week to week. The table shows “viability” at about 24 weeks only as a reference point inside this range, not as a guarantee.',
					'A pregnancy reaches full term at 39 weeks. ACOG groups 39 weeks 0 days to 40 weeks 6 days as full term, and the due date is at 40 weeks.'
				]
			},
			{
				heading: 'How accurate is this?',
				paragraphs: [
					'The result is an estimate. It assumes you know your last period date, and that ovulation happened about 14 days before your next period would have started. Irregular cycles and unclear dates reduce accuracy.',
					'Only about 5 in 100 babies are born on their due date, according to the Australian government’s Pregnancy, Birth and Baby service. Most arrive between 37 and 42 weeks. An early ultrasound often gives a more precise date, and your provider will use that one.',
					'If you want to start from conception or an IVF transfer, use the [due date calculator](/due-date-calculator) instead.'
				]
			},
			{
				heading: 'Related tools and when to get help',
				paragraphs: [
					'Planning ahead? The [pregnancy weight gain calculator](/pregnancy-weight-gain-calculator) shows a range of weight gain based on your starting BMI. The [conception calculator](/conception-calculator) works back from your due date.',
					'This tool does not replace prenatal care. See a midwife or doctor as soon as you think you are pregnant. Seek urgent help for heavy bleeding, severe pain, or if your baby moves much less than usual.'
				]
			}
		],
		formulas: [
			{
				title: 'Due date',
				expression: 'Due date = last period + 280 days + (cycle length − 28 days)',
				variables: [{ symbol: '280', meaning: 'the 40 weeks of pregnancy, counted from the start of dating' }]
			},
			{
				title: 'How far along',
				expression: 'Days along = date − (due date − 280 days). Weeks = ⌊days ÷ 7⌋, days = days mod 7',
				variables: []
			},
			{
				title: 'Milestones',
				expression: 'Milestone date = dating start + days for that milestone (13w6d = 97, 20w = 140, 24w = 168, 39w = 273, 40w = 280)',
				variables: []
			}
		],
		example: {
			title: 'Last period on 10 January 2026, 28-day cycle, checked on 1 May 2026',
			steps: [
				'Due date = 10 January 2026 + 280 days = 17 October 2026',
				'Days along on 1 May: 1 May − 10 January = 111 days, which is 15 weeks and 6 days',
				'Days to go: 280 − 111 = 169 days',
				'Anatomy scan at 20 weeks: 10 January + 140 days = 30 May 2026'
			],
			result: 'Due date Saturday, October 17, 2026. On 1 May 2026 you are 15 weeks and 6 days along, in the second trimester, with 169 days to go.'
		},
		faq: [
			{
				q: 'How many weeks pregnant am I?',
				a: 'Count the days from the first day of your last period to today, then divide by 7. The whole number is your weeks and the remainder is your days. This calculator does it for you.'
			},
			{
				q: 'When does each trimester start?',
				a: 'The first trimester runs to 13 weeks 6 days. The second runs from 14 weeks to 27 weeks 6 days. The third starts at 28 weeks and runs to birth.'
			},
			{
				q: 'What does viability mean?',
				a: 'Viability is the point at which a baby born early can survive with medical care. Doctors describe 20 to 25 weeks 6 days as periviable, and outcomes depend on many factors. Your care team can explain what applies to you.'
			},
			{
				q: 'Why do some sources give different milestone dates?',
				a: 'Guides round the boundaries in different ways, and dates are often refined by an early ultrasound. Your provider uses the dates that apply to you.'
			},
			{
				q: 'Can this calculator replace prenatal care?',
				a: 'No. It is a planning tool. Book an appointment with a midwife or doctor as soon as you think you may be pregnant.'
			}
		],
		sources: [
			{ title: 'ACOG — Methods for estimating the due date (Committee Opinion 700)', url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/05/methods-for-estimating-the-due-date' },
			{ title: 'ACOG — Definition of term pregnancy (Committee Opinion 579)', url: 'https://pubmed.ncbi.nlm.nih.gov/24150030/' },
			{ title: 'Pregnancy, Birth and Baby (Australian Government) — Working out your due date', url: 'https://www.pregnancybirthbaby.org.au/working-out-your-due-date' }
		],
		disclaimer:
			'Dates are estimates for planning, not a medical diagnosis. Talk to your midwife, doctor or healthcare provider about your pregnancy.'
	}
});
