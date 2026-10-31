import { defineCalculator } from '../types';
import meta from './currency-converter.meta';

export default defineCalculator({
	meta,
	widget: { name: 'currency' },
	inputs: [],
	calculate: () => ({ primaryResult: '', primaryLabel: '' }),
	content: {
		intro:
			'Use this currency converter to change money between more than 160 currencies at daily mid-market exchange rates. The date and the source of the rates show under every result, so you know how fresh they are.',
		howTo: [
			'Enter the amount you want to convert.',
			'Choose the currency you have and the one you want. Use the swap button to reverse them.',
			'Read the converted amount and the rate in both directions.',
			'Check the date under the result, and look at the value in other popular currencies if you need them.',
			'To see what you will really get, switch on “Use my own rate” and enter the rate your bank or exchange shop quotes. You can also add their fee as a percentage.'
		],
		about: [
			{
				heading: 'What is a mid-market rate?',
				paragraphs: [
					'The mid-market rate is the middle point between the price buyers will pay and the price sellers will accept for a currency on the wholesale market. Some people call it the real rate or the interbank rate.',
					'It is a fair reference, but you can rarely trade at exactly this rate. It works best as a yardstick for comparing offers.'
				]
			},
			{
				heading: 'Why your bank or exchange counter gives a different rate',
				paragraphs: [
					'Banks, card providers, airport counters and money transfer services add a margin to the mid-market rate, and some also charge a fee. As a result, you get fewer units of the other currency than this page shows. How much less depends on the provider and the route.',
					'For example, say the mid-market rate is 1 USD = 0.92 EUR, and a provider adds a 2% margin. You would get 0.9016 EUR for each dollar. On 100 USD, that is 90.16 EUR instead of 92.00 EUR. The numbers here are only an illustration.',
					'To compare offers, convert the same amount at each provider’s rate, add any fees, and see how much the other person receives. Then compare the result with this page.'
				]
			},
			{
				heading: 'Where the rates on this page come from',
				paragraphs: [
					'The page loads rates in your browser when you open it. The main source is the free daily feed from ExchangeRate-API, which covers more than 160 currencies. All rates are quoted against the US dollar. To convert between two other currencies, the page divides one dollar rate by the other.',
					'If that feed is not available, the page uses the European Central Bank reference rates through Frankfurter. They cover about 30 major currencies. The page tells you which source it used, and the date of the rates. It keeps the rates for an hour during your visit, so reloading does not fetch them again.',
					'Rates update once a day. They are good for planning and budgeting, but not for trading or for settling a contract.'
				]
			},
			{
				heading: 'Tips for converting money',
				paragraphs: ['A few habits can save you money and surprises.'],
				list: [
					'Compare the final amount received, not just the rate. Fees can matter more than a small difference in the rate.',
					'Several Gulf currencies are pegged to the US dollar, so their rates against the dollar move very little. Others can move more over a few weeks.',
					'Avoid converting at the last minute for a large payment. Check the rate on the day with your provider.',
					'Round-trip tests help: convert an amount and back, and the gap shows you the cost of a margin.'
				]
			},
			{
				heading: 'Related tools for Gulf and South Asian finance',
				paragraphs: [
					'Money sent home or paid across borders often needs a second calculation. For example, the [UAE gratuity calculator](/uae-gratuity-calculator) and the [Saudi end-of-service calculator](/saudi-end-of-service-calculator) show your pay in the local currency. You can then convert it here.',
					'The [GCC VAT calculator](/gcc-vat-calculator) works with Gulf prices. The [Pakistan salary tax calculator](/pakistan-salary-tax-calculator) and the [Bangladesh income tax calculator](/bangladesh-income-tax-calculator) work in rupees and taka. The [zakat calculator](/zakat-calculator) lets you type prices in your own currency.'
				]
			}
		],
		formulas: [
			{
				title: 'Conversion through a common base',
				expression: 'Amount in B = Amount in A × (rate of B ÷ rate of A)',
				variables: [{ symbol: 'rate', meaning: 'units of each currency per 1 US dollar, from the daily rate feed' }]
			}
		],
		example: {
			title: 'Converting 100 US dollars to euros at 1 USD = 0.92 EUR',
			steps: ['100 × 0.92 = 92', 'The reverse rate is 1 ÷ 0.92 = 1.0870 USD per euro'],
			result: '100 USD = 92.00 EUR at that rate.'
		},
		faq: [
			{
				q: 'Can I enter my bank’s exchange rate?',
				a: 'Yes. Switch on “Use my own rate” and type the rate you were quoted, such as 1 AED = 75.5 PKR. Add any fee as a percentage. The tool then shows what you will receive and how much less that is than the mid-market rate.'
			},
			{
				q: 'What is the mid-market exchange rate?',
				a: 'It is the midpoint between the buy and sell prices of a currency on the wholesale market. It is a fair reference rate, but most providers add a margin to it.'
			},
			{
				q: 'Why does my bank give a different rate?',
				a: 'Banks, card providers and exchange counters add a margin to the mid-market rate, and sometimes a fee. So the rate you get is usually worse than the one shown here. Compare the final amount you receive.'
			},
			{
				q: 'How often are the rates updated?',
				a: 'Once a day. The date of the rates shows under the result. They are fine for planning and budgeting, but not for trading.'
			},
			{
				q: 'Where do the rates come from?',
				a: 'From ExchangeRate-API’s free daily feed. If that is unavailable, the page uses the European Central Bank reference rates through Frankfurter, which cover about 30 major currencies.'
			},
			{
				q: 'Can I use this for a large transfer or a contract?',
				a: 'Use it to plan, not to settle. For a large payment, ask your bank or transfer service for a quote on the day, and check the fees as well as the rate.'
			}
		],
		sources: [
			{ title: 'European Central Bank — Euro foreign exchange reference rates', url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html' },
			{ title: 'ExchangeRate-API', url: 'https://www.exchangerate-api.com' }
		],
		disclaimer: 'Indicative mid-market rates for information only. The rate you get from a bank or money transfer service will differ.'
	}
});
