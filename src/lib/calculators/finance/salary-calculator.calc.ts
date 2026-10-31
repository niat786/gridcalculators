import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, money, num } from '../format';
import meta from './salary-calculator.meta';

/** Pay periods per year for each option. Hourly and daily depend on the working week. */
function periodsPerYear(period: string, hoursWeek: number, daysWeek: number): number {
	switch (period) {
		case 'hourly':
			return hoursWeek * 52;
		case 'daily':
			return daysWeek * 52;
		case 'weekly':
			return 52;
		case 'biweekly':
			return 26;
		case 'semimonthly':
			return 24;
		case 'monthly':
			return 12;
		case 'quarterly':
			return 4;
		default:
			return 1;
	}
}

const ROWS: { label: string; period: string }[] = [
	{ label: 'Hourly', period: 'hourly' },
	{ label: 'Daily', period: 'daily' },
	{ label: 'Weekly', period: 'weekly' },
	{ label: 'Bi-weekly (every 2 weeks)', period: 'biweekly' },
	{ label: 'Semi-monthly (24 a year)', period: 'semimonthly' },
	{ label: 'Monthly', period: 'monthly' },
	{ label: 'Quarterly', period: 'quarterly' },
	{ label: 'Annual', period: 'annual' }
];

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'amount', label: 'Pay amount', type: 'number', default: 25, min: 0, max: 100_000_000, step: 0.5, prefix: '$', decimal: true },
		{
			id: 'period',
			label: 'Pay period',
			type: 'select',
			default: 'hourly',
			options: [
				{ label: 'Hourly', value: 'hourly' },
				{ label: 'Daily', value: 'daily' },
				{ label: 'Weekly', value: 'weekly' },
				{ label: 'Bi-weekly', value: 'biweekly' },
				{ label: 'Semi-monthly', value: 'semimonthly' },
				{ label: 'Monthly', value: 'monthly' },
				{ label: 'Quarterly', value: 'quarterly' },
				{ label: 'Annual', value: 'annual' }
			]
		},
		{ id: 'hours', label: 'Hours per week', type: 'number', default: 40, min: 0.5, max: 168, step: 0.5, suffix: 'hours' },
		{ id: 'days', label: 'Days per week', type: 'number', default: 5, min: 1, max: 7, step: 1, suffix: 'days', decimal: false },
		{
			id: 'off',
			label: 'Holidays and vacation',
			type: 'number',
			default: 0,
			min: 0,
			max: 365,
			step: 1,
			suffix: 'days/yr',
			decimal: false,
			help: 'Paid or unpaid days off per year. The adjusted column treats them as unpaid.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const amount = Number(v.amount);
		const period = String(v.period);
		const hours = Number(v.hours);
		const days = Number(v.days);
		const off = Number(v.off);
		const invalid = (): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Annual pay',
			summary: 'Enter a pay amount, 1 to 7 working days, and hours between 0.5 and 168 a week.'
		});

		if (!(amount >= 0) || !(hours > 0 && hours <= 168) || !(days >= 1 && days <= 7) || !(off >= 0)) return invalid();

		const scheduledDays = days * 52;
		const workedDays = scheduledDays - off;
		if (!(workedDays > 0)) {
			return {
				primaryResult: DASH,
				primaryLabel: 'Annual pay',
				summary: 'Days off cannot cover the whole year. Enter fewer holiday and vacation days.'
			};
		}

		const perYear = periodsPerYear(period, hours, days);
		const annual = amount * perYear;
		const adjustedAnnual = annual * (workedDays / scheduledDays);
		const hourly = annual / (hours * 52);

		const table = {
			title: 'Pay for every period',
			columns: [
				{ key: 'period', label: 'Period' },
				{ key: 'unadjusted', label: 'Unadjusted', align: 'end' as const },
				{ key: 'adjusted', label: 'Adjusted for days off', align: 'end' as const }
			],
			rows: ROWS.map((r) => {
				const n = periodsPerYear(r.period, hours, days);
				return {
					period: r.label,
					unadjusted: money(annual / n),
					adjusted: money(adjustedAnnual / n)
				};
			})
		};

		const summary =
			off > 0
				? `Pre-tax. With ${num(off, 0)} days off unpaid, that is about ${money(adjustedAnnual)} a year.`
				: `Pre-tax, for ${num(hours, 1)} hours a week over ${num(days, 0)} days.`;

		return {
			primaryResult: money(annual),
			primaryLabel: 'Annual pay, before tax',
			summary,
			secondaryMetrics: [
				{ label: 'Hourly rate', value: money(hourly) },
				{ label: 'Adjusted annual pay', value: money(adjustedAnnual) },
				{ label: 'Working days a year', value: num(workedDays, 0) },
				{ label: 'Pay lost to days off', value: money(annual - adjustedAnnual) }
			],
			table
		};
	},
	content: {
		intro: 'Use this salary calculator to turn any pay rate into every other pay period. Enter your pay and how often you get it, and see the hourly, daily, weekly, monthly and yearly amounts before tax.',
		howTo: [
			'Enter your pay amount and choose how often you are paid.',
			'Enter your usual hours and working days per week.',
			'Add the holidays and vacation days you take each year, if any.',
			'Read the annual pay, then compare the unadjusted and adjusted tables.'
		],
		about: [
			{
				heading: 'What does a salary calculator do?',
				paragraphs: [
					'Jobs advertise pay in different ways. One offer says $25 an hour, another says $4,300 a month, and a third says $52,000 a year. To compare them, you need to put them in the same terms.',
					'This tool does that. It multiplies your pay up to a yearly figure, then divides it back down to each pay period. All results are gross, which means before tax and other deductions.'
				]
			},
			{
				heading: 'How pay periods convert',
				paragraphs: [
					'The calculator counts 52 weeks in a year. Weekly pay is paid 52 times, every two weeks is 26 times, twice a month is 24 times, and monthly is 12 times. Hourly and daily pay depend on how many hours and days you work each week.',
					'The table shows $25 an hour for a 40-hour, five-day week.'
				],
				table: {
					caption: '$25 an hour, 40 hours a week, 5 days a week',
					columns: ['Pay period', 'Pay before tax'],
					rows: [
						['Hourly', '$25.00'],
						['Daily', '$200.00'],
						['Weekly', '$1,000.00'],
						['Every two weeks', '$2,000.00'],
						['Twice a month', '$2,166.67'],
						['Monthly', '$4,333.33'],
						['Quarterly', '$13,000.00'],
						['Yearly', '$52,000.00']
					]
				}
			},
			{
				heading: 'Common hourly rates as yearly pay',
				paragraphs: ['A quick way to judge an hourly rate is to see it as a yearly figure. These amounts assume 40 hours a week for 52 weeks, which is 2,080 hours.'],
				table: {
					caption: 'Hourly pay at 40 hours a week',
					columns: ['Hourly rate', 'Monthly', 'Yearly'],
					rows: [
						['$15', '$2,600.00', '$31,200'],
						['$20', '$3,466.67', '$41,600'],
						['$25', '$4,333.33', '$52,000'],
						['$30', '$5,200.00', '$62,400'],
						['$40', '$6,933.33', '$83,200']
					]
				}
			},
			{
				heading: 'Holidays, vacation and local differences',
				paragraphs: [
					'The yearly figure assumes you are paid for every week. If you take unpaid days off, enter them in the holidays and vacation box. The adjusted column then shows what you would earn across the year. For example, 10 unpaid days off cuts a $52,000 salary to about $50,000.',
					'Work rules differ around the world. Some countries use a 37.5 or 48 hour week, and some pay a thirteenth month or a yearly bonus. Enter the hours you really work, and check any extra pay with the [thirteenth month pay calculator](/thirteenth-month-pay-calculator).'
				]
			},
			{
				heading: 'From gross pay to take-home pay',
				paragraphs: [
					'Your gross pay is not what reaches your bank account. Income tax, social insurance and pension contributions come out first. The rules depend on where you live.',
					'To see your net pay, try a tool for your country. Options include the [US take-home pay calculator](/take-home-pay-calculator), the [UK take-home pay calculator](/uk-take-home-pay-calculator), the [Canada take-home pay calculator](/canada-take-home-pay-calculator) and the [in-hand salary calculator](/in-hand-salary-calculator) for India. For overtime and bonus pay, see the [commission calculator](/commission-calculator).'
				]
			},
			{
				heading: 'Tips for comparing pay',
				paragraphs: ['A few checks make job offers easier to compare:'],
				list: [
					'**Compare the same period.** Convert every offer to a yearly figure first, then look at the monthly amount.',
					'**Check the real hours.** An offer with longer hours may pay less per hour than it first seems. Enter the true weekly hours.',
					'**Ask if the pay is gross.** Some employers quote pay before tax and others after. This tool assumes before tax.',
					'**Count time off.** Paid leave adds value, while unpaid days reduce your yearly pay. Use the adjusted column to see the effect.',
					'**Look at benefits.** Pension contributions, insurance and bonuses can matter as much as the base rate.'
				]
			}
		],
		formulas: [
			{
				title: 'Annual pay',
				expression: 'Annual pay = pay amount × pay periods per year',
				variables: [
					{ symbol: 'pay periods', meaning: 'hours × 52 for hourly, days × 52 for daily, 52 weekly, 26 bi-weekly, 24 semi-monthly, 12 monthly, 4 quarterly, 1 annual' }
				]
			},
			{
				title: 'Adjusted for days off',
				expression: 'Adjusted pay = annual pay × (working days − days off) ÷ working days',
				variables: [
					{ symbol: 'working days', meaning: 'days per week × 52' },
					{ symbol: 'days off', meaning: 'holidays and vacation days per year' }
				]
			},
			{
				title: 'Any period',
				expression: 'Pay per period = annual pay ÷ pay periods per year',
				variables: []
			}
		],
		example: {
			title: '$25 an hour, 40 hours a week, 10 days off a year',
			steps: [
				'Annual pay: $25 × 40 × 52 = $52,000.00',
				'Working days: 5 × 52 = 260 scheduled, minus 10 days off = 250 worked',
				'Adjusted annual pay: $52,000.00 × 250 ÷ 260 = $50,000.00',
				'Monthly, unadjusted: $52,000.00 ÷ 12 = $4,333.33'
			],
			result:
				'Before tax, $25 an hour is $52,000.00 a year. With 10 unpaid days off, it is about $50,000.00 a year.'
		},
		faq: [
			{
				q: 'How do I convert an hourly wage to an annual salary?',
				a: 'Multiply your hourly rate by your hours per week, then by 52. For example, $25 an hour for 40 hours a week is $25 × 40 × 52 = $52,000 a year.'
			},
			{
				q: 'Is this before or after tax?',
				a: 'Before tax. The results show gross pay only. Income tax, payroll or social insurance, pension contributions and other deductions will reduce your take-home pay.'
			},
			{
				q: 'What does adjusted for days off mean?',
				a: 'It shows what you earn across the year when holidays and vacation days are unpaid. Use the unadjusted column if your time off is paid.'
			},
			{
				q: 'How many hours is a standard year?',
				a: 'This calculator uses 52 weeks a year. Many full-time jobs use 40 hours a week, which gives 2,080 hours a year before any time off.'
			},
			{
				q: 'Why is twice a month different from every two weeks?',
				a: 'Twice a month gives 24 paychecks a year. Every two weeks gives 26. So each biweekly check is smaller than a twice-monthly one, although your yearly pay is the same.'
			}
		],
		sources: [
			{ title: 'U.S. Bureau of Labor Statistics', url: 'https://www.bls.gov/' }
		],
		disclaimer: 'Pre-tax estimates only. Take-home pay depends on tax, benefits, deductions and your employer’s pay rules.'
	}
});
