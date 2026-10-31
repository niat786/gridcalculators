import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num, plural } from '../format';
import meta from './date-calculator.meta';

const DAY = 86_400_000;
const MAX_BUSINESS_DAYS = 10_000;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

/** A UTC calendar date. setUTCFullYear keeps years 0–99 literal (Date.UTC would map them to 1900+). */
function utcDate(y: number, m0: number, d: number): Date {
	const x = new Date(0);
	x.setUTCFullYear(y, m0, d);
	return x;
}

/** Parse YYYY-MM-DD as a UTC date. Null when the text is not a real calendar date. */
export function parseISODate(s: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (!m) return null;
	const y = +m[1];
	const d = utcDate(y, +m[2] - 1, +m[3]);
	if (y < 1 || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
	return d;
}

function daysInMonth(y: number, m0: number): number {
	return utcDate(y, m0 + 1, 0).getUTCDate();
}

/** Add whole months. If the target month is shorter, the day becomes its last day (Jan 31 + 1 month = Feb 28 or 29). */
export function addMonths(date: Date, n: number): Date {
	const total = date.getUTCFullYear() * 12 + date.getUTCMonth() + n;
	const y = Math.floor(total / 12);
	const m0 = total - y * 12;
	const d = Math.min(date.getUTCDate(), daysInMonth(y, m0));
	return utcDate(y, m0, d);
}

export function addDays(date: Date, n: number): Date {
	return new Date(date.getTime() + n * DAY);
}

const isWeekday = (d: Date) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5;

/** Step forward one calendar day at a time, counting only Monday to Friday. No holidays. */
export function addBusinessDays(date: Date, n: number): Date {
	let d = date;
	let left = n;
	while (left > 0) {
		d = addDays(d, 1);
		if (isWeekday(d)) left -= 1;
	}
	return d;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const longDate = (d: Date) => `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
const isCount = (n: number, max: number) => Number.isInteger(n) && n >= 0 && n <= max;

function signed(n: number): string {
	if (n > 0) return `+${num(n, 0)}`;
	if (n < 0) return `−${num(-n, 0)}`;
	return '0';
}

/** "1 year, 2 months and 3 days", skipping zero parts. */
function phrase(parts: [number, string][]): string {
	const words = parts.filter(([n]) => n > 0).map(([n, w]) => plural(n, w));
	if (words.length === 0) return '';
	if (words.length === 1) return words[0];
	return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

const invalid = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Result date', summary });

const mode = (m: string) => (v: InputValues) => v.mode === m;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'What do you want to do?',
			type: 'select',
			display: 'segmented',
			default: 'add',
			options: [
				{ label: 'Add or subtract', value: 'add' },
				{ label: 'Business days', value: 'business' }
			]
		},
		{ id: 'start', label: 'Start date', type: 'date', default: 'today' },
		{
			id: 'op',
			label: 'Operation',
			type: 'select',
			display: 'segmented',
			default: 'plus',
			options: [
				{ label: 'Add (+)', value: 'plus' },
				{ label: 'Subtract (−)', value: 'minus' }
			],
			visibleWhen: mode('add')
		},
		{ id: 'years', label: 'Years', type: 'number', default: 0, min: 0, max: 9999, decimal: false, suffix: 'years', visibleWhen: mode('add') },
		{ id: 'months', label: 'Months', type: 'number', default: 1, min: 0, max: 12000, decimal: false, suffix: 'months', visibleWhen: mode('add') },
		{ id: 'weeks', label: 'Weeks', type: 'number', default: 0, min: 0, max: 52000, decimal: false, suffix: 'weeks', visibleWhen: mode('add') },
		{ id: 'days', label: 'Days', type: 'number', default: 0, min: 0, max: 100000, decimal: false, suffix: 'days', visibleWhen: mode('add') },
		{
			id: 'businessDays',
			label: 'Business days to add',
			type: 'number',
			default: 10,
			min: 0,
			max: MAX_BUSINESS_DAYS,
			decimal: false,
			suffix: 'days',
			help: 'Monday to Friday only. Public holidays are not skipped.',
			visibleWhen: mode('business')
		}
	],
	calculate(v): CalculationResult {
		const start = parseISODate(String(v.start));
		if (!start) return invalid('Enter a valid start date.');

		if (v.mode === 'business') {
			const n = Number(v.businessDays);
			if (!isCount(n, MAX_BUSINESS_DAYS)) return invalid('Enter a whole number of business days from 0 to 10,000.');
			const end = addBusinessDays(start, n);
			const calendar = Math.round((end.getTime() - start.getTime()) / DAY);
			return {
				primaryResult: longDate(end),
				primaryLabel: 'Result date',
				summary: `Counting ${plural(n, 'business day')} forward from ${longDate(start)}. Weekends are skipped and public holidays are not.`,
				secondaryMetrics: [
					{ label: 'ISO date', value: isoDate(end) },
					{ label: 'Calendar days from start', value: signed(calendar) },
					{ label: 'Weekend days skipped', value: num(calendar - n, 0) }
				]
			};
		}

		const years = Number(v.years);
		const months = Number(v.months);
		const weeks = Number(v.weeks);
		const days = Number(v.days);
		if (![years, months, weeks, days].every((n) => isCount(n, 1_000_000))) {
			return invalid('Enter whole numbers of zero or more for years, months, weeks and days.');
		}

		const sign = v.op === 'minus' ? -1 : 1;
		// Months first (with clamping), then the week and day count.
		const moved = addDays(addMonths(start, sign * (years * 12 + months)), sign * (weeks * 7 + days));
		const y = moved.getUTCFullYear();
		if (y < 1 || y > 9999) return invalid('The result falls outside the years 1 to 9999.');

		const span = Math.round((moved.getTime() - start.getTime()) / DAY);
		const amount = phrase([
			[years, 'year'],
			[months, 'month'],
			[weeks, 'week'],
			[days, 'day']
		]);
		return {
			primaryResult: longDate(moved),
			primaryLabel: 'Result date',
			summary: amount
				? `${sign > 0 ? 'Adding' : 'Subtracting'} ${amount} to ${longDate(start)}.`
				: 'No time is added, so the result is the start date.',
			secondaryMetrics: [
				{ label: 'ISO date', value: isoDate(moved) },
				{ label: 'Days from start', value: signed(span) },
				{
					label: 'Weeks and days apart',
					value: phrase([
						[Math.floor(Math.abs(span) / 7), 'week'],
						[Math.abs(span) % 7, 'day']
					]) || '0 days'
				}
			]
		};
	},
	content: {
		intro:
			'Add or subtract years, months, weeks and days from a date to find the result. You can also count forward a set number of business days, Monday to Friday, for deadlines and delivery times.',
		howTo: [
			'Choose “Add or subtract” or “Business days”.',
			'Enter the start date. It defaults to today.',
			'For add or subtract, enter the years, months, weeks and days, then pick Add or Subtract. For business days, enter how many working days to count.',
			'Read the result as a weekday, month, day and year, with the ISO date below it.'
		],
		about: [
			{
				heading: 'Adding months and years',
				paragraphs: [
					'Months are not all the same length, so adding a month can be tricky. Adding one month to 15 March gives 15 April. Adding one month to 31 January has no 31 February to land on, so the result stops at the end of February: 28 February, or 29 in a leap year.',
					'The calculator adds months and years first. It then adds weeks and days to that date. For example, three months after 31 August is 30 November, because November has 30 days.'
				]
			},
			{
				heading: 'Business days and the working week',
				paragraphs: [
					'Business days skip Saturday and Sunday. In many countries the working week is Monday to Friday, but it is not the same everywhere. In parts of the Middle East, for example, the weekend falls on Friday and Saturday.',
					'Public holidays are not skipped. A holiday in the middle of the count will make the real date later. If you need the date for a contract or delivery, add those days yourself or check the local holiday list.'
				]
			},
			{
				heading: 'Calendars used around the world',
				paragraphs: [
					'Most of the world uses the Gregorian calendar, which this tool follows. Many Muslim communities also follow the Hijri (Islamic) calendar, which is about 11 days shorter each year. Dates such as Ramadan and Eid move through the Gregorian year.',
					'To convert a date between the two, use the [Hijri date converter](/hijri-date-converter). For a plain count of days between two dates, the [day counter](/day-counter) is quicker.'
				]
			},
			{
				heading: 'Dates in other formats',
				paragraphs: [
					'The same numbers can mean different dates. 04/07/2026 is 7 April in the US and 4 July in the UK, India and many other countries. To avoid confusion, use the date picker or the ISO format, which is year, month, day.',
					'The result shows the ISO date, such as 2026-03-10. You can paste it into a spreadsheet or form and be sure it reads the same way everywhere. For day-of-the-week checks, the [day of the week calculator](/day-of-the-week-calculator) is useful.'
				]
			},
			{
				heading: 'Tips for planning with dates',
				paragraphs: [
					'Plan with the right unit. Use business days for work deadlines and calendar days for things like warranty periods or medicine courses.',
					'Check whether the start day counts. Adding 10 days to 1 March gives 11 March. If 1 March is day one of a 10-day period, the last day is 10 March.'
				],
				list: [
					'Add weeks in the weeks box, rather than multiplying by 7 yourself.',
					'For a birthday or age, use the [age calculator](/age-calculator).',
					'Check the weekday in the result to plan around weekends and holidays.',
					'Save or share the link. The dates are stored in the page address.'
				]
			}
		],
		formulas: [
			{
				title: 'Months and years',
				expression: 'Target month = start month ± (12 × years + months). Day = the smaller of the start day and the length of the target month.',
				variables: [{ symbol: '±', meaning: 'plus when adding, minus when subtracting' }]
			},
			{
				title: 'Weeks and days',
				expression: 'Result = date after months ± (7 × weeks + days)',
				variables: [{ symbol: '7', meaning: 'days in a week' }]
			},
			{
				title: 'Business days',
				expression: 'Step forward one calendar day at a time, counting only Monday to Friday, until the count reaches N.',
				variables: [{ symbol: 'N', meaning: 'number of business days to add' }]
			}
		],
		example: {
			title: 'Add 1 month and 10 days to 31 January 2026',
			steps: [
				'One month after 31 January is 28 February 2026, because February 2026 has only 28 days.',
				'28 February + 10 days = 10 March 2026.',
				'10 March 2026 falls on a Tuesday.'
			],
			result: 'Tuesday, March 10, 2026.'
		},
		faq: [
			{
				q: 'Does this count public holidays?',
				a: 'No. Business days mode counts Monday to Friday only and does not remove public holidays. If a holiday falls inside the period, the result will be later than a holiday-aware calendar shows.'
			},
			{
				q: 'What happens when I add a month to the 31st?',
				a: 'The result stops at the end of the shorter month. 31 January plus one month is 28 February, or 29 February in a leap year.'
			},
			{
				q: 'How do I find the date 100 days from today?',
				a: 'Leave the start date as today, choose Add, and enter 100 in the Days box. The result shows the date and its weekday. Use Subtract to go back 100 days.'
			},
			{
				q: 'How do I count business days to a deadline?',
				a: 'Choose “Business days”, enter the start date and the number of working days. The result is the date that many Monday-to-Friday days later, before any holidays.'
			},
			{
				q: 'Can I go back in time with this calculator?',
				a: 'Yes. Choose Subtract to go back in years, months, weeks and days. Results work for any year from 1 to 9999.'
			},
			{
				q: 'Does my time zone change the answer?',
				a: 'No. Dates are handled as calendar days in UTC, so the result is the same wherever you are.'
			}
		],
		sources: [{ title: 'ISO 8601 — Date and time format', url: 'https://www.iso.org/iso-8601-date-and-time-format.html' }]
	}
});
