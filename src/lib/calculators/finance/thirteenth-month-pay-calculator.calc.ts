import { defineCalculator, type CalculationResult, type CalculatorInput, type InputValues } from '../types';
import { DASH, money, moneyIn, num } from '../format';
import meta from './thirteenth-month-pay-calculator.meta';
import {
	PH_13TH_DEADLINE,
	PH_13TH_DIVISOR,
	PH_13TH_MIN_MONTHS,
	PH_13TH_SOURCE,
	PH_13TH_SOURCE_2,
	PH_BONUS_EXEMPTION,
	PH_TAX_SOURCE
} from '../data/ph-2026';

const cents = (n: number) => Math.round(n * 100) / 100;
const peso = (n: number) => money(n);
const php = (n: number) => moneyIn('PHP', n, true);

const inputs: CalculatorInput[] = [
	{
		id: 'mode',
		label: 'How to enter your pay',
		type: 'select',
		default: 'monthly',
		display: 'segmented',
		options: [
			{ label: 'Same monthly salary', value: 'monthly' },
			{ label: 'Total for the year', value: 'total' }
		]
	},
	{ id: 'basic', label: 'Monthly basic salary', type: 'number', default: 25_000, min: 0, max: 100_000_000, step: 500, prefix: '$', visibleWhen: (v) => v.mode === 'monthly', help: 'Basic pay only. Overtime, holiday pay, night differential and COLA are left out.' },
	{ id: 'months', label: 'Months worked this year', type: 'number', default: 12, min: 0, max: 12, step: 0.5, suffix: 'months', visibleWhen: (v) => v.mode === 'monthly', help: 'Use a part-month such as 8.5 if you joined or left mid-month.' },
	{ id: 'total', label: 'Total basic salary earned this year', type: 'number', default: 300_000, min: 0, max: 1_000_000_000, step: 1000, prefix: '$', visibleWhen: (v) => v.mode === 'total', help: 'January to December, basic pay only. Use this if your pay changed during the year.' },
	{ id: 'other', label: 'Other bonuses and benefits this year', type: 'number', default: 0, min: 0, max: 1_000_000_000, step: 1000, prefix: '$', help: 'Christmas bonus, productivity incentive and similar. They share the ₱90,000 tax-free limit.' }
];

function calculate(v: InputValues): CalculationResult {
	const other = Number(v.other);
	const monthly = v.mode === 'monthly';
	let earned: number;
	let months = NaN;
	if (monthly) {
		const basic = Number(v.basic);
		months = Number(v.months);
		if (!Number.isFinite(basic) || basic < 0 || !Number.isFinite(months) || months < 0 || months > 12) {
			return { primaryResult: DASH, primaryLabel: '13th month pay', summary: 'Enter a monthly basic salary of zero or more and months worked from 0 to 12.' };
		}
		earned = cents(basic * months);
	} else {
		earned = Number(v.total);
		if (!Number.isFinite(earned) || earned < 0) {
			return { primaryResult: DASH, primaryLabel: '13th month pay', summary: 'Enter the total basic salary earned this year as zero or more.' };
		}
	}
	if (!Number.isFinite(other) || other < 0) {
		return { primaryResult: DASH, primaryLabel: '13th month pay', summary: 'Enter other bonuses as zero or more.' };
	}

	const notEntitled = monthly && months < PH_13TH_MIN_MONTHS;
	const pay = notEntitled ? 0 : cents(earned / PH_13TH_DIVISOR);
	const benefits = pay + other;
	const exempt = Math.min(benefits, PH_BONUS_EXEMPTION);
	const taxable = benefits - exempt;
	const room = PH_BONUS_EXEMPTION - exempt;

	const summary = notEntitled
		? `With less than ${PH_13TH_MIN_MONTHS} month of service in the year, the law does not require a 13th month pay.`
		: `${peso(earned)} of basic salary earned ÷ ${PH_13TH_DIVISOR} = ${peso(pay)}, due by ${PH_13TH_DEADLINE}.` +
			(taxable > 0 ? ` ${peso(taxable)} of your bonuses is above the ${money(PH_BONUS_EXEMPTION, true)} limit and is taxable.` : ` All of it is within the ${money(PH_BONUS_EXEMPTION, true)} tax-free limit.`);

	return {
		primaryResult: peso(pay),
		primaryLabel: '13th month pay',
		summary,
		secondaryMetrics: [
			{ label: 'Basic salary earned in the year', value: peso(earned) },
			{ label: 'Months worked', value: monthly ? num(months, 2) : 'Entered as a total' },
			{ label: '13th month pay plus other bonuses', value: peso(benefits) },
			{ label: 'Tax-free part', value: peso(exempt) },
			{ label: 'Taxable part', value: peso(taxable) },
			{ label: 'Tax-free limit still unused', value: peso(room) }
		]
	};
}

export default defineCalculator({
	meta,
	inputs,
	calculate,
	content: {
		intro: `Work out your 13th month pay in the Philippines under Presidential Decree 851. It is one-twelfth of the basic salary you earned in the calendar year, and it is tax-free together with other bonuses up to ${php(PH_BONUS_EXEMPTION)}.`,
		howTo: [
			'Choose to enter a monthly salary and months worked, or the total basic salary earned this year.',
			'Enter your monthly basic pay and the months you worked. Use the yearly total instead if your pay changed during the year.',
			'Add any other bonuses and benefits you receive this year.',
			'Read your 13th month pay and how much of your bonuses is tax-free or taxable.'
		],
		about: [
			{
				heading: 'What is the 13th month pay?',
				paragraphs: [
					'The 13th month pay is a yearly benefit that most private-sector employees in the Philippines must receive. It comes from Presidential Decree 851, and the Department of Labor and Employment (DOLE) set the rules for it in its guidelines.',
					`The law sets a minimum. Your employer must pay at least one-twelfth of the basic salary you earned in the calendar year, and must pay it by ${PH_13TH_DEADLINE}. Your contract or company practice can give you more.`
				]
			},
			{
				heading: 'How the 13th month pay is calculated',
				paragraphs: [
					`Add up the basic salary you earned from January to December, then divide by ${PH_13TH_DIVISOR}. If you earn the same pay for all 12 months, the result equals one month of basic salary.`,
					`If you joined or left during the year, you get a pro-rated amount. The tool only counts salary you actually earned, so it adjusts by itself. You need at least ${PH_13TH_MIN_MONTHS} month of service in the year to be entitled.`,
					`For example, DOLE’s own guideline example is an employee who worked 9 months at ${php(9000)}. That is ${php(81000)} earned, and ${php(81000)} ÷ ${PH_13TH_DIVISOR} gives ${php(6750)}.`
				]
			},
			{
				heading: 'What counts as basic salary?',
				paragraphs: [
					'Basic salary is your regular pay for the work you do. Some payments are left out unless your pay terms treat them as part of basic pay. This is why two people with the same total income can get different amounts.'
				],
				list: [
					'Overtime pay and premium pay are not included.',
					'Night shift differential and holiday pay are not included.',
					'Cost of living allowance (COLA) is not included.',
					'Cash value of unused leave is not included.'
				]
			},
			{
				heading: `Is the 13th month pay taxed? The ${php(PH_BONUS_EXEMPTION)} limit`,
				paragraphs: [
					`Your 13th month pay and other benefits, such as a Christmas bonus, are tax-free up to ${php(PH_BONUS_EXEMPTION)} a year when added together. The part above that is added to your taxable income.`,
					`In practice, a 13th month pay below ${php(PH_BONUS_EXEMPTION)} is fully tax-free if you have no other bonuses. Once you add a big bonus, you may cross the limit. This tool shows the tax-free part, the taxable part and the room you have left.`,
					'To see how the rest of your pay is taxed, use the [Philippines salary calculator](/philippines-salary-calculator).'
				]
			},
			{
				heading: 'Planning what to do with it',
				paragraphs: [
					'Many people use the 13th month pay for year-end costs, debts or savings. Decide the split before the money arrives, so it does not disappear in December.',
					'A [budget calculator](/budget-calculator) can help you set the split. If you want to save part of it, the [savings calculator](/savings-calculator) shows how a lump sum and monthly deposits can grow. To compare pay rates across months, days and hours, try the [salary calculator](/salary-calculator).'
				]
			},
			{
				heading: 'Who gets it, and what this tool leaves out',
				paragraphs: [
					'Rank-and-file employees of private employers are covered, whether they are paid monthly or daily. Managerial employees, government employees and people paid only by commission or by task are generally not covered.',
					'This tool only models the legal minimum on basic salary. It does not include overtime, holiday pay, night differential or COLA. It also does not decide whether you are covered, so check with your employer or DOLE if you are unsure.'
				]
			}
		],
		formulas: [
			{
				title: '13th month pay (PD 851 and DOLE guidelines)',
				expression: `13th month pay = total basic salary earned in the calendar year ÷ ${PH_13TH_DIVISOR}`,
				variables: [
					{ symbol: 'Basic salary', meaning: 'Regular pay for work done. Overtime, premium pay, night differential, holiday pay, COLA and unused leave cash-outs are excluded unless your pay terms treat them as basic pay' },
					{ symbol: 'Part year', meaning: `If you worked fewer months, the pay is pro-rated automatically because only the salary actually earned is counted. At least ${PH_13TH_MIN_MONTHS} month of service is needed` }
				]
			},
			{
				title: 'Tax treatment',
				expression: `Taxable part = max(0, 13th month pay + other bonuses − ${php(PH_BONUS_EXEMPTION)})`,
				variables: [{ symbol: php(PH_BONUS_EXEMPTION), meaning: 'Yearly limit for 13th month pay and other benefits together. Only the excess is added to taxable income' }]
			}
		],
		example: {
			title: 'Monthly basic salary of ₱25,000 for 12 months',
			steps: [
				'Basic salary earned in the year: ₱25,000 × 12 = ₱300,000.',
				'13th month pay: ₱300,000 ÷ 12 = ₱25,000.',
				'₱25,000 is below the ₱90,000 limit, so it is all tax-free.'
			],
			result: '13th month pay ₱25,000.00, all tax-free'
		},
		faq: [
			{ q: 'How do I compute the 13th month pay in the Philippines?', a: `Add up the basic salary you earned in the calendar year and divide by ${PH_13TH_DIVISOR}. For 12 months at ${php(25000)} a month, that is ${php(300000)} ÷ ${PH_13TH_DIVISOR} = ${php(25000)}.` },
			{ q: 'When must the 13th month pay be paid?', a: `Not later than ${PH_13TH_DEADLINE} each year. Employers may pay half before the school opening and the rest by ${PH_13TH_DEADLINE}.` },
			{ q: 'Who gets it?', a: `Rank-and-file employees of private employers who worked at least ${PH_13TH_MIN_MONTHS} month in the year, whether monthly or daily paid. Managerial employees, government employees and people paid purely on commission or by task are generally not covered.` },
			{ q: 'What if I left or joined mid-year?', a: `You get a proportional amount: one-twelfth of the basic salary you actually earned. For example, 9 months at ${php(9000)} is ${php(81000)}, so the 13th month pay is ${php(6750)}.` },
			{ q: 'Is the 13th month pay taxable?', a: `Not up to ${php(PH_BONUS_EXEMPTION)} a year, counting your other benefits too. Only the excess is taxed. To see the effect on your net pay, use the [Philippines salary calculator](/philippines-salary-calculator).` },
			{ q: 'Does overtime count in the 13th month pay?', a: 'No, not by default. The law uses basic salary only. Overtime, holiday pay, night differential and COLA are left out unless your pay terms treat them as basic pay.' }
		],
		sources: [PH_13TH_SOURCE, PH_13TH_SOURCE_2, PH_TAX_SOURCE],
		disclaimer: 'Estimate of the legal minimum based on the DOLE guidelines and Philippine rules for 2026. Your employment contract or company practice may give you more. It is not legal or tax advice.'
	}
});
