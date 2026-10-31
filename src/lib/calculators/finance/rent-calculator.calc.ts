import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, pct } from '../format';
import meta from './rent-calculator.meta';

/** Share of gross monthly income that rent should not pass. */
const RENT_SHARE = 0.3;
/** Share of gross monthly income for rent plus all other debt payments. */
const TOTAL_DEBT_SHARE = 0.36;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Find',
			type: 'select',
			display: 'segmented',
			default: 'afford',
			options: [
				{ label: 'Rent I can afford', value: 'afford' },
				{ label: 'Income needed', value: 'needed' }
			]
		},
		{
			id: 'income',
			label: 'Gross annual income',
			type: 'number',
			default: 75000,
			min: 0,
			max: 100_000_000,
			step: 1000,
			prefix: '$',
			suffix: '/yr',
			help: 'Before tax.',
			visibleWhen: (v) => v.mode === 'afford'
		},
		{
			id: 'debts',
			label: 'Monthly debt payments',
			type: 'number',
			default: 400,
			min: 0,
			max: 1_000_000,
			step: 50,
			prefix: '$',
			suffix: '/mo',
			help: 'Car loans, credit cards, student loans. Enter 0 if none.',
			visibleWhen: (v) => v.mode === 'afford'
		},
		{
			id: 'rent',
			label: 'Monthly rent',
			type: 'number',
			default: 1800,
			min: 0,
			max: 1_000_000,
			step: 50,
			prefix: '$',
			suffix: '/mo',
			visibleWhen: (v) => v.mode === 'needed'
		}
	],
	calculate(v: InputValues): CalculationResult {
		if (v.mode === 'needed') {
			const rent = Number(v.rent);
			if (!(rent > 0)) {
				return {
					primaryResult: DASH,
					primaryLabel: 'Annual income needed',
					summary: 'Enter the monthly rent you are looking at.'
				};
			}
			const grossMonthly = rent / RENT_SHARE;
			const income = grossMonthly * 12;
			return {
				primaryResult: money(income),
				primaryLabel: 'Annual income needed',
				summary: `Rent of ${money(rent)} a month needs about ${money(grossMonthly)} a month before tax, if rent is 30% of income.`,
				secondaryMetrics: [
					{ label: 'Gross monthly income needed', value: money(grossMonthly) },
					{ label: '40× monthly rent (landlord rule)', value: money(rent * 40) },
					{ label: 'Annual rent', value: money(rent * 12) },
					{ label: 'Monthly rent', value: money(rent) }
				]
			};
		}

		const income = Number(v.income);
		const debts = Number(v.debts);
		const invalid = (): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Affordable monthly rent',
			summary: 'Enter your yearly income and your monthly debt payments, with 0 for no debts.'
		});
		if (!(income > 0) || !(debts >= 0)) return invalid();

		const grossMonthly = income / 12;
		const rentAt30 = grossMonthly * RENT_SHARE;
		const afterDebts = Math.max(0, grossMonthly * TOTAL_DEBT_SHARE - debts);
		const safest = Math.min(rentAt30, afterDebts);
		const debtShare = (debts / grossMonthly) * 100;

		const summary =
			afterDebts < rentAt30
				? `Your debts already take ${pct(debtShare, 1)} of income, so the debt limit is the one to watch. Keep rent under ${money(safest)} a month.`
				: `Keep rent under ${money(safest)} a month to stay within 30% of income and 36% including debts.`;

		return {
			primaryResult: money(rentAt30),
			primaryLabel: 'Affordable monthly rent (30%)',
			summary,
			secondaryMetrics: [
				{ label: 'Gross monthly income', value: money(grossMonthly) },
				{ label: 'Rent after debts (36% total)', value: money(afterDebts) },
				{ label: 'Safest rent (lower figure)', value: money(safest) },
				{ label: 'Debts as share of income', value: pct(debtShare, 1) }
			]
		};
	},
	content: {
		intro:
			'Use this rent calculator to find how much rent you can afford from your income and debts, or the income you need for a rent you have in mind. It uses the common 30% rule of thumb.',
		howTo: [
			'Choose whether to find the rent you can afford, or the income you need.',
			'To find affordable rent, enter your gross annual income (before tax) and your monthly debt payments.',
			'To find the income you need, enter the monthly rent you are looking at.',
			'Read the result, and keep rent at or below the “safest” figure.'
		],
		about: [
			{
				heading: 'What is the 30% rule for rent?',
				paragraphs: [
					'The 30% rule says that rent should take no more than 30% of your gross income, which is your pay before tax. It is a simple way to avoid spending too much on housing. For example, an income of $6,250 a month means rent of up to $1,875.',
					'US housing agencies use the same 30% line to describe households that are cost burdened. The rule is a guide, not a law, and many people in expensive cities pay more.'
				]
			},
			{
				heading: 'Why debts matter too',
				paragraphs: [
					'Rent is not your only monthly cost. Car loans, credit cards and student loans also take a share of your income. So the calculator adds a second test: rent plus debt payments should stay within 36% of gross income.',
					'It shows both results and picks the lower one as the safest rent. If your debts are high, the debt test can be stricter than the 30% rule. To see how your debts compare with your income, try the [debt-to-income ratio calculator](/debt-to-income-ratio-calculator).'
				]
			},
			{
				heading: 'What rent fits which income',
				paragraphs: [
					'The table below uses no debts, so the 30% rule sets the limit. After that, it shows how debts lower the safe figure for a $75,000 income.'
				],
				table: {
					caption: 'Affordable monthly rent',
					columns: ['Gross annual income', 'Monthly debts', 'Rent at 30%', 'Safest rent'],
					rows: [
						['$36,000', '$0', '$900', '$900'],
						['$50,000', '$0', '$1,250', '$1,250'],
						['$100,000', '$0', '$2,500', '$2,500'],
						['$75,000', '$400', '$1,875', '$1,850'],
						['$75,000', '$1,000', '$1,875', '$1,250']
					]
				}
			},
			{
				heading: 'The “40 times rent” rule',
				paragraphs: [
					'Some landlords, especially in big US cities, ask tenants to earn a yearly income of 40 times the monthly rent. This is the same idea as the 30% rule. Twelve months of rent divided by 0.30 is 40 months of rent. So a $1,800 rent needs an income of $72,000.',
					'Landlords in other countries use their own checks, such as a multiple of rent or proof of savings. Ask your landlord or agent what they need.'
				]
			},
			{
				heading: 'Tips for renters',
				paragraphs: ['The rule gives a ceiling. A few steps can help you stay under it:'],
				list: [
					'**Count all housing costs.** Add utilities, internet and renters’ insurance to the rent when you compare homes.',
					'**Use take-home pay for your own budget.** Your gross income is a rule-of-thumb base. Plan your real spending with the [budget calculator](/budget-calculator).',
					'**Think about buying.** If you stay for years, compare the costs with the [rent vs buy calculator](/rent-vs-buy-calculator).',
					'**Check your borrowing power.** If you plan to buy later, the [house affordability calculator](/house-affordability-calculator) is the next step.'
				]
			}
		],
		formulas: [
			{
				title: 'Affordable rent',
				expression: 'Rent at 30% = Gross monthly income × 0.30',
				variables: [{ symbol: 'Gross monthly income', meaning: 'yearly income before tax, divided by 12' }]
			},
			{
				title: 'Rent after debts',
				expression: 'Rent after debts = Gross monthly income × 0.36 − Monthly debt payments',
				variables: [{ symbol: 'Safest rent', meaning: 'the lower of the two figures' }]
			},
			{
				title: 'Income needed for a rent',
				expression: 'Annual income = Monthly rent ÷ 0.30 × 12',
				variables: [{ symbol: 'Monthly rent', meaning: 'the rent you are considering' }]
			}
		],
		example: {
			title: 'A $75,000 salary with $400 a month in debts',
			steps: [
				'Gross monthly income: $75,000 ÷ 12 = $6,250.00',
				'Rent at 30%: $6,250.00 × 0.30 = $1,875.00',
				'Rent after debts: $6,250.00 × 0.36 − $400 = $2,250.00 − $400 = $1,850.00',
				'Safest rent is the lower figure: $1,850.00 a month'
			],
			result:
				'You can afford about $1,875.00 a month at 30% of income. Keep it under $1,850.00 to stay within 36% once your debts are included.'
		},
		faq: [
			{
				q: 'How much rent can I afford?',
				a: 'A common rule is up to 30% of your gross monthly income. On a $75,000 salary, that is $1,875 a month. If you have debts, keep rent and debts together within 36% of income.'
			},
			{
				q: 'Should I use gross or net income for the rent rule?',
				a: 'The 30% rule uses gross income, which is before tax. Your take-home pay is lower, so rent at 30% of gross takes a bigger share of what you actually receive.'
			},
			{
				q: 'What income do I need for a $2,000 rent?',
				a: 'About $80,000 a year if you use the 30% rule or the 40 times rent rule. Divide the rent by 0.30 to get the monthly income, then multiply by 12.'
			},
			{
				q: 'What if my rent is more than 30% of my income?',
				a: 'Many renters are in this position, especially in costly cities. Look at ways to cut other costs or raise income, and keep a small cushion for emergencies.'
			},
			{
				q: 'Do roommates change the calculation?',
				a: 'Yes. Use your own share of the rent, and your own income and debts. Landlords may look at the combined income of all tenants.'
			},
			{
				q: 'Does this work outside the US?',
				a: 'The maths works anywhere, and you can choose your currency. The 30% rule is a guide from the US, so local norms and landlord checks may differ.'
			}
		],
		sources: [
			{ title: 'U.S. Department of Housing and Urban Development — Affordable housing', url: 'https://www.hud.gov/program_offices/comm_planning/affordablehousing' }
		],
		disclaimer:
			'A rule of thumb only. Your own budget, local rents and landlord rules matter more. This tool is not financial advice.'
	}
});
