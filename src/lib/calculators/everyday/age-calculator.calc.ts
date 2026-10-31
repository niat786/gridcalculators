import { defineCalculator, type CalculationResult } from '../types';
import { DASH, num, plural } from '../format';
import meta from './age-calculator.meta';

const DAY = 86_400_000;

/** Parse YYYY-MM-DD as a UTC date (no time-zone drift). */
export function parseISODate(s: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (!m) return null;
	const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
	return d.getUTCMonth() === +m[2] - 1 ? d : null;
}

function daysInMonth(y: number, m: number): number {
	return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/** Calendar difference: whole years, then months, then days (borrowing from the prior month). */
export function ageParts(from: Date, to: Date) {
	let y = to.getUTCFullYear() - from.getUTCFullYear();
	let m = to.getUTCMonth() - from.getUTCMonth();
	let d = to.getUTCDate() - from.getUTCDate();
	if (d < 0) {
		m -= 1;
		const pm = (to.getUTCMonth() + 11) % 12;
		const py = pm === 11 ? to.getUTCFullYear() - 1 : to.getUTCFullYear();
		d += daysInMonth(py, pm);
	}
	if (m < 0) {
		y -= 1;
		m += 12;
	}
	return { y, m, d };
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'dob', label: 'Date of birth', type: 'date', default: '1990-05-15' },
		{ id: 'on', label: 'Age on', type: 'date', default: 'today', help: 'Defaults to today' }
	],
	calculate(v): CalculationResult {
		const from = parseISODate(String(v.dob));
		const to = parseISODate(String(v.on));
		if (!from || !to) return { primaryResult: DASH, primaryLabel: 'Age', summary: 'Enter two valid dates.' };
		if (to < from) return { primaryResult: DASH, primaryLabel: 'Age', summary: 'The second date is before the date of birth.' };

		const { y, m, d } = ageParts(from, to);
		const days = Math.round((to.getTime() - from.getTime()) / DAY);

		// Next birthday (Feb 29 birthdays fall on Mar 1 in non-leap years)
		let next = new Date(Date.UTC(to.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
		if (next <= to) next = new Date(Date.UTC(to.getUTCFullYear() + 1, from.getUTCMonth(), from.getUTCDate()));
		const untilNext = Math.round((next.getTime() - to.getTime()) / DAY);

		return {
			primaryResult: plural(y, 'year'),
			primaryLabel: 'Age',
			summary: `${plural(y, 'year')}, ${plural(m, 'month')} and ${plural(d, 'day')}.`,
			secondaryMetrics: [
				{ label: 'In months', value: num(y * 12 + m, 0) },
				{ label: 'In weeks', value: num(Math.floor(days / 7), 0) },
				{ label: 'In days', value: num(days, 0) },
				{ label: 'Next birthday', value: untilNext === 0 ? 'Today' : `In ${plural(untilNext, 'day')}` }
			]
		};
	},
	content: {
		intro:
			'Find your exact age in years, months and days, or the time between any two dates. You’ll also see your age in months, weeks and days, and how long until your next birthday.',
		howTo: [
			'Enter your date of birth. Use the date picker, which shows the format your device uses.',
			'Leave “Age on” as today, or pick any other date to see the age on that day.',
			'Read your age in years, months and days.',
			'Scroll to the totals to see your age in months, weeks and days, and the countdown to your next birthday.'
		],
		about: [
			{
				heading: 'How age is counted',
				paragraphs: [
					'Most countries count age in completed years. You are one year old on your first birthday, and each birthday after that adds one more year. Official records, identity documents and legal ages such as the voting or driving age follow this rule.',
					'This calculator works the same way. It counts full years first, then the remaining months and days. For example, someone born on 15 May 1990 is 36 on 28 October 2026. Their next birthday is still 199 days away.'
				]
			},
			{
				heading: 'Other ways people count age',
				paragraphs: [
					'Some cultures and older traditions count age differently. In traditional Korean age, a baby is 1 at birth, and everyone gains a year on 1 January. This means a person can be one or two years older by this count than by the international method.',
					'South Korea changed its legal system in June 2023 and moved to the international method. Many people still use the older count in daily life, so if someone gives a different age, ask which method they mean.'
				]
			},
			{
				heading: 'Date formats around the world',
				paragraphs: [
					'The same date can mean different days. In the United States, 05/03/1990 means 3 May 1990. In the UK, India, Pakistan and most other countries, it means 5 March 1990.',
					'To avoid mistakes, use the date picker or type the year first, as in 1990-05-15. This calculator uses the year, month and day order, so the age you see is correct for the date you choose. If you need to compare clock times across countries, the [time zone calculator](/time-zone-calculator) helps.'
				]
			},
			{
				heading: 'Leap-day birthdays',
				paragraphs: [
					'Someone born on 29 February only has a real birthday in a leap year. This calculator treats 1 March as the next birthday in other years.',
					'Rules vary. Some people celebrate on 28 February, and some laws use 1 March. If you need the official date for a document, check with the office that issues it.'
				]
			},
			{
				heading: 'What the calculator counts',
				paragraphs: [
					'Only calendar dates are used. The time of birth, your time zone and the time of day are ignored. Counting in days runs from the birth date to the “Age on” date, so the birth day itself is day 0.',
					'You can use this tool for more than age. Enter any two dates to see how far apart they are, such as the length of a job, a relationship or a project. For longer spans, the [date calculator](/date-calculator) adds and subtracts months, and the [day counter](/day-counter) counts business days.'
				]
			}
		],
		formulas: [
			{
				title: 'Age in years, months and days',
				expression: 'Years = end year − birth year, minus 1 if the birthday has not come yet that year',
				variables: [{ symbol: 'end', meaning: 'the “Age on” date' }]
			},
			{
				title: 'Remaining months and days',
				expression: 'Months = end month − birth month, minus 1 if the day has not come yet. Days = end day − birth day.',
				variables: [{ symbol: '−1', meaning: 'when the day is earlier in the month, the calculator borrows the length of the previous month' }]
			},
			{
				title: 'Total days, weeks and months',
				expression: 'Days = end date − birth date. Weeks = ⌊days ÷ 7⌋. Total months = years × 12 + months.',
				variables: [{ symbol: '⌊ ⌋', meaning: 'round down to a whole number' }]
			}
		],
		example: {
			title: 'Born 15 May 1990, age on 28 October 2026',
			steps: [
				'Years: 2026 − 1990 = 36. The May birthday has passed, so no year is taken off.',
				'Months: October − May = 5.',
				'Days: 28 − 15 = 13.',
				'Total days: 13,315. Weeks: ⌊13,315 ÷ 7⌋ = 1,902.',
				'Next birthday: 15 May 2027 is 199 days away.'
			],
			result: 'Age: 36 years, 5 months and 13 days. That is 13,315 days, or 1,902 weeks.'
		},
		faq: [
			{
				q: 'How is age calculated?',
				a: 'Age is the number of full years since the date of birth. A year only counts once the birthday has passed in the current year. The calculator then adds the remaining months and days.'
			},
			{
				q: 'How many days old am I?',
				a: 'Use the “In days” figure. It counts every day from your birth date to the “Age on” date. On the day after your birth, you are 1 day old.'
			},
			{
				q: 'How are leap-year birthdays handled?',
				a: 'If you were born on 29 February, the next birthday in a non-leap year is counted as 1 March. Some laws and families use 28 February instead.'
			},
			{
				q: 'Can I find the age of someone on a past or future date?',
				a: 'Yes. Change “Age on” to any date. This is useful for school, sports or work eligibility, which often uses a fixed date such as 1 September or 31 December.'
			},
			{
				q: 'Does the time of birth change my age?',
				a: 'No. Age is counted in whole calendar dates, so the calculator ignores the time of day and your time zone.'
			},
			{
				q: 'Is my date of birth sent anywhere?',
				a: 'No. The calculation runs in your browser and nothing is sent to our servers. The dates are stored in the page address, so you can bookmark or share the result.'
			}
		],
		sources: [
			{
				title: 'Library of Congress — Koreans becoming younger: unification of age-counting systems',
				url: 'https://blogs.loc.gov/law/2023/01/koreans-becoming-younger-unification-of-age-counting-systems/'
			}
		]
	}
});
