import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num } from '../format';
import meta from './qatar-end-of-service-calculator.meta';
import { parseISO, serviceYears, yearsLabel } from '../data/service-years';
import {
	QA_LAW_LABEL,
	QA_MIN_SERVICE_YEARS,
	QA_MIN_WEEKS_PER_YEAR,
	QA_MONTHS_PER_YEAR,
	QA_MONTH_DAYS,
	QA_SOURCES,
	QA_WEEKS_PER_YEAR
} from '../data/qa-end-of-service';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'basic',
			label: 'Last monthly basic wage',
			type: 'number',
			default: 10000,
			min: 0,
			max: 10_000_000,
			prefix: '$',
			help: 'Basic wage only, including any annual increment. Housing, transport and other allowances are not included.'
		},
		{ id: 'start', label: 'First day of work', type: 'date', default: '2018-01-01' },
		{ id: 'end', label: 'Last day of work', type: 'date', default: 'today' },
		{
			id: 'weeks',
			label: 'Weeks of wage per year',
			type: 'number',
			default: 3,
			min: 0,
			max: 52,
			step: 0.5,
			suffix: 'weeks',
			help: 'The law sets a floor of 3 weeks. Enter more only if your contract promises more.'
		},
		{
			id: 'method',
			label: 'Weekly wage method',
			type: 'select',
			display: 'segmented',
			default: '30',
			options: [
				{ label: 'Monthly ÷ 30 × 7', value: '30' },
				{ label: 'Yearly ÷ 52', value: '52' }
			],
			help: 'The law does not fix how to turn a monthly wage into a weekly one. ÷ 30 is the usual practice.'
		}
	],
	calculate(v): CalculationResult {
		const label = 'End-of-service gratuity';
		const basic = Number(v.basic);
		const weeks = Number(v.weeks);
		const start = parseISO(String(v.start));
		const end = parseISO(String(v.end));
		if (!(basic > 0) || !Number.isFinite(basic) || !start || !end) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a basic wage above zero and two valid dates.' };
		}
		if (!Number.isFinite(weeks) || weeks < QA_MIN_WEEKS_PER_YEAR) {
			return { primaryResult: DASH, primaryLabel: label, summary: `Article 54 sets a floor of ${QA_MIN_WEEKS_PER_YEAR} weeks of wage per year. Enter ${QA_MIN_WEEKS_PER_YEAR} or more.` };
		}
		const sy = serviceYears(start, end);
		if (!sy) return { primaryResult: DASH, primaryLabel: label, summary: 'The last day of work is before the first day.' };

		const years = sy.years;
		const weekly = String(v.method) === '52' ? (basic * QA_MONTHS_PER_YEAR) / QA_WEEKS_PER_YEAR : (basic / QA_MONTH_DAYS) * 7;
		const perYear = weekly * weeks;
		const metrics = (total: number) => [
			{ label: 'Service counted', value: yearsLabel(years) },
			{ label: 'Weekly basic wage', value: money(weekly) },
			{ label: 'Weeks of wage per year', value: num(weeks, 2) },
			{ label: 'Gratuity for each full year', value: money(perYear) },
			{ label: 'Gratuity as months of basic wage', value: num(basic > 0 ? total / basic : 0, 2) }
		];

		if (years < QA_MIN_SERVICE_YEARS) {
			return {
				primaryResult: money(0),
				primaryLabel: label,
				summary: 'No gratuity is due under 1 year of continuous service (Article 54).',
				secondaryMetrics: metrics(0)
			};
		}
		const total = perYear * years;
		return {
			primaryResult: money(total),
			primaryLabel: label,
			summary: `${num(weeks, 2)} weeks of basic wage (${money(weekly)} a week) for each of ${yearsLabel(years)}, with the part year counted pro rata. This is the legal minimum; your contract may pay more.`,
			secondaryMetrics: metrics(total)
		};
	},
	content: {
		intro: `Use this Qatar end-of-service calculator to estimate the minimum gratuity for a private-sector employee under ${QA_LAW_LABEL}. The law sets at least ${QA_MIN_WEEKS_PER_YEAR} weeks of basic wage for every year of service, once you have completed ${QA_MIN_SERVICE_YEARS} year.`,
		howTo: [
			'Enter your last monthly basic wage, without housing, transport or other allowances.',
			'Enter your first and last day of work. Part years are counted pro rata.',
			`Leave the weeks at ${QA_MIN_WEEKS_PER_YEAR}, or raise it if your contract gives more.`,
			'Pick how to turn the monthly wage into a weekly wage, then read the gratuity.'
		],
		about: [
			{
				heading: 'What is end-of-service gratuity in Qatar?',
				paragraphs: [
					`Gratuity is a payment your employer owes when your job ends. In Qatar the rule is in Article 54 of Labour Law No. 14 of 2004. A law firm summary (Clyde & Co) says it is owed to an employee who has completed ${QA_MIN_SERVICE_YEARS} year or more of continuous service.`,
					`The law sets a floor. Your contract can promise more than ${QA_MIN_WEEKS_PER_YEAR} weeks a year, but never less. This calculator shows the legal minimum, so treat the result as a starting point for a conversation with your employer.`
				]
			},
			{
				heading: 'How the gratuity is calculated',
				paragraphs: [
					`First, find your weekly basic wage. The law does not say how to turn a monthly wage into a weekly one. A common practice is monthly basic ÷ ${QA_MONTH_DAYS} × 7. Another is monthly basic × ${QA_MONTHS_PER_YEAR} ÷ ${QA_WEEKS_PER_YEAR}.`,
					`Next, multiply the weekly wage by the weeks per year (at least ${QA_MIN_WEEKS_PER_YEAR}). Then multiply by your years of service. The part year counts pro rata. The formula section below shows each symbol.`
				]
			},
			{
				heading: 'Which wage counts?',
				paragraphs: [
					'The base is your last basic wage, including the annual increment. A Gulf employment guide (Teamed) says housing, transport, other allowances and bonuses are not included.',
					'However, a contract or company policy can use a wider definition of wage. If yours does, enter the figure it uses and raise the weeks if it promises more.'
				]
			},
			{
				heading: 'Resigning, dismissal and other limits',
				paragraphs: [
					'Resigning does not remove your gratuity. It is lost only if you are dismissed for one of the serious misconduct reasons listed in Article 61. This tool does not model that case.',
					'It also does not model employer pension schemes (Article 56) or deductions for sums you owe your employer. Decree-Law No. 18 of 2020 changed notice rules and exit permits. The sources we checked do not report any change to Article 54.'
				]
			},
			{
				heading: 'Tips and related Gulf tools',
				paragraphs: ['A few steps help you plan your final payment.'],
				list: [
					'Ask for your contract and your payslips so you can check the basic wage and see whether it promises more than the legal floor.',
					'Keep your start date and any leave records.',
					'Compare with the [Kuwait indemnity calculator](/kuwait-indemnity-calculator) or the [Bahrain leaving indemnity calculator](/bahrain-leaving-indemnity-calculator) if you may move.',
					'See how the [UAE gratuity calculator](/uae-gratuity-calculator) and the [Saudi end-of-service calculator](/saudi-end-of-service-calculator) differ.',
					'Use the [currency converter](/currency-converter) if you send your payment home.'
				]
			}
		],
		formulas: [
			{
				title: 'Gratuity under Article 54',
				expression: 'Gratuity = Y × N × W, with no gratuity if Y < 1',
				variables: [
					{ symbol: 'Y', meaning: `Years of continuous service, with the part year counted pro rata. At least ${QA_MIN_SERVICE_YEARS} full year is needed.` },
					{ symbol: 'N', meaning: `Weeks of wage per year: ${QA_MIN_WEEKS_PER_YEAR} is the legal minimum; a contract may give more.` },
					{ symbol: 'W', meaning: `Weekly basic wage: monthly basic ÷ ${QA_MONTH_DAYS} × 7 (or monthly basic × ${QA_MONTHS_PER_YEAR} ÷ ${QA_WEEKS_PER_YEAR} if you pick that method).` }
				]
			}
		],
		example: {
			title: `${moneyIn('QAR', 10000, true)} basic wage, 1 January 2018 to 31 December 2024`,
			steps: [
				'Service: exactly 7 years.',
				`Weekly basic wage: 10,000 ÷ ${QA_MONTH_DAYS} × 7 = ${moneyIn('QAR', (10000 / QA_MONTH_DAYS) * 7)}.`,
				`Gratuity for each year: ${QA_MIN_WEEKS_PER_YEAR} weeks × ${moneyIn('QAR', (10000 / QA_MONTH_DAYS) * 7)} = ${moneyIn('QAR', 7000)}.`,
				`Gratuity: 7 years × 7,000 = ${moneyIn('QAR', 49000)}.`
			],
			result: moneyIn('QAR', 49000)
		},
		faq: [
			{
				q: 'How is end-of-service gratuity calculated in Qatar?',
				a: `It is at least ${QA_MIN_WEEKS_PER_YEAR} weeks of your last basic wage for each year of service, with part years pro rata. You need at least ${QA_MIN_SERVICE_YEARS} year of continuous service.`
			},
			{
				q: 'Do I get gratuity if I resign?',
				a: 'Yes. Article 54 gives gratuity to anyone who has completed a year of continuous service. It is lost only if you are dismissed for one of the serious misconduct reasons listed in Article 61.'
			},
			{
				q: 'Which wage counts?',
				a: 'Your last basic wage, including annual increments. Housing, transport and other allowances and bonuses are left out. A contract or company policy can promise more than the legal floor.'
			},
			{
				q: 'Why can the result differ from my company’s figure?',
				a: `The law fixes ${QA_MIN_WEEKS_PER_YEAR} weeks per year but not how to turn a monthly wage into a weekly one. Dividing by ${QA_MONTH_DAYS} and multiplying by 7 is common. Dividing the yearly wage by ${QA_WEEKS_PER_YEAR} gives a slightly lower week. Your contract and the Ministry of Labour decide in a dispute.`
			},
			{
				q: 'Can my contract give more than three weeks?',
				a: `Yes. The law sets a floor of ${QA_MIN_WEEKS_PER_YEAR} weeks per year. If your contract promises more, enter that number in the weeks box.`
			}
		],
		sources: QA_SOURCES,
		disclaimer:
			'Estimate of the statutory minimum only, for private-sector employees under Labour Law No. 14 of 2004. It does not model Article 61 dismissals, employer pension schemes (Article 56) or deductions for sums you owe your employer. This is not legal advice; confirm with the Ministry of Labour or your employer.'
	}
});
