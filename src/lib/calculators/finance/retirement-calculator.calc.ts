import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './retirement-calculator.meta';

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'age', label: 'Current age', type: 'number', default: 35, min: 18, max: 90, step: 1, suffix: 'years', decimal: false },
		{ id: 'retireAge', label: 'Retirement age', type: 'number', default: 65, min: 19, max: 100, step: 1, suffix: 'years', decimal: false },
		{ id: 'savings', label: 'Current savings', type: 'number', default: 100000, min: 0, max: 1_000_000_000, step: 1000, prefix: '$' },
		{
			id: 'monthly',
			label: 'Monthly contribution',
			type: 'number',
			default: 1000,
			min: 0,
			max: 1_000_000,
			step: 100,
			prefix: '$',
			suffix: '/mo',
			help: 'Added at the end of each month until you retire.'
		},
		{
			id: 'preReturn',
			label: 'Expected return before retirement',
			type: 'number',
			default: 7,
			min: -20,
			max: 30,
			step: 0.1,
			suffix: '%',
			help: 'Average yearly return while you are working.'
		},
		{ id: 'retireYears', label: 'Years in retirement', type: 'number', default: 25, min: 1, max: 80, step: 1, suffix: 'years', decimal: false },
		{
			id: 'postReturn',
			label: 'Expected return during retirement',
			type: 'number',
			default: 4,
			min: -20,
			max: 30,
			step: 0.1,
			suffix: '%',
			help: 'Average yearly return once you retire.'
		},
		{
			id: 'inflation',
			label: 'Inflation',
			type: 'number',
			default: 2.5,
			min: 0,
			max: 20,
			step: 0.1,
			suffix: '%',
			help: 'Used to show amounts in today’s money.'
		}
	],
	calculate(v): CalculationResult {
		const age = Number(v.age);
		const retireAge = Number(v.retireAge);
		const savings = Number(v.savings);
		const monthly = Number(v.monthly);
		const preReturn = Number(v.preReturn);
		const retireYears = Number(v.retireYears);
		const postReturn = Number(v.postReturn);
		const inflation = Number(v.inflation);
		const label = 'Sustainable monthly income';

		if (
			!(Number.isInteger(age) && age >= 18 && age <= 90) ||
			!(Number.isInteger(retireAge) && retireAge >= 19 && retireAge <= 100) ||
			!(Number.isInteger(retireYears) && retireYears >= 1 && retireYears <= 80) ||
			!(savings >= 0) ||
			!(monthly >= 0) ||
			!(preReturn >= -20 && preReturn <= 30) ||
			!(postReturn >= -20 && postReturn <= 30) ||
			!(inflation >= 0 && inflation <= 20)
		) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Check your ages, savings, returns and inflation.' };
		}
		const yearsToRetire = retireAge - age;
		if (yearsToRetire < 1) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Retirement age must be later than your current age.' };
		}

		// Savings build up with monthly compounding and end-of-month contributions.
		const months = yearsToRetire * 12;
		const i1 = preReturn / 100 / 12;
		const growth1 = Math.pow(1 + i1, months);
		const savingsAtRetirement =
			savings * growth1 + (i1 === 0 ? monthly * months : (monthly * (growth1 - 1)) / i1);
		const inflationFactor = Math.pow(1 + inflation / 100, yearsToRetire);
		const savingsToday = savingsAtRetirement / inflationFactor;

		// Level monthly payout that uses up the savings over the retirement years (annuity payment).
		const i2 = postReturn / 100 / 12;
		const payments = retireYears * 12;
		const income =
			i2 === 0
				? savingsAtRetirement / payments
				: (savingsAtRetirement * i2) / (1 - Math.pow(1 + i2, -payments));
		const incomeToday = income / inflationFactor;

		return {
			primaryResult: money(income),
			primaryLabel: label,
			summary: `Savings of ${money(savingsAtRetirement, true)} at age ${retireAge} can pay this for ${plural(retireYears, 'year')}.`,
			secondaryMetrics: [
				{ label: 'Savings at retirement', value: money(savingsAtRetirement, true) },
				{ label: 'Savings in today’s money', value: money(savingsToday, true) },
				{ label: 'Monthly income in today’s money', value: money(incomeToday) },
				{ label: 'Total you contribute', value: money(savings + monthly * months, true) },
				{ label: 'Total paid out in retirement', value: money(income * payments, true) }
			]
		};
	},
	content: {
		intro: 'Use this retirement calculator to estimate how much your savings could grow by retirement and how much monthly income they could support. Results are shown both in future amounts and at today’s prices.',
		howTo: [
			'Enter your current age, your planned retirement age and how many years you expect to live in retirement.',
			'Enter your current savings and how much you will add each month until you retire.',
			'Enter expected returns before and during retirement, and an inflation rate.',
			'Read the sustainable monthly income, then compare the savings at today’s prices.'
		],
		about: [
			{
				heading: 'How the retirement calculator works',
				paragraphs: [
					'The calculator splits your plan into two stages. First, in the saving stage, you add money every month and it earns a return. Then, in the spending stage, you take out a level amount each month until the money is used up.',
					'You choose the ages, your savings, your monthly contribution and the expected returns. The tool then finds your balance on the day you retire and the monthly income it could pay.'
				]
			},
			{
				heading: 'Future amounts and today’s prices',
				paragraphs: [
					'A large future number can look better than it is. Prices rise over time, so $1 million in 30 years will buy less than $1 million does now. For this reason, the inflation setting lets the calculator divide future amounts by the price rise.',
					'That is why you see two versions of each result. The future amount is what the account will hold, while the today’s-prices amount shows what it is worth in terms of what things cost now.'
				]
			},
			{
				heading: 'How contributions and returns change the result',
				paragraphs: [
					'Both what you save and what you earn matter. For example, the table uses the default plan: age 35 to 65, $100,000 saved, $1,000 a month, and 25 years in retirement at 4%. Only one input changes in each row.'
				],
				table: {
					caption: 'Effect of saving less or earning less',
					columns: ['Plan', 'Savings at 65', 'Monthly income'],
					rows: [
						['$1,000 a month, 7% before retirement', '$2,031,621', '$10,723.64'],
						['$500 a month, 7% before retirement', '$1,421,635', '$7,503.91'],
						['$1,000 a month, 5% before retirement', '$1,279,033', '$6,751.21']
					]
				}
			},
			{
				heading: 'What this estimate leaves out',
				paragraphs: ['The result is a planning guide, because a real retirement has more moving parts:'],
				list: [
					'**Other income.** State pensions, workplace pensions and part-time work are not included. See the [pension calculator](/pension-calculator) and, for the US, the [Social Security calculator](/social-security-calculator).',
					'**Taxes and fees.** Both reduce what you keep.',
					'**Rising spending.** The monthly income stays fixed, so its buying power falls each year.',
					'**Uneven returns.** Markets don’t return the same amount each year. A bad early stretch can hurt a plan.',
					'**Length of life.** You may live longer or shorter than the years you enter.'
				]
			},
			{
				heading: 'Tips for building your plan',
				paragraphs: ['Small steps taken early can matter the most, since time does much of the work:'],
				list: [
					'**Save early.** More years give your money more time to grow. See the effect with the [compound interest calculator](/compound-interest-calculator).',
					'**Raise your savings over time.** Add a little more whenever your pay goes up.',
					'**Test cautious returns.** Try a lower return to see if your plan still works.',
					'**Check the payout stage.** The [annuity payout calculator](/annuity-payout-calculator) shows how long a monthly amount lasts.',
					'**Allow for prices.** Use the [inflation calculator](/inflation-calculator) to test different price rises.'
				]
			}
		],
		formulas: [
			{
				title: 'Savings at retirement',
				expression: 'S = S₀ × (1 + i)ᴹ + C × ((1 + i)ᴹ − 1) ÷ i',
				variables: [
					{ symbol: 'S₀', meaning: 'current savings' },
					{ symbol: 'C', meaning: 'monthly contribution' },
					{ symbol: 'i', meaning: 'monthly return before retirement (annual rate ÷ 12)' },
					{ symbol: 'M', meaning: 'months until retirement (years × 12)' }
				]
			},
			{
				title: 'Sustainable monthly income',
				expression: 'Income = S × j ÷ (1 − (1 + j)^(−N))',
				variables: [
					{ symbol: 'j', meaning: 'monthly return during retirement (annual rate ÷ 12)' },
					{ symbol: 'N', meaning: 'number of retirement months' }
				]
			},
			{
				title: 'Today’s money',
				expression: 'Amount at today’s prices = Amount ÷ (1 + inflation)^(years until retirement)',
				variables: []
			}
		],
		example: {
			title: 'Age 35 to 65, $100,000 saved, $1,000 a month, 7% before and 4% during retirement for 25 years',
			steps: [
				'Years to retirement: 65 − 35 = 30, so 360 months',
				'Monthly return before retirement: 0.07 ÷ 12 ≈ 0.0058333',
				'Savings at retirement: $100,000 × 1.0058333³⁶⁰ + $1,000 × (1.0058333³⁶⁰ − 1) ÷ 0.0058333 ≈ $2,031,620.74',
				'In today’s money: $2,031,620.74 ÷ 1.025³⁰ ≈ $968,560.33',
				'Monthly return in retirement: 0.04 ÷ 12 ≈ 0.0033333, over 300 months',
				'Monthly income: $2,031,620.74 × 0.0033333 ÷ (1 − 1.0033333⁻³⁰⁰) ≈ $10,723.64',
				'In today’s money: $10,723.64 ÷ 1.025³⁰ ≈ $5,112.42'
			],
			result:
				'Sustainable income ≈ $10,723.64 a month. Savings at 65 are about $2,031,621, or $968,560 at today’s prices.'
		},
		faq: [
			{
				q: 'How much do I need to retire?',
				a: 'It depends on how much you want to spend each month, how long you expect to live, and what your other income is. So try different savings and income amounts here until the plan fits your goal.'
			},
			{
				q: 'Why are the results shown at today’s prices?',
				a: 'Inflation reduces what money buys over time, so dividing future amounts by the inflation factor shows what they would be worth at the prices you see now.'
			},
			{
				q: 'Does the monthly income rise with inflation?',
				a: 'No. The income is a fixed payment that lasts the number of years you enter. Its buying power falls over time, which the today’s-prices figure shows at the start of retirement.'
			},
			{
				q: 'What is a safe return to use?',
				a: 'There is no single safe number. Lower returns give a more cautious estimate, so try a few scenarios to see how sensitive the result is.'
			},
			{
				q: 'Does this include state pensions, other pensions or taxes?',
				a: 'No. Other income sources, employer matches, taxes and withdrawal rules are not included. Add any other retirement income to your plan separately.'
			}
		],
		sources: [
			{ title: 'U.S. Bureau of Labor Statistics — Consumer Price Index', url: 'https://www.bls.gov/cpi/' },
			{ title: 'U.S. Securities and Exchange Commission — Investor.gov', url: 'https://www.investor.gov' }
		],
		disclaimer: 'This is an estimate for planning, not financial advice. Real returns vary, can be negative, and inflation can change. Talk to a qualified financial professional before making retirement decisions.'
	}
});
