import { defineCalculator, type CalculationResult, type CalculatorInput, type InputValues } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './singapore-income-tax-calculator.meta';
import {
	SG_CPF_TOPUP_FAMILY_CAP,
	SG_CPF_TOPUP_SELF_CAP,
	SG_EIR_55_TO_59,
	SG_EIR_60_PLUS,
	SG_EIR_SOURCE,
	SG_EIR_UNDER_55,
	SG_REBATE_SOURCE,
	SG_REBATE_SOURCE_2,
	SG_RELIEF_CAP,
	SG_RELIEFS_SOURCE,
	SG_SRS_CAP,
	SG_TAX_BANDS,
	SG_TAX_SOURCE,
	SG_TAX_SOURCE_2,
	SG_TAX_SOURCE_3,
	SG_TAX_YEAR_LABEL,
	SG_TAX_YEAR_LONG
} from '../data/sg-2026';

const cents = (n: number) => Math.round(n * 100) / 100;
const sgd = (n: number) => money(n);
/** Content is built before a currency is chosen, so format Singapore dollars explicitly. */
const sgdw = (n: number) => moneyIn('SGD', n, true);
const pc = (x: number) => `${+(x * 100).toFixed(2)}%`;
function bandRows(): string[][] {
	return SG_TAX_BANDS.map((b, i) => {
		const next = SG_TAX_BANDS[i + 1];
		const band = i === 0 ? `First ${sgdw(next.over)}` : next ? `${sgdw(b.over + 1)} to ${sgdw(next.over)}` : `Above ${sgdw(b.over)}`;
		return [band, pc(b.rate)];
	});
}

/** Tax on chargeable income with the resident bands. */
export function sgTax(chargeable: number): number {
	let tax = 0;
	for (let i = 0; i < SG_TAX_BANDS.length; i++) {
		const lo = SG_TAX_BANDS[i].over;
		const hi = i + 1 < SG_TAX_BANDS.length ? SG_TAX_BANDS[i + 1].over : Infinity;
		if (chargeable > lo) tax += (Math.min(chargeable, hi) - lo) * SG_TAX_BANDS[i].rate;
	}
	return cents(tax);
}

const EIR_BY_AGE: Record<string, number> = { u55: SG_EIR_UNDER_55, a55: SG_EIR_55_TO_59, a60: SG_EIR_60_PLUS };

const inputs: CalculatorInput[] = [
	{ id: 'income', label: 'Total employment income in 2025', type: 'number', default: 80_000, min: 0, max: 10_000_000_000, step: 1000, prefix: '$', help: 'Salary, bonus and allowances for the year before reliefs. YA 2026 taxes income earned in 2025.' },
	{
		id: 'age',
		label: 'Your age on 31 December 2025',
		type: 'select',
		default: 'u55',
		display: 'segmented',
		options: [
			{ label: 'Below 55', value: 'u55' },
			{ label: '55 to 59', value: 'a55' },
			{ label: '60 and above', value: 'a60' }
		],
		help: 'Sets your Earned Income Relief.'
	},
	{ id: 'cpf', label: 'Your CPF contributions in 2025', type: 'number', default: 16_000, min: 0, max: 1_000_000, step: 100, prefix: '$', help: 'The employee share on your payslips. IRAS usually pre-fills it. Citizens and PRs only.' },
	{ id: 'topupSelf', label: 'CPF cash top-up for yourself', type: 'number', default: 0, min: 0, max: 1_000_000_000, step: 100, prefix: '$', help: `Relief capped at $${SG_CPF_TOPUP_SELF_CAP.toLocaleString('en-US')}.` },
	{ id: 'topupFamily', label: 'CPF cash top-up for family members', type: 'number', default: 0, min: 0, max: 1_000_000_000, step: 100, prefix: '$', help: `Relief capped at $${SG_CPF_TOPUP_FAMILY_CAP.toLocaleString('en-US')}.` },
	{ id: 'srs', label: 'SRS contributions', type: 'number', default: 0, min: 0, max: 1_000_000_000, step: 100, prefix: '$', help: `Relief capped at $${SG_SRS_CAP.toLocaleString('en-US')} for citizens and PRs.` },
	{ id: 'other', label: 'Other reliefs', type: 'number', default: 0, min: 0, max: 1_000_000_000, step: 100, prefix: '$', help: 'Spouse, child, parent, life insurance and similar reliefs, each within its own limit, added together.' }
];

function calculate(v: InputValues): CalculationResult {
	const income = Number(v.income);
	const cpf = Number(v.cpf);
	const topupSelf = Number(v.topupSelf);
	const topupFamily = Number(v.topupFamily);
	const srs = Number(v.srs);
	const other = Number(v.other);
	if (![income, cpf, topupSelf, topupFamily, srs, other].every((x) => Number.isFinite(x) && x >= 0)) {
		return { primaryResult: DASH, primaryLabel: 'Income tax payable', summary: 'Enter your income and each relief as zero or more.' };
	}
	const eirMax = EIR_BY_AGE[String(v.age)];
	if (eirMax === undefined) {
		return { primaryResult: DASH, primaryLabel: 'Income tax payable', summary: 'Choose your age group.' };
	}

	// Earned Income Relief cannot exceed the earned income.
	const eir = Math.min(eirMax, income);
	const claimed = eir + cpf + Math.min(topupSelf, SG_CPF_TOPUP_SELF_CAP) + Math.min(topupFamily, SG_CPF_TOPUP_FAMILY_CAP) + Math.min(srs, SG_SRS_CAP) + other;
	const reliefs = Math.min(claimed, SG_RELIEF_CAP);
	const chargeable = Math.max(0, income - reliefs);
	const tax = sgTax(chargeable);

	let marginal = 0;
	for (const b of SG_TAX_BANDS) if (chargeable > b.over) marginal = b.rate;

	const capped = claimed > SG_RELIEF_CAP;
	const summary =
		chargeable <= 0
			? `Your reliefs of ${sgd(reliefs)} cover your ${sgd(income)} income, so no tax is due.`
			: `${sgd(income)} income − ${sgd(reliefs)} reliefs${capped ? ` (capped at ${money(SG_RELIEF_CAP, true)})` : ''} = ${sgd(chargeable)} chargeable income, taxed at the resident rates.`;

	return {
		primaryResult: sgd(tax),
		primaryLabel: 'Income tax payable',
		summary,
		secondaryMetrics: [
			{ label: 'Chargeable income', value: sgd(chargeable) },
			{ label: 'Total reliefs allowed', value: sgd(reliefs) },
			{ label: 'Earned Income Relief', value: sgd(eir) },
			{ label: 'Average tax rate on income', value: income > 0 ? pct((tax / income) * 100, 2) : pct(0) },
			{ label: 'Rate on your next dollar', value: pct(marginal * 100, 1) },
			{ label: 'Tax per month', value: sgd(tax / 12) }
		],
		table: {
			title: `${SG_TAX_YEAR_LABEL} reliefs applied`,
			columns: [
				{ key: 'item', label: 'Relief' },
				{ key: 'amount', label: 'Amount', align: 'end' }
			],
			rows: [
				{ item: 'Earned Income Relief', amount: sgd(eir) },
				{ item: 'Your CPF contributions', amount: sgd(cpf) },
				{ item: 'CPF cash top-up (self and family)', amount: sgd(Math.min(topupSelf, SG_CPF_TOPUP_SELF_CAP) + Math.min(topupFamily, SG_CPF_TOPUP_FAMILY_CAP)) },
				{ item: 'SRS contributions', amount: sgd(Math.min(srs, SG_SRS_CAP)) },
				{ item: 'Other reliefs', amount: sgd(other) },
				{ item: 'Total before the cap', amount: sgd(claimed) },
				{ item: `Total allowed (cap ${money(SG_RELIEF_CAP, true)})`, amount: sgd(reliefs) }
			]
		}
	};
}

export default defineCalculator({
	meta,
	inputs,
	calculate,
	content: {
		intro: `Work out your Singapore income tax for ${SG_TAX_YEAR_LABEL}, which is based on income you earned in 2025, as a tax resident. This Singapore income tax calculator adds up your reliefs, applies the ${sgdw(SG_RELIEF_CAP)} cap and uses the IRAS resident rates.`,
		howTo: [
			'Enter your total employment income for 2025 and your age on 31 December 2025.',
			'Add your CPF contributions, any CPF cash top-ups and your SRS contributions.',
			'Add other reliefs, such as spouse, child or parent relief, as one total.',
			'Read your chargeable income and the tax payable.'
		],
		about: [
			{
				heading: `How Singapore income tax works for ${SG_TAX_YEAR_LABEL}`,
				paragraphs: [
					`This tool covers the ${SG_TAX_YEAR_LONG}. Singapore taxes the income you earned in the previous calendar year. So income from 1 January to 31 December 2025 is assessed in YA 2026, and you file in 2026.`,
					'Your tax starts with your total income. You subtract your reliefs to get your chargeable income. Then the progressive rates apply, so each slice of income pays its own rate.',
					'The tool is for tax residents who are employees. Non-residents are taxed differently.'
				]
			},
			{
				heading: `Resident tax rates for ${SG_TAX_YEAR_LABEL}`,
				paragraphs: [
					`The first ${sgdw(SG_TAX_BANDS[1].over)} of chargeable income is taxed at 0%. The top rate of ${pc(SG_TAX_BANDS[SG_TAX_BANDS.length - 1].rate)} applies only to the part above ${sgdw(SG_TAX_BANDS[SG_TAX_BANDS.length - 1].over)}.`
				],
				table: { caption: `Resident rates on chargeable income, ${SG_TAX_YEAR_LABEL}`, columns: ['Chargeable income', 'Rate on that slice'], rows: bandRows() }
			},
			{
				heading: 'Reliefs that lower your chargeable income',
				paragraphs: [
					`Earned Income Relief depends on your age on 31 December 2025. It is ${sgdw(SG_EIR_UNDER_55)} if you are below 55, ${sgdw(SG_EIR_55_TO_59)} from 55 to 59 and ${sgdw(SG_EIR_60_PLUS)} at 60 and above. It cannot be more than your earned income.`,
					`Your own CPF contributions are also a relief. So is a CPF cash top-up, up to ${sgdw(SG_CPF_TOPUP_SELF_CAP)} for your own account and up to ${sgdw(SG_CPF_TOPUP_FAMILY_CAP)} for family members. Contributions to a Supplementary Retirement Scheme (SRS) account are a relief up to ${sgdw(SG_SRS_CAP)} for citizens and PRs.`,
					`All personal reliefs together are capped at ${sgdw(SG_RELIEF_CAP)} for the year. The tool applies the cap, so large claims stop at that limit. Learn how your CPF is calculated with the [CPF contribution calculator](/cpf-contribution-calculator).`
				]
			},
			{
				heading: 'Is there a tax rebate for YA 2026?',
				paragraphs: [
					'No. Budget 2026, announced on 12 February 2026, did not include a personal income tax rebate for YA 2026. The 60% rebate, capped at $200, applied to the year before, YA 2025.',
					'This tool therefore does not subtract any rebate from your tax.'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: ['Some situations need the IRAS tools or a tax adviser. The result for them may be off.'],
				list: [
					'Non-residents, who are taxed differently.',
					'Self-employed people and CPF relief for them.',
					'Disability amounts of Earned Income Relief.',
					'The Parenthood Tax Rebate.',
					'Individual spouse, child, parent and NSman reliefs. Add them together in the “Other reliefs” box.'
				]
			},
			{
				heading: 'Tips to plan your tax',
				paragraphs: [
					'Top-ups to your CPF or SRS account can lower your chargeable income, but they also lock up money until retirement. Compare the saving with your needs first.',
					'To see where your money goes each month, use the [budget calculator](/budget-calculator). To plan for later years, try the [retirement calculator](/retirement-calculator) and the [savings calculator](/savings-calculator). The [salary calculator](/salary-calculator) converts your pay between monthly, weekly and hourly rates.'
				]
			}
		],
		formulas: [
			{
				title: `Resident rates, ${SG_TAX_YEAR_LABEL}`,
				expression: bandRows().map((r) => `${r[0]}: ${r[1]}`).join(' · '),
				variables: [
					{ symbol: 'Chargeable income', meaning: 'Income − total reliefs (never below zero)' },
					{ symbol: 'Relief cap', meaning: `All personal reliefs together cannot exceed ${sgdw(SG_RELIEF_CAP)} for the year` }
				]
			},
			{
				title: 'Earned Income Relief',
				expression: `${sgdw(SG_EIR_UNDER_55)} below 55 · ${sgdw(SG_EIR_55_TO_59)} at 55 to 59 · ${sgdw(SG_EIR_60_PLUS)} at 60 and above (never more than your earned income)`,
				variables: [{ symbol: 'Age', meaning: 'Your age on 31 December 2025' }]
			}
		],
		example: {
			title: '$80,000 income, age below 55, CPF $16,000',
			steps: [
				'Reliefs: Earned Income Relief $1,000 + CPF $16,000 = $17,000.',
				'Chargeable income: $80,000 − $17,000 = $63,000.',
				'Tax: $200 + $350 on the first $40,000, plus 7% of $23,000 = $1,610. Total $2,160.'
			],
			result: 'Income tax payable $2,160.00'
		},
		faq: [
			{ q: 'How do I calculate income tax in Singapore?', a: `Subtract your reliefs from your income to get chargeable income, then apply the resident rates slice by slice. This Singapore income tax calculator does it for ${SG_TAX_YEAR_LABEL}, including the ${sgdw(SG_RELIEF_CAP)} relief cap.` },
			{ q: 'Is there a personal income tax rebate for YA 2026?', a: 'No. Budget 2026 announced no personal income tax rebate for YA 2026. The 60% rebate capped at $200 applied to YA 2025.' },
			{ q: 'Why does YA 2026 use 2025 income?', a: 'Singapore taxes income earned in the previous calendar year. Income earned from 1 January to 31 December 2025 is assessed in the year of assessment 2026, and you file in early 2026.' },
			{ q: 'How much income is tax-free in Singapore?', a: `The first ${sgdw(SG_TAX_BANDS[1].over)} of chargeable income is taxed at 0%. Your reliefs come off before that, so your total income can be higher and still pay little or no tax.` },
			{ q: 'Does CPF reduce my income tax?', a: `Yes. Your own CPF contributions are a relief, and a cash top-up adds to it up to ${sgdw(SG_CPF_TOPUP_SELF_CAP)} for yourself. Check your monthly CPF in the [CPF contribution calculator](/cpf-contribution-calculator).` },
			{ q: 'What is not included?', a: 'Non-residents, the self-employed, disability reliefs and the Parenthood Tax Rebate are not included. Spouse, child, parent and other reliefs go in the “Other reliefs” box.' }
		],
		sources: [SG_TAX_SOURCE, SG_TAX_SOURCE_2, SG_TAX_SOURCE_3, SG_EIR_SOURCE, SG_RELIEFS_SOURCE, SG_REBATE_SOURCE, SG_REBATE_SOURCE_2],
		disclaimer: 'Estimate for a Singapore tax resident employee for YA 2026. It is not tax advice. Check your figures on the myTax Portal and with IRAS before filing.'
	}
});
