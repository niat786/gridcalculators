import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';

import meta from './rmd-calculator.meta';

/** IRS Uniform Lifetime Table (Pub. 590-B, Appendix B, Table III), in force since 2022. Index = age − 72. */
const ULT = [
	27.4, 26.5, 25.5, 24.6, 23.7, 22.9, 22.0, 21.1, 20.2, 19.4, 18.5, 17.7, 16.8, 16.0, 15.2, 14.4, 13.7, 12.9, 12.2, 11.5, 10.8,
	10.1, 9.5, 8.9, 8.4, 7.8, 7.3, 6.8, 6.4, 6.0, 5.6, 5.2, 4.9, 4.6, 4.3, 4.1, 3.9, 3.7, 3.5, 3.4, 3.3, 3.1, 3.0, 2.9, 2.8,
	2.7, 2.5, 2.3, 2.0
];
export function distributionPeriod(age: number): number {
	if (age < 72) return NaN;
	return ULT[Math.min(age - 72, ULT.length - 1)];
}

/** SECURE 2.0: RMDs start at 73 if born 1951–1959, 75 if born 1960 or later (72 or 70½ earlier). */
export function startAge(born: number): number {
	if (born <= 1950) return 72;
	if (born <= 1959) return 73;
	return 75;
}

/** Content is written once at build time, so format dollars explicitly. */
const usd = (n: number) => moneyIn('USD', n, true);
const usd2 = (n: number) => moneyIn('USD', n);
const EX_BORN = 1952;
const EX_YEAR = 2026;
const EX_BAL = 500_000;
const EX_AGE = EX_YEAR - EX_BORN;
const EX_PERIOD = distributionPeriod(EX_AGE);
const EX_RMD = EX_BAL / EX_PERIOD;
const START = { early: startAge(1950), mid: startAge(1955), late: startAge(1960) };
const periodRows: string[][] = [START.mid, 75, 80, 85, 90, 95].map((a) => [
	String(a),
	num(distributionPeriod(a), 1, 1),
	`${num((1 / distributionPeriod(a)) * 100, 2, 2)}%`,
	usd2(100_000 / distributionPeriod(a))
]);

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'born', label: 'Year of birth', type: 'number', default: 1952, min: 1900, max: 2010, decimal: false, width: 'half' },
		{ id: 'year', label: 'Distribution year', type: 'number', default: 2026, min: 2022, max: 2100, decimal: false, width: 'half' },
		{ id: 'balance', label: 'Account balance on Dec 31 of the previous year', type: 'number', default: 500000, min: 0, max: 1_000_000_000, prefix: '$' },
		{ id: 'growth', label: 'Expected return', type: 'number', default: 5, min: -20, max: 20, step: 0.1, suffix: '% / yr', help: 'Only used for the future-years table' }
	],
	calculate(v): CalculationResult {
		const born = Number(v.born);
		const year = Number(v.year);
		const balance = Number(v.balance);
		const growth = Number(v.growth) / 100;
		const label = `Required minimum distribution for ${Number.isFinite(year) ? year : ''}`.trim();
		if (![born, year, balance, growth].every(Number.isFinite) || balance < 0 || year - born < 0 || year - born > 130) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Check your birth year, distribution year and balance.' };
		}
		const age = year - born;
		const start = startAge(born);
		if (age < start) {
			return {
				primaryResult: money(0, true),
				primaryLabel: label,
				summary: `No RMD yet. Your first one is for ${born + start}, the year you turn ${start} (you can delay it until April 1, ${born + start + 1}).`,
				secondaryMetrics: [
					{ label: 'Your age in this year', value: String(age) },
					{ label: 'RMD start age', value: String(start) },
					{ label: 'First RMD year', value: String(born + start) },
					{ label: 'Distribution period', value: DASH }
				]
			};
		}
		const period = distributionPeriod(age);
		const rmd = balance / period;
		const rows: Record<string, string>[] = [];
		let b = balance;
		for (let a = age, y = year; a <= Math.min(age + 24, 120) && b > 0.5; a++, y++) {
			const d = distributionPeriod(a);
			const r = b / d;
			rows.push({ year: String(y), age: String(a), period: num(d, 1), balance: money(b, true), rmd: money(r, true) });
			b = (b - r) * (1 + growth);
		}
		return {
			primaryResult: money(rmd),
			primaryLabel: label,
			summary: `${money(balance, true)} ÷ ${num(period, 1)} (IRS distribution period at age ${age}) = ${pct((1 / period) * 100, 2)} of the balance.`,
			secondaryMetrics: [
				{ label: 'Your age in this year', value: String(age) },
				{ label: 'RMD start age', value: String(start) },
				{ label: 'First RMD year', value: String(born + start) },
				{ label: 'Distribution period', value: num(period, 1) }
			],
			table: {
				title: `Future RMDs at ${pct(growth * 100, 1)} return`,
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'age', label: 'Age' },
					{ key: 'period', label: 'Period', align: 'end' },
					{ key: 'balance', label: 'Start balance', align: 'end' },
					{ key: 'rmd', label: 'RMD', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro: `Use this RMD calculator to work out the minimum you must withdraw this year from a traditional IRA, 401(k), 403(b) or similar US retirement account. It uses the IRS Uniform Lifetime Table and the SECURE 2.0 start ages.`,
		howTo: [
			'Enter your year of birth and the year you are taking the distribution for.',
			'Enter the account balance on December 31 of the previous year.',
			'Optionally set an expected return to see your future RMDs.',
			'Repeat for each account. IRA RMDs can be added together and taken from any IRA, but 401(k) RMDs come from each plan.'
		],
		about: [
			{
				heading: 'What is a required minimum distribution?',
				paragraphs: [
					'A required minimum distribution (RMD) is the least you must take out of certain retirement accounts each year once you reach a set age. The rule exists because the tax on this money was put off. The government wants it taxed at some point.',
					'RMDs apply to traditional IRAs, SEP and SIMPLE IRAs, and workplace plans such as 401(k), 403(b) and 457(b) accounts. They don’t apply to a Roth IRA while the original owner is alive. Since 2024, Roth accounts in workplace plans are exempt too.',
					'Each RMD counts as ordinary income for the year. You can always take more than the minimum, but not less.'
				]
			},
			{
				heading: 'When do RMDs start?',
				paragraphs: [
					'The start age depends on your birth year. Under the SECURE 2.0 Act, it moved up twice. Your first RMD is for the year you reach that age.',
					'You can delay the first one until April 1 of the next year. However, you would then take two RMDs in that year, which could push you into a higher tax bracket. Every later RMD is due by December 31.'
				],
				table: {
					caption: 'RMD start age by year of birth',
					columns: ['Year of birth', 'RMDs start at age'],
					rows: [
						['1950 or earlier', `${START.early} (some earlier birth years started at 70½)`],
						['1951 to 1959', String(START.mid)],
						['1960 or later', String(START.late)]
					]
				}
			},
			{
				heading: 'How an RMD is calculated',
				paragraphs: [
					'The formula is simple. You divide your account balance on December 31 of the previous year by a distribution period from the IRS Uniform Lifetime Table. The period gets shorter as you age, so the share you must withdraw gets bigger.',
					`For example, someone born in ${EX_BORN} turns ${EX_AGE} in ${EX_YEAR}. The period for that age is ${num(EX_PERIOD, 1)}. A ${usd(EX_BAL)} balance divided by ${num(EX_PERIOD, 1)} gives an RMD of ${usd2(EX_RMD)}.`
				],
				table: {
					caption: 'Uniform Lifetime Table: sample ages',
					columns: ['Age', 'Distribution period', 'Share of balance', `RMD on ${usd(100_000)}`],
					rows: periodRows
				}
			},
			{
				heading: 'Special cases this calculator does not cover',
				paragraphs: ['The Uniform Lifetime Table fits most account owners. A few situations use different rules:'],
				list: [
					'**A much younger spouse.** If your only beneficiary is a spouse more than 10 years younger, you use the Joint Life and Last Survivor table. That gives a smaller RMD.',
					'**Inherited accounts.** Heirs follow separate rules, often with a 10-year payout deadline.',
					'**Still working.** Some people can delay RMDs from their current employer’s plan. This doesn’t apply to IRAs.',
					'**Charitable gifts.** Eligible IRA owners can send money straight to charity. This can count toward the RMD and keep it out of taxable income.'
				]
			},
			{
				heading: 'Planning around your RMDs',
				paragraphs: [
					'RMDs add to your taxable income, so they can raise your tax bill. Use the [income tax calculator](/income-tax-calculator) to see the effect. They can also change how much of your Social Security benefit is taxed. See the [Social Security calculator](/social-security-calculator) for the benefit side.',
					'Many people reduce future RMDs by moving some money into a Roth account earlier. The [Roth IRA calculator](/roth-ira-calculator) and the [IRA calculator](/ira-calculator) can help you compare. To plan the whole picture, try the [retirement calculator](/retirement-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Required minimum distribution',
				expression: 'RMD = Balance on Dec 31 of last year ÷ Distribution period',
				variables: [
					{ symbol: 'Distribution period', meaning: `from the IRS Uniform Lifetime Table for your age at the end of this year (${num(distributionPeriod(73), 1)} at 73, ${num(distributionPeriod(75), 1)} at 75, ${num(distributionPeriod(80), 1)} at 80)` },
					{ symbol: 'Start age', meaning: `${START.mid} if born 1951 to 1959, ${START.late} if born 1960 or later` }
				]
			}
		],
		example: {
			title: `Born in ${EX_BORN}, balance of ${usd(EX_BAL)} at the end of ${EX_YEAR - 1}`,
			steps: [`Age at the end of ${EX_YEAR}: ${EX_AGE}`, `IRS distribution period at ${EX_AGE}: ${num(EX_PERIOD, 1)}`, `RMD: ${usd(EX_BAL)} ÷ ${num(EX_PERIOD, 1)} = ${usd2(EX_RMD)}`],
			result: `You must withdraw at least ${usd2(EX_RMD)} during ${EX_YEAR}.`
		},
		faq: [
			{
				q: 'How is an RMD calculated?',
				a: 'Divide your account balance on December 31 of the previous year by the IRS distribution period for your age. The calculator looks up the period for you and shows the result.'
			},
			{
				q: 'At what age do RMDs start?',
				a: `Under SECURE 2.0, at ${START.mid} if you were born from 1951 to 1959 and at ${START.late} if you were born in 1960 or later. You can delay the first one until April 1 of the next year, but then you take two in that year.`
			},
			{
				q: 'Do Roth IRAs have RMDs?',
				a: 'Not while the original owner is alive. Since 2024, Roth 401(k) and other Roth workplace accounts don’t require them either.'
			},
			{
				q: 'What if my spouse is more than 10 years younger?',
				a: 'If your spouse is your sole beneficiary and more than 10 years younger, you use the IRS Joint Life and Last Survivor table instead, which gives a smaller RMD. This calculator uses the Uniform Lifetime Table only.'
			},
			{
				q: 'What happens if I miss an RMD?',
				a: 'The IRS charges an excise tax of 25% of the amount not taken. It drops to 10% if you correct the mistake promptly, generally within two years.'
			},
			{
				q: 'Can I take more than the RMD?',
				a: 'Yes. The RMD is a minimum, so there is no upper limit. Extra withdrawals are taxed as income, and you can’t count them toward a future year’s RMD.'
			}
		],
		sources: [
			{ title: 'IRS — Required minimum distributions (RMDs)', url: 'https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-required-minimum-distributions-rmds' },
			{ title: 'IRS — Publication 590-B', url: 'https://www.irs.gov/forms-pubs/about-publication-590-b' }
		],
		disclaimer: 'For account owners using the Uniform Lifetime Table. Inherited accounts follow different rules. Not tax advice. Check your figures with your plan provider or a tax professional.'
	}
});
