import { defineCalculator, type InputValues } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import { GST_COUNCIL_SOURCE, GST_DEFAULT_RATE, GST_RATES_EFFECTIVE, GST_SLABS, GST_SOURCE } from '../data/in-gst';
import meta from './gst-calculator.meta';

const inr = (n: number) => moneyIn('INR', n, true);

export interface GstSplit {
	netP: number;
	grossP: number;
	gstP: number;
	/** Intra-state halves, in paise. CGST gets the extra paisa on odd amounts. */
	cgstP: number;
	sgstP: number;
}

/** All money is worked in whole paise so that net + GST = gross exactly. */
export function gstSplit(amount: number, ratePct: number, mode: 'add' | 'remove'): GstSplit {
	const p = Math.round(amount * 100);
	let netP: number;
	let grossP: number;
	let gstP: number;
	if (mode === 'add') {
		netP = p;
		gstP = Math.round((netP * ratePct) / 100);
		grossP = netP + gstP;
	} else {
		grossP = p;
		netP = Math.round(grossP / (1 + ratePct / 100));
		gstP = grossP - netP;
	}
	const cgstP = Math.round(gstP / 2);
	return { netP, grossP, gstP, cgstP, sgstP: gstP - cgstP };
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'amount', label: 'Amount', type: 'number', default: 10000, min: 0, max: 100_000_000_000, step: 100, prefix: '$' },
		{
			id: 'rate',
			label: 'GST rate',
			type: 'select',
			display: 'menu',
			default: String(GST_DEFAULT_RATE),
			options: GST_SLABS.map((s) => ({ label: s.label, value: String(s.rate) })),
			help: 'Slabs in force since ' + GST_RATES_EFFECTIVE + '. Tobacco (28% plus cess) is not included.'
		},
		{
			id: 'mode',
			label: 'Amount is',
			type: 'select',
			display: 'segmented',
			default: 'add',
			options: [
				{ label: 'Before GST (add GST)', value: 'add' },
				{ label: 'With GST (remove GST)', value: 'remove' }
			]
		},
		{
			id: 'supply',
			label: 'Sale is',
			type: 'select',
			display: 'segmented',
			default: 'intra',
			options: [
				{ label: 'Within the state', value: 'intra' },
				{ label: 'Between states', value: 'inter' }
			]
		}
	],
	calculate(v: InputValues) {
		const amount = Number(v.amount);
		const rate = Number(v.rate);
		const mode = String(v.mode);
		const supply = String(v.supply);
		const fail = (summary: string) => ({ primaryResult: DASH, primaryLabel: 'GST amount', summary });
		if (!(amount >= 0 && amount <= 100_000_000_000)) return fail('Enter the amount.');
		if (!GST_SLABS.some((s) => s.rate === rate)) return fail('Pick a GST rate.');
		if (mode !== 'add' && mode !== 'remove') return fail('Pick whether to add or remove GST.');
		if (supply !== 'intra' && supply !== 'inter') return fail('Pick within the state or between states.');

		const s = gstSplit(amount, rate, mode);
		const m = (paise: number) => money(paise / 100);
		const half = pct(rate / 2, 3);
		return {
			primaryResult: m(s.gstP),
			primaryLabel: `GST at ${pct(rate, 2)}`,
			summary:
				mode === 'add'
					? `${m(s.netP)} plus ${pct(rate, 2)} GST is ${m(s.grossP)}.`
					: `${m(s.grossP)} includes ${pct(rate, 2)} GST, so the price before GST is ${m(s.netP)}.`,
			secondaryMetrics: [
				{ label: 'Price before GST', value: m(s.netP) },
				{ label: 'Price with GST', value: m(s.grossP) },
				supply === 'intra' ? { label: `CGST (${half})`, value: m(s.cgstP) } : { label: `IGST (${pct(rate, 2)})`, value: m(s.gstP) },
				supply === 'intra' ? { label: `SGST / UTGST (${half})`, value: m(s.sgstP) } : { label: 'CGST + SGST', value: money(0) }
			]
		};
	},
	content: {
		intro: `Use this GST calculator to add GST to a price, or take it out of a GST-inclusive price, using India's slabs in force since ${GST_RATES_EFFECTIVE}. It splits the tax into CGST and SGST for a sale within a state, or IGST for a sale between states.`,
		howTo: [
			'Enter the amount and pick the GST rate that applies to the goods or service.',
			'Choose "add GST" if the amount is before tax, or "remove GST" if it already includes GST.',
			'Choose within the state (CGST + SGST) or between states (IGST), then read the GST, net and gross amounts.'
		],
		about: [
			{
				heading: 'What is GST?',
				paragraphs: [
					'GST (Goods and Services Tax) is the tax on most goods and services in India. It replaced many older taxes with one system. You pay it as part of the price when you buy, and the seller passes it to the government.',
					'Registered businesses can usually claim credit for the GST they pay on business purchases. This is called input tax credit, and it means GST is charged once on the value added at each step, not again and again.'
				]
			},
			{
				heading: `GST rate slabs since ${GST_RATES_EFFECTIVE}`,
				paragraphs: [
					`After the 56th GST Council meeting, the 12% and 28% slabs were removed. The main rates are now 0%, 5%, 18% and 40%. There are also special rates for gold, silver and diamonds. Always check the rate for your item’s HSN or SAC code.`,
					'The table shows what each slab means for a price of ₹10,000 before GST.'
				],
				table: {
					caption: 'GST on ₹10,000 at each rate',
					columns: ['GST rate', 'GST amount', 'Price with GST'],
					rows: GST_SLABS.map((s) => [s.label, inr((10_000 * s.rate) / 100), inr(10_000 + (10_000 * s.rate) / 100)])
				}
			},
			{
				heading: 'CGST, SGST and IGST',
				paragraphs: [
					'The type of GST depends on where the sale happens. When the seller and the buyer are in the same state, the tax is split equally into CGST (for the centre) and SGST (for the state, or UTGST in a union territory). At 18%, that is 9% CGST and 9% SGST.',
					'When the sale is between two states, or on an import, the whole tax is charged as IGST. The total amount is the same either way. Only the split changes.',
					'For example, on ₹10,000 at 18%, the GST is ₹1,800. Within a state, that is ₹900 CGST and ₹900 SGST. Between states, it is ₹1,800 IGST.'
				]
			},
			{
				heading: 'How to remove GST from a price',
				paragraphs: [
					'Many people make one common mistake. They take 18% off the total price. That gives the wrong answer, because the 18% was added on the price before GST, not on the total.',
					'For example, a bill of ₹11,800 includes 18% GST. The correct price before GST is ₹11,800 ÷ 1.18 = ₹10,000, and the GST is ₹1,800. If you took 18% off ₹11,800, you would get ₹9,676, which is wrong.',
					'The calculator uses the right method. Choose "remove GST" and enter the total.'
				]
			},
			{
				heading: 'Tips for using GST figures',
				paragraphs: ['A few habits avoid errors:'],
				list: [
					'**Check the rate for your item.** Rates depend on the HSN or SAC code. The CBIC rate finder gives the official rate.',
					'**Match the amount type.** Pick "before GST" for a quote and "with GST" for a bill.',
					'**Mind rounding.** The calculator works in whole paise, so net plus GST always equals the total.',
					'**Compare with other taxes.** Many countries use VAT. See the [VAT calculator](/vat-calculator) or the [sales tax calculator](/sales-tax-calculator).',
					'**Work out discounts first.** Use the [discount calculator](/discount-calculator) if a sale price applies, then add GST.',
					'**Think about income tax too.** GST is separate from income tax. See your own tax in the [India income tax calculator](/india-income-tax-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Add GST',
				expression: 'GST = Net × rate ÷ 100;   Gross = Net + GST',
				variables: [
					{ symbol: 'Net', meaning: 'price before GST' },
					{ symbol: 'rate', meaning: 'GST rate in percent' }
				]
			},
			{
				title: 'Remove GST',
				expression: 'Net = Gross ÷ (1 + rate ÷ 100);   GST = Gross − Net',
				variables: [{ symbol: 'Gross', meaning: 'price including GST' }]
			},
			{
				title: 'Split',
				expression: 'Within a state: CGST = SGST = GST ÷ 2.   Between states: IGST = GST',
				variables: [{ symbol: 'Rounding', meaning: 'worked in whole paise; on an odd paisa CGST gets the extra one' }]
			}
		],
		example: {
			title: '₹10,000 before GST at 18%, within the state',
			steps: ['GST = 10,000 × 18 ÷ 100 = ₹1,800', 'Gross = ₹10,000 + ₹1,800 = ₹11,800', 'CGST 9% = ₹900 and SGST 9% = ₹900'],
			result: 'GST ₹1,800; price with GST ₹11,800.'
		},
		faq: [
			{
				q: 'How do I calculate GST on a price?',
				a: 'Multiply the price before GST by the rate and divide by 100. For ₹10,000 at 18%, the GST is ₹1,800 and the total is ₹11,800.'
			},
			{
				q: 'What are the GST rates now?',
				a: `Since ${GST_RATES_EFFECTIVE} the main slabs are 0%, 5%, 18% and 40%; the old 12% and 28% slabs were removed. Special rates remain: 3% on gold and silver, 1.5% on cut and polished diamonds and 0.25% on rough diamonds and precious stones. Always check the rate for your item's HSN or SAC code.`
			},
			{
				q: 'How do I find the price before GST?',
				a: 'Divide the GST-inclusive price by 1 plus the rate. At 18%, divide by 1.18. Do not subtract 18% of the total, which gives the wrong answer.'
			},
			{
				q: 'When is IGST charged instead of CGST and SGST?',
				a: 'IGST applies when the supplier and the place of supply are in different states (and on imports). Within one state the same tax is split equally into CGST and SGST (or UTGST in a union territory).'
			},
			{
				q: 'Does this calculator include tobacco or cess?',
				a: 'No. Tobacco products still sit at 28% plus compensation cess during a transition, and they are not offered here. Cess, TCS and reverse-charge rules are also not included.'
			}
		],
		sources: [GST_SOURCE, GST_COUNCIL_SOURCE],
		disclaimer:
			'Estimates only. This tool does not include compensation cess, TCS or reverse-charge rules. Confirm the rate for your item on the CBIC rate finder or with a tax professional.'
	}
});
