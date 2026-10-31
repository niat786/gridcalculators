import { defineCalculator, type CalculationResult, type CalculatorInput, type InputValues } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './pakistan-salary-tax-calculator.meta';
import {
	PK_KPMG_SOURCE,
	PK_PREV_TAX_YEAR_LABEL,
	PK_PREV_YEAR_SOURCE,
	PK_PREV_YEAR_SOURCE_2,
	PK_PWC_SOURCE,
	PK_SALARIED_SLABS_2026,
	PK_SALARIED_SLABS_2027,
	PK_SURCHARGE_2026,
	PK_SURCHARGE_2027,
	PK_TAX_YEAR_LABEL,
	PK_TAX_YEAR_PERIOD,
	PK_VIALTO_SOURCE,
	type PkSlab
} from '../data/pk-tax-2027';

const rs = (n: number) => money(n, true);
/** Content is written at build time, so format rupees explicitly. */
const pkr = (n: number) => moneyIn('PKR', n, true);

/** Progressive tax on the slabs, then the surcharge (a percentage of the tax) above its income threshold. */
export function pkSalaryTax(income: number, slabs: PkSlab[], surcharge: { rate: number; threshold: number }) {
	let prev = 0;
	let slabTax = 0;
	for (const s of slabs) {
		const hi = s.upTo ?? Infinity;
		if (income > prev) slabTax += (Math.min(income, hi) - prev) * s.rate;
		prev = hi;
	}
	const sur = income > surcharge.threshold ? slabTax * surcharge.rate : 0;
	return { slabTax, surcharge: sur, total: slabTax + sur };
}

function pkrTax(income: number, year: 2026 | 2027): number {
	return year === 2027 ? pkSalaryTax(income, PK_SALARIED_SLABS_2027, PK_SURCHARGE_2027).total : pkSalaryTax(income, PK_SALARIED_SLABS_2026, PK_SURCHARGE_2026).total;
}

/** Rows for the tax year 2027 slab table: band, fixed tax below the band, rate on the excess. */
function slabRows(): string[][] {
	let prev = 0;
	let fixed = 0;
	return PK_SALARIED_SLABS_2027.map((s) => {
		const row = [
			s.upTo === null ? `Over ${pkr(prev)}` : prev === 0 ? `Up to ${pkr(s.upTo)}` : `${pkr(prev + 1)} to ${pkr(s.upTo)}`,
			fixed === 0 ? 'Nil' : pkr(fixed),
			s.rate === 0 ? 'Nil' : pct(s.rate * 100, 0)
		];
		if (s.upTo !== null) {
			fixed += (s.upTo - prev) * s.rate;
			prev = s.upTo;
		}
		return row;
	});
}

function slabExpression(): string {
	return slabRows()
		.map((r, i) => (i === 0 ? `${r[0]}: nil` : `${r[0]}: ${r[1] === 'Nil' ? '' : `${r[1]} + `}${r[2]} of the excess`))
		.join(' · ');
}

const inputs: CalculatorInput[] = [
	{
		id: 'period',
		label: 'Salary entered as',
		type: 'select',
		default: 'monthly',
		options: [
			{ label: 'Monthly', value: 'monthly' },
			{ label: 'Annual', value: 'annual' }
		],
		display: 'segmented'
	},
	{
		id: 'salary',
		label: 'Taxable salary',
		type: 'number',
		default: 250_000,
		min: 0,
		max: 100_000_000_000,
		step: 1000,
		prefix: '$',
		decimal: false,
		help: 'Gross taxable salary, before tax. Include bonuses; leave out exempt allowances.'
	}
];

const bandLabel = (slabs: PkSlab[], i: number) => {
	const from = i === 0 ? 0 : (slabs[i - 1].upTo as number);
	const to = slabs[i].upTo;
	return to === null ? `Over ${rs(from)}` : i === 0 ? `Up to ${rs(to)}` : `${rs(from)} to ${rs(to)}`;
};

function calculate(v: InputValues): CalculationResult {
	const amount = Number(v.salary);
	if (!Number.isFinite(amount) || amount < 0 || (v.period !== 'monthly' && v.period !== 'annual')) {
		return { primaryResult: DASH, primaryLabel: 'Monthly tax', summary: 'Enter your salary as zero or more.' };
	}
	const annual = v.period === 'monthly' ? amount * 12 : amount;
	if (annual > 1_000_000_000_000) {
		return { primaryResult: DASH, primaryLabel: 'Monthly tax', summary: 'That salary is too large to calculate.' };
	}
	const t27 = pkSalaryTax(annual, PK_SALARIED_SLABS_2027, PK_SURCHARGE_2027);
	const t26 = pkSalaryTax(annual, PK_SALARIED_SLABS_2026, PK_SURCHARGE_2026);
	const monthlyTax = t27.total / 12;
	const takeHome = (annual - t27.total) / 12;
	const effective = annual > 0 ? (t27.total / annual) * 100 : 0;
	const diff = t26.total - t27.total;

	// Tax falling in each slab (tax year 2027), shown next to both years' rates.
	let prev = 0;
	const rows = PK_SALARIED_SLABS_2027.map((s, i) => {
		const hi = s.upTo ?? Infinity;
		const inSlab = Math.max(0, Math.min(annual, hi) - prev);
		prev = hi;
		return {
			band: bandLabel(PK_SALARIED_SLABS_2027, i),
			r27: pct(s.rate * 100),
			r26: pct(PK_SALARIED_SLABS_2026[i].rate * 100),
			yours: rs(inSlab * s.rate)
		};
	});

	const summary =
		annual === 0
			? 'No salary entered, so no tax.'
			: t27.total === 0
				? `Annual salary of ${rs(annual)} is within the tax-free slab for ${PK_TAX_YEAR_LABEL}.`
				: `Annual tax on ${rs(annual)} is ${rs(t27.total)}, an effective rate of ${pct(effective)} for ${PK_TAX_YEAR_LABEL}.`;

	return {
		primaryResult: rs(monthlyTax),
		primaryLabel: `Monthly tax (${PK_TAX_YEAR_LABEL})`,
		summary,
		secondaryMetrics: [
			{ label: 'Annual taxable income', value: rs(annual) },
			{ label: 'Annual tax', value: rs(t27.total) },
			{ label: 'Monthly take-home', value: rs(takeHome) },
			{ label: 'Effective tax rate', value: pct(effective) },
			{ label: `Annual tax, ${PK_PREV_TAX_YEAR_LABEL}`, value: rs(t26.total) },
			{ label: diff >= 0 ? 'Saving vs last year' : 'Extra vs last year', value: rs(Math.abs(diff)) }
		],
		table: {
			title: `Salaried slabs, ${PK_TAX_YEAR_LABEL} vs ${PK_PREV_TAX_YEAR_LABEL}`,
			columns: [
				{ key: 'band', label: 'Annual income' },
				{ key: 'r27', label: 'Rate 2027', align: 'end' },
				{ key: 'r26', label: 'Rate 2026', align: 'end' },
				{ key: 'yours', label: 'Your 2027 tax in slab', align: 'end' }
			],
			rows
		}
	};
}

export default defineCalculator({
	meta,
	inputs,
	calculate,
	content: {
		intro: `Use this Pakistan salary tax calculator to work out income tax on a salary for ${PK_TAX_YEAR_LABEL} (${PK_TAX_YEAR_PERIOD}). It uses the salaried-individual slabs set by the Finance Act 2026, and shows last year’s tax so you can compare.`,
		howTo: [
			'Choose whether you are entering a monthly or an annual salary.',
			'Enter your taxable salary before tax. Include bonuses, and leave out exempt allowances.',
			'Read the monthly tax, the annual tax and the monthly take-home pay.',
			'Check the slab table, which shows last year’s rates beside this year’s.'
		],
		about: [
			{
				heading: `How salary tax works in Pakistan for ${PK_TAX_YEAR_LABEL}`,
				paragraphs: [
					`Pakistan taxes salaried people on progressive slabs. That means each part of your income is taxed at its own rate. Only the part above a limit pays the higher rate. The year runs from ${PK_TAX_YEAR_PERIOD}.`,
					`The first ${pkr(PK_SALARIED_SLABS_2027[0].upTo!)} of annual taxable income is taxed at nil. Above that, the rate climbs from ${pct(PK_SALARIED_SLABS_2027[1].rate * 100)} to ${pct(PK_SALARIED_SLABS_2027[PK_SALARIED_SLABS_2027.length - 1].rate * 100)}.`,
					'The table applies where your salary is more than 75% of your taxable income. If you have other income, such as business income, other slabs may apply.'
				]
			},
			{
				heading: `Salaried tax slabs for ${PK_TAX_YEAR_LABEL}`,
				paragraphs: ['Source: First Schedule, Part I, Division I, as changed by the Finance Act 2026. The “fixed tax” is what you pay on the income below the band.'],
				table: {
					caption: `Salaried individuals, ${PK_TAX_YEAR_LABEL}`,
					columns: ['Annual income', 'Fixed tax', 'Rate on the excess'],
					rows: slabRows()
				}
			},
			{
				heading: 'What changed from the previous year?',
				paragraphs: [
					`In ${PK_PREV_TAX_YEAR_LABEL}, the middle slabs were ${pct(PK_SALARIED_SLABS_2026[3].rate * 100, 0)}, ${pct(PK_SALARIED_SLABS_2026[4].rate * 100, 0)} and ${pct(PK_SALARIED_SLABS_2026[5].rate * 100, 0)}. In ${PK_TAX_YEAR_LABEL}, they are ${pct(PK_SALARIED_SLABS_2027[3].rate * 100, 0)}, ${pct(PK_SALARIED_SLABS_2027[4].rate * 100, 0)}, ${pct(PK_SALARIED_SLABS_2027[5].rate * 100, 0)} and ${pct(PK_SALARIED_SLABS_2027[6].rate * 100, 0)}. So the top rate of ${pct(PK_SALARIED_SLABS_2027[7].rate * 100, 0)} now starts at ${pkr(PK_SALARIED_SLABS_2027[6].upTo!)}.`,
					`The ${pct(PK_SURCHARGE_2026.rate * 100, 0)} surcharge on salaried income above ${pkr(PK_SURCHARGE_2026.threshold)} applied in ${PK_PREV_TAX_YEAR_LABEL}. It is withdrawn for salaried people in ${PK_TAX_YEAR_LABEL}.`,
					`For example, on an annual salary of ${pkr(5_000_000)}, tax falls from ${pkr(pkrTax(5_000_000, 2026))} to ${pkr(pkrTax(5_000_000, 2027))}.`
				]
			},
			{
				heading: 'What your take-home pay includes',
				paragraphs: [
					'Take-home pay here means your salary minus income tax, divided by 12. Other deductions are not included. These can be EOBI, a provident fund or loan repayments.',
					'For a general view of pay after tax in other countries, try the [take-home pay calculator](/take-home-pay-calculator) or the [salary calculator](/salary-calculator).'
				]
			},
			{
				heading: 'Tips for using the result',
				paragraphs: ['A few habits make the estimate more useful.'],
				list: [
					'Enter your taxable salary, not your total package. Leave out allowances that are exempt.',
					'If your pay changes during the year, try the annual option with your expected total.',
					'Compare the two years in the table to see how much the change in slabs helps at your level.',
					'Keep your payslips and your tax certificate when you file a return.'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					'It leaves out tax credits and deductions, for example on pension contributions, donations or investment. It also leaves out exempt allowances, non-salary income and non-residents. It assumes your whole taxable income is salary.',
					'If you buy or sell property, see the [Pakistan property tax calculator](/pakistan-property-tax-calculator). If you earn or send money across borders, the [currency converter](/currency-converter) shows mid-market rates, and the [zakat calculator](/zakat-calculator) helps with yearly giving. For a neighbour country, see the [Bangladesh income tax calculator](/bangladesh-income-tax-calculator).'
				]
			}
		],
		formulas: [
			{
				title: `Salaried slabs, ${PK_TAX_YEAR_LABEL} (First Schedule, Part I, Division I)`,
				expression: slabExpression(),
				variables: [
					{ symbol: 'Surcharge', meaning: `None for salaried people in ${PK_TAX_YEAR_LABEL}. ${PK_PREV_TAX_YEAR_LABEL} had ${pct(PK_SURCHARGE_2026.rate * 100, 0)} of the tax above ${pkr(PK_SURCHARGE_2026.threshold)}.` },
					{ symbol: 'Take-home', meaning: '(annual salary − annual tax) ÷ 12. EOBI, provident fund and loan deductions are not included.' },
					{ symbol: 'Who it applies to', meaning: 'Individuals whose salary is more than 75% of their taxable income. Others use the business slabs.' }
				]
			}
		],
		example: {
			title: `Monthly salary of ${pkr(250_000)}`,
			steps: [
				`Annual salary: 250,000 × 12 = ${pkr(3_000_000)}.`,
				`Tax: ${pkr(116_000)} on the first ${pkr(2_200_000)}, plus ${pct(PK_SALARIED_SLABS_2027[3].rate * 100, 0)} of the ${pkr(800_000)} above it (${pkr(160_000)}) = ${pkr(276_000)}.`,
				`Monthly tax: 276,000 ÷ 12 = ${pkr(23_000)}. Monthly take-home: 250,000 − 23,000 = ${pkr(227_000)}.`
			],
			result: `${pkr(23_000)} a month in tax; ${pkr(276_000)} a year (9.2% effective).`
		},
		faq: [
			{ q: 'How is salary tax calculated in Pakistan?', a: `Add up your annual taxable salary, then apply the progressive slabs for ${PK_TAX_YEAR_LABEL}. Each part of your income is taxed at its own rate. Divide the annual tax by 12 for the monthly amount.` },
			{ q: 'What changed for salaried people in tax year 2027?', a: `The ${pct(PK_SALARIED_SLABS_2026[3].rate * 100, 0)}, ${pct(PK_SALARIED_SLABS_2026[4].rate * 100, 0)} and ${pct(PK_SALARIED_SLABS_2026[5].rate * 100, 0)} slabs were replaced by ${pct(PK_SALARIED_SLABS_2027[3].rate * 100, 0)}, ${pct(PK_SALARIED_SLABS_2027[4].rate * 100, 0)}, ${pct(PK_SALARIED_SLABS_2027[5].rate * 100, 0)} and ${pct(PK_SALARIED_SLABS_2027[6].rate * 100, 0)} slabs. The ${pct(PK_SURCHARGE_2026.rate * 100, 0)} surcharge above ${pkr(PK_SURCHARGE_2026.threshold)} was withdrawn.` },
			{ q: 'What is the tax-free limit?', a: `The first ${pkr(PK_SALARIED_SLABS_2027[0].upTo!)} of annual taxable income is taxed at nil. Above it, the rate is ${pct(PK_SALARIED_SLABS_2027[1].rate * 100)} up to ${pkr(PK_SALARIED_SLABS_2027[1].upTo!)}.` },
			{ q: 'Does this apply if I have business income too?', a: 'The slabs apply where your salary is more than 75% of your taxable income. If not, other slabs apply, and this tool does not cover them.' },
			{ q: 'What does this not include?', a: 'Tax credits and deductions (for example on pension contributions, donations or investment), exempt allowances, non-salary income and non-residents. It assumes your whole taxable income is salary.' }
		],
		sources: [PK_KPMG_SOURCE, PK_PWC_SOURCE, PK_VIALTO_SOURCE, PK_PREV_YEAR_SOURCE, PK_PREV_YEAR_SOURCE_2],
		disclaimer: 'Estimate for a resident salaried individual. Check your figures with FBR or a tax adviser before filing.'
	}
});
