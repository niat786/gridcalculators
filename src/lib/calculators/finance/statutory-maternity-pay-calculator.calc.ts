import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num } from '../format';
import meta from './statutory-maternity-pay-calculator.meta';
import {
	SMP_FLAT_RATE,
	SMP_HIGH_RATE_PERCENT,
	SMP_HIGH_RATE_WEEKS,
	SMP_MIN_WEEKLY_EARNINGS,
	SMP_SOURCE,
	SMP_TOTAL_WEEKS,
	UK_RATES_SOURCE,
	UK_TAX_YEAR
} from '../data/uk-tax-2026-27';

const penny = (n: number) => Math.round(n * 100) / 100;

/** Content is written at build time, so format pounds explicitly. */
const gbp = (n: number) => moneyIn('GBP', n, true);
const gbp2 = (n: number) => moneyIn('GBP', n);
const pc = (r: number) => `${Math.round(r * 1000) / 10}%`;
const LOW_WEEKS = SMP_TOTAL_WEEKS - SMP_HIGH_RATE_WEEKS;
/** SMP at a given average weekly earnings, using the same rules as the calculator. */
function smpFor(awe: number) {
	const high = penny(awe * SMP_HIGH_RATE_PERCENT);
	const low = penny(Math.min(SMP_FLAT_RATE, awe * SMP_HIGH_RATE_PERCENT));
	return { high, low, total: penny(high * SMP_HIGH_RATE_WEEKS + low * LOW_WEEKS) };
}
const EX_AWE = 600;
const EX = smpFor(EX_AWE);

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'awe',
			label: 'Average weekly earnings',
			type: 'number',
			default: 600,
			min: 0,
			max: 100_000,
			step: 10,
			prefix: '$',
			help: 'Total pay subject to National Insurance in the 8 weeks before the qualifying week, divided by 8.'
		},
		{
			id: 'service',
			label: 'Employed by the same employer for 26 weeks by the qualifying week',
			type: 'toggle',
			default: true,
			help: 'The qualifying week is the 15th week before the baby is due.'
		}
	],
	calculate(v): CalculationResult {
		const awe = Number(v.awe);
		if (!(awe >= 0) || !Number.isFinite(awe)) {
			return { primaryResult: DASH, primaryLabel: 'Total SMP', summary: 'Enter your average weekly earnings.' };
		}
		const eligible = Boolean(v.service) && awe >= SMP_MIN_WEEKLY_EARNINGS;
		const high = penny(awe * SMP_HIGH_RATE_PERCENT);
		const low = penny(Math.min(SMP_FLAT_RATE, awe * SMP_HIGH_RATE_PERCENT));
		const lowWeeks = SMP_TOTAL_WEEKS - SMP_HIGH_RATE_WEEKS;
		const total = eligible ? penny(high * SMP_HIGH_RATE_WEEKS + low * lowWeeks) : 0;

		const rows: Record<string, string>[] = [];
		let running = 0;
		if (eligible) {
			for (let w = 1; w <= SMP_TOTAL_WEEKS; w++) {
				const rate = w <= SMP_HIGH_RATE_WEEKS ? high : low;
				running += rate;
				rows.push({ week: String(w), rate: money(rate), total: money(running) });
			}
		}
		return {
			primaryResult: money(total),
			primaryLabel: 'Total Statutory Maternity Pay',
			summary: eligible
				? `${SMP_HIGH_RATE_WEEKS} weeks at ${money(high)} then ${lowWeeks} weeks at ${money(low)}, over ${SMP_TOTAL_WEEKS} weeks.`
				: `You do not qualify for SMP with these answers (you need 26 weeks' service and average earnings of at least ${money(SMP_MIN_WEEKLY_EARNINGS)} a week). You may be able to claim Maternity Allowance instead.`,
			secondaryMetrics: [
				{ label: `Weeks 1–${SMP_HIGH_RATE_WEEKS} (90% of earnings)`, value: money(eligible ? high : 0) },
				{ label: `Weeks ${SMP_HIGH_RATE_WEEKS + 1}–${SMP_TOTAL_WEEKS}`, value: money(eligible ? low : 0) },
				{ label: 'Paid weeks', value: num(eligible ? SMP_TOTAL_WEEKS : 0) },
				{ label: 'Flat rate cap', value: money(SMP_FLAT_RATE) },
				{ label: 'Average over 39 weeks', value: money(eligible ? total / SMP_TOTAL_WEEKS : 0) }
			],
			table: {
				title: 'Weekly SMP schedule',
				collapsed: true,
				columns: [
					{ key: 'week', label: 'Week' },
					{ key: 'rate', label: 'SMP (before tax)', align: 'end' },
					{ key: 'total', label: 'Running total', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro: `Work out Statutory Maternity Pay (SMP) in the UK for ${UK_TAX_YEAR}. You get ${SMP_HIGH_RATE_WEEKS} weeks at ${pc(SMP_HIGH_RATE_PERCENT)} of your average weekly earnings. Then you get up to ${LOW_WEEKS} weeks at the lower of ${gbp2(SMP_FLAT_RATE)} or ${pc(SMP_HIGH_RATE_PERCENT)} of earnings.`,
		howTo: [
			'Enter your average weekly earnings, worked out from your pay in the 8-week period linked to the qualifying week.',
			'Say whether you have worked for the same employer for 26 weeks by the qualifying week. This is the 15th week before the baby is due.',
			'Read your weekly rates, your total SMP and the week-by-week schedule.'
		],
		about: [
			{
				heading: 'What is Statutory Maternity Pay?',
				paragraphs: [
					`Statutory Maternity Pay is the minimum pay your employer must give you while you are on maternity leave, if you qualify. It lasts up to ${SMP_TOTAL_WEEKS} weeks. Your employer pays it through payroll, so it arrives like normal pay.`,
					`To qualify, you must be an employee who has worked for your employer for at least 26 weeks by the qualifying week. You must also earn on average at least ${gbp(SMP_MIN_WEEKLY_EARNINGS)} a week and give your employer the right notice and proof of pregnancy. Some contracts pay more than SMP, so ask your employer about an enhanced scheme. Also, check your leave dates and your payslips early, because a clear plan makes the weeks of lower pay easier to manage.`
				]
			},
			{
				heading: 'How SMP is calculated',
				paragraphs: [
					`SMP has two stages. For the first ${SMP_HIGH_RATE_WEEKS} weeks you get ${pc(SMP_HIGH_RATE_PERCENT)} of your average weekly earnings, with no upper limit. For the remaining ${LOW_WEEKS} weeks you get the lower of ${gbp2(SMP_FLAT_RATE)} and ${pc(SMP_HIGH_RATE_PERCENT)} of your earnings.`,
					'This means the second stage is much lower for most people. If your earnings are low, the two stages can even be equal, because 90% of earnings is below the flat rate.'
				],
				table: {
					caption: `SMP at three earnings levels, ${UK_TAX_YEAR}, before tax`,
					columns: ['Average weekly earnings', `Weeks 1 to ${SMP_HIGH_RATE_WEEKS}`, `Weeks ${SMP_HIGH_RATE_WEEKS + 1} to ${SMP_TOTAL_WEEKS}`, `Total over ${SMP_TOTAL_WEEKS} weeks`],
					rows: [200, 400, EX_AWE].map((a) => {
						const r = smpFor(a);
						return [gbp(a), `${gbp2(r.high)} a week`, `${gbp2(r.low)} a week`, gbp2(r.total)];
					})
				}
			},
			{
				heading: 'What if you do not qualify?',
				paragraphs: [
					'If you do not meet the rules, your employer must tell you why in writing, using form SMP1. You may still be able to claim Maternity Allowance, which is paid by the government instead. This calculator does not work out Maternity Allowance.',
					'The rates here come from GOV.UK. If you live in Northern Ireland, check nidirect as well, because some rules are set separately.'
				]
			},
			{
				heading: 'Tax and planning your budget',
				paragraphs: [
					'SMP is taxed. Your employer takes off income tax and National Insurance, so the amount in your bank account is lower than the figures here. As a result, it helps to work out your monthly bills against the take-home figure, not the gross figure. The [UK take-home pay calculator](/uk-take-home-pay-calculator) shows how deductions work on normal pay.',
					'If you are planning a move, the [UK mortgage calculator](/uk-mortgage-calculator) and [stamp duty calculator](/stamp-duty-calculator) help you budget for housing costs while your income is lower. Pay during illness is covered by the [statutory sick pay calculator](/statutory-sick-pay-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Statutory Maternity Pay',
				expression: `Weeks 1–${SMP_HIGH_RATE_WEEKS}: ${pc(SMP_HIGH_RATE_PERCENT)} × AWE. Weeks ${SMP_HIGH_RATE_WEEKS + 1}–${SMP_TOTAL_WEEKS}: the lower of ${gbp2(SMP_FLAT_RATE)} and ${pc(SMP_HIGH_RATE_PERCENT)} × AWE.`,
				variables: [{ symbol: 'AWE', meaning: `average weekly earnings (must be at least ${gbp(SMP_MIN_WEEKLY_EARNINGS)} a week to qualify)` }]
			}
		],
		example: {
			title: `Average weekly earnings of ${gbp(EX_AWE)}`,
			steps: [
				`Weeks 1–${SMP_HIGH_RATE_WEEKS}: ${pc(SMP_HIGH_RATE_PERCENT)} × ${gbp(EX_AWE)} = ${gbp2(EX.high)} a week, so ${gbp2(EX.high * SMP_HIGH_RATE_WEEKS)}`,
				`Weeks ${SMP_HIGH_RATE_WEEKS + 1}–${SMP_TOTAL_WEEKS}: ${pc(SMP_HIGH_RATE_PERCENT)} × ${gbp(EX_AWE)} = ${gbp2(EX.high)} is above ${gbp2(SMP_FLAT_RATE)}, so ${gbp2(SMP_FLAT_RATE)} a week × ${LOW_WEEKS} = ${gbp2(EX.low * LOW_WEEKS)}`
			],
			result: `Total SMP of ${gbp2(EX.total)} over ${SMP_TOTAL_WEEKS} weeks.`
		},
		faq: [
			{
				q: 'How much Statutory Maternity Pay will I get?',
				a: `For ${SMP_HIGH_RATE_WEEKS} weeks you get ${pc(SMP_HIGH_RATE_PERCENT)} of your average weekly earnings. For ${LOW_WEEKS} weeks after that you get the lower of ${gbp2(SMP_FLAT_RATE)} and ${pc(SMP_HIGH_RATE_PERCENT)} of earnings. On ${gbp(EX_AWE)} a week, that totals ${gbp2(EX.total)} before tax.`
			},
			{
				q: 'Do I qualify for SMP?',
				a: `You must be an employee who has worked for your employer continuously for at least 26 weeks into the qualifying week (the 15th week before the due date). You must also earn on average at least ${gbp(SMP_MIN_WEEKLY_EARNINGS)} a week, and give the correct notice and proof of pregnancy.`
			},
			{
				q: 'What if I do not qualify?',
				a: 'Your employer must give you form SMP1 explaining why. You may be able to claim Maternity Allowance instead. This calculator does not work out Maternity Allowance.'
			},
			{
				q: 'Is SMP taxed?',
				a: 'Yes. SMP is paid like normal pay, with income tax and National Insurance taken off. The figures here are before deductions.'
			},
			{
				q: 'Why does the rate change after six weeks?',
				a: `The law pays ${pc(SMP_HIGH_RATE_PERCENT)} of earnings for the first ${SMP_HIGH_RATE_WEEKS} weeks, then a lower flat rate for the rest. The flat rate rises each April, so check the figure for your tax year.`
			}
		],
		sources: [UK_RATES_SOURCE, SMP_SOURCE],
		disclaimer: `Estimate. The ${gbp2(SMP_FLAT_RATE)} rate applies to SMP weeks starting from 5 April 2026 and is uprated each April. Your employer’s payroll may differ by a penny because of rounding.`
	}
});
