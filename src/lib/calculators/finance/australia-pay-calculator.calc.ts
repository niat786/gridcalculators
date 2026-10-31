import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './australia-pay-calculator.meta';
import {
	AU_FOREIGN_BRACKETS,
	AU_TAX_YEAR,
	AU_TAX_YEAR_LONG,
	AU_WHM_BRACKETS,
	HELP_BAND2_RATE,
	HELP_BAND2_TO,
	HELP_BAND3_BASE,
	HELP_BAND3_RATE,
	HELP_BAND3_TO,
	HELP_NIL_TO,
	HELP_TOP_RATE,
	LITO_END,
	LITO_FULL_TO,
	LITO_MAX,
	LITO_STEP1_RATE,
	LITO_STEP1_TO,
	LITO_STEP2_RATE,
	MEDICARE_PHASE_IN,
	MEDICARE_RATE,
	type Bracket,
	ATO_CUTS_SOURCE,
	ATO_FOREIGN_SOURCE,
	ATO_HELP_SOURCE,
	ATO_LITO_SOURCE,
	ATO_MEDICARE_SOURCE,
	ATO_RATES_SOURCE,
	ATO_SG_SOURCE,
	ATO_WHM_SOURCE,
	MAX_CONTRIBUTION_BASE,
	MEDICARE_LOW_LOWER,
	MEDICARE_LOW_UPPER,
	MEDICARE_THRESHOLD_YEAR,
	SG_RATE,
	bracketTax,
	helpRepayment,
	lito,
	medicareLevy
} from '../data/au-tax-2026-27';
import { AU_RESIDENT_BRACKETS } from '../data/au-tax-2026-27';

/** Content is written once at build time, so format dollars explicitly (A$18,200). */
const aud = (n: number) => moneyIn('AUD', n, true);
/** A rate as cents per dollar, e.g. 0.15 becomes "15c" (whole cents or one decimal). */
const cents = (rate: number) => `${Math.round(rate * 1000) / 10}c`;
function bandRows(brackets: Bracket[]): string[][] {
	let from = 0;
	return brackets.map((b) => {
		const band = Number.isFinite(b.upTo) ? (from === 0 ? `Up to ${aud(b.upTo)}` : `${aud(from + 1)} to ${aud(b.upTo)}`) : `Over ${aud(from)}`;
		from = b.upTo;
		return [band, b.rate === 0 ? 'Nil' : pct(b.rate * 100, 0)];
	});
}
function bandSummary(brackets: Bracket[]): string {
	let from = 0;
	return brackets
		.map((b) => {
			const text = Number.isFinite(b.upTo) ? `${pct(b.rate * 100, 0)} ${from === 0 ? 'up to' : 'to'} ${aud(b.upTo)}` : `${pct(b.rate * 100, 0)} above ${aud(from)}`;
			from = b.upTo;
			return text;
		})
		.join(', ');
}

const PERIODS: Record<string, { n: number; label: string }> = {
	annual: { n: 1, label: 'year' },
	monthly: { n: 12, label: 'month' },
	fortnightly: { n: 26, label: 'fortnight' },
	weekly: { n: 52, label: 'week' }
};

export interface AuPayResult {
	salary: number;
	super: number;
	incomeTax: number;
	lito: number;
	medicare: number;
	help: number;
	net: number;
}

/**
 * Annual pay breakdown. `amount` is the annual figure entered. In 'included' mode it is a package that already
 * contains super: salary + 12% × min(salary, maximum contribution base) = package.
 */
export function auPay(amount: number, status: string, superMode: string, hasHelp: boolean): AuPayResult {
	let salary = amount;
	let sup = 0;
	if (superMode === 'on-top') {
		sup = SG_RATE * Math.min(salary, MAX_CONTRIBUTION_BASE);
	} else if (superMode === 'included') {
		const capped = SG_RATE * MAX_CONTRIBUTION_BASE;
		if (amount / (1 + SG_RATE) <= MAX_CONTRIBUTION_BASE) {
			salary = amount / (1 + SG_RATE);
			sup = amount - salary;
		} else {
			sup = capped;
			salary = amount - capped;
		}
	}
	let tax = 0;
	let offset = 0;
	let medicare = 0;
	let help = 0;
	if (status === 'resident') {
		const gross = bracketTax(salary, AU_RESIDENT_BRACKETS);
		offset = Math.min(lito(salary), gross);
		tax = gross - offset;
		medicare = medicareLevy(salary);
		help = hasHelp ? helpRepayment(salary) : 0;
	} else if (status === 'whm') {
		tax = bracketTax(salary, AU_WHM_BRACKETS);
	} else {
		tax = bracketTax(salary, AU_FOREIGN_BRACKETS);
	}
	return { salary, super: sup, incomeTax: tax, lito: offset, medicare, help, net: salary - tax - medicare - help };
}

function incomeRows(): string[][] {
	return [50_000, 90_000, 130_000, 190_000, 250_000].map((income) => {
		const r = auPay(income, 'resident', 'none', false);
		return [aud(income), moneyIn('AUD', r.incomeTax, true), moneyIn('AUD', r.medicare, true), moneyIn('AUD', r.net, true), moneyIn('AUD', r.net / 12, true)];
	});
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'income', label: 'Income', type: 'number', default: 90000, min: 0, max: 100_000_000, step: 1000, prefix: '$', help: 'Before tax, for the pay period chosen below.' },
		{
			id: 'period',
			label: 'Income period',
			type: 'select',
			display: 'segmented',
			default: 'annual',
			options: [
				{ label: 'Year', value: 'annual' },
				{ label: 'Month', value: 'monthly' },
				{ label: 'Fortnight', value: 'fortnightly' },
				{ label: 'Week', value: 'weekly' }
			]
		},
		{
			id: 'status',
			label: 'Tax residency',
			type: 'select',
			display: 'menu',
			default: 'resident',
			options: [
				{ label: 'Australian resident for tax', value: 'resident' },
				{ label: 'Foreign resident (non-resident)', value: 'foreign' },
				{ label: 'Working holiday maker (417 / 462 visa)', value: 'whm' }
			]
		},
		{
			id: 'super',
			label: 'Superannuation',
			type: 'select',
			display: 'menu',
			default: 'on-top',
			options: [
				{ label: 'Super paid on top of this income', value: 'on-top' },
				{ label: 'This income is a package including super', value: 'included' },
				{ label: 'Ignore super', value: 'none' }
			]
		},
		{ id: 'help', label: 'I have a HELP / HECS debt', type: 'toggle', default: false, visibleWhen: (v) => v.status === 'resident' }
	],
	calculate(v): CalculationResult {
		const income = Number(v.income);
		const p = PERIODS[String(v.period)];
		const status = String(v.status);
		if (!p || !(income >= 0) || !Number.isFinite(income) || !['resident', 'foreign', 'whm'].includes(status)) {
			return { primaryResult: DASH, primaryLabel: 'Take-home pay', summary: 'Enter your income before tax.' };
		}
		const annualAmount = income * p.n;
		const r = auPay(annualAmount, status, String(v.super), v.help === true && status === 'resident');
		const per = (x: number) => money(x / p.n);
		const totalTax = r.incomeTax + r.medicare + r.help;
		const rows = [
			{ item: 'Gross pay', annual: money(r.salary), period: per(r.salary) },
			{ item: 'Income tax', annual: money(r.incomeTax), period: per(r.incomeTax) },
			{ item: 'Medicare levy', annual: money(r.medicare), period: per(r.medicare) },
			{ item: 'HELP repayment', annual: money(r.help), period: per(r.help) },
			{ item: 'Take-home pay', annual: money(r.net), period: per(r.net) },
			{ item: 'Super (employer, 12%)', annual: money(r.super), period: per(r.super) }
		];
		return {
			primaryResult: per(r.net),
			primaryLabel: `Take-home pay per ${p.label}`,
			summary:
				`Taxable income ${money(r.salary, true)} a year. Tax, Medicare and HELP total ${money(totalTax, true)}, an average of ${pct(r.salary > 0 ? (totalTax / r.salary) * 100 : 0, 1)}.` +
				(r.lito > 0 ? ` Includes a low income tax offset of ${money(r.lito, true)}.` : ''),
			secondaryMetrics: [
				{ label: 'Take-home per year', value: money(r.net) },
				{ label: 'Income tax per year', value: money(r.incomeTax) },
				{ label: 'Medicare levy per year', value: money(r.medicare) },
				{ label: 'HELP repayment per year', value: money(r.help) },
				{ label: 'Super per year', value: money(r.super) },
				{ label: 'Gross salary per year', value: money(r.salary) }
			],
			table: {
				title: `Breakdown (${AU_TAX_YEAR})`,
				columns: [
					{ key: 'item', label: 'Item' },
					{ key: 'annual', label: 'Per year', align: 'end' },
					{ key: 'period', label: `Per ${p.label}`, align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro: `Work out your take-home pay in Australia for the ${AU_TAX_YEAR} income year (${AU_TAX_YEAR_LONG}). This Australia pay calculator takes off income tax, the Medicare levy and HELP repayments, and shows super on top or inside your package.`,
		howTo: [
			'Enter your income and choose whether it is a yearly, monthly, fortnightly or weekly amount.',
			'Pick your tax residency. Most people choose Australian resident for tax.',
			'Say whether super is on top of your income, already included in a package, or ignored.',
			'Switch on the HELP option if you have a study loan, then read your take-home pay per period.'
		],
		about: [
			{
				heading: 'What comes out of your pay in Australia?',
				paragraphs: [
					'Your take-home pay is what reaches your bank account after tax. In Australia, your employer holds back income tax from each payment and sends it to the ATO. This is called PAYG withholding.',
					'Next, residents pay the Medicare levy, which helps fund the public health system. If you have a student loan from the government, a HELP repayment is added to your tax. A low income tax offset can lower the bill for people on smaller incomes.',
					'Super is different. Your employer pays it into your super fund on top of your pay, so it does not reduce your take-home pay. The calculator shows it as a separate line.'
				]
			},
			{
				heading: `Tax rates for ${AU_TAX_YEAR}`,
				paragraphs: [
					`Australian residents pay tax in brackets. The first ${aud(AU_RESIDENT_BRACKETS[0].upTo)} is tax-free. From 1 July 2026, the lowest taxed rate is ${pct(AU_RESIDENT_BRACKETS[1].rate * 100, 0)}, and the ATO says it is due to fall again from 1 July 2027.`,
					'Residents get these rates. The tool applies different tables to foreign residents and working holiday makers, who are listed below the table.'
				],
				table: { caption: `Resident tax rates, ${AU_TAX_YEAR}`, columns: ['Taxable income', 'Rate'], rows: bandRows(AU_RESIDENT_BRACKETS) },
				list: [
					`**Foreign residents:** ${bandSummary(AU_FOREIGN_BRACKETS)}. There is no tax-free amount, and the calculator adds no Medicare levy.`,
					`**Working holiday makers (417 and 462 visas):** ${bandSummary(AU_WHM_BRACKETS)}. The calculator adds no Medicare levy here either.`
				]
			},
			{
				heading: 'Medicare levy, low income offset and HELP',
				paragraphs: [
					`The Medicare levy is ${pct(MEDICARE_RATE * 100, 0)} of taxable income. Low earners pay less. The ATO had not published ${AU_TAX_YEAR} thresholds when this page was checked, so the tool uses the ${MEDICARE_THRESHOLD_YEAR} figures.`,
					`Under those figures, there is no levy up to ${aud(MEDICARE_LOW_LOWER)}. Above that, the levy is ${cents(MEDICARE_PHASE_IN)} per dollar until the full rate applies at ${aud(MEDICARE_LOW_UPPER)}. The tool assumes you are single.`,
					`The low income tax offset (LITO) is ${aud(LITO_MAX)} at ${aud(LITO_FULL_TO)} or less. It then falls by ${cents(LITO_STEP1_RATE)} for each dollar up to ${aud(LITO_STEP1_TO)}. After that, it falls by ${cents(LITO_STEP2_RATE)} per dollar until it ends at ${aud(LITO_END)}.`,
					`HELP repayments start when repayment income passes ${aud(HELP_NIL_TO)}. They then rise in steps, starting at ${cents(HELP_BAND2_RATE)} in the dollar above that threshold. The [HECS-HELP calculator](/hecs-help-calculator) explains the bands and how long your debt may take to clear.`
				]
			},
			{
				heading: 'Super on top or inside your package',
				paragraphs: [
					`The super guarantee is ${pct(SG_RATE * 100, 0)} of your pay in ${AU_TAX_YEAR}. It is worked out on earnings up to ${aud(MAX_CONTRIBUTION_BASE)} a year.`,
					`If your employer quotes a salary plus super, choose Super paid on top. If you were quoted a package that already includes super, choose package. The tool then works backwards, so that your salary plus ${pct(SG_RATE * 100, 0)} equals the package. For example, a ${aud(90_000)} package means a salary of about ${aud(90_000 / (1 + SG_RATE))}, with ${aud(90_000 - 90_000 / (1 + SG_RATE))} going to super.`,
					'To see where that super could grow, use the [superannuation calculator](/superannuation-calculator).'
				]
			},
			{
				heading: 'Take-home pay at different incomes',
				paragraphs: [
					`The table shows a resident with no HELP debt, super paid on top, in ${AU_TAX_YEAR}. Each row is a full-year figure.`,
					'The tool leaves out deductions, other income, salary sacrifice, the Medicare levy surcharge, Division 293 tax, student loans other than HELP and seniors offsets. It also spreads annual tax evenly over the year, so your payslip can differ a little.',
					'If you plan to buy a home, the [borrowing power calculator](/borrowing-power-calculator) uses the same tax rules. The [Australia stamp duty calculator](/australia-stamp-duty-calculator) covers the cost of buying.'
				],
				table: { caption: `Resident take-home pay, ${AU_TAX_YEAR}`, columns: ['Income', 'Income tax', 'Medicare levy', 'Take-home per year', 'Per month'], rows: incomeRows() }
			}
		],
		formulas: [
			{
				title: `Resident tax rates ${AU_TAX_YEAR}`,
				expression: '$0–18,200: nil · $18,201–45,000: 15% · $45,001–135,000: $4,020 + 30% · $135,001–190,000: $31,020 + 37% · over $190,000: $51,370 + 45%',
				variables: [
					{ symbol: 'Medicare levy', meaning: `${pct(MEDICARE_RATE * 100, 0)} of taxable income, phased in at ${cents(MEDICARE_PHASE_IN)} per $1 over ${aud(MEDICARE_LOW_LOWER)} until it reaches 2% at ${aud(MEDICARE_LOW_UPPER)}` },
					{ symbol: 'LITO', meaning: `low income tax offset: ${aud(LITO_MAX)} up to ${aud(LITO_FULL_TO)}, then reduced to $0 at ${aud(LITO_END)}` },
					{ symbol: 'HELP', meaning: `${cents(HELP_BAND2_RATE)} per $1 over ${aud(HELP_NIL_TO)}, then ${aud(HELP_BAND3_BASE)} + ${cents(HELP_BAND3_RATE)} over ${aud(HELP_BAND2_TO)}, then ${pct(HELP_TOP_RATE * 100, 0)} of all income from ${aud(HELP_BAND3_TO + 1)}` },
					{ symbol: 'Super', meaning: `${pct(SG_RATE * 100, 0)} of salary up to the ${aud(MAX_CONTRIBUTION_BASE)} maximum contribution base` }
				]
			},
			{
				title: 'Foreign resident and working holiday maker rates',
				expression: `Foreign resident: ${bandSummary(AU_FOREIGN_BRACKETS)}. Working holiday maker: ${bandSummary(AU_WHM_BRACKETS)}.`,
				variables: []
			}
		],
		example: {
			title: 'A resident earning $90,000 plus super',
			steps: [
				'Income tax: $4,020 + 30% × ($90,000 − $45,000) = $17,520',
				'Medicare levy: 2% × $90,000 = $1,800',
				'Take-home pay: $90,000 − $17,520 − $1,800 = $70,680 a year, or $5,890.00 a month',
				'Super on top: 12% × $90,000 = $10,800'
			],
			result: '$5,890.00 a month'
		},
		faq: [
			{
				q: 'How much tax do I pay on $90,000 in Australia?',
				a: 'A resident pays $17,520 of income tax plus $1,800 of Medicare levy on $90,000 in 2026-27. That leaves $70,680 a year, or $5,890 a month. A HELP debt would lower this by about $3,071 a year.'
			},
			{
				q: 'Did the tax rate really change on 1 July 2026?',
				a: `Yes. The ATO states that from 1 July 2026 the 16% rate is reduced to ${pct(AU_RESIDENT_BRACKETS[1].rate * 100, 0)}, and it is due to fall to 14% from 1 July 2027. This calculator uses ${pct(AU_RESIDENT_BRACKETS[1].rate * 100, 0)}.`
			},
			{
				q: 'Which Medicare levy thresholds does it use?',
				a: `The ATO had not published ${AU_TAX_YEAR} low-income thresholds, so it uses the latest published (${MEDICARE_THRESHOLD_YEAR}): the levy starts above ${aud(MEDICARE_LOW_LOWER)} and is the full 2% from ${aud(MEDICARE_LOW_UPPER)}. It assumes a single person.`
			},
			{
				q: 'Is super part of my take-home pay?',
				a: 'No. Super is paid into your fund by your employer, so it is not in your bank account. The calculator shows it as a separate line, on top of your pay or inside your package.'
			},
			{
				q: 'What does it leave out?',
				a: 'Deductions, other income, salary sacrifice, the Medicare levy surcharge, Division 293 tax, student loans other than HELP, and any seniors offsets. Per-pay PAYG withholding can differ a little from the yearly total shown here.'
			}
		],
		sources: [ATO_RATES_SOURCE, ATO_CUTS_SOURCE, ATO_WHM_SOURCE, ATO_FOREIGN_SOURCE, ATO_MEDICARE_SOURCE, ATO_LITO_SOURCE, ATO_HELP_SOURCE, ATO_SG_SOURCE],
		disclaimer:
			'An estimate of annual tax spread evenly over the year. Foreign-resident rates are the latest ATO table (2025-26). It is not tax advice; check your own situation with the ATO or a registered tax agent.'
	}
});
