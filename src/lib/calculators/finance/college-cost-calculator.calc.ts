import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, pct, plural } from '../format';
import meta from './college-cost-calculator.meta';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'cost',
			label: 'Yearly cost today',
			type: 'number',
			default: 25000,
			min: 0,
			max: 100_000_000,
			step: 500,
			prefix: '$',
			help: 'Tuition plus room and board for one year, in today’s money.'
		},
		{ id: 'years', label: 'Years until college', type: 'number', default: 10, min: 1, max: 60, step: 1, suffix: 'years', decimal: false, width: 'half' },
		{ id: 'study', label: 'Years of study', type: 'number', default: 4, min: 1, max: 10, step: 1, suffix: 'years', decimal: false, width: 'half' },
		{ id: 'inflation', label: 'Cost increase per year', type: 'number', default: 5, min: 0, max: 30, step: 0.1, suffix: '%' },
		{ id: 'savings', label: 'Current savings', type: 'number', default: 20000, min: 0, max: 100_000_000, step: 500, prefix: '$' },
		{ id: 'ret', label: 'Savings return per year', type: 'number', default: 6, min: 0, max: 30, step: 0.1, suffix: '%' },
		{ id: 'monthly', label: 'Monthly saving', type: 'number', default: 500, min: 0, max: 1_000_000, step: 50, prefix: '$', suffix: '/mo', help: 'What you already set aside each month.' }
	],
	calculate(v): CalculationResult {
		const cost = Number(v.cost);
		const years = Number(v.years);
		const study = Number(v.study);
		const inflation = Number(v.inflation) / 100;
		const savings = Number(v.savings);
		const annualRate = Number(v.ret) / 100;
		const monthly = Number(v.monthly);
		const primaryLabel = 'Total projected cost';

		if (
			!(cost >= 0) || !Number.isFinite(cost) ||
			!Number.isInteger(years) || years < 1 || years > 60 ||
			!Number.isInteger(study) || study < 1 || study > 10 ||
			!(inflation >= 0 && inflation <= 0.3) ||
			!(savings >= 0) || !Number.isFinite(savings) ||
			!(annualRate >= 0 && annualRate <= 0.3) ||
			!(monthly >= 0) || !Number.isFinite(monthly)
		) {
			return { primaryResult: DASH, primaryLabel, summary: 'Check each field. Years are whole numbers from 1 to 60, and years of study from 1 to 10.' };
		}

		// Cost in each year of study. The first year is `years` from now, then rises each year.
		const yearCosts: number[] = [];
		for (let j = 0; j < study; j++) yearCosts.push(cost * Math.pow(1 + inflation, years + j));
		const total = yearCosts.reduce((s, c) => s + c, 0);
		const costAtStart = cost * Math.pow(1 + inflation, years);

		// Savings grow monthly. Monthly saving is added at the end of each month.
		const r = annualRate / 12;
		const months = years * 12;
		const growth = Math.pow(1 + r, months);
		const savingsAtStart = savings * growth + (r === 0 ? monthly * months : (monthly * (growth - 1)) / r);
		const gap = savingsAtStart - total;

		// Monthly saving that exactly covers the total cost, given the growth on current savings.
		const requiredMonthly =
			r === 0
				? Math.max(0, (total - savings) / months)
				: Math.max(0, ((total - savings * growth) * r) / (growth - 1));
		const extra = Math.max(0, requiredMonthly - monthly);

		const summary =
			gap >= 0
				? `Your savings cover the projected cost, with ${money(gap)} to spare.`
				: `Your savings fall ${money(-gap)} short of the projected cost.`;

		return {
			primaryResult: money(total),
			primaryLabel,
			summary,
			secondaryMetrics: [
				{ label: 'Cost in the first year of study', value: money(costAtStart) },
				{ label: 'Projected savings at start', value: money(savingsAtStart) },
				{ label: gap >= 0 ? 'Surplus' : 'Shortfall', value: money(Math.abs(gap)) },
				{ label: 'Total monthly saving needed', value: money(requiredMonthly) },
				{ label: 'Extra monthly saving to close the gap', value: money(extra) }
			],
			table: {
				title: `Cost in each of the ${plural(study, 'year')} of study`,
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year of study' },
					{ key: 'cost', label: 'Cost', align: 'end' }
				],
				rows: yearCosts.map((c, j) => ({ year: `Year ${num(j + 1, 0)}`, cost: money(c) }))
			}
		};
	},
	content: {
		intro:
			'Use this college cost calculator to estimate what a degree could cost by the time you or your child start, and whether your savings will cover it. It adds a yearly rise in costs and the growth of your savings.',
		howTo: [
			'Enter the yearly cost today (tuition plus living costs) and how many years of study you expect.',
			'Enter the years until college starts, and how much the cost rises each year.',
			'Enter your savings today, the yearly return you expect and what you save each month.',
			'Read the total projected cost, then check the surplus or shortfall and the monthly saving needed.'
		],
		about: [
			{
				heading: 'Why plan for the future cost, not today’s',
				paragraphs: [
					'The price of education usually rises over time. If you plan with today’s fees, you will probably save too little. The calculator grows today’s yearly cost by the rate you choose, for every year until the course ends.',
					'The rise is your own estimate. A lower rate gives a smaller bill, and a higher rate gives a bigger one. Check recent fee increases for the course and country you have in mind. The [inflation calculator](/inflation-calculator) shows how general prices have moved over time.'
				]
			},
			{
				heading: 'How the calculator works',
				paragraphs: [
					'First, it works out the cost of each year of study. The first year costs today’s amount grown for the years until college. Each later year rises by the same percentage.',
					'Next, it grows your current savings and your monthly saving until college starts. The difference between your savings and the total cost is the surplus or shortfall. Finally, it finds the monthly amount that would close the gap.'
				]
			},
			{
				heading: 'How the cost rise changes the plan',
				paragraphs: [
					'Small changes in the yearly rise have a big effect. The table below uses a $25,000 yearly cost, 4 years of study, 10 years to wait, $20,000 saved, a 6% return and $500 saved each month.'
				],
				table: {
					caption: 'Cost rise per year compared with the result',
					columns: ['Cost rise', 'Total cost', 'Shortfall', 'Monthly saving needed'],
					rows: [
						['3%', '$140,561', '$22,234', '$636'],
						['5%', '$175,518', '$57,191', '$849'],
						['7%', '$218,351', '$100,023', '$1,110']
					]
				}
			},
			{
				heading: 'Why starting early helps',
				paragraphs: [
					'Time lets your savings grow and keeps the monthly amount lower. The next table keeps the same inputs, except for the years until college.'
				],
				table: {
					caption: 'Years until college compared with the result (5% cost rise)',
					columns: ['Years to wait', 'Total cost', 'Projected savings', 'Monthly saving needed'],
					rows: [
						['5', '$137,523', '$61,862', '$1,584'],
						['10', '$175,518', '$118,328', '$849'],
						['15', '$224,011', '$194,491', '$602']
					]
				}
			},
			{
				heading: 'Ways to close a gap',
				paragraphs: ['A shortfall does not mean the plan has failed. It only shows how big the gap is today, while you still have time to act. Many families combine several sources:'],
				list: [
					'**Save a bit more each month.** The calculator shows the extra amount needed.',
					'**Look for grants and scholarships.** They reduce what you must save. Rules vary by country, so check official sources.',
					'**Compare course costs.** Fees and living costs can differ a lot between schools and cities.',
					'**Test other returns.** Returns are not guaranteed, so see how a lower rate changes the plan with the [savings calculator](/savings-calculator).',
					'**Check borrowing costs.** If you may borrow, estimate repayments with the [student loan calculator](/student-loan-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Cost of each year of study',
				expression: 'Costⱼ = C × (1 + g)^(y + j)',
				variables: [
					{ symbol: 'C', meaning: 'yearly cost today' },
					{ symbol: 'g', meaning: 'yearly rise in cost as a decimal (5% is 0.05)' },
					{ symbol: 'y', meaning: 'years until college starts' },
					{ symbol: 'j', meaning: '0 for the first year of study, 1 for the second, and so on' }
				]
			},
			{
				title: 'Projected savings at the start of college',
				expression: 'S = P × (1 + i)ᴺ + M × ((1 + i)ᴺ − 1) ÷ i',
				variables: [
					{ symbol: 'P', meaning: 'savings today' },
					{ symbol: 'M', meaning: 'monthly saving, added at the end of each month' },
					{ symbol: 'i', meaning: 'monthly return (annual return ÷ 12)' },
					{ symbol: 'N', meaning: 'months until college (years × 12)' }
				]
			}
		],
		example: {
			title: 'Tuition of $25,000 a year, starting in 10 years, with 4 years of study',
			steps: [
				'Cost in the first year: 25,000 × 1.05¹⁰ ≈ $40,722.37',
				'Each later year rises 5%: 42,758.48 + 44,896.41 + 47,141.23, so the four years total $175,518.49',
				'Savings: $20,000 grows to $36,387.93, and $500 a month adds $81,939.67, so the total is $118,327.61',
				'Shortfall: 118,327.61 − 175,518.49 = −$57,190.88',
				'Monthly saving needed: about $848.98, which is $348.98 more than the $500 you save now'
			],
			result:
				'Total projected cost of $175,518.49. Savings of $118,327.61 leave a shortfall of $57,190.88, and closing it needs an extra $348.98 a month.'
		},
		faq: [
			{
				q: 'How much will college cost in the future?',
				a: 'Nobody can know for sure. Take today’s yearly cost and grow it at the rate fees have been rising. The calculator does this for each year of study and adds them up.'
			},
			{
				q: 'What cost increase should I enter?',
				a: 'Look at how much the fees for your chosen course have risen in recent years. Try a low and a high figure, so you can see a range.'
			},
			{
				q: 'What does the monthly saving needed mean?',
				a: 'It is the total amount you would need to save each month, from now until college starts, to cover the whole projected cost. It already counts the growth on your current savings.'
			},
			{
				q: 'Does the calculator include grants, loans or scholarships?',
				a: 'No. It treats the whole cost as something you pay from savings. Any grant or scholarship you receive lowers the amount you need to save.'
			},
			{
				q: 'Which costs should I include in the yearly cost?',
				a: 'Add tuition, books, housing, food and transport for one year. Use the full cost, not only the fee, so the plan is realistic.'
			},
			{
				q: 'Can I use this outside the US?',
				a: 'Yes. Choose your currency at the top. The maths works for any country. The costs and the financial aid rules are different in each one.'
			}
		],
		sources: [
			{ title: 'Investor.gov (U.S. SEC) — Compounding interest', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/compounding-interest' },
			{ title: 'U.S. Department of Education — Federal Student Aid', url: 'https://studentaid.gov/' }
		],
		disclaimer:
			'Estimates only. Future costs, returns and financial aid are uncertain, and investment returns are not guaranteed. This tool is not financial advice.'
	}
});
