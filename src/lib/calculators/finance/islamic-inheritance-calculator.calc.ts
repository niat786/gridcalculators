import { defineCalculator, type CalculationResult } from '../types';
import { DASH, money, num, pct } from '../format';
import meta from './islamic-inheritance-calculator.meta';
import { distribute, fracToNumber, fracToString, type Heirs } from '../data/faraid-engine';
import {
	FARAID_BEQUEST_CAP,
	FARAID_FEMALE_UNITS,
	FARAID_LAW_LABEL,
	FARAID_MALE_UNITS,
	FARAID_MAX_COUNT,
	FARAID_MAX_WIVES,
	FARAID_SHARES,
	FARAID_SIBLINGS_REDUCE_MOTHER,
	FARAID_SOURCES
} from '../data/faraid';

const fs = (f: readonly [number, number]) => fracToString(f);
const CHECK = 'Please confirm every figure with a qualified scholar or the court before acting.';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'deceased',
			label: 'The person who died was',
			type: 'select',
			display: 'segmented',
			default: 'man',
			options: [
				{ label: 'A man', value: 'man' },
				{ label: 'A woman', value: 'woman' }
			]
		},
		{
			id: 'wives',
			label: 'Wives',
			type: 'number',
			default: 1,
			min: 0,
			max: FARAID_MAX_WIVES,
			decimal: false,
			help: 'Up to 4. All wives share one fixed share equally.',
			width: 'half',
			visibleWhen: (v) => String(v.deceased) !== 'woman'
		},
		{
			id: 'husband',
			label: 'Husband alive',
			type: 'toggle',
			default: false,
			visibleWhen: (v) => String(v.deceased) === 'woman'
		},
		{ id: 'sons', label: 'Sons', type: 'number', default: 2, min: 0, max: FARAID_MAX_COUNT, decimal: false, width: 'half' },
		{ id: 'daughters', label: 'Daughters', type: 'number', default: 1, min: 0, max: FARAID_MAX_COUNT, decimal: false, width: 'half' },
		{ id: 'father', label: 'Father alive', type: 'toggle', default: false },
		{ id: 'mother', label: 'Mother alive', type: 'toggle', default: false },
		{ id: 'grandfather', label: 'Paternal grandfather alive', type: 'toggle', default: false, help: 'Father’s father. He inherits only if the father has died.' },
		{ id: 'brothers', label: 'Full brothers', type: 'number', default: 0, min: 0, max: FARAID_MAX_COUNT, decimal: false, width: 'half', help: 'Same father and mother.' },
		{ id: 'sisters', label: 'Full sisters', type: 'number', default: 0, min: 0, max: FARAID_MAX_COUNT, decimal: false, width: 'half', help: 'Same father and mother.' },
		{
			id: 'others',
			label: 'Other relatives may also inherit',
			type: 'toggle',
			default: false,
			help: 'Grandchildren through a son, half-siblings, uncles, nephews, maternal relatives or anyone not listed. Switching this on stops the calculation.'
		},
		{ id: 'assets', label: 'Total assets', type: 'number', default: 1_000_000, min: 0, max: 1_000_000_000_000, prefix: '$' },
		{ id: 'debts', label: 'Debts', type: 'number', default: 0, min: 0, max: 1_000_000_000_000, prefix: '$', help: 'Include any unpaid dowry (mahr) owed to a wife.' },
		{ id: 'funeral', label: 'Funeral costs', type: 'number', default: 0, min: 0, max: 1_000_000_000_000, prefix: '$' },
		{
			id: 'bequest',
			label: 'Bequest (will)',
			type: 'number',
			default: 0,
			min: 0,
			max: 1_000_000_000_000,
			prefix: '$',
			help: 'A gift by will to someone who is not an heir. It cannot exceed one third of the estate after debts and funeral costs.'
		}
	],
	calculate(v): CalculationResult {
		const label = 'Divided among the heirs';
		const assets = Number(v.assets);
		const debts = Number(v.debts);
		const funeral = Number(v.funeral);
		const bequest = Number(v.bequest);
		if (![assets, debts, funeral, bequest].every((n) => Number.isFinite(n) && n >= 0) || !(assets > 0)) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Enter total assets above zero and debts, funeral costs and bequest of zero or more.' };
		}
		const afterDebts = assets - debts - funeral;
		if (!(afterDebts > 0)) {
			return { primaryResult: DASH, primaryLabel: label, summary: 'Debts and funeral costs use up the whole estate, so nothing is left to divide.' };
		}
		const cap = (afterDebts * FARAID_BEQUEST_CAP[0]) / FARAID_BEQUEST_CAP[1];
		const bequestPaid = Math.min(bequest, cap);
		const estate = afterDebts - bequestPaid;

		const heirs: Heirs = {
			deceasedIsWoman: String(v.deceased) === 'woman',
			husband: Boolean(v.husband),
			wives: Number(v.wives),
			sons: Number(v.sons),
			daughters: Number(v.daughters),
			father: Boolean(v.father),
			mother: Boolean(v.mother),
			grandfather: Boolean(v.grandfather),
			brothers: Number(v.brothers),
			sisters: Number(v.sisters),
			others: Boolean(v.others)
		};
		for (const n of [heirs.wives, heirs.sons, heirs.daughters, heirs.brothers, heirs.sisters]) {
			if (!Number.isFinite(n)) {
				return { primaryResult: DASH, primaryLabel: label, summary: 'Enter whole numbers of heirs (up to 4 wives).' };
			}
		}

		const out = distribute(heirs);
		if (!out.ok) {
			return { primaryResult: DASH, primaryLabel: label, summary: `No split is shown. ${out.reason}` };
		}

		const rules: string[] = [];
		if (out.umariyyatan) rules.push('Umariyyatan: the mother takes one third of what is left after the spouse');
		if (out.awl) rules.push(`ʿawl: the fixed shares added up to ${fracToString(out.awl)} of the estate, so each was reduced in proportion`);
		if (out.radd) rules.push('Radd: the surplus went back to the fixed-share heirs other than the spouse');
		const bequestText = bequest > cap ? `${money(bequestPaid)} (limited to one third)` : money(bequestPaid);

		return {
			primaryResult: money(estate),
			primaryLabel: label,
			summary: `${money(afterDebts)} remains after debts and funeral costs${bequestPaid > 0 ? `; ${money(bequestPaid)} goes by bequest` : ''}. ${CHECK}`,
			secondaryMetrics: [
				{ label: 'Total assets', value: money(assets) },
				{ label: 'Debts and funeral costs', value: money(debts + funeral) },
				{ label: 'Bequest paid', value: bequestText },
				{ label: 'Rule applied', value: rules.length ? rules.join('; ') : 'Fixed shares and residuaries only' },
				{ label: 'Advice', value: 'Confirm with a qualified scholar or court' }
			],
			table: {
				title: 'Shares by heir',
				columns: [
					{ key: 'heir', label: 'Heir' },
					{ key: 'share', label: 'Share', align: 'end' },
					{ key: 'amount', label: 'Amount', align: 'end' },
					{ key: 'each', label: 'Each', align: 'end' },
					{ key: 'why', label: 'Why' }
				],
				rows: out.lines.map((l) => {
					const s = fracToNumber(l.share);
					return {
						heir: l.count > 1 ? `${l.count} ${l.label.toLowerCase()}` : l.label,
						share: l.share[0] === 0 ? '0' : `${fracToString(l.share)} (${pct(s * 100, 2)})`,
						amount: money(estate * s),
						each: l.count > 1 && !l.blocked ? money((estate * s) / l.count) : '',
						why: l.why
					};
				})
			}
		};
	},
	content: {
		intro: `Use this Islamic inheritance calculator to divide an estate among the common Muslim heirs by the rules of Faraid. It follows the ${FARAID_LAW_LABEL}, with the spouse, children, parents, paternal grandfather and full brothers and sisters. It handles exclusion, ʿawl and radd. If a combination is too uncertain, it shows no split.`,
		howTo: [
			'Say whether a man or a woman died. Then enter the heirs who are alive: wives or husband, sons, daughters, parents, grandfather and full brothers and sisters.',
			'Enter the assets, debts, funeral costs and any bequest (a gift by will).',
			'Read each heir’s share and amount in the table. If someone else may inherit, the tool shows no split.',
			'Confirm the result with a qualified scholar or the court before dividing anything.'
		],
		about: [
			{
				heading: 'What is Faraid?',
				paragraphs: [
					`Faraid is the Islamic law of inheritance. It gives each close relative a set share of the estate. The fixed shares come from the Quran (Surah an-Nisa 4:11, 4:12 and 4:176). Scholars then worked out how the shares combine when several relatives are alive.`,
					'This tool follows the Sunni Hanafi view. Other schools agree on most points but differ on some. The Shia schools use different rules altogether. Please read the notes below and ask a scholar who follows your school.'
				]
			},
			{
				heading: 'What is paid before the heirs?',
				paragraphs: [
					`According to Hanafi sources, the order is: first the funeral costs, then the debts in full, then bequests. A bequest may not be more than ${FARAID_BEQUEST_CAP[0]}/${FARAID_BEQUEST_CAP[1]} of what remains. A bequest to someone who is already an heir needs the other heirs’ consent, so this tool treats a bequest as a gift to a non-heir.`,
					'Include any unpaid dowry (mahr) owed to a wife in the debts. What is left is the estate that the heirs share.'
				]
			},
			{
				heading: 'The main fixed shares',
				paragraphs: [
					'These are the fixed shares the calculator uses. Children change many of them. Where a share is not listed, the heir takes a remainder or is blocked by closer heirs.'
				],
				table: {
					caption: 'Fixed shares used in this calculator',
					columns: ['Heir', 'Condition', 'Share'],
					rows: [
						['Husband', 'No child', fs(FARAID_SHARES.husbandNoChild)],
						['Husband', 'With a child', fs(FARAID_SHARES.husbandChild)],
						['Wife or wives together', 'No child', fs(FARAID_SHARES.wivesNoChild)],
						['Wife or wives together', 'With a child', fs(FARAID_SHARES.wivesChild)],
						['Mother', `With a child, or ${FARAID_SIBLINGS_REDUCE_MOTHER} or more siblings`, fs(FARAID_SHARES.motherReduced)],
						['Mother', 'Otherwise', fs(FARAID_SHARES.motherFull)],
						['Father or grandfather', 'With a child (plus any remainder)', fs(FARAID_SHARES.fatherWithChild)],
						['One daughter', 'No son', fs(FARAID_SHARES.daughterOne)],
						['Two or more daughters', 'No son, together', fs(FARAID_SHARES.daughtersMany)],
						['One full sister', 'No child, father, grandfather or brother', fs(FARAID_SHARES.sisterOne)],
						['Two or more full sisters', 'Same conditions, together', fs(FARAID_SHARES.sistersMany)]
					]
				}
			},
			{
				heading: 'Where the schools differ, and what the tool does',
				paragraphs: [
					'The best-known difference here is the paternal grandfather. In the Hanafi view he blocks full brothers and sisters. The Maliki, Shafi’i and Hanbali schools let them share with him. This tool follows the Hanafi view.',
					`There are other points. Hanafi, Shafi’i and Hanbali scholars agree that ${FARAID_SIBLINGS_REDUCE_MOTHER} siblings reduce the mother’s share, even if they are blocked from inheriting. In the case of a spouse, a mother and a father, the mother takes one third of what is left after the spouse. That is the Umariyyatan rule. It does not apply when a grandfather replaces the father.`,
					'ʿAwl and radd are also part of the method. ʿAwl reduces every fixed share in proportion when they add up to more than the estate. Radd returns a surplus to the fixed-share heirs other than the spouse.'
				]
			},
			{
				heading: 'What this calculator does not cover',
				paragraphs: [
					'It does not cover grandchildren through a son, half-siblings, grandmothers, uncles, nephews or other relatives. It also leaves out heirs who may be barred, such as a non-Muslim or a killer of the person who died. If any of these may apply, switch on “Other relatives may also inherit”, and the tool will show no split.',
					'In many countries, courts apply their own personal-status law. Please ask a qualified scholar or the court. If you want to check the fractions by hand, the [fraction calculator](/fraction-calculator) can help, and the [Hijri date converter](/hijri-date-converter) converts dates. To plan charity on the part you keep, see the [zakat calculator](/zakat-calculator). For property finance, see the [Islamic home finance calculator](/islamic-home-finance-calculator).'
				]
			}
		],
		formulas: [
			{
				title: 'Estate to divide',
				expression: `Estate = Assets − Debts − Funeral − min(Bequest, ${FARAID_BEQUEST_CAP[0]}/${FARAID_BEQUEST_CAP[1]} × (Assets − Debts − Funeral))`,
				variables: [{ symbol: 'Bequest', meaning: `A gift by will to a non-heir, limited to ${FARAID_BEQUEST_CAP[0]}/${FARAID_BEQUEST_CAP[1]} of the estate after debts and funeral costs.` }]
			},
			{
				title: 'Fixed shares and residuaries',
				expression: 'Husband ½ or ¼ · Wives ¼ or ⅛ · Mother ⅓ or ⅙ · Father ⅙ + remainder · Daughters ½ or ⅔ · Sisters ½ or ⅔',
				variables: [
					{ symbol: 'ʿawl', meaning: 'If the fixed shares add up to more than 1, every share is reduced in proportion.' },
					{ symbol: 'radd', meaning: 'If shares add up to less than 1 and there is no residuary, the surplus goes back to the fixed-share heirs except the spouse.' },
					{ symbol: `${FARAID_MALE_UNITS} : ${FARAID_FEMALE_UNITS}`, meaning: 'A son (or brother) takes twice the share of a daughter (or sister) in the remainder.' }
				]
			}
		],
		example: {
			title: 'A man dies leaving a wife, 2 sons and 1 daughter; estate 1,000,000',
			steps: [
				`There are children, so the wife takes ${fs(FARAID_SHARES.wivesChild)}: ${(1_000_000 * FARAID_SHARES.wivesChild[0] / FARAID_SHARES.wivesChild[1]).toLocaleString('en-US')}.`,
				'The remainder is 7/8, divided 2 : 2 : 1 between the two sons and the daughter.',
				'Each son takes 7/20: 350,000. The daughter takes 7/40: 175,000.',
				'Check: 125,000 + 350,000 + 350,000 + 175,000 = 1,000,000.'
			],
			result: 'Wife 125,000 · each son 350,000 · daughter 175,000'
		},
		faq: [
			{
				q: 'How is inheritance divided in Islam?',
				a: 'First funeral costs and debts are paid, then any bequest up to one third. The rest is split among the heirs by fixed Quranic shares, and the remainder goes to the residuary heirs, such as sons. A son takes twice a daughter’s share.'
			},
			{
				q: 'Which school of law does this follow?',
				a: 'The Hanafi school. The main point where schools differ here is the paternal grandfather. In the Hanafi view he blocks full brothers and sisters. The Maliki, Shafi’i and Hanbali schools let them share with him. The Shia schools use different rules.'
			},
			{
				q: 'What are ʿawl, radd and the Umariyyatan?',
				a: 'ʿAwl reduces every fixed share in proportion when they add up to more than the estate. Radd returns a surplus to the fixed-share heirs other than the spouse. In the Umariyyatan cases, the mother takes one third of what is left after the spouse.'
			},
			{
				q: 'What does this calculator not cover?',
				a: 'Grandchildren through a son, half-siblings, grandmothers, uncles, nephews and other relatives. It also leaves out barred heirs and a few disputed cases. Where it cannot be sure, it shows no split rather than a wrong one.'
			},
			{
				q: 'Can I rely on this result?',
				a: 'Use it as a guide to talk with a scholar or the court. Rules differ between schools and countries, so please confirm every figure before you divide an estate.'
			}
		],
		sources: FARAID_SOURCES,
		disclaimer:
			'This is a general educational calculation, not a fatwa or legal advice. Inheritance rules differ between schools and countries, and many courts apply their own personal-status law. Always have the result confirmed by a qualified scholar or the court before dividing any estate.'
	}
});
