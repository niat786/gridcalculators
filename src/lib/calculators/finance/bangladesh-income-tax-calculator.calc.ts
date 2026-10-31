import { defineCalculator, type CalculationResult, type CalculatorInput, type InputValues } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './bangladesh-income-tax-calculator.meta';
import {
	BD_CATEGORIES,
	BD_DAILY_STAR_SOURCE,
	BD_DISABLED_DEPENDANT_EXTRA,
	BD_KPMG_SOURCE,
	BD_MIN_TAX,
	BD_MIN_TAX_NEW,
	BD_PROTHOM_ALO_SOURCE,
	BD_PWC_SOURCE,
	BD_RAMCO_SOURCE,
	BD_REBATE_INCOME_PCT,
	BD_REBATE_INVESTMENT_PCT,
	BD_REBATE_MAX,
	BD_ROY_SOURCE,
	BD_SALARY_EXEMPT_CAP,
	BD_SALARY_EXEMPT_SHARE,
	BD_SALARY_SOURCE,
	BD_SLABS,
	BD_TAX_YEAR_LABEL,
	type BdCategory
} from '../data/bd-2026-27';

const taka = (n: number) => money(n, true);
/** Content is written at build time, so format taka explicitly. */
const tk = (n: number) => moneyIn('BDT', n, true);

/** Slab bands above the tax-free limit, for the page text. */
function slabRows(): string[][] {
	return BD_SLABS.map((s) => [s.width === null ? 'The rest of your income' : `Next ${tk(s.width)}`, pct(s.rate * 100, 0)]);
}

export interface BdSlabResult {
	rows: { from: number; to: number | null; amount: number; rate: number; tax: number }[];
	tax: number;
}

/** Tax on the income above the tax-free threshold, through the slabs. */
export function bdSlabTax(taxable: number, threshold: number): BdSlabResult {
	const rows: BdSlabResult['rows'] = [];
	let left = Math.max(0, taxable - threshold);
	let from = threshold;
	let tax = 0;
	for (const s of BD_SLABS) {
		const amount = s.width === null ? left : Math.min(left, s.width);
		const t = amount * s.rate;
		rows.push({ from, to: s.width === null ? null : from + s.width, amount, rate: s.rate, tax: t });
		tax += t;
		left -= amount;
		from += s.width ?? 0;
		if (left <= 0) {
			// keep the remaining empty slabs out of the table
			break;
		}
	}
	return { rows, tax };
}

const inputs: CalculatorInput[] = [
	{ id: 'salary', label: 'Yearly salary income', type: 'number', default: 1_200_000, min: 0, max: 100_000_000_000, step: 10_000, prefix: '$', decimal: false, help: 'Total salary, bonus and allowances for the income year, before any exemption.' },
	{ id: 'exempt', label: 'Apply the salary exemption', type: 'toggle', default: true },
	{ id: 'other', label: 'Other taxable income', type: 'number', default: 0, min: 0, max: 100_000_000_000, step: 10_000, prefix: '$', decimal: false, help: 'Rent, business or other income that is taxed at the normal slabs and has no salary exemption.' },
	{
		id: 'category',
		label: 'Taxpayer category',
		type: 'select',
		default: 'general',
		display: 'menu',
		options: BD_CATEGORIES.map((c) => ({ label: c.label, value: c.value })),
		help: 'Sets your tax-free limit. You need the proper certificate for the special categories.'
	},
	{ id: 'dependant', label: 'Parent or guardian of a person with a disability', type: 'toggle', default: false },
	{ id: 'invest', label: 'Eligible investment for the rebate', type: 'number', default: 100_000, min: 0, max: 100_000_000_000, step: 10_000, prefix: '$', decimal: false, help: 'DPS, savings certificates, life insurance premium, approved funds and similar, within their own limits.' },
	{ id: 'newTaxpayer', label: 'First-time taxpayer', type: 'toggle', default: false, help: 'New taxpayers have a Tk 1,000 minimum tax.' }
];

function calculate(v: InputValues): CalculationResult {
	const salary = Number(v.salary);
	const other = Number(v.other);
	const invest = Number(v.invest);
	const cat = BD_CATEGORIES.find((c) => c.value === (v.category as BdCategory));
	if (![salary, other, invest].every((x) => Number.isFinite(x) && x >= 0)) {
		return { primaryResult: DASH, primaryLabel: 'Income tax payable', summary: 'Enter your income and investment as zero or more.' };
	}
	if (!cat) {
		return { primaryResult: DASH, primaryLabel: 'Income tax payable', summary: 'Choose a taxpayer category.' };
	}

	const exemption = v.exempt === true ? Math.min(salary * BD_SALARY_EXEMPT_SHARE, BD_SALARY_EXEMPT_CAP) : 0;
	const taxable = salary - exemption + other;
	const threshold = cat.threshold + (v.dependant === true ? BD_DISABLED_DEPENDANT_EXTRA : 0);

	const { rows, tax: slabTax } = bdSlabTax(taxable, threshold);
	const rebateLimit = Math.min(BD_REBATE_INCOME_PCT * taxable, BD_REBATE_INVESTMENT_PCT * invest, BD_REBATE_MAX);
	const rebate = Math.min(slabTax, Math.max(0, rebateLimit));
	const afterRebate = slabTax - rebate;
	const minTax = v.newTaxpayer === true ? BD_MIN_TAX_NEW : BD_MIN_TAX;
	const above = taxable > threshold;
	const payable = above ? Math.max(afterRebate, minTax) : 0;
	const minApplied = above && afterRebate < minTax;

	let marginal = 0;
	if (above) {
		let top = threshold;
		for (const s of BD_SLABS) {
			marginal = s.rate;
			if (s.width === null || taxable <= top + s.width) break;
			top += s.width;
		}
	}

	const summary = !above
		? `Taxable income of ${taka(taxable)} is within your tax-free limit of ${taka(threshold)}, so no tax is due.`
		: minApplied
			? `Tax after rebate is ${taka(afterRebate)}, so the minimum tax of ${taka(minTax)} applies.`
			: `${taka(taxable)} taxable income, ${taka(threshold)} tax-free, slab tax ${taka(slabTax)} less ${taka(rebate)} rebate = ${taka(payable)}.`;

	return {
		primaryResult: taka(payable),
		primaryLabel: 'Income tax payable',
		summary,
		secondaryMetrics: [
			{ label: 'Taxable income', value: taka(taxable) },
			{ label: 'Tax-free limit', value: taka(threshold) },
			{ label: 'Tax on the slabs', value: taka(slabTax) },
			{ label: 'Investment rebate', value: taka(rebate) },
			{ label: 'Minimum tax applied', value: minApplied ? 'Yes' : 'No' },
			{ label: 'Average tax rate on taxable income', value: taxable > 0 ? pct((payable / taxable) * 100, 2) : pct(0) },
			{ label: 'Rate on your next taka', value: pct(marginal * 100, 0) }
		],
		table: {
			title: `${BD_TAX_YEAR_LABEL} slabs`,
			columns: [
				{ key: 'band', label: 'Slab' },
				{ key: 'amount', label: 'Income in slab', align: 'end' },
				{ key: 'rate', label: 'Rate', align: 'end' },
				{ key: 'tax', label: 'Tax', align: 'end' }
			],
			rows: [
				{ band: `First ${taka(threshold)}`, amount: taka(Math.min(taxable, threshold)), rate: '0%', tax: taka(0) },
				...rows.map((r) => ({
					band: r.to === null ? `Above ${taka(r.from)}` : `${taka(r.from)} to ${taka(r.to)}`,
					amount: taka(r.amount),
					rate: pct(r.rate * 100, 0),
					tax: taka(r.tax)
				}))
			]
		}
	};
}

export default defineCalculator({
	meta,
	inputs,
	calculate,
	content: {
		intro: `Use this Bangladesh income tax calculator to estimate the tax of a resident individual under the Finance Act 2026. It is for income year 2026-27, which is ${BD_TAX_YEAR_LABEL} (1 July 2026 to 30 June 2027). The Act sets the same limits and slabs for ${BD_TAX_YEAR_LABEL} as for AY 2026-27.`,
		howTo: [
			'Enter your yearly salary and any other taxable income.',
			'Choose your taxpayer category. It sets your tax-free limit.',
			'Add your eligible investment for the rebate, and say if you are a first-time taxpayer.',
			'Read the taxable income, the slab tax, the rebate and the tax payable.'
		],
		about: [
			{
				heading: 'How income tax works in Bangladesh',
				paragraphs: [
					`Bangladesh taxes individuals on progressive slabs. You pay no tax on the first part of your income, called the tax-free limit. After that, each slab has a higher rate. The tax year here is the income year from 1 July 2026 to 30 June 2027, filed under ${BD_TAX_YEAR_LABEL}.`,
					'The Finance Act 2026 was passed by Parliament on 29 June 2026 and is in force from 1 July 2026. Parliament raised the general tax-free limit from the Budget’s first proposal before passing it, so older articles may show a different number.'
				]
			},
			{
				heading: 'Tax-free limits by category',
				paragraphs: ['Your limit depends on who you are. You need the proper certificate for the special categories.'],
				table: {
					caption: `Tax-free limits, ${BD_TAX_YEAR_LABEL}`,
					columns: ['Taxpayer category', 'Tax-free limit'],
					rows: [...BD_CATEGORIES.map((c) => [c.label, tk(c.threshold)]), ['Parent or guardian of a person with a disability', `Add ${tk(BD_DISABLED_DEPENDANT_EXTRA)} to the limit`]]
				}
			},
			{
				heading: `Tax slabs for ${BD_TAX_YEAR_LABEL}`,
				paragraphs: ['After your tax-free limit, income is taxed in bands. The old 5% slab is gone. These slabs apply for AY 2026-27 and 2027-28.'],
				table: { caption: 'Slabs above your tax-free limit', columns: ['Band of income', 'Rate'], rows: slabRows() }
			},
			{
				heading: 'Salary exemption, rebate and minimum tax',
				paragraphs: [
					`Salary income gets an exemption. It is the lower of one-third of employment income and ${tk(BD_SALARY_EXEMPT_CAP)}. Two secondary sources confirm this figure and the Finance Act summaries report no change, so switch the exemption off if yours is different.`,
					`The investment rebate is the lowest of ${pct(BD_REBATE_INCOME_PCT * 100, 0)} of taxable income, ${pct(BD_REBATE_INVESTMENT_PCT * 100, 0)} of your eligible investment and ${tk(BD_REBATE_MAX)}. You enter the eligible amount. Types of investment have their own limits, which this tool does not model.`,
					`If your income is above your tax-free limit, you pay at least ${tk(BD_MIN_TAX)}, or ${tk(BD_MIN_TAX_NEW)} for a new taxpayer. This is one amount for everyone. The old tiers by area no longer apply.`
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The result shows the tax payable, your taxable income and your tax-free limit. It also shows the slab tax before the rebate, and whether the minimum tax applied.',
					'The average rate is your tax divided by your taxable income. The rate on your next taka is the slab you are in. For example, a raise that moves you into a higher slab taxes only the extra income at the higher rate, not your whole income. Use the table of slabs under the result to see how much tax falls in each band.'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					'It leaves out the net-wealth surcharge, the surcharge on cars, tax already deducted at source and non-residents. It also leaves out income taxed at special or final rates, the early-filing incentive and late-filing charges.',
					'Many Bangladeshis earn abroad. For Gulf pay, see the [UAE gratuity calculator](/uae-gratuity-calculator), the [Saudi end-of-service calculator](/saudi-end-of-service-calculator) and the [currency converter](/currency-converter). For a general view of pay after tax, try the [take-home pay calculator](/take-home-pay-calculator).'
				]
			}
		],
		formulas: [
			{
				title: `Slabs on income above your tax-free limit (AY 2026-27 and ${BD_TAX_YEAR_LABEL})`,
				expression: BD_SLABS.map((s) => (s.width === null ? `the rest: ${pct(s.rate * 100, 0)}` : `next ${tk(s.width)}: ${pct(s.rate * 100, 0)}`)).join(' · '),
				variables: [
					{ symbol: 'Tax-free limit', meaning: `${BD_CATEGORIES.map((c) => `${c.label} ${tk(c.threshold)}`).join(' · ')} · plus ${tk(BD_DISABLED_DEPENDANT_EXTRA)} for a parent or guardian of a person with a disability` },
					{ symbol: 'Salary exemption', meaning: `The lower of one-third of salary and ${tk(BD_SALARY_EXEMPT_CAP)}` }
				]
			},
			{
				title: 'Rebate and minimum tax',
				expression: `Rebate = lowest of ${pct(BD_REBATE_INCOME_PCT * 100, 0)} of taxable income, ${pct(BD_REBATE_INVESTMENT_PCT * 100, 0)} of eligible investment, ${tk(BD_REBATE_MAX)} · Tax payable = at least ${tk(BD_MIN_TAX)} (${tk(BD_MIN_TAX_NEW)} for a new taxpayer) when income is above your limit`,
				variables: [{ symbol: 'Minimum tax', meaning: 'One amount for everyone now. The old Dhaka, other city and rest-of-country tiers no longer apply' }]
			}
		],
		example: {
			title: `Salary of ${tk(1_200_000)}, general taxpayer, investment ${tk(100_000)}`,
			steps: [
				`Salary exemption: one-third is ${tk(400_000)}, below the ${tk(BD_SALARY_EXEMPT_CAP)} cap. Taxable income: ${tk(1_200_000)} − ${tk(400_000)} = ${tk(800_000)}.`,
				`Tax-free ${tk(BD_CATEGORIES[0].threshold)}. Next ${tk(300_000)} at ${pct(BD_SLABS[0].rate * 100, 0)} = ${tk(30_000)}. Remaining ${tk(100_000)} at ${pct(BD_SLABS[1].rate * 100, 0)} = ${tk(15_000)}. Slab tax ${tk(45_000)}.`,
				`Rebate: lowest of ${pct(BD_REBATE_INCOME_PCT * 100, 0)} of ${tk(800_000)} (${tk(24_000)}), ${pct(BD_REBATE_INVESTMENT_PCT * 100, 0)} of ${tk(100_000)} (${tk(10_000)}) and ${tk(BD_REBATE_MAX)} = ${tk(10_000)}. Tax payable ${tk(35_000)}.`
			],
			result: `Income tax payable ${tk(35_000)}`
		},
		faq: [
			{ q: 'How is income tax calculated in Bangladesh?', a: `Take your taxable income, remove the tax-free limit for your category, and tax the rest through the slabs from ${pct(BD_SLABS[0].rate * 100, 0)} to ${pct(BD_SLABS[BD_SLABS.length - 1].rate * 100, 0)}. Then subtract the investment rebate. You pay at least the minimum tax if your income is above the limit.` },
			{ q: 'What is the tax-free income limit now?', a: `${tk(BD_CATEGORIES[0].threshold)} for a general taxpayer for AY 2026-27 and ${BD_TAX_YEAR_LABEL}. Parliament raised it from the first Budget proposal before passing the Finance Act 2026. Women and people aged 65 or more get ${tk(BD_CATEGORIES[1].threshold)}.` },
			{ q: 'Does the minimum tax depend on where I live?', a: `Not any more. The Finance Act 2026 sets ${tk(BD_MIN_TAX)} for everyone above the tax-free limit (${tk(BD_MIN_TAX_NEW)} for new taxpayers), instead of the earlier tiers by area.` },
			{ q: 'How much of my salary is exempt?', a: `The lower of one-third of employment income and ${tk(BD_SALARY_EXEMPT_CAP)}. If your own exemption is different, switch this option off and enter the taxable amount yourself.` },
			{ q: 'What is not included?', a: 'The net-wealth and car surcharge, tax already deducted at source, income taxed at special rates, non-residents, and the limits on each type of investment are not modelled.' }
		],
		sources: [BD_PWC_SOURCE, BD_KPMG_SOURCE, BD_ROY_SOURCE, BD_DAILY_STAR_SOURCE, BD_RAMCO_SOURCE, BD_PROTHOM_ALO_SOURCE, BD_SALARY_SOURCE],
		disclaimer: 'Estimate for a resident individual. Check your return with the National Board of Revenue (NBR) or a registered tax adviser before filing.'
	}
});
