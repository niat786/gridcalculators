import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num, plural } from '../format';
import meta from './day-of-the-week-calculator.meta';

const DAY = 86_400_000;

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
const QUARTERS = ['January to March', 'April to June', 'July to September', 'October to December'];

/** A UTC calendar date. setUTCFullYear keeps years 0–99 literal and normalises day overflow. */
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

/**
 * Zeller's congruence (Gregorian calendar). Month is 1–12, day 1–31.
 * Returns the weekday with 0 = Sunday … 6 = Saturday.
 */
export function zellerWeekday(year: number, month: number, day: number): number {
	let m = month;
	let y = year;
	if (m < 3) {
		m += 12; // January and February count as months 13 and 14 of the previous year
		y -= 1;
	}
	const K = y % 100; // year within the century
	const J = Math.floor(y / 100); // zero-based century
	// h: 0 = Saturday, 1 = Sunday, … 6 = Friday
	const h = (day + Math.floor((13 * (m + 1)) / 5) + K + Math.floor(K / 4) + Math.floor(J / 4) + 5 * J) % 7;
	return (h + 6) % 7;
}

export function isLeapYear(y: number): boolean {
	return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** ISO 8601 week number. Week 1 is the week that holds the year's first Thursday. */
export function isoWeek(y: number, m: number, d: number, weekday: number): number {
	const isoDay = weekday === 0 ? 7 : weekday; // Monday = 1 … Sunday = 7
	const thursday = utcDate(y, m - 1, d + 4 - isoDay);
	const dayOfYear = Math.round((thursday.getTime() - utcDate(thursday.getUTCFullYear(), 0, 1).getTime()) / DAY);
	return Math.floor(dayOfYear / 7) + 1;
}

export default defineCalculator({
	meta,
	inputs: [{ id: 'date', label: 'Date', type: 'date', default: 'today' }],
	calculate(v): CalculationResult {
		const d = parseISODate(String(v.date));
		if (!d) return { primaryResult: DASH, primaryLabel: 'Day of the week', summary: 'Enter a valid date.' };

		const y = d.getUTCFullYear();
		const m = d.getUTCMonth() + 1;
		const day = d.getUTCDate();
		const weekday = zellerWeekday(y, m, day);
		const dayOfYear = Math.round((d.getTime() - utcDate(y, 0, 1).getTime()) / DAY) + 1;
		const leap = isLeapYear(y);
		const quarter = Math.floor((m - 1) / 3) + 1;

		return {
			primaryResult: WEEKDAYS[weekday],
			primaryLabel: 'Day of the week',
			summary: `${MONTHS[m - 1]} ${day}, ${y} falls on a ${WEEKDAYS[weekday]}.`,
			secondaryMetrics: [
				{ label: 'Day of the year', value: `${num(dayOfYear, 0)} of ${num(leap ? 366 : 365, 0)}` },
				{ label: 'ISO week number', value: `Week ${isoWeek(y, m, day, weekday)}` },
				{ label: 'Quarter', value: `Q${quarter} (${QUARTERS[quarter - 1]})` },
				{ label: 'Leap year', value: leap ? 'Yes' : 'No' }
			]
		};
	},
	content: {
		intro:
			'Find the day of the week for any date. You’ll also see its day of the year, ISO week number, quarter and whether its year is a leap year.',
		howTo: [
			'Enter a date. It defaults to today.',
			'Read the weekday at the top of the result.',
			'Check the day of the year, ISO week, quarter and leap-year details below.'
		],
		about: [
			{
				heading: 'Why the weekday matters',
				paragraphs: [
					'The weekday affects almost every plan. It tells you whether an event falls on a working day, a weekend or a holiday. It is also useful for checking dates on contracts, tickets and invoices, where a wrong weekday can cause confusion. It also helps you plan shifts, classes and appointments.',
					'In some countries, a public holiday that falls on a weekend moves to a nearby weekday. Check your local calendar before you book travel or set a deadline. To find the weekday after a set number of days, use the [date calculator](/date-calculator).'
				]
			},
			{
				heading: 'Weeks start on different days',
				paragraphs: [
					'Calendars do not agree on the first day of the week. In the US, Canada and some other countries, weeks often start on Sunday. ISO 8601, the international standard for dates, treats Monday as day 1 of the week.',
					'In several Middle East countries, the weekend is Friday and Saturday. Because of this, a “weekend” can mean different days depending on who you ask. For meetings across borders, the [time zone calculator](/time-zone-calculator) shows the local time.'
				]
			},
			{
				heading: 'ISO week numbers',
				paragraphs: [
					'ISO week numbers are common in business reporting and in software, because they follow one international rule. Week 1 is the week that holds the year’s first Thursday. Because of this rule, the first few days of January can belong to the last week of the previous year.',
					'For example, 1 January 2027 falls in week 53 of 2026. Use the ISO week when you need a week number that matches across countries and software. Sales reports, project plans and sprint boards often use it, so the numbers line up with everyone else’s.'
				]
			},
			{
				heading: 'Quarters and the day of the year',
				paragraphs: [
					'Quarters split the year into four parts of three months. Q1 is January to March, and Q4 is October to December. Many businesses and governments, however, use a different financial year.',
					'For example, India and the UK both use a financial year that starts on 1 April. In those places, the calendar Q1 is the second quarter of the financial year. The day-of-the-year figure counts from 1 January, so it doesn’t change with financial years. To count the days inside a period, the [day counter](/day-counter) is quicker.'
				]
			},
			{
				heading: 'Dates before the Gregorian calendar',
				paragraphs: [
					'This calculator uses the Gregorian calendar for every date, including very old ones. The Gregorian calendar began in 1582 in some Catholic countries. Many other countries adopted it later, and Britain did so in 1752.',
					'For dates before 15 October 1582, the weekday shown is a calculation, not the day that people used at the time. For historical research, check a dated source.'
				]
			}
		],
		formulas: [
			{
				title: 'Zeller’s congruence (Gregorian calendar)',
				expression: 'h = (q + ⌊13(m + 1) ÷ 5⌋ + K + ⌊K ÷ 4⌋ + ⌊J ÷ 4⌋ + 5J) mod 7',
				variables: [
					{ symbol: 'q', meaning: 'day of the month' },
					{ symbol: 'm', meaning: 'month, where January and February count as 13 and 14 of the previous year' },
					{ symbol: 'K', meaning: 'year within its century (year mod 100)' },
					{ symbol: 'J', meaning: 'century (⌊year ÷ 100⌋)' },
					{ symbol: 'h', meaning: 'result: 0 = Saturday, 1 = Sunday … 6 = Friday' }
				]
			},
			{
				title: 'Weekday name',
				expression: 'Weekday with Sunday = 0 is (h + 6) mod 7',
				variables: []
			},
			{
				title: 'Day of the year and quarter',
				expression: 'Day of year = days from 1 January to the date, + 1. Quarter = ⌊(month − 1) ÷ 3⌋ + 1.',
				variables: []
			},
			{
				title: 'ISO week number',
				expression: 'Week = ⌊(day of year of that week’s Thursday − 1) ÷ 7⌋ + 1',
				variables: []
			},
			{
				title: 'Leap year',
				expression: 'A year is a leap year if it divides by 4, except century years, which must also divide by 400.',
				variables: []
			}
		],
		example: {
			title: 'Weekday of 28 October 2026',
			steps: [
				'Month 10 needs no shift. The year is 2026, so K = 26 and J = 20.',
				'⌊13 × 11 ÷ 5⌋ = ⌊28.6⌋ = 28.',
				'Sum = 28 + 28 + 26 + ⌊26 ÷ 4⌋ (6) + ⌊20 ÷ 4⌋ (5) + 5 × 20 (100) = 193.',
				'193 mod 7 = 4, and h = 4 means Wednesday.',
				'Day of year: 273 days through September, plus 28 = day 301. The ISO week is 44 and the quarter is Q4. 2026 is not a leap year.'
			],
			result: 'Wednesday. Day 301 of 365, ISO week 44, Q4, not a leap year.'
		},
		faq: [
			{
				q: 'How does the calculator find the weekday?',
				a: 'It uses Zeller’s congruence, a formula published by Christian Zeller in the 1880s. It takes the day, month and year and returns a number from 0 to 6, which maps to a weekday.'
			},
			{
				q: 'What is an ISO week?',
				a: 'ISO 8601 weeks start on Monday. Week 1 is the week that contains the year’s first Thursday, so 1 January 2027 belongs to week 53 of 2026.'
			},
			{
				q: 'How do I tell if a year is a leap year?',
				a: 'A year is a leap year if it divides evenly by 4, except century years, which must divide by 400. So 2024 and 2000 are leap years, but 1900 is not.'
			},
			{
				q: 'What day of the week was a date in the past?',
				a: 'Enter the date and the calculator shows its weekday, using the Gregorian calendar rules. Each country switched to the Gregorian calendar at a different time, so for older dates the calendar people used then may give a different day.'
			},
			{
				q: 'What day will my birthday fall on next year?',
				a: 'Enter next year’s date with the same month and day. The weekday shown is the day your birthday will fall on that year.'
			}
		],
		sources: [{ title: 'ISO 8601 — Date and time format', url: 'https://www.iso.org/iso-8601-date-and-time-format.html' }]
	}
});
