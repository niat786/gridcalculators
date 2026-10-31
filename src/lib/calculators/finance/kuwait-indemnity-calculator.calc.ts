import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num } from '../format';
import meta from './kuwait-indemnity-calculator.meta';
import { parseISO, serviceYears, yearsLabel } from '../data/service-years';
import {
	KW_CAP_MONTHS,
	KW_DAILY_DIVISOR_CALENDAR,
	KW_DAILY_DIVISOR_WORKING,
	KW_DAYS_PER_YEAR_FIRST,
	KW_FIRST_TIER_YEARS,
	KW_LAW_LABEL,
	KW_MONTHS_PER_YEAR_AFTER,
	KW_RESIGN_FRACTION_HALF,
	KW_RESIGN_FRACTION_TWO_THIRDS,
	KW_RESIGN_HALF_UNTIL,
	KW_RESIGN_MIN_YEARS,
	KW_RESIGN_TWO_THIRDS_UNTIL,
	KW_SOURCES
} from '../data/kw-indemnity';

/** Article 53 fraction of the indemnity paid on resignation, by years of service. */
function resignFraction(years: number): { fraction: number; text: string } {
	if (years < KW_RESIGN_MIN_YEARS) return { fraction: 0, text: 'none (under 3 years)' };
	if (years < KW_RESIGN_HALF_UNTIL) return { fraction: KW_RESIGN_FRACTION_HALF, text: 'one half (3 to under 5 years)' };
	if (years < KW_RESIGN_TWO_THIRDS_UNTIL) return { fraction: KW_RESIGN_FRACTION_TWO_THIRDS, text: 'two thirds (5 to under 10 years)' };
	return { fraction: 1, text: 'in full (10 years or more)' };
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
			help: 'Article 55 counts basic pay plus allowances and regular cash benefits, not the social and children’s allowances.'
		},
		{ id: 'start', label: 'First day of work', type: 'date', default: '2018-01-01' },
		{ id: 'end', label: 'Last day of work', type: 'date', default: 'today' },
		{
			id: 'reason',
			label: 'How the job ends',
			type: 'select',
			display: 'segmented',
			default: 'employer',
			options: [
				{ label: 'Employer ends it', value: 'employer' },
				{ label: 'I resign', value: 'resign' }
			],
			help: 'Resigning from an open-ended contract reduces the indemnity under Article 53. Cases where the full amount is due anyway (Articles 48 and 52) count as “Employer ends it”.'
		},
		{
			id: 'divisor',
			label: 'Daily wage method',
			type: 'select',
			display: 'segmented',
			default: '26',
			options: [
				{ label: 'Monthly ÷ 26', value: '26' },
				{ label: 'Monthly ÷ 30', value: '30' }
			],
			help: 'Article 67 divides by actual working days (about 26). Some employers use 30, which makes 15 days exactly half a month.'
		}
	],
	calculate(v): CalculationResult {
		const label = 'End-of-service indemnity';
		const wage = Number(v.wage);
		const start = parseISO(String(v.start));
		const end = parseISO(String(v.end));
		if (!(wage > 0) || !Number.isFinite(wage) || !start || !end) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a monthly wage above zero and two valid dates.' };
		}
		const sy = serviceYears(start, end);
		if (!sy) return { primaryResult: DASH, primaryLabel: label, summary: 'The last day of work is before the first day.' };

		const years = sy.years;
		const divisor = String(v.divisor) === '30' ? KW_DAILY_DIVISOR_CALENDAR : KW_DAILY_DIVISOR_WORKING;
		const daily = wage / divisor;
		const first = Math.min(years, KW_FIRST_TIER_YEARS);
		const extra = Math.max(years - KW_FIRST_TIER_YEARS, 0);
		const before = first * KW_DAYS_PER_YEAR_FIRST * daily + extra * KW_MONTHS_PER_YEAR_AFTER * wage;
		const cap = wage * KW_CAP_MONTHS;
		const capped = before > cap;
		const full = Math.min(before, cap);

		const resigning = String(v.reason) === 'resign';
		const rf = resigning ? resignFraction(years) : { fraction: 1, text: 'in full' };
		const total = full * rf.fraction;

		const metrics = [
			{ label: 'Service counted', value: yearsLabel(years) },
			{ label: 'Daily wage', value: money(daily) },
			{ label: 'Full indemnity', value: capped ? `${money(full)} (capped at 18 months)` : money(full) },
			{ label: 'Resignation share (Article 53)', value: resigning ? rf.text : 'not applied' },
			{ label: 'Cap (18 months of wage)', value: capped ? `${money(cap)} (applied)` : `${money(cap)} (not reached)` }
		];
		return {
			primaryResult: money(total),
			primaryLabel: label,
			summary: resigning
				? `Full indemnity ${money(full)}; resigning after ${yearsLabel(years)} pays ${rf.text}.`
				: `${num(first * KW_DAYS_PER_YEAR_FIRST, 2)} days of wage for the first ${num(first, 2)} years${extra > 0 ? ` plus ${num(extra, 2)} months for the later years` : ''}${capped ? ', limited to 18 months of wage' : ''}.`,
			secondaryMetrics: metrics
		};
	},
	content: {
		intro: `Use this Kuwait indemnity calculator to estimate the end-of-service pay for a monthly-paid private-sector worker. It follows ${KW_LAW_LABEL}. You get ${KW_DAYS_PER_YEAR_FIRST} days of wage for each of the first ${KW_FIRST_TIER_YEARS} years and ${KW_MONTHS_PER_YEAR_AFTER} month for each year after. The total is capped at ${KW_CAP_MONTHS} months of wage, and resigning can reduce it.`,
		howTo: [
			'Enter your last monthly wage, including allowances and regular cash benefits.',
			'Enter your first and last day of work.',
			`Choose whether your employer ends the job or you resign. Resignation cuts the indemnity if you served under ${KW_RESIGN_TWO_THIRDS_UNTIL} years.`,
			'Pick the daily wage method, then read the indemnity and the working underneath.'
		],
		about: [
			{
				heading: 'What is the end-of-service indemnity in Kuwait?',
				paragraphs: [
					'The indemnity is a payment your employer owes when your job ends. In Kuwait it is set by the Private Sector Labour Law No. 6 of 2010. Many people also call it end-of-service benefits.',
					'This tool is for workers paid by the month in the private sector. Workers paid by the day, week, hour or piece, fixed-term contracts, government and oil-sector staff and domestic workers have different rules. They are not modelled here.'
				]
			},
			{
				heading: 'How the indemnity is calculated',
				paragraphs: [
					`Under Article 51, you get ${KW_DAYS_PER_YEAR_FIRST} days of wage for each of the first ${KW_FIRST_TIER_YEARS} years. After that, you get ${KW_MONTHS_PER_YEAR_AFTER} month of wage for each year. Part years are counted pro rata. The total cannot be more than ${KW_CAP_MONTHS} months of wage, which is one and a half years.`,
					`To find a day’s wage, Article 67 divides the wage by actual working days, which is about ${KW_DAILY_DIVISOR_WORKING} a month. Some employers divide by ${KW_DAILY_DIVISOR_CALENDAR} instead. That makes the first ${KW_FIRST_TIER_YEARS} years a little lower. You can choose either method.`
				]
			},
			{
				heading: 'What happens if you resign?',
				paragraphs: ['If you resign from an open-ended contract, Article 53 reduces the indemnity. The share depends on your years of service. The 2017 and 2018 amendments only stopped employers from deducting their social-security contributions, so they did not change this.'],
				table: {
					caption: 'Share of the indemnity when you resign (Article 53)',
					columns: ['Years of service', 'Share of indemnity'],
					rows: [
						[`Under ${KW_RESIGN_MIN_YEARS} years`, 'Nothing'],
						[`${KW_RESIGN_MIN_YEARS} to under ${KW_RESIGN_HALF_UNTIL} years`, 'One half'],
						[`${KW_RESIGN_HALF_UNTIL} to under ${KW_RESIGN_TWO_THIRDS_UNTIL} years`, 'Two thirds'],
						[`${KW_RESIGN_TWO_THIRDS_UNTIL} years or more`, 'Full indemnity']
					]
				}
			},
			{
				heading: 'Which wage counts?',
				paragraphs: [
					'Article 55 reads wage as basic pay plus the allowances and regular cash benefits set by your contract or your employer’s rules. The social and children’s allowances are left out. Many employers use basic pay alone, though the law reads as total pay.',
					'If your employer’s figure is lower than this tool shows, ask which wage it used. Cases where the full amount is due even when you leave (Articles 48 and 52) count as “Employer ends it” here.'
				]
			},
			{
				heading: 'Tips and related Gulf tools',
				paragraphs: ['A little preparation helps when your job ends.'],
				list: [
					'Keep your contract, payslips and start date.',
					'Ask your employer to show how it worked out the wage and the daily divisor.',
					'Compare with the [Qatar end-of-service calculator](/qatar-end-of-service-calculator) and the [Oman end-of-service calculator](/oman-end-of-service-calculator).',
					'See the [Bahrain leaving indemnity calculator](/bahrain-leaving-indemnity-calculator) and the [Saudi end-of-service calculator](/saudi-end-of-service-calculator) for other Gulf rules.',
					'Use the [currency converter](/currency-converter) if you send money home.'
				]
			}
		],
		formulas: [
			{
				title: 'Indemnity under Article 51 (monthly-paid workers)',
				expression: `Indemnity = min(Y, ${KW_FIRST_TIER_YEARS}) × ${KW_DAYS_PER_YEAR_FIRST} × D + max(Y − ${KW_FIRST_TIER_YEARS}, 0) × W, capped at ${KW_CAP_MONTHS} × W`,
				variables: [
					{ symbol: 'Y', meaning: 'Years of service, with the part year counted pro rata.' },
					{ symbol: 'W', meaning: 'Last monthly wage.' },
					{ symbol: 'D', meaning: `Daily wage: W ÷ ${KW_DAILY_DIVISOR_WORKING} (or W ÷ ${KW_DAILY_DIVISOR_CALENDAR}).` }
				]
			},
			{
				title: 'Resignation share, Article 53 (open-ended contracts)',
				expression: `Under ${KW_RESIGN_MIN_YEARS} years: 0 · ${KW_RESIGN_MIN_YEARS} to under ${KW_RESIGN_HALF_UNTIL}: ½ · ${KW_RESIGN_HALF_UNTIL} to under ${KW_RESIGN_TWO_THIRDS_UNTIL}: ⅔ · ${KW_RESIGN_TWO_THIRDS_UNTIL} or more: full`,
				variables: [{ symbol: '½, ⅔', meaning: 'The fraction of the Article 51 indemnity that you receive.' }]
			}
		],
		example: {
			title: `${moneyIn('KWD', 600, true)} wage, 1 January 2018 to 31 December 2024`,
			steps: [
				`Service: exactly 7 years, so ${KW_FIRST_TIER_YEARS} years at ${KW_DAYS_PER_YEAR_FIRST} days and 2 years at ${KW_MONTHS_PER_YEAR_AFTER} month.`,
				`Daily wage (÷ ${KW_DAILY_DIVISOR_WORKING}): 600 ÷ ${KW_DAILY_DIVISOR_WORKING} = ${moneyIn('KWD', 600 / KW_DAILY_DIVISOR_WORKING)}.`,
				`Years 1 to ${KW_FIRST_TIER_YEARS}: ${KW_FIRST_TIER_YEARS} × ${KW_DAYS_PER_YEAR_FIRST} × ${num(600 / KW_DAILY_DIVISOR_WORKING, 3)} = ${moneyIn('KWD', 1730.769)}. Years 6 and 7: 2 × 600 = ${moneyIn('KWD', 1200)}.`,
				`Full indemnity: ${moneyIn('KWD', 2930.769)}. The cap (${KW_CAP_MONTHS} × 600 = ${moneyIn('KWD', 600 * KW_CAP_MONTHS, true)}) is not reached. If you resigned, two thirds applies: ${moneyIn('KWD', 1953.846)}.`
			],
			result: moneyIn('KWD', 2930.769)
		},
		faq: [
			{
				q: 'How is the end-of-service indemnity calculated in Kuwait?',
				a: `For a monthly-paid worker, it is ${KW_DAYS_PER_YEAR_FIRST} days of wage for each of the first ${KW_FIRST_TIER_YEARS} years plus ${KW_MONTHS_PER_YEAR_AFTER} month for each year after. The total is capped at ${KW_CAP_MONTHS} months of wage.`
			},
			{
				q: 'Does resigning reduce my indemnity?',
				a: `Yes, if your contract is open-ended. Under Article 53 you get nothing under ${KW_RESIGN_MIN_YEARS} years, half from ${KW_RESIGN_MIN_YEARS} to under ${KW_RESIGN_HALF_UNTIL} years, two thirds from ${KW_RESIGN_HALF_UNTIL} to under ${KW_RESIGN_TWO_THIRDS_UNTIL} years and the full amount from ${KW_RESIGN_TWO_THIRDS_UNTIL} years.`
			},
			{
				q: 'Which wage and which daily divisor?',
				a: `Article 55 reads wage as basic pay plus the allowances and regular cash benefits in your contract. For a day’s wage, Article 67 divides by actual working days, about ${KW_DAILY_DIVISOR_WORKING} a month. Some employers divide by ${KW_DAILY_DIVISOR_CALENDAR}, which gives a slightly lower daily wage.`
			},
			{
				q: 'Is there a maximum indemnity?',
				a: `Yes. The total cannot exceed ${KW_CAP_MONTHS} months of wage, which is one and a half years. The tool tells you when the cap is applied.`
			},
			{
				q: 'Who is not covered by this calculator?',
				a: 'Workers paid by the day, week, hour or piece, fixed-term contracts, government and oil-sector staff and domestic workers have different rules. They are not modelled here.'
			}
		],
		sources: KW_SOURCES,
		disclaimer:
			'Estimate for monthly-paid private-sector workers under Labour Law No. 6 of 2010. Employer loans you owe can be deducted, and your contract may pay more. This is not legal advice; confirm with the Public Authority for Manpower or a Kuwaiti lawyer.'
	}
});
