import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, pct, plural } from '../format';
import meta from './rent-vs-buy-calculator.meta';

const ok = (x: number, lo: number, hi: number) => Number.isFinite(x) && x >= lo && x <= hi;

/** Monthly principal and interest: M = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), with r = 0 → P ÷ n. */
function monthlyPayment(principal: number, annualPct: number, months: number): number {
	const r = annualPct / 1200;
	if (r === 0) return principal / months;
	const f = Math.pow(1 + r, months);
	return (principal * r * f) / (f - 1);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'years', label: 'Years to compare', type: 'number', default: 10, min: 1, max: 30, step: 1, suffix: 'years', decimal: false },
		{ id: 'price', label: 'Home price', type: 'number', default: 400000, min: 1, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 20, min: 0, max: 100, step: 0.5, suffix: '%' },
		{ id: 'rate', label: 'Mortgage rate', type: 'number', default: 6.5, min: 0, max: 30, step: 0.01, suffix: '%' },
		{
			id: 'term',
			label: 'Mortgage term',
			type: 'select',
			display: 'segmented',
			default: '30',
			options: [
				{ label: '15 yr', value: '15' },
				{ label: '20 yr', value: '20' },
				{ label: '30 yr', value: '30' }
			]
		},
		{
			id: 'tax',
			label: 'Property tax',
			type: 'number',
			default: 1.1,
			min: 0,
			max: 20,
			step: 0.05,
			suffix: '% a year',
			help: 'Percent of the home value each year'
		},
		{
			id: 'maint',
			label: 'Maintenance',
			type: 'number',
			default: 1,
			min: 0,
			max: 20,
			step: 0.1,
			suffix: '% a year',
			help: 'Percent of the home value each year'
		},
		{ id: 'insurance', label: 'Home insurance', type: 'number', default: 1500, min: 0, max: 1_000_000, step: 100, prefix: '$', suffix: '/yr' },
		{
			id: 'appreciation',
			label: 'Home appreciation',
			type: 'number',
			default: 3,
			min: -20,
			max: 30,
			step: 0.1,
			suffix: '% a year'
		},
		{
			id: 'selling',
			label: 'Selling costs',
			type: 'number',
			default: 6,
			min: 0,
			max: 30,
			step: 0.5,
			suffix: '%',
			help: 'Agent and other fees, as a share of the sale price'
		},
		{ id: 'rent', label: 'Monthly rent', type: 'number', default: 2000, min: 0, max: 1_000_000, step: 50, prefix: '$', suffix: '/mo' },
		{
			id: 'rentIncrease',
			label: 'Rent increase',
			type: 'number',
			default: 3,
			min: -10,
			max: 20,
			step: 0.1,
			suffix: '% a year'
		},
		{
			id: 'invest',
			label: 'Return on savings',
			type: 'number',
			default: 5,
			min: -20,
			max: 50,
			step: 0.1,
			suffix: '% a year',
			help: 'Growth on the down payment if you rent and invest it instead'
		}
	],
	calculate(v): CalculationResult {
		const years = Number(v.years);
		const price = Number(v.price);
		const down = Number(v.down);
		const rate = Number(v.rate);
		const term = Number(v.term);
		const tax = Number(v.tax);
		const maint = Number(v.maint);
		const insurance = Number(v.insurance);
		const appreciation = Number(v.appreciation);
		const selling = Number(v.selling);
		const monthlyRent = Number(v.rent);
		const rentIncrease = Number(v.rentIncrease);
		const invest = Number(v.invest);

		if (
			!Number.isInteger(years) ||
			!ok(years, 1, 30) ||
			!ok(price, 1, 1e9) ||
			!ok(down, 0, 100) ||
			!ok(rate, 0, 30) ||
			![15, 20, 30].includes(term) ||
			!ok(tax, 0, 20) ||
			!ok(maint, 0, 20) ||
			!ok(insurance, 0, 1e6) ||
			!ok(appreciation, -20, 30) ||
			!ok(selling, 0, 30) ||
			!ok(monthlyRent, 0, 1e6) ||
			!ok(rentIncrease, -10, 20) ||
			!ok(invest, -20, 50)
		) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Cheaper option',
				summary: 'Enter a whole number of years from 1 to 30 and valid values for every field.'
			};
		}

		const downPayment = price * (down / 100);
		const loan = price - downPayment;
		const months = term * 12;
		const monthlyPI = monthlyPayment(loan, rate, months);
		const monthlyRate = rate / 1200;
		const g = appreciation / 100;
		const growthOnSavings = invest / 100;
		const rentGrowth = rentIncrease / 100;

		let balance = loan;
		let cumulativeOwning = 0;
		let cumulativeRent = 0;
		let breakEven: number | null = null;
		let buyCost = 0;
		let rentCost = 0;
		const rows: Record<string, string>[] = [];

		for (let y = 1; y <= years; y++) {
			const valueStart = price * Math.pow(1 + g, y - 1);
			const valueEnd = price * Math.pow(1 + g, y);

			// Principal and interest for this year, stopping at the end of the mortgage term.
			let yearPaid = 0;
			for (let m = 0; m < 12; m++) {
				if ((y - 1) * 12 + m >= months || balance <= 0) break;
				const interest = balance * monthlyRate;
				const principal = Math.min(monthlyPI - interest, balance);
				balance -= principal;
				yearPaid += interest + principal;
			}
			if (balance < 0.005) balance = 0;

			cumulativeOwning += yearPaid + (tax / 100) * valueStart + (maint / 100) * valueStart + insurance;
			const netSaleProceeds = valueEnd * (1 - selling / 100) - balance;
			buyCost = downPayment + cumulativeOwning - netSaleProceeds;

			cumulativeRent += monthlyRent * 12 * Math.pow(1 + rentGrowth, y - 1);
			rentCost = cumulativeRent - downPayment * (Math.pow(1 + growthOnSavings, y) - 1);

			const buyCheaper = buyCost <= rentCost;
			if (breakEven === null && buyCheaper) breakEven = y;

			rows.push({
				year: num(y),
				buy: money(buyCost, true),
				rent: money(rentCost, true),
				cheaper: buyCheaper ? 'Buying' : 'Renting'
			});
		}

		const diff = rentCost - buyCost;
		const even = Math.abs(diff) < 0.5;
		const winner = even ? 'Even' : diff > 0 ? 'Buying' : 'Renting';
		const summary = even
			? `Over ${plural(years, 'year')}, the two options cost about the same.`
			: `Over ${plural(years, 'year')}, ${winner === 'Buying' ? 'buying' : 'renting'} costs ${money(Math.abs(diff), true)} less than ${
					winner === 'Buying' ? 'renting' : 'buying'
				}.`;

		return {
			primaryResult: winner,
			primaryLabel: `Cheaper over ${plural(years, 'year')}`,
			summary,
			secondaryMetrics: [
				{ label: 'Buying net cost', value: money(buyCost, true) },
				{ label: 'Renting net cost', value: money(rentCost, true) },
				{ label: 'Difference', value: money(Math.abs(diff), true) },
				{
					label: 'Break-even year',
					value: breakEven !== null ? `Year ${breakEven}` : `Not within ${plural(years, 'year')}`
				},
				{ label: 'Monthly principal and interest', value: money(monthlyPI) }
			],
			table: {
				title: 'Year-by-year net cost',
				collapsed: true,
				columns: [
					{ key: 'year', label: 'Year' },
					{ key: 'buy', label: 'Buying', align: 'end' },
					{ key: 'rent', label: 'Renting', align: 'end' },
					{ key: 'cheaper', label: 'Cheaper', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro:
			'Use this rent vs buy calculator to compare the net cost of owning a home with renting a similar one over the years you plan to stay. It shows which option costs less and the year when buying breaks even.',
		howTo: [
			'Enter how many years you want to compare, then the home price, down payment, mortgage rate and term.',
			'Enter the yearly costs of owning: property tax, maintenance and home insurance. Add the home’s expected growth and your selling costs.',
			'Enter the monthly rent you would pay, how fast it rises, and the return you could earn on your down payment.',
			'Read which option is cheaper, the break-even year and the year-by-year table.'
		],
		about: [
			{
				heading: 'How the comparison works',
				paragraphs: [
					'The calculator adds up what each option costs you over your chosen period, after allowing for what you get back. So it does not compare monthly bills alone.',
					'For buying, it counts the down payment, the mortgage payments, property tax, maintenance and insurance. Then it subtracts the cash you would get from selling, after selling costs and the loan balance.',
					'For renting, it first adds up the rent as it rises each year. Then it subtracts the growth you could earn by investing the down payment instead.'
				]
			},
			{
				heading: 'Why the time you stay matters most',
				paragraphs: [
					'Buying has big costs at the start and at the end, such as the down payment and selling fees. So a short stay usually favours renting, and a long stay favours buying. The table uses a $400,000 home with 20% down, a 6.5% 30-year loan and $2,000 rent.'
				],
				table: {
					caption: 'Years compared with the cheaper option',
					columns: ['Years', 'Buying net cost', 'Renting net cost', 'Cheaper'],
					rows: [
						['3', '$80,948', '$61,572', 'Renting'],
						['5', '$117,122', '$105,317', 'Renting'],
						['8', '$168,263', '$175,220', 'Buying'],
						['15', '$269,196', '$360,060', 'Buying']
					]
				}
			},
			{
				heading: 'What changes the answer',
				paragraphs: [
					'A few inputs swing the result a lot, but no one can know them in advance. The table changes one input at a time over 10 years.'
				],
				table: {
					caption: 'One change at a time, over 10 years',
					columns: ['Change', 'Cheaper option', 'Difference'],
					rows: [
						['Default inputs', 'Buying', '$24,840'],
						['Home value flat (0% growth)', 'Renting', '$92,176'],
						['Home value growth 5%', 'Buying', '$122,634'],
						['Rent $1,500 a month', 'Renting', '$43,943'],
						['Rent $2,500 a month', 'Buying', '$93,623'],
						['Return on savings 8%', 'Renting', '$17,563']
					]
				}
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'Money is only part of the choice. Owning gives you stability and the freedom to change the home, but renting gives you flexibility and lets you move more easily.',
					'On the maths side, the tool also leaves out tax effects, buying costs such as legal fees and stamp duty, and the chance that you move earlier than planned. It also only invests the down payment for the renter, not any monthly savings. Returns are not guaranteed, and home prices can fall.'
				]
			},
			{
				heading: 'Tips for a fair comparison',
				paragraphs: ['Use the same kind of home on both sides, and then test a few cases:'],
				list: [
					'**Use real rents.** Compare with a similar home in the same area.',
					'**Try cautious growth.** Test 0% home value growth, because that is a realistic bad case.',
					'**Check the loan.** The [mortgage calculator](/mortgage-calculator) shows the full payment with tax and insurance.',
					'**Know what you can borrow.** The [house affordability calculator](/house-affordability-calculator) shows a safe price range.',
					'**Look at the rent side.** The [rent calculator](/rent-calculator) shows how much rent fits your income.'
				]
			}
		],
		formulas: [
			{
				title: 'Net cost of buying',
				expression: 'Buy = Down payment + Mortgage payments + Tax + Maintenance + Insurance − (Sale price × (1 − selling costs) − Loan balance)',
				variables: [
					{ symbol: 'Tax, Maintenance', meaning: 'a yearly share of the home value, which grows with the home' },
					{ symbol: 'Sale price', meaning: 'price × (1 + growth)^years' }
				]
			},
			{
				title: 'Net cost of renting',
				expression: 'Rent = Σ Rentᵧ − Down payment × ((1 + g)ⁿ − 1)',
				variables: [
					{ symbol: 'Rentᵧ', meaning: 'rent paid in year y, rising each year' },
					{ symbol: 'g', meaning: 'yearly return on your savings' },
					{ symbol: 'n', meaning: 'years compared' }
				]
			}
		],
		example: {
			title: 'Comparing 10 years: a $400,000 home with 20% down at 6.5% over 30 years, against $2,000 rent',
			steps: [
				'Down payment = $80,000, loan = $320,000, and the monthly principal and interest is $2,022.62',
				'After 10 years, principal and interest total $242,714.12, tax $50,441.07, maintenance $45,855.52 and insurance $15,000',
				'Home value grows to $537,566.55. After 6% selling costs and the $271,283.60 loan balance, the sale leaves $234,028.95',
				'Buying cost = $80,000 + $242,714.12 + $50,441.07 + $45,855.52 + $15,000 − $234,028.95 ≈ $199,982',
				'Renting cost = $275,133.10 of rent − $50,311.57 of growth on the $80,000 down payment ≈ $224,822'
			],
			result: 'Buying is cheaper by about $24,840 over 10 years, and it becomes cheaper than renting in year 8.'
		},
		faq: [
			{
				q: 'Is it better to rent or buy?',
				a: 'It depends on how long you will stay, the price, the rent, and what you could earn on your savings. Staying longer usually favours buying. Use the calculator to test your own numbers.'
			},
			{
				q: 'How long do I need to stay for buying to pay off?',
				a: 'This is the break-even year. With the default inputs it is year 8, but it can be much shorter or longer. Home growth and rent levels change it most.'
			},
			{
				q: 'Why does renting win in the short term?',
				a: 'Buying has large costs up front, such as the down payment and later selling fees. So you need years of ownership to repay them through home value growth and avoided rent.'
			},
			{
				q: 'What costs does the buyer pay?',
				a: 'The calculator includes mortgage payments, property tax, maintenance, insurance and selling costs. It does not include legal fees, stamp duty or moving costs.'
			},
			{
				q: 'Why is the down payment invested for the renter?',
				a: 'If you rent, you still hold the cash you would have put down. The tool assumes it earns the return you enter, which is a fair way to compare the two paths.'
			},
			{
				q: 'Does this work outside the US?',
				a: 'Yes, the maths works anywhere and you can choose your currency. However, buying costs, taxes and mortgage rules vary by country, so adjust the inputs to your local rules.'
			}
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau — What is amortization?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/' },
			{ title: 'Consumer Financial Protection Bureau — What is the difference between a mortgage interest rate and an APR?', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-the-difference-between-a-mortgage-interest-rate-and-an-apr-en-135/' }
		],
		disclaimer:
			'Estimates only. Home prices, rents and returns can change, and returns are not guaranteed. This tool ignores tax and is not financial advice.'
	}
});
