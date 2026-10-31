import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, num, pct } from '../format';
import meta from './pension-calculator.meta';

/**
 * Present value of a monthly pension that rises by `colaPct` each full year, discounted at
 * `ratePct` per year (effective annual rate, so a month is discounted by (1 + r)^(1/12)).
 * Payment k (k = 1 … months) is paid at the end of month k.
 */
export function pensionPresentValue(monthly: number, colaPct: number, ratePct: number, months: number): number {
	let total = 0;
	for (let k = 1; k <= months; k++) {
		const payment = monthly * Math.pow(1 + colaPct / 100, Math.floor((k - 1) / 12));
		total += payment * Math.pow(1 + ratePct / 100, -k / 12);
	}
	return total;
}

/** Level monthly income that uses up `lump` over `months`, earning `ratePct` per year. */
export function lumpSumMonthlyIncome(lump: number, ratePct: number, months: number): number {
	if (ratePct === 0) return lump / months;
	const i = Math.pow(1 + ratePct / 100, 1 / 12) - 1;
	return (lump * i) / (1 - Math.pow(1 + i, -months));
}

/** Discount rate (%) at which the pension's present value equals the lump sum, or null if outside 0–100%. */
function breakEvenRate(lump: number, monthly: number, colaPct: number, months: number): number | null {
	const gap = (r: number) => pensionPresentValue(monthly, colaPct, r, months) - lump;
	if (gap(0) <= 0) return null;
	if (gap(100) >= 0) return null;
	let lo = 0;
	let hi = 100;
	for (let i = 0; i < 200; i++) {
		const mid = (lo + hi) / 2;
		if (gap(mid) > 0) lo = mid;
		else hi = mid;
	}
	return (lo + hi) / 2;
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'lump', label: 'Lump sum offered', type: 'number', default: 300000, min: 0, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'monthly', label: 'Monthly pension', type: 'number', default: 1500, min: 0, max: 1_000_000, step: 50, prefix: '$', suffix: '/mo', help: 'First year’s monthly payment' },
		{ id: 'retireAge', label: 'Retirement age', type: 'number', default: 65, min: 16, max: 100, step: 1, suffix: 'years' },
		{
			id: 'lifeAge',
			label: 'Life expectancy age',
			type: 'number',
			default: 90,
			min: 16,
			max: 120,
			step: 1,
			suffix: 'years',
			help: 'The age you plan for. Pension years = this minus retirement age.'
		},
		{ id: 'cola', label: 'Yearly cost-of-living increase', type: 'number', default: 0, min: 0, max: 20, step: 0.1, suffix: '%', help: 'Use 0 for a flat pension.' },
		{ id: 'rate', label: 'Discount or investment rate', type: 'number', default: 4, min: 0, max: 30, step: 0.1, suffix: '%', help: 'What your money could earn each year elsewhere.' }
	],
	calculate(v): CalculationResult {
		const lump = Number(v.lump);
		const monthly = Number(v.monthly);
		const retire = Number(v.retireAge);
		const life = Number(v.lifeAge);
		const cola = Number(v.cola);
		const rate = Number(v.rate);
		const years = life - retire;
		const invalid = (): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Present value of pension',
			summary: 'Enter a lump sum, a monthly pension, ages where life expectancy is after retirement, and rates between 0% and 30%.'
		});

		if (!(lump >= 0) || !(monthly >= 0)) return invalid();
		if (!(years >= 1 && years <= 100)) return invalid();
		if (!(cola >= 0 && cola <= 20) || !(rate >= 0 && rate <= 30)) return invalid();

		const months = years * 12;
		const pv = pensionPresentValue(monthly, cola, rate, months);
		let nominal = 0;
		for (let k = 1; k <= months; k++) nominal += monthly * Math.pow(1 + cola / 100, Math.floor((k - 1) / 12));
		const diff = pv - lump;
		const income = lumpSumMonthlyIncome(lump, rate, months);
		const be = breakEvenRate(lump, monthly, cola, months);

		let summary: string;
		if (Math.abs(diff) < 0.5) {
			summary = `At ${pct(rate, 2)}, the pension and the lump sum are worth about the same today.`;
		} else if (diff > 0) {
			summary = `At ${pct(rate, 2)}, the pension is worth ${money(diff)} more than the lump sum in today’s money.`;
		} else {
			summary = `At ${pct(rate, 2)}, the lump sum is worth ${money(-diff)} more than the pension in today’s money.`;
		}

		return {
			primaryResult: money(pv),
			primaryLabel: 'Present value of pension',
			summary,
			secondaryMetrics: [
				{ label: 'Lump sum offered', value: money(lump) },
				{ label: 'Pension minus lump sum', value: money(diff) },
				{ label: 'Monthly income from lump sum', value: money(income) },
				{ label: 'Total pension paid (no discount)', value: money(nominal) },
				{ label: 'Break-even rate', value: be === null ? 'Outside 0–100%' : pct(be, 2) }
			]
		};
	},
	content: {
		intro: 'Use this pension calculator to compare a one-off lump sum with a monthly pension for life. It turns the pension into its value today and shows what the lump sum could pay you each month over the same years.',
		howTo: [
			'Enter the lump sum you are offered and the monthly pension you would receive.',
			'Enter your retirement age and the age you plan to live to. Pension years are the difference.',
			'Add any yearly cost-of-living increase, or leave it at 0 for a flat pension.',
			'Enter the rate your money could earn elsewhere, then compare the present value with the lump sum.'
		],
		about: [
			{
				heading: 'Lump sum or monthly pension?',
				paragraphs: [
					'Some employers and pension schemes let you choose. You can take a single payment now, or a steady income for the rest of your life. Both choices can be fair, but the right one depends on your needs, your health and the rate your money could earn.',
					'The key idea is present value. A payment far in the future is worth less than the same amount today, because money today can earn a return. So this tool adds up all the future pension payments, discounts each one, and compares the total with the lump sum.'
				]
			},
			{
				heading: 'How the comparison works',
				paragraphs: [
					'You enter the lump sum, the monthly pension, your retirement age and the age you plan to live to. The gap between the two ages sets the number of pension years. Also, you can add a yearly cost-of-living increase.',
					'Then you pick a discount rate. This is what your money could earn each year elsewhere. A higher rate makes future payments look smaller, which favours the lump sum. However, a lower rate favours the pension.'
				]
			},
			{
				heading: 'How the discount rate changes the answer',
				paragraphs: ['The table uses a $300,000 lump sum against $1,500 a month for 25 years (ages 65 to 90). The only change is the discount rate, and in the last row, a 2% yearly rise in the pension.'],
				table: {
					caption: 'Present value of the pension against a $300,000 lump sum',
					columns: ['Discount rate', 'Pension worth today', 'Better choice on these numbers'],
					rows: [
						['3%', '$317,723.41', 'Pension, by $17,723.41'],
						['4%', '$286,316.22', 'Lump sum, by $13,683.78'],
						['5%', '$259,453.54', 'Lump sum, by $40,546.46'],
						['4%, pension rises 2% a year', '$352,423.67', 'Pension, by $52,423.67']
					]
				}
			},
			{
				heading: 'What the break-even rate tells you',
				paragraphs: [
					'The break-even rate is the discount rate at which both choices are worth the same. In the example, it is 3.54%. If you believe your money can safely earn more than that, the lump sum looks better. If you expect less, then the pension looks better.',
					'A rising pension has a higher break-even rate. For example, with a 2% yearly increase, the example breaks even at 5.51%.'
				]
			},
			{
				heading: 'Things the numbers can’t show',
				paragraphs: ['Money is only part of the choice, so think about these points before you decide:'],
				list: [
					'**Living longer.** A pension keeps paying if you live past your planned age. A lump sum can run out.',
					'**Inflation.** A flat pension buys less each year. See how prices change with the [inflation calculator](/inflation-calculator).',
					'**Survivors.** Some pensions pay a spouse after you die. Others stop. Ask your plan.',
					'**Tax and rules.** Tax on lump sums and pensions differs by country, and so do rules for transfers.',
					'**The provider.** Check how secure the pension scheme is where you live.'
				]
			},
			{
				heading: 'Next steps',
				paragraphs: [
					'First, to see how a lump sum could be spent over time, try the [annuity payout calculator](/annuity-payout-calculator). Then, for your wider plan, the [retirement calculator](/retirement-calculator) turns savings into income. The [present value calculator](/present-value-calculator) explains the discounting idea on its own.'
				]
			}
		],
		formulas: [
			{
				title: 'Present value of the pension',
				expression: 'PV = Σ P × (1 + c)^⌊(k − 1) ÷ 12⌋ × (1 + r)^(−k ÷ 12),  for k = 1 … 12 × years',
				variables: [
					{ symbol: 'PV', meaning: 'present value of all pension payments, at present value' },
					{ symbol: 'P', meaning: 'monthly pension in the first year' },
					{ symbol: 'c', meaning: 'yearly cost-of-living increase, as a decimal' },
					{ symbol: 'r', meaning: 'discount or investment rate per year, as a decimal' },
					{ symbol: 'k', meaning: 'month number, counting from 1' }
				]
			},
			{
				title: 'Monthly income from the lump sum',
				expression: 'Payment = L × i ÷ (1 − (1 + i)^−n),  where i = (1 + r)^(1/12) − 1',
				variables: [
					{ symbol: 'L', meaning: 'lump sum offered' },
					{ symbol: 'i', meaning: 'monthly rate equivalent to r' },
					{ symbol: 'n', meaning: 'number of months in the pension (years × 12)' }
				]
			}
		],
		example: {
			title: 'A $300,000 lump sum against $1,500 a month for 25 years',
			steps: [
				'Pension years: 90 − 65 = 25, so n = 300 months',
				'Monthly rate equivalent: i = 1.04^(1/12) − 1 = 0.3274%',
				'Present value of $1,500 a month for 300 months at 4% ≈ $286,316.22',
				'Difference: $286,316.22 − $300,000 = −$13,683.78',
				'Lump sum income: $300,000 × 0.3274% ÷ (1 − 1.003274^−300) ≈ $1,571.69 a month'
			],
			result:
				'At 4%, the lump sum is worth $13,683.78 more than the pension at present value. It could pay about $1,571.69 a month for 25 years.'
		},
		faq: [
			{
				q: 'How do I compare a pension and a lump sum?',
				a: 'Find the present value of all the pension payments at a sensible discount rate. Then compare it with the lump sum. Whichever is larger is worth more today on those assumptions.'
			},
			{
				q: 'What discount rate should I use?',
				a: 'Use a rate close to what you could earn on a similar, low-risk investment after tax. A higher rate makes future payments look less valuable, which favours the lump sum.'
			},
			{
				q: 'Why does a cost-of-living increase matter?',
				a: 'A pension that rises each year can be worth much more than a flat one over a long retirement. Enter the increase your plan promises, or 0 if it does not rise.'
			},
			{
				q: 'What is the break-even rate?',
				a: 'It is the discount rate at which the pension and the lump sum are worth the same today. If your own expected return is above it, the lump sum usually wins on these numbers.'
			},
			{
				q: 'Does this include tax or survivor benefits?',
				a: 'No. The figures are before tax and ignore survivor benefits, inflation beyond the increase you enter, and early-payment penalties. Ask your plan administrator for the exact terms.'
			}
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau', url: 'https://www.consumerfinance.gov/' },
			{ title: 'U.S. Social Security Administration', url: 'https://www.ssa.gov/' }
			
		],
		disclaimer: 'Estimates only, before tax and not financial advice. Check the figures with your plan administrator and a qualified adviser before you decide.'
	}
});
