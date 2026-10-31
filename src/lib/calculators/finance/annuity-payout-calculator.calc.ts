import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, pct, plural } from '../format';
import meta from './annuity-payout-calculator.meta';

const modeOptions = [
	{ label: 'Payout amount', value: 'amount' },
	{ label: 'How long it lasts', value: 'length' }
];

/**
 * Fixed monthly payouts from a lump sum that earns interest each month.
 * "amount": the level payment that empties the sum over a set number of years.
 * "length": the number of months a known payout lasts. If the payout does not cover the
 * monthly interest, the balance never falls, so the answer is "never runs out".
 */
export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Find',
			type: 'select',
			display: 'segmented',
			default: 'amount',
			options: modeOptions
		},
		{ id: 'principal', label: 'Starting principal', type: 'number', default: 500000, min: 0, max: 1_000_000_000, step: 1000, prefix: '$', help: 'The lump sum you start paying out from.' },
		{ id: 'rate', label: 'Annual interest rate', type: 'number', default: 5, min: 0, max: 100, step: 0.1, suffix: '%', help: 'Earned on the balance, compounded monthly.' },
		{
			id: 'years',
			label: 'Payout period',
			type: 'number',
			default: 25,
			min: 1,
			max: 100,
			step: 1,
			decimal: false,
			suffix: 'years',
			visibleWhen: (v) => v.mode === 'amount'
		},
		{
			id: 'payout',
			label: 'Monthly payout',
			type: 'number',
			default: 3000,
			min: 0,
			max: 10_000_000,
			step: 100,
			prefix: '$',
			suffix: '/mo',
			visibleWhen: (v) => v.mode === 'length'
		}
	],
	calculate(v): CalculationResult {
		const principal = Number(v.principal);
		const annualRate = Number(v.rate);
		const r = annualRate / 1200;

		if (!(principal > 0) || !(annualRate >= 0 && annualRate <= 100) || (v.mode !== 'amount' && v.mode !== 'length')) {
			return { primaryResult: DASH, primaryLabel: 'Monthly payout', summary: 'Enter a starting principal above zero and a rate from 0 to 100%.' };
		}

		if (v.mode === 'amount') {
			const years = Number(v.years);
			if (!(Number.isInteger(years) && years >= 1 && years <= 100)) {
				return { primaryResult: DASH, primaryLabel: 'Monthly payout', summary: 'Enter a payout period from 1 to 100 years.' };
			}
			const n = years * 12;
			const payment = r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
			const total = payment * n;
			return {
				primaryResult: money(payment),
				primaryLabel: 'Monthly payout',
				summary: `Paying ${money(payment)} a month for ${plural(years, 'year')} empties the ${money(principal, true)} starting sum.`,
				secondaryMetrics: [
					{ label: 'Number of payouts', value: num(n, 0) },
					{ label: 'Total paid out', value: money(total) },
					{ label: 'Interest in payouts', value: money(total - principal) }
				]
			};
		}

		const payout = Number(v.payout);
		if (!(payout > 0)) {
			return { primaryResult: DASH, primaryLabel: 'Time the payouts last', summary: 'Enter a monthly payout above zero.' };
		}

		const monthlyInterest = principal * r;
		if (payout <= monthlyInterest) {
			const g = Math.pow(1 + r, 120);
			const balance10 = principal * g - payout * ((g - 1) / r);
			return {
				primaryResult: 'Never runs out',
				primaryLabel: 'Time the payouts last',
				summary: `A payout of ${money(payout)} does not cover the ${money(monthlyInterest)} earned each month, so the balance never falls.`,
				secondaryMetrics: [
					{ label: 'Monthly interest earned', value: money(monthlyInterest) },
					{ label: 'Monthly payout', value: money(payout) },
					{ label: 'Balance after 10 years', value: money(balance10) }
				]
			};
		}

		const months = r === 0 ? principal / payout : -Math.log(1 - monthlyInterest / payout) / Math.log(1 + r);
		if (!Number.isFinite(months) || months < 0) {
			return { primaryResult: DASH, primaryLabel: 'Time the payouts last', summary: 'Check the principal, rate and payout.' };
		}

		const full = Math.floor(months + 1e-9);
		const g = Math.pow(1 + r, full);
		const balance = r === 0 ? principal - payout * full : principal * g - payout * ((g - 1) / r);
		const partial = balance > 0.005 ? balance * (1 + r) : 0;
		const total = payout * full + partial;

		const years = Math.floor(full / 12);
		const rest = full % 12;
		const parts: string[] = [];
		if (years > 0) parts.push(plural(years, 'year'));
		if (rest > 0) parts.push(plural(rest, 'month'));
		const lasts = full === 0 ? 'Under 1 month' : parts.join(', ');

		return {
			primaryResult: lasts,
			primaryLabel: 'Time the payouts last',
			summary: `${plural(full, 'full payout')} of ${money(payout)}, then a final payment of ${money(partial)}.`,
			secondaryMetrics: [
				{ label: 'Total paid out', value: money(total) },
				{ label: 'Interest in payouts', value: money(total - principal) },
				{ label: 'Final partial payout', value: money(partial) }
			]
		};
	},
	content: {
		intro: 'Use this annuity payout calculator to work out either side of a monthly payout plan. Find the level monthly payout that uses up a lump sum over a set number of years, or find how long a fixed monthly payout lasts.',
		howTo: [
			'Choose what you want to find: the payout amount, or how long the payouts last.',
			'Enter the starting principal and the annual interest rate the balance earns.',
			'For a payout amount, enter the number of years. For how long it lasts, enter the monthly payout.',
			'Read the result. If the payout is no more than the monthly interest, the balance never falls.'
		],
		about: [
			{
				heading: 'What is an annuity payout?',
				paragraphs: [
					'An annuity payout is a regular income taken from a lump sum. The money you haven’t paid out yet keeps earning interest, so each payment is partly your own money and partly interest.',
					'You might use this for a retirement fund, an inheritance or a pension lump sum. The calculator assumes a fixed rate, a fixed payout and no fees. It doesn’t price an insurance contract.'
				]
			},
			{
				heading: 'Two questions it can answer',
				paragraphs: [
					'The first is how much you can take each month for a set time. You enter the sum, the rate and the number of years, and the calculator finds the payout that leaves nothing at the end.',
					'The second is how long a payout will last. You enter the sum, the rate and the monthly amount you want. The calculator then counts the months until the money runs out. Because the answer is rarely a whole number of months, the last payment is smaller.'
				]
			},
			{
				heading: 'How the payout changes with time',
				paragraphs: ['A longer payout period means a smaller monthly amount, but a bigger total. The table uses $500,000 at 5% a year, compounded monthly.'],
				table: {
					caption: 'Level monthly payout from $500,000 at 5%',
					columns: ['Payout period', 'Monthly payout', 'Total paid out'],
					rows: [
						['15 years', '$3,953.97', '$711,714.26'],
						['20 years', '$3,299.78', '$791,946.89'],
						['25 years', '$2,922.95', '$876,885.06'],
						['30 years', '$2,684.11', '$966,278.92']
					]
				}
			},
			{
				heading: 'How long does a payout last?',
				paragraphs: [
					'Take the same $500,000 at 5% with a payout of $3,000 a month. The money lasts 23 years and 9 months. That is 285 full payouts, then a final payment of $427.00.',
					'There is one special case. At 5%, the balance earns about $2,083.33 a month in interest. If your payout is no higher than that, the balance never falls, so the calculator shows that the payout never runs out.'
				]
			},
			{
				heading: 'Why interest matters so much',
				paragraphs: [
					'Interest does much of the work. In the 25-year case, you take out $876,885.06 from a $500,000 sum. The extra $376,885.06 is interest earned along the way.',
					'So a higher rate raises the payout, while a lower rate cuts it. For example, at 0% the same sum spread over 25 years would give only $1,666.67 a month.'
				]
			},
			{
				heading: 'Things to keep in mind',
				paragraphs: ['A fixed plan is simple, but real life is less tidy:'],
				list: [
					'**Returns change.** A lower rate cuts the payout or the time. Try several rates.',
					'**Prices rise.** A fixed payout buys less each year. Check the effect with the [inflation calculator](/inflation-calculator).',
					'**Tax and fees.** Both reduce what you receive.',
					'**Other tools.** To build a sum first, use the [annuity calculator](/annuity-calculator) or the [retirement calculator](/retirement-calculator). To compare a lump sum with a pension, try the [pension calculator](/pension-calculator). Percentage-based withdrawals fit the [SWP calculator](/swp-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Monthly payout that empties the sum',
				expression: 'PMT = P × r ÷ (1 − (1 + r)⁻ⁿ)',
				variables: [
					{ symbol: 'PMT', meaning: 'monthly payout' },
					{ symbol: 'P', meaning: 'starting principal' },
					{ symbol: 'r', meaning: 'monthly interest rate: annual rate ÷ 12 ÷ 100' },
					{ symbol: 'n', meaning: 'number of monthly payouts: years × 12' }
				]
			},
			{
				title: 'Number of months a payout lasts',
				expression: 'n = −ln(1 − P × r ÷ PMT) ÷ ln(1 + r)',
				variables: [
					{ symbol: 'n', meaning: 'number of monthly payouts' },
					{ symbol: 'ln', meaning: 'natural logarithm' }
				]
			}
		],
		example: {
			title: '$500,000 at 5% a year, paid out over 25 years',
			steps: [
				'Monthly rate: r = 5 ÷ 12 ÷ 100 ≈ 0.00416667',
				'Number of payouts: n = 25 × 12 = 300',
				'Discount factor: (1 + r)⁻³⁰⁰ ≈ 0.287250',
				'Denominator: 1 − 0.287250 = 0.712750',
				'Monthly payout: $500,000 × 0.00416667 ÷ 0.712750 ≈ $2,922.95'
			],
			result: 'A level payout of about $2,922.95 a month empties the sum over 25 years.'
		},
		faq: [
			{
				q: 'How do I calculate a monthly payout from a lump sum?',
				a: 'Use the payout formula above with your sum, the monthly rate and the number of months. It finds the level payment that uses up the sum, with interest, by the end.'
			},
			{
				q: 'What does "never runs out" mean?',
				a: 'It means the monthly payout is no more than the interest the balance earns each month. The balance does not shrink, so the payouts can continue without end at this rate.'
			},
			{
				q: 'Why is the final payment smaller?',
				a: 'The time needed rarely comes out to a whole number of months. The last payment covers the remaining balance with its interest and is usually smaller than the regular payout.'
			},
			{
				q: 'How long will my money last with monthly withdrawals?',
				a: 'Choose “How long it lasts” and enter your sum, rate and monthly payout. The calculator counts the months until the balance reaches zero, and shows the final partial payment.'
			},
			{
				q: 'Does this include taxes or fees?',
				a: 'No. The calculator assumes a fixed rate, a fixed payout and no fees. Taxes on the interest or the payouts, and any charges from a provider, are not included.'
			}
		],
		sources: [
			{ title: 'U.S. Securities and Exchange Commission — Investor.gov', url: 'https://www.investor.gov' }
		],
		disclaimer: 'Estimates only. Real balances change with actual returns, and annuity contracts can have fees, surrender charges and taxes that this calculator does not include.'
	}
});
