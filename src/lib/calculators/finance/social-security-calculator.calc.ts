import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';

import { SS_WAGE_BASE } from '../data/us-tax-2026';
import meta from './social-security-calculator.meta';

/** SSA figures for 2026 (Federal Register, 3 Nov 2025). */
export const BEND_1 = 1_286;
export const BEND_2 = 7_749;
export const WAGE_BASE = SS_WAGE_BASE;

/** Full retirement age in months, by birth year (Social Security Act §216(l)). */
export function fraMonths(birthYear: number): number {
	if (birthYear <= 1937) return 65 * 12;
	if (birthYear <= 1942) return 65 * 12 + (birthYear - 1937) * 2;
	if (birthYear <= 1954) return 66 * 12;
	if (birthYear <= 1959) return 66 * 12 + (birthYear - 1954) * 2;
	return 67 * 12;
}

export function pia(aime: number): number {
	const raw = 0.9 * Math.min(aime, BEND_1) + 0.32 * Math.max(0, Math.min(aime, BEND_2) - BEND_1) + 0.15 * Math.max(0, aime - BEND_2);
	return Math.floor(raw * 10 + 1e-9) / 10; // SSA rounds the PIA down to the dime
}

/** Share of the PIA paid when claiming at `claim` months of age. */
export function claimFactor(claim: number, fra: number): number {
	if (claim < fra) {
		const early = fra - claim;
		return 1 - (Math.min(early, 36) * 5) / 900 - (Math.max(0, early - 36) * 5) / 1200;
	}
	const late = Math.min(claim, 70 * 12) - fra;
	return 1 + (late * 2) / 300; // 8% a year (2/3 of 1% a month)
}

const ageText = (m: number) => (m % 12 ? `${Math.floor(m / 12)} and ${m % 12} months` : `${m / 12}`);

/** Content is written once at build time, so format dollars explicitly. */
const usd = (n: number) => moneyIn('USD', n, true);
const usd2 = (n: number) => moneyIn('USD', n);
const EX_EARN = 60_000;
const EX_BORN = 1970;
const EX_AIME = Math.floor(EX_EARN / 12);
const EX_PIA = pia(EX_AIME);
const EX_FRA = fraMonths(EX_BORN);
const exBenefit = (claim: number) => Math.floor(EX_PIA * claimFactor(claim, EX_FRA) + 1e-9);
const EX_PART1 = 0.9 * BEND_1;
const EX_PART2 = 0.32 * (EX_AIME - BEND_1);
const fraRows: string[][] = [
	['1943 to 1954', ageText(fraMonths(1950))],
	...[1955, 1956, 1957, 1958, 1959].map((y) => [String(y), ageText(fraMonths(y))]),
	['1960 or later', ageText(fraMonths(1960))]
];
const claimRows: string[][] = [62, 64, 66, 67, 68, 70].map((a) => [
	a * 12 === EX_FRA ? `${a} (full retirement age)` : String(a),
	`${Math.round(claimFactor(a * 12, EX_FRA) * 1000) / 10}%`,
	usd(exBenefit(a * 12))
]);

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'born', label: 'Year of birth', type: 'number', default: 1970, min: 1940, max: 2010, decimal: false, width: 'half' },
		{ id: 'years', label: 'Years of work', type: 'number', default: 35, min: 0, max: 50, decimal: false, width: 'half', help: 'Years with Social Security–taxed earnings' },
		{ id: 'earnings', label: 'Average yearly earnings', type: 'number', default: 60000, min: 0, max: 10_000_000, prefix: '$', help: `In today’s dollars. Earnings above the yearly cap (${money(SS_WAGE_BASE, true)}) don’t count` },
		{ id: 'claimY', label: 'Claiming age', type: 'number', default: 67, min: 62, max: 70, decimal: false, suffix: 'years', width: 'half' },
		{ id: 'claimM', label: 'Plus months', type: 'number', default: 0, min: 0, max: 11, decimal: false, suffix: 'months', width: 'half' }
	],
	calculate(v): CalculationResult {
		const born = Number(v.born);
		const years = Number(v.years);
		const earnings = Number(v.earnings);
		const claim = Number(v.claimY) * 12 + Number(v.claimM);
		const label = 'Monthly benefit (today’s dollars)';
		if (![born, years, earnings, claim].every(Number.isFinite) || claim < 62 * 12 || claim > 70 * 12 || years < 0 || earnings < 0) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Choose a claiming age from 62 to 70.' };
		}
		if (years < 10) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: 'You need 40 work credits (about 10 years of work) to qualify for retirement benefits.'
			};
		}
		const counted = Math.min(earnings, WAGE_BASE);
		const aime = Math.floor((counted * Math.min(years, 35)) / 35 / 12);
		const base = pia(aime);
		const fra = fraMonths(born);
		const benefitAt = (m: number) => Math.floor(base * claimFactor(m, fra) + 1e-9);
		const benefit = benefitAt(claim);
		const f = claimFactor(claim, fra);
		const ages = [62, 63, 64, 65, 66, 67, 68, 69, 70].map((a) => a * 12);
		if (!ages.includes(fra)) ages.push(fra);
		ages.sort((a, b) => a - b);

		return {
			primaryResult: money(benefit, true),
			primaryLabel: label,
			summary:
				claim < fra
					? `Claiming before your full retirement age (${ageText(fra)}) cuts your benefit by ${pct((1 - f) * 100, 1)} for life.`
					: claim > fra
						? `Waiting past your full retirement age (${ageText(fra)}) raises your benefit by ${pct((f - 1) * 100, 1)}.`
						: `This is your full benefit at your full retirement age of ${ageText(fra)}.`,
			secondaryMetrics: [
				{ label: 'Full retirement age', value: ageText(fra) },
				{ label: 'Benefit at full retirement age', value: money(Math.floor(base), true) },
				{ label: 'Benefit at 62', value: money(benefitAt(62 * 12), true) },
				{ label: 'Benefit at 70', value: money(benefitAt(70 * 12), true) },
				{ label: 'Average indexed monthly earnings', value: money(aime, true) },
				{ label: 'Yearly benefit at your age', value: money(benefit * 12, true) }
			],
			table: {
				title: 'Monthly benefit by claiming age',
				columns: [
					{ key: 'age', label: 'Claim at' },
					{ key: 'pct', label: '% of full', align: 'end' },
					{ key: 'monthly', label: 'Monthly', align: 'end' }
				],
				rows: ages.map((m) => ({
					age: m === fra ? `${ageText(m)} (full)` : ageText(m),
					pct: `${num(claimFactor(m, fra) * 100, 1)}%`,
					monthly: money(benefitAt(m), true)
				}))
			}
		};
	},
	content: {
		intro: `Use this Social Security calculator to estimate your US retirement benefit from your average earnings. It shows how claiming at 62, at your full retirement age or at 70 changes the monthly amount. Figures are in current dollars and use the 2026 SSA formula.`,
		howTo: [
			'Enter your year of birth to set your full retirement age.',
			'Enter how many years you have worked, or will work, and your typical yearly earnings in current dollars.',
			'Choose the age you plan to claim, from 62 to 70.',
			'Compare the monthly amounts in the table under the result.'
		],
		about: [
			{
				heading: 'How Social Security retirement benefits work',
				paragraphs: [
					'Social Security pays a monthly benefit to workers who have paid into the system. You need 40 work credits to qualify. Most people earn those in about 10 years of work.',
					'Your benefit is based on your 35 highest-earning years, adjusted for wage growth. If you worked fewer than 35 years, the missing years count as zero. So each extra year of work can raise your benefit, up to 35 years.',
					`Only earnings up to a yearly cap are counted, because only those earnings are taxed for Social Security. In 2026, the cap is ${usd(WAGE_BASE)}.`
				]
			},
			{
				heading: 'How the benefit is calculated',
				paragraphs: [
					`First, SSA finds your average indexed monthly earnings (AIME): your top 35 years of earnings, divided by 420 months. Then a three-step formula turns the AIME into your primary insurance amount (PIA), which is the benefit at full retirement age.`,
					`For 2026, the formula pays 90% of the first ${usd(BEND_1)} of AIME, 32% of the amount from ${usd(BEND_1)} to ${usd(BEND_2)}, and 15% of anything above that. The two dollar amounts are called bend points. Because the rates fall, lower earners get back a bigger share of their pay.`
				]
			},
			{
				heading: 'Full retirement age by birth year',
				paragraphs: [
					'Your full retirement age (FRA) is when you can claim your full PIA. It depends on the year you were born. The calculator uses your birth year to set it.'
				],
				table: { caption: 'Full retirement age (years and months)', columns: ['Year of birth', 'Full retirement age'], rows: fraRows }
			},
			{
				heading: 'Claiming early or late',
				paragraphs: [
					'You can claim as early as 62, but your benefit is cut for life. If you wait past your full retirement age, it grows until 70. After 70 there is no extra gain, so the calculator stops there.',
					`The table shows the effect for someone born in ${EX_BORN} with ${usd(EX_EARN)} of average yearly earnings over 35 years. Their full retirement age is ${ageText(EX_FRA)}.`
				],
				table: { caption: 'Monthly benefit by claiming age', columns: ['Claim at age', '% of full benefit', 'Monthly benefit'], rows: claimRows }
			},
			{
				heading: 'What this estimate leaves out',
				paragraphs: ['The calculator gives a simple planning figure. Your real benefit will differ for several reasons:'],
				list: [
					'It assumes the same earnings in every working year, in current dollars. Your actual record may rise and fall.',
					'It doesn’t add yearly cost-of-living increases, so the figure stays in current dollars.',
					'It leaves out spousal and survivor benefits, and the earnings test if you work before your full retirement age.',
					'Up to 85% of your benefit can be taxable, depending on your other income. The [income tax calculator](/income-tax-calculator) can help you plan.',
					'For the official number, check your my Social Security account at ssa.gov.'
				]
			},
			{
				heading: 'Putting the benefit in your plan',
				paragraphs: [
					'Social Security is only one part of retirement income. Add it to your savings with the [retirement calculator](/retirement-calculator), and check how your accounts grow with the [401(k) calculator](/401k-calculator) or the [IRA calculator](/ira-calculator).',
					'Prices also rise over time. The [inflation calculator](/inflation-calculator) shows how much buying power a fixed amount loses.'
				]
			}
		],
		formulas: [
			{
				title: 'Primary insurance amount (2026 bend points)',
				expression: `PIA = 90% × first ${usd(BEND_1)} of AIME + 32% × AIME from ${usd(BEND_1)} to ${usd(BEND_2)} + 15% × AIME above ${usd(BEND_2)}`,
				variables: [
					{ symbol: 'AIME', meaning: 'average indexed monthly earnings: your highest 35 years of capped earnings ÷ 420 months (missing years count as zero)' },
					{ symbol: 'PIA', meaning: 'the benefit at full retirement age, rounded down to the dime' }
				]
			},
			{
				title: 'Claiming age',
				expression: 'Early: −5/9 of 1% per month for the first 36 months, then −5/12 of 1% per month. Late: +2/3 of 1% per month until 70',
				variables: [{ symbol: 'Full retirement age', meaning: '67 if born in 1960 or later; 66 and 2 to 10 months for 1955 to 1959; 66 for 1943 to 1954' }]
			}
		],
		example: {
			title: `Born ${EX_BORN}, 35 years of work averaging ${usd(EX_EARN)}`,
			steps: [
				`AIME: ${usd(EX_EARN)} ÷ 12 = ${usd(EX_AIME)}`,
				`PIA: 90% × ${usd(BEND_1)} + 32% × (${usd(EX_AIME)} − ${usd(BEND_1)}) = ${usd2(EX_PART1)} + ${usd2(EX_PART2)} = ${usd2(EX_PIA)}`,
				`At 62 (60 months early): ${Math.round(claimFactor(62 * 12, EX_FRA) * 100)}% → ${usd(exBenefit(62 * 12))}`,
				`At 70 (36 months late): ${Math.round(claimFactor(70 * 12, EX_FRA) * 100)}% → ${usd(exBenefit(70 * 12))}`
			],
			result: `About ${usd(exBenefit(EX_FRA))} a month at ${ageText(EX_FRA)}, ${usd(exBenefit(62 * 12))} at 62 or ${usd(exBenefit(70 * 12))} at 70.`
		},
		faq: [
			{
				q: 'How is a Social Security retirement benefit calculated?',
				a: 'SSA averages your 35 highest years of indexed earnings, then applies a three-step formula to get your full benefit. Claiming before full retirement age reduces it. Claiming after raises it, up to age 70.'
			},
			{
				q: 'What is my full retirement age?',
				a: 'It is 67 if you were born in 1960 or later. It is 66 plus 2 months for each year after 1954 if you were born from 1955 to 1959, and 66 if you were born from 1943 to 1954.'
			},
			{
				q: 'Is it better to claim at 62 or 70?',
				a: 'For someone born in 1960 or later, claiming at 70 pays 24% more than at 67 and about 77% more than at 62, for life. Waiting usually pays off if you live into your 80s. Your health, savings and a spouse’s benefit also matter.'
			},
			{
				q: 'How accurate is this estimate?',
				a: 'It assumes your earnings are the same in every working year, in current dollars. Your real benefit uses your actual wage-indexed record. Get your official estimate from your my Social Security account at ssa.gov.'
			},
			{
				q: 'Does this include spousal or survivor benefits?',
				a: 'No. A spouse can receive up to 50% of your full benefit, and a survivor up to 100% of what you were receiving. Neither is included here.'
			}
		],
		sources: [
			{ title: 'SSA — Benefit formula bend points', url: 'https://www.ssa.gov/oact/cola/bendpoints.html' },
			{ title: 'SSA — Retirement age and benefit reduction', url: 'https://www.ssa.gov/benefits/retirement/planner/agereduction.html' },
			{ title: 'SSA — Contribution and benefit base', url: 'https://www.ssa.gov/oact/cola/cbb.html' }
		],
		disclaimer: 'An estimate in current dollars from simplified earnings. Your actual benefit depends on your full earnings record, future law changes and yearly cost-of-living adjustments.'
	}
});
