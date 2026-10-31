import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num } from '../format';
import meta from './oman-end-of-service-calculator.meta';
import { parseISO, serviceYears, yearsLabel } from '../data/service-years';
import {
	OM_LAW_EFFECTIVE_LABEL,
	OM_LAW_LABEL,
	OM_MONTHS_PER_YEAR_FULL,
	OM_OLD_FIRST_TIER_YEARS,
	OM_OLD_MONTHS_PER_YEAR_FIRST,
	OM_OLD_PERIOD_LAST_DAY,
	OM_SAVINGS_LATEST_START,
	OM_SAVINGS_RATE_PCT,
	OM_SOURCES
} from '../data/om-end-of-service';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'basic',
			label: 'Last monthly basic wage',
			type: 'number',
			default: 500,
			min: 0,
			max: 10_000_000,
			prefix: '$',
			help: 'Basic wage only. Allowances are not included.'
		},
		{ id: 'start', label: 'First day of work', type: 'date', default: '2021-08-01' },
		{ id: 'end', label: 'Last day of work', type: 'date', default: 'today' }
	],
	calculate(v): CalculationResult {
		const label = 'End-of-service gratuity';
		const basic = Number(v.basic);
		const start = parseISO(String(v.start));
		const end = parseISO(String(v.end));
		const lastOld = parseISO(OM_OLD_PERIOD_LAST_DAY);
		if (!(basic > 0) || !Number.isFinite(basic) || !start || !end || !lastOld) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a basic wage above zero and two valid dates.' };
		}
		const sy = serviceYears(start, end);
		if (!sy) return { primaryResult: DASH, primaryLabel: label, summary: 'The last day of work is before the first day.' };

		const years = sy.years;
		// Service up to and including 31 July 2023 is paid under the old law; the rest under Article 61.
		const oldEnd = end < lastOld ? end : lastOld;
		const oldYears = start <= oldEnd ? (serviceYears(start, oldEnd)?.years ?? 0) : 0;
		const newYears = Math.max(years - oldYears, 0);
		const oldMonths = Math.min(oldYears, OM_OLD_FIRST_TIER_YEARS) * OM_OLD_MONTHS_PER_YEAR_FIRST + Math.max(oldYears - OM_OLD_FIRST_TIER_YEARS, 0) * OM_MONTHS_PER_YEAR_FULL;
		const newMonths = newYears * OM_MONTHS_PER_YEAR_FULL;
		const totalMonths = oldMonths + newMonths;
		const total = totalMonths * basic;

		return {
			primaryResult: money(total),
			primaryLabel: label,
			summary: `${num(totalMonths, 3)} months of basic wage: ${num(oldMonths, 3)} for service up to ${OM_LAW_EFFECTIVE_LABEL} (old rates) and ${num(newMonths, 3)} after it (one basic wage a year). Your contract may pay more.`,
			secondaryMetrics: [
				{ label: 'Service counted', value: yearsLabel(years) },
				{ label: `Service up to ${OM_LAW_EFFECTIVE_LABEL}`, value: yearsLabel(oldYears) },
				{ label: 'Gratuity for service before', value: money(oldMonths * basic) },
				{ label: `Service after ${OM_LAW_EFFECTIVE_LABEL}`, value: yearsLabel(newYears) },
				{ label: 'Gratuity for service after', value: money(newMonths * basic) }
			]
		};
	},
	content: {
		intro: `Use this Oman end-of-service calculator to estimate the gratuity for a non-Omani private-sector worker under ${OM_LAW_LABEL}. The law pays at least one basic wage for every year of service. Service before ${OM_LAW_EFFECTIVE_LABEL} is paid at the older, lower rate.`,
		howTo: [
			'Enter your last monthly basic wage, without allowances.',
			'Enter your first and last day of work. Part years are counted pro rata.',
			`Read the gratuity and how much of it comes from service before and after ${OM_LAW_EFFECTIVE_LABEL}.`
		],
		about: [
			{
				heading: 'What is end-of-service gratuity in Oman?',
				paragraphs: [
					'Gratuity is a payment your employer makes when your job ends. In Oman, Article 61 of the Labour Law (Royal Decree 53/2023) sets it for workers who do not benefit from the Social Protection Law. In practice, this means non-Omani workers.',
					`The law says the gratuity must be not less than the basic wage for each year of service. Part years are paid pro rata. It uses the final basic wage as the base. Your contract may pay more.`
				]
			},
			{
				heading: 'How the gratuity is calculated',
				paragraphs: [
					`Service from ${OM_LAW_EFFECTIVE_LABEL} onward earns ${OM_MONTHS_PER_YEAR_FULL} month of basic wage for each year. Service before that date is paid under the old 2003 law. That law gave ${OM_OLD_MONTHS_PER_YEAR_FIRST} month (15 days) a year for the first ${OM_OLD_FIRST_TIER_YEARS} years, then ${OM_MONTHS_PER_YEAR_FULL} month a year after that.`,
					`The Ministry of Labour explained this split in a clarification reported by Oman Observer. The calculator treats ${OM_OLD_PERIOD_LAST_DAY.split('-').reverse().join('/')} as the last day of the old-law period, which can differ by a day from other readings.`
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The result shows two parts. The first is the gratuity for service up to the law’s start date. The second is the gratuity for service after it.',
					'If you started after that date, all of your service is paid at one basic wage a year. If you started well before, you get a blend of both rates.'
				]
			},
			{
				heading: 'The new savings scheme for expatriates',
				paragraphs: [
					`The Social Protection Law will replace gratuity for non-Omanis with an employer-funded savings system. The employer will pay ${OM_SAVINGS_RATE_PCT}% of monthly basic wage. The start date is set by the Social Protection Fund. Royal Decree 60/2025 moved the latest start to ${OM_SAVINGS_LATEST_START}.`,
					'As of October 2026, a Gulf employment guide (Teamed) reports that no start date has been set. So the gratuity in this tool still applies. Gratuity earned before the start is still owed.'
				]
			},
			{
				heading: 'Dismissal and related Gulf tools',
				paragraphs: [
					'Article 61 has no cut for resigning and no minimum service. However, dismissal without notice for one of the nine serious reasons in Article 40 can remove the gratuity. This tool does not model that.',
					'To compare other Gulf countries, see the [Qatar end-of-service calculator](/qatar-end-of-service-calculator), the [Kuwait indemnity calculator](/kuwait-indemnity-calculator) and the [Bahrain leaving indemnity calculator](/bahrain-leaving-indemnity-calculator). The [GCC VAT calculator](/gcc-vat-calculator) shows Oman’s VAT rate.'
				]
			}
		],
		formulas: [
			{
				title: 'Gratuity under Article 61, with the transition rule',
				expression: `Gratuity = B × ( ${OM_OLD_MONTHS_PER_YEAR_FIRST} × min(P, ${OM_OLD_FIRST_TIER_YEARS}) + ${OM_MONTHS_PER_YEAR_FULL} × max(P − ${OM_OLD_FIRST_TIER_YEARS}, 0) + N )`,
				variables: [
					{ symbol: 'B', meaning: 'Last monthly basic wage.' },
					{ symbol: 'P', meaning: `Years of service up to and including ${OM_LAW_EFFECTIVE_LABEL} (old law: half a month a year for the first ${OM_OLD_FIRST_TIER_YEARS} years, then one month).` },
					{ symbol: 'N', meaning: `Years of service after ${OM_LAW_EFFECTIVE_LABEL}: one basic wage per year (Article 61).` }
				]
			}
		],
		example: {
			title: `${moneyIn('OMR', 500, true)} basic wage, 1 August 2021 to 31 July 2025 (the Ministry of Labour’s own example)`,
			steps: [
				`Service: exactly 4 years. Two of them (1 Aug 2021 to 31 Jul 2023) fall under the old rate.`,
				`Old-rate years: 2 × half a basic wage = 2 × ${moneyIn('OMR', 250, true)} = ${moneyIn('OMR', 500, true)}.`,
				`New-rate years: 2 × one basic wage = 2 × ${moneyIn('OMR', 500, true)} = ${moneyIn('OMR', 1000, true)}.`,
				`Gratuity: 500 + 1,000 = ${moneyIn('OMR', 1500, true)}.`
			],
			result: moneyIn('OMR', 1500)
		},
		faq: [
			{
				q: 'How is end-of-service gratuity calculated in Oman?',
				a: `Under Article 61, it is at least one basic wage for each year of service, using the final basic wage. Service before ${OM_LAW_EFFECTIVE_LABEL} is paid at the older rate. Part years are pro rata.`
			},
			{
				q: 'Has the savings scheme for expatriates replaced gratuity yet?',
				a: `Not as far as we know. The Social Protection Law replaces gratuity with an employer-funded savings system (${OM_SAVINGS_RATE_PCT}% of monthly basic wage) once the Social Protection Fund sets a start date, no later than ${OM_SAVINGS_LATEST_START}. Until then, Article 61 applies.`
			},
			{
				q: 'What changed in 2023?',
				a: `The old law paid ${OM_OLD_MONTHS_PER_YEAR_FIRST} month of basic wage for each of the first ${OM_OLD_FIRST_TIER_YEARS} years and one month for each year after. The new law, in force from ${OM_LAW_EFFECTIVE_LABEL}, pays at least one basic wage for every year. Service before that date keeps the old rate.`
			},
			{
				q: 'Does resigning or short service affect it?',
				a: 'Article 61 has no resignation cut and no minimum service period. Part years are paid pro rata. Gratuity can be withheld only where you are dismissed without notice for one of the nine serious reasons in Article 40.'
			},
			{
				q: 'Does this apply to Omani nationals?',
				a: 'No. This tool is for non-Omani workers who are not covered by the Social Protection Law. Omani nationals are covered by the social protection system instead.'
			}
		],
		sources: OM_SOURCES,
		disclaimer:
			'Estimate of the statutory minimum for non-Omani workers who are not covered by the Social Protection Law. Your contract may pay more. This is not legal advice; confirm with the Ministry of Labour or your employer.'
	}
});
