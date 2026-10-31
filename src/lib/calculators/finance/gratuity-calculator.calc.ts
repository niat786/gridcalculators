import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, moneyIn } from '../format';
import meta from './gratuity-calculator.meta';
import {
	GRATUITY_CAP,
	GRATUITY_DAYS_PER_YEAR,
	GRATUITY_DIVISOR_COVERED,
	GRATUITY_DIVISOR_NOT_COVERED,
	GRATUITY_MIN_YEARS,
	GRATUITY_MIN_YEARS_FIXED_TERM,
	IN_GRATUITY_TAX_FAQ_SOURCE,
	IN_LABOUR_FAQ_SOURCE,
	IN_SALARY_DEDUCTIONS_SOURCE
} from '../data/in-tax-fy2026-27';

const capLakh = GRATUITY_CAP / 100_000;
const inr = (n: number) => moneyIn('INR', n, true);

function calculate(v: InputValues): CalculationResult {
	const wages = Number(v.wages);
	const years = Number(v.years);
	const months = Number(v.months);
	const received = Number(v.received);
	if (!(wages > 0) || !Number.isInteger(years) || !Number.isInteger(months) || years < 0 || months < 0 || months > 11 || years + months <= 0 || !(received >= 0)) {
		return { primaryResult: DASH, primaryLabel: 'Gratuity', summary: 'Enter monthly wages above zero, whole years (0 or more) and months (0 to 11) of service, and a received amount of zero or more.' };
	}
	const covered = v.coverage === 'covered';
	const fixedTerm = v.employment === 'fixed';
	const death = Boolean(v.death);
	const totalMonths = years * 12 + months;
	// Covered: completed years plus a part-year of MORE than six months. Not covered (tax rule): completed years only.
	const counted = covered ? years + (months > 6 ? 1 : 0) : years;
	const minMonths = (fixedTerm ? GRATUITY_MIN_YEARS_FIXED_TERM : GRATUITY_MIN_YEARS) * 12;
	const eligible = !covered || death || totalMonths >= minMonths;
	const formula = (wages * GRATUITY_DAYS_PER_YEAR * counted) / (covered ? GRATUITY_DIVISOR_COVERED : GRATUITY_DIVISOR_NOT_COVERED);
	const payable = covered ? Math.min(formula, GRATUITY_CAP) : formula;
	const paid = received > 0 ? received : eligible ? payable : 0;
	const taxFree = eligible ? Math.min(paid, formula, GRATUITY_CAP) : 0;
	const taxable = Math.max(0, paid - taxFree);

	const metrics = [
		{ label: 'Years counted', value: `${counted}` },
		{ label: 'Formula', value: covered ? `Wages × 15 ÷ 26 × ${counted}` : `Wages × 15 ÷ 30 × ${counted}` },
		{ label: 'Tax-free part', value: money(taxFree) },
		{ label: 'Taxable part', value: money(taxable) },
		{ label: `Eligibility`, value: covered ? (eligible ? 'Eligible' : `Needs ${fixedTerm ? '1 year' : `${GRATUITY_MIN_YEARS} years`}`) : 'Set by your employer' }
	];
	if (!eligible) {
		return {
			primaryResult: money(0),
			primaryLabel: 'Gratuity payable',
			summary: `Not yet eligible: ${fixedTerm ? 'fixed-term employees need 1 year' : `you need ${GRATUITY_MIN_YEARS} years`} of continuous service, unless leaving due to death or disablement. The formula would give ${money(payable)}.`,
			secondaryMetrics: metrics
		};
	}
	return {
		primaryResult: money(received > 0 ? received : payable),
		primaryLabel: received > 0 ? 'Gratuity received' : 'Gratuity payable',
		summary: covered
			? `${money(wages)} × 15 ÷ 26 × ${counted} years = ${money(formula)}${formula > GRATUITY_CAP ? `, limited to the ₹${capLakh} lakh maximum` : ''}.`
			: `Half a month's wages for each of ${counted} completed years = ${money(formula)}. The tax-free limit is ₹${capLakh} lakh.`,
		secondaryMetrics: metrics
	};
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'wages', label: 'Last drawn monthly wages (basic + DA)', type: 'number', default: 50_000, min: 0, max: 100_000_000, step: 500, prefix: '$', decimal: false, help: 'Under the Code on Wages, if allowances exceed 50% of total pay the excess is added to wages. Enter the wage figure your employer uses.' },
		{ id: 'years', label: 'Years of service', type: 'number', default: 10, min: 0, max: 60, step: 1, decimal: false, suffix: 'years', width: 'half' },
		{ id: 'months', label: 'Extra months', type: 'number', default: 7, min: 0, max: 11, step: 1, decimal: false, suffix: 'months', width: 'half' },
		{ id: 'coverage', label: 'Is your employer covered?', type: 'select', default: 'covered', display: 'segmented', options: [{ label: 'Covered', value: 'covered' }, { label: 'Not covered', value: 'not' }], help: 'Covered usually means an establishment with 10 or more employees (factories, mines, shops and others).' },
		{ id: 'employment', label: 'Employment type', type: 'select', default: 'permanent', display: 'segmented', options: [{ label: 'Permanent', value: 'permanent' }, { label: 'Fixed-term', value: 'fixed' }], visibleWhen: (v) => v.coverage === 'covered' },
		{ id: 'death', label: 'Leaving due to death or disablement', type: 'toggle', default: false, visibleWhen: (v) => v.coverage === 'covered', help: 'The minimum service period does not apply.' },
		{ id: 'received', label: 'Gratuity actually received (optional)', type: 'number', default: 0, min: 0, max: 10_000_000_000, step: 1000, prefix: '$', decimal: false, help: 'Leave at 0 to use the formula amount. Used to split tax-free and taxable.' }
	],
	calculate,
	content: {
		intro: `Use this gratuity calculator to work out the gratuity you can get in India from your last drawn wages and years of service. It applies the ${GRATUITY_DAYS_PER_YEAR}/${GRATUITY_DIVISOR_COVERED} formula (${GRATUITY_DAYS_PER_YEAR}/${GRATUITY_DIVISOR_NOT_COVERED} if your employer is not covered), the ₹${capLakh} lakh cap and the ${GRATUITY_MIN_YEARS}-year rule.`,
		howTo: [
			'Enter your last drawn monthly basic + DA and your service in years and months.',
			'Choose whether your employer is covered, and the employment type.',
			'Read the gratuity, the tax-free part and the taxable part. Add the amount you actually received to test it against the limit.'
		],
		about: [
			{
				heading: 'What is gratuity?',
				paragraphs: [
					'Gratuity is a lump sum your employer pays to thank you for long service. You usually get it when you leave the job, retire or resign, after you complete the minimum years of service.',
					`Today, gratuity falls under the Code on Social Security, 2020, which came into force on 21 November 2025. It carries forward the older Payment of Gratuity Act formula. The maximum is ${inr(GRATUITY_CAP)}.`
				]
			},
			{
				heading: 'How gratuity is calculated',
				paragraphs: [
					`For a covered employer, gratuity is your last drawn monthly wages × ${GRATUITY_DAYS_PER_YEAR} ÷ ${GRATUITY_DIVISOR_COVERED} × years of service. Wages mean basic salary plus dearness allowance (DA). The 26 stands for working days in a month, and the 15 is the days of wages paid for each year.`,
					'Years of service are the completed years. If the extra period is more than six months, it counts as one more year. So 10 years and 7 months count as 11 years, but 10 years and 6 months count as 10.',
					`If your employer is not covered, the tax rule uses half a month’s wages (${GRATUITY_DAYS_PER_YEAR}/${GRATUITY_DIVISOR_NOT_COVERED}) for each completed year, and no part-year is counted.`
				]
			},
			{
				heading: 'What gratuity looks like at different service lengths',
				paragraphs: [
					'The table uses last drawn wages of ₹50,000 a month and a covered employer. The amount grows in step with your years of service.'
				],
				table: {
					caption: 'Covered employer, wages ₹50,000 a month',
					columns: ['Service', 'Years counted', 'Gratuity'],
					rows: [
						['5 years', '5', '₹1,44,230.77'],
						['10 years 6 months', '10', '₹2,88,461.54'],
						['10 years 7 months', '11', '₹3,17,307.69'],
						['20 years', '20', '₹5,76,923.08'],
						['30 years', '30', '₹8,65,384.62']
					]
				}
			},
			{
				heading: 'Who gets gratuity, and when?',
				paragraphs: [
					`A covered employee needs ${GRATUITY_MIN_YEARS} years of continuous service. The ${GRATUITY_MIN_YEARS}-year rule does not apply if you leave because of death or disablement. Fixed-term employees qualify after ${GRATUITY_MIN_YEARS_FIXED_TERM} year.`,
					'Covered usually means an establishment with 10 or more employees, such as factories, mines and shops. If your employer is not covered, your gratuity depends on your employment terms.',
					'The calculator shows ₹0 and a note when you have not yet reached the minimum. Courts have sometimes counted 4 years and 240 days as a full 5 years, but this tool uses the plain five-year rule.'
				]
			},
			{
				heading: 'Is gratuity taxable?',
				paragraphs: [
					`Gratuity is tax-free up to the least of three amounts: what you received, the formula amount and ${inr(GRATUITY_CAP)}. Anything above that is taxable as salary. Government employees’ gratuity is fully exempt.`,
					'For example, if your wages are ₹3,00,000 a month and you serve 30 years, the formula gives ₹51,92,307.69. The maximum payable and the tax-free limit are both ₹20 lakh, so the calculator shows ₹20,00,000.',
					'Enter the amount you actually got in the optional field to see the tax-free and taxable parts. Then use the [India income tax calculator](/india-income-tax-calculator) to see how a taxable part adds to your tax.'
				]
			},
			{
				heading: 'Tips about gratuity',
				paragraphs: ['A few points can help you plan:'],
				list: [
					'**Check the wage definition.** Your employer’s wage figure may differ from your basic. Enter the figure your employer uses.',
					'**Know your CTC.** Many CTCs include a gratuity provision, but you get it only after the qualifying service. See the [in-hand salary calculator](/in-hand-salary-calculator).',
					'**Plan the next step.** Gratuity is a lump sum. For retirement, compare the [EPF calculator](/epf-calculator) and [NPS calculator](/nps-calculator).',
					'**Invest wisely.** If you need a regular income from the lump sum, try the [SWP calculator](/swp-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Covered employees',
				expression: 'Gratuity = Last drawn wages × 15 ÷ 26 × Years of service',
				variables: [
					{ symbol: 'Years of service', meaning: 'Completed years, plus one more if the extra period is more than six months' },
					{ symbol: '26', meaning: 'Working days in a month' }
				]
			},
			{
				title: 'Not covered (tax-free limit)',
				expression: 'Gratuity = Wages × 15 ÷ 30 × Completed years',
				variables: [{ symbol: 'Cap', meaning: `Maximum ₹${capLakh} lakh tax-free across all employers` }]
			}
		],
		example: {
			title: 'Wages ₹50,000, service 10 years 7 months, covered',
			steps: ['Years counted: 10 + 1 (7 months is more than six) = 11', '₹50,000 × 15 ÷ 26 × 11 = ₹3,17,307.69'],
			result: 'Gratuity ₹3,17,307.69, fully tax-free (below ₹20 lakh).'
		},
		faq: [
			{
				q: 'How is gratuity calculated in India?',
				a: 'Multiply your last drawn monthly wages (basic + DA) by 15, divide by 26, and multiply by your years of service. A part-year over six months counts as a full year.'
			},
			{
				q: 'Is five years of service always needed?',
				a: 'Not for death or disablement. Fixed-term employees qualify after one year. Some courts have also counted 4 years and 240 days; this tool uses the plain five-year rule.'
			},
			{
				q: 'Which law applies now?',
				a: 'Gratuity is now under the Code on Social Security, 2020 (in force from 21 November 2025), which carries the Payment of Gratuity Act formula forward. The ₹20 lakh maximum is unchanged.'
			},
			{
				q: 'How much gratuity is tax-free?',
				a: `The least of the gratuity received, the formula amount and ₹${capLakh} lakh. Government employees' gratuity is fully exempt. For employers not covered, the tax rule uses the average of the last 10 months' salary, so this tool is an estimate.`
			},
			{
				q: 'What is the maximum gratuity?',
				a: `The maximum is ${inr(GRATUITY_CAP)}. If the formula gives more, the calculator limits the amount to this.`
			}
		],
		sources: [IN_LABOUR_FAQ_SOURCE, IN_GRATUITY_TAX_FAQ_SOURCE, IN_SALARY_DEDUCTIONS_SOURCE],
		disclaimer: 'Estimate only. Your employer\'s actual wage definition and scheme rules decide the final amount. Not tax advice.'
	}
});
