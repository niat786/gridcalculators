import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, plural } from '../format';
import meta from './due-date-calculator.meta';

const DAY = 86_400_000;
/** Pregnancy dating runs 280 days (40 weeks) from its start to the due date. */
const TERM_DAYS = 280;
/** Conception to due date: 38 weeks. */
const CONCEPTION_TO_DUE = 266;
/** Embryo transfer to due date, by embryo age in days. */
const EMBRYO_TO_DUE: Record<string, number> = { '3': 263, '5': 261 };

/** Parse YYYY-MM-DD as a UTC date, returned in milliseconds. NaN when invalid. */
export function parseISODate(s: unknown): number {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
	if (!m) return NaN;
	const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
	return new Date(t).getUTCMonth() === +m[2] - 1 ? t : NaN;
}

export function formatDate(t: number): string {
	return new Date(t).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** Due date, and the start of dating (week 0, day 0) that is 280 days before it. */
export function estimate(v: InputValues): { due: number; start: number } | { error: string } {
	const method = String(v.method);
	if (method === 'lmp') {
		const lmp = parseISODate(v.lmp);
		const cycle = Number(v.cycle);
		if (Number.isNaN(lmp)) return { error: 'Enter the first day of your last period.' };
		if (!Number.isInteger(cycle) || cycle < 21 || cycle > 45) return { error: 'Cycle length must be a whole number from 21 to 45 days.' };
		const due = lmp + (TERM_DAYS + cycle - 28) * DAY;
		return { due, start: due - TERM_DAYS * DAY };
	}
	if (method === 'conception') {
		const c = parseISODate(v.conception);
		if (Number.isNaN(c)) return { error: 'Enter the date of conception.' };
		const due = c + CONCEPTION_TO_DUE * DAY;
		return { due, start: due - TERM_DAYS * DAY };
	}
	if (method === 'ivf') {
		const t = parseISODate(v.transfer);
		const days = EMBRYO_TO_DUE[String(v.embryo)];
		if (Number.isNaN(t)) return { error: 'Enter the embryo transfer date.' };
		if (days === undefined) return { error: 'Pick the age of the embryo.' };
		const due = t + days * DAY;
		return { due, start: due - TERM_DAYS * DAY };
	}
	return { error: 'Pick a method.' };
}

function weeksAndDays(days: number): string {
	return `${plural(Math.floor(days / 7), 'week')}, ${plural(days % 7, 'day')}`;
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'method',
			label: 'Date you know',
			type: 'select',
			display: 'segmented',
			default: 'lmp',
			options: [
				{ label: 'Last period', value: 'lmp' },
				{ label: 'Conception', value: 'conception' },
				{ label: 'IVF transfer', value: 'ivf' }
			]
		},
		{
			id: 'lmp',
			label: 'First day of last period',
			type: 'date',
			default: '2026-02-01',
			visibleWhen: (v) => v.method === 'lmp'
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
			help: 'Usually 21 to 45 days, from the first day of one period to the next.',
			visibleWhen: (v) => v.method === 'lmp'
		},
		{
			id: 'conception',
			label: 'Date of conception',
			type: 'date',
			default: '2026-01-24',
			visibleWhen: (v) => v.method === 'conception'
		},
		{
			id: 'transfer',
			label: 'Embryo transfer date',
			type: 'date',
			default: '2026-01-27',
			visibleWhen: (v) => v.method === 'ivf'
		},
		{
			id: 'embryo',
			label: 'Embryo age at transfer',
			type: 'select',
			display: 'segmented',
			default: '5',
			options: [
				{ label: 'Day 3', value: '3' },
				{ label: 'Day 5', value: '5' }
			],
			visibleWhen: (v) => v.method === 'ivf'
		},
		{
			id: 'on',
			label: 'Calculate as of',
			type: 'date',
			default: 'today',
			help: 'Defaults to today'
		}
	],
	calculate(v): CalculationResult {
		const est = estimate(v);
		if ('error' in est) return { primaryResult: DASH, primaryLabel: 'Estimated due date', summary: est.error };
		const on = parseISODate(v.on);
		if (Number.isNaN(on)) return { primaryResult: DASH, primaryLabel: 'Estimated due date', summary: 'Enter a valid date to calculate as of.' };

		const { due, start } = est;
		const ga = Math.round((on - start) / DAY);
		const togo = Math.round((due - on) / DAY);
		const notStarted = ga < 0;

		const gaText = notStarted ? 'Not started yet' : weeksAndDays(ga);
		const trimester = notStarted ? DASH : ga <= 97 ? 'First trimester' : ga <= 195 ? 'Second trimester' : 'Third trimester';
		const toGoText = togo > 0 ? plural(togo, 'day') : togo === 0 ? 'Due today' : `Past due by ${plural(-togo, 'day')}`;

		return {
			primaryResult: formatDate(due),
			primaryLabel: 'Estimated due date',
			summary: notStarted
				? `That date is before dating starts on ${formatDate(start)}.`
				: `You are ${gaText} along on ${formatDate(on)}.`,
			secondaryMetrics: [
				{ label: 'Gestational age', value: gaText },
				{ label: 'Trimester', value: trimester },
				{ label: 'Days to go', value: toGoText },
				{ label: 'Dating start', value: formatDate(start) }
			]
		};
	},
	content: {
		intro:
			'Use this due date calculator to estimate your due date from the first day of your last period, the date of conception, or an IVF embryo transfer. You can also see how many weeks and days pregnant you are on any date.',
		howTo: [
			'Choose the date you know: last period, conception or IVF transfer.',
			'Enter that date. For a last period, also enter your usual cycle length.',
			'For IVF, choose the age of the embryo at transfer, day 3 or day 5.',
			'Check the “Calculate as of” date to see your weeks and days and the days to go.'
		],
		about: [
			{
				heading: 'What is an estimated due date?',
				paragraphs: [
					'Your estimated due date (EDD) is the day you reach 40 weeks of pregnancy. By convention, doctors count it as 280 days after the first day of your last menstrual period (LMP). This is the rule the American College of Obstetricians and Gynecologists (ACOG) describes.',
					'The count starts at your last period, not at conception. Conception usually happens about two weeks later. So a baby is about 38 weeks old, counting from conception, on the due date.',
					'A due date is a guide. Only about 5 in 100 babies are born on their due date, according to the Australian government’s Pregnancy, Birth and Baby service. Most babies arrive between 37 and 42 weeks.'
				]
			},
			{
				heading: 'How your due date is calculated',
				paragraphs: [
					'From a last period, the tool adds 280 days. This gives nearly the same answer as the old “Naegele’s rule”: add 7 days to the first day of your last period, then add 9 months. If your cycle is not 28 days, the date moves by the difference. For example, a 35-day cycle moves it 7 days later, because ovulation also comes later.',
					'From conception, the tool adds 266 days (38 weeks). For IVF, it adds 261 days from a day 5 embryo transfer, or 263 days from a day 3 transfer. These numbers account for the age of the embryo on the day of transfer.',
					'Because IVF dates are known exactly, they can be more precise than a date based on your memory of a last period. You can see the formulas in the section below.'
				]
			},
			{
				heading: 'Why your doctor may change your date',
				paragraphs: [
					'A last-period date assumes a 28-day cycle with ovulation on day 14. It also relies on you remembering the date well. If your cycles are irregular, or you are unsure, the estimate may be off.',
					'For this reason, an early ultrasound is often used to check the date. ACOG advises changing the date when an early scan and the last-period date differ by more than 5 days before 9 weeks. From 9 weeks to 13 weeks and 6 days, the gap is more than 7 days. Follow the date your midwife or doctor gives you, since that is the one used for your care.'
				]
			},
			{
				heading: 'Early term, full term and late term',
				paragraphs: [
					'ACOG and the Society for Maternal-Fetal Medicine describe four groups of term, based on the week of birth. Babies born at 39 weeks or later tend to have better health outcomes than babies born a little earlier. Even so, each pregnancy is different.'
				],
				table: {
					caption: 'Term definitions (ACOG)',
					columns: ['Term', 'Weeks of pregnancy'],
					rows: [
						['Early term', '37 weeks 0 days to 38 weeks 6 days'],
						['Full term', '39 weeks 0 days to 40 weeks 6 days'],
						['Late term', '41 weeks 0 days to 41 weeks 6 days'],
						['Post term', '42 weeks 0 days and later']
					]
				}
			},
			{
				heading: 'What to do next',
				paragraphs: [
					'If you think you are pregnant, book a visit with a midwife or doctor early. They can confirm your dates and arrange scans and check-ups. You can also look at weeks, trimesters and milestones with the [pregnancy calculator](/pregnancy-calculator).',
					'If you want to know when you may have conceived, try the [conception calculator](/conception-calculator). To check how much weight gain is usual, see the [pregnancy weight gain calculator](/pregnancy-weight-gain-calculator). Call your midwife or doctor if you have heavy bleeding, severe pain, or your baby seems to move less than usual.'
				]
			}
		],
		formulas: [
			{
				title: 'From the last period (LMP)',
				expression: 'Due date = LMP + 280 days + (cycle length − 28 days)',
				variables: [
					{ symbol: 'LMP', meaning: 'first day of your last period' },
					{ symbol: 'cycle length', meaning: 'days from one period to the next, usually 28' }
				]
			},
			{
				title: 'From conception',
				expression: 'Due date = conception date + 266 days',
				variables: [{ symbol: '266', meaning: 'the 38 weeks from conception to birth' }]
			},
			{
				title: 'From IVF embryo transfer',
				expression: 'Due date = transfer date + 263 days (day 3 embryo) or + 261 days (day 5 embryo)',
				variables: []
			},
			{
				title: 'How far along',
				expression: 'Days along = date − dating start, where dating start = due date − 280 days. Weeks = ⌊days ÷ 7⌋, days = days mod 7',
				variables: []
			}
		],
		example: {
			title: 'Last period on 10 January 2026, 28-day cycle, checked on 1 March 2026',
			steps: [
				'Due date = 10 January 2026 + 280 days',
				'280 days is 40 weeks, so the due date is 17 October 2026',
				'Days along on 1 March: 1 March − 10 January = 50 days, which is 7 weeks and 1 day',
				'Days to go: 17 October − 1 March = 230 days'
			],
			result: 'Due date Saturday, October 17, 2026. On 1 March 2026 you are 7 weeks and 1 day along, with 230 days to go.'
		},
		faq: [
			{
				q: 'How accurate is a due date calculator?',
				a: 'It gives an estimate only. About 5 in 100 babies are born on their due date, and most arrive between 37 and 42 weeks. An early ultrasound can refine the date.'
			},
			{
				q: 'Why is the due date 280 days after the last period?',
				a: 'Pregnancy is counted from the first day of the last period, about two weeks before conception. Adding 280 days (40 weeks) gives the standard due date used by doctors.'
			},
			{
				q: 'What if my cycle is longer or shorter than 28 days?',
				a: 'The due date moves by the difference from 28 days. A 35-day cycle moves the estimate 7 days later. A 24-day cycle moves it 4 days earlier.'
			},
			{
				q: 'Which date should I follow, this one or my provider’s?',
				a: 'Follow your provider’s date. A dating ultrasound can give a different estimate, and your care team uses that one.'
			},
			{
				q: 'How is the due date worked out after IVF?',
				a: 'It counts from the embryo transfer date. A day 5 embryo adds 261 days, and a day 3 embryo adds 263 days. Your clinic will confirm the date.'
			}
		],
		sources: [
			{ title: 'ACOG — Methods for estimating the due date (Committee Opinion 700)', url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/05/methods-for-estimating-the-due-date' },
			{ title: 'ACOG — Definition of term pregnancy (Committee Opinion 579)', url: 'https://pubmed.ncbi.nlm.nih.gov/24150030/' },
			{ title: 'Pregnancy, Birth and Baby (Australian Government) — Working out your due date', url: 'https://www.pregnancybirthbaby.org.au/working-out-your-due-date' }
		],
		disclaimer:
			'This is an estimate for planning, not a medical diagnosis. Confirm your due date with your midwife, doctor or fertility clinic.'
	}
});
