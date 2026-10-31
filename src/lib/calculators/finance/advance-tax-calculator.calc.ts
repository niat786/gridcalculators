import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, moneyIn, num } from '../format';
import meta from './advance-tax-calculator.meta';
import { parseIso } from './capital-gains-tax-calculator-india.calc';
import {
	ADVANCE_TAX_INTEREST_PCT_PER_MONTH,
	ADVANCE_TAX_SENIOR_AGE,
	ADVANCE_TAX_THRESHOLD,
	CG_TAX_YEAR_LABEL,
	INSTALMENTS_FY2026_27,
	SAFE_HARBOUR_PCT,
	SEC403_SOURCE,
	SEC404_SOURCE,
	SEC408_SOURCE,
	SEC425_SOURCE,
	type Instalment
} from '../data/in-cg-fy2026-27';

const inr = (n: number) => moneyIn('INR', n, true);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function dueLabel(iso: string): string {
	const p = parseIso(iso)!;
	return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Advance tax payable', summary });

const paidFields = ['paid1', 'paid2', 'paid3', 'paid4'] as const;

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'tax', label: 'Estimated tax for the year', type: 'number', default: 250000, min: 0, max: 100_000_000_000, step: 1000, prefix: '$', help: 'Total tax on all your income for FY 2026-27 including surcharge and cess.' },
		{ id: 'tds', label: 'TDS and TCS you expect', type: 'number', default: 80000, min: 0, max: 100_000_000_000, step: 1000, prefix: '$', help: 'Tax already deducted or collected at source on income you included above.' },
		{
			id: 'senior',
			label: 'Resident aged 60 or over with no business or professional income',
			type: 'toggle',
			default: false,
			help: 'Such a person does not have to pay advance tax.'
		},
		{
			id: 'presumptive',
			label: 'I use presumptive taxation for business or a profession',
			type: 'toggle',
			default: false,
			visibleWhen: (v) => v.senior !== true,
			help: 'Presumptive profits (section 58(2), table items 1 and 3) are paid in one go by 15 March.'
		},
		{ id: 'asOf', label: 'Today’s date', type: 'date', default: 'today', help: 'Used to show the next due date.' },
		{
			id: 'interest',
			label: 'Work out interest on instalments I missed',
			type: 'toggle',
			default: false,
			visibleWhen: (v) => v.senior !== true
		},
		{
			id: 'paid1',
			label: 'Paid in total by 15 June 2026',
			type: 'number',
			default: 0,
			min: 0,
			max: 100_000_000_000,
			step: 1000,
			prefix: '$',
			visibleWhen: (v) => v.interest === true && v.presumptive !== true && v.senior !== true,
			help: 'Add up everything you paid on or before the date.'
		},
		{ id: 'paid2', label: 'Paid in total by 15 September 2026', type: 'number', default: 0, min: 0, max: 100_000_000_000, step: 1000, prefix: '$', visibleWhen: (v) => v.interest === true && v.presumptive !== true && v.senior !== true },
		{ id: 'paid3', label: 'Paid in total by 15 December 2026', type: 'number', default: 0, min: 0, max: 100_000_000_000, step: 1000, prefix: '$', visibleWhen: (v) => v.interest === true && v.presumptive !== true && v.senior !== true },
		{ id: 'paid4', label: 'Paid in total by 15 March 2027', type: 'number', default: 0, min: 0, max: 100_000_000_000, step: 1000, prefix: '$', visibleWhen: (v) => v.interest === true && v.senior !== true }
	],
	calculate(v: InputValues): CalculationResult {
		const tax = Number(v.tax);
		const tds = Number(v.tds);
		if (!Number.isFinite(tax) || !Number.isFinite(tds) || tax < 0 || tds < 0) return fail('Enter your estimated tax and the TDS or TCS you expect.');
		const asOf = parseIso(v.asOf);
		if (!asOf) return fail('Enter a valid date.');

		const senior = v.senior === true;
		const presumptive = !senior && v.presumptive === true;
		const wantInterest = !senior && v.interest === true;
		const net = Math.max(0, tax - tds);
		const liable = !senior && net >= ADVANCE_TAX_THRESHOLD;

		const schedule: Instalment[] = presumptive ? [INSTALMENTS_FY2026_27[3]] : INSTALMENTS_FY2026_27;
		const paid: number[] = [];
		if (wantInterest) {
			for (const f of paidFields) paid.push(Number(v[f]));
			// A presumptive payer only has the March figure.
			if (presumptive) paid.splice(0, 3);
			if (paid.some((p) => !Number.isFinite(p) || p < 0)) return fail('Enter what you paid by each date, or 0.');
			// Payments are cumulative: they cannot fall as time passes.
			for (let i = 1; i < paid.length; i++) if (paid[i] < paid[i - 1]) return fail('The totals must not fall: each date includes everything paid before it.');
		}

		let totalInterest = 0;
		let prev = 0;
		const rows = schedule.map((inst, i) => {
			const cum = (net * inst.cumulativePct) / 100;
			const row: Record<string, string> = {
				due: dueLabel(inst.due),
				pct: `${inst.cumulativePct}%`,
				cum: liable ? money(cum) : money(0),
				inst: liable ? money(cum - prev) : money(0)
			};
			prev = cum;
			if (wantInterest && liable) {
				const paidBy = paid[i];
				const short = Math.max(0, cum - paidBy);
				const harbour = SAFE_HARBOUR_PCT[inst.due];
				const safe = harbour !== undefined && paidBy >= (net * harbour) / 100;
				const interest = safe ? 0 : (short * ADVANCE_TAX_INTEREST_PCT_PER_MONTH * inst.interestMonths) / 100;
				totalInterest += interest;
				row.paid = money(paidBy);
				row.short = money(short);
				row.interest = money(interest);
			}
			return row;
		});

		// Next due date from the chosen "today".
		const next = schedule.find((s) => (parseIso(s.due) as { t: number }).t >= asOf.t);
		const nextRow = next ? rows[schedule.indexOf(next)] : null;
		const nextText = !liable ? DASH : next ? `${nextRow!.due}: have paid ${nextRow!.cum} in total` : 'All FY 2026-27 dates have passed';

		const reason = senior
			? `No advance tax: a resident aged ${ADVANCE_TAX_SENIOR_AGE} or over with no business or professional income is exempt.`
			: net < ADVANCE_TAX_THRESHOLD
				? `No advance tax: tax after TDS is ${money(net)}, below the ${money(ADVANCE_TAX_THRESHOLD, true)} limit.`
				: presumptive
					? `Pay the whole ${money(net)} by 15 March 2027 (presumptive taxation).`
					: `Pay ${money(net)} in total across four instalments (15%, 45%, 75% and 100% cumulative).`;

		const metrics = [
			{ label: 'Estimated tax', value: money(tax) },
			{ label: 'Less TDS and TCS', value: money(Math.min(tds, tax)) },
			{ label: 'Tax after TDS', value: money(net) },
			{ label: 'Advance tax needed?', value: senior ? 'No (senior citizen)' : liable ? 'Yes' : `No (under ${money(ADVANCE_TAX_THRESHOLD, true)})` },
			{ label: 'Next due date', value: nextText },
			...(wantInterest ? [{ label: 'Interest on shortfall (section 425)', value: liable ? money(totalInterest) : money(0) }] : [])
		];

		const columns = [
			{ key: 'due', label: 'Due date' },
			{ key: 'pct', label: 'Cumulative', align: 'end' as const },
			{ key: 'cum', label: 'Total to have paid', align: 'end' as const },
			{ key: 'inst', label: 'This instalment', align: 'end' as const },
			...(wantInterest && liable
				? [
						{ key: 'paid', label: 'You paid by then', align: 'end' as const },
						{ key: 'short', label: 'Shortfall', align: 'end' as const },
						{ key: 'interest', label: 'Interest', align: 'end' as const }
					]
				: [])
		];

		return {
			primaryResult: liable ? money(net) : money(0),
			primaryLabel: `Advance tax payable for ${CG_TAX_YEAR_LABEL}`,
			summary: reason,
			secondaryMetrics: metrics,
			table: { title: 'Advance tax instalments', columns, rows }
		};
	},
	content: {
		intro: `Use this advance tax calculator to find out whether you need to pay advance tax for ${CG_TAX_YEAR_LABEL} in India. It shows how much to pay by each of the four dates, and the interest charged if you pay late or short.`,
		howTo: [
			'Enter your estimated total tax for the year and the TDS or TCS you expect, then tick the boxes that apply to you.',
			'Read the amount due by 15 June, 15 September, 15 December and 15 March. They are cumulative: each total includes the earlier ones.',
			'To see interest, switch on the interest option and enter the total you actually paid by each date.'
		],
		about: [
			{
				heading: 'What is advance tax?',
				paragraphs: [
					'Advance tax is income tax that you pay during the year, in instalments, instead of paying it all after the year ends. It is also called pay-as-you-earn tax.',
					`You must pay it if your tax for the year, after TDS and TCS, is ${inr(ADVANCE_TAX_THRESHOLD)} or more. Salaried people often have no advance tax, because their employer deducts TDS. However, income from interest, rent, freelance work or capital gains may need advance tax.`
				]
			},
			{
				heading: 'Who does not have to pay advance tax?',
				paragraphs: [
					`A resident individual aged ${ADVANCE_TAX_SENIOR_AGE} or over who has no income from business or profession does not have to pay advance tax. If your tax after TDS is below ${inr(ADVANCE_TAX_THRESHOLD)}, you also have nothing to pay in advance.`,
					'People who use presumptive taxation for business or a profession pay the whole amount in one go, by 15 March. Tick that option in the calculator to see it.'
				]
			},
			{
				heading: `Advance tax dates for ${CG_TAX_YEAR_LABEL}`,
				paragraphs: [
					'The amounts are cumulative. By each date, you must have paid at least the given share of the year’s advance tax. The table shows the plan for a tax of ₹1,70,000 after TDS.'
				],
				table: {
					caption: 'Instalments on ₹1,70,000',
					columns: ['Due date', 'Cumulative share', 'Total to have paid', 'This instalment'],
					rows: INSTALMENTS_FY2026_27.map((inst, i) => {
						const net = 170_000;
						const cum = (net * inst.cumulativePct) / 100;
						const prev = i === 0 ? 0 : (net * INSTALMENTS_FY2026_27[i - 1].cumulativePct) / 100;
						return [dueLabel(inst.due), `${inst.cumulativePct}%`, inr(cum), inr(cum - prev)];
					})
				}
			},
			{
				heading: 'Interest on late or short payment',
				paragraphs: [
					`If you pay less than the required amount by a date, you pay simple interest of ${ADVANCE_TAX_INTEREST_PCT_PER_MONTH}% a month on the shortfall. It is charged for 3 months at the June, September and December dates, and for 1 month at the March date. This is section 425 of the Income-tax Act, 2025.`,
					'There is a safe harbour. If you have paid at least 12% of the tax by 15 June, or at least 36% by 15 September, no interest applies for those two dates.',
					'For example, with ₹1,70,000 due and nothing paid, the interest is ₹8,585. If you pay ₹25,500 and ₹76,500 on time, but only ₹1,00,000 by December, the interest is ₹825.'
				]
			},
			{
				heading: 'Tips for paying advance tax',
				paragraphs: ['A few habits keep it simple:'],
				list: [
					'**Estimate your tax early.** Use the [India income tax calculator](/india-income-tax-calculator) to work out the year’s tax.',
					'**Include capital gains.** A big sale can create a large tax bill. Estimate it with the [capital gains tax calculator](/capital-gains-tax-calculator-india).',
					'**Count TDS correctly.** Only TDS and TCS on income included in your estimate should be subtracted.',
					'**Pay on time.** The dates are fixed, and each one has its own cumulative target.',
					'**Check your salary tax.** If you earn a salary, see the effect on take-home pay in the [in-hand salary calculator](/in-hand-salary-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Advance tax and instalments',
				expression: 'Advance tax = estimated tax − TDS/TCS (payable only if ≥ ₹10,000)\nBy 15 Jun 15% · by 15 Sep 45% · by 15 Dec 75% · by 15 Mar 100%',
				variables: [{ symbol: 'Presumptive taxation', meaning: 'one payment of 100% by 15 March' }]
			},
			{
				title: 'Interest on a shortfall (section 425)',
				expression: 'Interest = shortfall × 1% × months  (3 months for 15 Jun, 15 Sep, 15 Dec; 1 month for 15 Mar)',
				variables: [
					{ symbol: 'Shortfall', meaning: 'required cumulative amount − advance tax paid by that date' },
					{ symbol: 'Safe harbour', meaning: 'no interest on the June or September shortfall if you paid at least 12% or 36% of the tax by that date' }
				]
			}
		],
		example: {
			title: 'Estimated tax ₹2,50,000 with ₹80,000 TDS',
			steps: [
				'Tax after TDS: ₹2,50,000 − ₹80,000 = ₹1,70,000. This is above ₹10,000, so advance tax applies.',
				'By 15 June 15%: ₹25,500. By 15 September 45%: ₹76,500. By 15 December 75%: ₹1,27,500. By 15 March 100%: ₹1,70,000.',
				'If you had paid nothing: interest = 15% × 3% + 45% × 3% + 75% × 3% on the shortfalls, plus 1% on the full amount at March, which is ₹8,585 on ₹1,70,000.'
			],
			result: '₹1,70,000 advance tax'
		},
		faq: [
			{
				q: 'How do I calculate advance tax?',
				a: 'Estimate your total tax for the year and subtract the TDS and TCS. If the result is ₹10,000 or more, pay 15% by 15 June, 45% by 15 September, 75% by 15 December and 100% by 15 March.'
			},
			{
				q: 'Who does not have to pay advance tax?',
				a: 'You pay it only if the tax after TDS is ₹10,000 or more. A resident individual aged 60 or over with no income from business or profession is exempt. Those using presumptive taxation pay once, by 15 March.'
			},
			{
				q: 'Is the advance tax section number still 234C?',
				a: 'No. From 1 April 2026 the Income-tax Act, 2025 applies: advance tax is section 403 to 408 and the interest for late or short instalments is section 425. The percentages and the 1% a month rate are unchanged.'
			},
			{
				q: 'What is the interest for missing an advance tax date?',
				a: 'It is 1% a month on the shortfall. That is 3 months of interest for the June, September and December dates, and 1 month for March. Paying 12% by June or 36% by September avoids interest for those dates.'
			},
			{
				q: 'What is not included?',
				a: 'Interest for paying less than 90% by 31 March (the old 234B) is not included. Nor is the relief for a shortfall that comes only from capital gains or dividends you could not foresee, if you pay that tax in the next instalment. Check your return for those.'
			}
		],
		sources: [SEC403_SOURCE, SEC404_SOURCE, SEC408_SOURCE, SEC425_SOURCE],
		disclaimer: 'This is an estimate for general information, not tax advice. Use your own tax computation for the estimated tax and confirm dates and rules with the Income Tax Department.'
	}
});
