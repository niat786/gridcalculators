import { defineCalculator, type CalculationResult, type CalculatorInput, type InputValues } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './cpf-contribution-calculator.meta';
import {
	SG_CPF_ALLOCATION_SOURCE,
	SG_CPF_ANNUAL_CEILING,
	SG_CPF_BANDS,
	SG_CPF_FULL_RATE_ABOVE,
	SG_CPF_OW_CEILING,
	SG_CPF_OW_SOURCE,
	SG_CPF_SOURCE,
	SG_CPF_SOURCE_2,
	SG_CPF_SOURCE_3,
	SG_CPF_SOURCE_4,
	type SgCpfBand
} from '../data/sg-2026';

const sgd = (n: number) => money(n);
const dollars = (n: number) => money(n, true);
/** Content is built before a currency is chosen, so format Singapore dollars explicitly. */
const sgdw = (n: number) => moneyIn('SGD', n, true);
const p1 = (x: number) => `${+x.toFixed(2)}%`;

interface Split {
	total: number;
	employee: number;
	employer: number;
	oa: number;
	ra: number;
	ma: number;
}

/** CPF on one payment of wages: total rounded to the nearest dollar, employee's cents dropped, employer is the rest. */
export function cpfOn(wage: number, band: SgCpfBand): Split {
	const totalPct = band.employee + band.employer;
	const total = Math.round(Math.round(wage * totalPct * 1e4) / 1e6 + 1e-9);
	const employee = Math.floor(Math.round(wage * band.employee * 1e4) / 1e6 + 1e-9);
	// Allocation: MediSave first, then SA/RA, and OA takes the rest.
	const ma = Math.round((total * band.ma) / totalPct);
	const ra = Math.round((total * band.ra) / totalPct);
	return { total, employee, employer: total - employee, oa: total - ma - ra, ra, ma };
}

const inputs: CalculatorInput[] = [
	{ id: 'wage', label: 'Monthly ordinary wage', type: 'number', default: 5_000, min: 750.01, max: 10_000_000, step: 100, prefix: '$', help: `Salary before CPF. Only the first $${SG_CPF_OW_CEILING.toLocaleString('en-US')} a month counts. This tool covers wages above $${SG_CPF_FULL_RATE_ABOVE} a month.` },
	{
		id: 'age',
		label: 'Employee age',
		type: 'select',
		default: 'u35',
		display: 'menu',
		options: SG_CPF_BANDS.map((b) => ({ label: b.label, value: b.value })),
		help: 'Singapore citizens and PRs in their third year of PR or later.'
	},
	{ id: 'bonus', label: 'Yearly bonus (additional wage)', type: 'number', default: 0, min: 0, max: 1_000_000_000, step: 1000, prefix: '$', help: 'Optional. Bonuses count up to the yearly ceiling.' }
];

function calculate(v: InputValues): CalculationResult {
	const wage = Number(v.wage);
	const bonus = Number(v.bonus);
	const band = SG_CPF_BANDS.find((b) => b.value === v.age);
	if (!Number.isFinite(wage) || wage <= SG_CPF_FULL_RATE_ABOVE) {
		return { primaryResult: DASH, primaryLabel: 'Total CPF per month', summary: `Enter a monthly wage above $${SG_CPF_FULL_RATE_ABOVE}. Lower wages use different rates that this tool does not cover.` };
	}
	if (!Number.isFinite(bonus) || bonus < 0 || !band) {
		return { primaryResult: DASH, primaryLabel: 'Total CPF per month', summary: 'Choose an age group and enter any bonus as zero or more.' };
	}

	const owSubject = Math.min(wage, SG_CPF_OW_CEILING);
	const m = cpfOn(owSubject, band);
	// Additional wages: ceiling = 102,000 − the OW that counts for the year.
	const awCeiling = Math.max(0, SG_CPF_ANNUAL_CEILING - owSubject * 12);
	const awSubject = Math.min(bonus, awCeiling);
	const b = awSubject > 0 ? cpfOn(awSubject, band) : { total: 0, employee: 0, employer: 0, oa: 0, ra: 0, ma: 0 };

	const takeHome = wage - m.employee;
	const totalPct = band.employee + band.employer;
	const capped = wage > SG_CPF_OW_CEILING;
	const summary =
		`At ${pct(totalPct, 1)} of ${dollars(owSubject)}${capped ? ` (your wage is above the ${dollars(SG_CPF_OW_CEILING)} ceiling)` : ''}, ${sgd(m.employee)} comes from you and ${sgd(m.employer)} from your employer.` +
		(bonus > 0 ? ` On a ${dollars(bonus)} bonus the yearly CPF is ${sgd(b.total)}.` : '');

	return {
		primaryResult: sgd(m.total),
		primaryLabel: 'Total CPF per month',
		summary,
		secondaryMetrics: [
			{ label: `Employee share (${pct(band.employee, 1)})`, value: sgd(m.employee) },
			{ label: `Employer share (${pct(band.employer, 1)})`, value: sgd(m.employer) },
			{ label: 'Take-home pay before tax', value: sgd(takeHome) },
			{ label: 'Ordinary Account (OA)', value: sgd(m.oa) },
			{ label: band.raName === 'Special Account' ? 'Special Account (SA)' : 'Retirement Account (RA)', value: sgd(m.ra) },
			{ label: 'MediSave Account (MA)', value: sgd(m.ma) },
			{ label: 'CPF on the bonus (employee + employer)', value: sgd(b.total) }
		],
		table: {
			title: 'CPF split, monthly wage and yearly bonus',
			columns: [
				{ key: 'item', label: 'Item' },
				{ key: 'wage', label: 'Monthly wage', align: 'end' },
				{ key: 'bonus', label: 'Bonus', align: 'end' }
			],
			rows: [
				{ item: 'Wages that count', wage: sgd(owSubject), bonus: sgd(awSubject) },
				{ item: 'Employee', wage: sgd(m.employee), bonus: sgd(b.employee) },
				{ item: 'Employer', wage: sgd(m.employer), bonus: sgd(b.employer) },
				{ item: 'Total', wage: sgd(m.total), bonus: sgd(b.total) },
				{ item: 'Ordinary Account', wage: sgd(m.oa), bonus: sgd(b.oa) },
				{ item: band.raName, wage: sgd(m.ra), bonus: sgd(b.ra) },
				{ item: 'MediSave Account', wage: sgd(m.ma), bonus: sgd(b.ma) }
			]
		}
	};
}

export default defineCalculator({
	meta,
	inputs,
	calculate,
	content: {
		intro: `See how much CPF you and your employer pay each month in Singapore in 2026, and how it is split between the Ordinary, Special or Retirement, and MediSave accounts. This CPF contribution calculator uses the rates for citizens and PRs in their third year or later.`,
		howTo: [
			'Enter your monthly ordinary wage and pick your age group.',
			'Add a yearly bonus if you want to see the CPF on it.',
			'Read the employee and employer shares, and the take-home pay before tax.',
			'Check the split into the OA, SA or RA, and MA accounts.'
		],
		about: [
			{
				heading: 'What is CPF?',
				paragraphs: [
					'The Central Provident Fund (CPF) is Singapore’s compulsory savings scheme for working citizens and permanent residents. Each month, you and your employer pay a share of your wages into your CPF accounts. The money is for retirement, housing and healthcare.',
					`This tool uses the rates from 1 January 2026. They apply to citizens and PRs in their third year of PR or later, on wages above ${sgdw(SG_CPF_FULL_RATE_ABOVE)} a month.`
				]
			},
			{
				heading: 'CPF contribution and allocation rates from 1 January 2026',
				paragraphs: [
					'The rate depends on your age. Younger workers have a higher total rate, and older workers have a lower one. The table also shows how each month’s CPF is split between your accounts, as a percentage of your wages.',
					'Up to age 55 the second account is the Special Account (SA). From 55 it is the Retirement Account (RA).'
				],
				table: {
					caption: 'Percentage of monthly wages, citizens and PRs in their third year or later',
					columns: ['Age', 'You', 'Employer', 'Total', 'OA', 'SA or RA', 'MA'],
					rows: SG_CPF_BANDS.map((b) => [b.label, p1(b.employee), p1(b.employer), p1(b.employee + b.employer), p1(b.oa), p1(b.ra), p1(b.ma)])
				}
			},
			{
				heading: 'Wage ceilings and rounding',
				paragraphs: [
					`Only the first ${sgdw(SG_CPF_OW_CEILING)} of your monthly ordinary wage attracts CPF from 1 January 2026. If you earn more, the extra pay is not counted for CPF.`,
					`Bonuses count too, but there is a yearly limit. The wages that count in a year are capped at ${sgdw(SG_CPF_ANNUAL_CEILING)}, so the room for bonuses is ${sgdw(SG_CPF_ANNUAL_CEILING)} minus the ordinary wages that already count. At the ${sgdw(SG_CPF_OW_CEILING)} monthly ceiling, that leaves ${sgdw(SG_CPF_ANNUAL_CEILING - 12 * SG_CPF_OW_CEILING)} for bonuses.`,
					'For rounding, the total contribution is rounded to the nearest dollar. The employee share drops the cents, and the employer pays the rest.'
				]
			},
			{
				heading: 'How to read your result',
				paragraphs: [
					'The employee share is what leaves your pay. The employer share is paid on top, so it does not reduce your salary. Your take-home pay before tax is your wage minus the employee share.',
					'The split shows where the money goes. Ordinary Account money can be used for housing, MediSave is for healthcare, and the SA or RA builds your retirement savings.',
					'Your CPF contributions also lower your taxable income. See the effect in the [Singapore income tax calculator](/singapore-income-tax-calculator).'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: ['The tool follows the standard rates only. Some cases use other rules, so check the CPF Board for them.'],
				list: [
					'First- and second-year PRs, who pay graduated rates.',
					`Wages of ${sgdw(SG_CPF_FULL_RATE_ABOVE)} a month or less.`,
					'The annual CPF limit and the CPF Voluntary Contribution rules.',
					'Caps on MediSave and retirement account balances.'
				]
			},
			{
				heading: 'Planning ahead',
				paragraphs: [
					'Use the take-home figure to plan your month with the [budget calculator](/budget-calculator). For retirement, the [retirement calculator](/retirement-calculator) shows what your savings can support, and the [savings calculator](/savings-calculator) tests extra savings on top of CPF.',
					'To compare pay offers, the [salary calculator](/salary-calculator) converts any pay rate into monthly and yearly amounts.'
				]
			}
		],
		formulas: [
			{
				title: 'Rates from 1 January 2026 (employee + employer)',
				expression: SG_CPF_BANDS.map((b) => `${b.label}: ${p1(b.employee)} + ${p1(b.employer)}`).join(' · '),
				variables: [
					{ symbol: 'OW ceiling', meaning: `Only the first ${sgdw(SG_CPF_OW_CEILING)} of monthly ordinary wages attracts CPF from 1 January 2026` },
					{ symbol: 'AW ceiling', meaning: `Bonuses count up to ${sgdw(SG_CPF_ANNUAL_CEILING)} minus the ordinary wages that count in the year` },
					{ symbol: 'Rounding', meaning: 'The total is rounded to the nearest dollar, the employee share drops the cents, and the employer pays the rest' }
				]
			},
			{
				title: `Split between accounts (percentage of wages, ${SG_CPF_BANDS[0].label.toLowerCase()})`,
				expression: `OA ${p1(SG_CPF_BANDS[0].oa)} · SA ${p1(SG_CPF_BANDS[0].ra)} · MA ${p1(SG_CPF_BANDS[0].ma)} (total ${p1(SG_CPF_BANDS[0].employee + SG_CPF_BANDS[0].employer)})`,
				variables: [{ symbol: 'Older ages', meaning: 'The split shifts towards MediSave and the Retirement Account. From 55 the Special Account is replaced by the Retirement Account' }]
			}
		],
		example: {
			title: '$5,000 a month, age 35 and below',
			steps: [
				'Total: 37% × $5,000 = $1,850.',
				'Employee: 20% × $5,000 = $1,000. Employer: $1,850 − $1,000 = $850.',
				'Split: OA $1,150 (23%), SA $300 (6%), MA $400 (8%).'
			],
			result: 'Total CPF $1,850 a month; take-home before tax $4,000'
		},
		faq: [
			{ q: 'How much CPF do I pay in Singapore?', a: `If you are 55 or below, you pay ${p1(SG_CPF_BANDS[0].employee)} of your monthly wage and your employer pays ${p1(SG_CPF_BANDS[0].employer)}. The rate falls with age. The wage counted is capped at ${sgdw(SG_CPF_OW_CEILING)} a month.` },
			{ q: 'What changed in 2026?', a: `The monthly ordinary wage ceiling rose to ${sgdw(SG_CPF_OW_CEILING)}. The CPF Board also changed the contribution rates for senior workers from 1 January 2026. The table above shows the rates the tool uses.` },
			{ q: 'Do bonuses attract CPF?', a: `Yes, up to the additional wage ceiling: ${sgdw(SG_CPF_ANNUAL_CEILING)} minus the ordinary wages that count for CPF in the year. At the ${sgdw(SG_CPF_OW_CEILING)} ceiling, that leaves ${sgdw(SG_CPF_ANNUAL_CEILING - 12 * SG_CPF_OW_CEILING)} for bonuses.` },
			{ q: 'Does the employer share reduce my salary?', a: 'No. Your employer pays its share on top of your wage. Only the employee share comes out of your pay, so take-home pay is your wage minus that share.' },
			{ q: 'Does CPF affect my income tax?', a: 'Yes. Your own CPF contributions are a tax relief. Use the [Singapore income tax calculator](/singapore-income-tax-calculator) to see the effect.' },
			{ q: 'What is not included?', a: `First- and second-year PRs (graduated rates), wages of ${sgdw(SG_CPF_FULL_RATE_ABOVE)} or less, the annual CPF limit and caps on the MediSave and retirement accounts are not modelled.` }
		],
		sources: [SG_CPF_SOURCE, SG_CPF_OW_SOURCE, SG_CPF_ALLOCATION_SOURCE, SG_CPF_SOURCE_2, SG_CPF_SOURCE_3, SG_CPF_SOURCE_4],
		disclaimer: 'Estimate based on the published CPF rates for 2026. It is not financial advice. Your payslip and the CPF Board are the final word.'
	}
});
