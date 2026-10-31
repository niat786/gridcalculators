import { defineCalculator, type CalculationResult, type CalculatorInput, type InputValues } from '../types';
import { DASH, money, moneyIn, pct } from '../format';
import meta from './malaysia-income-tax-calculator.meta';
import {
	MY_RELIEF_CHILD_18_PLUS_HIGHER,
	MY_RELIEF_CHILD_18_PLUS_PRE_UNI,
	MY_RELIEF_CHILD_UNDER_18,
	MY_RELIEF_CHILDCARE_CAP,
	MY_RELIEF_DISABLED_SELF,
	MY_RELIEF_EDUCATION_CAP,
	MY_RELIEF_EPF_CAP,
	MY_RELIEF_LIFE_INSURANCE_CAP,
	MY_RELIEF_LIFESTYLE_CAP,
	MY_RELIEF_MEDICAL_CAP,
	MY_RELIEF_MEDICAL_INSURANCE_CAP,
	MY_RELIEF_PARENTS_CAP,
	MY_RELIEF_PRS_CAP,
	MY_RELIEF_SELF,
	MY_RELIEF_SOCSO_CAP,
	MY_RELIEF_SOURCE,
	MY_RELIEF_SOURCE_2,
	MY_RELIEF_SPORTS_CAP,
	MY_RELIEF_SPOUSE,
	MY_RELIEF_SSPN_CAP,
	MY_REBATE_AMOUNT,
	MY_REBATE_LIMIT,
	MY_TAX_BANDS,
	MY_TAX_SOURCE,
	MY_TAX_SOURCE_2,
	MY_TAX_SOURCE_3,
	MY_TAX_YEAR_LABEL,
	MY_TAX_YEAR_LONG
} from '../data/my-2026';

const cents = (n: number) => Math.round(n * 100) / 100;
const rm = (n: number) => money(n);
const rmWhole = (n: number) => money(n, true);
/** Content is built before a currency is chosen, so format ringgit explicitly. */
const myr = (n: number) => moneyIn('MYR', n, true);
const pc = (x: number) => `${+(x * 100).toFixed(2)}%`;
function bandRows(): string[][] {
	return MY_TAX_BANDS.map((b, i) => {
		const next = MY_TAX_BANDS[i + 1];
		const band = i === 0 ? `First ${myr(next.over)}` : next ? `${myr(b.over + 1)} to ${myr(next.over)}` : `Above ${myr(b.over)}`;
		return [band, pc(b.rate)];
	});
}

/** Tax on chargeable income using the resident bands. */
export function myTax(chargeable: number): number {
	let tax = 0;
	for (let i = 0; i < MY_TAX_BANDS.length; i++) {
		const lo = MY_TAX_BANDS[i].over;
		const hi = i + 1 < MY_TAX_BANDS.length ? MY_TAX_BANDS[i + 1].over : Infinity;
		if (chargeable > lo) tax += (Math.min(chargeable, hi) - lo) * MY_TAX_BANDS[i].rate;
	}
	return cents(tax);
}

const capHelp = (cap: number) => `Capped at RM${cap.toLocaleString('en-US')}.`;
const field = (id: string, label: string, def: number, cap: number, extra = ''): CalculatorInput => ({
	id,
	label,
	type: 'number',
	default: def,
	min: 0,
	max: 1_000_000_000,
	step: 100,
	prefix: '$',
	help: `${capHelp(cap)}${extra ? ' ' + extra : ''}`
});

const inputs: CalculatorInput[] = [
	{ id: 'income', label: 'Total yearly income', type: 'number', default: 72_000, min: 0, max: 10_000_000_000, step: 1000, prefix: '$', help: 'Salary, bonus and other taxable income for 2026, before reliefs.' },
	{ id: 'disabled', label: 'You are a person with a disability', type: 'toggle', default: false },
	{ id: 'spouse', label: 'Spouse relief (spouse has no income)', type: 'toggle', default: false },
	{ id: 'kids', label: 'Children under 18, or 18+ in pre-university study', type: 'number', default: 0, min: 0, max: 30, step: 1, decimal: false, suffix: 'children', help: 'RM2,000 each.' },
	{ id: 'kidsHigher', label: 'Children 18+ in diploma, degree or higher', type: 'number', default: 0, min: 0, max: 30, step: 1, decimal: false, suffix: 'children', help: 'RM8,000 each. Full-time study.' },
	field('epf', 'EPF contributions paid', 7_920, MY_RELIEF_EPF_CAP, 'Your own contributions for the year.'),
	field('life', 'Life insurance or takaful premiums', 3_000, MY_RELIEF_LIFE_INSURANCE_CAP),
	field('medIns', 'Education or medical insurance premiums', 0, MY_RELIEF_MEDICAL_INSURANCE_CAP),
	field('socso', 'SOCSO and EIS contributions', 350, MY_RELIEF_SOCSO_CAP),
	field('prs', 'Private retirement scheme or deferred annuity', 0, MY_RELIEF_PRS_CAP),
	field('sspn', 'Net savings in SSPN', 0, MY_RELIEF_SSPN_CAP),
	field('childcare', 'Childcare or kindergarten fees', 0, MY_RELIEF_CHILDCARE_CAP),
	field('medical', 'Serious illness, fertility and medical check-up costs', 0, MY_RELIEF_MEDICAL_CAP, 'Self, spouse or child.'),
	field('parents', 'Medical care for parents or grandparents', 0, MY_RELIEF_PARENTS_CAP),
	field('education', 'Your own education fees', 0, MY_RELIEF_EDUCATION_CAP),
	field('lifestyle', 'Lifestyle spending (books, phone, internet, courses)', 2_500, MY_RELIEF_LIFESTYLE_CAP),
	field('sports', 'Sports equipment and fees', 0, MY_RELIEF_SPORTS_CAP),
	{ id: 'otherRelief', label: 'Other reliefs, already within their own limits', type: 'number', default: 0, min: 0, max: 1_000_000_000, step: 100, prefix: '$', help: 'For example domestic tourism, housing loan interest or a disabled spouse.' },
	{ id: 'zakat', label: 'Zakat or fitrah paid', type: 'number', default: 0, min: 0, max: 1_000_000_000, step: 100, prefix: '$', help: 'Counts as a rebate, ringgit for ringgit.' }
];

function num0(x: unknown): number {
	const n = Number(x);
	return n;
}

function calculate(v: InputValues): CalculationResult {
	const income = num0(v.income);
	if (!Number.isFinite(income) || income < 0) {
		return { primaryResult: DASH, primaryLabel: 'Income tax payable', summary: 'Enter your yearly income as zero or more.' };
	}
	const amount = (id: string, cap = Infinity) => {
		const n = num0(v[id]);
		return Number.isFinite(n) && n >= 0 ? Math.min(n, cap) : NaN;
	};
	const kids = amount('kids');
	const kidsHigher = amount('kidsHigher');
	const items = {
		epf: amount('epf', MY_RELIEF_EPF_CAP),
		life: amount('life', MY_RELIEF_LIFE_INSURANCE_CAP),
		medIns: amount('medIns', MY_RELIEF_MEDICAL_INSURANCE_CAP),
		socso: amount('socso', MY_RELIEF_SOCSO_CAP),
		prs: amount('prs', MY_RELIEF_PRS_CAP),
		sspn: amount('sspn', MY_RELIEF_SSPN_CAP),
		childcare: amount('childcare', MY_RELIEF_CHILDCARE_CAP),
		medical: amount('medical', MY_RELIEF_MEDICAL_CAP),
		parents: amount('parents', MY_RELIEF_PARENTS_CAP),
		education: amount('education', MY_RELIEF_EDUCATION_CAP),
		lifestyle: amount('lifestyle', MY_RELIEF_LIFESTYLE_CAP),
		sports: amount('sports', MY_RELIEF_SPORTS_CAP),
		other: amount('otherRelief')
	};
	const zakat = amount('zakat');
	if ([kids, kidsHigher, zakat, ...Object.values(items)].some((x) => Number.isNaN(x))) {
		return { primaryResult: DASH, primaryLabel: 'Income tax payable', summary: 'Enter every relief and payment as zero or more.' };
	}

	const fixed =
		MY_RELIEF_SELF +
		(v.disabled === true ? MY_RELIEF_DISABLED_SELF : 0) +
		(v.spouse === true ? MY_RELIEF_SPOUSE : 0) +
		Math.floor(kids) * MY_RELIEF_CHILD_UNDER_18 +
		Math.floor(kidsHigher) * MY_RELIEF_CHILD_18_PLUS_HIGHER;
	const claimed = Object.values(items).reduce((a, b) => a + b, 0);
	const reliefs = fixed + claimed;
	const chargeable = Math.max(0, income - reliefs);

	const taxBefore = myTax(chargeable);
	const autoRebate = chargeable <= MY_REBATE_LIMIT && taxBefore > 0 ? Math.min(MY_REBATE_AMOUNT, taxBefore) : 0;
	const zakatRebate = Math.min(zakat, taxBefore - autoRebate);
	const payable = cents(taxBefore - autoRebate - zakatRebate);

	// Marginal rate of the band the chargeable income sits in.
	let marginal = 0;
	for (const b of MY_TAX_BANDS) if (chargeable > b.over) marginal = b.rate;

	const summary =
		chargeable <= 0
			? `Your reliefs of ${rm(reliefs)} cover all of your ${rm(income)} income, so no tax is due.`
			: `${rm(income)} income − ${rm(reliefs)} reliefs = ${rm(chargeable)} chargeable income. Tax ${rm(taxBefore)}` +
				(autoRebate + zakatRebate > 0 ? ` less ${rm(autoRebate + zakatRebate)} rebates` : '') +
				` = ${rm(payable)}.`;

	return {
		primaryResult: rm(payable),
		primaryLabel: 'Income tax payable',
		summary,
		secondaryMetrics: [
			{ label: 'Chargeable income', value: rm(chargeable) },
			{ label: 'Total reliefs', value: rm(reliefs) },
			{ label: 'Tax before rebates', value: rm(taxBefore) },
			{ label: 'RM400 rebate', value: rm(autoRebate) },
			{ label: 'Zakat rebate', value: rm(zakatRebate) },
			{ label: 'Average tax rate on income', value: income > 0 ? pct((payable / income) * 100, 2) : pct(0) },
			{ label: 'Rate on your next ringgit', value: pct(marginal * 100, 0) }
		],
		table: {
			title: `${MY_TAX_YEAR_LABEL} reliefs applied`,
			columns: [
				{ key: 'item', label: 'Relief' },
				{ key: 'amount', label: 'Amount', align: 'end' }
			],
			rows: [
				{ item: 'Individual', amount: rmWhole(MY_RELIEF_SELF) },
				{ item: 'Disabled individual and spouse', amount: rmWhole((v.disabled === true ? MY_RELIEF_DISABLED_SELF : 0) + (v.spouse === true ? MY_RELIEF_SPOUSE : 0)) },
				{ item: 'Children', amount: rmWhole(Math.floor(kids) * MY_RELIEF_CHILD_UNDER_18 + Math.floor(kidsHigher) * MY_RELIEF_CHILD_18_PLUS_HIGHER) },
				{ item: 'EPF and life insurance', amount: rm(items.epf + items.life) },
				{ item: 'Insurance, SOCSO, PRS and SSPN', amount: rm(items.medIns + items.socso + items.prs + items.sspn) },
				{ item: 'Medical, parents and education', amount: rm(items.medical + items.parents + items.education + items.childcare) },
				{ item: 'Lifestyle, sports and other', amount: rm(items.lifestyle + items.sports + items.other) },
				{ item: 'Total reliefs', amount: rm(reliefs) }
			]
		}
	};
}

export default defineCalculator({
	meta,
	inputs,
	calculate,
	content: {
		intro: `Estimate your Malaysian income tax for ${MY_TAX_YEAR_LABEL} (income earned in 2026) as a tax resident. This Malaysia income tax calculator takes off your reliefs, applies the resident rates, then the ${myr(MY_REBATE_AMOUNT)} and zakat rebates.`,
		howTo: [
			'Enter your total yearly income, then tick the personal reliefs that apply to you.',
			'Fill in what you paid for EPF, insurance, medical care, lifestyle and other reliefs. Each is capped at its own limit.',
			'Add any zakat or fitrah you paid, because it lowers your tax ringgit for ringgit.',
			'Read your chargeable income, rebates and the tax payable.'
		],
		about: [
			{
				heading: `How Malaysian income tax works for ${MY_TAX_YEAR_LABEL}`,
				paragraphs: [
					`This tool covers the ${MY_TAX_YEAR_LONG}. You earn the income during 2026, and you file your return in 2027. It is for tax residents only.`,
					'Malaysia taxes you on your chargeable income. That is your total income minus your reliefs, and it is never below zero. The more reliefs you can claim, the lower your chargeable income and your tax.',
					'The tax then uses progressive bands. Only the slice of income inside each band pays that band’s rate. So a raise never pushes all of your income into a higher rate.'
				]
			},
			{
				heading: `Resident tax rates for ${MY_TAX_YEAR_LABEL}`,
				paragraphs: [
					`The first ${myr(MY_TAX_BANDS[1].over)} of chargeable income is tax-free. The top rate of ${pc(MY_TAX_BANDS[MY_TAX_BANDS.length - 1].rate)} applies only to chargeable income above ${myr(MY_TAX_BANDS[MY_TAX_BANDS.length - 1].over)}.`
				],
				table: { caption: `Resident rates on chargeable income, ${MY_TAX_YEAR_LABEL}`, columns: ['Chargeable income', 'Rate on that slice'], rows: bandRows() }
			},
			{
				heading: 'Personal reliefs you can claim',
				paragraphs: [
					`Everyone gets the individual relief of ${myr(MY_RELIEF_SELF)}. The other reliefs depend on what you paid during the year, and each has its own cap. The tool applies the caps for you.`,
					'Keep receipts for what you claim. The Inland Revenue Board (LHDN) can ask for proof.'
				],
				table: {
					caption: `Main reliefs and caps, ${MY_TAX_YEAR_LABEL}`,
					columns: ['Relief', 'Amount or cap'],
					rows: [
						['Individual', myr(MY_RELIEF_SELF)],
						['Extra for a person with a disability', myr(MY_RELIEF_DISABLED_SELF)],
						['Spouse with no income', myr(MY_RELIEF_SPOUSE)],
						['Each child under 18, or 18+ in pre-university study', myr(MY_RELIEF_CHILD_UNDER_18)],
						['Each child 18+ in diploma, degree or higher study', myr(MY_RELIEF_CHILD_18_PLUS_HIGHER)],
						['Your EPF contributions', myr(MY_RELIEF_EPF_CAP)],
						['Life insurance or takaful', myr(MY_RELIEF_LIFE_INSURANCE_CAP)],
						['Education or medical insurance', myr(MY_RELIEF_MEDICAL_INSURANCE_CAP)],
						['SOCSO and EIS', myr(MY_RELIEF_SOCSO_CAP)],
						['Private retirement scheme or deferred annuity', myr(MY_RELIEF_PRS_CAP)],
						['Net savings in SSPN', myr(MY_RELIEF_SSPN_CAP)],
						['Childcare or kindergarten fees', myr(MY_RELIEF_CHILDCARE_CAP)],
						['Serious illness, fertility and medical check-ups', myr(MY_RELIEF_MEDICAL_CAP)],
						['Medical care for parents', myr(MY_RELIEF_PARENTS_CAP)],
						['Your own education fees', myr(MY_RELIEF_EDUCATION_CAP)],
						['Lifestyle (books, phone, internet, courses)', myr(MY_RELIEF_LIFESTYLE_CAP)],
						['Sports equipment and fees', myr(MY_RELIEF_SPORTS_CAP)]
					]
				}
			},
			{
				heading: 'Rebates and zakat',
				paragraphs: [
					`A rebate comes off your tax after it is worked out, so it is worth more than a relief of the same size. If your chargeable income is ${myr(MY_REBATE_LIMIT)} or less, you get a rebate of ${myr(MY_REBATE_AMOUNT)}.`,
					'Zakat, fitrah and other Islamic dues you paid are also a rebate, for the exact amount paid. A rebate cannot take your tax below zero, and the extra is not refunded.',
					'To find out how much zakat you may owe in the first place, use the [zakat calculator](/zakat-calculator).'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					'It is built for a resident individual with employment-type income. A few cases need a tax adviser, because they use different rules.',
					'Budget 2027 proposals, such as a higher self relief and lower rates, were tabled in October 2026. They are not law yet and apply from YA 2027, so this tool does not use them.'
				],
				list: [
					'Non-residents, who pay a flat 30% on employment income.',
					'Jointly assessed spouses and the extra rebate for them.',
					'Housing loan interest relief, and disabled child or disabled spouse reliefs. You can add these in the “Other reliefs” box.',
					'The zakat deduction against business income.',
					'Capital gains and dividend tax.'
				]
			},
			{
				heading: 'Tips to plan your tax',
				paragraphs: [
					'Check your reliefs before 31 December, because the year’s spending decides what you can claim. Use the [Malaysia EPF calculator](/malaysia-epf-calculator) to see what you and your employer pay into EPF each month.',
					'To plan around the result, the [budget calculator](/budget-calculator) splits your take-home pay. The [salary calculator](/salary-calculator) converts your pay between months, weeks and hours. For savings goals, try the [savings calculator](/savings-calculator).'
				]
			}
		],
		formulas: [
			{
				title: `Resident rates, ${MY_TAX_YEAR_LABEL}`,
				expression: bandRows().map((r) => `${r[0]}: ${r[1]}`).join(' · '),
				variables: [
					{ symbol: 'Chargeable income', meaning: 'Total income − reliefs, never below zero' },
					{ symbol: 'Rebate', meaning: `${myr(MY_REBATE_AMOUNT)} if chargeable income is ${myr(MY_REBATE_LIMIT)} or less, plus zakat paid. Rebates cannot take tax below zero` }
				]
			},
			{
				title: 'Main reliefs',
				expression: `Individual ${myr(MY_RELIEF_SELF)} · spouse ${myr(MY_RELIEF_SPOUSE)} · child ${myr(MY_RELIEF_CHILD_UNDER_18)} or ${myr(MY_RELIEF_CHILD_18_PLUS_HIGHER)} · EPF ${myr(MY_RELIEF_EPF_CAP)} · life insurance ${myr(MY_RELIEF_LIFE_INSURANCE_CAP)} · SOCSO/EIS ${myr(MY_RELIEF_SOCSO_CAP)} · lifestyle ${myr(MY_RELIEF_LIFESTYLE_CAP)}`,
				variables: [{ symbol: 'Others', meaning: `Education or medical insurance ${myr(MY_RELIEF_MEDICAL_INSURANCE_CAP)}, parents’ medical ${myr(MY_RELIEF_PARENTS_CAP)}, medical costs ${myr(MY_RELIEF_MEDICAL_CAP)}, own education ${myr(MY_RELIEF_EDUCATION_CAP)}, childcare ${myr(MY_RELIEF_CHILDCARE_CAP)}, SSPN ${myr(MY_RELIEF_SSPN_CAP)}, PRS ${myr(MY_RELIEF_PRS_CAP)}, sports ${myr(MY_RELIEF_SPORTS_CAP)}` }]
			}
		],
		example: {
			title: 'Income of RM72,000 with default reliefs',
			steps: [
				'Reliefs: individual RM9,000 + EPF RM4,000 (capped) + life insurance RM3,000 + SOCSO/EIS RM350 + lifestyle RM2,500 = RM18,850.',
				'Chargeable income: RM72,000 − RM18,850 = RM53,150.',
				'Tax: RM1,500 on the first RM50,000, plus 11% of RM3,150 = RM346.50. Total RM1,846.50. No rebate because chargeable income is above RM35,000.'
			],
			result: 'Income tax payable RM1,846.50'
		},
		faq: [
			{ q: 'How do I calculate income tax in Malaysia?', a: `Subtract your reliefs from your total income to get chargeable income. Apply the resident rates band by band, then take off any rebate and zakat. This Malaysia income tax calculator does it for ${MY_TAX_YEAR_LABEL}.` },
			{ q: 'Who gets the RM400 rebate?', a: `A tax resident whose chargeable income is ${myr(MY_REBATE_LIMIT)} or less gets ${myr(MY_REBATE_AMOUNT)}. It lowers the tax, but it cannot make the tax negative or be refunded.` },
			{ q: 'Is EPF relief RM7,000?', a: `Not quite. EPF contributions get up to ${myr(MY_RELIEF_EPF_CAP)} and life insurance or takaful gets up to ${myr(MY_RELIEF_LIFE_INSURANCE_CAP)}, which together is ${myr(MY_RELIEF_EPF_CAP + MY_RELIEF_LIFE_INSURANCE_CAP)}. Each has its own cap. See your contributions in the [Malaysia EPF calculator](/malaysia-epf-calculator).` },
			{ q: 'How much income is tax-free in Malaysia?', a: `The first ${myr(MY_TAX_BANDS[1].over)} of chargeable income is taxed at 0%. Your reliefs come off first, so your total income can be much higher. With the ${myr(MY_REBATE_AMOUNT)} rebate, chargeable income up to ${myr(MY_REBATE_LIMIT)} can end up with no tax.` },
			{ q: 'Does zakat reduce my tax?', a: 'Yes. Zakat and fitrah you paid count as a rebate, ringgit for ringgit, against your tax. It cannot take the tax below zero.' },
			{ q: 'What is not included?', a: 'Non-residents (taxed at a flat 30% on employment income), jointly assessed spouses, housing loan interest and disabled spouse or child reliefs are not included. Budget 2027 proposals that start in YA 2027 are not included either.' }
		],
		sources: [MY_TAX_SOURCE, MY_TAX_SOURCE_2, MY_TAX_SOURCE_3, MY_RELIEF_SOURCE, MY_RELIEF_SOURCE_2],
		disclaimer: 'Estimate for a Malaysian tax resident for YA 2026. It is not tax advice. Check reliefs and filing rules with the Inland Revenue Board of Malaysia (LHDN) or a tax adviser.'
	}
});
