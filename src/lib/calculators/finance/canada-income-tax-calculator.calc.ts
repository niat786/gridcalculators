import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './canada-income-tax-calculator.meta';
import {
	CA_TAX_YEAR,
	CANADA_EMPLOYMENT_AMOUNT,
	CPP2_RATE,
	CPP_BASE_RATE,
	CPP_BASIC_EXEMPTION,
	CPP_FIRST_ADDITIONAL_RATE,
	CPP_SOURCE,
	CRA_INDEXATION_SOURCE,
	CRA_RATES_SOURCE,
	CRA_T4127_SOURCE,
	EI_MAX_INSURABLE,
	EI_MAX_PREMIUM,
	EI_RATE,
	EI_SOURCE,
	FEDERAL_BPA_MAX,
	FEDERAL_BPA_MIN,
	FEDERAL_BPA_PHASE_END,
	FEDERAL_BPA_PHASE_START,
	FEDERAL_BRACKETS,
	FEDERAL_CREDIT_RATE,
	MB_BPA_PHASE_END,
	MB_BPA_PHASE_START,
	ON_SURTAX_1_RATE,
	ON_SURTAX_1_THRESHOLD,
	ON_SURTAX_2_RATE,
	ON_SURTAX_2_THRESHOLD,
	PROVINCES,
	PROVINCE_ORDER,
	YAMPE,
	YMPE,
	canadaIncomeTax,
	ontarioHealthPremium,
	type Bracket,
	type ProvinceCode
} from '../data/ca-tax-2026';

export const PROVINCE_OPTIONS = PROVINCE_ORDER.map((c) => ({ label: PROVINCES[c].name, value: c }));

export const QUEBEC_MESSAGE =
	'Quebec has its own income tax return and rules for QPP, QPIP and the federal abatement, which this tool does not model yet. Use Revenu Québec’s calculators for Quebec.';

export function isProvince(v: unknown): v is ProvinceCode {
	return typeof v === 'string' && v in PROVINCES;
}

const rate = (x: number) => pct(x * 100, 2);

/** Content is written once at build time, so format dollars explicitly (CA$58,523). */
const cad = (n: number) => moneyIn('CAD', n, true);
function bandRows(brackets: Bracket[]): string[][] {
	let from = 0;
	return brackets.map((b) => {
		const band = Number.isFinite(b.upTo) ? (from === 0 ? `Up to ${cad(b.upTo)}` : `${cad(from + 1)} to ${cad(b.upTo)}`) : `Over ${cad(from)}`;
		from = b.upTo;
		return [band, pct(b.rate * 100, 2)];
	});
}
function provinceRows(): string[][] {
	return PROVINCE_ORDER.map((c) => {
		const p = PROVINCES[c];
		return [p.name, pct(p.brackets[0].rate * 100, 2), pct(p.brackets[p.brackets.length - 1].rate * 100, 2), cad(p.bpa)];
	});
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'province', label: 'Province or territory', type: 'select', display: 'menu', default: 'ON', options: PROVINCE_OPTIONS, help: 'Quebec is not included yet.' },
		{ id: 'employment', label: 'Employment income', type: 'number', default: 85000, min: 0, max: 10_000_000, step: 1000, prefix: '$', suffix: '/yr', help: 'Salary and wages before tax (box 14 of your T4). CPP and EI are worked out on this.' },
		{ id: 'other', label: 'Other taxable income', type: 'number', default: 0, min: 0, max: 10_000_000, step: 1000, prefix: '$', suffix: '/yr', help: 'Interest, rental or pension income. Treated as ordinary income with no CPP or EI.' },
		{ id: 'rrsp', label: 'RRSP deduction', type: 'number', default: 0, min: 0, max: 10_000_000, step: 500, prefix: '$', suffix: '/yr', help: 'RRSP or pension contributions you deduct from income.' }
	],
	calculate(v): CalculationResult {
		const province = v.province;
		const employment = Number(v.employment);
		const other = Number(v.other);
		const rrsp = Number(v.rrsp);
		if (province === 'QC') {
			return { primaryResult: DASH, primaryLabel: 'Total income tax', summary: QUEBEC_MESSAGE };
		}
		if (!isProvince(province) || ![employment, other, rrsp].every((n) => Number.isFinite(n) && n >= 0) || employment + other <= 0) {
			return { primaryResult: DASH, primaryLabel: 'Total income tax', summary: 'Enter your income (zero or more) and pick a province or territory.' };
		}
		const r = canadaIncomeTax({ province, employment, other, rrsp });
		const name = PROVINCES[province].name;
		const rows: Record<string, string>[] = [
			{ item: 'Federal tax before credits', amount: money(r.federalBasic) },
			{ item: 'Federal credits (basic amount, employment, CPP, EI)', amount: money(-r.federalCredits) },
			{ item: 'Federal tax', amount: money(r.federalTax) },
			{ item: `${name} tax before credits`, amount: money(r.provincialBasic) },
			{ item: `${name} credits (basic amount, CPP, EI)`, amount: money(-r.provincialCredits) }
		];
		if (province === 'ON') {
			rows.push({ item: 'Ontario surtax', amount: money(r.surtax) });
			rows.push({ item: 'Ontario tax reduction', amount: money(-r.provincialReduction) });
			rows.push({ item: 'Ontario Health Premium', amount: money(r.healthPremium) });
		}
		if (province === 'BC') rows.push({ item: 'B.C. tax reduction credit', amount: money(-r.provincialReduction) });
		rows.push({ item: `${name} tax`, amount: money(r.provincialTax) });
		rows.push({ item: 'Total income tax', amount: money(r.totalTax) });

		const note = province === 'YT' ? ' The Yukon employment credit (up to about $96) is not included.' : '';
		return {
			primaryResult: money(r.totalTax),
			primaryLabel: 'Total income tax',
			summary: `${name}, ${CA_TAX_YEAR}: ${rate(r.averageRate)} of your income goes to federal and provincial income tax; your next dollar is taxed at ${rate(r.marginalRate)}.${note}`,
			secondaryMetrics: [
				{ label: 'Federal tax', value: money(r.federalTax) },
				{ label: `${province === 'ON' ? 'Ontario' : name} tax`, value: money(r.provincialTax) },
				{ label: 'Average tax rate', value: rate(r.averageRate) },
				{ label: 'Marginal tax rate', value: rate(r.marginalRate) },
				{ label: 'Taxable income', value: money(r.taxable) },
				{ label: 'CPP contributions', value: money(r.contributions.cppTotal) },
				{ label: 'EI premiums', value: money(r.contributions.ei) }
			],
			table: {
				title: 'How your tax is built',
				collapsed: true,
				columns: [
					{ key: 'item', label: 'Item' },
					{ key: 'amount', label: 'Amount', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro: `Work out your ${CA_TAX_YEAR} Canadian income tax with this free Canada income tax calculator. Pick your province or territory (Quebec is not included yet) to see your federal and provincial tax, your average rate and the tax on your next dollar.`,
		howTo: [
			'Pick your province or territory. Quebec is not included yet.',
			'Enter your employment income for the year, before tax. This is the amount in box 14 of your T4.',
			'Add any other taxable income, such as interest, rent or pension income.',
			'Enter the RRSP or pension amount you deduct, then read your total tax, average rate and marginal rate.'
		],
		about: [
			{
				heading: 'How income tax works in Canada',
				paragraphs: [
					'Canada taxes your income twice. First, the federal government taxes it. Then your province or territory adds its own tax. The two amounts are worked out separately and added together.',
					`Both use brackets. You pay a low rate on the first slice of income and a higher rate on each slice above it. So moving into a higher bracket never taxes your whole income at the higher rate.`,
					`Credits then lower the bill. The biggest one is the basic personal amount, which means the first part of your income is not taxed. Credits for CPP, EI and employment income help too. The calculator applies each one at the lowest rate, as the rules require.`
				]
			},
			{
				heading: `Federal tax brackets for ${CA_TAX_YEAR}`,
				paragraphs: [
					`The lowest federal rate is ${pct(FEDERAL_BRACKETS[0].rate * 100, 2)} for ${CA_TAX_YEAR}. The top rate is ${pct(FEDERAL_BRACKETS[FEDERAL_BRACKETS.length - 1].rate * 100, 2)}. These brackets apply in every province and territory, and they apply to taxable income, not to your salary.`,
					`The federal basic personal amount is ${cad(FEDERAL_BPA_MAX)} for most people. It falls to ${cad(FEDERAL_BPA_MIN)} as net income rises from ${cad(FEDERAL_BPA_PHASE_START)} to ${cad(FEDERAL_BPA_PHASE_END)}. The Canada employment amount adds a credit on up to ${cad(CANADA_EMPLOYMENT_AMOUNT)} of employment income.`
				],
				table: { caption: `Federal brackets, ${CA_TAX_YEAR}`, columns: ['Taxable income', 'Rate'], rows: bandRows(FEDERAL_BRACKETS) }
			},
			{
				heading: 'Provincial and territorial tax',
				paragraphs: [
					'Each province and territory sets its own brackets and its own basic personal amount. The table shows the lowest rate, the top rate and the basic amount for each one this calculator covers.',
					`Some places add extra steps, and the calculator includes them. Ontario charges a surtax of ${pct(ON_SURTAX_1_RATE * 100, 0)} on Ontario tax above ${cad(ON_SURTAX_1_THRESHOLD)}, plus ${pct(ON_SURTAX_2_RATE * 100, 0)} on the amount above ${cad(ON_SURTAX_2_THRESHOLD)}. It also adds the Ontario Health Premium, which is up to ${cad(ontarioHealthPremium(10_000_000))} a year.`,
					`British Columbia's lowest rate is ${pct(PROVINCES.BC.brackets[0].rate * 100, 2)} in ${CA_TAX_YEAR}, and it has a tax reduction credit for lower incomes. Manitoba's basic amount phases out between ${cad(MB_BPA_PHASE_START)} and ${cad(MB_BPA_PHASE_END)} of net income. Prince Edward Island has a ${pct(PROVINCES.PE.brackets[PROVINCES.PE.brackets.length - 1].rate * 100, 0)} rate above ${cad(PROVINCES.PE.brackets[PROVINCES.PE.brackets.length - 2].upTo)}.`
				],
				table: { caption: `Provincial and territorial rates, ${CA_TAX_YEAR}`, columns: ['Province or territory', 'Lowest rate', 'Top rate', 'Basic amount'], rows: provinceRows() }
			},
			{
				heading: 'How CPP and EI change your tax',
				paragraphs: [
					`The calculator works out your CPP and EI from your employment income. CPP is ${pct((CPP_BASE_RATE + CPP_FIRST_ADDITIONAL_RATE) * 100, 2)} of earnings between ${cad(CPP_BASIC_EXEMPTION)} and ${cad(YMPE)}, plus ${pct(CPP2_RATE * 100, 0)} on earnings between ${cad(YMPE)} and ${cad(YAMPE)}. EI is ${pct(EI_RATE * 100, 2)} of earnings up to ${cad(EI_MAX_INSURABLE)}, with a yearly maximum of ${moneyIn('CAD', EI_MAX_PREMIUM)}.`,
					`These payments also affect your tax. The ${pct(CPP_BASE_RATE * 100, 2)} base part of CPP and your EI earn a credit. The extra ${pct(CPP_FIRST_ADDITIONAL_RATE * 100, 0)} and the second tier (CPP2) come off your income instead. For a full pay breakdown, try the [Canada take-home pay calculator](/canada-take-home-pay-calculator). To see what you may get back at 65, use the [CPP calculator](/cpp-calculator).`
				]
			},
			{
				heading: 'Average rate, marginal rate and ways to lower your tax',
				paragraphs: [
					'Your average rate is your total tax divided by your total income. Your marginal rate is the tax on your next dollar. It is often much higher, because it adds federal and provincial tax together and may include surtax or lost credits.',
					'The marginal rate is the one that matters when you decide whether to earn more or to save in a registered account. A few ideas can help:'
				],
				list: [
					'**Contribute to an RRSP.** The deduction cuts your taxable income. Plan it with the [RRSP calculator](/rrsp-calculator).',
					'**Use a TFSA.** You get no deduction, but growth and withdrawals are tax-free. See the [TFSA calculator](/tfsa-calculator).',
					'**Claim the credits this tool leaves out.** Medical costs, donations, tuition and family credits can reduce your real bill.',
					'**Compare provinces carefully.** Move for work or family, not just for a lower rate. The take-home pay tool shows the gap.'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					`Quebec is not included yet. Quebec has its own income tax return and its own rules for QPP, QPIP and the federal abatement. For Quebec, use the tools from Revenu Québec.`,
					'It also leaves out the Yukon employment credit, dependant, spouse and age credits, tuition, medical and donation credits, dividends, capital gains and refundable benefits. It treats all income as ordinary income. Use it to plan, then check your return with the CRA or a tax professional.'
				]
			}
		],
		formulas: [
			{
				title: 'Federal and provincial tax',
				expression: 'Tax = Σ (rate × income in bracket) − lowest rate × (basic amount + employment amount + CPP base + EI)',
				variables: [
					{ symbol: 'Brackets', meaning: `Federal ${CA_TAX_YEAR}: ${FEDERAL_BRACKETS.map((b) => `${pct(b.rate * 100, 2)} ${Number.isFinite(b.upTo) ? `to ${cad(b.upTo)}` : 'above'}`).join(', ')}` },
					{ symbol: 'Lowest rate', meaning: `The lowest rate of the jurisdiction (${pct(FEDERAL_CREDIT_RATE * 100, 0)} federal) is used for non-refundable credits` },
					{ symbol: 'Basic amount', meaning: `Federal ${cad(FEDERAL_BPA_MAX)}, reduced to ${cad(FEDERAL_BPA_MIN)} for net income from ${cad(FEDERAL_BPA_PHASE_START)} to ${cad(FEDERAL_BPA_PHASE_END)}; each province has its own` },
					{ symbol: 'Ontario', meaning: `Surtax of ${pct(ON_SURTAX_1_RATE * 100, 0)} above ${cad(ON_SURTAX_1_THRESHOLD)} of Ontario tax and ${pct(ON_SURTAX_2_RATE * 100, 0)} above ${cad(ON_SURTAX_2_THRESHOLD)}, plus the Ontario Health Premium` }
				]
			},
			{
				title: 'CPP and EI in the calculation',
				expression: 'Net income = income − RRSP − (1% first additional CPP + CPP2); credit on the 4.95% base CPP and on EI',
				variables: [
					{ symbol: 'CPP', meaning: `${pct((CPP_BASE_RATE + CPP_FIRST_ADDITIONAL_RATE) * 100, 2)} of earnings between ${cad(CPP_BASIC_EXEMPTION)} and ${cad(YMPE)}, plus ${pct(CPP2_RATE * 100, 0)} between ${cad(YMPE)} and ${cad(YAMPE)} (CPP2)` },
					{ symbol: 'EI', meaning: `${pct(EI_RATE * 100, 2)} of earnings up to ${cad(EI_MAX_INSURABLE)} (maximum ${moneyIn('CAD', EI_MAX_PREMIUM)})` }
				]
			}
		],
		example: {
			title: '$100,000 salary in Ontario',
			steps: [
				'CPP: $3,519.45 base + $711.00 first additional + $416.00 CPP2; EI: $1,123.07.',
				'Net income = $100,000 − ($711.00 + $416.00) = $98,873.00.',
				'Federal tax = $16,464.97 − 14% × ($16,452 + $1,501 + $3,519.45 + $1,123.07) = $13,301.60.',
				'Ontario tax = $5,946.96 + $25.79 surtax + $750.00 Health Premium = $6,722.75.'
			],
			result: 'Total income tax $20,024.35, an average rate of 20.02%. The next dollar of other income is taxed at 31.48%.'
		},
		faq: [
			{
				q: 'How much income tax will I pay in Canada?',
				a: `It depends on your income and province. For example, a ${cad(100_000)} salary in Ontario comes to about ${moneyIn('CAD', 20024.35, true)} of federal and provincial income tax in ${CA_TAX_YEAR}, which is an average rate of 20.02%. Enter your own numbers above for your result.`
			},
			{
				q: 'What is the difference between average and marginal tax rate?',
				a: 'Your average rate is total tax divided by total income. Your marginal rate is the tax on one more dollar of ordinary income. It includes surtaxes, the Ontario Health Premium and the phase-out of credits, so it can be higher than the bracket rates alone.'
			},
			{
				q: 'Does this Canada income tax calculator include CPP and EI?',
				a: 'Yes. It works out CPP and EI from your employment income, then uses them in the tax calculation. It shows both amounts as separate lines, so you can see them.'
			},
			{
				q: 'Why does Ontario tax look higher than its bracket rates?',
				a: 'Ontario adds a surtax on higher amounts of Ontario tax, and the Ontario Health Premium on top. Both raise your bill above what the brackets alone suggest. A tax reduction applies at low incomes.'
			},
			{
				q: 'What changed for 2026?',
				a: `The lowest federal rate is ${pct(FEDERAL_BRACKETS[0].rate * 100, 2)} for the full year, down from a blended 14.5% in 2025. British Columbia raised its lowest rate to ${pct(PROVINCES.BC.brackets[0].rate * 100, 2)}. Prince Edward Island added a ${pct(PROVINCES.PE.brackets[PROVINCES.PE.brackets.length - 1].rate * 100, 0)} rate above ${cad(PROVINCES.PE.brackets[PROVINCES.PE.brackets.length - 2].upTo)}.`
			},
			{
				q: 'Can I use it for Quebec?',
				a: 'Not yet. Quebec has its own return and its own rules for QPP, QPIP and the federal abatement. The calculator shows a message instead of a number for Quebec, so you will not get a wrong result.'
			}
		],
		sources: [CRA_RATES_SOURCE, CRA_INDEXATION_SOURCE, CRA_T4127_SOURCE, CPP_SOURCE, EI_SOURCE],
		disclaimer: `Estimates for tax year ${CA_TAX_YEAR}. Your return may differ because of credits and deductions not modelled here. This is not tax advice. Check with the CRA or a tax professional.`
	}
});
