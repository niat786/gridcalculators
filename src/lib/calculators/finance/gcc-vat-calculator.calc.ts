import { defineCalculator, type CalculationResult } from '../types';
import { DASH, moneyIn, pct } from '../format';
import meta from './gcc-vat-calculator.meta';
import { GCC_COUNTRIES, GCC_VAT_AS_OF, GCC_VAT_SOURCES } from '../data/gcc-vat';

/** Round half up to the currency's minor unit (2 or 3 decimals); the tiny epsilon beats float noise. */
const rateOf = (code: string) => GCC_COUNTRIES.find((c) => c.value === code)?.rate ?? 0;
const round = (n: number, d: number) => Math.round(n * 10 ** d + 1e-9) / 10 ** d;

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'country',
			label: 'Country',
			type: 'select',
			display: 'menu',
			default: 'AE',
			options: GCC_COUNTRIES.map((c) => ({ value: c.value, label: `${c.label} (${c.currency})` }))
		},
		{
			id: 'mode',
			label: 'Calculation',
			type: 'select',
			display: 'segmented',
			default: 'add',
			options: [
				{ label: 'Add VAT', value: 'add' },
				{ label: 'Remove VAT', value: 'remove' }
			]
		},
		{
			id: 'amount',
			label: 'Amount',
			type: 'number',
			default: 1000,
			min: 0,
			max: 1_000_000_000,
			step: 0.001,
			help: 'In the country’s currency. Price before VAT when adding; price including VAT when removing.'
		}
	],
	calculate(v): CalculationResult {
		const remove = String(v.mode) === 'remove';
		const label = remove ? 'Price without VAT' : 'Price with VAT';
		const c = GCC_COUNTRIES.find((x) => x.value === String(v.country));
		const amount = Number(v.amount);
		if (!c || !(amount >= 0) || !Number.isFinite(amount)) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Pick a country and enter an amount of zero or more.' };
		}
		const f = (n: number) => moneyIn(c.currency, n);
		let net: number;
		let vat: number;
		let gross: number;
		if (remove) {
			gross = round(amount, c.decimals);
			net = round(gross / (1 + c.rate / 100), c.decimals);
			vat = round(gross - net, c.decimals);
		} else {
			net = round(amount, c.decimals);
			vat = round((net * c.rate) / 100, c.decimals);
			gross = round(net + vat, c.decimals);
		}
		const status = c.note;
		return {
			primaryResult: f(remove ? net : gross),
			primaryLabel: label,
			summary:
				c.rate === 0
					? `${status} No VAT is added or removed.`
					: `VAT at ${pct(c.rate)} is ${f(vat)} (${c.label}).`,
			secondaryMetrics: [
				{ label: 'VAT rate', value: pct(c.rate) },
				{ label: 'Price without VAT', value: f(net) },
				{ label: 'VAT', value: f(vat) },
				{ label: 'Price with VAT', value: f(gross) },
				{ label: 'Rate as of', value: GCC_VAT_AS_OF }
			]
		};
	},
	content: {
		intro: `Use this GCC VAT calculator to add VAT to a price or take it out of one in any of the six Gulf states. It uses each country’s standard rate as of ${GCC_VAT_AS_OF} and shows the answer in the local currency. Qatar and Kuwait have no VAT in force, so they show 0%.`,
		howTo: [
			'Choose the country. The VAT rate and the currency follow your choice.',
			'Pick Add VAT if you have the price before VAT. Pick Remove VAT if your price already includes it.',
			'Enter the amount.',
			'Read the VAT, the price without VAT and the price with VAT.'
		],
		about: [
			{
				heading: 'What is VAT in the Gulf?',
				paragraphs: [
					'VAT (value added tax) is a tax on goods and services. Businesses collect it from customers and pass it to the tax authority. The final buyer bears the cost.',
					'The six Gulf Cooperation Council states do not all charge it. Four have a VAT in force, with different rates. Qatar and Kuwait had no domestic VAT in force as of the date of our data.'
				]
			},
			{
				heading: `Standard VAT rates in the GCC (as of ${GCC_VAT_AS_OF})`,
				paragraphs: ['The table shows the standard rate in each country. The note says since when it has applied.'],
				table: {
					caption: `Standard VAT rate by country, ${GCC_VAT_AS_OF}`,
					columns: ['Country', 'Currency', 'Rate', 'Note'],
					rows: GCC_COUNTRIES.map((c) => [c.label, c.currency, `${c.rate}%`, c.note])
				}
			},
			{
				heading: 'How to add and remove VAT',
				paragraphs: [
					'To add VAT, multiply the price before VAT by the rate. Then add the result to the price. For example, at 15%, a price of 100 becomes 115.',
					'To remove VAT, divide the price with VAT by 1 plus the rate. Do not just subtract 15% of the total, because that takes off too much. The VAT is then the difference between the two prices.',
					'Amounts round to the smallest unit of the currency. That is two decimals for the dirham and the riyals, and three for the dinars and the Omani rial.'
				]
			},
			{
				heading: 'How VAT looks on a real price',
				paragraphs: [
					`Take a price of 1,000 before VAT. In the UAE, VAT at ${rateOf('AE')}% adds ${moneyIn('AED', (1000 * rateOf('AE')) / 100)}, so you pay ${moneyIn('AED', 1000 * (1 + rateOf('AE') / 100))}. In Saudi Arabia, VAT at ${rateOf('SA')}% adds ${moneyIn('SAR', (1000 * rateOf('SA')) / 100)}, so you pay ${moneyIn('SAR', 1000 * (1 + rateOf('SA') / 100))}.`,
					`In Bahrain, VAT at ${rateOf('BH')}% on 1,000 dinars adds ${moneyIn('BHD', (1000 * rateOf('BH')) / 100)}. The same price in Qatar or Kuwait carries no VAT. This is why the same shopping basket can cost a different amount across the border.`
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					'It uses the standard rate only. Some supplies are zero-rated or exempt, such as certain exports or financial services, and the rules differ by country. A business should also check registration limits and invoice rules with its tax authority.',
					'If you sell in several countries, rules for cross-border supplies can be different again. Ask a tax adviser when the amounts are large.'
				]
			},
			{
				heading: 'Related Gulf tools',
				paragraphs: ['VAT is one piece of the picture for a business or an employee in the Gulf.'],
				list: [
					'For company profits in the UAE, see the [UAE corporate tax calculator](/uae-corporate-tax-calculator).',
					'For staff costs in Saudi Arabia, see the [GOSI calculator](/gosi-calculator).',
					'To change prices between currencies, use the [currency converter](/currency-converter).',
					'For a general VAT rate in other countries, try the [VAT calculator](/vat-calculator).'
				]
			}
		],
		formulas: [
			{
				expression: 'Add: VAT = net × rate, gross = net + VAT.   Remove: net = gross ÷ (1 + rate), VAT = gross − net',
				variables: [
					{ symbol: 'rate', meaning: `Standard rate: ${GCC_COUNTRIES.map((c) => `${c.label} ${c.rate}%`).join(', ')}.` },
					{ symbol: 'rounding', meaning: `Amounts round to the currency’s smallest unit: 2 decimals for ${GCC_COUNTRIES.filter((c) => c.decimals === 2).map((c) => c.currency).join(', ')}; 3 for ${GCC_COUNTRIES.filter((c) => c.decimals === 3).map((c) => c.currency).join(', ')}.` }
				]
			}
		],
		example: {
			title: `Saudi Arabia, remove VAT from ${moneyIn('SAR', 115)}`,
			steps: [`The standard rate is ${rateOf('SA')}%.`, `Net = 115 ÷ 1.15 = ${moneyIn('SAR', 100)}.`, `VAT = 115 − 100 = ${moneyIn('SAR', 15)}.`],
			result: moneyIn('SAR', 100)
		},
		faq: [
			{
				q: 'Which VAT rates does this GCC VAT calculator use?',
				a: `The standard rates as of ${GCC_VAT_AS_OF}: UAE ${rateOf('AE')}%, Saudi Arabia ${rateOf('SA')}%, Bahrain ${rateOf('BH')}% and Oman ${rateOf('OM')}%. Zero-rated and exempt supplies are not modelled.`
			},
			{
				q: 'Do Qatar and Kuwait charge VAT?',
				a: 'Not at the time of writing. Neither has a domestic VAT in force, so this tool uses 0% for both. If that changes, the rate table will be updated.'
			},
			{
				q: 'How do I remove VAT from a total?',
				a: 'Divide the total by 1 plus the VAT rate. At 15%, divide by 1.15. Subtracting 15% of the total gives the wrong answer, because VAT was added to the smaller price, not the bigger one.'
			},
			{
				q: 'Why does Bahrain show three decimals?',
				a: 'The Bahraini dinar, Omani rial and Kuwaiti dinar are divided into 1,000 smaller units, so amounts are rounded to three decimals. The dirham and both riyals use two.'
			},
			{
				q: 'Has the Saudi VAT rate changed?',
				a: `Yes. Saudi Arabia raised its standard rate from 5% to ${rateOf('SA')}% on 1 July 2020. Bahrain also raised its rate to ${rateOf('BH')}% in January 2022.`
			}
		],
		sources: GCC_VAT_SOURCES,
		disclaimer: 'Estimate for the standard rate only. Always check the invoice rules with the country’s tax authority or an adviser.'
	}
});
