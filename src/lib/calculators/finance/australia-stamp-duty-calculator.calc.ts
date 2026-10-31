import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './australia-stamp-duty-calculator.meta';
import {
	NSW_BANDS,
	NSW_FHB_CONCESSION_TO,
	NSW_FHB_EXEMPT_TO,
	NSW_FOREIGN,
	NT_FHOD_LIMIT,
	NT_FLAT,
	NT_FORMULA_TO,
	NT_LINEAR,
	NT_QUAD,
	NT_FHOD_MAX,
	QLD_BANDS,
	QLD_FHB_LIMIT,
	QLD_FHB_NIL_TO,
	QLD_FOREIGN,
	QLD_HOME_BANDS,
	SA_BANDS,
	SOURCES,
	STAMP_DUTY_AS_AT,
	TAS_BANDS,
	TAS_FOREIGN,
	VIC_FHB_CONCESSION_TO,
	VIC_FHB_EXEMPT_TO,
	VIC_FOREIGN,
	VIC_PPR_BANDS,
	VIC_PPR_MAX,
	WA_BANDS,
	WA_FHB_EXEMPT_TO,
	WA_FHB_LIMIT,
	WA_FHB_RATE,
	WA_FOREIGN,
	bandDuty,
	ntDuty,
	nswDuty,
	vicDuty
} from '../data/au-stamp-duty';

export const STATES: Record<string, string> = {
	nsw: 'New South Wales',
	vic: 'Victoria',
	qld: 'Queensland',
	wa: 'Western Australia',
	sa: 'South Australia',
	tas: 'Tasmania',
	nt: 'Northern Territory'
};

const FOREIGN_RATE: Record<string, number> = { nsw: NSW_FOREIGN, vic: VIC_FOREIGN, qld: QLD_FOREIGN, wa: WA_FOREIGN, tas: TAS_FOREIGN, sa: 0, nt: 0 };

export function generalDuty(state: string, price: number): number {
	switch (state) {
		case 'nsw':
			return nswDuty(price);
		case 'vic':
			return vicDuty(price);
		case 'qld':
			return bandDuty(price, QLD_BANDS, true);
		case 'wa':
			return bandDuty(price, WA_BANDS, true);
		case 'sa':
			return bandDuty(price, SA_BANDS, true);
		case 'tas':
			return bandDuty(price, TAS_BANDS);
		default:
			return ntDuty(price);
	}
}

export interface DutyResult {
	general: number;
	duty: number;
	surcharge: number;
	rule: string;
	/** Set when the case is outside what this tool can calculate. */
	unsupported?: string;
}

export function stampDuty(state: string, price: number, buyer: string, firstHome: boolean, home: string, foreign: boolean): DutyResult {
	const general = generalDuty(state, price);
	const owner = buyer === 'owner';
	// First-home concessions need an Australian citizen or permanent resident, except Western Australia's rate (WA fact sheet).
	const fhb = owner && firstHome && (!foreign || state === 'wa');
	let duty = general;
	let rule = 'General rates';
	let unsupported: string | undefined;

	switch (state) {
		case 'nsw':
			if (fhb) {
				if (price <= NSW_FHB_EXEMPT_TO) {
					duty = 0;
					rule = 'First Home Buyers Assistance Scheme: no duty';
				} else if (price < NSW_FHB_CONCESSION_TO) {
					unsupported = 'In NSW a first home buyer pays a reduced rate on homes over $800,000 and under $1,000,000. Revenue NSW does not publish the formula on its scheme page, so use its First Home Buyers Assistance calculator for this price.';
				}
			}
			break;
		case 'vic':
			if (fhb && price <= VIC_FHB_EXEMPT_TO) {
				duty = 0;
				rule = 'First home buyer exemption: no duty';
			} else if (fhb && price <= VIC_FHB_CONCESSION_TO) {
				duty = Math.floor((general * (price - VIC_FHB_EXEMPT_TO)) / (VIC_FHB_CONCESSION_TO - VIC_FHB_EXEMPT_TO));
				rule = 'First home buyer concession';
			} else if (owner && price <= VIC_PPR_MAX) {
				duty = bandDuty(price, VIC_PPR_BANDS);
				rule = 'Principal place of residence concession rates';
			}
			break;
		case 'qld':
			if (owner && !foreign) {
				if (fhb && home === 'new') {
					duty = 0;
					rule = 'First home (new home) concession: no duty';
				} else if (fhb && price <= QLD_FHB_NIL_TO) {
					duty = 0;
					rule = 'First home concession: no duty';
				} else if (fhb && price < QLD_FHB_LIMIT) {
					unsupported = 'In Queensland the first home concession phases out between $700,000 and $800,000. The Queensland Revenue Office does not publish the formula on its page, so use its calculator for this price.';
				} else {
					duty = bandDuty(price, QLD_HOME_BANDS, true);
					rule = 'Home concession rates';
				}
			} else if (owner && foreign) {
				rule = 'General rates (home concessions are for citizens and permanent residents)';
			}
			break;
		case 'wa':
			if (fhb && price <= WA_FHB_EXEMPT_TO) {
				duty = 0;
				rule = 'First home owner rate: no duty';
			} else if (fhb && price <= WA_FHB_LIMIT) {
				duty = (price - WA_FHB_EXEMPT_TO) * WA_FHB_RATE;
				rule = 'First home owner rate: $16.15 per $100 over $600,000';
			}
			break;
		case 'sa':
			if (fhb && home === 'new') {
				duty = 0;
				rule = 'First home buyer relief on a new home: no duty';
			}
			break;
		case 'tas':
			if (fhb) unsupported = 'The Tasmanian first home buyer duty relief for established homes is listed by the State Revenue Office only to 30 June 2026, so this tool cannot confirm what applies now. Check the State Revenue Office.';
			break;
		default:
			if (fhb && home === 'established' && price <= NT_FHOD_LIMIT) {
				duty = Math.max(0, Math.floor((general - NT_FHOD_MAX) * 20 + 1e-9) / 20);
				rule = 'First Home Owner Discount (up to $23,928.60)';
			}
	}
	const surcharge = foreign ? price * FOREIGN_RATE[state] : 0;
	return { general, duty, surcharge, rule, unsupported };
}

/** Content is written once at build time, so format dollars explicitly (A$800,000). */
const aud = (n: number) => moneyIn('AUD', n, true);
function compareRows(): string[][] {
	const price = 750_000;
	return Object.entries(STATES).map(([code, name]) => {
		const investor = stampDuty(code, price, 'investor', false, 'established', false).duty;
		const owner = stampDuty(code, price, 'owner', false, 'established', false).duty;
		return [name, aud(investor), aud(owner), pct((owner / price) * 100, 2)];
	});
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'state',
			label: 'State or territory',
			type: 'select',
			display: 'menu',
			default: 'nsw',
			options: Object.entries(STATES).map(([value, label]) => ({ label, value }))
		},
		{ id: 'price', label: 'Property price', type: 'number', default: 750000, min: 0, max: 100_000_000, step: 5000, prefix: '$', help: 'The price paid, or market value if higher.' },
		{
			id: 'buyer',
			label: 'Buying as',
			type: 'select',
			display: 'segmented',
			default: 'owner',
			options: [
				{ label: 'Owner-occupier', value: 'owner' },
				{ label: 'Investor', value: 'investor' }
			]
		},
		{ id: 'first', label: 'I am a first home buyer', type: 'toggle', default: false, visibleWhen: (v) => v.buyer === 'owner' },
		{
			id: 'home',
			label: 'Home type',
			type: 'select',
			display: 'segmented',
			default: 'established',
			options: [
				{ label: 'Established', value: 'established' },
				{ label: 'Newly built', value: 'new' }
			],
			visibleWhen: (v) => v.buyer === 'owner' && v.first === true,
			help: 'Queensland, South Australia and the NT treat new and established homes differently.'
		},
		{ id: 'foreign', label: 'Foreign purchaser (not a citizen or permanent resident)', type: 'toggle', default: false }
	],
	calculate(v): CalculationResult {
		const state = String(v.state);
		const price = Number(v.price);
		if (!STATES[state] || !(price > 0) || !Number.isFinite(price)) {
			return { primaryResult: DASH, primaryLabel: 'Stamp duty', summary: 'Choose a state and enter a property price.' };
		}
		const buyer = String(v.buyer);
		const r = stampDuty(state, price, buyer, v.first === true, String(v.home), v.foreign === true);
		if (r.unsupported) {
			return { primaryResult: DASH, primaryLabel: `Stamp duty in ${STATES[state]}`, summary: r.unsupported };
		}
		const total = r.duty + r.surcharge;
		const saved = r.general - r.duty;
		const noSurchargeNote =
			v.foreign === true && FOREIGN_RATE[state] === 0 ? ` No foreign purchaser stamp duty surcharge is listed by the ${state === 'sa' ? 'South Australian' : 'Northern Territory'} revenue office, so none is added.` : '';
		return {
			primaryResult: money(total, true),
			primaryLabel: r.surcharge > 0 ? `Duty plus foreign surcharge in ${STATES[state]}` : `Stamp duty in ${STATES[state]}`,
			summary: total > 0 ? `${r.rule}. About ${pct(price > 0 ? (total / price) * 100 : 0, 2)} of the price.${noSurchargeNote}` : `${r.rule}. No duty is payable.${noSurchargeNote}`,
			secondaryMetrics: [
				{ label: 'Transfer duty', value: money(r.duty, true) },
				{ label: 'Foreign purchaser surcharge', value: money(r.surcharge, true) },
				{ label: 'Duty at general rates', value: money(r.general, true) },
				{ label: 'Saved by concession', value: money(saved, true) },
				{ label: 'Share of price', value: pct((total / price) * 100, 2) }
			]
		};
	},
	content: {
		intro: `Estimate stamp duty (transfer duty) on a property in NSW, Victoria, Queensland, Western Australia, South Australia, Tasmania or the Northern Territory, using rates checked on ${STAMP_DUTY_AS_AT}. This Australia stamp duty calculator covers owner-occupier and first home buyer concessions where they can be verified, and foreign purchaser surcharges. The ACT is not included yet.`,
		howTo: [
			'Pick the state or territory and enter the property price.',
			'Choose owner-occupier or investor. For owner-occupiers, tick first home buyer and say whether the home is new or established.',
			'Tick foreign purchaser if you are not an Australian citizen or permanent resident.',
			'Read the total duty, the duty at general rates and what the concession saves you.'
		],
		about: [
			{
				heading: 'What is stamp duty?',
				paragraphs: [
					'Stamp duty is a tax that a state or territory charges when a property changes hands. Most states now call it transfer duty. You pay it once, usually at settlement, and it is based on the price or the market value if that is higher.',
					'Each state sets its own rates, so the same price can cost very different amounts depending on where you buy. Concessions can cut the bill a lot for owner-occupiers and first home buyers.',
					'Duty is only one buying cost. Legal fees, registration fees and mortgage costs come on top, and this tool does not include them. Work out what you can borrow with the [borrowing power calculator](/borrowing-power-calculator), then test repayments in the [mortgage calculator](/mortgage-calculator). For the deposit, try the [down payment calculator](/down-payment-calculator).'
				]
			},
			{
				heading: 'How much duty does the same price cost?',
				paragraphs: [
					`The table compares a ${aud(750_000)} established home across the seven states and territories. The first column shows what an investor pays at general rates. The second shows an owner-occupier who is not a first home buyer.`,
					'Queensland stands out, because its home concession cuts the bill for people who live in the property. Victoria also has a concession for owner-occupiers, but it applies only to homes up to a lower price.'
				],
				table: { caption: `Duty on a ${aud(750_000)} established home`, columns: ['State or territory', 'Investor', 'Owner-occupier', 'Share of price (owner)'], rows: compareRows() }
			},
			{
				heading: 'First home buyer concessions',
				paragraphs: [
					'First home buyers can pay much less, or nothing, in most states. The rules differ in price limits and in whether the home must be new. You also need to meet other tests, such as living in the home for a set time.',
					'The tool includes the concessions below. Where a revenue office does not publish the formula for a price band, the calculator says so instead of guessing.'
				],
				list: [
					`**NSW:** no duty up to ${aud(NSW_FHB_EXEMPT_TO)}. A reduced rate applies up to ${aud(NSW_FHB_CONCESSION_TO)}, which the tool does not work out.`,
					`**Victoria:** no duty up to ${aud(VIC_FHB_EXEMPT_TO)}, then a sliding concession up to ${aud(VIC_FHB_CONCESSION_TO)}.`,
					`**Queensland:** no duty on a new home with no price cap. For an established home, no duty up to ${aud(QLD_FHB_NIL_TO)}, phasing out before ${aud(QLD_FHB_LIMIT)}. The tool does not work out the phase-out.`,
					`**Western Australia:** no duty up to ${aud(WA_FHB_EXEMPT_TO)}, then a reduced rate on the part above it, up to ${aud(WA_FHB_LIMIT)}.`,
					'**South Australia:** relief on new homes only.',
					`**Northern Territory:** a First Home Owner Discount of up to ${moneyIn('AUD', NT_FHOD_MAX)} on established homes valued at ${aud(NT_FHOD_LIMIT)} or less.`,
					'**Tasmania:** the tool does not apply first home relief, because the State Revenue Office lists it only to 30 June 2026.'
				]
			},
			{
				heading: 'Foreign purchaser surcharges',
				paragraphs: [
					`Foreign purchasers pay an extra surcharge on residential property in some states. The tool adds it to the duty: NSW ${pct(NSW_FOREIGN * 100, 0)}, Victoria ${pct(VIC_FOREIGN * 100, 0)}, Queensland ${pct(QLD_FOREIGN * 100, 0)}, Western Australia ${pct(WA_FOREIGN * 100, 0)} and Tasmania ${pct(TAS_FOREIGN * 100, 0)} of the price.`,
					`For example, a foreign purchaser buying a ${aud(750_000)} home in NSW pays ${aud(750_000 * NSW_FOREIGN)} of surcharge on top of ${aud(nswDuty(750_000))} of duty. South Australia and the Northern Territory list no such surcharge, so the tool adds none.`,
					'Foreign purchasers usually cannot claim first home concessions. Western Australia is the exception for its first home owner rate.'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					`The ACT is not included yet, because its 2026-27 rate table was not available to check. Some first home bands are also missing: NSW between ${aud(NSW_FHB_EXEMPT_TO)} and ${aud(NSW_FHB_CONCESSION_TO)}, Queensland between ${aud(QLD_FHB_NIL_TO)} and ${aud(QLD_FHB_LIMIT)}, and Tasmanian relief. In those cases, the tool tells you to use the state calculator.`,
					'It also leaves out pensioner and senior concessions, off-the-plan and vacant land rules, other Northern Territory rebates, and registration and mortgage fees. Check with your state revenue office or conveyancer before you rely on a figure.'
				]
			}
		],
		formulas: [
			{
				title: 'Transfer duty',
				expression: 'Duty = base amount for the band + rate × (value − band start)',
				variables: [
					{ symbol: 'NSW example', meaning: `${aud(NSW_BANDS[4].from + 1)}–${aud(NSW_BANDS[5].from)}: ${aud(NSW_BANDS[4].base)} + ${pct(NSW_BANDS[4].rate * 100, 1)} of the value over ${aud(NSW_BANDS[4].from)}` },
					{ symbol: 'NT', meaning: `up to ${aud(NT_FORMULA_TO)}: ${NT_QUAD} × V² + ${NT_LINEAR} × V (V in thousands); above that ${pct(NT_FLAT[0].rate * 100, 2)} of the whole value` },
					{ symbol: 'Surcharge', meaning: `NSW ${pct(NSW_FOREIGN * 100, 0)}, VIC ${pct(VIC_FOREIGN * 100, 0)}, QLD ${pct(QLD_FOREIGN * 100, 0)}, WA ${pct(WA_FOREIGN * 100, 0)}, TAS ${pct(TAS_FOREIGN * 100, 0)} of the price for foreign purchasers` }
				]
			}
		],
		example: {
			title: 'A $450,000 property in NSW',
			steps: ['Band: $387,001 to $1,290,000, so $11,602 plus 4.5% of the amount over $387,000', '$11,602 + $63,000 × 0.045 = $11,602 + $2,835 = $14,437', 'This matches the worked example on the Revenue NSW website'],
			result: '$14,437'
		},
		faq: [
			{
				q: 'How is stamp duty calculated in Australia?',
				a: 'Each state has a table of bands. You pay a set amount for the band your price falls in, plus a rate on the part above the start of that band. Concessions then reduce the result for some buyers.'
			},
			{
				q: 'How much is stamp duty on a $750,000 home in NSW?',
				a: `At general rates, it is ${aud(nswDuty(750_000))}, about ${pct((nswDuty(750_000) / 750_000) * 100, 2)} of the price. A first home buyer pays nothing up to ${aud(NSW_FHB_EXEMPT_TO)}, and the tool does not work out the reduced rate between ${aud(NSW_FHB_EXEMPT_TO)} and ${aud(NSW_FHB_CONCESSION_TO)}.`
			},
			{
				q: 'Why is the ACT missing?',
				a: 'The ACT Revenue Office pages available when this was built did not publish its 2026-27 rate table. The ACT is left out rather than risk a wrong figure.'
			},
			{
				q: 'Which first home concessions are included?',
				a: `The tool covers these states. NSW has no duty to ${aud(NSW_FHB_EXEMPT_TO)}. Victoria has no duty to ${aud(VIC_FHB_EXEMPT_TO)}, sliding to ${aud(VIC_FHB_CONCESSION_TO)}. Queensland has new homes with no cap, and established homes to ${aud(QLD_FHB_NIL_TO)}. Western Australia has no duty to ${aud(WA_FHB_EXEMPT_TO)} and a reduced rate to ${aud(WA_FHB_LIMIT)}. South Australia covers new homes, and the NT has the First Home Owner Discount. Where a state does not publish a formula, the calculator says so instead of guessing.`
			},
			{
				q: 'Do investors pay more stamp duty?',
				a: 'In some states, yes. Queensland and Victoria give lower rates to owner-occupiers, while investors pay general rates. In NSW, the general rates apply to everyone, except for first home buyers who qualify for a concession.'
			},
			{
				q: 'How accurate is it?',
				a: 'It uses the general rates and the concessions listed above. It ignores pensioner and senior concessions, off-the-plan and vacant land rules, other NT rebates, land transfer registration fees and mortgage fees. Eligibility rules, such as living in the home for a set time, still apply.'
			}
		],
		sources: [SOURCES.nsw, SOURCES.nswFhb, SOURCES.vicFhb, SOURCES.vicAfad, SOURCES.qld, SOURCES.qldHome, SOURCES.qldFirst, SOURCES.wa, SOURCES.waFhor, SOURCES.sa, SOURCES.tas, SOURCES.nt],
		disclaimer: 'An estimate only. Rates change, often on 1 July, and concessions have eligibility conditions. Confirm the exact amount with your state revenue office or conveyancer.'
	}
});
