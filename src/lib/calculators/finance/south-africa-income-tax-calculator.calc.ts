import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './south-africa-income-tax-calculator.meta';
import {
	SARS_EMPLOYER_GUIDE_SOURCE,
	SARS_RATES_SOURCE,
	ZA_BRACKETS,
	ZA_MEDICAL_CREDIT_FIRST_DEPENDANT,
	ZA_MEDICAL_CREDIT_MAIN,
	ZA_MEDICAL_CREDIT_OTHER_DEPENDANT,
	ZA_REBATE_PRIMARY,
	ZA_REBATE_SECONDARY,
	ZA_REBATE_TERTIARY,
	ZA_RETIREMENT_CAP,
	ZA_RETIREMENT_RATE,
	ZA_THRESHOLDS,
	ZA_TAX_YEAR_LABEL,
	ZA_TAX_YEAR_SHORT,
	zaIncomeTax,
	zaThreshold,
	type ZaAge
} from '../data/za-2026-27';

/** Content is built before a currency is chosen, so format rand explicitly. */
const zar = (n: number) => moneyIn('ZAR', n, true);
const pc = (x: number) => `${+(x * 100).toFixed(2)}%`;
function bracketRows(): string[][] {
	return ZA_BRACKETS.map((b) => [b.upTo === Infinity ? `${zar(b.from + 1)} and above` : `${zar(b.from + 1)} to ${zar(b.upTo)}`, pc(b.rate), zar(b.base)]);
}

export const AGE_OPTIONS = [
	{ label: 'Under 65', value: 'under65' },
	{ label: '65 to 74', value: '65to74' },
	{ label: '75 or older', value: '75plus' }
];

export function isAge(v: unknown): v is ZaAge {
	return v === 'under65' || v === '65to74' || v === '75plus';
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'income', label: 'Annual taxable income', type: 'number', default: 500000, min: 0, max: 1_000_000_000, step: 10000, prefix: '$', suffix: '/yr', help: 'Income after deductions such as retirement fund contributions.' },
		{ id: 'age', label: 'Your age on 28 February 2027', type: 'select', display: 'segmented', default: 'under65', options: AGE_OPTIONS },
		{ id: 'members', label: 'Medical scheme members', type: 'number', default: 0, min: 0, max: 20, decimal: false, help: 'You plus every dependant on your scheme. Use 0 if you have no medical scheme.' }
	],
	calculate(v): CalculationResult {
		const income = Number(v.income);
		const members = Number(v.members);
		const age = v.age;
		if (!Number.isFinite(income) || income < 0 || !isAge(age) || !Number.isFinite(members) || members < 0 || members > 20) {
			return { primaryResult: DASH, primaryLabel: 'Income tax payable', summary: 'Enter taxable income of zero or more, pick your age group, and use 0 to 20 medical scheme members.' };
		}
		const r = zaIncomeTax(income, age, Math.floor(members));
		const rate = Math.round(r.bracketRate * 100);
		const summary =
			r.tax === 0
				? `Your rebates${r.medicalCredit > 0 ? ' and medical credit' : ''} cover all the tax on ${money(income)}, so no income tax is payable. The tax threshold for your age is ${money(zaThreshold(age))}.`
				: `Your income falls in the ${rate}% bracket. After rebates${r.medicalCredit > 0 ? ' and the medical credit' : ''} you pay ${money(r.tax)} for the ${ZA_TAX_YEAR_SHORT} tax year, which is ${pct(r.averageRate * 100, 2)} of your taxable income.`;
		return {
			primaryResult: money(r.tax),
			primaryLabel: 'Income tax payable for the year',
			summary,
			secondaryMetrics: [
				{ label: 'Average tax rate', value: pct(r.averageRate * 100, 2) },
				{ label: 'Marginal tax rate', value: pct(r.marginalRate * 100, 0) },
				{ label: 'Tax before rebates', value: money(r.taxBeforeRebates) },
				{ label: 'Rebates', value: money(r.rebates) },
				{ label: 'Medical scheme fees tax credit', value: money(r.medicalCredit) },
				{ label: 'Tax per month', value: money(r.tax / 12) },
				{ label: 'Tax threshold (before medical credit)', value: money(zaThreshold(age)) }
			],
			table: {
				title: `${ZA_TAX_YEAR_SHORT} tax brackets`,
				collapsed: true,
				columns: [
					{ key: 'range', label: 'Taxable income' },
					{ key: 'rate', label: 'Rate', align: 'end' },
					{ key: 'base', label: 'Tax at start of bracket', align: 'end' }
				],
				rows: ZA_BRACKETS.map((b) => ({
					range: b.upTo === Infinity ? `${money(b.from + 1, true)} and above` : `${money(b.from + 1, true)} to ${money(b.upTo, true)}`,
					rate: pct(b.rate * 100, 0),
					base: money(b.base, true)
				}))
			}
		};
	},
	content: {
		intro: `Work out your South African income tax for the ${ZA_TAX_YEAR_LABEL}. This South Africa income tax calculator applies the SARS brackets, the rebate for your age and the medical scheme fees tax credit.`,
		howTo: [
			'Enter your annual taxable income, which is your income after deductions such as retirement fund contributions.',
			'Choose your age group (your age on 28 February 2027) so the right rebates apply.',
			'Add the number of people on your medical scheme (you plus dependants) to include the monthly tax credit.',
			'Read your tax, your average rate and your marginal rate.'
		],
		about: [
			{
				heading: `How South African income tax works in ${ZA_TAX_YEAR_SHORT}`,
				paragraphs: [
					`The ${ZA_TAX_YEAR_LABEL} runs from 1 March 2026 to 28 February 2027. SARS calls it the 2027 year of assessment. The tool works out your normal tax for that year.`,
					'First, the brackets give you a tax amount on your taxable income. Next, your rebates come off that amount. Then the medical scheme fees tax credit comes off. Your tax can fall to zero but never below it.',
					'The brackets are progressive. Only the slice of income inside each bracket pays that bracket’s rate.'
				]
			},
			{
				heading: `Tax brackets for ${ZA_TAX_YEAR_SHORT}`,
				paragraphs: ['The table shows the tax on your income before any rebates. The last column is the tax on all income below the start of each bracket.'],
				table: { caption: `Rates for individuals, ${ZA_TAX_YEAR_SHORT}`, columns: ['Taxable income', 'Rate on the slice', 'Tax at the start of the bracket'], rows: bracketRows() }
			},
			{
				heading: 'Rebates and the tax-free threshold',
				paragraphs: [
					`Everyone gets a primary rebate of ${zar(ZA_REBATE_PRIMARY)}. If you are 65 or older, you also get a secondary rebate of ${zar(ZA_REBATE_SECONDARY)}. At 75 or older, a tertiary rebate of ${zar(ZA_REBATE_TERTIARY)} is added on top.`,
					`Your age is measured on the last day of the tax year, 28 February 2027. The rebates mean no tax is payable below a threshold: ${zar(ZA_THRESHOLDS.under65)} if you are under 65, ${zar(ZA_THRESHOLDS.age65)} from 65 to 74, and ${zar(ZA_THRESHOLDS.age75)} from 75.`
				]
			},
			{
				heading: 'Medical scheme fees tax credit',
				paragraphs: [
					`If you belong to a medical scheme, you get a monthly credit. It is ${zar(ZA_MEDICAL_CREDIT_MAIN)} for the main member, ${zar(ZA_MEDICAL_CREDIT_FIRST_DEPENDANT)} for the first dependant and ${zar(ZA_MEDICAL_CREDIT_OTHER_DEPENDANT)} for each extra dependant.`,
					'The tool multiplies the monthly credit by 12. It cannot take your tax below zero. Enter 0 members if you have no medical scheme.'
				]
			},
			{
				heading: 'What this calculator leaves out',
				paragraphs: [
					`Enter your taxable income, which is income after your own deductions. For retirement contributions, the usual limit is ${pc(ZA_RETIREMENT_RATE)} of pay, up to ${zar(ZA_RETIREMENT_CAP)} a year, so apply that first.`
				],
				list: [
					'The additional medical expenses tax credit.',
					'Capital gains, and tax on lump sums.',
					'Interest and dividend exemptions.',
					'Taxable fringe benefits and travel allowances.'
				]
			},
			{
				heading: 'Related tools',
				paragraphs: [
					'To see your monthly pay after PAYE and UIF, use the [South Africa take-home pay calculator](/south-africa-take-home-pay-calculator). If you are buying a home, the [transfer duty calculator](/transfer-duty-calculator) shows the SARS duty on the purchase.',
					'To plan your savings, try the [retirement calculator](/retirement-calculator) and the [savings calculator](/savings-calculator). The [salary calculator](/salary-calculator) converts your pay between yearly, monthly and hourly amounts.'
				]
			}
		],
		formulas: [
			{
				title: 'Normal tax',
				expression: 'Tax = max(0, bracket tax − rebates − medical credit × 12)',
				variables: [
					{ symbol: 'Bracket tax', meaning: ZA_BRACKETS.map((b) => (b.upTo === Infinity ? `${pc(b.rate)} above ${zar(b.from)}` : `${pc(b.rate)} to ${zar(b.upTo)}`)).join('; ') },
					{ symbol: 'Rebates', meaning: `Primary ${zar(ZA_REBATE_PRIMARY)}; plus ${zar(ZA_REBATE_SECONDARY)} at 65 or older; plus ${zar(ZA_REBATE_TERTIARY)} at 75 or older` },
					{ symbol: 'Medical credit', meaning: `${zar(ZA_MEDICAL_CREDIT_MAIN)} a month for you, ${zar(ZA_MEDICAL_CREDIT_FIRST_DEPENDANT)} for the first dependant and ${zar(ZA_MEDICAL_CREDIT_OTHER_DEPENDANT)} for each extra dependant` }
				]
			}
		],
		example: {
			title: 'R500,000 taxable income, under 65, no medical scheme',
			steps: [
				'The income falls in the 31% bracket: R79,998 + 31% × (R500,000 − R383,100) = R116,237.',
				'Less the primary rebate of R17,820.',
				'Tax payable = R116,237 − R17,820 = R98,417.'
			],
			result: 'Income tax of R98,417 a year, an average rate of 19.68%.'
		},
		faq: [
			{ q: 'How do I calculate income tax in South Africa?', a: `Find the tax on your taxable income from the SARS brackets. Subtract your age rebates and then your medical credit. This South Africa income tax calculator does that for the ${ZA_TAX_YEAR_SHORT} tax year.` },
			{ q: 'What is the tax-free threshold in 2026/27?', a: `${zar(ZA_THRESHOLDS.under65)} if you are under 65, ${zar(ZA_THRESHOLDS.age65)} from 65 to 74 and ${zar(ZA_THRESHOLDS.age75)} from 75. Medical scheme credits raise your effective threshold further.` },
			{ q: 'Which age counts for the rebates?', a: 'Your age on the last day of the tax year, 28 February 2027. If you turn 65 or 75 by then, you get the extra rebate for the whole year.' },
			{ q: 'What is the difference between average and marginal rate?', a: 'The average rate is your total tax divided by your taxable income. The marginal rate is the rate on your next rand of income. The marginal rate is usually higher.' },
			{ q: 'How does this differ from my payslip?', a: 'Your employer uses SARS PAYE tables each month. To see monthly pay after UIF and PAYE, use the [take-home pay calculator](/south-africa-take-home-pay-calculator).' },
			{ q: 'What does this calculator leave out?', a: 'It does not include the additional medical expenses credit, capital gains, interest and dividend exemptions or lump-sum tax. Enter income after your own deductions.' }
		],
		sources: [SARS_RATES_SOURCE, SARS_EMPLOYER_GUIDE_SOURCE],
		disclaimer: 'An estimate of normal tax for the 2026/27 tax year, not tax advice. Your SARS assessment may differ.'
	}
});
