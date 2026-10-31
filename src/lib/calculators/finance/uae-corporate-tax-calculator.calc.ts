import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';
import meta from './uae-corporate-tax-calculator.meta';
import {
	AE_CT_LAW_LABEL,
	AE_CT_RATE,
	AE_CT_SOURCES,
	AE_CT_ZERO_BAND,
	AE_DMTT_FROM,
	AE_DMTT_RATE_PCT,
	AE_DMTT_THRESHOLD_EUR_M,
	AE_QFZP_DE_MINIMIS_AED,
	AE_QFZP_DE_MINIMIS_PCT,
	AE_SBR_LAST_PERIOD_END,
	AE_SBR_LAST_PERIOD_END_LABEL,
	AE_SBR_MNE_REVENUE_AED,
	AE_SBR_REVENUE_LIMIT
} from '../data/ae-corporate-tax';

const aed = (n: number) => moneyIn('AED', n, true);
const valid = (n: number) => Number.isFinite(n) && n >= 0;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'status',
			label: 'Type of business',
			type: 'select',
			display: 'segmented',
			default: 'standard',
			options: [
				{ label: 'Standard', value: 'standard' },
				{ label: 'Qualifying free zone person', value: 'qfzp' }
			],
			help: 'A qualifying free zone person pays 0% only on qualifying income; the rest is taxed at 9%.'
		},
		{
			id: 'income',
			label: 'Taxable income',
			type: 'number',
			default: 1_000_000,
			min: 0,
			max: 100_000_000_000,
			prefix: '$',
			help: 'Accounting profit adjusted under the corporate tax rules, after allowed losses.',
			visibleWhen: (v) => String(v.status) !== 'qfzp'
		},
		{
			id: 'qualifying',
			label: 'Qualifying income',
			type: 'number',
			default: 5_000_000,
			min: 0,
			max: 100_000_000_000,
			prefix: '$',
			help: 'Taxable income that counts as qualifying income, taxed at 0%.',
			visibleWhen: (v) => String(v.status) === 'qfzp'
		},
		{
			id: 'nonqualifying',
			label: 'Non-qualifying income',
			type: 'number',
			default: 200_000,
			min: 0,
			max: 100_000_000_000,
			prefix: '$',
			help: 'All other taxable income, taxed at 9% from the first dirham.',
			visibleWhen: (v) => String(v.status) === 'qfzp'
		},
		{
			id: 'revenue',
			label: 'Revenue for the period',
			type: 'number',
			default: 2_500_000,
			min: 0,
			max: 100_000_000_000,
			prefix: '$',
			help: 'Total revenue, used only to test Small Business Relief.',
			visibleWhen: (v) => String(v.status) !== 'qfzp'
		},
		{
			id: 'periodEnd',
			label: 'Tax period ends on',
			type: 'date',
			default: '2026-12-31',
			visibleWhen: (v) => String(v.status) !== 'qfzp'
		},
		{
			id: 'earlierOk',
			label: 'Revenue was AED 3 million or less in every earlier tax period',
			type: 'toggle',
			default: true,
			visibleWhen: (v) => String(v.status) !== 'qfzp'
		},
		{
			id: 'elect',
			label: 'Elect Small Business Relief',
			type: 'toggle',
			default: false,
			visibleWhen: (v) => String(v.status) !== 'qfzp'
		},
		{
			id: 'mne',
			label: 'Part of a multinational group with revenue of EUR 750 million (AED 3.15 billion) or more',
			type: 'toggle',
			default: false
		}
	],
	calculate(v): CalculationResult {
		const label = 'UAE corporate tax';
		const qfzp = String(v.status) === 'qfzp';
		const mne = Boolean(v.mne);

		const dmtt = mne
			? `Not calculated: ${AE_DMTT_RATE_PCT}% minimum rate may add a top-up`
			: `Not applicable below EUR ${AE_DMTT_THRESHOLD_EUR_M}m group revenue`;

		if (qfzp) {
			const q = Number(v.qualifying);
			const n = Number(v.nonqualifying);
			if (!valid(q) || !valid(n)) {
				return { primaryResult: DASH, primaryLabel: label, summary: 'Enter qualifying and non-qualifying income of zero or more.' };
			}
			const total = q + n;
			const tax = n * AE_CT_RATE;
			return {
				primaryResult: money(tax),
				primaryLabel: label,
				summary: `0% on ${money(q)} of qualifying income and ${pct(AE_CT_RATE * 100, 0)} on ${money(n)} of non-qualifying income, with no 0% band. This assumes the free zone company meets every qualifying condition, including keeping non-qualifying revenue below the lower of AED ${num(AE_QFZP_DE_MINIMIS_AED, 0)} or ${AE_QFZP_DE_MINIMIS_PCT}% of revenue; if it does not, it loses the status and standard rates apply to all income.`,
				secondaryMetrics: [
					{ label: 'Taxable income', value: money(total) },
					{ label: 'Income taxed at 9%', value: money(n) },
					{ label: 'Effective tax rate', value: total > 0 ? pct((tax / total) * 100, 2) : pct(0) },
					{ label: 'Small Business Relief', value: 'Not available to qualifying free zone persons' },
					{ label: 'Top-up tax (DMTT)', value: dmtt }
				]
			};
		}

		const income = Number(v.income);
		const revenue = Number(v.revenue);
		const periodEnd = String(v.periodEnd);
		if (!valid(income) || !valid(revenue) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter taxable income and revenue of zero or more, and a valid tax period end date.' };
		}

		const reasons: string[] = [];
		if (!(revenue <= AE_SBR_REVENUE_LIMIT)) reasons.push(`revenue is above AED ${num(AE_SBR_REVENUE_LIMIT, 0)}`);
		if (!v.earlierOk) reasons.push('an earlier period was above the limit');
		if (mne) reasons.push('members of large multinational groups are excluded');
		if (periodEnd > AE_SBR_LAST_PERIOD_END) reasons.push(`the relief covers periods ending on or before ${AE_SBR_LAST_PERIOD_END_LABEL}`);
		const eligible = reasons.length === 0;
		const elected = Boolean(v.elect);

		const taxableAt9 = Math.max(income - AE_CT_ZERO_BAND, 0);
		const normalTax = taxableAt9 * AE_CT_RATE;
		const relief = elected && eligible;
		const tax = relief ? 0 : normalTax;

		let reliefText: string;
		if (relief) reliefText = 'Elected: treated as having no taxable income';
		else if (elected) reliefText = `Elected but not eligible: ${reasons.join('; ')}`;
		else if (eligible) reliefText = `Eligible: electing would cut the tax to ${money(0)}`;
		else reliefText = `Not eligible: ${reasons.join('; ')}`;

		return {
			primaryResult: money(tax),
			primaryLabel: label,
			summary: relief
				? 'Small Business Relief is elected, so the business is treated as having no taxable income for this period. Other reliefs and deductions are not available with it.'
				: `0% on the first ${money(AE_CT_ZERO_BAND)} and ${pct(AE_CT_RATE * 100, 0)} on the ${money(taxableAt9)} above it.`,
			secondaryMetrics: [
				{ label: 'Taxable income', value: money(income) },
				{ label: 'Income taxed at 9%', value: money(relief ? 0 : taxableAt9) },
				{ label: 'Effective tax rate', value: income > 0 ? pct((tax / income) * 100, 2) : pct(0) },
				{ label: 'Small Business Relief', value: reliefText },
				{ label: 'Top-up tax (DMTT)', value: dmtt }
			]
		};
	},
	content: {
		intro: `Use this UAE corporate tax calculator to work out federal tax under ${AE_CT_LAW_LABEL}. Taxable income up to ${aed(AE_CT_ZERO_BAND)} is taxed at 0%, and the part above it at ${pct(AE_CT_RATE * 100, 0)}. It also explains Small Business Relief, qualifying free zone persons and the top-up tax for large multinational groups.`,
		howTo: [
			'Choose Standard. Pick Qualifying free zone person only if your free zone company meets every qualifying condition.',
			'Enter your taxable income. For a qualifying free zone person, enter the qualifying and non-qualifying income separately.',
			'To test Small Business Relief, enter revenue, the tax period end date and the eligibility toggles.',
			'Read the tax, the effective rate and whether the relief or the top-up tax matters for you.'
		],
		about: [
			{
				heading: 'What is UAE corporate tax?',
				paragraphs: [
					`UAE corporate tax is a federal tax on the profits of businesses. The law is ${AE_CT_LAW_LABEL}. The tax is charged on taxable income, which is your accounting profit adjusted under the corporate tax rules, after allowed losses.`,
					`The main rate is ${pct(AE_CT_RATE * 100, 0)}. However, the first ${aed(AE_CT_ZERO_BAND)} of taxable income is taxed at 0%. So a small company with modest profit may pay little or nothing.`
				]
			},
			{
				heading: 'How the tax is calculated',
				paragraphs: [
					`First, find your taxable income for the tax period. Next, subtract the ${aed(AE_CT_ZERO_BAND)} band. Then multiply what is left by ${pct(AE_CT_RATE * 100, 0)}. If your income is below the band, the tax is zero.`,
					'The effective rate is the tax divided by your taxable income. It starts at zero and moves toward the main rate as your income grows.'
				]
			},
			{
				heading: 'Small Business Relief',
				paragraphs: [
					`A resident business can elect Small Business Relief for a tax period if its revenue is ${aed(AE_SBR_REVENUE_LIMIT)} or less in the current and all earlier periods. It is then treated as having no taxable income. Other reliefs and deductions are not available with it.`,
					`Members of a multinational group with consolidated revenue of EUR ${AE_DMTT_THRESHOLD_EUR_M} million (${aed(AE_SBR_MNE_REVENUE_AED)}) or more cannot use it. A qualifying free zone person cannot use it either. Ministerial Decision No. 131 of 2026 extended the relief to tax periods ending on or before ${AE_SBR_LAST_PERIOD_END_LABEL}. Older guides may still show 2026.`
				]
			},
			{
				heading: 'Qualifying free zone persons',
				paragraphs: [
					`A qualifying free zone person pays 0% on qualifying income and ${pct(AE_CT_RATE * 100, 0)} on non-qualifying income. The ${aed(AE_CT_ZERO_BAND)} band does not apply to the non-qualifying part.`,
					`There is also a de minimis test. Non-qualifying revenue must stay below the lower of ${aed(AE_QFZP_DE_MINIMIS_AED)} or ${AE_QFZP_DE_MINIMIS_PCT}% of total revenue. If a company fails it, or another condition, it loses the status. Standard rates then apply to all its income. This tool only splits the two kinds of income you enter.`
				]
			},
			{
				heading: 'Top-up tax for large groups',
				paragraphs: [
					`The Domestic Minimum Top-up Tax (DMTT) applies to UAE entities of groups with consolidated revenue of at least EUR ${AE_DMTT_THRESHOLD_EUR_M} million in at least two of the four preceding years. It starts for financial years beginning on or after ${AE_DMTT_FROM}, and tops the effective rate up to ${AE_DMTT_RATE_PCT}%.`,
					'It needs a separate group-level calculation. This calculator only flags it. For related Gulf tools, see the [GCC VAT calculator](/gcc-vat-calculator), the [UAE gratuity calculator](/uae-gratuity-calculator) and the [Saudi GOSI calculator](/gosi-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Standard corporate tax',
				expression: `Tax = ${pct(AE_CT_RATE * 100, 0)} × max(Taxable income − ${num(AE_CT_ZERO_BAND, 0)}, 0)`,
				variables: [
					{ symbol: 'Taxable income', meaning: 'Adjusted profit for the tax period, after allowed losses and exemptions.' },
					{ symbol: num(AE_CT_ZERO_BAND, 0), meaning: `The 0% band in AED. Income above it is taxed at ${pct(AE_CT_RATE * 100, 0)}.` }
				]
			},
			{
				title: 'Qualifying free zone person',
				expression: `Tax = ${pct(AE_CT_RATE * 100, 0)} × Non-qualifying income  (qualifying income at 0%)`,
				variables: [{ symbol: 'Non-qualifying income', meaning: 'Taxed with no 0% band, as long as the company stays within the de minimis limits.' }]
			}
		],
		example: {
			title: `Taxable income of ${aed(1_000_000)}, no relief`,
			steps: [
				`The first ${aed(AE_CT_ZERO_BAND)} is taxed at 0%.`,
				`Income above the band: 1,000,000 − ${num(AE_CT_ZERO_BAND, 0)} = ${aed(1_000_000 - AE_CT_ZERO_BAND)}.`,
				`Tax: ${pct(AE_CT_RATE * 100, 0)} × ${num(1_000_000 - AE_CT_ZERO_BAND, 0)} = ${aed(56_250)}.`,
				'Effective rate: 56,250 ÷ 1,000,000 = 5.63%.'
			],
			result: moneyIn('AED', 56_250)
		},
		faq: [
			{
				q: 'What is the UAE corporate tax rate?',
				a: `${pct(AE_CT_RATE * 100, 0)} on taxable income above ${aed(AE_CT_ZERO_BAND)}. Income up to that amount is taxed at 0%. Qualifying free zone persons have different rules for their qualifying income.`
			},
			{
				q: 'Who can use Small Business Relief and until when?',
				a: `A resident business with revenue of ${aed(AE_SBR_REVENUE_LIMIT)} or less in the current and every earlier period can elect it. It then has no taxable income. It now covers periods ending on or before ${AE_SBR_LAST_PERIOD_END_LABEL}. Qualifying free zone persons and large multinational groups cannot use it.`
			},
			{
				q: 'How is a qualifying free zone person taxed?',
				a: `It pays 0% on qualifying income and ${pct(AE_CT_RATE * 100, 0)} on everything else, without the ${aed(AE_CT_ZERO_BAND)} band. It must meet conditions such as the de minimis test. If it fails them, standard rates apply to all income.`
			},
			{
				q: 'What is the 15% top-up tax?',
				a: `The Domestic Minimum Top-up Tax applies to UAE entities of groups with consolidated revenue of EUR ${AE_DMTT_THRESHOLD_EUR_M} million or more, for financial years starting on or after ${AE_DMTT_FROM}. It tops the effective rate up to ${AE_DMTT_RATE_PCT}%. This tool only flags it.`
			},
			{
				q: 'Does this calculator cover losses and tax groups?',
				a: 'No. It does not model losses, exempt income, tax groups, transfer pricing or withholding. Enter your taxable income after those adjustments.'
			}
		],
		sources: AE_CT_SOURCES,
		disclaimer:
			'Estimate only. It does not model losses, exempt income, tax groups, transfer pricing, withholding or the top-up tax calculation. This is not tax advice; confirm with the Federal Tax Authority or a tax adviser.'
	}
});
