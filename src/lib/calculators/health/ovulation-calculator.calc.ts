import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH } from '../format';
import meta from './ovulation-calculator.meta';

const DAY = 86_400_000;
/** Ovulation is estimated 14 days before the next period starts. */
const LUTEAL_DAYS = 14;

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

function fmtMonthDay(t: number): string {
	return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function fmtMdy(t: number): string {
	return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** A date range such as "Oct 10 – Oct 16, 2026", or one date when the range is a single day. */
export function range(a: number, b: number): string {
	if (a === b) return fmtMdy(a);
	const sameYear = new Date(a).getUTCFullYear() === new Date(b).getUTCFullYear();
	return `${sameYear ? fmtMonthDay(a) : fmtMdy(a)} – ${fmtMdy(b)}`;
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
			min: 1,
			max: 10,
			step: 1,
			decimal: false,
			suffix: 'days'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const lmp = parseISODate(v.lmp);
		const cycle = Number(v.cycle);
		const period = Number(v.period);
		const fail = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Next estimated ovulation', summary });
		if (Number.isNaN(lmp)) return fail('Enter the first day of your last period.');
		if (!Number.isInteger(cycle) || cycle < 21 || cycle > 45) return fail('Cycle length must be a whole number from 21 to 45 days.');
		if (!Number.isInteger(period) || period < 1 || period > 10) return fail('Period length must be a whole number from 1 to 10 days.');

		// The next three cycles start one, two and three cycle lengths after the last period.
		const cycles = [1, 2, 3].map((k) => {
			const start = lmp + k * cycle * DAY;
			const ovulation = start - LUTEAL_DAYS * DAY;
			return {
				n: k,
				start,
				end: start + (period - 1) * DAY,
				ovulation,
				windowStart: ovulation - 5 * DAY,
				windowEnd: ovulation + 1 * DAY
			};
		});
		const first = cycles[0];

		return {
			primaryResult: fmtFull(first.ovulation),
			primaryLabel: 'Next estimated ovulation',
			summary: `Fertile window ${range(first.windowStart, first.windowEnd)}. This is an estimate, not contraception.`,
			secondaryMetrics: [
				{ label: 'Next period starts', value: fmtMdy(first.start) },
				{ label: 'Next period ends', value: fmtMdy(first.end) },
				{ label: 'Fertile window', value: range(first.windowStart, first.windowEnd) },
				{ label: 'Ovulation day of cycle', value: `Day ${cycle - LUTEAL_DAYS + 1}` }
			],
			table: {
				title: 'Next three cycles (estimates)',
				columns: [
					{ key: 'cycle', label: 'Cycle' },
					{ key: 'period', label: 'Period' },
					{ key: 'ovulation', label: 'Ovulation', align: 'end' },
					{ key: 'window', label: 'Fertile window', align: 'end' }
				],
				rows: cycles.map((c) => ({
					cycle: `Cycle ${c.n}`,
					period: range(c.start, c.end),
					ovulation: fmtMdy(c.ovulation),
					window: range(c.windowStart, c.windowEnd)
				}))
			}
		};
	},
	content: {
		intro:
			'Use this ovulation calculator to estimate the day you are most likely to ovulate, and your fertile window, from your last period and cycle length. It also lists the next three cycles.',
		howTo: [
			'Enter the first day of your last period.',
			'Enter your cycle length, from the first day of one period to the first day of the next.',
			'Enter how many days your period usually lasts.',
			'Read the estimated ovulation day, the fertile window and the next three cycles in the table.'
		],
		about: [
			{
				heading: 'What is ovulation?',
				paragraphs: [
					'Ovulation is when an ovary releases an egg. The egg can be fertilised for about 12 to 24 hours after it is released, according to Mayo Clinic. If it is not fertilised, your next period follows.',
					'In an average 28-day cycle, ovulation usually happens about 14 days before the next period starts. However, this gap changes from person to person and month to month, so 14 days is an average, not a rule.'
				]
			},
			{
				heading: 'What is the fertile window?',
				paragraphs: [
					'Sperm can survive inside the body for about 3 to 5 days. As a result, you can become pregnant from sex in the days before ovulation, not only on the day itself. Mayo Clinic says that having sex regularly from 3 to 4 days before ovulation until one day after improves the chance of pregnancy.',
					'This calculator shows a slightly wider fertile window, from 5 days before the estimated ovulation day to 1 day after. It does this so that it covers the full span in which sperm and egg can meet.'
				]
			},
			{
				heading: 'How this calculator works',
				paragraphs: [
					'First, it adds your cycle length to your last period date to find your next period. Then it counts back 14 days to estimate ovulation. It repeats this for the next three cycles.',
					'This is a calendar method. It works best if your cycles are regular and about the same length each month. It does not measure hormones or body signs, so it cannot confirm that you ovulated.'
				]
			},
			{
				heading: 'Other ways to track ovulation',
				paragraphs: [
					'A calendar estimate can be combined with body signs to improve accuracy:'
				],
				list: [
					'**Ovulation test kits** check urine for a rise in luteinising hormone (LH), which comes shortly before ovulation.',
					'**Cervical mucus** often becomes clearer and more slippery around ovulation.',
					'**Basal body temperature** rises slightly after ovulation, so it shows that ovulation has already happened.',
					'**A cycle app or diary** helps you see your own pattern over several months.'
				]
			},
			{
				heading: 'Trying to conceive, and when to get help',
				paragraphs: [
					'The NHS says that more than 8 in 10 couples conceive naturally within a year of regular unprotected sex, when the woman is under 40. So it is normal for it to take some months.',
					'See a doctor if you have not conceived after a year of trying. Go sooner if you are 36 or older, have irregular or absent periods, or already know of a fertility concern. You can also check your dates with the [period calculator](/period-calculator), and use the [due date calculator](/due-date-calculator) or [conception calculator](/conception-calculator) once you are pregnant.'
				]
			}
		],
		formulas: [
			{
				title: 'Next period',
				expression: 'Next period start = last period start + cycle length',
				variables: []
			},
			{
				title: 'Estimated ovulation',
				expression: 'Ovulation = next period start − 14 days',
				variables: [{ symbol: '14', meaning: 'the usual time from ovulation to the next period' }]
			},
			{
				title: 'Fertile window',
				expression: 'From ovulation − 5 days to ovulation + 1 day',
				variables: []
			}
		],
		example: {
			title: 'Last period on 1 October 2026, 28-day cycle, 5-day period',
			steps: [
				'Next period = 1 October + 28 days = 29 October 2026',
				'Ovulation = 29 October − 14 days = 15 October 2026',
				'Fertile window = 10 October (15 − 5) to 16 October (15 + 1)',
				'Period ends = 29 October + 4 days = 2 November 2026'
			],
			result: 'Next estimated ovulation Thursday, October 15, 2026, with a fertile window from October 10 to October 16.'
		},
		faq: [
			{
				q: 'When do I ovulate?',
				a: 'In a typical 28-day cycle, ovulation happens around day 14, or about 14 days before your next period. With a longer or shorter cycle, it moves later or earlier. Enter your cycle length to see your estimate.'
			},
			{
				q: 'Can I use this to avoid pregnancy?',
				a: 'No. A calendar estimate is not contraception. Cycles vary, and sperm can survive for several days. If you want to avoid pregnancy, use a method that is tested for that purpose and talk to a doctor or nurse.'
			},
			{
				q: 'Why is ovulation 14 days before the next period?',
				a: 'The time from ovulation to the next period is fairly steady for many people, at around 14 days. The first half of the cycle varies more, so cycle length sets the ovulation date. It can still differ from month to month.'
			},
			{
				q: 'What if my cycles are irregular?',
				a: 'Irregular cycles make a calendar estimate less reliable. Ovulation tests or advice from a clinician can give you more accurate dates.'
			},
			{
				q: 'When should I see a doctor?',
				a: 'See a doctor if your periods stop, become very irregular, or if you have been trying to conceive for a year. The NHS advises going sooner if you are 36 or older.'
			}
		],
		sources: [
			{ title: 'Mayo Clinic — Ovulation signs: when is conception most likely?', url: 'https://www.mayoclinic.org/healthy-lifestyle/getting-pregnant/expert-answers/ovulation-signs/faq-20058000' },
			{ title: 'NHS Wales 111 — Infertility', url: 'https://111.wales.nhs.uk/encyclopaedia/i/article/infertility/' },
			{ title: 'NHS — Contraception', url: 'https://www.nhs.uk/conditions/contraception/' }
		],
		disclaimer:
			'This is an estimate, not contraception and not a guarantee of fertility. Cycles vary. Talk to a doctor or nurse about family planning or trying to conceive.'
	}
});
