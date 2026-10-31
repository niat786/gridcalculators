import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num, plural } from '../format';
import meta from './day-counter.meta';

const DAY = 86_400_000;

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

function addMonths(date: Date, n: number): Date {
	const total = date.getUTCFullYear() * 12 + date.getUTCMonth() + n;
	const y = Math.floor(total / 12);
	const m0 = total - y * 12;
	const d = Math.min(date.getUTCDate(), utcDate(y, m0 + 1, 0).getUTCDate());
	return utcDate(y, m0, d);
}

/** Whole calendar months from `from` to `to`, then the leftover days. Requires from <= to. */
export function monthsAndDays(from: Date, to: Date): { months: number; days: number } {
	let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
	while (months > 0 && addMonths(from, months) > to) months -= 1;
	const days = Math.round((to.getTime() - addMonths(from, months).getTime()) / DAY);
	return { months, days };
}

/** Weekdays (Mon–Fri) among the `days` dates that start at `from`. The date after the last one is not counted. */
export function weekdaysIn(from: Date, days: number): number {
	const full = Math.floor(days / 7) * 5; // any seven consecutive days hold five weekdays
	const startDow = from.getUTCDay();
	let extra = 0;
	for (let i = 0; i < days % 7; i++) {
		const dow = (startDow + i) % 7;
		if (dow >= 1 && dow <= 5) extra++;
	}
	return full + extra;
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'start', label: 'Start date', type: 'date', default: '2026-01-01' },
		{ id: 'end', label: 'End date', type: 'date', default: 'today' },
		{
			id: 'includeEnd',
			label: 'Include the end day',
			type: 'toggle',
			default: false,
			help: 'Count the end date as a full day.'
		}
	],
	calculate(v): CalculationResult {
		const a = parseISODate(String(v.start));
		const b = parseISODate(String(v.end));
		if (!a || !b) {
			return { primaryResult: DASH, primaryLabel: 'Days between', summary: 'Enter two valid dates.' };
		}

		const include = v.includeEnd === true;
		const reversed = b < a;
		const from = reversed ? b : a;
		let to = reversed ? a : b;
		if (include) to = new Date(to.getTime() + DAY);

		const days = Math.round((to.getTime() - from.getTime()) / DAY);
		const weeks = Math.floor(days / 7);
		const { months, days: leftover } = monthsAndDays(from, to);
		const business = weekdaysIn(from, days);

		const direction = reversed ? 'The end date is before the start date, so the count runs backwards. ' : '';
		const edge = include ? 'Both the start and end days are counted.' : 'The end day is not counted.';

		return {
			primaryResult: plural(days, 'day'),
			primaryLabel: 'Days between',
			summary: `${direction}${edge}`,
			secondaryMetrics: [
				{ label: 'Weeks and days', value: `${plural(weeks, 'week')} and ${plural(days % 7, 'day')}` },
				{ label: 'Months and days (calendar)', value: `${plural(months, 'month')} and ${plural(leftover, 'day')}` },
				{ label: 'Business days (Mon–Fri)', value: num(business, 0) },
				{ label: 'Hours', value: num(days * 24, 0) }
			]
		};
	},
	content: {
		intro:
			'Count the days between two dates, then see the same span as weeks, calendar months, business days and hours. It helps with deadlines, notice periods, trips and project plans.',
		howTo: [
			'Enter the start date.',
			'Enter the end date. It defaults to today.',
			'Turn on “Include the end day” if you want both dates counted as full days.',
			'Read the days between first, then the weeks, months, business days and hours below.'
		],
		about: [
			{
				heading: 'How the day count works',
				paragraphs: [
					'The calculator subtracts the start date from the end date. The result is the number of days between them. By default, the end day is not counted, so the gap from 1 March to 2 March is 1 day.',
					'Some situations count both ends. A 7-day course that runs from Monday to Sunday covers 7 days, not 6. Turn on “Include the end day” to match that style of counting.'
				]
			},
			{
				heading: 'Counting nights, days and business days',
				paragraphs: [
					'Hotels, rentals and leases often count nights rather than days. A stay from 1 March to 4 March is 3 nights, which is the same as the day count without the end day.',
					'Business days count only Monday to Friday. They skip weekends, but not public holidays. In countries where the weekend falls on other days, the count will differ, so check the local working week before you rely on the number.'
				]
			},
			{
				heading: 'Weeks and calendar months',
				paragraphs: [
					'The weeks figure is the total days divided by 7, rounded down. For example, 73 days is 10 full weeks and 3 days left over.',
					'Calendar months are different from 30-day months. The calculator counts whole months forward from the start date, the way a calendar does. From 15 January to 15 March is 2 months, even though that is about 59 days.'
				]
			},
			{
				heading: 'Leap years and long periods',
				paragraphs: [
					'A leap year has 29 days in February, so a span that crosses 29 February has one more day. From 28 February 2028 to 1 March 2028 is 2 days, because 2028 is a leap year.',
					'For periods of many years, the total days can be large. The [age calculator](/age-calculator) shows years, months and days, and the [date calculator](/date-calculator) adds or subtracts whole months from a date.'
				]
			},
			{
				heading: 'Tips for accurate counts',
				paragraphs: [
					'Check which day the count should include before you start. Most mistakes come from one day being counted too many or too few.'
				],
				list: [
					'Use the same date format for both dates, and check the year.',
					'If the end date is before the start date, the count runs backwards. The result shows a note to say so.',
					'For time within a day, use the [time calculator](/time-calculator) or the [hours calculator](/hours-calculator).',
					'Write down the rule you used, such as “end day included”, if you share the number.'
				]
			}
		],
		formulas: [
			{
				title: 'Days between',
				expression: 'Days = end date − start date, in whole days (+1 when the end day is included)',
				variables: []
			},
			{
				title: 'Weeks and days',
				expression: 'Weeks = ⌊days ÷ 7⌋, and the remaining days = days mod 7',
				variables: [{ symbol: '⌊ ⌋', meaning: 'round down to a whole number' }]
			},
			{
				title: 'Months and days',
				expression:
					'Months = the most whole calendar months that fit between the dates. Days = what is left over after those months.',
				variables: []
			},
			{
				title: 'Business days',
				expression: 'Count the Monday-to-Friday days in the span. The end date is left out unless it is included.',
				variables: []
			},
			{
				title: 'Hours',
				expression: 'Hours = days × 24',
				variables: []
			}
		],
		example: {
			title: 'From 1 January 2026 to 15 March 2026',
			steps: [
				'Days: 31 (rest of January) + 28 (February) + 14 (March) = 73 days.',
				'Weeks: ⌊73 ÷ 7⌋ = 10 weeks, and 73 mod 7 = 3 days.',
				'Months: 1 January + 2 months = 1 March, and 1 March + 14 days = 15 March, so 2 months and 14 days.',
				'Business days: 52 Monday-to-Friday days fall in that span.',
				'Hours: 73 × 24 = 1,752.'
			],
			result: '73 days (10 weeks and 3 days). Including the end day gives 74 days.'
		},
		faq: [
			{
				q: 'Is the end date included?',
				a: 'Not by default. From 1 March to 2 March is 1 day. Turn on “Include the end day” to count both dates, which makes that range 2 days.'
			},
			{
				q: 'How are calendar months counted?',
				a: 'Whole months are counted forward from the start date, the way a calendar counts them. From 1 January to 1 March is 2 months, and any days left over are shown separately.'
			},
			{
				q: 'Do business days skip public holidays?',
				a: 'No. Only Saturdays and Sundays are skipped. If you need a working-day count that excludes holidays, subtract those dates yourself.'
			},
			{
				q: 'Does a leap year change the day count?',
				a: 'Yes. February has 29 days in a leap year, so a span that includes 29 February is one day longer than it would be otherwise. The calculator uses the real calendar, so it handles this for you.'
			},
			{
				q: 'What is the difference between the day counter and the date calculator?',
				a: 'The day counter finds the gap between two dates. The [date calculator](/date-calculator) starts from one date and finds a new date after adding or subtracting a period.'
			},
			{
				q: 'What if the end date is before the start date?',
				a: 'The calculator still counts the days, and it notes that the count runs backwards. Swap the dates if you want a positive number with the earlier date first.'
			}
		]
	}
});
