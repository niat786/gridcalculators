import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';
import meta from './canada-sales-tax-calculator.meta';
import { CA_TAX_YEAR, SALES_TAX, SALES_TAX_SOURCE } from '../data/ca-tax-2026';

/** Dollar helper for the content (written once at build time, so format explicitly). */
const cad = (n: number) => moneyIn('CAD', n, true);
/** Table rows built from the data file. */
function rateRows(): string[][] {
	return Object.values(SALES_TAX)
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((p) => {
			const detail =
				p.kind === 'HST'
					? `HST (${num(p.federal, 0)}% federal + ${num(p.provincial, 0)}% provincial)`
					: p.kind === 'GST'
						? 'GST only'
						: `GST + ${num(p.provincial, 3)}% ${p.provincialLabel}`;
			return [p.name, detail, pct(p.federal + p.provincial, 3)];
		});
}
const hstSummary = Object.values(SALES_TAX)
	.filter((p) => p.kind === 'HST')
	.sort((a, b) => a.name.localeCompare(b.name))
	.map((p) => `${p.name} ${pct(p.federal + p.provincial, 0)}`)
	.join('; ');
const otherSummary = Object.values(SALES_TAX)
	.filter((p) => p.kind === 'GST+PST' || p.kind === 'GST+QST')
	.map((p) => `${p.name} ${pct(p.federal, 0)} + ${pct(p.provincial, 3)} ${p.provincialLabel}`)
	.join('; ');

const OPTIONS = Object.entries(SALES_TAX)
	.map(([value, p]) => ({ value, label: p.name }))
	.sort((a, b) => a.label.localeCompare(b.label));

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'province', label: 'Province or territory', type: 'select', display: 'menu', default: 'ON', options: OPTIONS },
		{
			id: 'mode',
			label: 'What do you want to do?',
			type: 'select',
			display: 'segmented',
			default: 'add',
			options: [
				{ label: 'Add tax', value: 'add' },
				{ label: 'Remove tax', value: 'remove' }
			]
		},
		{ id: 'amount', label: 'Amount', type: 'number', default: 100, min: 0, max: 1_000_000_000, step: 1, prefix: '$', help: 'The price before tax to add tax to, or the total with tax to take it out of.' }
	],
	calculate(v): CalculationResult {
		const data = SALES_TAX[String(v.province)];
		const amount = Number(v.amount);
		const mode = v.mode === 'remove' ? 'remove' : 'add';
		if (!data || !Number.isFinite(amount) || amount < 0) {
			return { primaryResult: DASH, primaryLabel: 'Total with tax', summary: 'Enter an amount of zero or more and pick a province or territory.' };
		}
		const total = data.federal + data.provincial;
		// GST, HST, PST and QST are each a percentage of the pre-tax price, so they add up to one combined rate.
		const pre = mode === 'add' ? amount : amount / (1 + total / 100);
		const federal = (pre * data.federal) / 100;
		const provincial = (pre * data.provincial) / 100;
		const withTax = pre + federal + provincial;
		const federalLabel = data.kind === 'HST' ? 'Federal part of HST (5%)' : 'GST (5%)';
		const metrics = [
			{ label: 'Price before tax', value: money(pre) },
			{ label: federalLabel, value: money(federal) },
			...(data.provincial > 0 ? [{ label: `${data.provincialLabel} (${num(data.provincial, 3)}%)`, value: money(provincial) }] : []),
			{ label: 'Total tax', value: money(federal + provincial) },
			{ label: 'Combined rate', value: pct(total, 3) }
		];
		const kindText: Record<string, string> = {
			GST: '5% GST only',
			'GST+PST': `5% GST plus ${num(data.provincial, 3)}% ${data.provincialLabel}`,
			'GST+QST': '5% GST plus 9.975% QST, both on the pre-tax price',
			HST: `${num(total, 3)}% HST (5% federal + ${num(data.provincial, 3)}% provincial)`
		};
		return {
			primaryResult: mode === 'add' ? money(withTax) : money(pre),
			primaryLabel: mode === 'add' ? 'Total with tax' : 'Price before tax',
			summary: `${data.name}: ${kindText[data.kind]}.${mode === 'add' ? '' : ` ${money(amount)} includes ${money(federal + provincial)} of tax.`}`,
			secondaryMetrics: metrics
		};
	},
	content: {
		intro: `Add sales tax to a price, or take it out of a total, anywhere in Canada. This Canada sales tax calculator uses the ${CA_TAX_YEAR} rates for GST, HST, PST (British Columbia, Manitoba, Saskatchewan) and QST (Quebec). It shows the federal and provincial split.`,
		howTo: [
			'Pick your province or territory.',
			'Choose Add tax to start from the price before tax, or Remove tax to start from a total.',
			'Enter the amount.',
			'Read the total or the pre-tax price, with the federal and provincial tax shown separately.'
		],
		about: [
			{
				heading: 'GST, HST, PST and QST: what is the difference?',
				paragraphs: [
					`The **GST** is a federal tax of ${pct(SALES_TAX.AB.federal, 0)} that applies across Canada. Some provinces add their own tax on top. British Columbia and Saskatchewan charge a **PST**, Manitoba charges an **RST**, and Quebec charges the **QST**.`,
					`Other provinces join the federal and provincial tax into one **HST**. Ontario, Nova Scotia, New Brunswick, Newfoundland and Labrador and Prince Edward Island use it. The HST is still ${pct(SALES_TAX.ON.federal, 0)} federal plus a provincial part, but you see one line on your receipt.`,
					'Alberta, the Northwest Territories, Nunavut and Yukon charge the GST only.'
				]
			},
			{
				heading: `Sales tax rates by province for ${CA_TAX_YEAR}`,
				paragraphs: [
					`The table shows the combined rate you pay on most purchases. It follows the Canada Revenue Agency's rates. Nova Scotia's HST dropped to ${pct(SALES_TAX.NS.federal + SALES_TAX.NS.provincial, 0)} on April 1, 2025.`,
					'Your region may also have special rules for some items, so treat the table as the general rate.'
				],
				table: { caption: `Sales tax rates, ${CA_TAX_YEAR}`, columns: ['Province or territory', 'Tax', 'Combined rate'], rows: rateRows() }
			},
			{
				heading: 'How to add or remove sales tax',
				paragraphs: [
					'To add tax, multiply the price by one plus the combined rate. For example, in Ontario you multiply by 1.13. GST, PST, HST and QST are each worked out on the price before tax, so they simply add up to one combined rate.',
					'To remove tax from a total, divide by the same number. Do not subtract the rate from the total. For example, an Ontario receipt of $113.00 holds $100.00 before tax. Taking off 13% of $113.00 would wrongly give $98.31.',
					'Use the Remove tax option when you only have a receipt total, or when you want the pre-tax price of an item in a tax-included price list.'
				]
			},
			{
				heading: 'Tips for using the calculator',
				paragraphs: [`The same price can carry very different tax across the country. For example, a ${cad(2_000)} purchase has ${cad((2_000 * (SALES_TAX.ON.federal + SALES_TAX.ON.provincial)) / 100)} of tax at the Ontario rate and ${cad((2_000 * SALES_TAX.AB.federal) / 100)} at the Alberta rate. A few habits help you get it right:`],
				list: [
					'**Take off discounts first.** Tax is worked out on the sale price, so find that with the [discount calculator](/discount-calculator) and then add tax.',
					'**Use Remove tax for receipts.** It finds the pre-tax price of any tax-included total.',
					'**Round at the end.** Keep all the cents until you have the final total.',
					'**Plan big purchases early.** A home has other costs too. Try the [land transfer tax calculator](/land-transfer-tax-calculator).'
				]
			},
			{
				heading: 'Which items are taxed, and what this tool leaves out',
				paragraphs: [
					'These are the general rates for most goods and services. However, basic groceries, many medical items and some services are zero-rated or exempt. Some goods also have different provincial treatment, so the tax on your receipt may be lower.',
					'The calculator does not cover business rebates, input tax credits or small supplier rules. If you work out sales tax for a business, check the CRA guidance or ask an accountant.',
					'For your own planning, you may also like the [Canada income tax calculator](/canada-income-tax-calculator) and the [Canada take-home pay calculator](/canada-take-home-pay-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Adding and removing tax',
				expression: 'Total = Price × (1 + combined rate);  Price = Total ÷ (1 + combined rate)',
				variables: [
					{ symbol: 'Combined rate', meaning: `GST ${pct(SALES_TAX.AB.federal, 0)} plus PST, RST or QST, or the single HST rate` },
					{ symbol: 'HST', meaning: hstSummary },
					{ symbol: 'Other', meaning: otherSummary }
				]
			}
		],
		example: {
			title: 'A $200 purchase in Quebec',
			steps: ['GST = $200 × 5% = $10.00', 'QST = $200 × 9.975% = $19.95 (QST is charged on the price, not on the GST)', 'Total = $200 + $10.00 + $19.95'],
			result: 'The total with tax is $229.95, a combined rate of 14.975%.'
		},
		faq: [
			{
				q: 'What is the HST rate in Nova Scotia now?',
				a: `It is ${pct(SALES_TAX.NS.federal + SALES_TAX.NS.provincial, 0)} since April 1, 2025, down from 15%: ${pct(SALES_TAX.NS.federal, 0)} federal and ${pct(SALES_TAX.NS.provincial, 0)} provincial.`
			},
			{
				q: 'How do I calculate HST in Ontario?',
				a: `Ontario's HST is ${pct(SALES_TAX.ON.federal + SALES_TAX.ON.provincial, 0)}. Multiply the price by 1.13 to get the total, or by 0.13 to get the tax alone. A $100 item costs $113.`
			},
			{
				q: 'How do I take HST out of a total?',
				a: 'Divide the total by one plus the rate. In Ontario, divide by 1.13. For example, $113 becomes $100 before tax, and the tax is $13.'
			},
			{
				q: 'Is PST charged on top of GST?',
				a: 'GST and PST (or QST) are each a percentage of the pre-tax price, so they add up to one combined rate. PST and QST are not charged on the GST part.'
			},
			{
				q: 'Which provinces charge only GST?',
				a: `Alberta, the Northwest Territories, Nunavut and Yukon charge only the ${pct(SALES_TAX.AB.federal, 0)} GST. They have no provincial or territorial sales tax in this calculator.`
			},
			{
				q: 'Are all items taxed at these rates?',
				a: 'No. Basic groceries, many medical items and some services are zero-rated or exempt, and some goods have different provincial treatment. These are the general rates for most purchases.'
			}
		],
		sources: [SALES_TAX_SOURCE],
		disclaimer: 'General rates for most purchases. Exemptions and special rules apply to some items. This is not tax advice.'
	}
});
