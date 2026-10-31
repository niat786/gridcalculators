import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH } from '../format';
import meta from './conception-calculator.meta';

const DAY = 86_400_000;
/** From conception to birth is about 38 weeks, or 266 days. */
const CONCEPTION_TO_BIRTH = 266;

const fromDue = (v: InputValues) => v.mode === 'due';
const fromPeriod = (v: InputValues) => v.mode === 'lmp';

/** Parse YYYY-MM-DD as a UTC date, returned in milliseconds. NaN when invalid. */
export function parseISODate(s: unknown): number {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
	if (!m) return NaN;
	const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
	return new Date(t).getUTCMonth() === +m[2] - 1 ? t : NaN;
}

function fmtFull(t: number): string {
	return new Date(t).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function fmtMonthDay(t: number): string {
	return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function fmtMdy(t: number): string {
	return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** A date range such as "Oct 6 – Oct 10, 2026", or one date when the range is a single day. */
export function range(a: number, b: number): string {
	if (a === b) return fmtMdy(a);
	const sameYear = new Date(a).getUTCFullYear() === new Date(b).getUTCFullYear();
	return `${sameYear ? fmtMonthDay(a) : fmtMdy(a)} – ${fmtMdy(b)}`;
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Start from',
			type: 'select',
			display: 'segmented',
			default: 'due',
			options: [
				{ label: 'Due date', value: 'due' },
				{ label: 'Last period', value: 'lmp' }
			]
		},
		{
			id: 'due',
			label: 'Due date',
			type: 'date',
			default: '2027-07-01',
			visibleWhen: fromDue
		},
		{
			id: 'lmp',
			label: 'First day of last period',
			type: 'date',
			default: '2026-10-01',
			visibleWhen: fromPeriod
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
			visibleWhen: fromPeriod,
			help: 'Usually 21 to 45 days. Leave at 28 if you are not sure.'
		}
	],
	calculate(v): CalculationResult {
		const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Estimated conception date', summary });

		let conception: number;
		let window: [number, number];
		let method: string;

		if (v.mode === 'lmp') {
			const lmp = parseISODate(v.lmp);
			const cycle = Number(v.cycle);
			if (Number.isNaN(lmp)) return fail('Enter the first day of your last period.');
			if (!Number.isInteger(cycle) || cycle < 21 || cycle > 45) return fail('Cycle length must be a whole number from 21 to 45 days.');
			// Ovulation falls about 14 days before the next period, so a longer cycle moves it later.
			conception = lmp + (14 + cycle - 28) * DAY;
			window = [conception - 5 * DAY, conception + 1 * DAY];
			method = 'Last period + 14 days, adjusted for cycle length';
		} else {
			const due = parseISODate(v.due);
			if (Number.isNaN(due)) return fail('Enter a due date.');
			conception = due - CONCEPTION_TO_BIRTH * DAY;
			window = [conception - 2 * DAY, conception + 2 * DAY];
			method = 'Due date minus 266 days';
		}

		const likely = range(window[0], window[1]);

		return {
			primaryResult: fmtFull(conception),
			primaryLabel: 'Estimated conception date',
			summary: `Most likely between ${likely}. The exact day cannot be known.`,
			secondaryMetrics: [
				{ label: 'Likely window', value: likely },
				{ label: 'Due date for this timing', value: fmtMdy(conception + CONCEPTION_TO_BIRTH * DAY) },
				{ label: 'Method', value: method }
			]
		};
	},
	content: {
		intro:
			'Use this conception calculator to estimate roughly when you conceived, working back from a due date or from the first day of your last period. The answer is a likely window of days, not one fixed date.',
		howTo: [
			'Choose whether to start from a due date or from the first day of your last period.',
			'Enter that date. If you chose last period, also enter your cycle length.',
			'Read the estimated conception date and the likely window around it.'
		],
		about: [
			{
				heading: 'What is the conception date?',
				paragraphs: [
					'Conception is when a sperm fertilises an egg. This happens after ovulation, when an ovary releases the egg. The egg can be fertilised for about 12 to 24 hours, and sperm can survive in the body for about 3 to 5 days, according to Mayo Clinic.',
					'Because of this, the day you had sex and the day you conceived may not be the same. Sperm can wait for the egg. For that reason, the best estimate is a short window of days.'
				]
			},
			{
				heading: 'How the date is estimated',
				paragraphs: [
					'Doctors date a pregnancy from the first day of the last period. The standard due date is 280 days (40 weeks) after that day. Conception usually happens about two weeks into this count, so it is about 38 weeks, or 266 days, before the due date.',
					'If you enter a due date, the tool subtracts 266 days. If you enter your last period, it adds 14 days for a 28-day cycle, and adjusts for a longer or shorter cycle. You can see the formulas in the section below.',
					'The result is only as good as the date you start with. A due date set by an early ultrasound is usually more reliable than one based on memory of a last period.'
				]
			},
			{
				heading: 'Why the window is not exact',
				paragraphs: [
					'Ovulation does not happen on day 14 for everyone. Mayo Clinic notes that the gap between ovulation and the next period can change from month to month. Pregnancies also differ in length. Only about 5 in 100 babies are born on their due date, and most arrive between 37 and 42 weeks.',
					'As a result, the tool shows a window. From a due date, it is 2 days either side. From a last period, it runs from 5 days before to 1 day after. Treat these as ranges, not facts.'
				]
			},
			{
				heading: 'If you are trying to conceive',
				paragraphs: [
					'To plan ahead, the [ovulation calculator](/ovulation-calculator) estimates your fertile window. The [period calculator](/period-calculator) predicts your next periods.',
					'The NHS says that more than 8 in 10 couples conceive naturally within a year of regular unprotected sex, when the woman is under 40. See a doctor if you have not conceived after a year. Go sooner if you are 36 or older, or have a known fertility concern.'
				]
			},
			{
				heading: 'Once you are pregnant',
				paragraphs: [
					'Your midwife or doctor will confirm your dates, often with an early scan. Use the [due date calculator](/due-date-calculator) to estimate your due date from a last period, conception or IVF transfer. The [pregnancy calculator](/pregnancy-calculator) shows your weeks, trimester and milestones.',
					'This tool is for general interest. It cannot confirm a pregnancy. If you are worried about a pregnancy, talk to a doctor.'
				]
			}
		],
		formulas: [
			{
				title: 'From a due date',
				expression: 'Conception ≈ due date − 266 days',
				variables: [{ symbol: '266', meaning: 'the 38 weeks from conception to birth' }]
			},
			{
				title: 'From the last period',
				expression: 'Conception ≈ last period + 14 days + (cycle length − 28 days)',
				variables: [{ symbol: '14', meaning: 'the usual days from the start of a 28-day cycle to ovulation' }]
			},
			{
				title: 'Likely window',
				expression: 'Due date method: conception ± 2 days\nPeriod method: conception − 5 days to conception + 1 day',
				variables: []
			}
		],
		example: {
			title: 'A due date of 1 July 2027',
			steps: [
				'Conception = 1 July 2027 − 266 days = 8 October 2026',
				'Likely window = 2 days before to 2 days after: 6 October to 10 October 2026',
				'Check: 8 October 2026 + 266 days = 1 July 2027'
			],
			result: 'Estimated conception around Thursday, October 8, 2026, most likely between October 6 and October 10.'
		},
		faq: [
			{
				q: 'How do I calculate my conception date?',
				a: 'Subtract 266 days (38 weeks) from your due date. Or add 14 days to the first day of your last period if you have a 28-day cycle. This calculator does both and shows a likely window.'
			},
			{
				q: 'How accurate is a conception date estimate?',
				a: 'It is an approximation. Pregnancy length varies, and most people cannot know the exact day of conception. Use the window rather than a single date.'
			},
			{
				q: 'Why is the window different for each method?',
				a: 'A due date gives a fixed point, so the window is set evenly around it. A period-based estimate depends on when ovulation happened. Sperm can survive for several days, so that window starts earlier and ends a day after.'
			},
			{
				q: 'Why does the calculator use 266 days?',
				a: 'Conception to birth is about 38 weeks, or 266 days. The usual 40-week count starts about two weeks earlier, from the first day of the last period.'
			},
			{
				q: 'What if my cycles are irregular?',
				a: 'An irregular cycle makes the period-based estimate less reliable. A due date confirmed by an early scan is usually more accurate.'
			}
		],
		sources: [
			{ title: 'Mayo Clinic — Ovulation signs: when is conception most likely?', url: 'https://www.mayoclinic.org/healthy-lifestyle/getting-pregnant/expert-answers/ovulation-signs/faq-20058000' },
			{ title: 'ACOG — Methods for estimating the due date (Committee Opinion 700)', url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/05/methods-for-estimating-the-due-date' },
			{ title: 'Pregnancy, Birth and Baby (Australian Government) — Working out your due date', url: 'https://www.pregnancybirthbaby.org.au/working-out-your-due-date' }
		],
		disclaimer:
			'These dates are estimates for general interest and planning. The exact timing cannot be known. Talk to a doctor, midwife or fertility specialist about trying to conceive or about a pregnancy.'
	}
});
