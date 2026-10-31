import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, pct } from '../format';
import meta from './simple-interest-calculator.meta';

/** Days are counted on a 365-day year. Months are one-twelfth of a year. */
const UNITS_PER_YEAR: Record<string, number> = { days: 365, months: 12, years: 1 };
const UNIT_WORD: Record<string, string> = { days: 'day', months: 'month', years: 'year' };

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'principal', label: 'Principal', type: 'number', default: 2000, min: 0, max: 1_000_000_000, step: 100, prefix: '$' },
		{ id: 'rate', label: 'Interest rate per year', type: 'number', default: 5, min: 0, max: 100, step: 0.01, suffix: '%' },
		{ id: 'time', label: 'Time', type: 'number', default: 3, min: 0, max: 100_000, step: 1 },
		{
			id: 'unit',
			label: 'Time unit',
			type: 'select',
			display: 'segmented',
			default: 'years',
			options: [
				{ label: 'Days', value: 'days' },
				{ label: 'Months', value: 'months' },
				{ label: 'Years', value: 'years' }
			]
		}
	],
	calculate(v): CalculationResult {
		const principal = Number(v.principal);
		const rate = Number(v.rate);
		const time = Number(v.time);
		const unit = String(v.unit);
		const perYear = UNITS_PER_YEAR[unit];
		if (!(principal >= 0) || !(rate >= 0 && rate <= 100) || !(time >= 0) || perYear === undefined) {
			return { primaryResult: DASH, primaryLabel: 'Simple interest earned', summary: 'Check the principal, rate and time.' };
		}

		const years = time / perYear;
		const interest = principal * (rate / 100) * years;
		const total = principal + interest;
		const word = UNIT_WORD[unit];
		const unitText = `${num(time, 2)} ${time === 1 ? word : `${word}s`}`;

		return {
			primaryResult: money(interest),
			primaryLabel: 'Simple interest earned',
			summary: `${money(principal)} at ${num(rate, 2)}% for ${unitText} earns ${money(interest)}.`,
			secondaryMetrics: [
				{ label: 'Total amount', value: money(total) },
				{ label: 'Time in years', value: num(years, 4) },
				{ label: 'Interest per year', value: money(principal * (rate / 100)) }
			]
		};
	},
	content: {
		intro:
			'Use this simple interest calculator to find the interest on a loan or deposit for a number of days, months or years. Simple interest is charged only on the original amount, so it is easy to check by hand.',
		howTo: [
			'Enter the principal (the amount you borrow or deposit).',
			'Enter the yearly interest rate as a percentage.',
			'Enter the time, then choose whether it is in days, months or years.',
			'Read the interest earned and the total amount. The tool also shows the interest for one year.'
		],
		about: [
			{
				heading: 'What is simple interest?',
				paragraphs: [
					'Simple interest is interest worked out on the principal only. The principal is the amount you borrow or deposit at the start. You never pay interest on interest.',
					'Because of this, the interest is the same every year. At 5% on $2,000, you earn $100 each year, whether it is year one or year three.',
					'Short loans, some bonds, and many personal arrangements use simple interest. Most bank savings accounts use [compound interest](/compound-interest-calculator) instead.'
				]
			},
			{
				heading: 'How simple interest is calculated',
				paragraphs: [
					'Multiply the principal by the yearly rate and by the time in years. If your time is in months, divide by 12 first. If it is in days, this calculator divides by 365.',
					'For example, 90 days is 90 ÷ 365, or about 0.2466 years. At 6% on $1,500, the interest is about $22.19.'
				]
			},
			{
				heading: 'Simple interest compared with compound interest',
				paragraphs: [
					'In year one, simple and compound interest give the same answer. After that, compound interest pulls ahead because it also earns interest on the interest.',
					'For example, $2,000 at 5% for 3 years earns $300 in simple interest. With yearly compounding, it earns $315.25. The gap grows quickly with higher rates and longer terms.'
				],
				table: {
					caption: '$10,000 at 8% a year, simple interest',
					columns: ['Time', 'Interest earned', 'Total amount'],
					rows: [
						['6 months', '$400', '$10,400'],
						['1 year', '$800', '$10,800'],
						['3 years', '$2,400', '$12,400']
					]
				}
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The main figure is the interest for the full time you entered. The total amount is the principal plus that interest. If you borrowed, this is what you repay. If you deposited, it is what you collect.',
					'The interest per year line is useful for comparing offers. Doubling the time doubles the interest, because nothing compounds.'
				]
			},
			{
				heading: 'Where you might use it',
				paragraphs: ['The formula is short, so it is handy for quick checks. Here are some common uses:'],
				list: [
					'**Short-term loans.** Check what a friend, a lender or a supplier will charge over a few weeks or months.',
					'**Simple deposits and notes.** Some notes and short deposits pay interest at the end, with no compounding.',
					'**Checking a quote.** If a lender states a flat rate, compare it with the true cost in the [APR calculator](/apr-calculator) or the [loan calculator](/loan-calculator).',
					'**Learning.** Compare your result with the [interest calculator](/interest-calculator) to see how compounding changes the answer.'
				]
			},
			{
				heading: 'What to keep in mind',
				paragraphs: [
					'Banks and lenders may count days differently. Some use 360 days in a year, and some use the exact number of days. This calculator uses 365, so a result from your lender may differ by a few cents.',
					'The tool shows interest only. It does not include fees, tax or any early repayment charges.'
				]
			}
		],
		formulas: [
			{
				title: 'Simple interest',
				expression: 'I = P × r × t',
				variables: [
					{ symbol: 'I', meaning: 'interest earned or charged' },
					{ symbol: 'P', meaning: 'principal, the original amount' },
					{ symbol: 'r', meaning: 'yearly interest rate as a decimal (5% is 0.05)' },
					{ symbol: 't', meaning: 'time in years (days ÷ 365, months ÷ 12)' }
				]
			},
			{
				title: 'Total amount',
				expression: 'A = P + I',
				variables: [{ symbol: 'A', meaning: 'principal plus interest' }]
			}
		],
		example: {
			title: '$1,500 at 6% for 90 days',
			steps: [
				'Time in years: t = 90 ÷ 365 ≈ 0.2466',
				'Interest: I = 1,500 × 0.06 × 0.2466 ≈ $22.19',
				'Total amount: $1,500 + $22.19 = $1,522.19'
			],
			result: 'Interest earned ≈ $22.19, for a total of $1,522.19.'
		},
		faq: [
			{
				q: 'How do you calculate simple interest?',
				a: 'Multiply the principal by the yearly rate and by the time in years. For $2,000 at 5% for 3 years, that is 2,000 × 0.05 × 3 = $300.'
			},
			{
				q: 'What is the difference between simple and compound interest?',
				a: 'Simple interest is paid on the principal only. Compound interest is paid on the principal plus the interest already added, so it grows faster over time.'
			},
			{
				q: 'How do I find simple interest for months or days?',
				a: 'Turn the time into years first. Divide months by 12, or days by 365. Then use the same formula. This calculator does it for you when you pick the time unit.'
			},
			{
				q: 'How many days does the calculator use in a year?',
				a: 'It uses 365 days. Some lenders use 360 days or count the exact days, so their figure can differ slightly.'
			},
			{
				q: 'Can I find the rate or the time instead?',
				a: 'This tool finds the interest and the total. You can rearrange the formula to get the rate, r = I ÷ (P × t), or use the [interest rate calculator](/interest-rate-calculator).'
			},
			{
				q: 'Is simple interest used on bank loans?',
				a: 'Some loans do charge interest on the remaining balance only, which behaves like simple interest each period. Rules differ by country and product, so check your loan agreement.'
			}
		],
		sources: [
			{ title: 'Investor.gov (U.S. SEC) — Compounding interest', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compounding-interest' },
			{ title: 'Investor.gov (U.S. SEC) — Interest rate', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/interest-rate' }
		],
		disclaimer:
			'Estimates only. Your lender or bank may count days or round amounts differently. This tool does not include fees or tax and is not financial advice.'
	}
});
