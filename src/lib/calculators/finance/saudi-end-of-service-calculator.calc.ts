import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num } from '../format';
import meta from './saudi-end-of-service-calculator.meta';
import { parseISO, serviceYears, yearsLabel } from '../data/service-years';
import {
	SA_FIRST_TIER_YEARS,
	SA_HRSD_SOURCE,
	SA_LAW_LABEL,
	SA_MONTHS_PER_YEAR_AFTER,
	SA_MONTHS_PER_YEAR_FIRST,
	SA_RESIGN_FRACTION_LOW,
	SA_RESIGN_FRACTION_MID,
	SA_RESIGN_MIN_YEARS,
	SA_RESIGN_THIRD_UP_TO,
	SA_RESIGN_TWO_THIRDS_BELOW,
	SA_SUMMARY_SOURCE
} from '../data/sa-end-of-service';

const REASONS: Record<string, string> = {
	employer: 'Employer ended the contract, or a fixed-term contract expired',
	resign: 'I resigned',
	force: 'I left because of force majeure',
	marriage: 'A woman left within 6 months of marriage or 3 months of childbirth',
	misconduct: 'Dismissed for misconduct under Article 80'
};

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'wage',
			label: 'Last monthly wage',
			type: 'number',
			default: 10000,
			min: 0,
			max: 10_000_000,
			prefix: '$',
			help: 'Basic wage plus allowances and other regular pay (housing, transport…), as the law defines wage.'
		},
		{ id: 'start', label: 'First day of work', type: 'date', default: '2017-01-01' },
		{ id: 'end', label: 'Last day of work', type: 'date', default: 'today' },
		{
			id: 'reason',
			label: 'Reason for leaving',
			type: 'select',
			display: 'menu',
			default: 'employer',
			options: Object.entries(REASONS).map(([value, label]) => ({ value, label }))
		}
	],
	calculate(v): CalculationResult {
		const label = 'End-of-service award';
		const wage = Number(v.wage);
		const start = parseISO(String(v.start));
		const end = parseISO(String(v.end));
		const reason = String(v.reason);
		if (!(wage > 0) || !Number.isFinite(wage) || !start || !end || !(reason in REASONS)) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a monthly wage above zero and two valid dates.' };
		}
		const sy = serviceYears(start, end);
		if (!sy) return { primaryResult: DASH, primaryLabel: label, summary: 'The last day of work is before the first day.' };

		const years = sy.years;
		const months =
			Math.min(years, SA_FIRST_TIER_YEARS) * SA_MONTHS_PER_YEAR_FIRST +
			Math.max(years - SA_FIRST_TIER_YEARS, 0) * SA_MONTHS_PER_YEAR_AFTER;
		const full = months * wage;

		let share = 1;
		let why = 'Full award (Article 84).';
		if (reason === 'resign') {
			if (years < SA_RESIGN_MIN_YEARS) {
				share = 0;
				why = 'Resigning with under 2 years of service gives no award (Article 85).';
			} else if (years <= SA_RESIGN_THIRD_UP_TO) {
				share = SA_RESIGN_FRACTION_LOW;
				why = 'Resigning after 2 to 5 years gives one third of the award (Article 85).';
			} else if (years < SA_RESIGN_TWO_THIRDS_BELOW) {
				share = SA_RESIGN_FRACTION_MID;
				why = 'Resigning after more than 5 and under 10 years gives two thirds of the award (Article 85).';
			} else {
				why = 'Resigning after 10 years or more gives the full award (Article 85).';
			}
		} else if (reason === 'force' || reason === 'marriage') {
			why = 'Full award despite leaving yourself (Article 87).';
		} else if (reason === 'misconduct') {
			share = 0;
			why = 'Dismissal for the misconduct grounds in Article 80 removes the award.';
		}

		const total = full * share;
		const shareText = share === 1 ? 'Full' : share === 0 ? 'None' : share === SA_RESIGN_FRACTION_LOW ? 'One third' : 'Two thirds';
		return {
			primaryResult: money(total),
			primaryLabel: label,
			summary: `${why} ${num(months, 2)} months of wage for ${yearsLabel(years)} of service.`,
			secondaryMetrics: [
				{ label: 'Service counted', value: yearsLabel(years) },
				{ label: 'Months of wage (full award)', value: num(months, 2) },
				{ label: 'Full award', value: money(full) },
				{ label: 'Share you receive', value: shareText },
				{ label: 'Wage used', value: money(wage) }
			]
		};
	},
	content: {
		intro: `Use this Saudi end-of-service calculator to estimate your award under the Saudi Labor Law. You get ${SA_MONTHS_PER_YEAR_FIRST} month of wage for each of the first ${SA_FIRST_TIER_YEARS} years and ${SA_MONTHS_PER_YEAR_AFTER} month for each year after that, less if you resign early.`,
		howTo: [
			'Enter your last monthly wage. Include housing, transport and other regular allowances.',
			'Enter your first and last day of work.',
			'Pick why you left. The reason can change how much of the award you get.',
			'Read the award, the months of wage and the share you receive.'
		],
		about: [
			{
				heading: 'What is the end-of-service award in Saudi Arabia?',
				paragraphs: [
					`The end-of-service award is a payment your employer owes when your contract ends. It comes from ${SA_LAW_LABEL}. Many people call it EOSB or gratuity.`,
					'The award is based on your last wage and your length of service. The Labor Law defines wage as your basic pay plus the other regular amounts due to you, such as allowances. Check your contract for what counts.'
				]
			},
			{
				heading: 'How the award is calculated',
				paragraphs: [
					`Under Article 84, you get ${SA_MONTHS_PER_YEAR_FIRST} month of wage for each of the first ${SA_FIRST_TIER_YEARS} years. After that, you get ${SA_MONTHS_PER_YEAR_AFTER} month of wage for each year. Part years are counted pro rata.`,
					'Multiply the total months by your last monthly wage. That gives the full award. If you resign, a share of it may apply, as the next section explains.'
				]
			},
			{
				heading: 'What happens if you resign?',
				paragraphs: ['Article 85 sets how much of the award you keep when you resign. The share depends on your years of service.'],
				table: {
					caption: 'Share of the award when you resign (Article 85)',
					columns: ['Years of service', 'Share of award'],
					rows: [
						[`Under ${SA_RESIGN_MIN_YEARS} years`, 'None'],
						[`${SA_RESIGN_MIN_YEARS} years up to ${SA_RESIGN_THIRD_UP_TO} years`, 'One third'],
						[`More than ${SA_RESIGN_THIRD_UP_TO} and under ${SA_RESIGN_TWO_THIRDS_BELOW} years`, 'Two thirds'],
						[`${SA_RESIGN_TWO_THIRDS_BELOW} years or more`, 'Full award']
					]
				}
			},
			{
				heading: 'When you get the full award, and when you get none',
				paragraphs: [
					'You get the full award if your employer ends the contract, or a fixed-term contract expires. You also get it in the cases in Article 87. These are leaving because of force majeure, or a woman ending her contract within 6 months of marriage or 3 months of childbirth.',
					'However, if you are dismissed for one of the misconduct grounds in Article 80, the award is removed. This tool shows that case as zero.',
					'Royal Decree M/46 changed the resignation procedure from 19 February 2025. Summaries of the changes do not list any change to Articles 84 to 88, so the award rules used here are unchanged.'
				]
			},
			{
				heading: 'Tips and related Gulf tools',
				paragraphs: ['Keep a few things in mind when you plan your exit.'],
				list: [
					'Keep your contract and payslips. They show what counts as wage.',
					'Remember that unused leave and notice pay are separate from this award.',
					'If you or your employer pay social insurance, see the [GOSI calculator](/gosi-calculator).',
					'Compare with the rules in the [UAE gratuity calculator](/uae-gratuity-calculator) or the [Kuwait indemnity calculator](/kuwait-indemnity-calculator).',
					'If you send money home, use the [currency converter](/currency-converter) to see mid-market rates.'
				]
			}
		],
		formulas: [
			{
				title: 'Article 84 award',
				expression: `Award = (${SA_MONTHS_PER_YEAR_FIRST} × min(Y, ${SA_FIRST_TIER_YEARS}) + ${SA_MONTHS_PER_YEAR_AFTER} × max(Y − ${SA_FIRST_TIER_YEARS}, 0)) × W × share`,
				variables: [
					{ symbol: 'Y', meaning: 'Years of service, part years counted pro rata.' },
					{ symbol: 'W', meaning: 'Last monthly wage (basic plus allowances and other due increases).' },
					{ symbol: 'share', meaning: `Resignation only (Article 85): 0 under ${SA_RESIGN_MIN_YEARS} years, 1/3 from ${SA_RESIGN_MIN_YEARS} to ${SA_RESIGN_THIRD_UP_TO} years, 2/3 over ${SA_RESIGN_THIRD_UP_TO} and under ${SA_RESIGN_TWO_THIRDS_BELOW} years, 1 from ${SA_RESIGN_TWO_THIRDS_BELOW} years. Otherwise 1.` }
				]
			}
		],
		example: {
			title: `${moneyIn('SAR', 10000, true)} wage, 1 January 2017 to 31 December 2024`,
			steps: [
				'Service: exactly 8 years.',
				`Months of wage: ${SA_MONTHS_PER_YEAR_FIRST} × ${SA_FIRST_TIER_YEARS} + ${SA_MONTHS_PER_YEAR_AFTER} × 3 = 5.5 months.`,
				`Full award: 5.5 × ${moneyIn('SAR', 10000, true)} = ${moneyIn('SAR', 55000)}.`,
				`If you resigned: 8 years is over ${SA_RESIGN_THIRD_UP_TO} and under ${SA_RESIGN_TWO_THIRDS_BELOW}, so two thirds: ${moneyIn('SAR', 36666.67)}.`
			],
			result: `${moneyIn('SAR', 55000)} (${moneyIn('SAR', 36666.67)} if you resigned)`
		},
		faq: [
			{
				q: 'How is the end-of-service award calculated in Saudi Arabia?',
				a: `Under Article 84, you get ${SA_MONTHS_PER_YEAR_FIRST} month of wage for each of the first ${SA_FIRST_TIER_YEARS} years and ${SA_MONTHS_PER_YEAR_AFTER} month for each year after that. Part years count pro rata. Resignation can reduce it under Article 85.`
			},
			{
				q: 'What counts as wage?',
				a: 'The Labor Law defines wage as the basic wage plus all other increases due to the worker, such as allowances. Your contract can exclude some variable pay such as commissions (Article 86). This tool uses the monthly amount you enter.'
			},
			{
				q: 'How much do I get if I resign?',
				a: `It depends on your service. You get nothing under ${SA_RESIGN_MIN_YEARS} years, one third from ${SA_RESIGN_MIN_YEARS} to ${SA_RESIGN_THIRD_UP_TO} years, two thirds above ${SA_RESIGN_THIRD_UP_TO} and under ${SA_RESIGN_TWO_THIRDS_BELOW} years, and the full award from ${SA_RESIGN_TWO_THIRDS_BELOW} years.`
			},
			{
				q: 'When do I get the full award even if I resign?',
				a: 'If you leave because of force majeure, or a woman ends her contract within 6 months of marriage or 3 months of giving birth (Article 87). An employer ending the contract or a fixed-term contract expiring also gives the full award.'
			},
			{
				q: 'Did the 2025 amendments change the award?',
				a: 'The amendments in force from 19 February 2025 changed how resignation works. Summaries of them do not list any change to Articles 84 to 88, so the award rules used here are unchanged. Check the latest text if your case is close to the dates.'
			}
		],
		sources: [SA_HRSD_SOURCE, SA_SUMMARY_SOURCE],
		disclaimer:
			'Estimate only for private-sector employees under the Saudi Labor Law. Probation, contract terms, and disputes can change the amount. This is not legal advice; confirm with HRSD or an adviser.'
	}
});
