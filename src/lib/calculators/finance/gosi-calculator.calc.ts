import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, moneyIn, num, pct } from '../format';
import meta from './gosi-calculator.meta';
import {
	SA_GOSI_ANNUITY_LEGACY_PCT,
	SA_GOSI_ANNUITY_MIN_WAGE,
	SA_GOSI_ANNUITY_NEW_SCHEDULE,
	SA_GOSI_HAZARDS_MIN_WAGE,
	SA_GOSI_HAZARDS_PCT,
	SA_GOSI_MAX_WAGE,
	SA_GOSI_NEW_LAW_START,
	SA_GOSI_NEW_LAW_START_LABEL,
	SA_GOSI_SANED_PCT,
	SA_GOSI_SOURCES
} from '../data/sa-gosi';

const sar = (n: number) => moneyIn('SAR', n, true);
const isoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Annuities rate in percent, each side, for a new entrant in the given contribution month. */
function newEntrantRate(date: string): number {
	let rate = SA_GOSI_ANNUITY_NEW_SCHEDULE[0].pct;
	for (const step of SA_GOSI_ANNUITY_NEW_SCHEDULE) if (date >= step.from) rate = step.pct;
	return rate;
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'who',
			label: 'Employee',
			type: 'select',
			display: 'segmented',
			default: 'saudi',
			options: [
				{ label: 'Saudi', value: 'saudi' },
				{ label: 'Non-Saudi', value: 'expat' }
			],
			help: 'Non-Saudis pay no annuities or SANED; only the employer pays 2% for occupational hazards.'
		},
		{
			id: 'joined',
			label: 'First contributions',
			type: 'select',
			display: 'segmented',
			default: 'new',
			options: [
				{ label: 'Before 3 July 2024', value: 'old' },
				{ label: 'On or after 3 July 2024', value: 'new' }
			],
			help: 'New entrants have no earlier contribution period under the Social Insurance or Civil Pension laws. Their annuities rate rises every July.',
			visibleWhen: (v) => String(v.who) !== 'expat'
		},
		{
			id: 'basic',
			label: 'Monthly basic wage',
			type: 'number',
			default: 8000,
			min: 0,
			max: 10_000_000,
			prefix: '$',
			help: 'Include commissions: GOSI counts them as part of the basic wage.'
		},
		{
			id: 'housing',
			label: 'Monthly housing allowance',
			type: 'number',
			default: 2000,
			min: 0,
			max: 10_000_000,
			prefix: '$',
			help: 'Cash housing allowance. Other allowances are not part of the contribution wage.'
		},
		{
			id: 'month',
			label: 'Contribution month',
			type: 'date',
			default: 'today',
			help: 'Sets the new-entrant annuities rate, which steps up each July until 2028.',
			visibleWhen: (v) => String(v.who) !== 'expat' && String(v.joined) === 'new'
		}
	],
	calculate(v): CalculationResult {
		const label = 'Total monthly contribution';
		const basic = Number(v.basic);
		const housing = Number(v.housing);
		if (!Number.isFinite(basic) || !Number.isFinite(housing) || basic < 0 || housing < 0 || !(basic + housing > 0)) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a basic wage above zero and a housing allowance of zero or more.' };
		}
		const expat = String(v.who) === 'expat';
		const wage = Math.min(basic + housing, SA_GOSI_MAX_WAGE);
		const capped = basic + housing > SA_GOSI_MAX_WAGE;
		const hazardsBase = Math.max(wage, SA_GOSI_HAZARDS_MIN_WAGE);
		const hazards = (hazardsBase * SA_GOSI_HAZARDS_PCT) / 100;

		if (expat) {
			return {
				primaryResult: money(hazards),
				primaryLabel: label,
				summary: `Non-Saudi employees are covered by the Occupational Hazards branch only: the employer pays ${pct(SA_GOSI_HAZARDS_PCT)} of the contribution wage and nothing is deducted from pay.`,
				secondaryMetrics: [
					{ label: 'Employee share (deducted from pay)', value: money(0) },
					{ label: 'Employer share', value: money(hazards) },
					{ label: 'Contribution wage', value: capped ? `${money(wage)} (capped)` : money(hazardsBase) },
					{ label: 'Annuities rate, each side', value: 'Not payable' },
					{ label: 'SANED rate, each side', value: 'Not payable' }
				],
				table: {
					title: 'By branch',
					columns: [
						{ key: 'branch', label: 'Branch' },
						{ key: 'employee', label: 'Employee', align: 'end' },
						{ key: 'employer', label: 'Employer', align: 'end' }
					],
					rows: [
						{ branch: 'Annuities', employee: money(0), employer: money(0) },
						{ branch: 'SANED', employee: money(0), employer: money(0) },
						{ branch: 'Occupational hazards', employee: money(0), employer: money(hazards) },
						{ branch: 'Total', employee: money(0), employer: money(hazards) }
					]
				}
			};
		}

		if (wage < SA_GOSI_ANNUITY_MIN_WAGE) {
			return {
				primaryResult: DASH,
				primaryLabel: label,
				summary: `Contribution wages below SAR ${num(SA_GOSI_ANNUITY_MIN_WAGE, 0)} are lifted to the branch minimums (annuities SAR ${num(SA_GOSI_ANNUITY_MIN_WAGE, 0)}, occupational hazards SAR ${num(SA_GOSI_HAZARDS_MIN_WAGE, 0)}). That is not modelled; check with GOSI.`
			};
		}

		let annuityPct = SA_GOSI_ANNUITY_LEGACY_PCT;
		let periodText = 'Unchanged for contributors who joined before 3 July 2024';
		if (String(v.joined) === 'new') {
			const month = String(v.month);
			if (!isoDate(month)) return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a valid contribution month.' };
			if (month < SA_GOSI_NEW_LAW_START) {
				return { primaryResult: DASH, primaryLabel: label, summary: `New-entrant rates start on ${SA_GOSI_NEW_LAW_START_LABEL}; pick a month on or after it.` };
			}
			annuityPct = newEntrantRate(month);
			periodText = SA_GOSI_ANNUITY_NEW_SCHEDULE.filter((s) => s.pct === annuityPct)[0]?.label ?? '';
		}

		const annuity = (wage * annuityPct) / 100;
		const saned = (wage * SA_GOSI_SANED_PCT) / 100;
		const employee = annuity + saned;
		const employer = annuity + saned + hazards;
		const total = employee + employer;
		const effective = (total / wage) * 100;

		return {
			primaryResult: money(total),
			primaryLabel: label,
			summary: `On a contribution wage of ${money(wage)}${capped ? ' (capped at SAR 45,000)' : ''}, you pay ${money(employee)} and your employer pays ${money(employer)}. Annuities are ${pct(annuityPct)} each side (${periodText}).`,
			secondaryMetrics: [
				{ label: 'Employee share (deducted from pay)', value: money(employee) },
				{ label: 'Employer share', value: money(employer) },
				{ label: 'Contribution wage', value: capped ? `${money(wage)} (capped)` : money(wage) },
				{ label: 'Annuities rate, each side', value: pct(annuityPct) },
				{ label: 'Combined rate', value: pct(effective, 2) }
			],
			table: {
				title: 'By branch',
				columns: [
					{ key: 'branch', label: 'Branch' },
					{ key: 'employee', label: 'Employee', align: 'end' },
					{ key: 'employer', label: 'Employer', align: 'end' }
				],
				rows: [
					{ branch: `Annuities (${pct(annuityPct)} each)`, employee: money(annuity), employer: money(annuity) },
					{ branch: `SANED (${pct(SA_GOSI_SANED_PCT)} each)`, employee: money(saned), employer: money(saned) },
					{ branch: `Occupational hazards (${pct(SA_GOSI_HAZARDS_PCT)} employer)`, employee: money(0), employer: money(hazards) },
					{ branch: 'Total', employee: money(employee), employer: money(employer) }
				]
			}
		};
	},
	content: {
		intro: `Use this GOSI calculator to work out the monthly social-insurance contributions in Saudi Arabia. It shows the employee share, the employer share and the total. It covers Saudi employees (annuities, SANED and occupational hazards) and non-Saudis (occupational hazards only), including the new-entrant rate rises to 2028.`,
		howTo: [
			`Choose Saudi or Non-Saudi. For a Saudi, say whether contributions started before or on or after ${SA_GOSI_NEW_LAW_START_LABEL}.`,
			`Enter the monthly basic wage, with commissions, and the cash housing allowance. The contribution wage is capped at ${sar(SA_GOSI_MAX_WAGE)}.`,
			'For a new entrant, pick the contribution month.',
			'Read the employee share, the employer share and the total, with the split by branch.'
		],
		about: [
			{
				heading: 'What is GOSI?',
				paragraphs: [
					'GOSI is the General Organization for Social Insurance in Saudi Arabia. Because the law requires it, employers register their staff and pay monthly contributions. Also, some of the cost is taken from the employee’s pay.',
					`There are three branches. First, the Annuities branch covers pensions for Saudis. Second, SANED is unemployment insurance for Saudis. Third, the Occupational Hazards branch covers work injuries and applies to Saudis and non-Saudis. Non-Saudis are not in the Annuities branch or SANED.`
				]
			},
			{
				heading: 'Which wage is used?',
				paragraphs: [
					`GOSI uses the contributory wage. That is your basic wage, which GOSI defines to include commissions, plus your cash housing allowance. However, other allowances are not part of it.`,
					`Also, the maximum wage is ${sar(SA_GOSI_MAX_WAGE)} a month. The minimum is ${sar(SA_GOSI_ANNUITY_MIN_WAGE)} for annuities and ${sar(SA_GOSI_HAZARDS_MIN_WAGE)} for occupational hazards. A third-party guide warns that you should confirm the cap with GOSI.`
				]
			},
			{
				heading: 'Contribution rates for a Saudi employee',
				paragraphs: [
					`Annuities are ${SA_GOSI_ANNUITY_LEGACY_PCT}% each for the employer and employee if you joined before ${SA_GOSI_NEW_LAW_START_LABEL}. SANED is ${SA_GOSI_SANED_PCT}% each. Then the employer also pays ${SA_GOSI_HAZARDS_PCT}% for occupational hazards.`,
					`Under the new Social Insurance Law, the annuities rate for new entrants rises every July. New entrants are Saudis with no contribution period under the earlier laws. So the rate applies to the employer and the employee each. But SANED and the hazards rate do not step.`
				],
				table: {
					caption: 'Annuities rate for new entrants, each side',
					columns: ['Period', 'Rate'],
					rows: SA_GOSI_ANNUITY_NEW_SCHEDULE.map((s) => [s.label, `${s.pct}%`])
				}
			},
			{
				heading: 'How much is the total cost?',
				paragraphs: [
					`For a Saudi who joined before ${SA_GOSI_NEW_LAW_START_LABEL}, the combined rate is ${2 * (SA_GOSI_ANNUITY_LEGACY_PCT + SA_GOSI_SANED_PCT) + SA_GOSI_HAZARDS_PCT}% of the contribution wage. The employee pays ${SA_GOSI_ANNUITY_LEGACY_PCT + SA_GOSI_SANED_PCT}% of it, and the employer pays ${SA_GOSI_ANNUITY_LEGACY_PCT + SA_GOSI_SANED_PCT + SA_GOSI_HAZARDS_PCT}%.`,
					'The employee share is taken from your pay each month. As a result, your take-home pay is lower than your gross pay by that amount. The employer share, though, is an extra cost to the company and does not come out of your salary.'
				]
			},
			{
				heading: 'What non-Saudi employees pay',
				paragraphs: [
					`A non-Saudi employee pays nothing from their pay. The employer pays ${SA_GOSI_HAZARDS_PCT}% of the contribution wage for occupational hazards. Also, for a new job, the [Saudi end-of-service calculator](/saudi-end-of-service-calculator) shows the award you may be owed when the contract ends.`
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					'First, it leaves out GCC nationals, housing provided in kind and employers with a raised hazards rate. Wages below the branch minimums are not modelled. However, GOSI can change the rules, so confirm anything important with GOSI or your employer.',
					'For staff costs and prices, the [GCC VAT calculator](/gcc-vat-calculator) shows the VAT rate in Saudi Arabia, and the [currency converter](/currency-converter) helps you compare pay across countries.'
				]
			}
		],
		formulas: [
			{
				title: 'Monthly contributions for a Saudi employee',
				expression: `Employee = W × (A + ${SA_GOSI_SANED_PCT}%) · Employer = W × (A + ${SA_GOSI_SANED_PCT}% + ${SA_GOSI_HAZARDS_PCT}%)`,
				variables: [
					{ symbol: 'W', meaning: `Contribution wage: basic wage (with commissions) plus cash housing allowance, at most ${sar(SA_GOSI_MAX_WAGE)}.` },
					{ symbol: 'A', meaning: `Annuities rate for each side: ${SA_GOSI_ANNUITY_LEGACY_PCT}% for contributors who joined before ${SA_GOSI_NEW_LAW_START_LABEL}; for new entrants it rises by 0.5 points each July, as in the table above.` },
					{ symbol: `${SA_GOSI_SANED_PCT}%, ${SA_GOSI_HAZARDS_PCT}%`, meaning: 'SANED unemployment insurance (each side) and occupational hazards (employer only).' }
				]
			},
			{
				title: 'Non-Saudi employee',
				expression: `Employer = W × ${SA_GOSI_HAZARDS_PCT}%, employee = 0`,
				variables: [{ symbol: 'W', meaning: `Contribution wage, with a minimum of ${sar(SA_GOSI_HAZARDS_MIN_WAGE)} for this branch.` }]
			}
		],
		example: {
			title: `Saudi employee who joined before ${SA_GOSI_NEW_LAW_START_LABEL}: basic ${sar(8000)} plus housing ${sar(2000)}`,
			steps: [
				`Contribution wage: 8,000 + 2,000 = ${sar(10000)} (below the ${sar(SA_GOSI_MAX_WAGE)} cap).`,
				`Employee: ${SA_GOSI_ANNUITY_LEGACY_PCT}% annuities + ${SA_GOSI_SANED_PCT}% SANED = ${SA_GOSI_ANNUITY_LEGACY_PCT + SA_GOSI_SANED_PCT}% × 10,000 = ${sar(975)}.`,
				`Employer: ${SA_GOSI_ANNUITY_LEGACY_PCT}% + ${SA_GOSI_SANED_PCT}% + ${SA_GOSI_HAZARDS_PCT}% = ${SA_GOSI_ANNUITY_LEGACY_PCT + SA_GOSI_SANED_PCT + SA_GOSI_HAZARDS_PCT}% × 10,000 = ${sar(1175)}.`,
				`Total: 975 + 1,175 = ${sar(2150)} a month.`
			],
			result: moneyIn('SAR', 2150)
		},
		faq: [
			{
				q: 'How is GOSI calculated in Saudi Arabia?',
				a: `For a Saudi employee, GOSI is worked out on the basic wage plus the cash housing allowance, up to ${sar(SA_GOSI_MAX_WAGE)}. Annuities, SANED and occupational hazards each have a rate. The employee and employer shares differ.`
			},
			{
				q: 'What changed under the new Social Insurance Law?',
				a: `For Saudis with no contribution period before ${SA_GOSI_NEW_LAW_START_LABEL}, the annuities rate for employee and employer rises by 0.5 percentage points each July until it reaches ${SA_GOSI_ANNUITY_NEW_SCHEDULE[SA_GOSI_ANNUITY_NEW_SCHEDULE.length - 1].pct}%. People who contributed before that date keep ${SA_GOSI_ANNUITY_LEGACY_PCT}%.`
			},
			{
				q: 'What do non-Saudi employees pay?',
				a: `Nothing from their pay. The employer pays ${SA_GOSI_HAZARDS_PCT}% of the contribution wage for occupational hazards. Non-Saudis are not in the annuities branch or SANED.`
			},
			{
				q: 'Which pay counts, and what are the limits?',
				a: `Basic wage (GOSI counts commissions as basic wage) plus a cash housing allowance. The maximum is ${sar(SA_GOSI_MAX_WAGE)} a month. The minimum is ${sar(SA_GOSI_ANNUITY_MIN_WAGE)} for annuities and ${sar(SA_GOSI_HAZARDS_MIN_WAGE)} for occupational hazards. This tool does not model Saudis below ${sar(SA_GOSI_ANNUITY_MIN_WAGE)}.`
			},
			{
				q: 'What is SANED?',
				a: `SANED is Saudi Arabia’s unemployment insurance. It is ${SA_GOSI_SANED_PCT}% from the employee and ${SA_GOSI_SANED_PCT}% from the employer, and it is mandatory for Saudis registered with the pensions branch.`
			}
		],
		sources: SA_GOSI_SOURCES,
		disclaimer:
			'Estimate only. It excludes GCC nationals, housing provided in kind, employers with a raised hazards rate, and any change GOSI makes after October 2026. This is not legal advice; confirm with GOSI or your employer.'
	}
});
