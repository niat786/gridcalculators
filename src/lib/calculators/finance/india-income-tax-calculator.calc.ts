import { defineCalculator, type CalculationResult, type CalculatorInput, type InputValues } from '../types';
import { DASH, money, moneyIn } from '../format';
import meta from './india-income-tax-calculator.meta';
import {
	AGE_OPTIONS,
	CAP_80C,
	CAP_80D_TOTAL,
	CAP_HOME_LOAN_INTEREST,
	CAP_NPS_EXTRA,
	IN_REBATE_SOURCE,
	IN_ROUNDING_SOURCE,
	IN_SALARY_DEDUCTIONS_SOURCE,
	IN_TAX_SOURCE,
	IN_TAX_YEAR_FULL,
	IN_TAX_YEAR_LABEL,
	IN_THRESHOLDS_SOURCE,
	NEW_REGIME_REBATE_LIMIT,
	NEW_REGIME_SLABS,
	OLD_REGIME_SLABS,
	STANDARD_DEDUCTION_NEW,
	STANDARD_DEDUCTION_OLD,
	type AgeGroup,
	type Slab
} from '../data/in-tax-fy2026-27';
import { assess, type AssessInput } from '../data/in-tax-engine';

const rupee = (n: number) => money(n, true);
/** Content is written at build time, so format rupees explicitly (₹12,00,000). */
const inr = (n: number) => moneyIn('INR', n, true);
function slabRows(slabs: Slab[]): string[][] {
	let from = 0;
	return slabs.map((sl) => {
		const band = Number.isFinite(sl.upTo) ? (from === 0 ? `Up to ${inr(sl.upTo)}` : `${inr(from + 1)} to ${inr(sl.upTo)}`) : `Above ${inr(from)}`;
		from = sl.upTo;
		return [band, sl.rate === 0 ? 'Nil' : `${Math.round(sl.rate * 100)}%`];
	});
}
const n0 = (x: unknown) => {
	const v = Number(x);
	return Number.isNaN(v) ? 0 : v;
};

const inputs: CalculatorInput[] = [
	{ id: 'age', label: 'Age group', type: 'select', default: 'below60', options: AGE_OPTIONS, display: 'segmented', help: 'Only changes the old-regime slabs. Resident individuals.' },
	{ id: 'salary', label: 'Gross salary income', type: 'number', default: 1_500_000, min: 0, max: 10_000_000_000, step: 1000, prefix: '$', decimal: false, help: 'Per year, before the standard deduction.' },
	{ id: 'other', label: 'Other income', type: 'number', default: 0, min: 0, max: 10_000_000_000, step: 1000, prefix: '$', decimal: false, help: 'Interest, rent and similar income taxed at normal slab rates.' },
	{ id: 'hra', label: 'HRA exemption (old regime)', type: 'number', default: 0, min: 0, max: 10_000_000_000, step: 1000, prefix: '$', decimal: false, help: 'Use the HRA Calculator for this amount.' },
	{ id: 'd80c', label: 'Section 80C investments (old regime)', type: 'number', default: 150_000, min: 0, max: 10_000_000_000, step: 1000, prefix: '$', decimal: false, help: `EPF, PPF, ELSS, life insurance and similar. Capped at ${CAP_80C.toLocaleString('en-IN')}.` },
	{ id: 'd80d', label: 'Health insurance, 80D (old regime)', type: 'number', default: 25_000, min: 0, max: 10_000_000_000, step: 1000, prefix: '$', decimal: false, help: `Self, family and parents together. Capped at ${CAP_80D_TOTAL.toLocaleString('en-IN')}.` },
	{ id: 'loan', label: 'Home loan interest, self-occupied (old regime)', type: 'number', default: 0, min: 0, max: 10_000_000_000, step: 1000, prefix: '$', decimal: false, help: `Capped at ${CAP_HOME_LOAN_INTEREST.toLocaleString('en-IN')}.` },
	{ id: 'nps', label: 'Own NPS, extra deduction (old regime)', type: 'number', default: 0, min: 0, max: 10_000_000_000, step: 1000, prefix: '$', decimal: false, help: `80CCD(1B). Capped at ${CAP_NPS_EXTRA.toLocaleString('en-IN')}.` },
	{ id: 'pt', label: 'Professional tax paid (old regime)', type: 'number', default: 0, min: 0, max: 100_000, step: 100, prefix: '$', decimal: false },
	{ id: 'otherDed', label: 'Other deductions (old regime)', type: 'number', default: 0, min: 0, max: 10_000_000_000, step: 1000, prefix: '$', decimal: false, help: 'Education loan interest, donations, savings interest and so on, already within their own limits.' },
	{ id: 'empNps', label: 'Employer NPS contribution (both regimes)', type: 'number', default: 0, min: 0, max: 10_000_000_000, step: 1000, prefix: '$', decimal: false, help: 'Employer contribution to your NPS account, per year.' },
	{ id: 'basicDa', label: 'Basic salary + DA (for the NPS limit)', type: 'number', default: 0, min: 0, max: 10_000_000_000, step: 1000, prefix: '$', decimal: false, visibleWhen: (v) => n0(v.empNps) > 0, help: 'Yearly. The limit is 14% of this (10% in the old regime for a private employer).' },
	{ id: 'employer', label: 'Employer type', type: 'select', default: 'other', options: [{ label: 'Government', value: 'govt' }, { label: 'Other', value: 'other' }], display: 'segmented', visibleWhen: (v) => n0(v.empNps) > 0 }
];

function calculate(v: InputValues): CalculationResult {
	const salary = Number(v.salary);
	const other = Number(v.other);
	const required = [salary, other];
	if (required.some((x) => !Number.isFinite(x) || x < 0) || salary + other <= 0) {
		return { primaryResult: DASH, primaryLabel: 'Lower tax', summary: 'Enter your salary or other income as zero or more.' };
	}
	if (!AGE_OPTIONS.some((o) => o.value === v.age)) {
		return { primaryResult: DASH, primaryLabel: 'Lower tax', summary: 'Choose an age group.' };
	}
	const empNps = n0(v.empNps);
	const basicDa = n0(v.basicDa);
	if (empNps > 0 && !(basicDa > 0)) {
		return { primaryResult: DASH, primaryLabel: 'Lower tax', summary: 'Enter your yearly basic salary + DA so the employer NPS limit can be applied.' };
	}
	const input: AssessInput = {
		age: String(v.age) as AgeGroup,
		salary,
		otherIncome: other,
		hraExemption: n0(v.hra),
		ded80c: n0(v.d80c),
		ded80d: n0(v.d80d),
		homeLoanInterest: n0(v.loan),
		nps1b: n0(v.nps),
		professionalTax: n0(v.pt),
		otherDeductions: n0(v.otherDed),
		employerNps: empNps,
		basicDa,
		govtEmployer: v.employer === 'govt'
	};
	const nw = assess('new', input);
	const od = assess('old', input);
	const a = nw.tax.total;
	const b = od.tax.total;
	const diff = Math.abs(a - b);
	const better = a === b ? 'same' : a < b ? 'new' : 'old';
	const lowerTax = Math.min(a, b);
	const summary =
		better === 'same'
			? 'Both regimes give the same tax.'
			: `The ${better === 'new' ? 'new' : 'old'} regime is lower by ${rupee(diff)} a year (about ${rupee(diff / 12)} a month).`;

	const row = (item: string, x: string, y: string) => ({ item, newR: x, oldR: y });
	const rate = (t: typeof nw.tax) => (t.surchargeRate > 0 ? `${t.surchargeRate * 100}%` : 'None');
	return {
		primaryResult: rupee(lowerTax),
		primaryLabel: better === 'same' ? 'Income tax (same in both regimes)' : `Lower tax: ${better === 'new' ? 'new' : 'old'} regime`,
		summary,
		secondaryMetrics: [
			{ label: 'New regime tax', value: rupee(a) },
			{ label: 'Old regime tax', value: rupee(b) },
			{ label: 'Difference', value: rupee(diff) },
			{ label: 'New regime taxable income', value: rupee(nw.tax.totalIncome) },
			{ label: 'Old regime taxable income', value: rupee(od.tax.totalIncome) }
		],
		table: {
			title: `${IN_TAX_YEAR_LABEL} tax, new regime vs old regime`,
			columns: [
				{ key: 'item', label: 'Item' },
				{ key: 'newR', label: 'New regime', align: 'end' },
				{ key: 'oldR', label: 'Old regime', align: 'end' }
			],
			rows: [
				row('Gross salary + other income', rupee(nw.salary + nw.otherIncome), rupee(od.salary + od.otherIncome)),
				row('HRA exemption', rupee(nw.hraExemption), rupee(od.hraExemption)),
				row('Standard deduction', rupee(nw.standardDeduction), rupee(od.standardDeduction)),
				row('Professional tax', rupee(nw.professionalTax), rupee(od.professionalTax)),
				row('Home loan interest', rupee(nw.houseProperty), rupee(od.houseProperty)),
				row('Deductions (80C, 80D, NPS, other)', rupee(nw.deductions), rupee(od.deductions)),
				row('Taxable income (rounded to Rs 10)', rupee(nw.tax.totalIncome), rupee(od.tax.totalIncome)),
				row('Tax on slabs', rupee(nw.tax.slabTax), rupee(od.tax.slabTax)),
				row('Rebate (section 156)', rupee(nw.tax.rebate), rupee(od.tax.rebate)),
				row('Marginal relief', rupee(nw.tax.marginalRelief), rupee(od.tax.marginalRelief)),
				row('Surcharge rate', rate(nw.tax), rate(od.tax)),
				row('Surcharge after marginal relief', rupee(nw.tax.surcharge), rupee(od.tax.surcharge)),
				row('Health and education cess (4%)', rupee(nw.tax.cess), rupee(od.tax.cess)),
				row('Total tax (rounded to Rs 10)', rupee(a), rupee(b))
			]
		}
	};
}

export default defineCalculator({
	meta,
	inputs,
	calculate,
	content: {
		intro: `Compare your income tax under the new and old regimes for ${IN_TAX_YEAR_FULL}. Enter your salary and deductions, and see which regime leaves you with less tax to pay.`,
		howTo: [
			'Pick your age group, then enter your yearly gross salary and any other income.',
			'For the old regime, add your HRA exemption, 80C, 80D, home loan interest, NPS and other deductions. The new regime ignores most of them.',
			'Read the tax under each regime, and which one is lower.',
			'Choose that regime when you file your return, or tell your employer at the start of the year.'
		],
		about: [
			{
				heading: 'New regime vs old regime: what’s the difference?',
				paragraphs: [
					'India has two ways to work out income tax for individuals. The **new regime** has lower slab rates, but you give up most deductions. The **old regime** has higher rates, but you can claim deductions such as 80C, 80D, HRA and home loan interest.',
					`The new regime is now the default. So if you don’t choose, your tax is worked out under it. Salaried people still get a standard deduction in both: ${inr(STANDARD_DEDUCTION_NEW)} in the new regime and ${inr(STANDARD_DEDUCTION_OLD)} in the old one.`,
					'In short, the right choice depends on how much you can claim in deductions. This calculator works out both, so you don’t have to guess.'
				]
			},
			{
				heading: `New regime tax slabs for ${IN_TAX_YEAR_LABEL}`,
				paragraphs: [
					'These rates apply to every age group. On top of the slab tax, you pay a 4% health and education cess.',
					`There is also a rebate. If your taxable income is ${inr(NEW_REGIME_REBATE_LIMIT)} or less, your tax is nil. For salaried people, that means a salary of up to ${inr(NEW_REGIME_REBATE_LIMIT + STANDARD_DEDUCTION_NEW)} is tax-free, thanks to the standard deduction.`
				],
				table: { caption: `New regime, ${IN_TAX_YEAR_LABEL}`, columns: ['Taxable income', 'Rate'], rows: slabRows(NEW_REGIME_SLABS) }
			},
			{
				heading: 'Old regime slabs and deductions',
				paragraphs: [
					'The old regime has three slab tables, one for each age group. Below are the rates for people under 60. If you are 60 to 79, the nil slab goes up to ₹3,00,000. At 80 or above, it goes up to ₹5,00,000.'
				],
				table: { caption: `Old regime, below 60, ${IN_TAX_YEAR_LABEL}`, columns: ['Taxable income', 'Rate'], rows: slabRows(OLD_REGIME_SLABS.below60) },
				list: [
					`**80C (section 123):** up to ${inr(CAP_80C)} for EPF, PPF, ELSS, life insurance and more. See how a [PPF account](/ppf-calculator) grows.`,
					`**Health insurance, 80D (section 126):** up to ${inr(CAP_80D_TOTAL)} in total for you, your family and your parents.`,
					`**Home loan interest:** up to ${inr(CAP_HOME_LOAN_INTEREST)} a year on a home you live in.`,
					`**NPS, 80CCD(1B):** an extra ${inr(CAP_NPS_EXTRA)} for your own [NPS contributions](/nps-calculator).`,
					'**HRA exemption:** work it out first with the [HRA calculator](/hra-calculator), then enter it here.'
				]
			},
			{
				heading: 'Which regime should you choose?',
				paragraphs: [
					'For most people with few deductions, the new regime gives lower tax. However, if you claim a lot, the old regime can still win.',
					'For example, take a salary of ₹15,00,000. Under the new regime, the tax is ₹97,500. To pay the same under the old regime, you would need about ₹5.44 lakh of deductions, including HRA. With more than that, the old regime is cheaper.',
					'If you have no business income, you can usually pick the regime each year when you file your return. People with business or professional income face stricter limits on switching.'
				]
			},
			{
				heading: 'Surcharge, cess and marginal relief',
				paragraphs: [
					'High earners pay a surcharge on their tax. It starts at 10% above ₹50 lakh of income and rises with income. In the new regime, it stops at 25%.',
					'Then a 4% cess is added to the tax and surcharge together. Marginal relief makes sure that crossing a limit by a small amount never raises your tax by more than the extra income. The calculator applies all of this for you.',
					'To see what lands in your bank account each month, try the [in-hand salary calculator](/in-hand-salary-calculator). If you owe tax beyond TDS, the [advance tax calculator](/advance-tax-calculator) shows the due dates.'
				]
			}
		],
		formulas: [
			{
				title: `New regime slabs (${IN_TAX_YEAR_LABEL}, section 202 of the Income-tax Act, 2025)`,
				expression: 'Nil to ₹4L · 5% to ₹8L · 10% to ₹12L · 15% to ₹16L · 20% to ₹20L · 25% to ₹24L · 30% above',
				variables: [
					{ symbol: 'Rebate', meaning: 'Income up to ₹12,00,000: rebate of the tax, up to ₹60,000. Above it, tax is limited to the income over ₹12,00,000.' },
					{ symbol: 'Standard deduction', meaning: '₹75,000 new regime, ₹50,000 old regime (salary)' },
					{ symbol: 'Surcharge', meaning: '10% above ₹50L, 15% above ₹1Cr, 25% above ₹2Cr (old regime also 37% above ₹5Cr), with marginal relief' },
					{ symbol: 'Cess', meaning: '4% of tax plus surcharge' }
				]
			},
			{
				title: 'Old regime slabs (below 60)',
				expression: 'Nil to ₹2.5L · 5% to ₹5L · 20% to ₹10L · 30% above (60–79: nil to ₹3L; 80+: nil to ₹5L, no 5% slab). Rebate ₹12,500 up to ₹5L.',
				variables: [{ symbol: 'Caps', meaning: '80C ₹1,50,000 · 80CCD(1B) ₹50,000 · 80D ₹1,00,000 · home loan interest ₹2,00,000' }]
			}
		],
		example: {
			title: 'Salary of ₹15,00,000, with 80C ₹1,50,000 and 80D ₹25,000',
			steps: [
				'New regime: ₹15,00,000 − ₹75,000 = ₹14,25,000. Slab tax ₹93,750, plus 4% cess ₹3,750 = ₹97,500.',
				'Old regime: ₹15,00,000 − ₹50,000 − ₹1,75,000 = ₹12,75,000. Slab tax ₹1,95,000, plus cess ₹7,800 = ₹2,02,800.'
			],
			result: 'New regime ₹97,500 is lower by ₹1,05,300.'
		},
		faq: [
			{
				q: 'How do I calculate income tax for FY 2026-27?',
				a: 'Start with your total income and subtract the standard deduction (and, in the old regime, your other deductions). Then apply the slab rates, the rebate, any surcharge and the 4% cess. This calculator does each step for both regimes.'
			},
			{
				q: 'Is income up to ₹12.75 lakh tax-free in the new regime?',
				a: `For salaried people, yes. The ${inr(STANDARD_DEDUCTION_NEW)} standard deduction brings ₹12,75,000 down to ₹12,00,000. Then the section 156 rebate cancels the tax on that. Other income, such as capital gains at special rates, is treated differently.`
			},
			{
				q: 'Can I claim 80C in the new tax regime?',
				a: 'No. The new regime doesn’t allow 80C, 80D, HRA or home loan interest on a home you live in. However, you still get the standard deduction and your employer’s NPS contribution.'
			},
			{
				q: 'Which tax regime is better for salaried employees?',
				a: 'It depends on your deductions. If you claim little, the new regime is usually lower. But if your HRA, 80C, 80D and home loan interest add up to a large amount, the old regime can win. Compare both above.'
			},
			{
				q: 'Did the Income-tax Act, 2025 change the tax amounts?',
				a: 'No. From 1 April 2026 the new Act renumbered the sections. For example, 115BAC is now 202 and 87A is now 156. However, the slabs, rebate and standard deduction for FY 2026-27 stayed the same.'
			},
			{
				q: 'What does this calculator not include?',
				a: 'It doesn’t cover capital gains taxed at special rates, non-residents, HUFs, interest or penalties. For gains on shares or property, use the [capital gains tax calculator](/capital-gains-tax-calculator-india).'
			}
		],
		sources: [IN_TAX_SOURCE, IN_REBATE_SOURCE, IN_SALARY_DEDUCTIONS_SOURCE, IN_THRESHOLDS_SOURCE, IN_ROUNDING_SOURCE],
		disclaimer: 'Estimate for a resident individual only. Check your return with a tax professional or the Income Tax Department before filing.'
	}
});
