import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num } from '../format';
import meta from './hours-calculator.meta';

const MINUTES_PER_DAY = 1_440;

/** "HH:MM" (24-hour) to minutes after midnight. Null when the text is not a valid time. */
export function minutesOf(s: string): number | null {
	const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s);
	return m ? +m[1] * 60 + +m[2] : null;
}

/** Minutes after midnight to "h:mm AM" / "h:mm PM". */
export function clock12(total: number): string {
	const mins = ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
	const h24 = Math.floor(mins / 60);
	const h = h24 % 12 || 12;
	return `${h}:${String(mins % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/** Minutes to "h:mm" with minutes padded to two digits. */
export function hoursAndMinutes(total: number): string {
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const invalid = (summary: string): CalculationResult => ({ primaryResult: DASH, primaryLabel: 'Hours worked', summary });

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'start', label: 'Start time', type: 'time', default: '09:00' },
		{ id: 'end', label: 'End time', type: 'time', default: '17:30', help: 'An earlier end time means the shift runs past midnight.' },
		{
			id: 'breakMins',
			label: 'Unpaid break',
			type: 'number',
			default: 30,
			min: 0,
			max: MINUTES_PER_DAY,
			decimal: false,
			suffix: 'minutes',
			help: 'Enter 0 if there was no unpaid break.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const start = minutesOf(String(v.start));
		const end = minutesOf(String(v.end));
		if (start === null || end === null) return invalid('Enter a start time and an end time.');

		const brk = Number(v.breakMins);
		if (!Number.isInteger(brk) || brk < 0) return invalid('Enter a whole number of break minutes, zero or more.');

		const crosses = end < start;
		const span = (crosses ? end + MINUTES_PER_DAY : end) - start;
		const worked = span - brk;
		if (worked < 0) return invalid('The break is longer than the shift.');

		const timeRange = `${clock12(start)} to ${clock12(end)}`;
		const summary =
			span === 0
				? 'The start and end times are the same, so no time is counted.'
				: `${timeRange}${crosses ? ', past midnight' : ''}, minus a ${num(brk, 0)}-minute unpaid break.`;

		return {
			primaryResult: hoursAndMinutes(worked),
			primaryLabel: 'Hours worked',
			summary,
			secondaryMetrics: [
				{ label: 'Decimal hours', value: num(worked / 60, 2, 2) },
				{ label: 'Total minutes', value: num(worked, 0) },
				{ label: 'Time before break', value: hoursAndMinutes(span) }
			]
		};
	},
	content: {
		intro:
			'Work out paid hours from a start time, an end time and any unpaid break. Shifts that run past midnight are handled automatically, so it works for night shifts too.',
		howTo: [
			'Enter the start time and the end time, using the time boxes on your device.',
			'Enter the unpaid break in minutes, or 0 if you had none.',
			'If the end time is earlier than the start time, the shift is treated as running past midnight.',
			'Read hours worked as hours and minutes, then as decimal hours for pay calculations.'
		],
		about: [
			{
				heading: 'How hours worked are calculated',
				paragraphs: [
					'First, the calculator finds the length of the shift. It subtracts the start time from the end time, and converts both to minutes after midnight. Next, it subtracts any unpaid break from that total.',
					'The answer is the time you were paid for. A 9:00 start and a 5:30 finish gives 8 hours and 30 minutes before the break. With a 30-minute unpaid lunch, the hours worked are 8 hours.'
				]
			},
			{
				heading: 'Overnight and split shifts',
				paragraphs: [
					'A shift that starts at 10:00 PM and ends at 6:30 AM crosses midnight. The end time is earlier than the start time, so the calculator adds 24 hours to the end. This gives an 8-hour 30-minute shift. The calculator does not ask for dates, so a shift that ends the next day is handled the same way.',
					'The calculator works on a single shift. A split shift, with two separate work periods in one day, needs each period added up. Use the [time calculator](/time-calculator) to add the parts together.'
				]
			},
			{
				heading: 'Breaks and the law',
				paragraphs: [
					'Breaks are often required by law, and the rules differ by country. In the UK, adults who work more than six hours are usually entitled to an uninterrupted 20-minute rest break.',
					'Check whether your break is paid or unpaid. Many employers deduct unpaid breaks from the hours on your timesheet. Your payslip shows how your hours were counted. If you are unsure, ask your employer or read your contract.'
				]
			},
			{
				heading: 'Turning hours into pay',
				paragraphs: [
					'Pay is often calculated with decimal hours. Multiply the decimal figure by your hourly rate. For example, 7.75 hours at $20 an hour is $155. Round only the final total, because rounding each shift separately can shift the sum by several minutes.',
					'For a rough yearly figure, multiply your hourly rate by the hours you work each week, then by the number of weeks you work. The [salary calculator](/salary-calculator) can help with that.'
				]
			},
			{
				heading: 'Weekly totals and overtime',
				paragraphs: [
					'Hours for a full week are added up day by day. Overtime rules are set by each country and employer. Some pay extra for hours over a daily or weekly limit, and some do not.',
					'To add up a week of shifts in one place, use the [time card calculator](/time-card-calculator). Keep a note of the date for each overnight shift, so the hours go on the right day in your records. If your shifts fall in different time zones, the [time zone calculator](/time-zone-calculator) helps you match the times.'
				]
			}
		],
		formulas: [
			{
				title: 'Shift length',
				expression: 'Shift = end time − start time, plus 24 hours when the end is earlier than the start',
				variables: [{ symbol: '24 h', meaning: 'one full day, added for overnight shifts' }]
			},
			{
				title: 'Hours worked',
				expression: 'Worked minutes = shift minutes − unpaid break minutes',
				variables: []
			},
			{
				title: 'Decimal hours',
				expression: 'Decimal hours = worked minutes ÷ 60',
				variables: [{ symbol: '60', meaning: 'minutes in an hour' }]
			}
		],
		example: {
			title: '10:00 PM to 6:30 AM with a 45-minute break',
			steps: [
				'6:30 AM is earlier than 10:00 PM, so the shift crosses midnight. Shift = 6:30 + 24:00 − 22:00 = 8 h 30 min = 510 minutes.',
				'Worked minutes = 510 − 45 = 465 minutes.',
				'Decimal hours = 465 ÷ 60 = 7.75.'
			],
			result: '7:45 (7.75 decimal hours).'
		},
		faq: [
			{
				q: 'How do overnight shifts work?',
				a: 'If the end time is earlier than the start time, the calculator assumes the shift ends the next morning. A 10:00 PM start and a 6:30 AM end is an 8 h 30 min shift.'
			},
			{
				q: 'How do I turn minutes into decimal hours?',
				a: 'Divide the minutes by 60. 15 minutes is 0.25 hours and 45 minutes is 0.75 hours. Many payroll systems use decimal hours.'
			},
			{
				q: 'What if the start and end times are the same?',
				a: 'The calculator counts zero hours, because it cannot tell whether you meant no time or a full 24-hour shift.'
			},
			{
				q: 'Should I subtract a paid break?',
				a: 'No. Paid breaks count as worked time, so leave them out of the unpaid break box. Only subtract the minutes you were not paid for.'
			},
			{
				q: 'How do I work out hours for a whole week?',
				a: 'Add up the hours worked for each shift. The [time card calculator](/time-card-calculator) does this for a full week, including decimal totals.'
			}
		],
		sources: [{ title: 'GOV.UK — Rest breaks at work', url: 'https://www.gov.uk/rest-breaks-work' }],
		disclaimer:
			'This calculator gives a simple count of hours. It does not include overtime, tax, or pay rules from your employer or country. Check your contract or payslip for the final figures.'
	}
});
