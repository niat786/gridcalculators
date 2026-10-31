import { defineCalculator, type CalculationResult, type RowValue } from '../types';
import { DASH, money, plural } from '../format';
import meta from './budget-calculator.meta';

const categoryOptions = [
	{ label: 'Needs', value: 'needs' },
	{ label: 'Wants', value: 'wants' },
	{ label: 'Savings', value: 'savings' }
];

/** Share of take-home pay for each category in the 50/30/20 rule. */
const SHARES = { needs: 0.5, wants: 0.3, savings: 0.2 } as const;
type Category = keyof typeof SHARES;
const LABEL: Record<Category, string> = { needs: 'Needs', wants: 'Wants', savings: 'Savings' };

/**
 * 50/30/20 split of monthly take-home pay, plus optional expense rows tagged by category.
 * Needs and wants are capped at their targets; savings should meet or beat its target.
 */
export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'income',
			label: 'Monthly take-home income',
			type: 'number',
			default: 4000,
			min: 0,
			max: 1_000_000_000,
			step: 100,
			prefix: '$',
			help: 'Pay you receive after tax and deductions.'
		},
		{
			id: 'expenses',
			label: 'Actual expenses',
			type: 'rows',
			columns: [
				{ id: 'name', label: 'Expense', type: 'text', default: '', placeholder: 'Expense name' },
				{ id: 'amount', label: 'Monthly amount', type: 'number', default: 0, min: 0, max: 1_000_000_000, prefix: '$' },
				{ id: 'category', label: 'Category', type: 'select', default: 'needs', options: categoryOptions }
			],
			default: [
				{ name: 'Rent', amount: 1400, category: 'needs' },
				{ name: 'Groceries', amount: 450, category: 'needs' },
				{ name: 'Utilities', amount: 180, category: 'needs' },
				{ name: 'Dining out', amount: 350, category: 'wants' },
				{ name: 'Streaming', amount: 60, category: 'wants' },
				{ name: 'Retirement and emergency fund', amount: 500, category: 'savings' }
			],
			maxRows: 40,
			addLabel: 'Add expense'
		}
	],
	calculate(v): CalculationResult {
		const income = Number(v.income);
		const rows = (v.expenses as RowValue[]) ?? [];
		const invalid = (): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Monthly savings target',
			summary: 'Enter your take-home income, and an amount and category for each expense.'
		});

		if (!(income > 0)) return invalid();

		const spent: Record<Category, number> = { needs: 0, wants: 0, savings: 0 };
		for (const row of rows) {
			const amount = Number(row.amount);
			const category = String(row.category) as Category;
			if (!Number.isFinite(amount) || amount < 0 || !(category in SHARES)) return invalid();
			spent[category] += amount;
		}
		const entered = spent.needs + spent.wants + spent.savings;
		const target = (c: Category) => income * SHARES[c];

		const status = (c: Category): string => {
			const diff = spent[c] - target(c);
			if (Math.abs(diff) < 0.005) return 'On target';
			if (c === 'savings') return diff < 0 ? `${money(-diff)} short` : `${money(diff)} above`;
			return diff > 0 ? `${money(diff)} over` : `${money(-diff)} under`;
		};

		const hasExpenses = rows.length > 0;
		const summary = hasExpenses
			? `You are saving ${money(spent.savings)} against a target of ${money(target('savings'))}.`
			: `Your targets are ${money(target('needs'))} for needs, ${money(target('wants'))} for wants and ${money(target('savings'))} for savings.`;

		const table = {
			title: 'Targets compared with your expenses',
			columns: [
				{ key: 'category', label: 'Category' },
				{ key: 'share', label: 'Share', align: 'end' as const },
				{ key: 'target', label: 'Target', align: 'end' as const },
				{ key: 'actual', label: 'Actual', align: 'end' as const },
				{ key: 'status', label: 'Status', align: 'end' as const }
			],
			rows: (['needs', 'wants', 'savings'] as Category[]).map((c) => ({
				category: LABEL[c],
				share: `${Math.round(SHARES[c] * 100)}%`,
				target: money(target(c)),
				actual: money(spent[c]),
				status: status(c)
			}))
		};

		return {
			primaryResult: money(target('savings')),
			primaryLabel: 'Monthly savings target',
			summary,
			secondaryMetrics: [
				{ label: 'Needs target', value: money(target('needs')) },
				{ label: 'Wants target', value: money(target('wants')) },
				{ label: 'Total expenses entered', value: money(entered) },
				{
					label: entered <= income ? 'Left after expenses' : 'Over income by',
					value: money(Math.abs(income - entered))
				}
			],
			table
		};
	},
	content: {
		intro:
			'Use this budget calculator to split your monthly take-home pay with the 50/30/20 rule: 50% for needs, 30% for wants and 20% for savings. Then enter your real expenses to see how close you are.',
		howTo: [
			'Enter your monthly take-home income, which is the pay you receive after tax and deductions.',
			'List your monthly expenses. Give each one an amount and tag it as a need, a want or savings.',
			'Read your savings target and the target for each category.',
			'Compare the targets with your actual spending in the table, and see how much is left over.'
		],
		about: [
			{
				heading: 'What is the 50/30/20 budget rule?',
				paragraphs: [
					'The 50/30/20 rule is a simple way to plan a budget. You use your take-home pay, not your gross pay. You then divide it into three parts: 50% for needs, 30% for wants and 20% for savings.',
					'It is a guide, not a law. Its main strength is that it is easy to remember and easy to check. You do not need to track every small purchase to use it.'
				]
			},
			{
				heading: 'Needs, wants and savings',
				paragraphs: ['The hard part is deciding which bucket an expense belongs in. These examples can help:'],
				list: [
					'**Needs.** Costs you must pay to live and work, such as rent or a home loan payment, food, utilities, transport to work, insurance and the minimum payments on debts.',
					'**Wants.** Things that make life nicer but that you could do without, such as eating out, streaming, hobbies, holidays and new gadgets.',
					'**Savings.** Money you set aside, such as an emergency fund, retirement savings, investments, and extra payments on debt.'
				]
			},
			{
				heading: 'What your targets look like',
				paragraphs: [
					'The targets scale with your income. The table below shows the split for three monthly take-home amounts.'
				],
				table: {
					caption: 'The 50/30/20 split of monthly take-home pay',
					columns: ['Take-home pay', 'Needs (50%)', 'Wants (30%)', 'Savings (20%)'],
					rows: [
						['$3,000', '$1,500', '$900', '$600'],
						['$4,000', '$2,000', '$1,200', '$800'],
						['$6,000', '$3,000', '$1,800', '$1,200']
					]
				}
			},
			{
				heading: 'How to read your results',
				paragraphs: [
					'The status column shows where you are against each target. For needs and wants, “over” means you spend more than the target. For savings, “short” means you save less than the target.',
					'If your needs are far above 50%, do not feel bad. In places with high rent, the rule is hard to meet. Then you can lower your wants first, or adjust the split to a ratio that works for you.'
				]
			},
			{
				heading: 'Tips for a budget that lasts',
				paragraphs: ['A budget works best when it is simple and realistic. A few ideas:'],
				list: [
					'**Pay savings first.** Move money to savings on payday, before you spend.',
					'**Review once a month.** Check the table, then move a small amount between categories.',
					'**Plan your savings goal.** See where your savings could lead with the [savings calculator](/savings-calculator) or the [compound interest calculator](/compound-interest-calculator).',
					'**Pay down costly debt.** The [debt payoff calculator](/debt-payoff-calculator) shows how extra payments help.',
					'**Know your income.** If you only know your gross pay, the [take-home pay calculator](/take-home-pay-calculator) can help you estimate the net.'
				]
			}
		],
		formulas: [
			{
				title: 'Category targets',
				expression: 'Needs = 0.50 × I,  Wants = 0.30 × I,  Savings = 0.20 × I',
				variables: [{ symbol: 'I', meaning: 'monthly take-home income' }]
			},
			{
				title: 'Money left after expenses',
				expression: 'Left = I − (needs + wants + savings entered)',
				variables: [{ symbol: 'needs, wants, savings entered', meaning: 'the totals of the expenses you list in each category' }]
			}
		],
		example: {
			title: '$4,000 take-home pay with six monthly expenses',
			steps: [
				'Targets: needs $4,000 × 50% = $2,000, wants $1,200, savings $800',
				'Needs entered: rent $1,400 + groceries $450 + utilities $180 = $2,030, which is $30 over',
				'Wants entered: dining out $350 + streaming $60 = $410, which is $790 under',
				'Savings entered: $500, which is $300 short of the $800 target',
				'Total entered: $2,030 + $410 + $500 = $2,940, leaving $1,060'
			],
			result: 'Savings target: $800 a month. Your entered savings of $500 fall $300 short.'
		},
		faq: [
			{
				q: 'What is the 50/30/20 rule?',
				a: 'It is a budgeting guide that splits your take-home pay into 50% for needs, 30% for wants and 20% for savings. It is a starting point, so change the split to suit your life.'
			},
			{
				q: 'Should I use gross or take-home pay?',
				a: 'Use take-home pay, which is what lands in your account after tax and deductions. A budget based on gross pay will promise you money you never see.'
			},
			{
				q: 'Do debt payments count as needs or savings?',
				a: 'The minimum payments on a debt count as needs, because you must pay them. Extra payments beyond the minimum can count as savings.'
			},
			{
				q: 'What if my needs are more than 50% of my income?',
				a: 'That is common where rent or living costs are high. Try to trim wants first, look for ways to raise income, and keep saving even a small amount. The rule is a guide, not a test.'
			},
			{
				q: 'Why is there money left over after my expenses?',
				a: 'The tool shows what is left after the expenses you entered. If the amount is large, you may have left items out. Otherwise, you could add the leftover to savings.'
			},
			{
				q: 'Does this work in any currency?',
				a: 'Yes. Choose your currency at the top of the calculator. The percentages work the same way anywhere.'
			}
		],
		sources: [
			{ title: 'Consumer Financial Protection Bureau — Budgeting strategies and free tools', url: 'https://www.consumerfinance.gov/about-us/blog/budgeting-strategies-free-tools-help-you-reach-your-goals/' },
			{ title: 'MoneyHelper (UK) — Budget planner', url: 'https://www.moneyhelper.org.uk/en/everyday-money/budgeting/budget-planner' }
		],
		disclaimer:
			'A guide only. The 50/30/20 split is a rule of thumb, not financial advice, and your own situation may need a different balance.'
	}
});
