import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';
import meta from './capital-gains-tax-calculator-india.meta';
import {
	CESS_RATE,
	CG_RATES_FROM,
	CG_TAX_YEAR_LABEL,
	CII,
	CII_FIRST_FY_START,
	CII_LATEST_FY_START,
	CII_NOTIFICATION,
	CII_SOURCE,
	DEBT_FUND_DEEMED_STCG_FROM,
	HOLDING_MONTHS_LISTED,
	HOLDING_MONTHS_OTHER,
	INDEXATION_PURCHASED_BEFORE,
	LTCG_EQUITY_EXEMPTION,
	LTCG_INDEXED_RATE_PCT,
	LTCG_RATE_PCT,
	SEC196_SOURCE,
	SEC197_SOURCE,
	SEC198_SOURCE,
	STCG_EQUITY_RATE_PCT
} from '../data/in-cg-fy2026-27';

export type AssetType = 'equity' | 'listed' | 'debtmf' | 'property' | 'gold' | 'unlisted';

/** Parse a strict ISO date (YYYY-MM-DD) into UTC parts; null when invalid. */
export function parseIso(s: unknown): { y: number; m: number; d: number; t: number } | null {
	if (typeof s !== 'string') return null;
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (!m) return null;
	const y = +m[1], mo = +m[2], d = +m[3];
	const t = Date.UTC(y, mo - 1, d);
	const back = new Date(t);
	if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
	return { y, m: mo, d, t };
}

/** Financial year start year for a date: Apr-Dec -> same year, Jan-Mar -> previous year. */
export function fyStart(p: { y: number; m: number }): number {
	return p.m >= 4 ? p.y : p.y - 1;
}

/** Date `months` after `p`, clamped to the last day of the month (31 Aug + 6 months = 28/29 Feb). */
export function addMonths(p: { y: number; m: number; d: number }, months: number): number {
	const idx = p.y * 12 + (p.m - 1) + months;
	const y = Math.floor(idx / 12);
	const m = idx % 12;
	const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
	return Date.UTC(y, m, Math.min(p.d, last));
}

/** Whole months between two dates (day-of-month aware). */
export function wholeMonths(a: { y: number; m: number; d: number }, b: { y: number; m: number; d: number }): number {
	return (b.y - a.y) * 12 + (b.m - a.m) - (b.d < a.d ? 1 : 0);
}

/** CII for the FY a date falls in. Before FY 2001-02 the base year 2001-02 (100) is used; null after the latest notified year. */
export function ciiFor(p: { y: number; m: number }): number | null {
	const fy = Math.max(fyStart(p), CII_FIRST_FY_START);
	return fy > CII_LATEST_FY_START ? null : CII[fy];
}

const inr = (n: number) => moneyIn('INR', n, true);
const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Capital gains tax', summary });

const ASSET_LABEL: Record<AssetType, string> = {
	equity: 'Listed equity shares / equity mutual funds',
	listed: 'Other listed securities',
	debtmf: 'Debt mutual fund (bought on or after 1 Apr 2023)',
	property: 'Property (land or building)',
	gold: 'Gold, jewellery and other assets',
	unlisted: 'Unlisted shares'
};

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'asset',
			label: 'Asset sold',
			type: 'select',
			display: 'menu',
			default: 'equity',
			options: (Object.keys(ASSET_LABEL) as AssetType[]).map((k) => ({ label: ASSET_LABEL[k], value: k })),
			help: 'Other listed securities: listed bonds, gold ETFs and similar units on an Indian exchange.'
		},
		{
			id: 'taxpayer',
			label: 'Taxpayer',
			type: 'select',
			display: 'segmented',
			default: 'res',
			options: [
				{ label: 'Resident individual / HUF', value: 'res' },
				{ label: 'Other', value: 'other' }
			],
			visibleWhen: (v) => v.asset === 'property',
			help: 'Only a resident individual or HUF can choose indexation on property bought before 23 July 2024.'
		},
		{
			id: 'stt',
			label: 'Securities Transaction Tax paid',
			type: 'toggle',
			default: true,
			visibleWhen: (v) => v.asset === 'equity',
			help: 'On a stock exchange sale STT is paid. Without STT the special equity rates do not apply.'
		},
		{ id: 'buyDate', label: 'Purchase date', type: 'date', default: '2023-06-01' },
		{ id: 'sellDate', label: 'Sale date', type: 'date', default: 'today', help: 'Must be on or after 23 July 2024, when the current rates started.' },
		{ id: 'cost', label: 'Purchase cost', type: 'number', default: 500000, min: 0, max: 100_000_000_000, step: 1000, prefix: '$', help: 'Bought before 1 April 2001? Enter the fair market value on that date.' },
		{ id: 'sale', label: 'Sale price', type: 'number', default: 900000, min: 0, max: 100_000_000_000, step: 1000, prefix: '$' },
		{ id: 'expenses', label: 'Selling expenses', type: 'number', default: 0, min: 0, max: 10_000_000_000, step: 100, prefix: '$', help: 'Brokerage, stamp duty on sale and similar costs of transfer.' },
		{
			id: 'improvement',
			label: 'Cost of improvement',
			type: 'number',
			default: 0,
			min: 0,
			max: 10_000_000_000,
			step: 1000,
			prefix: '$',
			visibleWhen: (v) => v.asset === 'property',
			help: 'Money spent on additions or alterations after you bought it.'
		},
		{
			id: 'improveDate',
			label: 'Improvement date',
			type: 'date',
			default: '2023-06-01',
			visibleWhen: (v) => v.asset === 'property' && Number(v.improvement) > 0,
			help: 'Used to index the improvement cost. Several dates? Enter the main one.'
		},
		{
			id: 'used',
			label: 'Other equity LTCG this year',
			type: 'number',
			default: 0,
			min: 0,
			max: 100_000_000_000,
			step: 1000,
			prefix: '$',
			visibleWhen: (v) => v.asset === 'equity',
			help: 'Long-term gains on STT-paid shares or equity funds already booked this tax year. They share the ₹1.25 lakh exemption.'
		},
		{
			id: 'slab',
			label: 'Your slab rate',
			type: 'number',
			default: 30,
			min: 0,
			max: 40,
			step: 0.5,
			suffix: '%',
			help: 'Used only when the gain is taxed at your income-tax slab rate (for example a short-term gain on property, gold or a debt fund).'
		},
		{
			id: 'surcharge',
			label: 'Surcharge (optional)',
			type: 'number',
			default: 0,
			min: 0,
			max: 37,
			step: 1,
			suffix: '%',
			help: 'Enter the surcharge rate that applies to you, if your total income is above ₹50 lakh. Leave 0 otherwise.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const asset = String(v.asset) as AssetType;
		if (!(asset in ASSET_LABEL)) return fail('Choose the asset you sold.');
		const buy = parseIso(v.buyDate);
		const sell = parseIso(v.sellDate);
		if (!buy || !sell) return fail('Enter valid purchase and sale dates.');
		if (sell.t < buy.t) return fail('The sale date must be after the purchase date.');
		if (sell.t < Date.parse(CG_RATES_FROM)) return fail('This calculator uses the rates for sales on or after 23 July 2024. Earlier sales were taxed differently.');

		const cost = Number(v.cost);
		const sale = Number(v.sale);
		const expenses = Number(v.expenses) || 0;
		const slab = Number(v.slab);
		const surchargePct = Number(v.surcharge) || 0;
		const used = Number(v.used) || 0;
		if (![cost, sale, expenses, slab, surchargePct, used].every(Number.isFinite)) return fail('Enter the cost, sale price and slab rate.');
		if (cost < 0 || sale < 0 || expenses < 0 || used < 0 || slab < 0 || slab > 100 || surchargePct < 0 || surchargePct > 100) return fail('Amounts and rates cannot be negative.');

		if (asset === 'debtmf' && buy.t < Date.parse(DEBT_FUND_DEEMED_STCG_FROM)) {
			return fail('This option is for debt fund units bought on or after 1 April 2023. Older units follow different rules.');
		}

		// Holding period and classification
		const months = wholeMonths(buy, sell);
		const threshold = asset === 'equity' || asset === 'listed' ? HOLDING_MONTHS_LISTED : HOLDING_MONTHS_OTHER;
		const longTermByTime = sell.t > addMonths(buy, threshold);
		const isLong = asset === 'debtmf' ? false : longTermByTime;

		const improvement = asset === 'property' ? Number(v.improvement) || 0 : 0;
		const nominalGain = sale - expenses - cost - improvement;

		const rows: { label: string; value: string }[] = [];
		const heldText = `${num(months, 0)} month${months === 1 ? '' : 's'}`;
		const classText =
			asset === 'debtmf'
				? `Short-term by law (${heldText} held)`
				: `${isLong ? 'Long-term' : 'Short-term'} (${heldText} held, limit ${threshold})`;

		let tax = 0;
		let method = '';
		let taxableGain = Math.max(nominalGain, 0);
		let extra: { label: string; value: string }[] = [];
		let note = '';

		if (nominalGain <= 0) {
			method = nominalGain < 0 ? 'No tax: capital loss' : 'No tax: no gain';
			taxableGain = 0;
			if (nominalGain < 0) note = ` A ${isLong ? 'long-term' : 'short-term'} capital loss can be set off against gains of the same kind, and carried forward for eight years if you file on time (not modelled here).`;
		} else if (!isLong) {
			if (asset === 'equity' && v.stt === true) {
				tax = (nominalGain * STCG_EQUITY_RATE_PCT) / 100;
				method = `Short-term, ${pct(STCG_EQUITY_RATE_PCT)} (section 196)`;
			} else {
				tax = (nominalGain * slab) / 100;
				method = `Short-term, your slab rate ${pct(slab)}`;
			}
		} else if (asset === 'equity' && v.stt === true) {
			const exempt = Math.max(0, LTCG_EQUITY_EXEMPTION - used);
			taxableGain = Math.max(0, nominalGain - exempt);
			tax = (taxableGain * LTCG_RATE_PCT) / 100;
			method = `Long-term, ${pct(LTCG_RATE_PCT)} above ₹1.25 lakh (section 198)`;
			extra = [{ label: 'Exempt part of the gain', value: money(nominalGain - taxableGain) }];
		} else {
			// Section 197: 12.5% without indexation. Property bought before 23 July 2024 (resident individual/HUF) may use
			// the lower of that and 20% with indexation.
			const taxA = (nominalGain * LTCG_RATE_PCT) / 100;
			const canIndex = asset === 'property' && v.taxpayer !== 'other' && buy.t < Date.parse(INDEXATION_PURCHASED_BEFORE);
			let usedIndex = false;
			if (canIndex) {
				const ciiSale = ciiFor(sell);
				const ciiBuy = ciiFor(buy);
				const imp = improvement > 0 ? parseIso(v.improveDate) : null;
				if (improvement > 0 && (!imp || imp.t < buy.t || imp.t > sell.t)) return fail('Enter an improvement date between the purchase and sale dates.');
				if (imp && imp.t < Date.UTC(2001, 3, 1)) return fail('Improvements made before 1 April 2001 are not counted. Enter 0 or add them to the cost.');
				if (ciiSale === null || ciiBuy === null) {
					note = ` The Cost Inflation Index is not notified beyond FY 2026-27 (${CII_NOTIFICATION}), so indexation is not shown for this sale date.`;
				} else {
					const ciiImp = imp ? ciiFor(imp)! : 1;
					const idxCost = (cost * ciiSale) / ciiBuy;
					const idxImp = imp ? (improvement * ciiSale) / ciiImp : 0;
					const idxGain = sale - expenses - idxCost - idxImp;
					const taxB = (Math.max(idxGain, 0) * LTCG_INDEXED_RATE_PCT) / 100;
					usedIndex = taxB < taxA;
					tax = Math.min(taxA, taxB);
					taxableGain = usedIndex ? Math.max(idxGain, 0) : nominalGain;
					method = usedIndex
						? `Long-term, ${pct(LTCG_INDEXED_RATE_PCT)} with indexation (section 197(3))`
						: `Long-term, ${pct(LTCG_RATE_PCT)} without indexation`;
					extra = [
						{ label: 'Tax at 12.5%, no indexation', value: money(taxA) },
						{ label: 'Tax at 20%, with indexation', value: money(taxB) },
						{ label: 'Indexed cost (cost + improvement)', value: money(idxCost + idxImp) }
					];
					note = ` Indexation uses CII ${ciiSale} for the sale year and ${ciiBuy} for the purchase year.`;
				}
			}
			if (!usedIndex && !method) {
				tax = taxA;
				method = `Long-term, ${pct(LTCG_RATE_PCT)} without indexation (section 197)`;
			}
		}

		const surcharge = (tax * surchargePct) / 100;
		const cess = (tax + surcharge) * CESS_RATE;
		const total = tax + surcharge + cess;

		rows.push(
			{ label: 'Capital gain', value: nominalGain < 0 ? `−${money(-nominalGain)}` : money(nominalGain) },
			{ label: 'Holding period', value: classText },
			{ label: 'How it is taxed', value: method },
			{ label: 'Gain taxed', value: money(taxableGain) },
			{ label: 'Tax before cess', value: money(tax) },
			{ label: 'Surcharge', value: money(surcharge) },
			{ label: 'Health and education cess (4%)', value: money(cess) },
			...extra
		);

		return {
			primaryResult: money(total),
			primaryLabel: `Capital gains tax (${CG_TAX_YEAR_LABEL}, with cess)`,
			summary:
				nominalGain > 0
					? `${ASSET_LABEL[asset]}: a ${money(nominalGain)} gain, ${method.toLowerCase()}.${note}`
					: `${ASSET_LABEL[asset]}: ${method.toLowerCase()}.${note}`,
			secondaryMetrics: rows
		};
	},
	content: {
		intro: `Use this capital gains tax calculator for India to work out the tax on selling shares, mutual funds, property, gold or unlisted shares in ${CG_TAX_YEAR_LABEL}. It uses the rates in force since 23 July 2024 and the Income-tax Act, 2025.`,
		howTo: [
			'Pick the asset, enter the purchase and sale dates, the cost, the sale price and your selling expenses.',
			'For property bought before 23 July 2024, say if you are a resident individual or HUF so the lower of the indexed and non-indexed tax is found.',
			'Enter your slab rate for gains taxed at slab rates, and a surcharge if you have one, then read the tax with 4% cess.'
		],
		about: [
			{
				heading: 'What are capital gains?',
				paragraphs: [
					'A capital gain is the profit you make when you sell an asset for more than it cost you. The cost includes what you paid to buy it and, for property, the money you spent on improvements. You subtract selling expenses such as brokerage.',
					'The tax depends on how long you held the asset. A gain on an asset held for a short time is short-term. By contrast, a gain on an asset held for longer is long-term, and it usually has a lower rate.'
				]
			},
			{
				heading: `Capital gains tax rates in India for ${CG_TAX_YEAR_LABEL}`,
				paragraphs: [
					`The holding period that makes a gain long-term is more than ${HOLDING_MONTHS_LISTED} months for listed shares and equity fund units, and more than ${HOLDING_MONTHS_OTHER} months for other assets. A debt mutual fund bought on or after 1 April 2023 is always short-term, whatever the holding period.`,
					`The table shows the rates for sales on or after 23 July 2024. Cess of ${CESS_RATE * 100}% is added to the tax, and surcharge applies to high earners.`
				],
				table: {
					caption: `Sales on or after 23 July 2024, ${CG_TAX_YEAR_LABEL}`,
					columns: ['Asset', 'Long-term if held', 'Long-term rate', 'Short-term rate'],
					rows: [
						['Listed shares and equity funds (STT paid)', `More than ${HOLDING_MONTHS_LISTED} months`, `${LTCG_RATE_PCT}% above ${inr(LTCG_EQUITY_EXEMPTION)} a year`, `${STCG_EQUITY_RATE_PCT}%`],
						['Other listed securities', `More than ${HOLDING_MONTHS_LISTED} months`, `${LTCG_RATE_PCT}%`, 'Slab rate'],
						['Property, gold and other assets', `More than ${HOLDING_MONTHS_OTHER} months`, `${LTCG_RATE_PCT}%`, 'Slab rate'],
						['Unlisted shares', `More than ${HOLDING_MONTHS_OTHER} months`, `${LTCG_RATE_PCT}%`, 'Slab rate'],
						['Debt mutual funds (bought on or after 1 April 2023)', 'Never long-term', 'Not applicable', 'Slab rate']
					]
				}
			},
			{
				heading: 'Indexation on property',
				paragraphs: [
					`Indexation raises your purchase cost to allow for inflation, using the Cost Inflation Index (CII). However, it is now allowed only on land or buildings bought before 23 July 2024, and only for a resident individual or HUF. The tax is then the lower of ${LTCG_RATE_PCT}% without indexation and ${LTCG_INDEXED_RATE_PCT}% with indexation.`,
					`The indexed cost is the cost × CII of the sale year ÷ CII of the purchase year. The CII is 376 for FY 2025-26 and 384 for FY 2026-27 (${CII_NOTIFICATION}).`,
					'Indexation helps most when you held the property for many years. For example, a flat bought in June 2010 for ₹30,00,000 and sold for ₹90,00,000 in October 2026 has an indexed cost of ₹68,98,204. The tax is ₹4,20,359 with indexation, against ₹7,50,000 without it. With cess, the total is ₹4,37,174.'
				]
			},
			{
				heading: 'Examples with the same gain',
				paragraphs: [
					'The table shows a ₹4,00,000 gain (bought for ₹5,00,000, sold for ₹9,00,000) taxed in different ways. All sales are on 28 October 2026. The long-term rows were bought on 1 June 2023, and the short-term shares and gold rows on 1 May 2026. The debt fund was bought in June 2023, but it counts as short-term by law. A 30% slab rate is used where the slab applies.'
				],
				table: {
					caption: 'Tax on a ₹4,00,000 gain, with 4% cess',
					columns: ['Asset and holding', 'Tax rule', 'Total tax'],
					rows: [
						['Equity shares, long-term, STT paid', '12.5% above ₹1,25,000', '₹35,750'],
						['Equity shares, short-term, STT paid', '20%', '₹83,200'],
						['Gold, long-term', '12.5%', '₹52,000'],
						['Gold, short-term', '30% slab rate', '₹1,24,800'],
						['Debt mutual fund, bought June 2023', '30% slab rate', '₹1,24,800']
					]
				}
			},
			{
				heading: 'Tips to manage capital gains tax',
				paragraphs: ['A few points can reduce surprises:'],
				list: [
					'**Mind the holding period.** Selling just after the 12-month or 24-month mark can change the rate a lot.',
					`**Use the equity exemption.** Long-term gains on STT-paid equity are tax-free up to ${inr(LTCG_EQUITY_EXEMPTION)} in a year, shared across all your sales.`,
					'**Keep your records.** Save contract notes, purchase deeds and improvement bills, because they prove your cost.',
					'**Plan advance tax.** A large gain can raise your tax for the year, so check the dates in the [advance tax calculator](/advance-tax-calculator).',
					'**See the full picture.** Then add the gain to your other income in the [India income tax calculator](/india-income-tax-calculator).',
					'**Plan your investing.** Estimate growth with the [SIP calculator](/sip-calculator) or the [lumpsum calculator](/lumpsum-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Capital gain and holding period',
				expression: 'Gain = sale price − selling expenses − cost − cost of improvement',
				variables: [
					{ symbol: 'Listed shares, equity fund units, other listed securities', meaning: 'long-term if held more than 12 months' },
					{ symbol: 'Property, gold, unlisted shares', meaning: 'long-term if held more than 24 months' },
					{ symbol: 'Debt fund bought on or after 1 April 2023', meaning: 'always short-term, taxed at slab rate' }
				]
			},
			{
				title: 'Rates (sales on or after 23 July 2024)',
				expression:
					'Equity with STT: short-term 20% (s.196); long-term 12.5% on the part above ₹1,25,000 (s.198). All other long-term gains: 12.5% (s.197). Other short-term gains: slab rate. Add surcharge, then 4% cess.',
				variables: []
			},
			{
				title: 'Property bought before 23 July 2024 (resident individual or HUF)',
				expression: 'Tax = lower of [12.5% × (sale − expenses − cost)] and [20% × (sale − expenses − indexed cost)]',
				variables: [
					{ symbol: 'Indexed cost', meaning: 'cost × CII of sale year ÷ CII of purchase year (same for each improvement)' },
					{ symbol: 'CII', meaning: `Cost Inflation Index; 376 for FY 2025-26 and 384 for FY 2026-27 (${CII_NOTIFICATION})` }
				]
			}
		],
		example: {
			title: 'Flat bought in June 2023 and sold in January 2026 for ₹90 lakh',
			steps: [
				'Cost ₹50,00,000, sale price ₹90,00,000, no expenses. Held 31 months, so the gain is long-term.',
				'Gain without indexation: ₹90,00,000 − ₹50,00,000 = ₹40,00,000.',
				'Tax at 12.5% = ₹5,00,000. With indexation the cost becomes ₹50,00,000 × 376 ÷ 348 = ₹54,02,298, the gain ₹35,97,701 and the tax at 20% ₹7,19,540 (higher), so 12.5% is used.',
				'Cess at 4% = ₹20,000, so the total is ₹5,20,000.'
			],
			result: '₹5,20,000 capital gains tax'
		},
		faq: [
			{
				q: 'How is capital gains tax calculated in India?',
				a: 'Subtract your cost and selling expenses from the sale price to get the gain. Decide if it is short-term or long-term by the holding period. Then apply the rate for that asset and add surcharge and 4% cess.'
			},
			{
				q: 'What are the capital gains tax rates in India for FY 2026-27?',
				a: 'For sales on or after 23 July 2024: 20% on short-term gains on STT-paid shares and equity funds, 12.5% on long-term gains (equity gains up to ₹1.25 lakh a year are exempt). Other short-term gains are taxed at your slab rate. Cess is 4% on top.'
			},
			{
				q: 'Can I still use indexation?',
				a: 'Only on land or buildings bought before 23 July 2024, and only if you are a resident individual or HUF. The tax is then the lower of 12.5% without indexation and 20% with indexation. Gold, shares and funds get no indexation.'
			},
			{
				q: 'How long must I hold shares for a long-term gain?',
				a: 'More than 12 months for listed shares and equity fund units. For property, gold and unlisted shares, it is more than 24 months.'
			},
			{
				q: 'What does this calculator leave out?',
				a: 'It leaves out exemptions for reinvesting the gain (such as in a house or specified bonds) and set-off or carry-forward of losses. It also skips the basic-exemption adjustment, non-residents, TDS on the sale, and units bought before 1 April 2023 that are not covered. Check these with a tax adviser.'
			}
		],
		sources: [SEC196_SOURCE, SEC197_SOURCE, SEC198_SOURCE, CII_SOURCE],
		disclaimer: 'This is an estimate for general information, not tax advice. Rules and rates can change; confirm with the Income Tax Department or a tax professional.'
	}
});
