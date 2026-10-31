import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, num, pct } from '../format';
import meta from './interest-calculator.meta';

/** Compounding periods per year. */
const PERIODS: Record<string, number> = { annually: 1, quarterly: 4, monthly: 12, daily: 365 };

const compound = (v: InputValues) => v.method === 'compound';

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'principal', label: 'Principal', type: 'number', default: 5000, min: 0, max: 1_000_000_000, step: 100, prefix: '$' },
		{ id: 'rate', label: 'Annual interest rate', type: 'number', default: 5, min: 0, max: 100, step: 0.01, suffix: '%' },
		{ id: 'years', label: 'Term', type: 'number', default: 5, min: 0.01, max: 100, step: 0.5, suffix: 'years' },
		{
			id: 'method',
			label: 'Interest type',
			type: 'select',
			display: 'segmented',
			default: 'compound',
			options: [
				{ label: 'Simple', value: 'simple' },
				{ label: 'Compound', value: 'compound' }
			]
		},
		{
			id: 'compounding',
			label: 'Compounding',
			type: 'select',
			display: 'menu',
			default: 'monthly',
			visibleWhen: compound,
			options: [
				{ label: 'Annually', value: 'annually' },
				{ label: 'Quarterly', value: 'quarterly' },
				{ label: 'Monthly', value: 'monthly' },
				{ label: 'Daily', value: 'daily' }
			]
		}
	],
	calculate(v): CalculationResult {
		const principal = Number(v.principal);
		const rate = Number(v.rate);
		const years = Number(v.years);
		const method = String(v.method);
		const isCompound = method === 'compound';
		const n = PERIODS[String(v.compounding)];
		if (
			!(principal > 0) ||
			!(rate >= 0 && rate <= 100) ||
			!(years > 0 && years <= 100) ||
			(method !== 'simple' && method !== 'compound') ||
			(isCompound && n === undefined)
		) {
			return { primaryResult: DASH, primaryLabel: 'Ending balance', summary: 'Check the principal, rate and term.' };
		}

		let ending: number;
		if (isCompound) {
			ending = principal * Math.pow(1 + rate / 100 / n, n * years);
		} else {
			ending = principal + principal * (rate / 100) * years;
		}
		const interest = ending - principal;
		const methodLabel = isCompound ? `compounded ${String(v.compounding)}` : 'with simple interest';

		return {
			primaryResult: money(ending),
			primaryLabel: 'Ending balance',
			summary: `${money(principal)} at ${num(rate, 2)}% for ${num(years, 2)} years ${methodLabel}.`,
			secondaryMetrics: [
				{ label: 'Interest earned', value: money(interest) },
				{ label: 'Growth on principal', value: pct((interest / principal) * 100, 2) },
				{
					label: 'Compounding periods',
					value: isCompound ? `${num(n * years, 1)} periods` : 'Not compounded'
				}
			]
		};
	},
	content: {
		intro:
			'Use this interest calculator to find the interest on a deposit or a loan, with either simple or compound interest. Enter the principal, the rate and the term, and compare the two methods side by side.',
		howTo: [
			'Enter the principal (the amount you deposit or borrow) and the yearly interest rate.',
			'Enter the term in years. You can use decimals, so 0.5 means six months.',
			'Choose simple or compound interest. For compound, pick how often interest is added.',
			'Read the ending balance and the interest earned, then switch the method to compare.'
		],
		about: [
			{
				heading: 'What is interest?',
				paragraphs: [
					'Interest is the price of using money. For example, when you save, the bank pays you interest. When you borrow, you pay the lender interest. Either way, it is a percentage of the principal for a period of time.',
					'The rate is usually quoted per year. However, how that rate is applied to your balance depends on whether the interest is simple or compound.'
				]
			},
			{
				heading: 'Simple interest and compound interest',
				paragraphs: [
					'With simple interest, you earn only on the principal. As a result, the interest is the same every year. The [simple interest calculator](/simple-interest-calculator) covers this in detail.',
					'With compound interest, each payment of interest joins the balance and starts to earn interest too. As a result, the balance grows faster each period. Also, you can add monthly savings in the [compound interest calculator](/compound-interest-calculator).'
				]
			},
			{
				heading: 'How the compounding schedule changes the result',
				paragraphs: [
					'The more often interest is added, the more you earn. However, the effect is modest. The table below uses $5,000 at 5% for 5 years.'
				],
				table: {
					caption: '$5,000 at 5% for 5 years',
					columns: ['Method', 'Ending balance', 'Interest earned'],
					rows: [
						['Simple', '$6,250.00', '$1,250.00'],
						['Compound, annually', '$6,381.41', '$1,381.41'],
						['Compound, quarterly', '$6,410.19', '$1,410.19'],
						['Compound, monthly', '$6,416.79', '$1,416.79'],
						['Compound, daily', '$6,420.02', '$1,420.02']
					]
				}
			},
			{
				heading: 'Why the term matters more than the schedule',
				paragraphs: [
					'The gap between simple and compound interest widens as the years pass. For example, the next table uses the same $5,000 at 5%, with annual compounding.'
				],
				table: {
					caption: '$5,000 at 5%, simple compared with annual compounding',
					columns: ['Term', 'Simple interest', 'Compound interest'],
					rows: [
						['5 years', '$1,250.00', '$1,381.41'],
						['10 years', '$2,500.00', '$3,144.47'],
						['20 years', '$5,000.00', '$8,266.49']
					]
				}
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The ending balance is the principal plus all the interest. If you are saving, this is what you could have at the end. If you are borrowing and repay everything in one payment at the end, it is what you would owe.',
					'The growth on principal line shows the interest as a share of what you started with. For example, 28.34% means each $100 of principal turned into about $128.34. So it is easy to compare offers with different terms.',
					'Also, the tool assumes you make no deposits or withdrawals during the term.'
				]
			},
			{
				heading: 'Tips for using this calculator',
				paragraphs: ['A few habits make the numbers more useful:'],
				list: [
					'**Match the method to your product.** Savings accounts usually compound. Some short loans use simple interest.',
					'**Check the compounding schedule.** Your bank or contract will state it, often in the small print.',
					'**Look at the effective rate.** A quoted rate and the yield you actually get can differ. The [APR calculator](/apr-calculator) helps with loans.',
					'**Add regular deposits separately.** For monthly saving, use the [savings calculator](/savings-calculator).',
					'**Work out an unknown rate.** If you know the payment on a loan, the [interest rate calculator](/interest-rate-calculator) finds the rate.'
				]
			}
		],
		formulas: [
			{
				title: 'Simple interest',
				expression: 'A = P × (1 + r × t)',
				variables: [
					{ symbol: 'A', meaning: 'ending balance' },
					{ symbol: 'P', meaning: 'principal' },
					{ symbol: 'r', meaning: 'annual interest rate as a decimal (5% is 0.05)' },
					{ symbol: 't', meaning: 'term in years' }
				]
			},
			{
				title: 'Compound interest',
				expression: 'A = P × (1 + r ÷ n)^(n × t)',
				variables: [
					{ symbol: 'n', meaning: 'compounding periods per year (1, 4, 12 or 365)' },
					{ symbol: 'A, P, r, t', meaning: 'as above' }
				]
			}
		],
		example: {
			title: '$5,000 at 5% for 5 years, compounded monthly',
			steps: [
				'Rate per month: 0.05 ÷ 12 ≈ 0.0041667',
				'Periods: 12 × 5 = 60',
				'Ending balance: 5,000 × (1.0041667)⁶⁰ ≈ $6,416.79',
				'Interest earned: $6,416.79 − $5,000 = $1,416.79',
				'For comparison, simple interest gives $5,000 × 0.05 × 5 = $1,250.00'
			],
			result: 'Ending balance ≈ $6,416.79, with $1,416.79 of interest earned. Simple interest would earn $1,250.00.'
		},
		faq: [
			{
				q: 'How do you calculate interest?',
				a: 'For simple interest, multiply the principal by the rate and by the years. For compound interest, grow the principal by (1 + rate ÷ periods) once for each compounding period. This calculator does both.'
			},
			{
				q: 'What is the difference between simple and compound interest?',
				a: 'Simple interest is paid on the principal only. Compound interest is paid on the principal plus interest already earned. Over long terms, compound interest is much larger.'
			},
			{
				q: 'Does daily compounding pay much more than monthly?',
				a: 'No. On $5,000 at 5% for 5 years, daily compounding earns about $3 more than monthly. The rate and the term matter far more.'
			},
			{
				q: 'Can I use a term shorter than one year?',
				a: 'Yes. Enter a decimal, such as 0.5 for six months or 0.25 for three months. The smallest term is 0.01 years.'
			},
			{
				q: 'Is the interest I pay on a loan calculated this way?',
				a: 'Not always. Most loans charge interest on a falling balance as you repay. For loan payments, use the loan or mortgage calculator instead.'
			},
			{
				q: 'Does this tool include tax or fees?',
				a: 'No. It shows interest only. Taxes, account fees and changes in the rate can all change what you actually receive or pay.'
			}
		],
		sources: [
			{ title: 'Investor.gov (U.S. SEC) — Compounding interest', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compounding-interest' },
			{ title: 'Investor.gov (U.S. SEC) — Compound Interest Calculator', url: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator' }
		],
		disclaimer:
			'Estimates only. Investment returns are not guaranteed, and past returns do not predict future ones. This tool does not include tax or fees and is not financial advice.'
	}
});
