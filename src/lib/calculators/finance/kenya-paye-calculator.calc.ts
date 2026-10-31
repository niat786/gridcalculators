import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './kenya-paye-calculator.meta';
import {
	AHL_RATE,
	KE_BANDS,
	KE_PERIOD_LABEL,
	KE_PERSONAL_RELIEF,
	KE_PWC_OTHER_TAXES_SOURCE,
	KRA_PAYE_SOURCE,
	KRA_TLAA_SOURCE,
	NSSF_LEL,
	NSSF_RATE,
	NSSF_UEL,
	NSSF_YEAR4_SOURCE,
	SHA_PREMIUM_SOURCE,
	SHIF_MIN,
	SHIF_RATE,
	keBandTax,
	keNssf,
	keShif
} from '../data/ke-2026';

/** Content is built before a currency is chosen, so format shillings explicitly. */
const kes = (n: number) => moneyIn('KES', n, true);
const pc = (x: number) => `${+(x * 100).toFixed(2)}%`;
function bandRows(): string[][] {
	let from = 0;
	return KE_BANDS.map((b) => {
		const row = [b.width === Infinity ? `Above ${kes(from)}` : `${kes(from === 0 ? 0 : from + 1)} to ${kes(from + b.width)}`, pc(b.rate)];
		from += b.width === Infinity ? 0 : b.width;
		return row;
	});
}
const NSSF_MAX = NSSF_RATE * NSSF_UEL;

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'gross', label: 'Monthly gross pay', type: 'number', default: 100000, min: 0, max: 1_000_000_000, step: 5000, prefix: '$', suffix: '/month', help: 'Basic pay plus taxable allowances, before any deductions.' }
	],
	calculate(v): CalculationResult {
		const gross = Number(v.gross);
		if (!(gross > 0) || !Number.isFinite(gross)) {
			return { primaryResult: DASH, primaryLabel: 'Net pay per month', summary: 'Enter a monthly gross pay above zero.' };
		}
		const nssf = keNssf(gross).total;
		const shif = keShif(gross);
		const ahl = AHL_RATE * gross;
		const taxable = Math.max(0, gross - nssf - shif - ahl);
		const { tax: bandTax, marginalRate } = keBandTax(taxable);
		const paye = Math.max(0, bandTax - KE_PERSONAL_RELIEF);
		const totalDeductions = nssf + shif + ahl + paye;
		const net = gross - totalDeductions;
		const summary =
			paye === 0
				? `Tax of ${money(bandTax)} on ${money(taxable)} of taxable pay is cancelled by the ${money(KE_PERSONAL_RELIEF)} personal relief, so no PAYE is due.`
				: `NSSF, SHIF and the housing levy come off first, leaving ${money(taxable)} taxable. Band tax of ${money(bandTax)} less ${money(KE_PERSONAL_RELIEF)} personal relief gives PAYE of ${money(paye)}.`;
		return {
			primaryResult: money(net),
			primaryLabel: 'Net pay per month',
			summary,
			secondaryMetrics: [
				{ label: 'PAYE (after personal relief)', value: money(paye) },
				{ label: 'NSSF (employee, Year 4)', value: money(nssf) },
				{ label: 'SHIF (2.75%)', value: money(shif) },
				{ label: 'Affordable Housing Levy (1.5%)', value: money(ahl) },
				{ label: 'Taxable pay', value: money(taxable) },
				{ label: 'Total deductions', value: money(totalDeductions) },
				{ label: 'Top PAYE band reached', value: paye === 0 ? pct(0, 0) : pct(marginalRate * 100, 1) }
			],
			table: {
				title: 'Payslip',
				collapsed: true,
				columns: [
					{ key: 'item', label: 'Item' },
					{ key: 'month', label: 'Per month', align: 'end' },
					{ key: 'year', label: 'Per year', align: 'end' }
				],
				rows: [
					{ item: 'Gross pay', month: money(gross), year: money(gross * 12) },
					{ item: 'NSSF', month: money(-nssf), year: money(-nssf * 12) },
					{ item: 'SHIF', month: money(-shif), year: money(-shif * 12) },
					{ item: 'Affordable Housing Levy', month: money(-ahl), year: money(-ahl * 12) },
					{ item: 'Taxable pay', month: money(taxable), year: money(taxable * 12) },
					{ item: 'Tax before relief', month: money(bandTax), year: money(bandTax * 12) },
					{ item: 'Personal relief', month: money(Math.min(bandTax, KE_PERSONAL_RELIEF)), year: money(Math.min(bandTax, KE_PERSONAL_RELIEF) * 12) },
					{ item: 'PAYE', month: money(-paye), year: money(-paye * 12) },
					{ item: 'Net pay', month: money(net), year: money(net * 12) }
				]
			}
		};
	},
	content: {
		intro: `Work out your Kenyan net salary under the payroll rules in force from February 2026. This Kenya PAYE calculator takes off NSSF (Year 4), SHIF and the Affordable Housing Levy before PAYE, then applies the ${kes(KE_PERSONAL_RELIEF)} monthly personal relief.`,
		howTo: [
			'Enter your monthly gross pay.',
			'Read your NSSF, SHIF and Affordable Housing Levy deductions.',
			'Check the taxable pay, the band tax and the personal relief.',
			'Open the payslip table for the monthly and yearly working.'
		],
		about: [
			{
				heading: 'How PAYE works in Kenya',
				paragraphs: [
					'PAYE (Pay As You Earn) is the income tax your employer deducts from your salary each month and pays to the Kenya Revenue Authority (KRA). This tool uses the payroll rules in force from February 2026, when NSSF moved to Year 4.',
					'First, your NSSF, SHIF and housing levy come off your gross pay. These are allowed deductions, so they lower your taxable pay. Next, the PAYE bands give a tax amount. Then the personal relief comes off that amount.'
				]
			},
			{
				heading: 'Monthly PAYE bands and personal relief',
				paragraphs: [
					`The bands apply to your monthly taxable pay. Only the slice inside each band pays that band’s rate. After the bands, you subtract a personal relief of ${kes(KE_PERSONAL_RELIEF)} a month. The relief cannot make your tax negative.`
				],
				table: { caption: 'Monthly taxable pay', columns: ['Taxable pay slice', 'Rate'], rows: bandRows() }
			},
			{
				heading: 'NSSF, SHIF and the Affordable Housing Levy',
				paragraphs: [
					`NSSF Year 4 takes ${pc(NSSF_RATE)} of your pay, up to ${kes(NSSF_UEL)}. Tier I covers the first ${kes(NSSF_LEL)}. Tier II covers the pay between ${kes(NSSF_LEL)} and ${kes(NSSF_UEL)}. The most you pay is ${kes(NSSF_MAX)} a month, and your employer pays the same.`,
					`SHIF is the Social Health Authority premium. Salaried employees pay ${pc(SHIF_RATE)} of gross pay, with a minimum of ${kes(SHIF_MIN)} a month. There is no upper limit.`,
					`The Affordable Housing Levy is ${pc(AHL_RATE)} of gross pay, with no cap. Since 27 December 2024, both SHIF and the housing levy are deductible before PAYE.`
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'Net pay is your gross pay minus NSSF, SHIF, the housing levy and PAYE. The payslip table shows each line per month and per year.',
					'The top band reached is the rate on your next shilling of taxable pay. If your tax is fully cancelled by the relief, the tool shows 0%. Payslips are usually rounded to the shilling, so your employer’s figure may differ by a small amount.'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: ['Your own payslip may differ, because some items are outside the tool.'],
				list: [
					'Insurance relief and post-retirement medical fund deductions.',
					'Mortgage interest.',
					'Registered pension or provident contributions beyond NSSF.',
					'Benefits in kind and bonuses taxed separately.',
					'The employer’s own housing levy and NSSF share.'
				]
			},
			{
				heading: 'Plan with your net pay',
				paragraphs: [
					'Start your budget from the net figure. The [budget calculator](/budget-calculator) splits it into needs, wants and savings. The [salary calculator](/salary-calculator) converts pay between yearly, monthly and hourly figures.',
					'To save from your pay, try the [savings calculator](/savings-calculator). If you plan to borrow, the [loan calculator](/loan-calculator) shows the monthly payment first.'
				]
			}
		],
		formulas: [
			{
				title: 'Net pay',
				expression: `Taxable = gross − NSSF − SHIF − housing levy; PAYE = band tax − ${kes(KE_PERSONAL_RELIEF)}; Net = gross − NSSF − SHIF − levy − PAYE`,
				variables: [
					{ symbol: 'NSSF', meaning: `${pc(NSSF_RATE)} of pay up to ${kes(NSSF_UEL)}: Tier I on the first ${kes(NSSF_LEL)} (${kes(NSSF_RATE * NSSF_LEL)}), Tier II on the rest (maximum ${kes(NSSF_MAX)} in total)` },
					{ symbol: 'SHIF', meaning: `${pc(SHIF_RATE)} of gross pay, minimum ${kes(SHIF_MIN)}` },
					{ symbol: 'Housing levy', meaning: `${pc(AHL_RATE)} of gross pay` },
					{ symbol: 'Bands', meaning: bandRows().map((r) => `${r[0]} at ${r[1]}`).join('; ') }
				]
			}
		],
		example: {
			title: 'KES 100,000 a month',
			steps: [
				'NSSF = 6% × 100,000 = 6,000; SHIF = 2.75% × 100,000 = 2,750; housing levy = 1.5% × 100,000 = 1,500.',
				'Taxable pay = 100,000 − 10,250 = 89,750.',
				'Band tax = 2,400 + 2,083.25 + 30% × (89,750 − 32,333) = 21,708.35.',
				'PAYE = 21,708.35 − 2,400 = 19,308.35.'
			],
			result: 'Net pay of KES 70,441.65 a month.'
		},
		faq: [
			{ q: 'How is PAYE calculated in Kenya?', a: `Subtract NSSF, SHIF and the housing levy from your gross pay. Apply the monthly bands to the rest, then subtract the ${kes(KE_PERSONAL_RELIEF)} personal relief. This Kenya PAYE calculator does each step.` },
			{ q: 'Are SHIF and the housing levy deducted before PAYE?', a: 'Yes. Since 27 December 2024 the Tax Laws (Amendment) Act 2024 allows SHIF and the Affordable Housing Levy as deductions when working out taxable pay, so they lower your PAYE.' },
			{ q: 'What are the NSSF limits now?', a: `From February 2026 (Year 4) NSSF is ${pc(NSSF_RATE)} on pay up to ${kes(NSSF_UEL)}. Tier I covers the first ${kes(NSSF_LEL)} and Tier II the rest, so the most you pay is ${kes(NSSF_MAX)} a month.` },
			{ q: 'What is the SHIF rate?', a: `${pc(SHIF_RATE)} of gross monthly pay for salaried employees, with a minimum of ${kes(SHIF_MIN)} and no upper limit.` },
			{ q: 'Did the Finance Act 2026 change PAYE?', a: 'The summaries we checked list no change to the PAYE bands, personal relief, SHIF, the housing levy or NSSF. Check KRA for any later notice.' },
			{ q: 'What is not included?', a: 'Insurance relief, mortgage interest, pension or post-retirement medical contributions beyond NSSF, benefits in kind and bonuses taxed separately are not included. Payslips are usually rounded to the shilling.' }
		],
		sources: [KRA_PAYE_SOURCE, KRA_TLAA_SOURCE, NSSF_YEAR4_SOURCE, SHA_PREMIUM_SOURCE, KE_PWC_OTHER_TAXES_SOURCE],
		disclaimer: `An estimate based on ${KE_PERIOD_LABEL}, not payroll or tax advice.`
	}
});
