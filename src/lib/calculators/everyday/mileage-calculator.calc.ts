import { defineCalculator, type CalculationResult, type InputValues, type RowValue } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './mileage-calculator.meta';

const fail = (summary: string): CalculationResult => ({
	primaryResult: DASH,
	primaryLabel: 'Reimbursement',
	summary
});

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Enter miles as',
			type: 'select',
			default: 'total',
			display: 'segmented',
			options: [
				{ label: 'Total miles', value: 'total' },
				{ label: 'Trip log', value: 'trips' }
			]
		},
		{
			id: 'miles',
			label: 'Business miles',
			type: 'number',
			default: 1250,
			min: 0,
			max: 100000000,
			suffix: 'miles',
			visibleWhen: (v) => v.mode !== 'trips'
		},
		{
			id: 'trips',
			label: 'Trips',
			type: 'rows',
			columns: [
				{ id: 'date', label: 'Date', type: 'text', default: '2026-02-03', placeholder: 'YYYY-MM-DD' },
				{ id: 'purpose', label: 'Purpose', type: 'text', default: 'Client visit', placeholder: 'Purpose' },
				{ id: 'miles', label: 'Miles', type: 'number', default: 12.5, min: 0, max: 100000, suffix: 'mi' }
			],
			default: [
				{ date: '2026-02-03', purpose: 'Client visit', miles: 12.5 },
				{ date: '2026-02-10', purpose: 'Supplier meeting', miles: 40 },
				{ date: '2026-02-17', purpose: 'Bank and post office', miles: 7.3 }
			],
			minRows: 1,
			maxRows: 200,
			addLabel: 'Add trip',
			visibleWhen: (v) => v.mode === 'trips'
		},
		{
			id: 'rate',
			label: 'Rate per mile',
			type: 'number',
			default: 0.725,
			min: 0,
			max: 5,
			decimal: true,
			prefix: '$',
			suffix: '/mile',
			help: 'Default is the US IRS 2026 business rate (72.5¢). Elsewhere, enter your tax authority’s rate (e.g. HMRC, CRA).'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const rate = Number(v.rate);
		if (!Number.isFinite(rate) || rate < 0) return fail('Enter a rate per mile of zero or more.');

		let total = 0;
		let trips: Record<string, string>[] | undefined;
		let tripCount: number | undefined;

		if (v.mode === 'trips') {
			const list = (v.trips as RowValue[]) ?? [];
			if (list.length === 0) return fail('Add at least one trip.');
			trips = [];
			for (let i = 0; i < list.length; i++) {
				const miles = Number(list[i].miles);
				if (!Number.isFinite(miles) || miles < 0) return fail(`Check trip ${i + 1}: enter miles as zero or more.`);
				total += miles;
				trips.push({
					date: String(list[i].date ?? '') || `Trip ${i + 1}`,
					purpose: String(list[i].purpose ?? ''),
					miles: num(miles, 2),
					amount: money(miles * rate)
				});
			}
			tripCount = list.length;
		} else {
			total = Number(v.miles);
			if (!Number.isFinite(total) || total < 0) return fail('Enter business miles of zero or more.');
		}

		const reimbursement = total * rate;
		const rateText = `$${num(rate, 3, 2)}`;

		return {
			primaryResult: money(reimbursement),
			primaryLabel: 'Reimbursement',
			summary: `${num(total, 2)} miles at ${rateText} per mile. Check the current IRS rate before you claim.`,
			secondaryMetrics: [
				{ label: 'Total miles', value: num(total, 2) },
				{ label: 'Rate per mile', value: rateText },
				{ label: 'Trips logged', value: tripCount === undefined ? 'Not used' : plural(tripCount, 'trip') }
			],
			...(trips
				? {
						table: {
							title: 'Trip log',
							columns: [
								{ key: 'date', label: 'Date' },
								{ key: 'purpose', label: 'Purpose' },
								{ key: 'miles', label: 'Miles', align: 'end' as const },
								{ key: 'amount', label: 'Amount', align: 'end' as const }
							],
							rows: trips,
							collapsed: false
						}
					}
				: {})
		};
	},
	content: {
		intro:
			'Work out what your business driving is worth. Enter your business miles as a total, or log each trip, and the mileage calculator multiplies them by your rate per mile to give the reimbursement or deduction.',
		howTo: [
			'Choose total miles if you know the figure, or trip log to add each journey.',
			'For total miles, enter the business miles for the period. For a trip log, enter the date, purpose and miles for each trip.',
			'Enter the rate per mile your employer, tax authority or client uses.',
			'Read the reimbursement, and check the trip table if you logged trips.'
		],
		about: [
			{
				heading: 'What is a mileage allowance?',
				paragraphs: [
					'A mileage allowance is a fixed amount per mile that covers the cost of driving for work. It is often used by employers to repay staff who drive their own cars, and by self-employed people to claim a business expense.',
					'The rate is set to cover fuel, wear, insurance and depreciation. It is usually a simple rate per mile or per kilometre, so you do not need to track every receipt.'
				]
			},
			{
				heading: 'How the reimbursement is calculated',
				paragraphs: [
					'Add up the business miles, then multiply by the rate per mile. If you keep a trip log, the calculator adds the miles for each trip first, then applies the rate once to the total.',
					'Only business miles count. Commuting from home to a regular workplace is usually private, and personal trips are not included. The rules on this differ from country to country.'
				]
			},
			{
				heading: 'Rates in different countries',
				paragraphs: [
					'The default rate in this calculator is 72.5 cents per mile, which is the US IRS business rate used for 2026. The IRS changes its rate most years, so check IRS.gov for the year you drove.',
					'Other countries publish their own rates. The United Kingdom uses approved mileage rates from HMRC, which vary by type of vehicle and by the number of business miles. The Canada Revenue Agency (CRA) publishes per-kilometre rates that vary by province and year. Enter the rate that applies to you, and check the source before you claim.'
				],
				list: [
					'United States: IRS standard mileage rate, in cents per mile.',
					'United Kingdom: HMRC approved mileage allowance payments, in pence per mile.',
					'Canada: CRA automobile allowance rates, per kilometre.',
					'Other countries: check your tax authority or your employer’s policy.'
				]
			},
			{
				heading: 'Keeping a good mileage log',
				paragraphs: [
					'Tax authorities and employers usually want a clear record. For each trip, note the date, the start and end points, the purpose and the miles. Record the odometer reading at the start and end of the year too.',
					'A simple log in a notebook or an app is enough. Keep it up to date, because it is hard to reconstruct months of trips later.'
				],
				list: [
					'Log each trip on the day, or as soon as you can.',
					'Write a clear purpose, such as client visit or supplier meeting.',
					'Keep a record of the odometer at the start and end of the year.',
					'Use a map or a route planner to check distances.'
				]
			},
			{
				heading: 'Using the distance in your planning',
				paragraphs: [
					'If you also want to know how much fuel a trip uses, the [fuel cost calculator](/fuel-cost-calculator) and the [gas mileage calculator](/gas-mileage-calculator) work from the same miles. The [distance calculator](/distance-calculator) helps you check a route.',
					'The [unit converter](/unit-converter) converts miles to kilometres when you need to compare with a kilometre rate.'
				]
			}
		],
		formulas: [
			{
				title: 'Reimbursement from total miles',
				expression: 'Reimbursement = business miles × rate per mile',
				variables: [
					{ symbol: 'business miles', meaning: 'the miles driven for work in the period' },
					{ symbol: 'rate per mile', meaning: 'the allowance per mile from your tax authority or employer' }
				]
			},
			{
				title: 'Reimbursement from a trip log',
				expression: 'Total miles = trip 1 + trip 2 + … + trip n\nReimbursement = total miles × rate per mile',
				variables: [{ symbol: 'trip', meaning: 'the miles for one logged journey' }]
			}
		],
		example: {
			title: 'Three logged trips totalling 59.8 miles at $0.70 per mile',
			steps: [
				'Add the trips: 12.5 + 40 + 7.3 = 59.8 miles',
				'Multiply by the rate: 59.8 × $0.70 = $41.86',
				'The middle trip alone is 40 × $0.70 = $28.00'
			],
			result: 'The reimbursement is $41.86 for 59.8 business miles.'
		},
		faq: [
			{
				q: 'How do I calculate mileage reimbursement?',
				a: 'Add up your business miles for the period, then multiply by the rate per mile. The calculator does this for you. If you have a trip log, it adds the trips first.'
			},
			{
				q: 'What is the IRS mileage rate?',
				a: 'The IRS sets a standard business mileage rate each year. The calculator uses 72.5 cents per mile by default, but you should check IRS.gov for the rate for the year you drove.'
			},
			{
				q: 'Can I claim mileage for my commute?',
				a: 'Usually not. Travel between home and a regular workplace is often treated as private. Some situations differ, such as travel to a temporary site, so check the rules where you live.'
			},
			{
				q: 'Do I need receipts for mileage?',
				a: 'With a standard rate, you usually need a mileage log rather than fuel receipts. Your employer or tax authority sets the exact record-keeping rules, so keep a log that meets them.'
			}
		],
		sources: [
			{ title: 'IRS, standard mileage rates', url: 'https://www.irs.gov/tax-professionals/standard-mileage-rates' },
			{ title: 'GOV.UK, HMRC mileage rate guidance', url: 'https://www.gov.uk/' }
		],
		disclaimer:
			'This tool does simple arithmetic. It is not tax advice. Check the rate and the record-keeping rules that apply to you with your employer or a tax professional.'
	}
});
