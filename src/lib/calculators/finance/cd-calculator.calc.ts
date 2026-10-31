import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, pct, plural } from '../format';
import meta from './cd-calculator.meta';

/** Compounding periods per year. */
const PERIODS: Record<string, number> = { annually: 1, quarterly: 4, monthly: 12, daily: 365 };

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'deposit', label: 'Deposit', type: 'number', default: 10000, min: 0, max: 100_000_000, step: 100, prefix: '$' },
		{
			id: 'basis',
			label: 'Rate type',
			type: 'select',
			display: 'segmented',
			default: 'apy',
			options: [
				{ label: 'APY', value: 'apy' },
				{ label: 'APR', value: 'apr' }
			]
		},
		{
			id: 'rate',
			label: 'Rate',
			type: 'number',
			default: 4.5,
			min: 0,
			max: 100,
			step: 0.01,
			suffix: '%',
			help: 'The rate printed on the CD.'
		},
		{ id: 'months', label: 'Term', type: 'number', default: 12, min: 1, max: 360, step: 1, suffix: 'months', decimal: false },
		{
			id: 'compounding',
			label: 'Compounding',
			type: 'select',
			display: 'menu',
			default: 'monthly',
			options: [
				{ label: 'Annually', value: 'annually' },
				{ label: 'Quarterly', value: 'quarterly' },
				{ label: 'Monthly', value: 'monthly' },
				{ label: 'Daily', value: 'daily' }
			]
		}
	],
	calculate(v): CalculationResult {
		const deposit = Number(v.deposit);
		const rate = Number(v.rate);
		const months = Number(v.months);
		const basis = String(v.basis);
		const n = PERIODS[String(v.compounding)];
		if (
			!(deposit >= 0) ||
			!(rate >= 0 && rate <= 100) ||
			!(Number.isInteger(months) && months >= 1 && months <= 360) ||
			(basis !== 'apy' && basis !== 'apr') ||
			n === undefined
		) {
			return { primaryResult: DASH, primaryLabel: 'Value at maturity', summary: 'Check the deposit, rate and term.' };
		}

		const decimalRate = rate / 100;
		let periodRate: number;
		let apy: number;
		if (basis === 'apy') {
			// Convert APY to the rate for one compounding period: (1 + APY)^(1/n) − 1.
			apy = decimalRate;
			periodRate = Math.pow(1 + apy, 1 / n) - 1;
		} else {
			// APR is split evenly across the periods: r ÷ n. APY is what that adds up to.
			periodRate = decimalRate / n;
			apy = Math.pow(1 + periodRate, n) - 1;
		}

		const years = months / 12;
		const maturity = deposit * Math.pow(1 + periodRate, n * years);
		const interest = maturity - deposit;

		return {
			primaryResult: money(maturity),
			primaryLabel: 'Value at maturity',
			summary: `${money(deposit)} for ${plural(months, 'month')} earns ${money(interest)} in interest at ${pct(apy * 100, 3)} APY.`,
			secondaryMetrics: [
				{ label: 'Interest earned', value: money(interest) },
				{ label: 'Annual percentage yield', value: pct(apy * 100, 3) },
				{ label: 'Rate per compounding period', value: pct(periodRate * 100, 4) }
			]
		};
	},
	content: {
		intro:
			'Use this CD calculator to see what a certificate of deposit (CD) will be worth when it matures. Enter your deposit, the rate and the term to see the interest you earn and the APY.',
		howTo: [
			'Enter the amount you will deposit.',
			'Choose whether the rate printed on the CD is an APY or an APR, then enter it.',
			'Enter the term in months and pick how often interest is added. The schedule only matters for an APR.',
			'Read the value at maturity, the interest earned and the annual percentage yield.'
		],
		about: [
			{
				heading: 'What is a certificate of deposit?',
				paragraphs: [
					'A CD is a savings product where you leave a sum with a bank for a fixed term, such as 6 months or 5 years. In return, the bank pays a fixed rate. If you take the money out early, you usually pay a penalty.',
					'The name “CD” is mostly used in the US. Similar products have other names, such as term deposits, fixed deposits or guaranteed investment certificates. The maths is the same, so this calculator works for them all. For India, see the [FD calculator](/fd-calculator).'
				]
			},
			{
				heading: 'APY and APR: what is the difference?',
				paragraphs: [
					'The APR (annual percentage rate) is the simple yearly rate before compounding. The APY (annual percentage yield) includes the effect of compounding, so it shows what you earn in a full year.',
					'When a bank quotes an APY, the compounding schedule is already built in. That is why the schedule setting does not change the result in APY mode. When you enter an APR, the schedule does matter, and the calculator shows the APY it produces.'
				]
			},
			{
				heading: 'How a CD value is calculated',
				paragraphs: [
					'The calculator finds the rate for one compounding period, then multiplies your deposit by (1 + that rate) for every period in the term. The formulas are below.',
					'Because interest compounds, a long term grows faster than simple interest would. For plain interest on a deposit, see the [simple interest calculator](/simple-interest-calculator).'
				]
			},
			{
				heading: 'How term and compounding change the result',
				paragraphs: [
					'The first table uses $10,000 at a 4.5% APY. The second uses a 4.5% APR for 12 months, so you can see the schedule at work.'
				],
				table: {
					caption: '$10,000 at a 4.5% APY',
					columns: ['Term', 'Value at maturity', 'Interest earned'],
					rows: [
						['6 months', '$10,222.52', '$222.52'],
						['12 months', '$10,450.00', '$450.00'],
						['24 months', '$10,920.25', '$920.25'],
						['60 months', '$12,461.82', '$2,461.82']
					]
				}
			},
			{
				heading: 'Same APR, different compounding',
				paragraphs: [
					'A more frequent schedule pays a little more, and it raises the APY.'
				],
				table: {
					caption: '$10,000 at a 4.5% APR for 12 months',
					columns: ['Compounding', 'Value at maturity', 'APY'],
					rows: [
						['Annually', '$10,450.00', '4.5%'],
						['Quarterly', '$10,457.65', '4.577%'],
						['Monthly', '$10,459.40', '4.594%'],
						['Daily', '$10,460.25', '4.602%']
					]
				}
			},
			{
				heading: 'Things to check before you open a CD',
				paragraphs: ['A higher rate is not the only thing that matters. These points are worth a look:'],
				list: [
					'**Early withdrawal penalty.** Ask how much it is, because it can wipe out the interest.',
					'**Deposit protection.** Many countries insure bank deposits up to a limit. Check the limit where you live.',
					'**Tax.** Interest is taxed in many countries. This calculator does not include it.',
					'**Inflation.** If prices rise faster than your rate, your money buys less. Test it with the [inflation calculator](/inflation-calculator).',
					'**Other options.** Compare with the [savings calculator](/savings-calculator) for an account you can add to.'
				]
			}
		],
		formulas: [
			{
				title: 'Value at maturity',
				expression: 'FV = P × (1 + i)^(n × t)',
				variables: [
					{ symbol: 'FV', meaning: 'value at maturity' },
					{ symbol: 'P', meaning: 'deposit' },
					{ symbol: 'i', meaning: 'rate per compounding period' },
					{ symbol: 'n', meaning: 'compounding periods per year (1, 4, 12 or 365)' },
					{ symbol: 't', meaning: 'term in years (months ÷ 12)' }
				]
			},
			{
				title: 'Rate per period and APY',
				expression: 'APR rate: i = APR ÷ n and APY = (1 + i)ⁿ − 1.  APY rate: i = (1 + APY)^(1 ÷ n) − 1',
				variables: [
					{ symbol: 'APR', meaning: 'yearly rate before compounding, as a decimal' },
					{ symbol: 'APY', meaning: 'yearly yield after compounding, as a decimal' }
				]
			}
		],
		example: {
			title: '$10,000 at 4.5% APR for 12 months, compounded monthly',
			steps: [
				'Rate per month: 0.045 ÷ 12 = 0.00375',
				'Periods: 12 months = 12 monthly periods',
				'Value: 10,000 × 1.00375¹² ≈ $10,459.40',
				'Interest earned: $10,459.40 − $10,000 = $459.40',
				'APY: (1.00375)¹² − 1 ≈ 4.594%'
			],
			result:
				'Value at maturity ≈ $10,459.40. The 4.5% APR works out to a 4.594% APY because of monthly compounding.'
		},
		faq: [
			{
				q: 'How do I calculate CD interest?',
				a: 'Find the rate for each compounding period, then grow your deposit by that rate for every period in the term. This CD calculator does that and shows the interest you earn and the APY.'
			},
			{
				q: 'What is the difference between APY and APR on a CD?',
				a: 'APR is the yearly rate before compounding. APY includes compounding, so it is the same or higher. Compare CDs by APY, because it puts every offer on the same footing.'
			},
			{
				q: 'Why does the compounding setting not change my result?',
				a: 'In APY mode, the yield already includes compounding. The setting only changes the result when you enter an APR.'
			},
			{
				q: 'What happens if I withdraw my CD early?',
				a: 'Most banks charge a penalty, often a number of months of interest. This calculator assumes you hold the CD to maturity. Check the terms with your bank.'
			},
			{
				q: 'Is a CD the same as a fixed deposit or term deposit?',
				a: 'They are very similar. You lock money for a fixed term at a fixed rate. Names and rules differ by country, but the maths here applies to all of them.'
			},
			{
				q: 'Is the money in a CD safe?',
				a: 'In the US, CDs at FDIC-insured banks are covered up to $250,000 per depositor, per bank, per ownership category. Other countries have their own schemes and limits.'
			}
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau — What is a certificate of deposit (CD)?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-certificate-of-deposit-cd-en-917/' },
			{ title: 'FDIC — Understanding deposit insurance', url: 'https://www.fdic.gov/resources/deposit-insurance/understanding-deposit-insurance' }
		],
		disclaimer:
			'Estimates only. Your bank’s terms, penalties and tax rules apply. This tool is not financial advice.'
	}
});
