import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './stamp-duty-calculator.meta';
import {
	ADS_RATE,
	ADS_SOURCE,
	LBTT_FTB_NIL_RATE_BAND,
	LBTT_SOURCE,
	LBTT_STANDARD,
	LTT_HIGHER,
	LTT_MAIN,
	LTT_SOURCE,
	SDLT_FTB,
	SDLT_FTB_MAX_PRICE,
	SDLT_HIGHER_RATES_SURCHARGE,
	SDLT_NON_RESIDENT_SURCHARGE,
	SDLT_SOURCE,
	SDLT_STANDARD,
	UK_TAX_YEAR,
	type PriceBand
} from '../data/uk-tax-2026-27';
import { priceBandTax } from '../data/uk-tax-engine';

/** Higher-rates / ADS only apply to purchases of £40,000 or more (GOV.UK, Revenue Scotland, gov.wales). */
const HIGHER_RATES_MIN_PRICE = 40_000;

/** Content is written at build time, so format pounds explicitly. */
const gbp = (n: number) => moneyIn('GBP', n, true);
const gbp2 = (n: number) => moneyIn('GBP', n);
const pc = (r: number) => `${Math.round(r * 1000) / 10}%`;

/** Band table rows: "Up to £125,000", "£125,001 to £250,000", "Over £1,500,000". */
function priceRows(bands: PriceBand[]): string[][] {
	let from = 0;
	return bands.map((b) => {
		const label = from === 0 ? `Up to ${gbp(b.upTo)}` : Number.isFinite(b.upTo) ? `${gbp(from + 1)} to ${gbp(b.upTo)}` : `Over ${gbp(from)}`;
		from = b.upTo;
		return [label, pc(b.rate)];
	});
}
/** One-line version of a band list for the formulas block. */
function bandText(bands: PriceBand[]): string {
	return bands.map((b, i) => (Number.isFinite(b.upTo) ? `${pc(b.rate)} to ${gbp(b.upTo)}` : `${pc(b.rate)} above ${gbp(bands[i - 1].upTo)}`)).join(', ');
}

// Numbers used in the text, worked out from the same bands as the calculator.
const EX_PRICE = 350_000;
const EX_PRICE_ROWS = priceBandTax(EX_PRICE, SDLT_STANDARD).rows;
const EX_TOTAL = priceBandTax(EX_PRICE, SDLT_STANDARD).total;
const COMPARE_PRICE = EX_PRICE;
const lbttFtbBands: PriceBand[] = [{ upTo: LBTT_FTB_NIL_RATE_BAND, rate: 0 }, ...LBTT_STANDARD.slice(1)];
const cmp = {
	sdltMover: priceBandTax(COMPARE_PRICE, SDLT_STANDARD).total,
	sdltFtb: priceBandTax(COMPARE_PRICE, SDLT_FTB).total,
	sdltAdd: priceBandTax(COMPARE_PRICE, SDLT_STANDARD, SDLT_HIGHER_RATES_SURCHARGE).total,
	lbttMover: priceBandTax(COMPARE_PRICE, LBTT_STANDARD).total,
	lbttFtb: priceBandTax(COMPARE_PRICE, lbttFtbBands).total,
	lbttAdd: priceBandTax(COMPARE_PRICE, LBTT_STANDARD).total + COMPARE_PRICE * ADS_RATE,
	lttMover: priceBandTax(COMPARE_PRICE, LTT_MAIN).total,
	lttAdd: priceBandTax(COMPARE_PRICE, LTT_HIGHER).total
};

const range = (from: number, to: number) =>
	to === Infinity ? `Over ${money(from, true)}` : `${money(from, true)} to ${money(to, true)}`;

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'price', label: 'Property price', type: 'number', default: 350000, min: 0, max: 100_000_000, step: 5000, prefix: '$' },
		{
			id: 'nation',
			label: 'Where is the property',
			type: 'select',
			display: 'menu',
			default: 'england',
			options: [
				{ label: 'England or Northern Ireland (SDLT)', value: 'england' },
				{ label: 'Scotland (LBTT)', value: 'scotland' },
				{ label: 'Wales (LTT)', value: 'wales' }
			]
		},
		{
			id: 'buyer',
			label: 'Buyer type',
			type: 'select',
			display: 'menu',
			default: 'mover',
			options: [
				{ label: 'Home mover (replacing your main home)', value: 'mover' },
				{ label: 'First-time buyer', value: 'ftb' },
				{ label: 'Additional property (second home, buy-to-let)', value: 'additional' }
			]
		},
		{
			id: 'nonres',
			label: 'Buyer is not UK resident',
			type: 'toggle',
			default: false,
			help: 'Adds the 2% surcharge. England and Northern Ireland only.',
			visibleWhen: (v) => v.nation === 'england'
		}
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		if (!(price > 0) || !Number.isFinite(price)) {
			return { primaryResult: DASH, primaryLabel: 'Stamp duty', summary: 'Enter a property price above zero.' };
		}
		const nation = String(v.nation);
		const buyer = String(v.buyer);
		const additional = buyer === 'additional' && price >= HIGHER_RATES_MIN_PRICE;
		const ftb = buyer === 'ftb';

		let taxName = 'SDLT';
		let main: { rows: ReturnType<typeof priceBandTax>['rows']; total: number };
		let withoutRelief = 0;
		let surcharge = 0;
		let adsRow = 0;
		let note = '';

		if (nation === 'scotland') {
			taxName = 'LBTT';
			const ftbBands: PriceBand[] = [{ upTo: LBTT_FTB_NIL_RATE_BAND, rate: 0 }, ...LBTT_STANDARD.slice(1).map((b) => ({ ...b }))];
			// Bands above the raised nil-rate band are unchanged (2% starts at £175,000 instead of £145,000).
			const bands = ftb ? ftbBands : LBTT_STANDARD;
			main = priceBandTax(price, bands);
			withoutRelief = priceBandTax(price, LBTT_STANDARD).total;
			if (additional) adsRow = price * ADS_RATE;
			surcharge = adsRow;
		} else if (nation === 'wales') {
			taxName = 'LTT';
			main = priceBandTax(price, additional ? LTT_HIGHER : LTT_MAIN);
			withoutRelief = main.total;
			if (additional) surcharge = main.total - priceBandTax(price, LTT_MAIN).total;
			if (ftb) note = ' Wales has no first-time buyer relief, so the standard rates apply.';
		} else {
			const useFtb = ftb && price <= SDLT_FTB_MAX_PRICE;
			const nonRes = Boolean(v.nonres);
			const extra = (additional ? SDLT_HIGHER_RATES_SURCHARGE : 0) + (nonRes ? SDLT_NON_RESIDENT_SURCHARGE : 0);
			main = priceBandTax(price, useFtb ? SDLT_FTB : SDLT_STANDARD, extra);
			const base = priceBandTax(price, useFtb ? SDLT_FTB : SDLT_STANDARD, 0).total;
			surcharge = main.total - base;
			withoutRelief = priceBandTax(price, SDLT_STANDARD, extra).total;
			if (ftb && !useFtb) note = ` First-time buyer relief is not available above ${money(SDLT_FTB_MAX_PRICE, true)}.`;
		}

		const rows = main.rows.map((r) => ({
			band: range(r.from, r.to),
			rate: pct(r.rate * 100),
			amount: money(r.amount),
			tax: money(r.tax)
		}));
		if (adsRow > 0)
			rows.push({ band: 'Additional Dwelling Supplement', rate: pct(ADS_RATE * 100), amount: money(price), tax: money(adsRow) });

		const total = main.total + adsRow;
		const relief = ftb ? Math.max(0, withoutRelief - main.total) : 0;
		const sumAboveBase = surcharge;
		return {
			primaryResult: money(total),
			primaryLabel: `${taxName} to pay`,
			summary: `${taxName} on ${money(price, true)} is ${money(total)}, an effective rate of ${pct((total / price) * 100)}.${note}`,
			secondaryMetrics: [
				{ label: 'Property price', value: money(price) },
				{ label: 'Effective rate', value: pct((total / price) * 100) },
				{ label: 'Of which surcharges', value: money(sumAboveBase) },
				{ label: 'Saved by first-time buyer relief', value: money(relief) },
				{ label: 'Price plus tax', value: money(price + total) }
			],
			table: {
				title: `${taxName} by band`,
				columns: [
					{ key: 'band', label: 'Band' },
					{ key: 'rate', label: 'Rate', align: 'end' },
					{ key: 'amount', label: 'Taxed', align: 'end' },
					{ key: 'tax', label: 'Tax', align: 'end' }
				],
				rows
			}
		};
	},
	content: {
		intro: `Work out stamp duty on a UK home purchase in ${UK_TAX_YEAR}. It covers England and Northern Ireland, Scotland and Wales. Choose first-time buyer, home mover or additional property to see the tax in each band.`,
		howTo: [
			'Enter the purchase price and choose where the property is: England or Northern Ireland, Scotland or Wales.',
			'Pick your buyer type: home mover, first-time buyer or additional property such as a second home or buy-to-let.',
			'For England and Northern Ireland, tick the box if the buyer is not UK resident.',
			'Read the total tax, the effective rate and the tax in each band.'
		],
		about: [
			{
				heading: 'What is stamp duty?',
				paragraphs: [
					'Stamp duty is a tax the buyer pays when buying a home above a certain price. The name people use is the same everywhere in the UK, but the tax is not. England and Northern Ireland charge Stamp Duty Land Tax (SDLT). Scotland charges Land and Buildings Transaction Tax (LBTT). Wales charges Land Transaction Tax (LTT).',
					'All three work in slices, like income tax. Each slice of the price is taxed at its own rate, so you never pay the top rate on the whole price. The exception is the Scottish Additional Dwelling Supplement, which applies to the whole price.',
					'Your solicitor or conveyancer normally files the return and pays the tax for you. It is a cost on top of your deposit, so add it to your budget. The [UK take-home pay calculator](/uk-take-home-pay-calculator) and the [down payment calculator](/down-payment-calculator) can help you plan. The [UK mortgage calculator](/uk-mortgage-calculator) shows what the loan itself will cost each month.'
				]
			},
			{
				heading: `Stamp duty rates in England and Northern Ireland, ${UK_TAX_YEAR}`,
				paragraphs: [
					`These are the standard residential rates for SDLT. First-time buyers pay ${pc(SDLT_FTB[0].rate)} on the first ${gbp(SDLT_FTB[0].upTo)} and ${pc(SDLT_FTB[1].rate)} on the part from there to ${gbp(SDLT_FTB[1].upTo)}. Above ${gbp(SDLT_FTB_MAX_PRICE)} there is no first-time buyer relief at all, so the standard rates apply to the whole price.`,
					`If you buy an additional property, add ${pc(SDLT_HIGHER_RATES_SURCHARGE)} to every band. If the buyer is not UK resident, add a further ${pc(SDLT_NON_RESIDENT_SURCHARGE)}.`
				],
				table: { caption: `SDLT standard residential rates, ${UK_TAX_YEAR}`, columns: ['Part of the price', 'Rate'], rows: priceRows(SDLT_STANDARD) }
			},
			{
				heading: `Land and Buildings Transaction Tax in Scotland, ${UK_TAX_YEAR}`,
				paragraphs: [
					`Scotland has its own bands. First-time buyers get a higher zero-rate band: it rises from ${gbp(LBTT_STANDARD[0].upTo)} to ${gbp(LBTT_FTB_NIL_RATE_BAND)}. The other bands stay the same.`,
					`If you buy an additional home, you also pay the Additional Dwelling Supplement (ADS) of ${pc(ADS_RATE)}. It applies to the whole price, not just the part above a band.`
				],
				table: { caption: `LBTT residential rates, ${UK_TAX_YEAR}`, columns: ['Part of the price', 'Rate'], rows: priceRows(LBTT_STANDARD) }
			},
			{
				heading: `Land Transaction Tax in Wales, ${UK_TAX_YEAR}`,
				paragraphs: [
					'Wales uses its own main rates, shown below. There is no first-time buyer relief in Wales, so first-time buyers pay the main rates.',
					'Buyers of additional homes pay the higher rates instead of the main rates. These are higher in every band.'
				],
				table: { caption: `LTT main residential rates, ${UK_TAX_YEAR}`, columns: ['Part of the price', 'Rate'], rows: priceRows(LTT_MAIN) },
				list: [
					`**Higher rates for additional homes:** ${LTT_HIGHER.map((b, i) => `${pc(b.rate)} ${Number.isFinite(b.upTo) ? `up to ${gbp(b.upTo)}` : `above ${gbp(LTT_HIGHER[i - 1].upTo)}`}`).join(', ')}.`
				]
			},
			{
				heading: `Same price, different nation: a ${gbp(COMPARE_PRICE)} home`,
				paragraphs: [
					`The same price can give very different bills. The table shows the tax on a ${gbp(COMPARE_PRICE)} home for each buyer type, worked out with the rates above.`,
					'First-time buyer relief makes the biggest difference in England and Northern Ireland. Additional homes cost far more in every nation, and most in Scotland because the supplement covers the whole price.'
				],
				table: {
					caption: `Tax on a ${gbp(COMPARE_PRICE)} home, ${UK_TAX_YEAR}`,
					columns: ['Buyer type', 'England and NI', 'Scotland', 'Wales'],
					rows: [
						['Home mover', gbp(cmp.sdltMover), gbp(cmp.lbttMover), gbp(cmp.lttMover)],
						['First-time buyer', gbp(cmp.sdltFtb), gbp(cmp.lbttFtb), gbp(cmp.lttMover)],
						['Additional property', gbp(cmp.sdltAdd), gbp(cmp.lbttAdd), gbp(cmp.lttAdd)]
					]
				}
			}
		],
		formulas: [
			{
				title: 'England and Northern Ireland (SDLT)',
				expression: `Standard: ${bandText(SDLT_STANDARD)}. First-time buyers: ${bandText(SDLT_FTB)}. Additional property: +${pc(SDLT_HIGHER_RATES_SURCHARGE)} on every band. Non-UK resident: +${pc(SDLT_NON_RESIDENT_SURCHARGE)} on every band.`,
				variables: [{ symbol: 'Tax', meaning: 'the sum, over each band, of (part of the price in that band × rate)' }]
			},
			{
				title: 'Scotland (LBTT)',
				expression: `${bandText(LBTT_STANDARD)}. First-time buyers: zero rate up to ${gbp(LBTT_FTB_NIL_RATE_BAND)}. Additional Dwelling Supplement: ${pc(ADS_RATE)} of the whole price.`,
				variables: []
			},
			{
				title: 'Wales (LTT)',
				expression: `Main: ${bandText(LTT_MAIN)}. Higher rates (additional property): ${bandText(LTT_HIGHER)}.`,
				variables: []
			}
		],
		example: {
			title: `A ${gbp(EX_PRICE)} home in England, home mover`,
			steps: [
				`First ${gbp(SDLT_STANDARD[0].upTo)} at ${pc(SDLT_STANDARD[0].rate)} = ${gbp2(EX_PRICE_ROWS[0].tax)}`,
				`Next ${gbp(SDLT_STANDARD[1].upTo - SDLT_STANDARD[0].upTo)} (to ${gbp(SDLT_STANDARD[1].upTo)}) at ${pc(SDLT_STANDARD[1].rate)} = ${gbp2(EX_PRICE_ROWS[1].tax)}`,
				`Remaining ${gbp(EX_PRICE - SDLT_STANDARD[1].upTo)} at ${pc(SDLT_STANDARD[2].rate)} = ${gbp2(EX_PRICE_ROWS[2].tax)}`
			],
			result: `Stamp duty of ${gbp2(EX_TOTAL)}, an effective rate of ${((EX_TOTAL / EX_PRICE) * 100).toFixed(2)}%.`
		},
		faq: [
			{
				q: 'How much stamp duty do I pay on a house?',
				a: `It depends on the price, the nation and your buyer type. For example, on a ${gbp(COMPARE_PRICE)} home a home mover pays ${gbp(cmp.sdltMover)} in England and ${gbp(cmp.lbttMover)} in Scotland. Enter your own price above to see the exact figure.`
			},
			{
				q: 'Who counts as a first-time buyer?',
				a: `Everyone buying must never have owned a residential property anywhere in the world. In England and Northern Ireland, relief ends above ${gbp(SDLT_FTB_MAX_PRICE)}. Scotland raises the zero-rate band to ${gbp(LBTT_FTB_NIL_RATE_BAND)}. Wales has no equivalent relief.`
			},
			{
				q: 'Do the higher rates apply to every extra property?',
				a: 'They apply when you buy a residential property and will own more than one afterwards, above a minimum price that the calculator applies. Replacing your main home can be treated differently, but this tool does not model that or refunds. Check the official guidance for your case. The [house affordability calculator](/house-affordability-calculator) shows what you can borrow.'
			},
			{
				q: 'Is stamp duty the same in Scotland and Wales?',
				a: 'No. Scotland and Wales run their own taxes with their own bands, reliefs and surcharges. Choose the nation where the property is, and the calculator switches to the right rates.'
			},
			{
				q: 'What is not included?',
				a: 'Companies and trusts, mixed-use and multiple-dwelling purchases, leasehold rent, reliefs and refunds are not included. The rates are those in force on 28 October 2026, so changes announced at that day’s Budget are not reflected.'
			}
		],
		sources: [SDLT_SOURCE, LBTT_SOURCE, ADS_SOURCE, LTT_SOURCE],
		disclaimer: 'Estimate based on standard residential rules. Confirm the exact amount with your solicitor or conveyancer.'
	}
});
