import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';
import {
	CTC_PER_CHILD,
	CTC_REFUNDABLE,
	EXTRA_65,
	FILING_LABEL,
	FILING_OPTIONS,
	brackets,
	federalTax,

	IRS_TAX_SOURCE,
	SENIOR_DEDUCTION,
	STANDARD_DEDUCTION,
	TAX_YEAR,
	type FilingStatus
} from '../data/us-tax-2026';
import meta from './income-tax-calculator.meta';

/** Content is written once at build time, so format dollars explicitly. */
const usd = (n: number) => moneyIn('USD', n, true);
const pc = (r: number) => `${Math.round(r * 1000) / 10}%`;
const BR_SINGLE = brackets('single');
const BR_MFJ = brackets('mfj');
const LOW = BR_SINGLE[0].rate;
const HIGH = BR_SINGLE[BR_SINGLE.length - 1].rate;
const R22 = BR_SINGLE[2].rate;
const RATE_LIST = (() => {
	const r = BR_SINGLE.map((b) => pc(b.rate));
	return `${r.slice(0, -1).join(', ')} and ${r[r.length - 1]}`;
})();
const EX_INCOME = 85_000;
const EX = federalTax({ status: 'single', income: EX_INCOME, adjustments: 0, itemized: 0, seniors: 0, children: 0 });
const range = (b: { from: number; to: number }, first: boolean) =>
	first ? `Up to ${usd(b.to)}` : Number.isFinite(b.to) ? `${usd(b.from)} to ${usd(b.to)}` : `Over ${usd(b.from)}`;
function bracketRows(): string[][] {
	return BR_SINGLE.map((b, i) => [pc(b.rate), range(b, i === 0), range(BR_MFJ[i], i === 0)]);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'status', label: 'Filing status', type: 'select', default: 'single', display: 'menu', options: FILING_OPTIONS },
		{ id: 'income', label: 'Gross income', type: 'number', default: 85000, min: 0, max: 100_000_000, prefix: '$', help: 'Wages, salary, interest and other ordinary income for the year' },
		{ id: 'adjust', label: 'Pre-tax contributions', type: 'number', default: 0, min: 0, max: 10_000_000, prefix: '$', help: 'Traditional 401(k)/IRA, HSA and other above-the-line deductions' },
		{ id: 'itemized', label: 'Itemized deductions', type: 'number', default: 0, min: 0, max: 100_000_000, prefix: '$', help: 'Leave 0 to use the standard deduction (the larger is used)' },
		{ id: 'me65', label: 'You are 65 or older', type: 'toggle', default: false, width: 'half' },
		{ id: 'sp65', label: 'Spouse is 65 or older', type: 'toggle', default: false, width: 'half', visibleWhen: (v) => v.status === 'mfj' },
		{ id: 'kids', label: 'Children under 17', type: 'number', default: 0, min: 0, max: 15, decimal: false, width: 'half' },
		{ id: 'withheld', label: 'Tax already withheld', type: 'number', default: 0, min: 0, max: 100_000_000, prefix: '$', width: 'half', help: 'From your W-2s and estimated payments' }
	],
	calculate(v): CalculationResult {
		const status = String(v.status) as FilingStatus;
		const income = Number(v.income);
		const adjust = Number(v.adjust);
		const itemized = Number(v.itemized);
		const seniors = (v.me65 === true ? 1 : 0) + (v.status === 'mfj' && v.sp65 === true ? 1 : 0);
		const kids = Number(v.kids);
		const withheld = Number(v.withheld);
		if (!(status in FILING_LABEL) || [income, adjust, itemized, seniors, kids, withheld].some((x) => !Number.isFinite(x) || x < 0)) {
			return { primaryResult: DASH, primaryLabel: `Federal income tax ${TAX_YEAR}`, summary: 'Enter your income and filing status.' };
		}
		const r = federalTax({ status, income, adjustments: adjust, itemized, seniors, children: kids });
		const effective = income > 0 ? (r.tax / income) * 100 : 0;
		const balance = withheld - r.tax;
		const summary =
			withheld > 0
				? balance >= 0
					? `Estimated refund: ${money(balance)}. Your top bracket is ${pct(r.marginal * 100, 0)}.`
					: `Estimated amount owed: ${money(-balance)}. Your top bracket is ${pct(r.marginal * 100, 0)}.`
				: `Your top bracket is ${pct(r.marginal * 100, 0)}; on average you pay ${pct(effective, 1)} of your income.`;
		return {
			primaryResult: money(r.tax),
			primaryLabel: `Federal income tax ${TAX_YEAR}`,
			summary,
			secondaryMetrics: [
				{ label: 'Adjusted gross income', value: money(r.agi) },
				{ label: r.usedStandard ? 'Standard deduction' : 'Itemized deductions', value: money(r.deduction) },
				{ label: 'Senior deduction', value: money(r.senior) },
				{ label: 'Taxable income', value: money(r.taxable) },
				{ label: 'Child tax credit', value: money(r.ctc) },
				{ label: 'Effective tax rate', value: pct(effective, 2) },
				{ label: withheld > 0 && balance < 0 ? 'Amount owed' : 'Refund', value: withheld > 0 ? money(Math.abs(balance)) : DASH }
			],
			table: {
				title: `How your income is taxed (${FILING_LABEL[status]}, ${TAX_YEAR})`,
				columns: [
					{ key: 'rate', label: 'Rate' },
					{ key: 'range', label: 'Bracket' },
					{ key: 'taxed', label: 'Your income', align: 'end' },
					{ key: 'tax', label: 'Tax', align: 'end' }
				],
				rows: r.slices.map((s) => ({
					rate: pct(s.rate * 100, 0),
					range: Number.isFinite(s.to) ? `${money(s.from, true)} – ${money(s.to, true)}` : `Over ${money(s.from, true)}`,
					taxed: money(s.taxed, true),
					tax: money(s.tax)
				}))
			}
		};
	},
	content: {
		intro: `Use this income tax calculator to estimate your ${TAX_YEAR} US federal income tax, your tax bracket and your refund or amount owed. It applies the IRS brackets, the standard deduction, the senior deduction and the child tax credit. However, state and local taxes aren’t included.`,
		howTo: [
			'Pick your filing status and enter your gross income for the year.',
			'Add pre-tax contributions (traditional 401(k), IRA, HSA) and any itemized deductions.',
			'Tick if you (or your spouse, on a joint return) are 65 or older, and enter children under 17.',
			'Optionally enter the tax already withheld to see your refund or amount owed.'
		],
		about: [
			{
				heading: 'How US federal income tax works',
				paragraphs: [
					`The US taxes income in layers. This is called a progressive system. Each slice of your taxable income (your income after deductions) is taxed at its own rate, from ${pc(LOW)} up to ${pc(HIGH)}.`,
					`So moving into a higher bracket doesn’t tax all of your income at the higher rate. Only the part above the bracket line is taxed at that rate. For example, a single filer with ${usd(EX_INCOME)} of income and the standard deduction has taxable income of ${usd(EX.taxable)}, so the tax is ${usd(EX.tax)}, even though the top slice is taxed at ${pc(EX.marginal)}.`,
					'Your tax bracket is the rate on your last dollar of taxable income. Your effective rate is your total tax divided by your income. The effective rate is always lower, because the first dollars are taxed at the two lowest rates.'
				]
			},
			{
				heading: `${TAX_YEAR} federal tax brackets`,
				paragraphs: [
					`These are the ranges of taxable income for tax year ${TAX_YEAR}, which you report on the return you file in ${TAX_YEAR + 1}. Married filing separately and head of household use their own ranges. The table under your result shows the one for your filing status.`
				],
				table: {
					caption: `Federal income tax brackets, ${TAX_YEAR} (taxable income)`,
					columns: ['Rate', 'Single', 'Married filing jointly'],
					rows: bracketRows()
				}
			},
			{
				heading: 'Deductions and credits in this calculator',
				paragraphs: [
					`The standard deduction is an amount you subtract from income without listing any expenses. For ${TAX_YEAR} it is ${usd(STANDARD_DEDUCTION.single)} for single filers and married people filing separately, ${usd(STANDARD_DEDUCTION.mfj)} for joint filers, and ${usd(STANDARD_DEDUCTION.hoh)} for heads of household. If your itemized deductions are larger, the calculator uses those instead.`,
					'Four things can lower your bill further:'
				],
				list: [
					`**Age 65 or older.** The standard deduction goes up by ${usd(EXTRA_65.single)} for a single filer or ${usd(EXTRA_65.mfj)} per person on a joint return.`,
					`**Senior deduction.** For tax years 2025 to 2028, each person aged 65 or older can deduct up to ${usd(SENIOR_DEDUCTION)} more. It shrinks as income rises, but married people filing separately can’t claim it at all.`,
					`**Pre-tax contributions.** Money you put into a traditional 401(k), IRA or HSA lowers your taxable income. Try the [401(k) calculator](/401k-calculator) or the [IRA calculator](/ira-calculator) to see how that money grows.`,
					`**Child tax credit.** It is worth up to ${usd(CTC_PER_CHILD)} for each child under 17, and up to ${usd(CTC_REFUNDABLE)} of it can be refunded. It phases out at higher incomes.`
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					`First, the big number is your federal income tax after credits. Then you’ll see your adjusted gross income, your deduction, your taxable income and your effective tax rate.`,
					`Your top bracket tells you what extra income costs. If it is ${pc(R22)}, then another ${usd(1000)} of taxable income adds about ${usd(1000 * R22)} of tax. Also, a deduction of ${usd(1000)} saves about the same amount.`,
					'If you enter the tax already withheld from your pay, the calculator also shows a refund or an amount owed. A refund just means more was withheld than your tax. It isn’t extra income, so some people adjust their W-4 form instead.'
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					'This is a quick estimate of regular federal income tax on wages and similar income. However, it leaves out several things that can change your real bill:'
				],
				list: [
					'State and local income tax. A [take-home pay calculator](/take-home-pay-calculator) lets you add a state rate, plus Social Security and Medicare.',
					'Capital gains and dividends taxed at special rates, self-employment tax and the alternative minimum tax.',
					'Most other credits and deductions, such as education credits and the earned income credit.',
					'Marriage effects. To see how filing jointly compares with filing as two single people, use the [marriage tax calculator](/marriage-tax-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Federal income tax',
				expression: 'Taxable income = Gross income − Pre-tax contributions − max(Standard, Itemized) − Senior deduction',
				variables: [
					{ symbol: 'Standard', meaning: `${usd(STANDARD_DEDUCTION.single)} single or married filing separately, ${usd(STANDARD_DEDUCTION.mfj)} joint, ${usd(STANDARD_DEDUCTION.hoh)} head of household, plus ${usd(EXTRA_65.single)} (single or head of household) or ${usd(EXTRA_65.mfj)} (married) per person aged 65 or older` },
					{ symbol: 'Senior deduction', meaning: `up to ${usd(SENIOR_DEDUCTION)} per person aged 65 or older (2025 to 2028), reduced as income rises` },
					{ symbol: 'Tax', meaning: `each slice of taxable income × its bracket rate (${pc(LOW)} to ${pc(HIGH)}), then minus credits` }
				]
			},
			{
				title: 'Child tax credit',
				expression: `Credit = ${usd(CTC_PER_CHILD)} × children, reduced in steps once income passes the phase-out start`,
				variables: [{ symbol: 'Refundable part', meaning: `up to ${usd(CTC_REFUNDABLE)} per child, and limited by how much earned income you have` }]
			}
		],
		example: {
			title: `Single filer earning ${usd(EX_INCOME)}, no other deductions`,
			steps: [
				`Taxable income: ${usd(EX_INCOME)} − ${usd(STANDARD_DEDUCTION.single)} standard deduction = ${usd(EX.taxable)}`,
				...EX.slices.filter((s) => s.taxed > 0).map((s) => `${pc(s.rate)} on ${usd(s.taxed)} (${Number.isFinite(s.to) ? `${usd(s.from)} to ${usd(Math.min(s.to, EX.taxable))}` : `over ${usd(s.from)}`}) = ${usd(s.tax)}`)
			],
			result: `Federal income tax: ${usd(EX.tax)}, an effective rate of ${((EX.tax / EX_INCOME) * 100).toFixed(2)}%.`
		},
		faq: [
			{
				q: 'How do I calculate my federal income tax?',
				a: 'First, start with your gross income. Subtract pre-tax contributions and your deduction to get taxable income. Then apply each bracket rate to its slice and subtract any credits. This calculator does all of those steps for you.'
			},
			{
				q: `What are the ${TAX_YEAR} federal tax brackets?`,
				a: `There are seven rates: ${RATE_LIST}. For a single filer, ${pc(HIGH)} starts above ${usd(BR_SINGLE[6].from)} of taxable income. On a joint return, it starts above ${usd(BR_MFJ[6].from)}. The table under your result shows the full list for your status.`
			},
			{
				q: 'What is the difference between my tax bracket and my effective rate?',
				a: 'Your bracket is the rate on your last dollar of taxable income. Your effective rate is your total tax divided by your income. It is always lower, because the first dollars are taxed at the lowest rates.'
			},
			{
				q: 'Does this include Social Security, Medicare or state tax?',
				a: 'No. This is federal income tax only. The take-home pay calculator adds Social Security, Medicare and a state income tax rate, so it shows what reaches your bank account.'
			},
			{
				q: 'Who gets the senior deduction?',
				a: `Anyone aged 65 or older by the end of the year with a valid Social Security number, for tax years 2025 through 2028. It is worth up to ${usd(SENIOR_DEDUCTION)} per person. It shrinks as income rises, and you can’t claim it if you are married filing separately.`
			},
			{
				q: 'I live outside the US. Can I use this?',
				a: 'Only if you file a US federal return, for example as a US citizen living abroad. Other countries tax income under completely different rules.'
			}
		],
		sources: [
			IRS_TAX_SOURCE,
			{ title: 'IRS — One, Big, Beautiful Bill provisions', url: 'https://www.irs.gov/newsroom/one-big-beautiful-bill-provisions' },
			{ title: 'IRS — Publication 17, Your Federal Income Tax', url: 'https://www.irs.gov/publications/p17' }
		],
		disclaimer: 'An estimate of regular federal income tax for ordinary income. It leaves out capital gains rates, self-employment tax, AMT and most credits. Not tax advice. Check your return with a tax professional or the IRS.'
	}
});
