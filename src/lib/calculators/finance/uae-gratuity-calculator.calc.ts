import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num } from '../format';
import meta from './uae-gratuity-calculator.meta';
import { parseISO, serviceYears, yearsLabel } from '../data/service-years';
import {
	AE_CAP_MONTHS,
	AE_DAYS_PER_YEAR_AFTER,
	AE_DAYS_PER_YEAR_FIRST,
	AE_FIRST_TIER_YEARS,
	AE_LAW_SOURCE,
	AE_LAW_YEAR_LABEL,
	AE_MIN_SERVICE_YEARS,
	AE_MONTH_DAYS,
	AE_PORTAL_SOURCE,
	AE_YEAR_DAYS,
	DIFC_DEWS_RATE_AFTER_5,
	DIFC_DEWS_RATE_FIRST_5,
	DIFC_DEWS_START,
	DIFC_SOURCE
} from '../data/ae-gratuity';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'where',
			label: 'Where you work',
			type: 'select',
			display: 'segmented',
			default: 'mainland',
			options: [
				{ label: 'Mainland', value: 'mainland' },
				{ label: 'DIFC', value: 'difc' }
			],
			help: 'DIFC employers pay into a savings scheme (DEWS) instead of gratuity.'
		},
		{
			id: 'basic',
			label: 'Last monthly basic wage',
			type: 'number',
			default: 8000,
			min: 0,
			max: 10_000_000,
			prefix: '$',
			help: 'Basic wage only. Housing, transport and other allowances are not included.',
			visibleWhen: (v) => String(v.where) !== 'difc'
		},
		{ id: 'start', label: 'First day of work', type: 'date', default: '2018-01-01', visibleWhen: (v) => String(v.where) !== 'difc' },
		{ id: 'end', label: 'Last day of work', type: 'date', default: 'today', visibleWhen: (v) => String(v.where) !== 'difc' },
		{
			id: 'unpaid',
			label: 'Unpaid absence days',
			type: 'number',
			default: 0,
			min: 0,
			max: 36_500,
			decimal: false,
			suffix: 'days',
			help: 'Days of leave without pay are not counted as service.',
			visibleWhen: (v) => String(v.where) !== 'difc'
		},
		{
			id: 'daily',
			label: 'Daily wage method',
			type: 'select',
			display: 'segmented',
			default: '30',
			options: [
				{ label: 'Monthly ÷ 30', value: '30' },
				{ label: 'Yearly ÷ 365', value: '365' }
			],
			help: 'The law does not fix a divisor. ÷ 30 is the usual practice.',
			visibleWhen: (v) => String(v.where) !== 'difc'
		}
	],
	calculate(v): CalculationResult {
		const label = 'End-of-service gratuity';
		if (String(v.where) === 'difc') {
			return {
				primaryResult: 'DEWS applies',
				primaryLabel: 'DIFC employees',
				summary: `Since ${DIFC_DEWS_START}, DIFC employers pay into a savings scheme (DEWS) instead of accruing gratuity: ${DIFC_DEWS_RATE_FIRST_5}% of monthly basic wage in the first 5 years and ${DIFC_DEWS_RATE_AFTER_5}% after. Gratuity earned before that date is a frozen amount, not calculated here.`,
				secondaryMetrics: [
					{ label: 'Gratuity', value: DASH },
					{ label: 'Contribution, first 5 years', value: `${DIFC_DEWS_RATE_FIRST_5}% of basic` },
					{ label: 'Contribution, after 5 years', value: `${DIFC_DEWS_RATE_AFTER_5}% of basic` },
					{ label: 'Scheme start', value: DIFC_DEWS_START },
					{ label: 'Daily wage', value: DASH }
				]
			};
		}

		const basic = Number(v.basic);
		const unpaid = Number(v.unpaid);
		const start = parseISO(String(v.start));
		const end = parseISO(String(v.end));
		if (!(basic > 0) || !Number.isFinite(basic) || !(unpaid >= 0) || !Number.isFinite(unpaid) || !start || !end) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a basic wage above zero, two valid dates and the unpaid days (0 if none).' };
		}
		const sy = serviceYears(start, end);
		if (!sy) return { primaryResult: DASH, primaryLabel: label, summary: 'The last day of work is before the first day.' };

		const years = Math.max(0, sy.years - unpaid / AE_YEAR_DAYS);
		const daily = String(v.daily) === '365' ? (basic * 12) / AE_YEAR_DAYS : basic / AE_MONTH_DAYS;
		const cap = basic * AE_CAP_MONTHS;
		const metrics = (gratDays: number, before: number, capped: boolean) => [
			{ label: 'Service counted', value: yearsLabel(years) },
			{ label: 'Gratuity days', value: num(gratDays, 2) },
			{ label: 'Daily basic wage', value: money(daily) },
			{ label: 'Before the cap', value: money(before) },
			{ label: 'Cap (24 months of basic)', value: capped ? `${money(cap)} (applied)` : `${money(cap)} (not reached)` }
		];

		if (years < AE_MIN_SERVICE_YEARS) {
			return {
				primaryResult: money(0),
				primaryLabel: label,
				summary: 'No gratuity is due under 1 year of continuous service (unpaid absence days do not count as service).',
				secondaryMetrics: metrics(0, 0, false)
			};
		}

		const first = Math.min(years, AE_FIRST_TIER_YEARS);
		const extra = Math.max(years - AE_FIRST_TIER_YEARS, 0);
		const days = first * AE_DAYS_PER_YEAR_FIRST + extra * AE_DAYS_PER_YEAR_AFTER;
		const before = days * daily;
		const capped = before > cap;
		const total = Math.min(before, cap);
		return {
			primaryResult: money(total),
			primaryLabel: label,
			summary: `${num(days, 2)} days of basic wage at ${money(daily)} a day${capped ? ', limited to 2 years of basic wage' : ''}. Resigning does not reduce it under the 2021 law.`,
			secondaryMetrics: metrics(days, before, capped)
		};
	},
	content: {
		intro: `Use this UAE gratuity calculator to estimate the end-of-service pay for a private-sector employee under ${AE_LAW_YEAR_LABEL}. The law gives ${AE_DAYS_PER_YEAR_FIRST} days of basic wage for each of the first ${AE_FIRST_TIER_YEARS} years and ${AE_DAYS_PER_YEAR_AFTER} days for each year after that.`,
		howTo: [
			'Choose Mainland. Pick DIFC only if you work in the Dubai International Financial Centre.',
			'Enter your last monthly basic wage, without housing, transport or other allowances.',
			'Enter your first and last day of work, and any days of unpaid leave.',
			'Pick how to work out the daily wage. Monthly ÷ 30 is the usual choice.',
			'Read the gratuity, the number of gratuity days and whether the cap applies.'
		],
		about: [
			{
				heading: 'What is end-of-service gratuity in the UAE?',
				paragraphs: [
					'Gratuity is a lump sum your employer pays when your job ends. It rewards your years of service. In the private sector, the rule is in Article 51 of the UAE labour law, ' + AE_LAW_YEAR_LABEL + '.',
					`You qualify if you are a full-time foreign worker with at least ${AE_MIN_SERVICE_YEARS} year of continuous service. With less than that, no gratuity is due. The portal u.ae says the gratuity is based on the basic wage.`
				]
			},
			{
				heading: 'How the gratuity is calculated',
				paragraphs: [
					`First, work out your gratuity days. You get ${AE_DAYS_PER_YEAR_FIRST} days of wage for each year of the first ${AE_FIRST_TIER_YEARS} years. Then you get ${AE_DAYS_PER_YEAR_AFTER} days for each year above that. Part years count pro rata.`,
					`Next, find your daily wage. The law does not give a divisor, so most employers use your monthly basic wage ÷ ${AE_MONTH_DAYS}. Some use basic wage × 12 ÷ ${AE_YEAR_DAYS}. Multiply the days by the daily wage to get the gratuity.`,
					`Finally, check the cap. The total cannot be more than the wage of 2 years. This calculator applies that as ${AE_CAP_MONTHS} months of basic wage.`
				]
			},
			{
				heading: 'Things that change the result',
				paragraphs: ['A few details can move your number up or down.'],
				list: [
					'**Basic wage only.** Allowances such as housing and transport are not part of the base.',
					'**Unpaid leave.** Days of absence without pay are not counted as service (Article 51).',
					`**Daily wage method.** Dividing by ${AE_MONTH_DAYS} gives a slightly higher daily wage than dividing the yearly wage by ${AE_YEAR_DAYS}. Your contract or MOHRE can settle a dispute.`,
					'**Resignation.** The 2021 law has no reduction for resigning. The old rule that cut the gratuity for early resignation no longer applies.',
					'**Last basic wage.** The calculation uses your last monthly basic wage, so a raise near the end helps.'
				]
			},
			{
				heading: 'DIFC, free zones and UAE nationals',
				paragraphs: [
					`This tool is for mainland private-sector employees. In the DIFC, employers have paid into a savings scheme (DEWS) since ${DIFC_DEWS_START}. The contribution is ${DIFC_DEWS_RATE_FIRST_5}% of monthly basic wage for the first ${AE_FIRST_TIER_YEARS} years and ${DIFC_DEWS_RATE_AFTER_5}% after that.`,
					'Other free zones can have their own rules, and UAE nationals are covered by pension schemes. Check with your employer or the free zone authority if this is you.'
				]
			},
			{
				heading: 'Tips for planning your final settlement',
				paragraphs: ['Gratuity is only one part of what you may receive when you leave.'],
				list: [
					'Ask your employer for a written breakdown of basic wage and allowances.',
					'Keep records of your start date and any unpaid leave.',
					'Remember that unused leave and notice pay are separate from gratuity.',
					'If you plan to move to another Gulf country, compare the rules with the [Saudi end-of-service calculator](/saudi-end-of-service-calculator) or the [Qatar end-of-service calculator](/qatar-end-of-service-calculator).',
					'If you start a company, see how the [UAE corporate tax calculator](/uae-corporate-tax-calculator) works for profits.'
				]
			}
		],
		formulas: [
			{
				title: 'Gratuity under Article 51',
				expression: `Gratuity = (${AE_DAYS_PER_YEAR_FIRST} × min(Y, ${AE_FIRST_TIER_YEARS}) + ${AE_DAYS_PER_YEAR_AFTER} × max(Y − ${AE_FIRST_TIER_YEARS}, 0)) × D, capped at ${AE_CAP_MONTHS} × B`,
				variables: [
					{ symbol: 'Y', meaning: `Years of service, with part years counted pro rata, after taking out unpaid absence days. At least ${AE_MIN_SERVICE_YEARS} year is needed.` },
					{ symbol: 'B', meaning: 'Last monthly basic wage.' },
					{ symbol: 'D', meaning: `Daily basic wage: B ÷ ${AE_MONTH_DAYS} (or B × 12 ÷ ${AE_YEAR_DAYS} if you pick that method).` }
				]
			}
		],
		example: {
			title: `${moneyIn('AED', 8000, true)} basic wage, 1 January 2018 to 31 December 2024`,
			steps: [
				`Service: exactly 7 years, so ${AE_FIRST_TIER_YEARS} years at ${AE_DAYS_PER_YEAR_FIRST} days and 2 years at ${AE_DAYS_PER_YEAR_AFTER} days.`,
				`Gratuity days: ${AE_DAYS_PER_YEAR_FIRST} × ${AE_FIRST_TIER_YEARS} + ${AE_DAYS_PER_YEAR_AFTER} × 2 = 165 days.`,
				`Daily wage: ${moneyIn('AED', 8000, true)} ÷ ${AE_MONTH_DAYS} = ${moneyIn('AED', 8000 / AE_MONTH_DAYS)}.`,
				`Gratuity: 165 × ${moneyIn('AED', 8000 / AE_MONTH_DAYS)} = ${moneyIn('AED', 44000)}. The cap (${AE_CAP_MONTHS} × ${moneyIn('AED', 8000, true)} = ${moneyIn('AED', 8000 * AE_CAP_MONTHS, true)}) is not reached.`
			],
			result: moneyIn('AED', 44000)
		},
		faq: [
			{
				q: 'How is gratuity calculated in the UAE?',
				a: `For a private-sector employee, gratuity is ${AE_DAYS_PER_YEAR_FIRST} days of basic wage for each of the first ${AE_FIRST_TIER_YEARS} years and ${AE_DAYS_PER_YEAR_AFTER} days for each year after that. It is capped at 2 years of wage. You need at least ${AE_MIN_SERVICE_YEARS} year of continuous service.`
			},
			{
				q: 'Does resigning reduce my gratuity?',
				a: 'No. Article 51 of the 2021 law has no reduction for resignation. Anyone with at least one year of continuous service gets the full amount. The one-third and two-thirds cuts belonged to the earlier law.'
			},
			{
				q: 'Which wage counts for gratuity?',
				a: 'Your last basic wage. Housing, transport and other allowances are not included. Days of unpaid absence are not counted as service. Part years count pro rata once you have completed one full year.'
			},
			{
				q: 'Why can I choose a daily wage method?',
				a: `Neither the law nor its Implementing Regulation fixes how to turn a monthly wage into a daily one. Dividing by ${AE_MONTH_DAYS} is the usual practice. Dividing the yearly wage by ${AE_YEAR_DAYS} gives a slightly lower daily wage.`
			},
			{
				q: 'Is there a maximum gratuity?',
				a: `Yes. The total cannot exceed the wage of 2 years. This calculator applies that as ${AE_CAP_MONTHS} months of basic wage and tells you if the cap was reached.`
			},
			{
				q: 'Does this work for DIFC employees?',
				a: `No. Since ${DIFC_DEWS_START}, DIFC employers pay into a workplace savings scheme (DEWS) instead of accruing gratuity. The tool shows the contribution rates but does not calculate your balance.`
			}
		],
		sources: [AE_LAW_SOURCE, AE_PORTAL_SOURCE, DIFC_SOURCE],
		disclaimer:
			'Estimate only, for full-time foreign employees in the private sector. UAE nationals are covered by pension schemes, and some free zones and employers use an alternative savings scheme. This is not legal advice; confirm with MOHRE or your employer.'
	}
});
