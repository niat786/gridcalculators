import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, pct } from '../format';
import meta from './islamic-home-finance-calculator.meta';
import { IHF_MAX_YEARS, IHF_SOURCES } from '../data/islamic-home-finance';

/** Equal monthly payment that repays `principal` over n months at a monthly rate r (annuity). */
function annuity(principal: number, r: number, n: number): number {
	if (r === 0) return principal / n;
	return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/** Monthly rate at which an annuity of `payment` over n months repays `principal` (bisection). */
function impliedMonthlyRate(principal: number, payment: number, n: number): number {
	if (payment <= principal / n) return 0;
	let lo = 0;
	let hi = 1;
	for (let i = 0; i < 200; i++) {
		const mid = (lo + hi) / 2;
		if (annuity(principal, mid, n) > payment) hi = mid;
		else lo = mid;
	}
	return (lo + hi) / 2;
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'price', label: 'Property price', type: 'number', default: 1_500_000, min: 1, max: 1_000_000_000, prefix: '$' },
		{ id: 'down', label: 'Down payment', type: 'number', default: 20, min: 0, max: 90, suffix: '%', help: 'Share of the price you pay up front. The bank finances the rest.' },
		{ id: 'years', label: 'Term', type: 'number', default: 25, min: 1, max: IHF_MAX_YEARS, decimal: false, suffix: 'years' },
		{
			id: 'flat',
			label: 'Murabaha flat profit rate',
			type: 'number',
			default: 3.5,
			min: 0,
			max: 30,
			step: 0.05,
			suffix: '% a year',
			help: 'Charged on the amount financed for every year of the term. Use your bank’s offer; the default is only an example.'
		},
		{
			id: 'rent',
			label: 'Diminishing Musharakah rent rate',
			type: 'number',
			default: 5.5,
			min: 0,
			max: 30,
			step: 0.05,
			suffix: '% a year',
			help: 'Annual rent rate on the bank’s remaining share. Often linked to a benchmark; the default is only an example.'
		}
	],
	calculate(v): CalculationResult {
		const label = 'Murabaha monthly instalment';
		const price = Number(v.price);
		const downPct = Number(v.down);
		const years = Number(v.years);
		const flat = Number(v.flat);
		const rent = Number(v.rent);
		if (!(price > 0) || !Number.isFinite(price) || !(downPct >= 0 && downPct < 100) || !(years >= 1 && years <= IHF_MAX_YEARS) || !(flat >= 0) || !(rent >= 0) || !Number.isFinite(flat) || !Number.isFinite(rent)) {
			return { primaryResult: DASH, primaryLabel: label, summary: `Enter a price above zero, a down payment from 0% to under 100%, a term of 1 to ${IHF_MAX_YEARS} years and profit rates of zero or more.` };
		}
		const n = Math.round(years * 12);
		const down = (price * downPct) / 100;
		const financed = price - down;

		// Murabaha: flat profit on the financed amount, equal instalments.
		const profitM = financed * (flat / 100) * years;
		const totalM = financed + profitM;
		const payM = totalM / n;
		const equivalentRate = impliedMonthlyRate(financed, payM, n) * 12 * 100;

		// Diminishing Musharakah / Ijara: rent on the bank's share at the annual rent rate, equal total payments.
		const r = rent / 100 / 12;
		const payD = annuity(financed, r, n);
		const totalD = payD * n;
		const profitD = totalD - financed;
		const firstRent = financed * r;
		const firstBuy = payD - firstRent;

		const diff = totalM - totalD;
		const cheaper = Math.abs(diff) < 0.005 ? 'Same total cost' : diff > 0 ? `Diminishing Musharakah is cheaper by ${money(diff)}` : `Murabaha is cheaper by ${money(-diff)}`;

		return {
			primaryResult: money(payM),
			primaryLabel: label,
			summary: `${money(financed)} financed over ${n} months. Murabaha is fixed at ${money(payM)} a month; Diminishing Musharakah starts at ${money(payD)} a month on the rent rate you entered. ${cheaper} on these rates.`,
			secondaryMetrics: [
				{ label: 'Diminishing Musharakah monthly payment', value: money(payD) },
				{ label: 'Murabaha total profit', value: money(profitM) },
				{ label: 'Diminishing Musharakah total rent', value: money(profitD) },
				{ label: 'Murabaha equal to a reducing-balance rate of', value: pct(equivalentRate, 2) },
				{ label: 'Cheaper over the term', value: cheaper }
			],
			table: {
				title: 'Side by side',
				columns: [
					{ key: 'item', label: '' },
					{ key: 'murabaha', label: 'Murabaha', align: 'end' },
					{ key: 'dm', label: 'Diminishing Musharakah / Ijara', align: 'end' }
				],
				rows: [
					{ item: 'Amount financed by the bank', murabaha: money(financed), dm: money(financed) },
					{ item: 'Rate', murabaha: `${num(flat, 2)}% flat a year`, dm: `${num(rent, 2)}% a year on the bank’s share` },
					{ item: 'Monthly payment', murabaha: money(payM), dm: money(payD) },
					{ item: 'Profit or rent over the term', murabaha: money(profitM), dm: money(profitD) },
					{ item: 'Total paid to the bank', murabaha: money(totalM), dm: money(totalD) },
					{ item: 'Total cost including down payment', murabaha: money(totalM + down), dm: money(totalD + down) },
					{ item: 'Month 1: profit or rent part', murabaha: money(profitM / n), dm: money(firstRent) },
					{ item: 'Month 1: share bought or principal', murabaha: money(financed / n), dm: money(firstBuy) }
				]
			}
		};
	},
	content: {
		intro: `Use this Islamic home finance calculator to compare two common structures side by side. In Murabaha, the bank sells you the home at cost plus a fixed profit, paid in equal instalments. In Diminishing Musharakah with Ijara, you rent the bank’s share and buy it out over time.`,
		howTo: [
			'Enter the property price, your down payment and the term in years (up to ' + IHF_MAX_YEARS + ').',
			'Enter the Murabaha flat profit rate and the Diminishing Musharakah rent rate from your bank’s offers.',
			'Compare the monthly payment, the total paid and the profit or rent over the term in the table.',
			'Check the equivalent reducing-balance rate, which shows how the flat rate compares with the rent rate.'
		],
		about: [
			{
				heading: 'What is Islamic home finance?',
				paragraphs: [
					'Islamic home finance helps you buy a home without a conventional interest-bearing loan. The bank takes part in the purchase instead, and its return comes from a sale profit or from rent. Banks use several contract types, and this tool covers two of them.',
					'No law fixes the rates here. The default rates are only examples, so use the offer from your bank.'
				]
			},
			{
				heading: 'How Murabaha works',
				paragraphs: [
					'In Murabaha, the bank buys the property and sells it to you at a higher price. The price is the cost plus an agreed profit. You pay it in equal instalments.',
					'The profit is fixed when you sign and cannot change. This tool applies the flat rate to the amount the bank finances, which is the price minus your down payment. The instalment is the financed amount plus the profit, divided by the number of months.'
				]
			},
			{
				heading: 'How Diminishing Musharakah with Ijara works',
				paragraphs: [
					'Here the bank and you own the home together. You pay rent on the bank’s share, and you also buy that share in steps. As you own more, the rent falls.',
					'This tool shows equal total payments, using the standard reducing-balance formula at the rent rate. In real contracts, the rent is often linked to a benchmark and reset from time to time. So later payments can change.'
				]
			},
			{
				heading: 'Why a flat rate can look cheaper than it is',
				paragraphs: [
					'A flat profit rate is charged on the full financed amount for every year of the term. But you repay part of the amount every month. So the true cost of a flat rate is higher than the number looks.',
					'The “equivalent reducing-balance rate” in the results shows the same payments as a rate on the falling balance. Compare that number with the rent rate. You can also check a loan quote with the [APR calculator](/apr-calculator) or look at a repayment schedule with the [amortization calculator](/amortization-calculator).'
				]
			},
			{
				heading: 'Things to ask your bank, and a note on scholarly views',
				paragraphs: [
					'Scholars and Shari’ah boards differ on some details, such as how rent is benchmarked, so please ask a qualified scholar if you have doubts about a contract.',
					'This tool does not include early-settlement rebates, arrangement fees, insurance or rate resets. Ask the bank for them in writing. For more planning, see the [mortgage calculator](/mortgage-calculator), the [down payment calculator](/down-payment-calculator), the [zakat calculator](/zakat-calculator) and the [Islamic inheritance calculator](/islamic-inheritance-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Murabaha (cost-plus, flat profit)',
				expression: 'Profit = F × R × Y   ·   Instalment = (F + Profit) ÷ (12 × Y)',
				variables: [
					{ symbol: 'F', meaning: 'Amount financed by the bank: price minus your down payment.' },
					{ symbol: 'R', meaning: 'Flat annual profit rate, charged on F for every year of the term.' },
					{ symbol: 'Y', meaning: 'Term in years.' }
				]
			},
			{
				title: 'Diminishing Musharakah / Ijara (rent on the bank’s share)',
				expression: 'Payment = F × r ÷ (1 − (1 + r)⁻ⁿ), r = rent rate ÷ 12, n = 12 × Y',
				variables: [
					{ symbol: 'r', meaning: 'Monthly rent rate on the bank’s remaining share.' },
					{ symbol: 'n', meaning: 'Number of monthly payments.' }
				]
			}
		],
		example: {
			title: 'AED 1,000,000 home, 20% down, 25 years, 3% flat vs 5% rent',
			steps: [
				'Financed by the bank: 1,000,000 − 200,000 = AED 800,000.',
				'Murabaha profit: 800,000 × 3% × 25 = AED 600,000, so the total owed is AED 1,400,000.',
				'Murabaha instalment: 1,400,000 ÷ 300 months = AED 4,666.67, fixed for the whole term.',
				'Diminishing Musharakah at 5% a year on the bank’s share: AED 4,676.72 a month, of which AED 3,333.33 is rent in month 1 and the rest buys the bank’s share. The Murabaha payment equals a reducing-balance rate of about 4.98%.'
			],
			result: 'AED 4,666.67'
		},
		faq: [
			{
				q: 'What is the difference between Murabaha and Diminishing Musharakah?',
				a: 'In Murabaha, the bank buys the home and resells it to you at a price fixed at signing, so your instalments never change. In Diminishing Musharakah, the bank co-owns the home, you pay rent on its share and buy that share in steps. Rent is often linked to a benchmark, so later payments can change.'
			},
			{
				q: 'Why does a flat rate look cheaper than it is?',
				a: 'A flat profit rate is charged on the full amount for the whole term, even though you repay part of it every month. Converting the payment to a reducing-balance rate gives a higher number. That is the fair way to compare it with a rent rate.'
			},
			{
				q: 'Is an Islamic home finance product the same as a mortgage?',
				a: 'No. A conventional mortgage is a loan with interest. Islamic structures use a sale with a fixed profit, or shared ownership with rent. The payments can look alike, which is why this tool compares them.'
			},
			{
				q: 'Does this model early settlement or fees?',
				a: 'No. Early-settlement rebates, arrangement fees, insurance, rate resets and the bank’s own rounding differ by bank and are not included. Use the offer letter for the exact figures.'
			},
			{
				q: 'Which structure is better for me?',
				a: 'It depends on your bank’s rates and on how much you value a payment that never changes. Compare the total cost in the table, then ask a qualified scholar about any contract you are unsure about.'
			}
		],
		sources: IHF_SOURCES,
		disclaimer:
			'Estimate only, for comparison. Real Murabaha and Diminishing Musharakah contracts vary by bank and may include fees, rate resets and different rent schedules. This is not financial or Shari’ah advice; confirm with your bank and a qualified scholar.'
	}
});
