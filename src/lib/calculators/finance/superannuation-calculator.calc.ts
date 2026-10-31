import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num, pct, plural } from '../format';
import meta from './superannuation-calculator.meta';
import {
	AU_TAX_YEAR,
	ATO_CAPS_SOURCE,
	ATO_CONTRIB_TAX_SOURCE,
	ATO_SG_SOURCE,
	CONCESSIONAL_CAP,
	CONTRIBUTIONS_TAX_RATE,
	DIV293_THRESHOLD,
	MAX_CONTRIBUTION_BASE,
	NON_CONCESSIONAL_CAP,
	SG_RATE
} from '../data/au-tax-2026-27';

export interface SuperInput {
	age: number;
	retireAge: number;
	balance: number;
	salary: number;
	extraConcessional: number;
	extraNonConcessional: number;
	returnPct: number;
	feePct: number;
	growthPct: number;
	inflationPct: number;
}

/**
 * Year-by-year projection. Each year: salary grows by `growthPct`; super guarantee = 12% of salary up to the
 * maximum contribution base (which is assumed to grow with salary); concessional contributions (guarantee + extra)
 * lose 15% in the fund; non-concessional contributions go in untaxed. Contributions arrive evenly through the year
 * (modelled at mid-year), and the balance grows at (return − fees).
 */
export function projectSuper(i: SuperInput) {
	const years = i.retireAge - i.age;
	const net = (i.returnPct - i.feePct) / 100;
	const infl = i.inflationPct / 100;
	let bal = i.balance;
	let contributed = 0;
	let taxPaid = 0;
	let firstYearConcessional = 0;
	const path: { age: number; nominal: number; real: number }[] = [{ age: i.age, nominal: bal, real: bal }];
	for (let t = 0; t < years; t++) {
		const f = Math.pow(1 + i.growthPct / 100, t);
		const sg = SG_RATE * Math.min(i.salary * f, MAX_CONTRIBUTION_BASE * f);
		const conc = sg + i.extraConcessional;
		if (t === 0) firstYearConcessional = conc;
		const tax = conc * CONTRIBUTIONS_TAX_RATE;
		taxPaid += tax;
		contributed += conc + i.extraNonConcessional;
		bal = bal * (1 + net) + (conc - tax + i.extraNonConcessional) * Math.pow(1 + net, 0.5);
		path.push({ age: i.age + t + 1, nominal: bal, real: bal / Math.pow(1 + infl, t + 1) });
	}
	return {
		years,
		nominal: bal,
		real: bal / Math.pow(1 + infl, years),
		contributed,
		taxPaid,
		firstYearConcessional,
		path
	};
}

/** Content is written once at build time, so format dollars explicitly (A$32,500). */
const aud = (n: number) => moneyIn('AUD', n, true);
/** Default case in the text: age 35, retire at 67, A$50,000 balance, A$90,000 salary, 7% return, 0.85% fees. */
const BASE_CASE: SuperInput = {
	age: 35,
	retireAge: 67,
	balance: 50_000,
	salary: 90_000,
	extraConcessional: 0,
	extraNonConcessional: 0,
	returnPct: 7,
	feePct: 0.85,
	growthPct: 3,
	inflationPct: 2.5
};
function scenarioRows(): string[][] {
	const cases: [string, Partial<SuperInput>][] = [
		['Default case', {}],
		['Fees of 0.5% instead of 0.85%', { feePct: 0.5 }],
		['Fees of 1.5%', { feePct: 1.5 }],
		['Return of 5% instead of 7%', { returnPct: 5 }],
		['Return of 9%', { returnPct: 9 }],
		['Starting at age 25', { age: 25 }],
		['Starting at age 45', { age: 45 }],
		['Extra $5,000 a year before tax', { extraConcessional: 5_000 }]
	];
	return cases.map(([label, change]) => [label, aud(projectSuper({ ...BASE_CASE, ...change }).real)]);
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'age', label: 'Your age', type: 'number', default: 35, min: 15, max: 90, step: 1, decimal: false, suffix: 'years' },
		{ id: 'retire', label: 'Retirement age', type: 'number', default: 67, min: 16, max: 100, step: 1, decimal: false, suffix: 'years' },
		{ id: 'balance', label: 'Current super balance', type: 'number', default: 50000, min: 0, max: 100_000_000, step: 1000, prefix: '$' },
		{ id: 'salary', label: 'Salary', type: 'number', default: 90000, min: 0, max: 100_000_000, step: 1000, prefix: '$', suffix: '/yr', help: 'Before tax, excluding super. Super guarantee is 12% of this.' },
		{ id: 'extraC', label: 'Extra concessional contributions', type: 'number', default: 0, min: 0, max: 10_000_000, step: 500, prefix: '$', suffix: '/yr', help: 'Salary sacrifice or personal deductible contributions. Taxed 15%.' },
		{ id: 'extraN', label: 'Non-concessional contributions', type: 'number', default: 0, min: 0, max: 10_000_000, step: 500, prefix: '$', suffix: '/yr', help: 'After-tax contributions. Not taxed again going in.' },
		{ id: 'return', label: 'Investment return', type: 'number', default: 7, min: -10, max: 30, step: 0.1, suffix: '%', help: 'Yearly return after investment-earnings tax and before fees.' },
		{ id: 'fees', label: 'Fees', type: 'number', default: 0.85, min: 0, max: 10, step: 0.05, suffix: '%', help: 'Yearly fees as a share of your balance.' },
		{ id: 'growth', label: 'Salary growth', type: 'number', default: 3, min: 0, max: 20, step: 0.1, suffix: '%' },
		{ id: 'inflation', label: 'Inflation', type: 'number', default: 2.5, min: 0, max: 20, step: 0.1, suffix: '%' },
		{ id: 'real', label: 'Show in today\'s dollars', type: 'toggle', default: true }
	],
	calculate(v): CalculationResult {
		const i: SuperInput = {
			age: Number(v.age),
			retireAge: Number(v.retire),
			balance: Number(v.balance),
			salary: Number(v.salary),
			extraConcessional: Number(v.extraC),
			extraNonConcessional: Number(v.extraN),
			returnPct: Number(v.return),
			feePct: Number(v.fees),
			growthPct: Number(v.growth),
			inflationPct: Number(v.inflation)
		};
		const real = v.real === true;
		const nums = Object.values(i);
		const ok =
			nums.every(Number.isFinite) &&
			i.age >= 15 &&
			i.retireAge > i.age &&
			i.retireAge - i.age <= 85 &&
			i.balance >= 0 &&
			i.salary >= 0 &&
			i.extraConcessional >= 0 &&
			i.extraNonConcessional >= 0 &&
			i.feePct >= 0 &&
			i.growthPct > -50 &&
			i.inflationPct > -50 &&
			i.returnPct - i.feePct > -100;
		if (!ok) {
			return { primaryResult: DASH, primaryLabel: 'Super balance at retirement', summary: 'Enter your age, a later retirement age and non-negative amounts.' };
		}
		const r = projectSuper(i);
		const warnings: string[] = [];
		if (r.firstYearConcessional > CONCESSIONAL_CAP) {
			warnings.push(
				`Warning: your concessional contributions this year (${money(r.firstYearConcessional, true)}) are over the ${AU_TAX_YEAR} cap of ${money(CONCESSIONAL_CAP, true)}. Excess is taxed differently and is not modelled here.`
			);
		}
		if (i.extraNonConcessional > NON_CONCESSIONAL_CAP) {
			warnings.push(`Warning: non-concessional contributions are over the ${money(NON_CONCESSIONAL_CAP, true)} cap (bring-forward rules are not modelled).`);
		}
		const shown = real ? r.real : r.nominal;
		return {
			primaryResult: money(shown, true),
			primaryLabel: real ? `Super at age ${num(i.retireAge, 0)} (today's dollars)` : `Super at age ${num(i.retireAge, 0)} (future dollars)`,
			summary:
				(warnings.length ? warnings.join(' ') + ' ' : '') +
				`In ${plural(r.years, 'year')} your balance reaches ${money(r.nominal, true)} in future dollars, which buys what ${money(r.real, true)} does today at ${pct(i.inflationPct, 1)} inflation.`,
			secondaryMetrics: [
				{ label: 'Balance in future dollars', value: money(r.nominal, true) },
				{ label: 'Balance in today\'s dollars', value: money(r.real, true) },
				{ label: 'Total contributions', value: money(r.contributed, true) },
				{ label: 'Contributions tax paid', value: money(r.taxPaid, true) },
				{ label: 'Concessional this year', value: `${money(r.firstYearConcessional, true)} of ${money(CONCESSIONAL_CAP, true)} cap` },
				{ label: 'Investment growth', value: money(r.nominal - i.balance - (r.contributed - r.taxPaid), true) }
			],
			chart: {
				type: 'line',
				title: 'Super balance by age',
				x: 'age',
				xLabel: 'Age',
				series: [
					{ key: 'nominal', label: 'Future dollars' },
					{ key: 'real', label: 'Today\'s dollars' }
				],
				data: r.path.map((p) => ({ age: p.age, nominal: Math.round(p.nominal), real: Math.round(p.real) })),
				valueFormat: 'currency'
			}
		};
	},
	content: {
		intro: `Project what your Australian super could be worth at retirement using the ${AU_TAX_YEAR} rules. This superannuation calculator uses the ${pct(SG_RATE * 100, 0)} super guarantee, ${pct(CONTRIBUTIONS_TAX_RATE * 100, 0)} tax on concessional contributions, extra contributions, fees and inflation.`,
		howTo: [
			'Enter your age, retirement age, current balance and salary before tax.',
			'Add any extra concessional (pre-tax) or non-concessional (after-tax) contributions each year.',
			'Set the expected return, fees, salary growth and inflation.',
			'Choose current dollars or future dollars, then read your balance at retirement and the chart.'
		],
		about: [
			{
				heading: 'What is superannuation?',
				paragraphs: [
					'Superannuation, or super, is money set aside for your retirement. Your employer pays part of your wages into a super fund, which invests it for you. You can usually reach it only when you retire or reach a set age.',
					'Because super gets special tax treatment, the government limits how much you can add each year. Those limits are called contribution caps. If you also want to see your pay, use the [Australia pay calculator](/australia-pay-calculator).',
					'This calculator shows a projection, not a promise. First, it adds each year of contributions and growth until your retirement age.'
				]
			},
			{
				heading: `Super rules for ${AU_TAX_YEAR}`,
				paragraphs: [
					'The table lists the figures the calculator uses. Also, they come from the ATO and are checked each July.',
					'Concessional contributions include the super guarantee your employer pays and any salary sacrifice. They are taxed at 15% in the fund. Non-concessional contributions come from your after-tax pay, so they go in without more tax.'
				],
				table: {
					caption: `Super figures, ${AU_TAX_YEAR}`,
					columns: ['Item', 'Figure'],
					rows: [
						['Super guarantee rate', pct(SG_RATE * 100, 0)],
						['Maximum contribution base', `${aud(MAX_CONTRIBUTION_BASE)} a year`],
						['Concessional contributions cap', `${aud(CONCESSIONAL_CAP)} a year`],
						['Non-concessional contributions cap', `${aud(NON_CONCESSIONAL_CAP)} a year`],
						['Tax on concessional contributions', pct(CONTRIBUTIONS_TAX_RATE * 100, 0)],
						['Division 293 extra tax starts at', `${aud(DIV293_THRESHOLD)} of income plus contributions`]
					]
				}
			},
			{
				heading: 'How the projection works',
				paragraphs: [
					`Each year the calculator raises your salary by the growth rate and works out the super guarantee, which is ${pct(SG_RATE * 100, 0)} of salary up to the maximum contribution base. It adds any extra concessional contributions and takes ${pct(CONTRIBUTIONS_TAX_RATE * 100, 0)} off them for tax.`,
					'Contributions arrive evenly through the year, so the calculator treats them as arriving mid-year. Your balance then grows at the return minus fees. Enter a return after the fund\'s own tax on earnings, which is how most funds report returns.',
					'Future dollars show the raw balance. Current dollars divide it by inflation, so you can judge what it might buy. So the second figure is usually the more useful one.'
				]
			},
			{
				heading: 'What changes the result most',
				paragraphs: [
					'Small changes add up over three decades. The table starts from the default case (age 35, retiring at 67, A$50,000 balance, A$90,000 salary, 7% return, 0.85% fees) and changes one thing at a time.',
					'Starting earlier and paying lower fees both help a lot, so check what your fund charges. For help with the income side, see the [Australia pay calculator](/australia-pay-calculator).'
				],
				table: { caption: 'Balance at 67 in today\'s dollars', columns: ['What changes', 'Balance'], rows: scenarioRows() },
				list: [
					'**Check your fees.** A fee that looks small is charged on your whole balance every year.',
					'**Use extra contributions with care.** Stay under the cap, since the tool does not model excess contributions.',
					'**Pick a steady return.** Use a figure you are comfortable with, because the best recent year will not repeat.'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					'It leaves out Division 293 tax for high earners, excess contribution tax, carry-forward caps, government co-contributions, insurance premiums inside super and the age pension. Your extra contributions stay flat in dollars and are not indexed.',
					`It warns you if your first-year concessional contributions go over the ${aud(CONCESSIONAL_CAP)} cap, or if your non-concessional contributions go over ${aud(NON_CONCESSIONAL_CAP)}. For tax on your pay, try the [Australia pay calculator](/australia-pay-calculator). To plan a study debt alongside super, use the [HECS-HELP calculator](/hecs-help-calculator). If you are saving for a home as well, the [borrowing power calculator](/borrowing-power-calculator) shows what a lender may allow.`
				]
			}
		],
		formulas: [
			{
				title: 'Yearly projection',
				expression: 'Balance₍ₜ₊₁₎ = Balance₍ₜ₎ × (1 + r − f) + [(SG + C) × (1 − 15%) + N] × (1 + r − f)^½',
				variables: [
					{ symbol: 'r − f', meaning: 'investment return less fees' },
					{ symbol: 'SG', meaning: `${pct(SG_RATE * 100, 0)} of salary, up to the ${aud(MAX_CONTRIBUTION_BASE)} maximum contribution base` },
					{ symbol: 'C', meaning: `extra concessional contributions (taxed ${pct(CONTRIBUTIONS_TAX_RATE * 100, 0)} in the fund)` },
					{ symbol: 'N', meaning: 'non-concessional contributions (after tax)' },
					{ symbol: 'Today\'s dollars', meaning: 'future balance ÷ (1 + inflation)^years' }
				]
			}
		],
		example: {
			title: 'Age 35, retiring at 67, $50,000 balance, $90,000 salary',
			steps: [
				'Super guarantee in year one: 12% × $90,000 = $10,800, which falls to $9,180 after 15% contributions tax',
				'With a 7% return, 0.85% fees and 3% salary growth the balance reaches about $1,591,787 in future dollars after 32 years',
				'At 2.5% inflation, that is about $722,306 in current dollars'
			],
			result: '$722,306 in current dollars'
		},
		faq: [
			{
				q: 'How much super will I have at retirement?',
				a: 'It depends on your salary, return, fees and years until retirement. In the default case, a 35-year-old on $90,000 who retires at 67 reaches about $722,306 in current dollars. Enter your own details above.'
			},
			{
				q: `What are the ${AU_TAX_YEAR} contribution caps?`,
				a: `The ATO lists a concessional cap of ${aud(CONCESSIONAL_CAP)} and a non-concessional cap of ${aud(NON_CONCESSIONAL_CAP)}. Super guarantee payments count towards the concessional cap. The calculator warns you if you exceed it.`
			},
			{
				q: 'What is the super guarantee rate?',
				a: `It is ${pct(SG_RATE * 100, 0)} of your ordinary pay in ${AU_TAX_YEAR}, paid by your employer on top of your wages. It applies up to the maximum contribution base of ${aud(MAX_CONTRIBUTION_BASE)} a year.`
			},
			{
				q: 'Is the return before or after tax?',
				a: 'Enter the return after the fund\'s tax on investment earnings, which is how most funds publish their returns. Fees are taken off separately. The 15% tax on concessional contributions is applied for you.'
			},
			{
				q: 'What does it leave out?',
				a: 'Division 293 tax on high earners, excess contribution tax, carry-forward caps, government co-contributions, insurance premiums and the age pension. Contributions are held flat in dollars, not indexed.'
			}
		],
		sources: [ATO_SG_SOURCE, ATO_CAPS_SOURCE, ATO_CONTRIB_TAX_SOURCE],
		disclaimer: 'A projection based on your assumptions, not a forecast or financial advice. Real returns vary year to year. Speak to a licensed adviser for personal advice.'
	}
});
