import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './cpp-calculator.meta';
import {
	CA_TAX_YEAR,
	CPP_EARLY_REDUCTION_PER_MONTH,
	CPP_FULL_YEARS,
	CPP_LATE_INCREASE_PER_MONTH,
	CPP_MAX_PENSION_AT_65,
	CPP_PENSION_SOURCES,
	YMPE
} from '../data/ca-tax-2026';

/** Multiplier for starting `monthsFrom65` months after age 65 (negative = before 65). Limited to age 60–70. */
export function ageFactor(monthsFrom65: number): number {
	const m = Math.max(-60, Math.min(60, monthsFrom65));
	return m < 0 ? 1 + CPP_EARLY_REDUCTION_PER_MONTH * m : 1 + CPP_LATE_INCREASE_PER_MONTH * m;
}

/** Simplified pension at 65: maximum × (earnings ÷ YMPE, at most 1) × (years counted ÷ 39). */
export function pensionAt65(avgEarnings: number, years: number): number {
	const ratio = Math.min(avgEarnings / YMPE, 1);
	return CPP_MAX_PENSION_AT_65 * ratio * (Math.min(years, CPP_FULL_YEARS) / CPP_FULL_YEARS);
}

/** Content is written once at build time, so format dollars explicitly (CA$74,600). */
const cad = (n: number) => moneyIn('CAD', n, true);
/** Start-age table for the default case in the text: CA$60,000 average earnings, 35 years. */
function startRows(): string[][] {
	const at65 = pensionAt65(60_000, 35);
	return [60, 65, 70].map((a) => {
		const f = ageFactor((a - 65) * 12);
		const change = a === 65 ? 'None' : a < 65 ? `−${pct((1 - f) * 100, 0)}` : `+${pct((f - 1) * 100, 0)}`;
		return [String(a), change, moneyIn('CAD', at65 * f), moneyIn('CAD', at65 * f * 12)];
	});
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'earnings', label: 'Average yearly earnings', type: 'number', default: 60000, min: 0, max: 10_000_000, step: 1000, prefix: '$', suffix: '/yr', help: 'In today’s dollars, across the years you contributed. Earnings above the 2026 limit ($74,600) add nothing.' },
		{ id: 'years', label: 'Years you contribute (age 18 to 65)', type: 'number', default: 35, min: 0, max: 47, step: 1, suffix: 'years', decimal: false, help: 'Years with CPP contributions. The 39 best years count.' },
		{ id: 'ageYears', label: 'Start age', type: 'number', default: 65, min: 60, max: 70, step: 1, suffix: 'years', decimal: false, width: 'half' },
		{ id: 'ageMonths', label: 'plus months', type: 'number', default: 0, min: 0, max: 11, step: 1, suffix: 'months', decimal: false, width: 'half' }
	],
	calculate(v): CalculationResult {
		const earnings = Number(v.earnings);
		const years = Number(v.years);
		const ageYears = Number(v.ageYears);
		const ageMonths = Number(v.ageMonths);
		const ok =
			Number.isFinite(earnings) && earnings >= 0 && Number.isInteger(years) && years >= 0 && years <= 47 &&
			Number.isInteger(ageYears) && ageYears >= 60 && ageYears <= 70 &&
			Number.isInteger(ageMonths) && ageMonths >= 0 && ageMonths <= 11 && !(ageYears === 70 && ageMonths > 0);
		if (!ok) {
			return { primaryResult: DASH, primaryLabel: 'Estimated monthly CPP', summary: 'Enter earnings of zero or more, 0 to 47 years, and a start age from 60 to 70.' };
		}
		const monthsFrom65 = (ageYears - 65) * 12 + ageMonths;
		const at65 = pensionAt65(earnings, years);
		const factor = ageFactor(monthsFrom65);
		const monthly = at65 * factor;
		const ratio = Math.min(earnings / YMPE, 1);
		const rows = [60, 65, 70].map((a) => ({
			age: String(a),
			change: a === 65 ? 'None' : a < 65 ? `−${pct((1 - ageFactor((a - 65) * 12)) * 100, 1)}` : `+${pct((ageFactor((a - 65) * 12) - 1) * 100, 1)}`,
			monthly: money(at65 * ageFactor((a - 65) * 12)),
			yearly: money(at65 * ageFactor((a - 65) * 12) * 12)
		}));
		return {
			primaryResult: money(monthly),
			primaryLabel: 'Estimated monthly CPP',
			summary: `An estimate only: ${pct(ratio * 100, 1)} of the maximum earnings and ${Math.min(years, CPP_FULL_YEARS)} of 39 years give ${money(at65)} a month at 65${
				monthsFrom65 === 0 ? '' : `, then ${monthsFrom65 < 0 ? 'reduced' : 'increased'} ${pct(Math.abs(factor - 1) * 100, 1)} for starting at ${ageYears}${ageMonths ? ` and ${ageMonths} months` : ''}`
			}. Check My Service Canada Account for your real figure.`,
			secondaryMetrics: [
				{ label: 'Estimated yearly CPP', value: money(monthly * 12) },
				{ label: 'Pension at 65', value: money(at65) },
				{ label: 'Age adjustment', value: monthsFrom65 === 0 ? 'None' : `${monthsFrom65 < 0 ? '−' : '+'}${pct(Math.abs(factor - 1) * 100, 1)}` },
				{ label: 'Average earnings vs the $74,600 limit', value: pct(ratio * 100, 1) },
				{ label: 'Years counted (of 39)', value: String(Math.min(years, CPP_FULL_YEARS)) },
				{ label: '2026 maximum at 65', value: money(CPP_MAX_PENSION_AT_65) }
			],
			table: {
				title: 'Starting at 60, 65 and 70',
				columns: [
					{ key: 'age', label: 'Start age' },
					{ key: 'change', label: 'Change', align: 'end' },
					{ key: 'monthly', label: 'Per month', align: 'end' },
					{ key: 'yearly', label: 'Per year', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro: `Estimate your Canada Pension Plan (CPP) retirement pension if you start between age 60 and 70. This CPP calculator gives a simplified estimate, based on your average earnings compared with the ${CA_TAX_YEAR} maximum and the number of years you contribute.`,
		howTo: [
			'Enter your average yearly earnings, in current dollars, across the years you contribute.',
			'Enter the number of years you contribute to CPP.',
			'Choose the age and months when you will start your pension.',
			'Read the estimate and the table for ages 60, 65 and 70. Then check your real figure in My Service Canada Account.'
		],
		about: [
			{
				heading: 'What is the CPP retirement pension?',
				paragraphs: [
					'The Canada Pension Plan is a public pension for people who worked in Canada outside Quebec. You and your employer pay into it from each paycheque. Later, it pays you a monthly pension for life.',
					'The amount depends on how much you paid in and for how long. Higher earnings and more years of contributions give a bigger pension. The money is taxable income when you receive it.',
					'Quebec has its own plan, the Quebec Pension Plan (QPP), which this tool does not estimate.'
				]
			},
			{
				heading: 'How this estimate works',
				paragraphs: [
					`This tool uses a simple rule, not the official formula. It starts with the ${CA_TAX_YEAR} maximum pension at 65, which is ${moneyIn('CAD', CPP_MAX_PENSION_AT_65)} a month. Then it scales that amount by two ratios.`,
					`First, it compares your average earnings with the yearly maximum pensionable earnings of ${cad(YMPE)}. Earnings above that limit add nothing. Second, it compares your years of contributions with ${CPP_FULL_YEARS}, because the maximum pension needs about ${CPP_FULL_YEARS} years at the maximum.`,
					'Last, it adjusts the result for the age you start. The adjustment is the same for everyone, so it is easy to compare.'
				]
			},
			{
				heading: 'Starting your CPP at 60, 65 or 70',
				paragraphs: [
					`You can start between 60 and 70. Each month before 65 cuts the pension by ${pct(CPP_EARLY_REDUCTION_PER_MONTH * 100, 1)}, which is ${pct(CPP_EARLY_REDUCTION_PER_MONTH * 100 * 60, 0)} at 60. Each month after 65 raises it by ${pct(CPP_LATE_INCREASE_PER_MONTH * 100, 1)}, which is ${pct(CPP_LATE_INCREASE_PER_MONTH * 100 * 60, 0)} at 70.`,
					`The table uses the default case of ${cad(60_000)} average earnings and 35 years of contributions. It shows how much the start age matters.`,
					'You can also use the months box to test a start such as 63 years and 6 months. A later start pays more each month, but you collect for fewer years. Your health, your other income and your savings all matter, so there is no single right age.'
				],
				table: { caption: 'Default case: CA$60,000 average earnings, 35 years', columns: ['Start age', 'Change', 'Per month', 'Per year'], rows: startRows() }
			},
			{
				heading: 'Why your real CPP pension may differ',
				paragraphs: [
					'The official pension uses your actual earnings in each year, compared with that year’s limit. It also includes the enhanced CPP rules phased in since 2019 and a drop-out of your lowest-earning years. This tool does not model those parts. Time spent abroad or out of work can also change your record.',
					'So treat the figure as a rough guide. Your Statement of Contributions in My Service Canada Account shows your own record and an estimate based on it.'
				]
			},
			{
				heading: 'Plan the rest of your retirement income',
				paragraphs: [
					'CPP is only one part of retirement income. Most people also draw from workplace pensions and personal savings.',
					'The [RRSP calculator](/rrsp-calculator) and the [TFSA calculator](/tfsa-calculator) project those savings. While you work, you can see what CPP costs you each year with the [Canada take-home pay calculator](/canada-take-home-pay-calculator) or the [Canada income tax calculator](/canada-income-tax-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Simplified estimate (not the official formula)',
				expression: `Pension at 65 = ${moneyIn('CAD', CPP_MAX_PENSION_AT_65)} × min(earnings ÷ ${cad(YMPE)}, 1) × min(years, ${CPP_FULL_YEARS}) ÷ ${CPP_FULL_YEARS}`,
				variables: [
					{ symbol: moneyIn('CAD', CPP_MAX_PENSION_AT_65), meaning: `the ${CA_TAX_YEAR} maximum monthly CPP retirement pension at 65` },
					{ symbol: `Earnings ÷ ${cad(YMPE)}`, meaning: `your average earnings compared with the ${CA_TAX_YEAR} yearly maximum pensionable earnings, capped at 100%` },
					{ symbol: `Years ÷ ${CPP_FULL_YEARS}`, meaning: `the maximum pension needs about ${CPP_FULL_YEARS} years of maximum contributions` }
				]
			},
			{
				title: 'Starting age',
				expression: `Before 65: −${pct(CPP_EARLY_REDUCTION_PER_MONTH * 100, 1)} per month (−${pct(CPP_EARLY_REDUCTION_PER_MONTH * 6000, 0)} at 60);  after 65: +${pct(CPP_LATE_INCREASE_PER_MONTH * 100, 1)} per month (+${pct(CPP_LATE_INCREASE_PER_MONTH * 6000, 0)} at 70)`,
				variables: []
			}
		],
		example: {
			title: '$60,000 average earnings, 35 years, starting at 65',
			steps: [
				'Earnings ratio = $60,000 ÷ $74,600 = 80.4%.',
				'Years counted = 35 of 39.',
				'Pension at 65 = $1,507.65 × 0.8043 × 35 ÷ 39 = $1,088.22 a month.'
			],
			result: 'About $1,088.22 a month ($13,058.63 a year) at 65. Starting at 60 would be 36% lower and at 70 42% higher.'
		},
		faq: [
			{
				q: 'How much CPP will I get at 65?',
				a: `It depends on your earnings and years of contributions. For example, ${cad(60_000)} of average earnings over 35 years gives about $1,088 a month in this estimate. The maximum is ${moneyIn('CAD', CPP_MAX_PENSION_AT_65)} a month in ${CA_TAX_YEAR}.`
			},
			{
				q: 'How accurate is this CPP estimate?',
				a: 'It is a rough guide. The real pension uses your actual earnings each year, the enhanced CPP rules phased in since 2019, and the drop-out of your lowest years. It does not model the enhancement or CPP2 separately.'
			},
			{
				q: `What is the maximum CPP pension in ${CA_TAX_YEAR}?`,
				a: `The maximum new retirement pension at 65 is ${moneyIn('CAD', CPP_MAX_PENSION_AT_65)} a month in ${CA_TAX_YEAR}. It needs about ${CPP_FULL_YEARS} years of contributions at or above the yearly maximum pensionable earnings.`
			},
			{
				q: 'Is it better to take CPP at 60 or 70?',
				a: `Neither is better for everyone. Starting at 60 gives a pension ${pct(CPP_EARLY_REDUCTION_PER_MONTH * 6000, 0)} lower, and starting at 70 gives one ${pct(CPP_LATE_INCREASE_PER_MONTH * 6000, 0)} higher. The right age depends on your health, your other income and how long you expect to collect.`
			},
			{
				q: 'How do I get my real CPP amount?',
				a: 'Sign in to My Service Canada Account to see your Statement of Contributions and a pension estimate based on your record.'
			}
		],
		sources: CPP_PENSION_SOURCES,
		disclaimer: 'Simplified estimate, not an official calculation. Use My Service Canada Account for your actual pension. This is not financial advice.'
	}
});
