import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, plural } from '../format';
import meta from './period-calculator.meta';

const DAY = 86_400_000;
/** Ovulation is estimated 14 days before the next period starts. */
const LUTEAL_DAYS = 14;
const TABLE_ROWS = 6;

/** Parse YYYY-MM-DD as a UTC date, returned in milliseconds. NaN when invalid. */
export function parseISODate(s: unknown): number {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
	if (!m) return NaN;
	const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
	return new Date(t).getUTCMonth() === +m[2] - 1 ? t : NaN;
}

function fmtFull(t: number): string {
	return new Date(t).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function fmtMdy(t: number): string {
	return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'lmp',
			label: 'First day of last period',
			type: 'date',
			default: '2026-10-01'
		},
		{
			id: 'cycle',
			label: 'Cycle length',
			type: 'number',
			default: 28,
			min: 21,
			max: 45,
			step: 1,
			decimal: false,
			suffix: 'days',
			help: 'From the first day of one period to the first day of the next.'
		},
		{
			id: 'period',
			label: 'Period length',
			type: 'number',
			default: 5,
			min: 2,
			max: 10,
			step: 1,
			decimal: false,
			suffix: 'days'
		},
		{
			id: 'on',
			label: 'Calculate from',
			type: 'date',
			default: 'today',
			help: 'Shows the first period on or after this date. Defaults to today.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const label = 'Next period starts';
		const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: label, summary });

		const lmp = parseISODate(v.lmp);
		const cycle = Number(v.cycle);
		const period = Number(v.period);
		const on = parseISODate(v.on);
		if (Number.isNaN(lmp)) return fail('Enter the first day of your last period.');
		if (!Number.isInteger(cycle) || cycle < 21 || cycle > 45) return fail('Cycle length must be a whole number from 21 to 45 days.');
		if (!Number.isInteger(period) || period < 2 || period > 10) return fail('Period length must be a whole number from 2 to 10 days.');
		if (Number.isNaN(on)) return fail('Enter a valid date to calculate from.');

		// Start at the first cycle whose period begins on or after the chosen date.
		const firstCycle = Math.max(1, Math.ceil((on - lmp) / (cycle * DAY)));
		const periods = Array.from({ length: TABLE_ROWS }, (_, i) => {
			const start = lmp + (firstCycle + i) * cycle * DAY;
			return {
				n: i + 1,
				start,
				end: start + (period - 1) * DAY,
				ovulation: start - LUTEAL_DAYS * DAY
			};
		});
		const next = periods[0];
		const daysAway = Math.round((next.start - on) / DAY);

		return {
			primaryResult: fmtFull(next.start),
			primaryLabel: label,
			summary: `Expected to last ${plural(period, 'day')}, until ${fmtMdy(next.end)}.`,
			secondaryMetrics: [
				{ label: 'Period ends', value: fmtMdy(next.end) },
				{ label: 'Days until it starts', value: daysAway === 0 ? 'Starts today' : plural(daysAway, 'day') },
				{ label: 'Estimated ovulation', value: fmtMdy(next.ovulation) },
				{ label: 'Cycle length', value: plural(cycle, 'day') }
			],
			table: {
				title: 'Next six periods (estimates)',
				columns: [
					{ key: 'period', label: 'Period' },
					{ key: 'starts', label: 'Starts', align: 'end' },
					{ key: 'ends', label: 'Ends', align: 'end' },
					{ key: 'ovulation', label: 'Ovulation', align: 'end' }
				],
				rows: periods.map((p) => ({
					period: `Period ${p.n}`,
					starts: fmtMdy(p.start),
					ends: fmtMdy(p.end),
					ovulation: fmtMdy(p.ovulation)
				}))
			}
		};
	},
	content: {
		intro:
			'Use this period calculator to predict the start and end dates of your next six periods, with the estimated ovulation day in each cycle. Just enter your last period and your usual cycle and period length.',
		howTo: [
			'Enter the first day of your last period.',
			'Enter your cycle length, from the first day of one period to the first day of the next.',
			'Enter how many days your period usually lasts.',
			'Read the next period date and the six-period table. Change the “calculate from” date to look further ahead.'
		],
		about: [
			{
				heading: 'What is a menstrual cycle?',
				paragraphs: [
					'Your menstrual cycle runs from the first day of one period to the first day of the next. According to NHS information, the average cycle is 28 days, but a normal cycle can run from about 21 to 35 days.',
					'Most periods last between 3 and 8 days. Cycles are often less regular when periods first start, and when menopause is near. A cycle can also change with stress, illness, weight change or some medicines.'
				]
			},
			{
				heading: 'How your next period is predicted',
				paragraphs: [
					'The calculator adds your cycle length to the first day of your last period. It repeats this for each future cycle, so every date is one cycle length after the one before. The end date is the start date plus your period length, minus one day.',
					'It also shows estimated ovulation, 14 days before each period starts. For the full method, see the formulas section below.',
					'This works best with regular cycles. If your cycle length changes by a few days each month, the dates will drift. Update the calculator after each period to keep it close.'
				]
			},
			{
				heading: 'Cycle lengths and what they mean',
				paragraphs: [
					'The tool accepts cycle lengths from 21 to 45 days. However, the NHS describes periods as irregular if the gap is shorter than 21 days or longer than 35 days. If your cycle is outside the 21 to 35 day range, the prediction may be less reliable, and it is worth mentioning to a doctor.',
					'Cycle length is the number to enter, not period length. Count from day 1 of bleeding in one cycle to day 1 of bleeding in the next. If your cycles differ, use an average of the last three.'
				]
			},
			{
				heading: 'When to talk to a doctor',
				paragraphs: [
					'Speak to a doctor or nurse if your periods become irregular or your usual pattern changes. The NHS also lists these reasons to get advice:'
				],
				list: [
					'Very heavy bleeding, or bleeding between periods or after sex.',
					'Severe pain that stops you from work, study or daily life.',
					'Periods that suddenly stop or last longer than 7 days.',
					'Irregular periods along with other symptoms, or while you are trying to get pregnant.'
				]
			},
			{
				heading: 'Related tools',
				paragraphs: [
					'A missed period can be an early sign of pregnancy. If that could apply to you, take a pregnancy test and see a doctor or midwife. The [pregnancy calculator](/pregnancy-calculator) and [due date calculator](/due-date-calculator) can then help you work out your dates.',
					'To focus on your fertile days, use the [ovulation calculator](/ovulation-calculator). Dates here are not contraception.'
				]
			}
		],
		formulas: [
			{
				title: 'Period start',
				expression: 'Start of period = last period + n × cycle length',
				variables: [{ symbol: 'n', meaning: 'the number of cycles since the last period, starting with the first one on or after your chosen date' }]
			},
			{
				title: 'Period end',
				expression: 'End = start + (period length − 1) days',
				variables: []
			},
			{
				title: 'Estimated ovulation',
				expression: 'Ovulation = period start − 14 days',
				variables: [{ symbol: '14', meaning: 'the usual number of days from ovulation to the next period' }]
			}
		],
		example: {
			title: 'Last period on 1 October 2026, 28-day cycle, 5-day period',
			steps: [
				'Next period = 1 October + 28 days = 29 October 2026',
				'It ends after 5 days: 29 October + 4 days = 2 November 2026',
				'Ovulation = 29 October − 14 days = 15 October 2026',
				'Period 3 in the table starts 1 October + 3 × 28 days = 24 December 2026'
			],
			result: 'Next period from Thursday, October 29, 2026 to November 2, 2026, with ovulation estimated on October 15.'
		},
		faq: [
			{
				q: 'How accurate is a period calculator?',
				a: 'It assumes the same cycle length each month. Most people vary by a few days from cycle to cycle, so treat the dates as a guide and update them after each period.'
			},
			{
				q: 'What is a normal cycle length?',
				a: 'The average is 28 days. The NHS describes cycles of about 21 to 35 days as normal. Cycles often shorter than 21 days or longer than 35 days count as irregular, so mention them to a doctor.'
			},
			{
				q: 'How many days late can a period be?',
				a: 'A few days either way is common. If you miss a period and could be pregnant, take a pregnancy test. If your periods often come late or stop, see a doctor to find out why.'
			},
			{
				q: 'Why does the table show ovulation?',
				a: 'Ovulation is when pregnancy is most possible in a cycle. The estimate can help with planning, but it is not reliable enough to prevent pregnancy.'
			},
			{
				q: 'When should I see a doctor about my periods?',
				a: 'See a doctor if your periods stop, become much heavier or more painful, last longer than 7 days, or change suddenly. Ask for advice if you are unsure whether a change is normal for you.'
			}
		],
		sources: [
			{ title: 'NHS Wales 111 — Periods, irregular', url: 'https://111.wales.nhs.uk/Encyclopaedia/p/article/periods,irregular' },
			{ title: 'NHS Essex — Periods', url: 'https://www.essex.icb.nhs.uk/health/womens-health/periods/' }
		],
		disclaimer:
			'Dates are estimates based on your cycle length, which can vary from month to month. This is not contraception. Talk to a doctor about irregular periods or any concerns about your cycle.'
	}
});
