import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num, plural } from '../format';
import meta from './redundancy-pay-calculator.meta';
import {
	NI_REDUNDANCY_SOURCE,
	REDUNDANCY_ACT_SOURCE,
	REDUNDANCY_AGE_HIGH,
	REDUNDANCY_AGE_LOW,
	REDUNDANCY_MAX_YEARS,
	REDUNDANCY_MIN_YEARS,
	REDUNDANCY_ORDER_SOURCE,
	REDUNDANCY_SOURCE,
	REDUNDANCY_WEEK_CAP_GB,
	REDUNDANCY_WEEK_CAP_NI
} from '../data/uk-tax-2026-27';

/** Content is written at build time, so format pounds explicitly. */
const gbp = (n: number) => moneyIn('GBP', n, true);
const gbp2 = (n: number) => moneyIn('GBP', n);
/** Most weeks of pay the law allows: 20 years at one and a half weeks. */
const MAX_WEEKS = REDUNDANCY_MAX_YEARS * 1.5;
/** Worked example: 9 years at 1 week plus 5 years at 1.5 weeks. */
const EX_WEEKS = 16.5;
const EX_WEEKLY = 600;
const EARN_ABOVE_CAP = 900;

function parseDate(s: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (!m) return null;
	const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
	return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? d : null;
}

/** Same day n years later; 29 February becomes 28 February in a non-leap year. */
function addYears(d: Date, n: number): Date {
	const y = d.getUTCFullYear() + n;
	const out = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate()));
	if (out.getUTCMonth() !== d.getUTCMonth()) return new Date(Date.UTC(y, d.getUTCMonth() + 1, 0));
	return out;
}

/** Whole years from `from` to `to` (to >= from). */
function wholeYears(from: Date, to: Date): number {
	let n = to.getUTCFullYear() - from.getUTCFullYear();
	if (addYears(from, n) > to) n--;
	return n;
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'region',
			label: 'Where you work',
			type: 'select',
			display: 'segmented',
			default: 'gb',
			options: [
				{ label: 'Great Britain', value: 'gb' },
				{ label: 'Northern Ireland', value: 'ni' }
			]
		},
		{ id: 'dob', label: 'Date of birth', type: 'date', default: '1980-03-15' },
		{ id: 'start', label: 'First day of continuous employment', type: 'date', default: '2012-09-01' },
		{ id: 'end', label: 'Last day of employment (relevant date)', type: 'date', default: '2026-09-30' },
		{
			id: 'weekly',
			label: 'Gross weekly pay',
			type: 'number',
			default: 600,
			min: 0,
			max: 100_000,
			step: 10,
			prefix: '$',
			help: 'Average over the 12 weeks before notice, including regular overtime and commission.'
		}
	],
	calculate(v): CalculationResult {
		const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Statutory redundancy pay', summary });
		const dob = parseDate(String(v.dob));
		const start = parseDate(String(v.start));
		const end = parseDate(String(v.end));
		const weekly = Number(v.weekly);
		if (!dob || !start || !end) return fail('Enter valid dates.');
		if (!(weekly >= 0) || !Number.isFinite(weekly)) return fail('Enter your weekly pay.');
		if (!(dob < start && start < end)) return fail('Dates must run in order: date of birth, start date, last day.');

		const cap = v.region === 'ni' ? REDUNDANCY_WEEK_CAP_NI : REDUNDANCY_WEEK_CAP_GB;
		const completed = wholeYears(start, end);
		const counted = Math.min(completed, REDUNDANCY_MAX_YEARS);
		const used = Math.min(weekly, cap);

		let young = 0;
		let middle = 0;
		let older = 0;
		for (let k = 1; k <= counted; k++) {
			const age = wholeYears(dob, addYears(end, -k)); // age at the start of that year of service
			if (age >= REDUNDANCY_AGE_HIGH) older++;
			else if (age >= REDUNDANCY_AGE_LOW) middle++;
			else young++;
		}
		const eligible = completed >= REDUNDANCY_MIN_YEARS;
		const weeks = eligible ? young * 0.5 + middle + older * 1.5 : 0;
		const total = weeks * used;

		const rows = [
			{ band: `Under ${REDUNDANCY_AGE_LOW}`, years: String(young), mult: '0.5 week', weeks: num(eligible ? young * 0.5 : 0, 1) },
			{ band: `${REDUNDANCY_AGE_LOW} to ${REDUNDANCY_AGE_HIGH - 1}`, years: String(middle), mult: '1 week', weeks: num(eligible ? middle : 0, 1) },
			{ band: `${REDUNDANCY_AGE_HIGH} and over`, years: String(older), mult: '1.5 weeks', weeks: num(eligible ? older * 1.5 : 0, 1) }
		];
		return {
			primaryResult: money(total),
			primaryLabel: 'Statutory redundancy pay',
			summary: eligible
				? `${plural(counted, 'year')} counted gives ${num(weeks, 1)} weeks' pay at ${money(used)} a week.`
				: `Statutory redundancy pay needs at least ${REDUNDANCY_MIN_YEARS} years' continuous service; you have ${plural(completed, 'full year')}.`,
			secondaryMetrics: [
				{ label: 'Full years of service', value: String(completed) },
				{ label: 'Years counted (max 20)', value: String(counted) },
				{ label: "Weeks' pay entitlement", value: num(weeks, 1) },
				{ label: 'Weekly pay used', value: money(used) },
				{ label: 'Weekly pay cap', value: money(cap) },
				{ label: 'Maximum possible payment', value: money(cap * 30) }
			],
			table: {
				title: 'Years of service by age band',
				columns: [
					{ key: 'band', label: 'Age during the year' },
					{ key: 'years', label: 'Years', align: 'end' },
					{ key: 'mult', label: 'Per year', align: 'end' },
					{ key: 'weeks', label: "Weeks' pay", align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro: `Calculate statutory redundancy pay in the UK from your age, length of service and weekly pay. It uses the weekly pay caps in force from 6 April 2026 and works for Great Britain and Northern Ireland.`,
		howTo: [
			'Choose Great Britain or Northern Ireland, because they have different weekly pay caps.',
			'Enter your date of birth, your first day of continuous employment and your last day of employment.',
			'Enter your gross weekly pay, including regular overtime and commission.',
			'Read your total, the weeks of pay counted by age band, and the maximum possible payment.'
		],
		about: [
			{
				heading: 'What is statutory redundancy pay?',
				paragraphs: [
					`Statutory redundancy pay is the legal minimum an employer must pay when an employee loses their job because the role is no longer needed. You need at least ${REDUNDANCY_MIN_YEARS} years of continuous service to qualify.`,
					'Your contract or a company policy may promise more. Many employers pay extra, so check your paperwork before you rely on the statutory figure. Notice pay and unused holiday pay are separate from redundancy pay.'
				]
			},
			{
				heading: 'How redundancy pay is calculated',
				paragraphs: [
					`The law gives you a number of weeks of pay for each full year of service. The number depends on your age during that year. Only your last ${REDUNDANCY_MAX_YEARS} years count, and your weekly pay is capped.`,
					'The calculator counts back from your last day. It finds your age at the start of each year of service and applies the matching rate. A year in which you turn 41, for example, is counted at the lower rate.'
				],
				table: {
					caption: 'Weeks of pay for each full year of service',
					columns: ['Your age during the year', 'Weeks of pay'],
					rows: [
						[`Under ${REDUNDANCY_AGE_LOW}`, 'Half a week'],
						[`${REDUNDANCY_AGE_LOW} to ${REDUNDANCY_AGE_HIGH - 1}`, 'One week'],
						[`${REDUNDANCY_AGE_HIGH} or older`, 'One and a half weeks']
					]
				}
			},
			{
				heading: 'Great Britain and Northern Ireland: the weekly pay cap',
				paragraphs: [
					`Weekly pay above the cap is ignored. From 6 April 2026 the cap is ${gbp(REDUNDANCY_WEEK_CAP_GB)} in Great Britain (England, Scotland and Wales) and ${gbp(REDUNDANCY_WEEK_CAP_NI)} in Northern Ireland. The most anyone can receive is therefore ${gbp(REDUNDANCY_WEEK_CAP_GB * MAX_WEEKS)} in Great Britain and ${gbp(REDUNDANCY_WEEK_CAP_NI * MAX_WEEKS)} in Northern Ireland.`,
					`For example, take ${EX_WEEKS} weeks of entitlement and weekly pay of ${gbp(EARN_ABOVE_CAP)}. That gives ${gbp2(EX_WEEKS * REDUNDANCY_WEEK_CAP_GB)} in Great Britain and ${gbp2(EX_WEEKS * REDUNDANCY_WEEK_CAP_NI)} in Northern Ireland, because the cap replaces the higher pay.`
				]
			},
			{
				heading: 'Tax, notice and what happens next',
				paragraphs: [
					'Statutory redundancy pay is usually tax-free up to a limit, but other termination payments can be taxed. This calculator shows the gross statutory amount only. To see how other pay is taxed, try the [UK take-home pay calculator](/uk-take-home-pay-calculator).',
					'If you have a student loan, check how the loan is repaid while your income changes with the [UK student loan calculator](/uk-student-loan-calculator). Other statutory payments have their own tools, such as the [statutory sick pay calculator](/statutory-sick-pay-calculator).',
					'Advice from Acas, a trade union or a Citizens Advice adviser is free in most cases. It is worth asking if you think your employer has not paid the right amount.'
				]
			}
		],
		formulas: [
			{
				title: 'Statutory redundancy pay',
				expression: `Pay = (0.5 × years under ${REDUNDANCY_AGE_LOW} + 1 × years at ${REDUNDANCY_AGE_LOW}–${REDUNDANCY_AGE_HIGH - 1} + 1.5 × years at ${REDUNDANCY_AGE_HIGH}+) × min(weekly pay, cap)`,
				variables: [
					{ symbol: 'Years', meaning: `full years of service counted back from the last day, at most ${REDUNDANCY_MAX_YEARS}` },
					{ symbol: 'cap', meaning: `${gbp(REDUNDANCY_WEEK_CAP_GB)} a week in Great Britain, ${gbp(REDUNDANCY_WEEK_CAP_NI)} in Northern Ireland (from 6 April 2026)` }
				]
			}
		],
		example: {
			title: `Born 15 March 1980, employed 1 Sept 2012 to 30 Sept 2026, ${gbp(EX_WEEKLY)} a week, Great Britain`,
			steps: [
				'Full years of service: 14',
				`Counting back, 5 years were started aged ${REDUNDANCY_AGE_HIGH} or over: 5 × 1.5 = 7.5 weeks`,
				`The other 9 years were started aged ${REDUNDANCY_AGE_LOW} to ${REDUNDANCY_AGE_HIGH - 1}: 9 × 1 = 9 weeks`,
				`Total ${EX_WEEKS} weeks × ${gbp(EX_WEEKLY)} (below the ${gbp(REDUNDANCY_WEEK_CAP_GB)} cap) = ${gbp2(EX_WEEKS * EX_WEEKLY)}`
			],
			result: `Statutory redundancy pay of ${gbp2(EX_WEEKS * EX_WEEKLY)}.`
		},
		faq: [
			{
				q: 'How is statutory redundancy pay calculated?',
				a: `You get half a week, one week or one and a half weeks of pay for each full year of service, depending on your age in that year. The total is multiplied by your weekly pay, up to the cap. Only ${REDUNDANCY_MAX_YEARS} years count.`
			},
			{
				q: 'Who can claim statutory redundancy pay?',
				a: `Employees with at least ${REDUNDANCY_MIN_YEARS} years of continuous service who are dismissed for redundancy, laid off or put on short-time working. Employers can pay more than the statutory amount.`
			},
			{
				q: 'How is the age of each year decided?',
				a: 'The law counts back from your last day and gives each year of service the rate for your age during that year. This calculator uses your age at the start of each year of service, so a year in which you turn 41 counts at one week.'
			},
			{
				q: 'What is the maximum statutory redundancy payment?',
				a: `It is ${gbp(REDUNDANCY_WEEK_CAP_GB * MAX_WEEKS)} in Great Britain and ${gbp(REDUNDANCY_WEEK_CAP_NI * MAX_WEEKS)} in Northern Ireland. That comes from the weekly pay cap multiplied by the most weeks the law allows, which is ${MAX_WEEKS}.`
			},
			{
				q: 'Is redundancy pay taxed?',
				a: 'Statutory redundancy pay is usually tax-free up to a limit, but notice pay and some contractual payments can be taxable. This calculator shows the gross statutory amount only, so check the tax position with HMRC or an adviser.'
			}
		],
		sources: [REDUNDANCY_SOURCE, REDUNDANCY_ORDER_SOURCE, REDUNDANCY_ACT_SOURCE, NI_REDUNDANCY_SOURCE],
		disclaimer: 'Estimate of the statutory minimum. Your contract, notice pay and tax position may differ. Seek advice from Acas or an adviser.'
	}
});
