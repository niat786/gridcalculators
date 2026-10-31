import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './transfer-duty-calculator.meta';
import { SARS_TRANSFER_DUTY_SOURCE, ZA_TRANSFER_DUTY, zaBracketFor, zaTransferDuty } from '../data/za-2026-27';

/** Content is built before a currency is chosen, so format rand explicitly. */
const zar = (n: number) => moneyIn('ZAR', n, true);
const pc = (x: number) => `${+(x * 100).toFixed(2)}%`;
function dutyRows(): string[][] {
	return ZA_TRANSFER_DUTY.map((t) => [t.upTo === Infinity ? `${zar(t.from + 1)} and above` : `${zar(t.from + 1)} to ${zar(t.upTo)}`, pc(t.rate), zar(t.base)]);
}
const FIRST = ZA_TRANSFER_DUTY[0].upTo;
const LAST = ZA_TRANSFER_DUTY[ZA_TRANSFER_DUTY.length - 1];

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'price', label: 'Property purchase price', type: 'number', default: 2500000, min: 0, max: 10_000_000_000, step: 50000, prefix: '$', help: 'The price or market value, whichever is higher.' }
	],
	calculate(v): CalculationResult {
		const price = Number(v.price);
		if (!Number.isFinite(price) || price < 0) {
			return { primaryResult: DASH, primaryLabel: 'Transfer duty', summary: 'Enter a property price of zero or more.' };
		}
		const duty = zaTransferDuty(price);
		const b = zaBracketFor(ZA_TRANSFER_DUTY, price);
		const rate = Math.round(b.rate * 100);
		const summary =
			duty === 0
				? `No transfer duty is payable: the first ${money(ZA_TRANSFER_DUTY[0].upTo, true)} of a property’s value is exempt.`
				: `The part of the price in the ${rate}% bracket is taxed at ${rate}%, on top of ${money(b.base, true)} for the lower brackets.`;
		return {
			primaryResult: money(duty),
			primaryLabel: 'Transfer duty payable',
			summary,
			secondaryMetrics: [
				{ label: 'Purchase price', value: money(price) },
				{ label: 'Effective rate', value: pct(price > 0 ? (duty / price) * 100 : 0, 2) },
				{ label: 'Bracket rate on top rand', value: pct(b.rate * 100, 0) },
				{ label: 'Price plus transfer duty', value: money(price + duty) }
			],
			table: {
				title: 'Transfer duty table',
				collapsed: true,
				columns: [
					{ key: 'range', label: 'Property value' },
					{ key: 'rate', label: 'Rate', align: 'end' },
					{ key: 'base', label: 'Duty at start of bracket', align: 'end' }
				],
				rows: ZA_TRANSFER_DUTY.map((t) => ({
					range: t.upTo === Infinity ? `${money(t.from + 1, true)} and above` : `${money(t.from + 1, true)} to ${money(t.upTo, true)}`,
					rate: pct(t.rate * 100, 0),
					base: money(t.base, true)
				}))
			}
		};
	},
	content: {
		intro: `Find the transfer duty you pay SARS when you buy property in South Africa. This transfer duty calculator uses the current table: the first ${zar(FIRST)} is exempt, and higher values pay ${pc(ZA_TRANSFER_DUTY[1].rate)} to ${pc(LAST.rate)} on each slice.`,
		howTo: [
			'Enter the purchase price of the property.',
			'Read the transfer duty and the effective rate.',
			'Check the price plus duty, which shows what the purchase costs before other fees.',
			'Open the table to see every bracket.'
		],
		about: [
			{
				heading: 'What is transfer duty?',
				paragraphs: [
					'Transfer duty is a tax the buyer pays SARS when property changes hands in South Africa. You pay it on top of the purchase price.',
					`The duty is charged on the purchase price or the market value, whichever is higher. The first ${zar(FIRST)} is exempt, so small purchases pay nothing.`
				]
			},
			{
				heading: 'Transfer duty table for 2026/27',
				paragraphs: [
					'The table below is the SARS table effective from 1 April 2026. It is unchanged from the table in force since 1 April 2025. Each bracket has a fixed amount for the lower brackets, plus a rate on the value inside the bracket.'
				],
				table: { caption: 'Transfer duty on property value', columns: ['Property value', 'Rate on the slice', 'Duty at the start of the bracket'], rows: dutyRows() }
			},
			{
				heading: 'How the duty is worked out',
				paragraphs: [
					'Find the bracket your price falls in. Take the fixed amount for that bracket. Then add the rate times the part of the price above the start of the bracket.',
					'The effective rate is the duty divided by the price. It is always lower than the bracket rate, because the lower slices pay less. The calculator shows both.'
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					`If your price is ${zar(FIRST)} or less, the duty is nil. Above that, the duty grows with each slice of value, so a more expensive home pays a higher share of its price.`,
					'The bracket rate shows what the next rand of value costs in duty. The effective rate shows the average over the whole price. For budgeting, the effective rate and the price plus duty are the two figures to use.',
					'Also, remember that a small change in price can move you into a new bracket. However, you never pay the new rate on the whole price, only on the part above the bracket start.'
				]
			},
			{
				heading: 'When transfer duty does not apply, and other costs',
				paragraphs: [
					'If the seller is a VAT vendor and charges VAT on the sale, you pay VAT instead of transfer duty. This is common with new homes from a developer. In that case, this calculator does not apply.',
					'Transfer duty is not your only cost. Conveyancing fees, bond registration costs and deeds office fees are separate and not included here. Ask your conveyancer for a full list of costs before you sign, so there are no surprises on the day.'
				]
			},
			{
				heading: 'Plan your purchase',
				paragraphs: [
					'Add the duty to your other upfront costs. The [mortgage calculator](/mortgage-calculator) shows the monthly bond payment, and the [house affordability calculator](/house-affordability-calculator) shows how much you can borrow from your income. The [down payment calculator](/down-payment-calculator) helps you plan the cash you need.',
					'Your income tax and take-home pay also shape what you can afford. Try the [South Africa take-home pay calculator](/south-africa-take-home-pay-calculator) and the [South Africa income tax calculator](/south-africa-income-tax-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Transfer duty',
				expression: 'Duty = fixed amount for the bracket + rate × (value − bracket start)',
				variables: ZA_TRANSFER_DUTY.map((t) => ({
					symbol: t.upTo === Infinity ? `Above ${zar(t.from)}` : `${zar(t.from + 1)} to ${zar(t.upTo)}`,
					meaning: t.rate === 0 ? '0%' : t.base === 0 ? `${pc(t.rate)} of the value above ${zar(t.from)}` : `${zar(t.base)} + ${pc(t.rate)} above ${zar(t.from)}`
				}))
			}
		],
		example: {
			title: 'A R2,500,000 home',
			steps: [
				'R2,500,000 falls in the R2,329,301 to R2,994,800 bracket.',
				'Duty = R53,544 + 8% × (R2,500,000 − R2,329,300) = R53,544 + R13,656.',
				'Duty = R67,200.'
			],
			result: 'Transfer duty of R67,200, an effective rate of 2.69%.'
		},
		faq: [
			{ q: 'How is transfer duty calculated in South Africa?', a: 'Find your price in the SARS table, take the fixed amount for that bracket, and add the bracket rate on the value above its start. This transfer duty calculator does it for you.' },
			{ q: 'Do I pay transfer duty on a new home?', a: 'Not if the seller is a VAT vendor and charges VAT on the sale. VAT is then paid instead of transfer duty, so this calculator does not apply.' },
			{ q: 'Did the table change for 2026?', a: `No. SARS shows the table effective from 1 April 2026 as unchanged from the one in force since 1 April 2025, with the first ${zar(FIRST)} exempt.` },
			{ q: 'Who pays transfer duty, the buyer or the seller?', a: 'The buyer pays transfer duty. It is separate from the purchase price and from your bond.' },
			{ q: 'Is this all my buying cost?', a: 'No. Conveyancing fees, bond registration costs and deeds office fees are separate and not included here. Use the [mortgage calculator](/mortgage-calculator) for the loan itself.' }
		],
		sources: [SARS_TRANSFER_DUTY_SOURCE],
		disclaimer: 'An estimate based on the SARS transfer duty table for 2026/27, not legal or tax advice. Check with your conveyancer.'
	}
});
