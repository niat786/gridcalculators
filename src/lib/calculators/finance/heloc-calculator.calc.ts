import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, pct, plural } from '../format';
import meta from './heloc-calculator.meta';

const isNum = (x: number, lo: number, hi: number) => Number.isFinite(x) && x >= lo && x <= hi;

/** Amortized payment over n months: M = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), with r = 0 → P ÷ n. */
function amortizedPayment(principal: number, annualPct: number, months: number): number {
	const r = annualPct / 1200;
	if (r === 0) return principal / months;
	const f = Math.pow(1 + r, months);
	return (principal * r * f) / (f - 1);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'drawn', label: 'Amount drawn', type: 'number', default: 50000, min: 1, max: 10_000_000, step: 1000, prefix: '$' },
		{
			id: 'rate',
			label: 'Interest rate',
			type: 'number',
			default: 8.5,
			min: 0,
			max: 30,
			step: 0.01,
			suffix: '%',
			help: 'Annual rate. Many lines are variable; this assumes it stays the same.'
		},
		{
			id: 'drawYears',
			label: 'Draw period',
			type: 'number',
			default: 10,
			min: 0,
			max: 30,
			step: 1,
			suffix: 'years',
			decimal: false,
			help: 'Years you can borrow and pay interest only'
		},
		{
			id: 'repayYears',
			label: 'Repayment period',
			type: 'number',
			default: 20,
			min: 1,
			max: 30,
			step: 1,
			suffix: 'years',
			decimal: false,
			help: 'Years to pay back the balance after the draw period'
		}
	],
	calculate(v): CalculationResult {
		const drawn = Number(v.drawn);
		const rate = Number(v.rate);
		const drawYears = Number(v.drawYears);
		const repayYears = Number(v.repayYears);

		if (
			!isNum(drawn, 1, 1e9) ||
			!isNum(rate, 0, 30) ||
			!isNum(drawYears, 0, 30) ||
			!isNum(repayYears, 1, 30) ||
			!Number.isInteger(drawYears) ||
			!Number.isInteger(repayYears)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Payment during draw period',
				summary: 'Enter the amount drawn, the rate, and whole-year draw and repayment periods.'
			};
		}

		const drawMonths = drawYears * 12;
		const repayMonths = repayYears * 12;
		const interestOnly = drawn * (rate / 1200);
		const repayment = amortizedPayment(drawn, rate, repayMonths);
		const totalInterest = interestOnly * drawMonths + repayment * repayMonths - drawn;
		const totalRepaid = drawn + totalInterest;

		return {
			primaryResult: money(interestOnly),
			primaryLabel: 'Payment during draw period',
			summary: `${money(drawn)} at ${pct(rate, 2)}: interest only for ${plural(drawYears, 'year')}, then repaid over ${plural(repayYears, 'year')}.`,
			secondaryMetrics: [
				{ label: 'Repayment payment', value: money(repayment) },
				{ label: 'Payment increase at repayment', value: money(repayment - interestOnly) },
				{ label: 'Draw period', value: plural(drawYears, 'year') },
				{ label: 'Repayment period', value: plural(repayYears, 'year') },
				{ label: 'Total interest', value: money(totalInterest) },
				{ label: 'Total repaid', value: money(totalRepaid) }
			]
		};
	},
	content: {
		intro:
			'Use this HELOC calculator to estimate the payments on a home equity line of credit. It shows the interest-only payment in the draw period and the higher payment when repayment starts.',
		howTo: [
			'Enter the amount you have drawn from the line.',
			'Enter the interest rate. Many lines have a variable rate, so this assumes it stays the same.',
			'Enter the draw period in years and the repayment period in years.',
			'Compare the draw-period payment with the repayment payment, and read the total interest.',
		],
		about: [
			{
				heading: 'What is a HELOC?',
				paragraphs: [
					'A HELOC is a home equity line of credit. It is a revolving credit line secured by your home. You borrow against the equity, which is the value of your home minus what you owe on the mortgage.',
					'A HELOC works in two stages. During the **draw period**, you can borrow and often pay interest only. In the **repayment period**, you can no longer borrow, and you pay back principal and interest.',
				]
			},
			{
				heading: 'Why the payment jumps',
				paragraphs: [
					'In the draw period, the payment is just the monthly interest on what you have drawn. That feels cheap, but the balance never goes down. When repayment starts, the payment rises.',
					'For example, $50,000 at 8.5% costs $354.17 a month in the draw period. After 10 years, repayment over 20 years costs $433.91 a month. That is $79.74 more. Total interest comes to $96,638.79.',
					'So plan for the higher payment now, because it arrives on a set date.',
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The headline is the payment during the draw period. It is interest only, so it stays low. Below it you see the payment that starts when repayment begins, and how much it rises.',
					'Total interest covers both stages. Total repaid adds back the amount you borrowed. Use both to compare a HELOC with other loans, such as a [home equity loan](/home-equity-loan-calculator) or a [personal loan](/personal-loan-calculator).',
				]
			},
			{
				heading: 'How the rate and draw period change the cost',
				paragraphs: [
					'A shorter draw period means less interest paid on the balance that never falls. A higher rate raises every payment. The table uses a $50,000 balance with a 20-year repayment period.',
				],
				table: {
					caption: 'A $50,000 HELOC balance, 20-year repayment period',
					columns: ['Case', 'Draw payment', 'Repayment payment', 'Total interest'],
					rows: [
						['8.5%, 10-year draw', '$354.17', '$433.91', '$96,638.79'],
						['8.5%, 5-year draw', '$354.17', '$433.91', '$75,388.79'],
						['10.5%, 10-year draw', '$437.50', '$499.19', '$122,305.59'],
					]
				}
			},
			{
				heading: 'Things to know before you open a line',
				paragraphs: [
					'A HELOC is flexible, but it carries risks:',
				],
				list: [
					'**Your home is the security.** If you can’t pay, you could lose it.',
					'**The rate often varies.** A rise of 2 points moves the $50,000 example from $354.17 to $437.50 a month in the draw period.',
					'**Pay principal early.** Paying more than the interest in the draw period cuts the later jump.',
					'**Compare a fixed loan.** The [home equity loan calculator](/home-equity-loan-calculator) shows a lump sum with a fixed rate.',
				]
			},
			{
				heading: 'HELOCs in different countries',
				paragraphs: [
					'HELOCs are common in the US and Canada. Other countries may offer similar products under other names, or none at all. Rules on limits, fees and tax treatment differ, so check with a local lender or adviser.',
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'It assumes you draw the full amount at the start and never borrow more. It also assumes a fixed rate. Real HELOCs let you draw and repay many times, and fees may apply. For the effect on your home budget, check the [mortgage calculator](/mortgage-calculator).',
				]
			}
		],
		formulas: [
			{
				title: 'Draw period (interest only)',
				expression: 'M = B × r        where r = annual rate ÷ 12 ÷ 100',
				variables: [{ symbol: 'B', meaning: 'balance drawn on the line' }]
			},
			{
				title: 'Repayment period (amortized)',
				expression: 'M = B × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)',
				variables: [{ symbol: 'n', meaning: 'number of repayment months: repayment years × 12' }]
			},
			{
				title: 'Total interest',
				expression: 'Total interest = B × r × d + M × n − B',
				variables: [
					{ symbol: 'd', meaning: 'number of draw-period months' },
					{ symbol: 'M × n', meaning: 'total of the repayment payments' }
				]
			}
		],
		example: {
			title: '$50,000 drawn at 8.5%, with a 10-year draw period and a 20-year repayment period',
			steps: [
				'Draw-period payment: $50,000 × (0.085 ÷ 12) = $354.17 a month',
				'Repayment payment over 240 months: $50,000 × 0.0070833 × (1.0070833)^240 ÷ ((1.0070833)^240 − 1) ≈ $433.91',
				'Interest during draw = $354.17 × 120 = $42,500.00',
				'Total interest = $42,500.00 + $433.91 × 240 − $50,000 ≈ $96,638.79'
			],
			result: 'A payment of $354.17 a month during the draw period, rising to $433.91 during repayment, with total interest of $96,638.79.'
		},
		faq: [
			{
				q: 'How is a HELOC payment calculated?',
				a: 'In the draw period, the payment is the balance times the monthly rate. In the repayment period, it uses the standard loan formula over the repayment years. This calculator shows both.'
			},
			{
				q: 'What is the difference between a HELOC and a home equity loan?',
				a: 'A HELOC is a credit line you can draw on over time, usually at a variable rate. A home equity loan is a lump sum with fixed payments. See the [home equity loan calculator](/home-equity-loan-calculator).'
			},
			{
				q: 'Why is my HELOC payment going up?',
				a: 'Either the draw period ended and repayment began, or the variable rate rose. Check your statement and loan terms.'
			},
			{
				q: 'Can I pay a HELOC off early?',
				a: 'Usually yes, but some lenders charge a fee if you close the line early. Read your agreement.'
			},
			{
				q: 'Does this calculator include a rate change?',
				a: 'No. It assumes the rate stays the same for the whole term. Run it again with a higher rate to see the risk.'
			},
			{
				q: 'Is a HELOC a good idea?',
				a: 'It can be, for costs that come in stages, like a home project. But the variable rate and the payment jump are real risks. Also, your home secures the line, so borrow only what you can repay.'
			},
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau: What is a HELOC?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-heloc-en-247/' },
			{ title: 'Consumer Financial Protection Bureau', url: 'https://www.consumerfinance.gov/' },
		],
		disclaimer:
			'Estimates only. HELOC rates, limits and fees vary by lender and country. Borrowing against your home puts it at risk if you miss payments.'
	}
});
