import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './bond-calculator.meta';

const frequencyOptions = [
	{ label: 'Annually (1)', value: '1' },
	{ label: 'Semiannually (2)', value: '2' },
	{ label: 'Quarterly (4)', value: '4' },
	{ label: 'Monthly (12)', value: '12' }
];

/**
 * Price of a fixed-coupon bond: the present value of every coupon plus the present value of
 * the face value, both discounted at the yield per period. Current yield is the annual coupon
 * divided by the price.
 */
export default defineCalculator({
	meta,
	inputs: [
		{ id: 'face', label: 'Face value', type: 'number', default: 1000, min: 1, max: 1_000_000_000, step: 100, prefix: '$', help: 'Amount repaid at maturity.' },
		{ id: 'coupon', label: 'Annual coupon rate', type: 'number', default: 5, min: 0, max: 100, step: 0.1, suffix: '%', help: 'Interest the bond pays, as a share of face value.' },
		{ id: 'ytm', label: 'Yield to maturity', type: 'number', default: 6, min: 0, max: 100, step: 0.05, suffix: '%', help: 'Annual return a buyer requires.' },
		{ id: 'years', label: 'Years to maturity', type: 'number', default: 10, min: 1, max: 100, step: 1, decimal: false, suffix: 'years' },
		{ id: 'freq', label: 'Payments per year', type: 'select', display: 'menu', default: '2', options: frequencyOptions }
	],
	calculate(v): CalculationResult {
		const face = Number(v.face);
		const coupon = Number(v.coupon);
		const ytm = Number(v.ytm);
		const years = Number(v.years);
		const freq = Number(v.freq);

		if (
			!(face > 0) ||
			!(coupon >= 0 && coupon <= 100) ||
			!(ytm >= 0 && ytm <= 100) ||
			!(Number.isInteger(years) && years >= 1 && years <= 100) ||
			![1, 2, 4, 12].includes(freq)
		) {
			return { primaryResult: DASH, primaryLabel: 'Bond price', summary: 'Check the face value, rates, years and payment frequency.' };
		}

		const annualCoupon = (face * coupon) / 100;
		const couponPayment = annualCoupon / freq;
		const y = ytm / 100 / freq;
		const n = years * freq;

		const pvCoupons = y === 0 ? couponPayment * n : (couponPayment * (1 - Math.pow(1 + y, -n))) / y;
		const pvFace = face * Math.pow(1 + y, -n);
		const price = pvCoupons + pvFace;
		const currentYield = (annualCoupon / price) * 100;

		const diff = price - face;
		const status = Math.abs(diff) < 0.005 ? 'At par' : diff > 0 ? 'At a premium' : 'At a discount';
		const summary =
			status === 'At par'
				? 'Trades at par, because the coupon rate equals the yield.'
				: diff > 0
					? `Trades ${money(diff)} above face value, because the coupon rate is above the yield.`
					: `Trades ${money(-diff)} below face value, because the coupon rate is below the yield.`;

		return {
			primaryResult: money(price),
			primaryLabel: 'Bond price',
			summary,
			secondaryMetrics: [
				{ label: 'Annual coupon income', value: money(annualCoupon) },
				{ label: 'Coupon per payment', value: money(couponPayment) },
				{ label: 'PV of coupons', value: money(pvCoupons) },
				{ label: 'PV of face value', value: money(pvFace) },
				{ label: 'Current yield', value: `${num(currentYield, 2, 2)}%` },
				{ label: 'Market status', value: status }
			]
		};
	},
	content: {
		intro:
			'Use this bond calculator to find the price of a bond from its face value, coupon rate, yield to maturity and time left. It also shows whether the bond trades at a premium, at par or at a discount, and its current yield.',
		howTo: [
			'Enter the face value, the amount the bond repays at maturity.',
			'Enter the annual coupon rate and the yield to maturity you want to test.',
			'Enter the years to maturity and how many coupon payments are made each year.',
			'Read the bond price, then check the premium or discount and the current yield.'
		],
		about: [
			{
				heading: 'What is a bond?',
				paragraphs: [
					'A bond is a loan that you make to a government or a company. The issuer pays you regular interest, called coupons, and repays the face value (also called par value) on the maturity date.',
					'After a bond is issued, its price moves up and down in the market. The price depends on the interest rates that buyers can get elsewhere. This calculator shows what the price should be at a given yield.'
				]
			},
			{
				heading: 'How the bond price is calculated',
				paragraphs: [
					'A bond is worth the present value of everything it will pay. That means every coupon, plus the face value at the end. Each payment is discounted at the yield to maturity, which is the annual return a buyer requires.',
					'The calculator adds the two parts. If you want to learn how discounting works, see the [present value calculator](/present-value-calculator).'
				]
			},
			{
				heading: 'Why bond prices fall when yields rise',
				paragraphs: [
					'A bond pays a fixed coupon. If new bonds pay more, buyers will only pay less for yours. If new bonds pay less, yours becomes more valuable. The table below shows a 5% coupon bond with a face value of $1,000, 10 years left and coupons paid twice a year.'
				],
				table: {
					caption: '5% coupon, 10 years, $1,000 face value',
					columns: ['Yield to maturity', 'Bond price', 'Status'],
					rows: [
						['4%', '$1,081.76', 'Premium'],
						['5%', '$1,000.00', 'Par'],
						['6%', '$925.61', 'Discount'],
						['7%', '$857.88', 'Discount']
					]
				}
			},
			{
				heading: 'Time to maturity changes how sensitive a price is',
				paragraphs: [
					'Longer bonds move more when yields change, because their payments are further away. The table uses the same 5% coupon bond at two yields.'
				],
				table: {
					caption: '5% coupon bond, price at two yields',
					columns: ['Years to maturity', 'Price at 4% yield', 'Price at 7% yield'],
					rows: [
						['5', '$1,044.91', '$916.83'],
						['30', '$1,173.80', '$750.55']
					]
				}
			},
			{
				heading: 'What the other numbers mean',
				paragraphs: ['Bonds use some special terms. Here are the ones this calculator shows:'],
				list: [
					'**Coupon rate.** The yearly interest, as a share of face value. A 5% coupon on $1,000 pays $50 a year.',
					'**Yield to maturity.** The total yearly return if you buy at this price and hold to maturity. It is the discount rate in the formula.',
					'**Current yield.** The annual coupon divided by the price. It ignores the gain or loss at maturity.',
					'**Premium or discount.** A price above face value is a premium. A price below is a discount.'
				]
			},
			{
				heading: 'What this calculator assumes',
				paragraphs: [
					'The price is for a date right after a coupon payment, so there is no accrued interest. It assumes the issuer pays every coupon and the face value on time. Real bonds carry risk that the issuer does not pay, and prices also move with the market.',
					'Returns are not guaranteed, and past returns do not predict future ones. For other ways to measure a return, see the [IRR calculator](/irr-calculator) and the [average return calculator](/average-return-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Bond price',
				expression: 'Price = C × (1 − (1 + y)^(−N)) ÷ y + F × (1 + y)^(−N)',
				variables: [
					{ symbol: 'C', meaning: 'coupon per payment (face value × coupon rate ÷ payments per year)' },
					{ symbol: 'y', meaning: 'yield per period (yield to maturity ÷ payments per year)' },
					{ symbol: 'N', meaning: 'number of payments (years × payments per year)' },
					{ symbol: 'F', meaning: 'face value' }
				]
			},
			{
				title: 'Current yield',
				expression: 'Current yield = annual coupon ÷ price',
				variables: [{ symbol: 'annual coupon', meaning: 'face value × coupon rate' }]
			}
		],
		example: {
			title: '$1,000 face value, 5% coupon, 6% yield, 10 years, paid twice a year',
			steps: [
				'Coupon per payment: C = 1,000 × 5% ÷ 2 = $25',
				'Yield per period: y = 6% ÷ 2 = 3%, with N = 10 × 2 = 20 payments',
				'PV of coupons: $25 × (1 − 1.03⁻²⁰) ÷ 0.03 ≈ $371.94',
				'PV of face value: $1,000 × 1.03⁻²⁰ ≈ $553.68',
				'Price: $371.94 + $553.68 ≈ $925.61',
				'Current yield: $50 ÷ $925.61 ≈ 5.40%'
			],
			result: 'The bond is worth about $925.61, which is a $74.39 discount to face value, with a current yield of 5.40%.'
		},
		faq: [
			{
				q: 'How is a bond price calculated?',
				a: 'Discount each coupon and the face value back to today at the yield to maturity, then add them up. This bond calculator does that for you.'
			},
			{
				q: 'Why does a bond sell at a discount?',
				a: 'Its coupon rate is lower than the yield that buyers now require. So the price falls below face value until the total return matches the market yield.'
			},
			{
				q: 'What is the difference between coupon rate and yield to maturity?',
				a: 'The coupon rate is fixed and sets the interest paid. The yield to maturity is the total annual return you earn at the price you pay, including any gain or loss at maturity.'
			},
			{
				q: 'What is current yield?',
				a: 'It is the annual coupon divided by the bond price. It shows the income return only, and ignores the gain or loss when the bond matures.'
			},
			{
				q: 'Does this include accrued interest or taxes?',
				a: 'No. The price assumes a date just after a coupon payment. Accrued interest, taxes, trading costs and the risk that the issuer fails to pay are not included.'
			},
			{
				q: 'Are bonds a safe investment?',
				a: 'No investment is risk free. Bond prices move when rates change, and issuers can default. Risk differs a lot between bonds, so read the details of any bond you consider.'
			}
		],
		sources: [
			{ title: 'Investor.gov (U.S. SEC) — Bond', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/bond' },
			{ title: 'Investor.gov (U.S. SEC) — Yield (bonds)', url: 'https://www.investor.gov/introduction-investing/investing-basics/glossary/yield-bonds' }
		],
		disclaimer:
			'Estimates only. Investment returns are not guaranteed, and past returns do not predict future ones. Bond prices can fall and issuers can default. This tool is not financial advice.'
	}
});
