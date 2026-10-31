import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money } from '../format';
import meta from './hra-calculator.meta';
import {
	HRA_METRO_CITIES,
	HRA_METRO_PCT,
	HRA_OTHER_PCT,
	HRA_RENT_DEDUCT_PCT,
	IN_HRA_SOURCE,
	IN_TAX_YEAR_FULL
} from '../data/in-tax-fy2026-27';

const rupee = (n: number) => money(n, true);
const ok = (x: number) => Number.isFinite(x) && x >= 0;
const metroList = HRA_METRO_CITIES.join(', ');

function calculate(v: InputValues): CalculationResult {
	const basic = Number(v.basic);
	const hra = Number(v.hra);
	const rent = Number(v.rent);
	const months = Number(v.months);
	if (!(basic > 0) || !ok(hra) || !ok(rent) || !(months >= 1 && months <= 12) || !Number.isInteger(months)) {
		return { primaryResult: DASH, primaryLabel: 'HRA exemption per month', summary: 'Enter monthly basic + DA above zero, HRA and rent as zero or more, and 1 to 12 months.' };
	}
	const metro = v.city === 'metro';
	const pctShare = metro ? HRA_METRO_PCT : HRA_OTHER_PCT;
	const a = hra;
	const b = Math.max(0, rent - basic * HRA_RENT_DEDUCT_PCT);
	const c = basic * pctShare;
	const exempt = Math.min(a, b, c);
	const taxable = hra - exempt;
	const least = exempt === a ? 'the HRA you receive' : exempt === b ? 'rent paid minus 10% of basic + DA' : `${pctShare * 100}% of basic + DA`;
	return {
		primaryResult: rupee(exempt),
		primaryLabel: 'HRA exemption per month',
		summary: `The exemption is the least of three limits: ${least}. It applies to the old tax regime only.`,
		secondaryMetrics: [
			{ label: 'Taxable HRA per month', value: rupee(taxable) },
			{ label: `HRA exemption for ${months} months`, value: rupee(exempt * months) },
			{ label: `Taxable HRA for ${months} months`, value: rupee(taxable * months) },
			{ label: 'City rate', value: `${pctShare * 100}% of basic + DA` }
		],
		table: {
			title: 'The three limits (per month)',
			columns: [
				{ key: 'limit', label: 'Limit' },
				{ key: 'amount', label: 'Amount', align: 'end' }
			],
			rows: [
				{ limit: 'Actual HRA received', amount: rupee(a) },
				{ limit: 'Rent paid minus 10% of basic + DA', amount: rupee(b) },
				{ limit: `${pctShare * 100}% of basic + DA (${metro ? 'metro city' : 'other city'})`, amount: rupee(c) },
				{ limit: 'Exempt HRA (least of the three)', amount: rupee(exempt) },
				{ limit: 'Taxable HRA (HRA received minus exempt)', amount: rupee(taxable) }
			]
		}
	};
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'basic', label: 'Basic salary + DA (monthly)', type: 'number', default: 50_000, min: 0, max: 100_000_000, step: 500, prefix: '$', decimal: false, help: 'DA counts only if your terms of employment include it. Other allowances do not.' },
		{ id: 'hra', label: 'HRA received (monthly)', type: 'number', default: 20_000, min: 0, max: 100_000_000, step: 500, prefix: '$', decimal: false },
		{ id: 'rent', label: 'Rent paid (monthly)', type: 'number', default: 18_000, min: 0, max: 100_000_000, step: 500, prefix: '$', decimal: false },
		{
			id: 'city',
			label: 'City where you live',
			type: 'select',
			default: 'metro',
			display: 'menu',
			options: [
				{ label: `${metroList} (50%)`, value: 'metro' },
				{ label: 'Any other city (40%)', value: 'other' }
			]
		},
		{ id: 'months', label: 'Months rent was paid this year', type: 'number', default: 12, min: 1, max: 12, step: 1, decimal: false, suffix: 'months' }
	],
	calculate,
	content: {
		intro: `Use this HRA calculator to work out how much house rent allowance (HRA) you can claim as exempt for ${IN_TAX_YEAR_FULL}, and how much of it is taxable. HRA exemption is available only in the old tax regime.`,
		howTo: [
			'Enter your monthly basic salary plus DA, the HRA you receive and the rent you pay.',
			`Choose whether you live in one of the eight metro cities (${HRA_METRO_PCT * 100}%) or elsewhere (${HRA_OTHER_PCT * 100}%).`,
			'Read the exempt and taxable HRA, then use the exempt amount in the [India income tax calculator](/india-income-tax-calculator).'
		],
		about: [
			{
				heading: 'What is HRA?',
				paragraphs: [
					'House rent allowance (HRA) is a part of your salary that your employer pays to help with rent. It is taxable, but if you pay rent, you can claim part of it as exempt. The exempt part is not counted in your taxable income.',
					'This helps most when you rent a home and your salary has a large HRA component. If you don’t pay rent, the whole HRA is taxable. In the new regime, there is no HRA exemption at all.'
				]
			},
			{
				heading: 'How HRA exemption is calculated',
				paragraphs: [
					'The exempt amount is the least of three numbers. The first is the HRA you actually receive. The second is your rent minus 10% of your basic salary plus DA. The third is a share of your basic salary plus DA, which depends on your city.',
					`The share is ${HRA_METRO_PCT * 100}% in ${metroList}, and ${HRA_OTHER_PCT * 100}% everywhere else. The rule is in rule 279 of the Income-tax Rules, 2026. The calculator finds each limit for one month, and then multiplies by the months you paid rent.`,
					'Basic salary here means basic plus dearness allowance (DA), where your terms of employment provide for it. Other allowances and perks are left out.'
				]
			},
			{
				heading: 'Which limit decides your exemption?',
				paragraphs: [
					'It can be any of the three. Each row below uses a basic + DA of ₹50,000 a month, so you can see which limit applies as the HRA, rent and city change. In short, the lowest number always wins.'
				],
				table: {
					caption: 'Monthly exempt HRA, basic + DA ₹50,000',
					columns: ['Situation', 'Limit that decides', 'Exempt HRA', 'Taxable HRA'],
					rows: [
						['HRA ₹20,000, rent ₹18,000, metro', 'Rent minus 10% of basic', '₹13,000', '₹7,000'],
						['HRA ₹30,000, rent ₹30,000, metro', '50% of basic', '₹25,000', '₹5,000'],
						['HRA ₹30,000, rent ₹30,000, other city', '40% of basic', '₹20,000', '₹10,000'],
						['HRA ₹20,000, rent ₹8,000, metro', 'Rent minus 10% of basic', '₹3,000', '₹17,000'],
						['HRA ₹20,000, no rent paid', 'Rent minus 10% of basic', '₹0', '₹20,000']
					]
				}
			},
			{
				heading: 'HRA and the tax regimes',
				paragraphs: [
					'HRA exemption can be claimed only in the old regime. In the new regime, the whole HRA is taxable, but the tax slabs are lower.',
					'So the right choice depends on your numbers. A large HRA exemption, plus other deductions like 80C, can make the old regime cheaper. Compare both in the [India income tax calculator](/india-income-tax-calculator), and see how your take-home changes in the [in-hand salary calculator](/in-hand-salary-calculator).'
				]
			},
			{
				heading: 'Tips for claiming HRA',
				paragraphs: ['A few simple habits protect your claim:'],
				list: [
					'**Keep rent proof.** Rent receipts or a rent agreement help if your employer or the tax office asks.',
					'**Use only basic and DA.** Special allowances and bonuses don’t count in the calculation.',
					'**Count only the months you paid rent.** The calculator has a field for this, in case you moved or changed jobs.',
					'**Check your city.** The 50% share applies only to the eight metro cities in the rule.',
					'**Combine with other deductions.** Home loan interest, 80C and 80D can add to HRA in the old regime. Look at [PPF](/ppf-calculator) and [NPS](/nps-calculator) for ideas.'
				]
			}
		],
		formulas: [
			{
				title: 'HRA exemption (Income-tax Rules, 2026, rule 279)',
				expression: 'Exempt HRA = least of (A, B, C)',
				variables: [
					{ symbol: 'A', meaning: 'HRA actually received' },
					{ symbol: 'B', meaning: 'Rent paid − 10% of basic + DA (zero if negative)' },
					{ symbol: 'C', meaning: `50% of basic + DA in ${metroList}; 40% elsewhere` }
				]
			}
		],
		example: {
			title: 'Basic + DA ₹50,000, HRA ₹20,000, rent ₹18,000, metro city',
			steps: [
				'A = ₹20,000',
				'B = ₹18,000 − ₹5,000 = ₹13,000',
				'C = 50% × ₹50,000 = ₹25,000',
				'Exempt = ₹13,000 a month, taxable HRA = ₹7,000 a month'
			],
			result: 'Exempt ₹13,000 a month (₹1,56,000 for 12 months).'
		},
		faq: [
			{
				q: 'How is HRA exemption calculated?',
				a: 'It is the least of three amounts: the HRA you receive, your rent minus 10% of basic plus DA, and 50% (metro) or 40% (other cities) of basic plus DA. This calculator finds all three.'
			},
			{
				q: 'Which cities count as metro for HRA?',
				a: `From 1 April 2026 the ${HRA_METRO_PCT * 100}% rate applies to ${metroList}. Hyderabad, Pune, Ahmedabad and Bengaluru were added to the older four. All other places use ${HRA_OTHER_PCT * 100}%.`
			},
			{
				q: 'Is HRA exempt in the new tax regime?',
				a: 'No. HRA exemption can be claimed only in the old regime. In the new regime the whole HRA is taxable.'
			},
			{
				q: 'What counts as salary for HRA?',
				a: 'Basic salary plus dearness allowance where your terms of employment provide for it. Other allowances and perks are left out.'
			},
			{
				q: 'Can I claim HRA if I live in my own house?',
				a: 'No exemption applies if you pay no rent. The rule gives an exemption only on rent you actually pay.'
			}
		],
		sources: [IN_HRA_SOURCE],
		disclaimer: 'Estimate only. You need rent proof and, in some cases, landlord details to claim HRA. Confirm with a tax professional.'
	}
});
