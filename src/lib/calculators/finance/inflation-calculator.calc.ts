import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';

import { CPI_ANNUAL, CPI_FIRST_YEAR, CPI_LAST_YEAR, CPI_LATEST } from '../data/cpi';
import meta from './inflation-calculator.meta';

const mode = (m: string) => (v: InputValues) => v.mode === m;
const latestLabel = new Date(`${CPI_LATEST.month}-01T00:00:00Z`).toLocaleDateString('en-US', {
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC'
});

/** CPI for a year, or the latest month for 'latest'. */
export function cpiFor(key: string | number): number | undefined {
	if (key === 'latest') return CPI_LATEST.index;
	return CPI_ANNUAL[Number(key)];
}

const yearOptions = [
	{ label: `Today (${latestLabel})`, value: 'latest' },
	...Object.keys(CPI_ANNUAL)
		.map(Number)
		.sort((a, b) => b - a)
		.map((y) => ({ label: String(y), value: String(y) }))
];

/** Content is written once at build time, so format dollars explicitly. */
const usd = (n: number) => moneyIn('USD', n, true);
const usd2 = (n: number) => moneyIn('USD', n);
const cpiYear = (y: number) => CPI_ANNUAL[y];
const worth = (amount: number, from: number, to: number) => (amount * cpiYear(to)) / cpiYear(from);
const EX_FROM = 2000;
const EX_TO = 2024;
const EX_VALUE = worth(100, EX_FROM, EX_TO);
const rowFor = (from: number): string[] => {
	const v = worth(100, from, CPI_LAST_YEAR);
	const yrs = CPI_LAST_YEAR - from;
	const avg = (Math.pow(cpiYear(CPI_LAST_YEAR) / cpiYear(from), 1 / yrs) - 1) * 100;
	return [String(from), usd2(v), `${num(v - 100, 1)}%`, `${num(avg, 1)}%`];
};
const RATE_EX = { amount: 100, rate: 3, years: 10 };
const RATE_FUTURE = RATE_EX.amount * Math.pow(1 + RATE_EX.rate / 100, RATE_EX.years);
const RATE_POWER = RATE_EX.amount / Math.pow(1 + RATE_EX.rate / 100, RATE_EX.years);

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'What do you want to know?',
			type: 'select',
			display: 'segmented',
			default: 'cpi',
			options: [
				{ label: 'Past value (US CPI)', value: 'cpi' },
				{ label: 'Future cost at a rate', value: 'rate' }
			]
		},
		{ id: 'amount', label: 'Amount', type: 'number', default: 100, min: 0, max: 1e12, prefix: '$' },
		{
			id: 'from',
			label: 'In the year',
			type: 'select',
			display: 'menu',
			default: '2000',
			options: yearOptions.filter((o) => o.value !== 'latest'),
			visibleWhen: mode('cpi')
		},
		{ id: 'to', label: 'Is worth in', type: 'select', display: 'menu', default: 'latest', options: yearOptions, visibleWhen: mode('cpi') },
		{ id: 'rate', label: 'Inflation rate', type: 'number', default: 3, min: -10, max: 50, step: 0.1, suffix: '% / yr', visibleWhen: mode('rate') },
		{ id: 'years', label: 'Years from now', type: 'number', default: 10, min: 1, max: 100, decimal: false, suffix: 'years', visibleWhen: mode('rate') }
	],
	calculate(v): CalculationResult {
		const amount = Number(v.amount);
		if (!Number.isFinite(amount) || amount < 0) return { primaryResult: DASH, primaryLabel: 'Equivalent value', summary: 'Enter an amount.' };

		if (v.mode === 'rate') {
			const r = Number(v.rate) / 100;
			const n = Number(v.years);
			if (!Number.isFinite(r) || !(n >= 1 && n <= 100)) return { primaryResult: DASH, primaryLabel: 'Future cost', summary: 'Enter a rate and a number of years.' };
			const future = amount * Math.pow(1 + r, n);
			const power = amount / Math.pow(1 + r, n);
			return {
				primaryResult: money(future),
				primaryLabel: `Cost in ${num(n, 0)} years`,
				summary: `${money(amount)} × (1 + ${num(r * 100, 2)}%)^${num(n, 0)}.`,
				secondaryMetrics: [
					{ label: 'Total price increase', value: pct((future / amount - 1) * 100, 2) },
					{ label: `Buying power of ${money(amount, true)} then`, value: money(power) },
					{ label: 'Money lost to inflation', value: money(amount - power) }
				]
			};
		}

		const a = cpiFor(String(v.from));
		const b = cpiFor(String(v.to));
		if (!a || !b) return { primaryResult: DASH, primaryLabel: 'Equivalent value', summary: `Pick years from ${CPI_FIRST_YEAR} to ${CPI_LAST_YEAR}.` };
		const value = (amount * b) / a;
		const fromYear = Number(v.from);
		const toYear = v.to === 'latest' ? Number(CPI_LATEST.month.slice(0, 4)) + (Number(CPI_LATEST.month.slice(5)) - 0.5) / 12 : Number(v.to) + 0.5;
		const years = toYear - (fromYear + 0.5);
		const cagr = years > 0 ? (Math.pow(b / a, 1 / years) - 1) * 100 : NaN;
		const toLabel = v.to === 'latest' ? latestLabel : String(v.to);
		return {
			primaryResult: money(value),
			primaryLabel: `${money(amount)} in ${fromYear} is worth, in ${toLabel}`,
			summary: `${money(amount)} × CPI ${num(b, 3)} ÷ CPI ${num(a, 3)}.`,
			secondaryMetrics: [
				{ label: 'Cumulative inflation', value: pct((b / a - 1) * 100, 2) },
				{ label: 'Average yearly inflation', value: Number.isFinite(cagr) ? pct(cagr, 2) : '—' },
				{ label: `CPI ${fromYear} (start)`, value: num(a, 3) },
				{ label: `CPI ${toLabel} (end)`, value: num(b, 3) }
			]
		};
	},
	content: {
		intro: `Use this inflation calculator to find out what an amount of money from any year since ${CPI_FIRST_YEAR} is worth today, using the official US Consumer Price Index. You can also project how prices grow at a rate you choose.`,
		howTo: [
			'Choose past value (real CPI data) or future cost (your own rate).',
			'Enter the amount and pick the years, or enter a rate and a number of years.',
			'Read the equivalent value.',
			'Check the total inflation and the average yearly rate below it.'
		],
		about: [
			{
				heading: 'What is inflation, and what is the CPI?',
				paragraphs: [
					'Inflation is the general rise in prices over time. When prices rise, each dollar buys less than before. So the same amount of money has less buying power year after year.',
					'In the US, the most quoted measure is the Consumer Price Index for All Urban Consumers (CPI-U). The Bureau of Labor Statistics (BLS) tracks the prices of a basket of goods and services that households buy. The index is set to 100 for the average of 1982 to 1984.'
				]
			},
			{
				heading: 'How the calculator works out past value',
				paragraphs: [
					`Past value mode compares the CPI of two years. It multiplies your amount by the later index and divides by the earlier one. The calculator has annual averages from ${CPI_FIRST_YEAR} to ${CPI_LAST_YEAR}. For the end date, you can also pick the latest published month, ${latestLabel}.`,
					`The ${CPI_LAST_YEAR} figure is an average of 11 months. The BLS did not publish October 2025 data because of the federal government shutdown.`
				]
			},
			{
				heading: `What ${usd(100)} was worth, in ${CPI_LAST_YEAR} prices`,
				paragraphs: ['The table shows how much you would need in ' + CPI_LAST_YEAR + ' to match the buying power of ' + usd(100) + ' in earlier years. The last column is the average yearly rise in prices over that period.'],
				table: {
					caption: `Value of ${usd(100)} in ${CPI_LAST_YEAR} dollars (annual average CPI-U)`,
					columns: ['From year', `Same buying power in ${CPI_LAST_YEAR}`, 'Total price rise', 'Average per year'],
					rows: [1980, 1990, 2000, 2010, 2020].map(rowFor)
				}
			},
			{
				heading: 'Future cost at a rate you choose',
				paragraphs: [
					'Future cost mode doesn’t use CPI data. It grows your amount at a fixed yearly rate, so you can test your own forecast. It also works for any country, because you supply the rate.',
					`For example, ${usd(RATE_EX.amount)} growing at ${RATE_EX.rate}% a year for ${RATE_EX.years} years costs ${usd2(RATE_FUTURE)}. Looked at the other way, ${usd(RATE_EX.amount)} would then buy only what ${usd2(RATE_POWER)} buys today.`
				]
			},
			{
				heading: 'Why inflation matters for your savings',
				paragraphs: [
					'Money that earns less than inflation loses buying power, even if the balance grows. For example, if your savings earn 2% while prices rise 3%, you fall behind by about 1% a year in real terms.',
					'The same idea applies to a fixed income, such as a pension or an annuity. A payment that never rises buys less each year, so it helps to plan for that gap early.'
				]
			},
			{
				heading: 'Limits to keep in mind',
				paragraphs: ['CPI is an average, so your own experience may differ. Keep these points in mind:'],
				list: [
					'**Your basket is personal.** If you spend more on rent, insurance or tuition, your own inflation can be higher or lower than CPI.',
					'**Annual averages smooth the year.** A month-to-month comparison can differ a little.',
					'**It covers US prices only.** For other countries, use the future-cost mode with your local rate.',
					'**Wages and savings matter too.** See how rising prices affect your plans with the [retirement calculator](/retirement-calculator), the [Social Security calculator](/social-security-calculator) and the [401(k) calculator](/401k-calculator).',
					'**Money can grow too.** Compare inflation with your returns using the [compound interest calculator](/compound-interest-calculator) or the [savings calculator](/savings-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Past value with CPI',
				expression: 'Value later = Amount × CPI(later) ÷ CPI(earlier)',
				variables: [{ symbol: 'CPI', meaning: 'Consumer Price Index for All Urban Consumers (CPI-U), annual average' }]
			},
			{
				title: 'Average yearly inflation',
				expression: 'rate = (CPI(later) ÷ CPI(earlier))^(1 ÷ years) − 1',
				variables: [{ symbol: 'years', meaning: 'the number of years between the two dates' }]
			},
			{ title: 'Future cost at a fixed rate', expression: 'Future cost = Amount × (1 + r)ⁿ', variables: [{ symbol: 'r, n', meaning: 'yearly inflation rate (as a decimal) and number of years' }] }
		],
		example: {
			title: `What ${usd(100)} in ${EX_FROM} is worth in ${EX_TO}`,
			steps: [
				`CPI ${EX_FROM} (annual average) = ${num(cpiYear(EX_FROM), 3)}`,
				`CPI ${EX_TO} (annual average) = ${num(cpiYear(EX_TO), 3)}`,
				`${usd(100)} × ${num(cpiYear(EX_TO), 3)} ÷ ${num(cpiYear(EX_FROM), 3)} = ${usd2(EX_VALUE)}`
			],
			result: `${usd(100)} in ${EX_FROM} had the same buying power as about ${usd2(EX_VALUE)} in ${EX_TO}, a ${num((EX_VALUE / 100 - 1) * 100, 1)}% rise in prices.`
		},
		faq: [
			{
				q: 'How does an inflation calculator work?',
				a: 'It compares price index values for two dates. The ratio of the later index to the earlier one shows how much prices rose, and your amount is scaled by that ratio.'
			},
			{
				q: 'Which inflation data does this use?',
				a: 'The US Bureau of Labor Statistics CPI-U, the most widely quoted measure of US consumer inflation. Past years use annual averages. “Today” uses the latest published month.'
			},
			{
				q: `Why is ${CPI_LAST_YEAR} marked as an 11-month average?`,
				a: 'The Bureau of Labor Statistics did not publish October 2025 figures because of the federal government shutdown. So the 2025 average is based on the other 11 months.'
			},
			{
				q: 'Does this work for other countries?',
				a: 'The past-value mode uses US prices only. For other countries, use the future-cost mode with your country’s inflation rate, or your national statistics office’s own tool.'
			},
			{
				q: 'Why might my own costs have risen faster?',
				a: 'CPI tracks an average basket of goods. If you spend more on things that rose quickly, such as rent, insurance or tuition, your personal inflation rate can be higher.'
			}
		],
		sources: [
			{ title: 'U.S. Bureau of Labor Statistics — Consumer Price Index', url: 'https://www.bls.gov/cpi/' },
			{ title: 'U.S. Bureau of Labor Statistics — CPI data', url: 'https://www.bls.gov/cpi/data.htm' }
		],
		disclaimer: 'Estimates based on national averages. Prices for specific goods and places can differ.'
	}
});
