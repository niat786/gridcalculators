import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num } from '../format';
import meta from './bahrain-leaving-indemnity-calculator.meta';
import { parseISO, serviceYears, yearsLabel } from '../data/service-years';
import {
	BH_FIRST_TIER_YEARS,
	BH_LAW_LABEL,
	BH_MONTHS_PER_YEAR_AFTER,
	BH_MONTHS_PER_YEAR_FIRST,
	BH_SIO_LAST_EMPLOYER_DAY,
	BH_SIO_RATE_AFTER_PCT,
	BH_SIO_RATE_FIRST_PCT,
	BH_SIO_START_LABEL,
	BH_SOURCES
} from '../data/bh-leaving-indemnity';

/** Months of wage earned by `years` of service counted from the start of employment (Article 116). */
function monthsFor(years: number): number {
	return Math.min(years, BH_FIRST_TIER_YEARS) * BH_MONTHS_PER_YEAR_FIRST + Math.max(years - BH_FIRST_TIER_YEARS, 0) * BH_MONTHS_PER_YEAR_AFTER;
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'wage',
			label: 'Last monthly wage',
			type: 'number',
			default: 600,
			min: 0,
			max: 10_000_000,
			prefix: '$',
			help: 'Article 47: the most recent basic wage plus any social allowance. Other allowances are not included.'
		},
		{ id: 'start', label: 'First day of work', type: 'date', default: '2018-01-01' },
		{ id: 'end', label: 'Last day of work', type: 'date', default: 'today' }
	],
	calculate(v): CalculationResult {
		const label = 'Leaving indemnity';
		const wage = Number(v.wage);
		const start = parseISO(String(v.start));
		const end = parseISO(String(v.end));
		const lastEmployerDay = parseISO(BH_SIO_LAST_EMPLOYER_DAY);
		if (!(wage > 0) || !Number.isFinite(wage) || !start || !end || !lastEmployerDay) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a monthly wage above zero and two valid dates.' };
		}
		const sy = serviceYears(start, end);
		if (!sy) return { primaryResult: DASH, primaryLabel: label, summary: 'The last day of work is before the first day.' };

		const years = sy.years;
		const months = monthsFor(years);
		const total = months * wage;

		// Service before 1 March 2024 stays the employer's own liability; later service is funded through the SIO.
		const preEnd = end < lastEmployerDay ? end : lastEmployerDay;
		const preYears = start <= preEnd ? (serviceYears(start, preEnd)?.years ?? 0) : 0;
		const preMonths = monthsFor(preYears);
		const postMonths = Math.max(months - preMonths, 0);

		return {
			primaryResult: money(total),
			primaryLabel: label,
			summary: `${num(months, 3)} months of wage: half a month for each of the first 3 years and one month for each year after, with the part year pro rata. No reduction applies if you resign.`,
			secondaryMetrics: [
				{ label: 'Service counted', value: yearsLabel(years) },
				{ label: 'Months of wage', value: num(months, 3) },
				{ label: `Service before ${BH_SIO_START_LABEL} (employer pays)`, value: money(preMonths * wage) },
				{ label: `Service from ${BH_SIO_START_LABEL} (paid by the SIO)`, value: money(postMonths * wage) },
				{ label: 'Employer’s SIO contribution', value: `${num(BH_SIO_RATE_FIRST_PCT, 1)}% of wage, then ${num(BH_SIO_RATE_AFTER_PCT, 1)}% after 3 years` }
			]
		};
	},
	content: {
		intro: `Use this Bahrain leaving indemnity calculator to estimate the end-of-service pay for a private-sector worker who is not covered by the Social Insurance Law. It follows ${BH_LAW_LABEL}: half a month of wage for each of the first ${BH_FIRST_TIER_YEARS} years and one month for each year after.`,
		howTo: [
			'Enter your last monthly wage: basic wage plus any social allowance.',
			'Enter your first and last day of work. Part years are counted pro rata.',
			`Read the indemnity.`,
			`Check how much is the employer’s direct liability (service before ${BH_SIO_START_LABEL}) and how much the SIO pays.`
		],
		about: [
			{
				heading: 'What is the leaving indemnity in Bahrain?',
				paragraphs: [
					'The leaving indemnity is a payment due when a worker’s employment ends. It is set by Article 116 of the Labour Law for the Private Sector (Law No. 36 of 2012). It applies to workers who are not subject to the Social Insurance Law. In practice, that means expatriates.',
					'Article 116 pays the indemnity on termination of employment. It does not cut the amount if you resign. Teamed, HAQQ and gulfpaycheck all agree on this point.'
				]
			},
			{
				heading: 'How the indemnity is calculated',
				paragraphs: [
					`You get ${BH_MONTHS_PER_YEAR_FIRST} month of wage for each of the first ${BH_FIRST_TIER_YEARS} years. Then you get ${BH_MONTHS_PER_YEAR_AFTER} month of wage for each year after that. For a part year, the law pays in proportion to the time spent in service.`,
					'Article 116 sets no cap. The cap of 12 months that you may read about belongs to a different article, on compensation for unfair dismissal.'
				]
			},
			{
				heading: 'Which wage counts?',
				paragraphs: [
					'Article 47 fixes the base. It is the worker’s most recent basic wage plus any social allowance. For piece or commission pay, it uses the average of the last three months. Other allowances are not included.',
					'This calculator asks for one monthly wage. So if your pay is variable, work out the average first. Ask your employer or the SIO which wage they used, because a small difference in wage changes the result every month of service.'
				]
			},
			{
				heading: 'The SIO system since 2024',
				paragraphs: [
					`Under Prime Minister’s Decision No. 109 of 2023, employers pay a monthly contribution to the Social Insurance Organisation (SIO) for each non-Bahraini worker from ${BH_SIO_START_LABEL}. The rate is ${BH_SIO_RATE_FIRST_PCT}% of wage for the first ${BH_FIRST_TIER_YEARS} years of service with the employer and ${BH_SIO_RATE_AFTER_PCT}% after that. The worker then claims the indemnity from the SIO.`,
					`Service before ${BH_SIO_START_LABEL} stays the employer’s own liability. The SIO award uses the same formula but is limited to the contributions paid in. So the amount you actually receive from the SIO can differ from the statutory figure shown here.`
				]
			},
			{
				heading: 'Limits and related Gulf tools',
				paragraphs: [
					'Dismissal for gross misconduct under Article 107 can remove the indemnity. This tool does not model that case, or any contract that pays more.',
					'To compare other countries, see the [Oman end-of-service calculator](/oman-end-of-service-calculator), the [Kuwait indemnity calculator](/kuwait-indemnity-calculator) and the [Qatar end-of-service calculator](/qatar-end-of-service-calculator). For VAT, try the [GCC VAT calculator](/gcc-vat-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Leaving indemnity under Article 116',
				expression: `Indemnity = W × ( ${BH_MONTHS_PER_YEAR_FIRST} × min(Y, ${BH_FIRST_TIER_YEARS}) + ${BH_MONTHS_PER_YEAR_AFTER} × max(Y − ${BH_FIRST_TIER_YEARS}, 0) )`,
				variables: [
					{ symbol: 'W', meaning: 'Most recent monthly wage: basic wage plus any social allowance (Article 47).' },
					{ symbol: 'Y', meaning: 'Years of service, with the part year counted pro rata.' }
				]
			}
		],
		example: {
			title: `${moneyIn('BHD', 600, true)} wage, 1 January 2018 to 31 December 2025`,
			steps: [
				'Service: exactly 8 years.',
				`First ${BH_FIRST_TIER_YEARS} years at half a month: ${BH_FIRST_TIER_YEARS} × ${BH_MONTHS_PER_YEAR_FIRST} = 1.5 months. Next 5 years at one month: 5 months.`,
				`Total: 6.5 months × ${moneyIn('BHD', 600, true)} = ${moneyIn('BHD', 3900, true)}.`,
				`Service before ${BH_SIO_START_LABEL} is the employer’s liability. The rest is paid by the SIO from the employer’s contributions.`
			],
			result: moneyIn('BHD', 3900)
		},
		faq: [
			{
				q: 'How is the leaving indemnity calculated in Bahrain?',
				a: `Under Article 116, you get ${BH_MONTHS_PER_YEAR_FIRST} month of wage for each of the first ${BH_FIRST_TIER_YEARS} years and ${BH_MONTHS_PER_YEAR_AFTER} month for each year after, with part years pro rata.`
			},
			{
				q: 'What is the SIO system and since when?',
				a: `Since ${BH_SIO_START_LABEL}, employers pay a monthly contribution to the SIO for each non-Bahraini worker (${BH_SIO_RATE_FIRST_PCT}% of wage for the first ${BH_FIRST_TIER_YEARS} years, ${BH_SIO_RATE_AFTER_PCT}% after). The worker claims the indemnity from the SIO. Service before that date remains the employer’s direct liability.`
			},
			{
				q: 'Does resigning reduce the indemnity?',
				a: 'No. Article 116 pays the indemnity on termination of employment and has no resignation reduction. It is lost only if you are dismissed for one of the gross-misconduct reasons in Article 107.'
			},
			{
				q: 'Is there a cap, and which wage counts?',
				a: 'Article 116 sets no cap. The wage is your most recent basic wage plus any social allowance (Article 47). The SIO award is limited to the contributions paid in, so it can differ from this statutory figure.'
			}
		],
		sources: BH_SOURCES,
		disclaimer:
			'Estimate of the statutory entitlement under Article 116. It does not model dismissal for misconduct, the SIO cap on contributions paid or any contract that pays more. This is not legal advice; confirm with the Labour Market Regulatory Authority, the SIO or your employer.'
	}
});
