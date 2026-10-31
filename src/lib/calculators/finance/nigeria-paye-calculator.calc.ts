import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './nigeria-paye-calculator.meta';
import {
	NG_BANDS,
	NG_BANDS_SOURCE,
	NG_DEDUCTIONS_SOURCE,
	NG_NHF_RATE,
	NG_RENT_RELIEF_RATE,
	NG_NHF_SOURCE,
	NG_PENSION_RATE,
	NG_PWC_SOURCE,
	NG_RENT_RELIEF_CAP,
	NG_TAX_YEAR_LABEL,
	ngBandTax,
	ngRentRelief
} from '../data/ng-2026';

/** Content is built before a currency is chosen, so format naira explicitly. */
const ngn = (n: number) => moneyIn('NGN', n, true);
const pc = (x: number) => `${+(x * 100).toFixed(2)}%`;
function bandRows(): string[][] {
	let from = 0;
	return NG_BANDS.map((b) => {
		const row = [b.width === Infinity ? `Above ${ngn(from)}` : `${from === 0 ? 'First' : 'Next'} ${ngn(b.width)}`, pc(b.rate)];
		from += b.width === Infinity ? 0 : b.width;
		return row;
	});
}

const YES_NO = [
	{ label: 'Yes', value: 'yes' },
	{ label: 'No', value: 'no' }
];

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'basic', label: 'Basic salary', type: 'number', default: 250000, min: 0, max: 10_000_000_000, step: 10000, prefix: '$', suffix: '/month' },
		{ id: 'housing', label: 'Housing allowance', type: 'number', default: 100000, min: 0, max: 10_000_000_000, step: 10000, prefix: '$', suffix: '/month' },
		{ id: 'transport', label: 'Transport allowance', type: 'number', default: 50000, min: 0, max: 10_000_000_000, step: 5000, prefix: '$', suffix: '/month' },
		{ id: 'other', label: 'Other allowances', type: 'number', default: 100000, min: 0, max: 10_000_000_000, step: 10000, prefix: '$', suffix: '/month', help: 'Any other regular pay. Gross pay is the total of these four.' },
		{ id: 'rent', label: 'Annual rent you pay', type: 'number', default: 2400000, min: 0, max: 10_000_000_000, step: 100000, prefix: '$', suffix: '/yr', help: 'Rent relief is 20% of this, up to ₦500,000. Use 0 if you do not rent.' },
		{ id: 'pension', label: 'Pension contribution (8%)', type: 'select', display: 'segmented', default: 'yes', options: YES_NO, help: 'Employee share, on basic + housing + transport.' },
		{ id: 'nhf', label: 'National Housing Fund (2.5%)', type: 'select', display: 'segmented', default: 'yes', options: YES_NO, help: '2.5% of basic salary. Choose No if your employer does not deduct it.' },
		{ id: 'extra', label: 'Other allowable deductions', type: 'number', default: 0, min: 0, max: 10_000_000_000, step: 10000, prefix: '$', suffix: '/yr', help: 'NHIS, life insurance premiums or home loan interest you can prove. Not taken off net pay.' }
	],
	calculate(v): CalculationResult {
		const basic = Number(v.basic);
		const housing = Number(v.housing);
		const transport = Number(v.transport);
		const other = Number(v.other);
		const rent = Number(v.rent);
		const extra = Number(v.extra);
		const parts = [basic, housing, transport, other, rent, extra];
		const gross = basic + housing + transport + other;
		if (parts.some((p) => !Number.isFinite(p) || p < 0) || !(gross > 0) || (v.pension !== 'yes' && v.pension !== 'no') || (v.nhf !== 'yes' && v.nhf !== 'no')) {
			return { primaryResult: DASH, primaryLabel: 'Net pay per month', summary: 'Enter pay amounts of zero or more, with a total above zero.' };
		}
		const pension = v.pension === 'yes' ? NG_PENSION_RATE * (basic + housing + transport) : 0;
		const nhf = v.nhf === 'yes' ? NG_NHF_RATE * basic : 0;
		const rentRelief = ngRentRelief(rent);
		const annualGross = gross * 12;
		const chargeable = Math.max(0, annualGross - pension * 12 - nhf * 12 - rentRelief - extra);
		const { tax, marginalRate } = ngBandTax(chargeable);
		const paye = tax / 12;
		const net = gross - paye - pension - nhf;
		const summary =
			tax === 0
				? `Your taxable income of ${money(chargeable)} a year is inside the first ${money(NG_BANDS[0].width, true)}, which is taxed at 0%, so no PAYE is due.`
				: `Taxable income is ${money(chargeable)} a year after pension, NHF, rent relief and other deductions. Annual tax is ${money(tax)}, so monthly PAYE is ${money(paye)}.`;
		return {
			primaryResult: money(net),
			primaryLabel: 'Net pay per month',
			summary,
			secondaryMetrics: [
				{ label: 'Gross pay per month', value: money(gross) },
				{ label: 'PAYE per month', value: money(paye) },
				{ label: 'Pension (employee 8%)', value: money(pension) },
				{ label: 'National Housing Fund', value: money(nhf) },
				{ label: 'Rent relief per year', value: money(rentRelief) },
				{ label: 'Taxable income per year', value: money(chargeable) },
				{ label: 'Marginal tax rate', value: pct(marginalRate * 100, 0) }
			],
			table: {
				title: 'Yearly working',
				collapsed: true,
				columns: [
					{ key: 'item', label: 'Item' },
					{ key: 'year', label: 'Per year', align: 'end' },
					{ key: 'month', label: 'Per month', align: 'end' }
				],
				rows: [
					{ item: 'Gross pay', year: money(annualGross), month: money(gross) },
					{ item: 'Pension', year: money(-pension * 12), month: money(-pension) },
					{ item: 'National Housing Fund', year: money(-nhf * 12), month: money(-nhf) },
					{ item: 'Rent relief', year: money(-rentRelief), month: money(-rentRelief / 12) },
					{ item: 'Other allowable deductions', year: money(-extra), month: money(-extra / 12) },
					{ item: 'Taxable income', year: money(chargeable), month: money(chargeable / 12) },
					{ item: 'PAYE', year: money(-tax), month: money(-paye) },
					{ item: 'Net pay', year: money(net * 12), month: money(net) }
				]
			}
		};
	},
	content: {
		intro: `Estimate your monthly PAYE and take-home pay in Nigeria under the Nigeria Tax Act 2025 (${NG_TAX_YEAR_LABEL}). This Nigeria PAYE calculator treats the first ${ngn(NG_BANDS[0].width)} a year as tax free, and uses rent relief in place of the old Consolidated Relief Allowance.`,
		howTo: [
			'Enter your monthly basic salary, housing, transport and other allowances.',
			'Add the rent you pay in a year, and choose whether pension and NHF are deducted.',
			'Add any other allowable deductions you can prove, such as insurance premiums.',
			'Read your monthly PAYE and net pay, then open the table for the yearly working.'
		],
		about: [
			{
				heading: `How PAYE works in Nigeria for the ${NG_TAX_YEAR_LABEL}`,
				paragraphs: [
					'PAYE (Pay As You Earn) is the income tax your employer deducts from your pay each month and sends to the tax authority. The Nigeria Tax Act 2025 sets the rules from 1 January 2026. The old Personal Income Tax Act (PITA) rules are not used here.',
					'First, the tool adds up your gross pay for the year. Next, it subtracts your pension, NHF, rent relief and other allowable deductions. Then it applies the tax bands to what is left, and divides the tax by 12.'
				]
			},
			{
				heading: 'Nigeria tax bands under the Nigeria Tax Act 2025',
				paragraphs: [
					`The bands apply to your yearly taxable income. Only the slice inside each band pays that band’s rate. The first ${ngn(NG_BANDS[0].width)} pays nothing, and the top rate of ${pc(NG_BANDS[NG_BANDS.length - 1].rate)} applies only to the part above ${ngn(NG_BANDS.slice(0, -1).reduce((a, b) => a + b.width, 0))}.`
				],
				table: { caption: 'Annual tax bands on taxable income', columns: ['Taxable income slice', 'Rate'], rows: bandRows() }
			},
			{
				heading: 'Deductions: pension, NHF and rent relief',
				paragraphs: [
					`Your pension contribution is ${pc(NG_PENSION_RATE)} of basic salary, housing and transport allowances together. It is deductible. Your employer’s pension share is not part of your taxable income.`,
					`The National Housing Fund (NHF) takes ${pc(NG_NHF_RATE)} of your basic salary, and it is fully deductible. If your employer does not deduct NHF, choose No in the tool.`,
					`Rent relief is ${pc(NG_RENT_RELIEF_RATE)} of the annual rent you pay, up to ${ngn(NG_RENT_RELIEF_CAP)}. It replaces the Consolidated Relief Allowance, which the new Act removes. Use 0 if you do not rent.`
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'Net pay is your gross pay minus PAYE, pension and NHF. Rent relief and other allowable deductions lower your tax, but they are not taken off your pay.',
					'The marginal rate is the rate on your next naira of taxable income. It is usually higher than your average rate, because the lower slices pay less.'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: ['Real payslips can differ slightly, because some items are outside the tool.'],
				list: [
					'The payroll treatment of bonuses and one-off payments.',
					'Benefits in kind.',
					'A pension base set in your own contract. The tool uses basic, housing and transport, which is the legal minimum.',
					'Income other than employment pay.'
				]
			},
			{
				heading: 'Plan with your net pay',
				paragraphs: [
					'Use your net pay as the base for your budget. The [budget calculator](/budget-calculator) splits it into needs, wants and savings. The [salary calculator](/salary-calculator) converts your pay between yearly, monthly and hourly figures.',
					'If you want to save part of your pay, the [savings calculator](/savings-calculator) shows how deposits can grow. Before you borrow, the [loan calculator](/loan-calculator) shows the monthly payment.'
				]
			}
		],
		formulas: [
			{
				title: 'Taxable income and PAYE',
				expression: 'Taxable = gross × 12 − pension − NHF − rent relief − other deductions; PAYE = band tax ÷ 12',
				variables: [
					{ symbol: 'Bands', meaning: bandRows().map((r) => `${r[0]} ${r[1]}`).join('; ') },
					{ symbol: 'Pension', meaning: `${pc(NG_PENSION_RATE)} of basic + housing + transport (employee share)` },
					{ symbol: 'NHF', meaning: `${pc(NG_NHF_RATE)} of basic salary` },
					{ symbol: 'Rent relief', meaning: `${pc(NG_RENT_RELIEF_RATE)} of annual rent, up to ${ngn(NG_RENT_RELIEF_CAP)}` }
				]
			}
		],
		example: {
			title: '₦500,000 a month with ₦2,400,000 yearly rent',
			steps: [
				'Pension = 8% × (₦250,000 + ₦100,000 + ₦50,000) = ₦32,000 a month; NHF = 2.5% × ₦250,000 = ₦6,250 a month.',
				'Rent relief = 20% × ₦2,400,000 = ₦480,000.',
				'Taxable = ₦6,000,000 − ₦384,000 − ₦75,000 − ₦480,000 = ₦5,061,000.',
				'Tax = ₦330,000 + 18% × (₦5,061,000 − ₦3,000,000) = ₦700,980 a year, or ₦58,415 a month.'
			],
			result: 'Net pay of ₦403,335 a month.'
		},
		faq: [
			{ q: 'How is PAYE calculated in Nigeria?', a: 'Add up your yearly gross pay and subtract pension, NHF, rent relief and other allowable deductions. Apply the tax bands to the rest, then divide by 12. This Nigeria PAYE calculator does each step.' },
			{ q: 'What changed from the old PITA rules?', a: `The Nigeria Tax Act 2025 starts in January 2026. It makes the first ${ngn(NG_BANDS[0].width)} tax free, uses bands from ${pc(NG_BANDS[1].rate)} to ${pc(NG_BANDS[NG_BANDS.length - 1].rate)} and replaces the Consolidated Relief Allowance with rent relief of up to ${ngn(NG_RENT_RELIEF_CAP)}.` },
			{ q: 'How much is rent relief?', a: `${pc(NG_RENT_RELIEF_RATE)} of the annual rent you pay, capped at ${ngn(NG_RENT_RELIEF_CAP)}. For example, rent of ${ngn(2400000)} a year gives relief of ${ngn(2400000 * NG_RENT_RELIEF_RATE)}.` },
			{ q: 'Which pay does pension use?', a: `The employee’s ${pc(NG_PENSION_RATE)} is worked out on basic salary, housing and transport allowances, the statutory minimum base. If your contract uses a wider base, your pension will be higher than shown.` },
			{ q: 'Is NHF deducted from everyone?', a: `Not always. NHF is ${pc(NG_NHF_RATE)} of basic salary where your employer deducts it. Choose No in the tool if yours does not.` },
			{ q: 'What is not included?', a: 'Bonuses taxed in a different month, benefits in kind and non-salary income are not modelled. Real payslips can differ slightly.' }
		],
		sources: [NG_PWC_SOURCE, NG_BANDS_SOURCE, NG_DEDUCTIONS_SOURCE, NG_NHF_SOURCE],
		disclaimer: 'An estimate of PAYE under the Nigeria Tax Act 2025 for 2026, not tax advice. Confirm with your employer or the tax authority.'
	}
});
