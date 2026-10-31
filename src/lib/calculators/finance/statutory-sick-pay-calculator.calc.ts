import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num, plural } from '../format';
import meta from './statutory-sick-pay-calculator.meta';
import { SSP_EARNINGS_SHARE, SSP_MAX_WEEKS, SSP_SOURCE, SSP_WEEKLY_RATE, UK_RATES_SOURCE, UK_TAX_YEAR } from '../data/uk-tax-2026-27';

/** Round up to the next penny, ignoring floating-point noise. */
const penceUp = (n: number) => Math.ceil(Math.round(n * 100 * 1e6) / 1e6) / 100;

/** Content is written at build time, so format pounds explicitly. */
const gbp = (n: number) => moneyIn('GBP', n, true);
const gbp2 = (n: number) => moneyIn('GBP', n);
const pc = (r: number) => `${Math.round(r * 1000) / 10}%`;
const SSP_TAX_YEAR = UK_TAX_YEAR;
/** Same rules as the calculator, for the examples in the text. */
const sspWeekly = (awe: number) => penceUp(Math.min(SSP_WEEKLY_RATE, awe * SSP_EARNINGS_SHARE));
const sspDaily = (weekly: number, qd: number) => penceUp(weekly / qd);
function sspTotal(awe: number, qd: number, days: number): number {
	const weekly = sspWeekly(awe);
	const paid = Math.min(days, SSP_MAX_WEEKS * qd);
	const full = Math.floor(paid / qd);
	return full * weekly + (paid - full * qd) * sspDaily(weekly, qd);
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'awe',
			label: 'Average weekly earnings',
			type: 'number',
			default: 400,
			min: 0,
			max: 100_000,
			step: 10,
			prefix: '$',
			help: 'Pay over the 8 weeks up to the last payday before you were sick, divided by 8.'
		},
		{
			id: 'qdays',
			label: 'Qualifying days per week',
			type: 'select',
			display: 'menu',
			default: '5',
			options: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ label: `${n} day${n === 1 ? '' : 's'}`, value: String(n) })),
			help: 'The days you are normally required to work.'
		},
		{ id: 'days', label: 'Qualifying days off sick', type: 'number', default: 10, min: 0, max: 196, decimal: false, suffix: 'days' }
	],
	calculate(v): CalculationResult {
		const awe = Number(v.awe);
		const qd = Number(v.qdays);
		const days = Number(v.days);
		if (!(awe >= 0) || !Number.isFinite(awe) || !(qd >= 1 && qd <= 7) || !Number.isInteger(qd) || !(days >= 0) || !Number.isFinite(days)) {
			return { primaryResult: DASH, primaryLabel: 'Total SSP', summary: 'Enter your average weekly earnings and the days off sick.' };
		}
		const weekly = penceUp(Math.min(SSP_WEEKLY_RATE, awe * SSP_EARNINGS_SHARE));
		const daily = penceUp(weekly / qd);
		const maxDays = SSP_MAX_WEEKS * qd;
		const paidDays = Math.min(Math.floor(days), maxDays);
		const fullWeeks = Math.floor(paidDays / qd);
		const extraDays = paidDays - fullWeeks * qd;
		const total = fullWeeks * weekly + extraDays * daily;
		const limited = awe * SSP_EARNINGS_SHARE < SSP_WEEKLY_RATE;
		return {
			primaryResult: money(total),
			primaryLabel: 'Total Statutory Sick Pay',
			summary: `${money(weekly)} a week (${limited ? '80% of your earnings' : 'the standard weekly rate'}) for ${plural(paidDays, 'qualifying day')}.`,
			secondaryMetrics: [
				{ label: 'Weekly SSP', value: money(weekly) },
				{ label: 'Daily SSP', value: money(daily) },
				{ label: 'Paid qualifying days', value: num(paidDays) },
				{ label: 'Maximum days (28 weeks)', value: num(maxDays) },
				{ label: 'Standard weekly rate', value: money(SSP_WEEKLY_RATE) }
			]
		};
	},
	content: {
		intro: `Work out Statutory Sick Pay (SSP) under the rules that apply from 6 April 2026. SSP starts on the first day of sickness. The weekly rate is ${gbp2(SSP_WEEKLY_RATE)}, or ${pc(SSP_EARNINGS_SHARE)} of your average weekly earnings if that is lower.`,
		howTo: [
			'Enter your average weekly earnings from the 8 weeks before you were sick.',
			'Choose how many days a week you normally work. These are your qualifying days.',
			'Enter how many qualifying days you were off sick.',
			'Read your daily, weekly and total SSP.'
		],
		about: [
			{
				heading: 'What is Statutory Sick Pay?',
				paragraphs: [
					`Statutory Sick Pay is the minimum sick pay your employer must pay if you are too ill to work. It can be paid for up to ${SSP_MAX_WEEKS} weeks. Most employees and workers paid through PAYE can get it. Self-employed people cannot.`,
					'Your employer may ask for a doctor’s note after a certain number of days, so check your company’s sickness policy. If you are not sure whether you qualify, ask your employer or Acas.',
					'Your contract may offer more than SSP, such as full pay for a few weeks. Check your contract or staff handbook first. SSP is the floor, not the ceiling.',
					'Tell your employer as soon as you are ill and ask what proof they need. Keep your own record of the dates, because it helps if there is a question about how many days were paid.'
				]
			},
			{
				heading: 'How SSP is calculated',
				paragraphs: [
					`The weekly rate is the lower of ${gbp2(SSP_WEEKLY_RATE)} and ${pc(SSP_EARNINGS_SHARE)} of your average weekly earnings. The ${pc(SSP_EARNINGS_SHARE)} rule only matters if you earn less than about ${gbp2(SSP_WEEKLY_RATE / SSP_EARNINGS_SHARE)} a week. Above that, you get the flat rate.`,
					'Your daily rate is the weekly rate divided by your qualifying days. Both are rounded up to the next penny.'
				],
				table: {
					caption: `Weekly SSP at three earnings levels, ${SSP_TAX_YEAR}`,
					columns: ['Average weekly earnings', 'Weekly SSP', 'Why'],
					rows: [100, 150, 400].map((a) => [gbp(a), gbp2(sspWeekly(a)), a * SSP_EARNINGS_SHARE < SSP_WEEKLY_RATE ? `${pc(SSP_EARNINGS_SHARE)} of earnings is lower` : 'Flat rate is lower'])
				}
			},
			{
				heading: 'Qualifying days and the 28-week limit',
				paragraphs: [
					`Qualifying days are the days you are normally required to work. If you work three days a week, you have three qualifying days. SSP is paid for those days only, up to a maximum of ${SSP_MAX_WEEKS} weeks.`,
					`For example, take weekly SSP of ${gbp2(SSP_WEEKLY_RATE)} and a three-day week. The daily rate is ${gbp2(sspDaily(SSP_WEEKLY_RATE, 3))}. Ten days off sick is three full weeks plus one day, which comes to ${gbp2(sspTotal(400, 3, 10))}.`,
					'Periods of sickness that are close together can be linked, so the 28 weeks count across all of them. Your employer can tell you whether yours are linked. If you are unsure, ask payroll to show how they counted your qualifying days.'
				]
			},
			{
				heading: 'Tax, other pay and what this tool leaves out',
				paragraphs: [
					'SSP is taxable, and National Insurance applies to it like normal pay. Your employer takes these off before paying you. To see how deductions work on a normal salary, use the [UK take-home pay calculator](/uk-take-home-pay-calculator).',
					'Acas guidance covers England, Scotland and Wales. Northern Ireland has its own rules, so check nidirect if you work there. Other leave pay has its own tools, such as the [statutory maternity pay calculator](/statutory-maternity-pay-calculator) and the [redundancy pay calculator](/redundancy-pay-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Weekly and daily SSP',
				expression: `Weekly SSP = lower of ${gbp2(SSP_WEEKLY_RATE)} and ${pc(SSP_EARNINGS_SHARE)} × AWE (rounded up to the penny). Daily SSP = weekly SSP ÷ qualifying days per week (rounded up).`,
				variables: [{ symbol: 'AWE', meaning: 'average weekly earnings over the 8 weeks before the sickness' }]
			}
		],
		example: {
			title: `Earnings of ${gbp(400)} a week, 5-day week, 10 days off sick`,
			steps: [
				`${pc(SSP_EARNINGS_SHARE)} × ${gbp(400)} = ${gbp2(400 * SSP_EARNINGS_SHARE)}, which is above ${gbp2(SSP_WEEKLY_RATE)}, so weekly SSP is ${gbp2(SSP_WEEKLY_RATE)}`,
				`Daily SSP = ${gbp2(SSP_WEEKLY_RATE)} ÷ 5 = ${gbp2(sspDaily(SSP_WEEKLY_RATE, 5))}`,
				`10 days is 2 full weeks: 2 × ${gbp2(SSP_WEEKLY_RATE)} = ${gbp2(sspTotal(400, 5, 10))}`
			],
			result: `Total SSP of ${gbp2(sspTotal(400, 5, 10))}.`
		},
		faq: [
			{
				q: 'How much is Statutory Sick Pay?',
				a: `Weekly SSP is the lower of ${gbp2(SSP_WEEKLY_RATE)} and ${pc(SSP_EARNINGS_SHARE)} of your average weekly earnings. It is paid for your qualifying days, up to ${SSP_MAX_WEEKS} weeks.`
			},
			{
				q: 'What changed in April 2026?',
				a: 'SSP is paid from the first day of sickness, so the three waiting days are gone, and the lower earnings limit has been removed. Instead you get the lower of the flat rate or 80% of your average weekly earnings.'
			},
			{
				q: 'How long can I get SSP?',
				a: `Up to ${SSP_MAX_WEEKS} weeks for one period of sickness or linked periods. After that, you may be able to claim other benefits. Ask your employer or check GOV.UK.`
			},
			{
				q: 'Who can get SSP?',
				a: 'Employees and workers paid through PAYE who are too ill to work. Self-employed people cannot claim it. Your employer may pay more than SSP under your contract.'
			},
			{
				q: 'Is SSP taxed?',
				a: 'Yes. SSP is taxable like normal pay, so your employer deducts income tax and National Insurance. The figures here are before deductions.'
			}
		],
		sources: [UK_RATES_SOURCE, SSP_SOURCE],
		disclaimer: 'Estimate only. Your employer works out SSP from your exact pay dates and qualifying days. SSP is taxable.'
	}
});
