import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './land-transfer-tax-calculator.meta';
import {
	CA_TAX_YEAR,
	BC_FTB_FLAT_UP_TO,
	BC_FTB_FULL_UP_TO,
	BC_FTB_MAX_EXEMPTION,
	BC_FTB_NONE_FROM,
	BC_NEW_BUILD_FULL_UP_TO,
	BC_NEW_BUILD_NONE_FROM,
	BC_PTT_BRACKETS,
	BC_PTT_EXTRA_RATE,
	BC_PTT_EXTRA_THRESHOLD,
	LTT_SOURCES,
	MB_LTT_BRACKETS,
	NB_RPTT_RATE,
	NL_FEE_BASE,
	NL_FEE_FREE_AMOUNT,
	NL_FEE_PER_100,
	NL_MORTGAGE_FEE_CAP,
	NS_DEED_TAX_MAX,
	NS_DEED_TAX_MIN,
	NS_DEED_TAX_DEFAULT,
	ON_FTB_MAX,
	ON_LTT_BRACKETS,
	ON_LTT_BRACKETS_OTHER,
	PE_RPTT_EXEMPT_UP_TO,
	PE_RPTT_RATE,
	QC_HIGH_VALUE_THRESHOLD,
	QC_MUNICIPAL_MAX_RATE,
	QC_WELCOME_TAX_RATES,
	QC_WELCOME_TAX_THRESHOLDS,
	TORONTO_FTB_MAX,
	TORONTO_MLTT_BRACKETS,
	TORONTO_MLTT_BRACKETS_OTHER,
	bracketTax,
	nlRegistrationFee,
	type Bracket
} from '../data/ca-tax-2026';

/** Content is written once at build time, so format dollars explicitly (CA$55,000). */
const cad = (n: number) => moneyIn('CAD', n, true);
function bandRows(brackets: Bracket[]): string[][] {
	let from = 0;
	return brackets.map((b) => {
		const band = Number.isFinite(b.upTo) ? (from === 0 ? `Up to ${cad(b.upTo)}` : `${cad(from + 1)} to ${cad(b.upTo)}`) : `Over ${cad(from)}`;
		from = b.upTo;
		return [band, pct(b.rate * 100, 2)];
	});
}
function bandSummary(brackets: Bracket[]): string {
	return brackets.map((b) => `${pct(b.rate * 100, 2)} ${Number.isFinite(b.upTo) ? `to ${cad(b.upTo)}` : 'above'}`).join(', ');
}
/** Price at which the graduated tax reaches a given amount (used for the "full refund up to about" line). */
function priceForTax(brackets: Bracket[], target: number): number {
	let from = 0;
	let paid = 0;
	for (const b of brackets) {
		const slice = (b.upTo - from) * b.rate;
		if (paid + slice >= target) return from + (target - paid) / b.rate;
		paid += slice;
		from = b.upTo;
	}
	return from;
}
const TORONTO_FIRST_HIGH = TORONTO_MLTT_BRACKETS.findIndex((b) => b.upTo > 3_000_000);
const torontoHighRates = (() => {
	let from = TORONTO_MLTT_BRACKETS[TORONTO_FIRST_HIGH - 1].upTo;
	return TORONTO_MLTT_BRACKETS.slice(TORONTO_FIRST_HIGH).map((b) => {
		const text = Number.isFinite(b.upTo) ? `${pct(b.rate * 100, 2)} on the part from ${cad(from)} to ${cad(b.upTo)}` : `${pct(b.rate * 100, 2)} on the part above ${cad(from)}`;
		from = b.upTo;
		return text;
	});
})();
function otherRows(): string[][] {
	const qc = QC_WELCOME_TAX_THRESHOLDS;
	const r = QC_WELCOME_TAX_RATES;
	return [
		['Manitoba', bandSummary(MB_LTT_BRACKETS)],
		['Quebec', `${pct(r.first * 100, 1)} to ${cad(qc.first)}, ${pct(r.second * 100, 1)} to ${cad(qc.second)}, ${pct(r.third * 100, 1)} to ${cad(QC_HIGH_VALUE_THRESHOLD)}, then your municipality's rate (up to ${pct(QC_MUNICIPAL_MAX_RATE * 100, 0)} in most places)`],
		['New Brunswick', `${pct(NB_RPTT_RATE * 100, 0)} of the greater of the price and the assessed value`],
		['Prince Edward Island', `${pct(PE_RPTT_RATE * 100, 0)} of the greater of the price and the assessed value, waived at ${cad(PE_RPTT_EXEMPT_UP_TO)} or less`],
		['Nova Scotia', `${pct(NS_DEED_TAX_MIN, 1)} to ${pct(NS_DEED_TAX_MAX, 1)}, set by each municipality (default here ${pct(NS_DEED_TAX_DEFAULT, 1)})`],
		['Newfoundland and Labrador', `Registration fees of ${cad(NL_FEE_BASE)} plus ${moneyIn('CAD', NL_FEE_PER_100)} per $100 above ${cad(NL_FEE_FREE_AMOUNT)}, for the deed and the mortgage (mortgage fee capped at ${cad(NL_MORTGAGE_FEE_CAP)})`]
	];
}

export interface LttInput {
	province: string;
	price: number;
	firstTime: boolean;
	toronto: boolean;
	singleFamily: boolean;
	newBuild: boolean;
	/** Nova Scotia municipal rate in percent. */
	nsRate: number;
	/** Quebec municipal rate on the part above $500,000, in percent. */
	qcRate: number;
	/** Assessed value (New Brunswick, Prince Edward Island); the greater of price and this is taxed. */
	assessed: number;
	/** Mortgage amount (Newfoundland and Labrador registration fee). */
	mortgage: number;
}

export interface LttResult {
	/** Main provincial tax or fee before rebates. */
	provincial: number;
	/** Toronto municipal tax before rebate (0 elsewhere). */
	municipal: number;
	/** Rebates and exemptions, as a positive number. */
	rebate: number;
	total: number;
	label: string;
	rows: { item: string; amount: number }[];
}

export function landTransferTax(i: LttInput): LttResult {
	const p = i.price;
	const rows: { item: string; amount: number }[] = [];
	let provincial = 0;
	let municipal = 0;
	let rebate = 0;
	let label = 'Land transfer tax';
	switch (i.province) {
		case 'ON': {
			provincial = bracketTax(p, i.singleFamily ? ON_LTT_BRACKETS : ON_LTT_BRACKETS_OTHER);
			rows.push({ item: 'Ontario land transfer tax', amount: provincial });
			if (i.firstTime) {
				const r = Math.min(ON_FTB_MAX, provincial);
				rebate += r;
				rows.push({ item: 'Ontario first-time buyer refund', amount: -r });
			}
			if (i.toronto) {
				municipal = bracketTax(p, i.singleFamily ? TORONTO_MLTT_BRACKETS : TORONTO_MLTT_BRACKETS_OTHER);
				rows.push({ item: 'Toronto municipal land transfer tax', amount: municipal });
				if (i.firstTime) {
					const r = Math.min(TORONTO_FTB_MAX, municipal);
					rebate += r;
					rows.push({ item: 'Toronto first-time buyer rebate', amount: -r });
				}
			}
			break;
		}
		case 'BC': {
			label = 'Property transfer tax';
			provincial = bracketTax(p, BC_PTT_BRACKETS) + Math.max(0, p - BC_PTT_EXTRA_THRESHOLD) * BC_PTT_EXTRA_RATE;
			rows.push({ item: 'B.C. property transfer tax', amount: provincial });
			let ftb = 0;
			if (i.firstTime) {
				if (p <= BC_FTB_FULL_UP_TO) ftb = provincial;
				else if (p <= BC_FTB_FLAT_UP_TO) ftb = BC_FTB_MAX_EXEMPTION;
				else if (p < BC_FTB_NONE_FROM) ftb = (BC_FTB_MAX_EXEMPTION * (BC_FTB_NONE_FROM - p)) / (BC_FTB_NONE_FROM - BC_FTB_FLAT_UP_TO);
			}
			let nb = 0;
			if (i.newBuild) {
				if (p < BC_NEW_BUILD_FULL_UP_TO) nb = provincial;
				else if (p < BC_NEW_BUILD_NONE_FROM) nb = (provincial * (BC_NEW_BUILD_NONE_FROM - p)) / (BC_NEW_BUILD_NONE_FROM - BC_NEW_BUILD_FULL_UP_TO);
			}
			// The two exemptions cannot be added together; the larger one applies.
			const best = Math.min(provincial, Math.max(ftb, nb));
			if (best > 0) {
				rebate += best;
				rows.push({ item: ftb >= nb ? 'First time home buyers’ exemption' : 'Newly built home exemption', amount: -best });
			}
			break;
		}
		case 'MB':
			provincial = bracketTax(p, MB_LTT_BRACKETS);
			rows.push({ item: 'Manitoba land transfer tax', amount: provincial });
			break;
		case 'QC': {
			label = 'Welcome tax';
			const t = QC_WELCOME_TAX_THRESHOLDS;
			const r = QC_WELCOME_TAX_RATES;
			provincial = bracketTax(p, [
				{ upTo: t.first, rate: r.first },
				{ upTo: t.second, rate: r.second },
				{ upTo: QC_HIGH_VALUE_THRESHOLD, rate: r.third },
				{ upTo: Infinity, rate: i.qcRate / 100 }
			]);
			rows.push({ item: 'Quebec welcome tax (droits de mutation)', amount: provincial });
			break;
		}
		case 'NB': {
			label = 'Real property transfer tax';
			provincial = Math.max(p, i.assessed) * NB_RPTT_RATE;
			rows.push({ item: 'New Brunswick real property transfer tax (1%)', amount: provincial });
			break;
		}
		case 'NS':
			label = 'Deed transfer tax';
			provincial = p * (i.nsRate / 100);
			rows.push({ item: `Nova Scotia deed transfer tax (${i.nsRate}%)`, amount: provincial });
			break;
		case 'PE': {
			label = 'Real property transfer tax';
			const basis = Math.max(p, i.assessed);
			provincial = basis > PE_RPTT_EXEMPT_UP_TO ? basis * PE_RPTT_RATE : 0;
			rows.push({ item: 'P.E.I. real property transfer tax (1%)', amount: provincial });
			break;
		}
		case 'NL': {
			label = 'Registration fees';
			const deed = nlRegistrationFee(p);
			const mortgage = nlRegistrationFee(i.mortgage, NL_MORTGAGE_FEE_CAP);
			provincial = deed + mortgage;
			rows.push({ item: 'Deed registration fee', amount: deed });
			rows.push({ item: 'Mortgage registration fee', amount: mortgage });
			break;
		}
	}
	const total = provincial + municipal - rebate;
	return { provincial, municipal, rebate, total, label, rows };
}

const PROVINCES = [
	{ label: 'Ontario', value: 'ON' },
	{ label: 'British Columbia', value: 'BC' },
	{ label: 'Manitoba', value: 'MB' },
	{ label: 'Quebec', value: 'QC' },
	{ label: 'New Brunswick', value: 'NB' },
	{ label: 'Nova Scotia', value: 'NS' },
	{ label: 'Prince Edward Island', value: 'PE' },
	{ label: 'Newfoundland and Labrador', value: 'NL' }
];

const is = (...codes: string[]) => (v: Record<string, unknown>) => codes.includes(String(v.province));

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'province', label: 'Province', type: 'select', display: 'menu', default: 'ON', options: PROVINCES, help: 'Alberta and Saskatchewan charge only small registration fees, so they are not included.' },
		{ id: 'price', label: 'Property price', type: 'number', default: 800000, min: 0, max: 1_000_000_000, step: 10000, prefix: '$' },
		{ id: 'firstTime', label: 'First-time home buyer', type: 'toggle', default: false, visibleWhen: is('ON', 'BC') },
		{ id: 'toronto', label: 'Property is in the City of Toronto', type: 'toggle', default: false, visibleWhen: is('ON') },
		{ id: 'singleFamily', label: 'One or two single-family residences', type: 'toggle', default: true, help: 'Houses, condos and townhouses count. Apartment buildings and other property use lower top rates.', visibleWhen: is('ON') },
		{ id: 'newBuild', label: 'Newly built home', type: 'toggle', default: false, help: 'For the B.C. newly built home exemption (principal residence).', visibleWhen: is('BC') },
		{ id: 'nsRate', label: 'Municipal deed transfer tax rate', type: 'number', default: NS_DEED_TAX_DEFAULT, min: 0, max: 3, step: 0.05, suffix: '%', help: 'Set by each municipality (1.0% to 1.5% in 2026; Halifax is 1.5%).', visibleWhen: is('NS') },
		{ id: 'qcRate', label: 'Municipal rate above $500,000', type: 'number', default: 1.5, min: 1.5, max: 3, step: 0.05, suffix: '%', help: 'Standard is 1.5%. Some municipalities charge up to 3% on the part above $500,000; Montréal has its own schedule.', visibleWhen: is('QC') },
		{ id: 'assessed', label: 'Assessed value (optional)', type: 'number', default: 0, min: 0, max: 1_000_000_000, step: 10000, prefix: '$', help: 'The tax applies to the higher of the price and the assessed value.', visibleWhen: is('NB', 'PE') },
		{ id: 'mortgage', label: 'Mortgage amount', type: 'number', default: 0, min: 0, max: 1_000_000_000, step: 10000, prefix: '$', help: 'Newfoundland and Labrador also charges a fee to register the mortgage.', visibleWhen: is('NL') }
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		const nsRate = Number(v.nsRate);
		const qcRate = Number(v.qcRate);
		const assessed = Number(v.assessed);
		const mortgage = Number(v.mortgage);
		const province = String(v.province);
		if (!PROVINCES.some((p) => p.value === province) || !(price > 0) || !Number.isFinite(price)) {
			return { primaryResult: DASH, primaryLabel: 'Total to pay', summary: 'Enter a property price above zero and pick a province.' };
		}
		if (province === 'NS' && !(nsRate >= 0 && nsRate <= 3)) {
			return { primaryResult: DASH, primaryLabel: 'Total to pay', summary: 'Enter your municipality’s deed transfer tax rate (between 0% and 3%).' };
		}
		if (province === 'QC' && !(qcRate >= 1.5 && qcRate <= QC_MUNICIPAL_MAX_RATE * 100)) {
			return { primaryResult: DASH, primaryLabel: 'Total to pay', summary: 'The municipal rate above $500,000 is between 1.5% and 3%.' };
		}
		if ((province === 'NB' || province === 'PE') && !(assessed >= 0 && Number.isFinite(assessed))) {
			return { primaryResult: DASH, primaryLabel: 'Total to pay', summary: 'Enter an assessed value of zero or more.' };
		}
		if (province === 'NL' && !(mortgage >= 0 && Number.isFinite(mortgage))) {
			return { primaryResult: DASH, primaryLabel: 'Total to pay', summary: 'Enter a mortgage amount of zero or more.' };
		}
		const r = landTransferTax({
			province,
			price,
			firstTime: v.firstTime === true,
			toronto: v.toronto === true,
			singleFamily: v.singleFamily !== false,
			newBuild: v.newBuild === true,
			nsRate: Number.isFinite(nsRate) ? nsRate : NS_DEED_TAX_DEFAULT,
			qcRate: Number.isFinite(qcRate) ? qcRate : 1.5,
			assessed: Number.isFinite(assessed) ? assessed : 0,
			mortgage: Number.isFinite(mortgage) ? mortgage : 0
		});
		const notes: Record<string, string> = {
			PE: ' The P.E.I. first-time buyer exemption is not included.',
			QC: ' Municipalities base the tax on the highest of the price, the amount in the deed and the municipal value.',
			NS: ' Some municipalities tax the assessed value if it is higher.'
		};
		return {
			primaryResult: money(r.total),
			primaryLabel: `${r.label} to pay`,
			summary: `${r.label} is ${pct((r.total / price) * 100, 2)} of the price.${r.rebate > 0 ? ` Rebates and exemptions of ${money(r.rebate)} are already taken off.` : ''}${notes[province] ?? ''}`,
			secondaryMetrics: [
				{ label: province === 'ON' ? 'Ontario tax before refund' : `${r.label} before rebates`, value: money(r.provincial) },
				{ label: 'Toronto municipal tax before rebate', value: money(r.municipal) },
				{ label: 'Rebates and exemptions', value: money(r.rebate) },
				{ label: 'Share of the price', value: pct((r.total / price) * 100, 2) }
			],
			table: {
				title: 'Breakdown',
				collapsed: true,
				columns: [
					{ key: 'item', label: 'Item' },
					{ key: 'amount', label: 'Amount', align: 'end' }
				],
				rows: [...r.rows.map((x) => ({ item: x.item, amount: money(x.amount) })), { item: 'Total', amount: money(r.total) }]
			}
		};
	},
	content: {
		intro: `Estimate the land transfer tax you pay when you buy a home in Canada. This land transfer tax calculator covers Ontario, British Columbia, Manitoba, Quebec, New Brunswick, Nova Scotia, Prince Edward Island and Newfoundland and Labrador. It also includes the Toronto tax and first-time buyer rebates, using ${CA_TAX_YEAR} rules.`,
		howTo: [
			'Pick your province and enter the property price.',
			'In Ontario, switch on Toronto if the home is in the city, and switch on first-time buyer if you qualify.',
			'In British Columbia, choose first-time buyer or newly built home. In Nova Scotia, enter your municipality’s rate.',
			'Read the total to pay and the breakdown of tax, rebates and the share of the price.'
		],
		about: [
			{
				heading: 'What is land transfer tax?',
				paragraphs: [
					'Land transfer tax is a one-time tax you pay when ownership of a property changes. It is based on the price, and you usually pay it on closing day. Also, it is separate from your down payment and your mortgage.',
					'The name changes by place. Ontario and Manitoba say land transfer tax. British Columbia says property transfer tax, Quebec says welcome tax, and Nova Scotia says deed transfer tax. New Brunswick and Prince Edward Island have a real property transfer tax, and Newfoundland and Labrador charges registration fees.',
					'Alberta and Saskatchewan charge only small registration fees, so they are not part of this tool. Plan the rest of your closing costs too, such as legal fees. The [down payment calculator](/down-payment-calculator) and the [Canadian mortgage calculator](/canadian-mortgage-calculator) help with the rest of the budget, and the [mortgage stress test](/canada-mortgage-stress-test-calculator) shows what you can borrow.'
				]
			},
			{
				heading: 'Ontario and Toronto rates',
				paragraphs: [
					`Ontario uses brackets. You pay a low rate on the first part of the price and more on each part above it. For one or two single-family homes, the top rate is ${pct(ON_LTT_BRACKETS[ON_LTT_BRACKETS.length - 1].rate * 100, 2)} on the part above ${cad(ON_LTT_BRACKETS[ON_LTT_BRACKETS.length - 2].upTo)}. Other property uses ${pct(ON_LTT_BRACKETS_OTHER[ON_LTT_BRACKETS_OTHER.length - 1].rate * 100, 2)} on everything above ${cad(ON_LTT_BRACKETS_OTHER[ON_LTT_BRACKETS_OTHER.length - 2].upTo)}.`,
					`The City of Toronto adds its own municipal tax. It uses the same rates up to ${cad(TORONTO_MLTT_BRACKETS[TORONTO_FIRST_HIGH - 1].upTo)}. For homes up to that price, a Toronto buyer pays about double a buyer elsewhere in Ontario. Above it, the City lists higher rates from April 1, 2026:`
				],
				table: { caption: 'Ontario rates, one or two single-family residences', columns: ['Part of the price', 'Rate'], rows: bandRows(ON_LTT_BRACKETS) },
				list: torontoHighRates
			},
			{
				heading: 'British Columbia property transfer tax',
				paragraphs: [
					`British Columbia charges ${pct(BC_PTT_BRACKETS[0].rate * 100, 0)} on the first ${cad(BC_PTT_BRACKETS[0].upTo)}, ${pct(BC_PTT_BRACKETS[1].rate * 100, 0)} up to ${cad(BC_PTT_BRACKETS[1].upTo)} and ${pct(BC_PTT_BRACKETS[2].rate * 100, 0)} above that. It adds a further ${pct(BC_PTT_EXTRA_RATE * 100, 0)} on the residential part above ${cad(BC_PTT_EXTRA_THRESHOLD)}.`,
					`First-time buyers can get a full exemption on homes up to ${cad(BC_FTB_FULL_UP_TO)}. Above that, the exemption is ${cad(BC_FTB_MAX_EXEMPTION)} up to ${cad(BC_FTB_FLAT_UP_TO)}, and then it fades to nil at ${cad(BC_FTB_NONE_FROM)}. A newly built home gets a full exemption below ${cad(BC_NEW_BUILD_FULL_UP_TO)}, fading to nil at ${cad(BC_NEW_BUILD_NONE_FROM)}. The two exemptions cannot be added together, so the calculator uses the larger one.`
				]
			},
			{
				heading: 'Other provinces',
				paragraphs: [
					'The other provinces work in different ways, from small flat rates to fees by value. The table sums up what the calculator uses.'
				],
				table: { caption: `Other provinces, ${CA_TAX_YEAR}`, columns: ['Province', 'How the tax or fee works'], rows: otherRows() }
			},
			{
				heading: 'First-time buyer rebates',
				paragraphs: [
					`In Ontario, first-time buyers get a refund of up to ${cad(ON_FTB_MAX)}. That covers the whole tax on a home up to about ${cad(Math.round(priceForTax(ON_LTT_BRACKETS, ON_FTB_MAX)))}. In Toronto, the municipal rebate is up to ${cad(TORONTO_FTB_MAX)}, which covers the whole municipal tax on a ${cad(priceForTax(TORONTO_MLTT_BRACKETS, TORONTO_FTB_MAX))} home.`,
					'However, the rules for who qualifies are strict, and you must claim the refund. For example, you generally need to live in the home. So ask your lawyer or notary to confirm that you qualify.',
					'Because the calculator takes the rebate off the total, the result shows what you pay after it.'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					'First, the Prince Edward Island first-time buyer exemption is not included. Neither are extra taxes for some buyers, such as non-residents, and special cases like transfers between family members.',
					'Next, municipal taxes in Quebec and Nova Scotia can differ from place to place, so you may need to enter the rate for your town. Finally, your lawyer or notary works out the exact amount at closing.'
				]
			}
		],
		formulas: [
			{
				title: 'Graduated tax',
				expression: 'Tax = Σ (rate × part of the price in each band) − rebates',
				variables: [
					{ symbol: 'Ontario', meaning: `${bandSummary(ON_LTT_BRACKETS)} (one or two single-family residences)` },
					{ symbol: 'Toronto', meaning: `Same bands to ${cad(TORONTO_MLTT_BRACKETS[TORONTO_FIRST_HIGH - 1].upTo)}, then ${torontoHighRates.join(', ')}` },
					{ symbol: 'B.C.', meaning: `${bandSummary(BC_PTT_BRACKETS)}, plus ${pct(BC_PTT_EXTRA_RATE * 100, 0)} on the residential part above ${cad(BC_PTT_EXTRA_THRESHOLD)}` },
					{ symbol: 'Rebates', meaning: `Ontario up to ${cad(ON_FTB_MAX)}, Toronto up to ${cad(TORONTO_FTB_MAX)}; B.C. first-time exemption up to ${cad(BC_FTB_MAX_EXEMPTION)} (nil from ${cad(BC_FTB_NONE_FROM)})` }
				]
			}
		],
		example: {
			title: 'A $800,000 home in Ontario',
			steps: [
				'Bands: 0.5% × $55,000 = $275; 1% × $195,000 = $1,950; 1.5% × $150,000 = $2,250. These add to $4,475.',
				'Above $400,000: 2% × ($800,000 − $400,000) = $8,000.',
				'Total provincial tax = $4,475 + $8,000 = $12,475.'
			],
			result: 'A $800,000 Ontario home pays $12,475.00 of land transfer tax. In Toronto, add the same amount of municipal tax.'
		},
		faq: [
			{
				q: 'How much is land transfer tax on an $800,000 home in Ontario?',
				a: 'It is $12,475 for one or two single-family residences. In the City of Toronto, the municipal tax is the same amount, so the total is $24,950. A first-time buyer in Toronto can take off up to $4,000 plus up to $4,475.'
			},
			{
				q: 'Does Toronto charge a second land transfer tax?',
				a: `Yes. Toronto adds a municipal land transfer tax on top of Ontario's. Since April 1, 2026, the rates above ${cad(TORONTO_MLTT_BRACKETS[TORONTO_FIRST_HIGH - 1].upTo)} are higher, rising from ${pct(TORONTO_MLTT_BRACKETS[TORONTO_FIRST_HIGH].rate * 100, 2)} to ${pct(TORONTO_MLTT_BRACKETS[TORONTO_MLTT_BRACKETS.length - 1].rate * 100, 2)}.`
			},
			{
				q: 'Why are Alberta and Saskatchewan missing?',
				a: 'They have no land transfer tax, only small land title registration fees based on value, so they are not part of this tool.'
			},
			{
				q: 'How much can a first-time buyer save?',
				a: `Ontario refunds up to ${cad(ON_FTB_MAX)} and Toronto up to ${cad(TORONTO_FTB_MAX)}. In B.C., the exemption is up to ${cad(BC_FTB_MAX_EXEMPTION)} for homes up to ${cad(BC_FTB_FLAT_UP_TO)}, and it fades to nil at ${cad(BC_FTB_NONE_FROM)}.`
			},
			{
				q: 'Is Quebec welcome tax included?',
				a: `Yes. The calculator uses the provincial brackets and lets you enter your municipality's rate above ${cad(QC_HIGH_VALUE_THRESHOLD)}, from ${pct(QC_WELCOME_TAX_RATES.third * 100, 1)} up to ${pct(QC_MUNICIPAL_MAX_RATE * 100, 0)}. Montréal has its own schedule, so check it with your notary.`
			}
		],
		sources: LTT_SOURCES,
		disclaimer: 'Estimate only. Your lawyer or notary calculates the exact amount at closing, including eligibility and adjustments.'
	}
});
