import { defineCalculator, type CalculationResult, type InputValues, type RowValue } from '../types';
import { DASH, money, num, plural } from '../format';
import meta from './time-card-calculator.meta';

const MINUTES_PER_DAY = 1_440;
/** Hours after which each hour is paid at the overtime rate, in minutes. */
const OVERTIME_AFTER = 40 * 60;
const OVERTIME_MULTIPLIER = 1.5;

/** "HH:MM" (24-hour) to minutes after midnight. Null when the text is not a valid time. */
function minutesOf(s: string): number | null {
	const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s.trim());
	return m ? +m[1] * 60 + +m[2] : null;
}

/** Minutes after midnight to "h:mm AM" / "h:mm PM". */
function clock12(total: number): string {
	const h24 = Math.floor(total / 60);
	const h = h24 % 12 || 12;
	return `${h}:${String(total % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/** Minutes to "h:mm". */
function hoursAndMinutes(total: number): string {
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const fail = (summary: string): CalculationResult => ({
	primaryResult: DASH,
	primaryLabel: 'Total hours',
	summary
});

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'shifts',
			label: 'Shifts',
			type: 'rows',
			columns: [
				{ id: 'day', label: 'Day', type: 'text', default: 'Mon', placeholder: 'Day' },
				{ id: 'start', label: 'Start', type: 'text', default: '09:00', placeholder: 'HH:MM' },
				{ id: 'end', label: 'End', type: 'text', default: '17:00', placeholder: 'HH:MM' },
				{ id: 'breakMins', label: 'Break', type: 'number', default: 30, min: 0, max: MINUTES_PER_DAY, suffix: 'min' }
			],
			default: [
				{ day: 'Mon', start: '09:00', end: '17:00', breakMins: 30 },
				{ day: 'Tue', start: '09:00', end: '17:00', breakMins: 30 },
				{ day: 'Wed', start: '09:00', end: '17:00', breakMins: 30 },
				{ day: 'Thu', start: '09:00', end: '17:00', breakMins: 30 },
				{ day: 'Fri', start: '09:00', end: '17:00', breakMins: 30 }
			],
			minRows: 1,
			maxRows: 14,
			addLabel: 'Add shift',
			help: 'Times use 24-hour HH:MM. An end time earlier than the start is treated as an overnight shift.'
		},
		{
			id: 'rate',
			label: 'Hourly rate (optional)',
			type: 'number',
			default: 20,
			min: 0,
			max: 10000,
			prefix: '$',
			suffix: '/hour',
			help: 'Leave at 0 to skip pay. Hours over 40 a week are paid at 1.5 times this rate.'
		}
	],
	calculate(v: InputValues): CalculationResult {
		const shifts = (v.shifts as RowValue[]) ?? [];
		if (shifts.length === 0) return fail('Add at least one shift.');

		const rate = Number(v.rate);
		if (!Number.isFinite(rate) || rate < 0) return fail('Enter an hourly rate of zero or more.');

		let total = 0;
		const daily: Record<string, string>[] = [];
		for (let i = 0; i < shifts.length; i++) {
			const row = shifts[i];
			const day = String(row.day ?? '').trim();
			const label = `Row ${i + 1}${day ? ` (${day})` : ''}`;

			const start = minutesOf(String(row.start ?? ''));
			const end = minutesOf(String(row.end ?? ''));
			if (start === null || end === null) return fail(`Check ${label}: enter the start and end as HH:MM, such as 09:00.`);

			const brk = Number(row.breakMins);
			if (!Number.isInteger(brk) || brk < 0) return fail(`Check ${label}: enter the break as zero or more minutes.`);

			const span = (end < start ? end + MINUTES_PER_DAY : end) - start;
			const worked = span - brk;
			if (worked < 0) return fail(`Check ${label}: the break is longer than the shift.`);

			total += worked;
			daily.push({
				day: day || `Row ${i + 1}`,
				shift: `${clock12(start)} to ${clock12(end)}`,
				hours: hoursAndMinutes(worked)
			});
		}

		const regular = Math.min(total, OVERTIME_AFTER);
		const overtime = Math.max(0, total - OVERTIME_AFTER);
		const pay = rate * (regular / 60 + (overtime / 60) * OVERTIME_MULTIPLIER);

		const summary =
			overtime > 0
				? `${plural(shifts.length, 'shift')} totalling ${hoursAndMinutes(total)}, with ${hoursAndMinutes(overtime)} paid as overtime.`
				: `${plural(shifts.length, 'shift')} totalling ${hoursAndMinutes(total)}, all at the regular rate.`;

		return {
			primaryResult: hoursAndMinutes(total),
			primaryLabel: 'Total hours',
			summary,
			secondaryMetrics: [
				{ label: 'Decimal hours', value: num(total / 60, 2, 2) },
				{ label: 'Regular hours', value: hoursAndMinutes(regular) },
				{ label: 'Overtime hours', value: hoursAndMinutes(overtime) },
				{ label: 'Gross pay', value: rate > 0 ? money(pay) : 'Add an hourly rate' }
			],
			table: {
				title: 'Daily hours',
				columns: [
					{ key: 'day', label: 'Day' },
					{ key: 'shift', label: 'Shift' },
					{ key: 'hours', label: 'Hours', align: 'end' }
				],
				rows: daily,
				collapsed: false
			}
		};
	},
	content: {
		intro:
			'Add up the hours on a time card for one week. Enter each shift’s day, start time, end time and unpaid break. The calculator totals the hours, splits out overtime and estimates gross pay.',
		howTo: [
			'Enter each shift’s day, start time and end time in 24-hour HH:MM format, such as 08:30 or 17:00.',
			'Enter the unpaid break for that shift in minutes, or 0 if there was none.',
			'Add a row for each shift you worked, or remove rows you did not work.',
			'Enter your hourly rate to see gross pay, or set it to 0 to see hours only.'
		],
		about: [
			{
				heading: 'How a time card total is built',
				paragraphs: [
					'Each shift is worked out on its own first. The calculator subtracts the start time from the end time, then takes away any unpaid break. For a shift from 09:00 to 17:00 with a 30-minute break, the worked time is 7 hours 30 minutes.',
					'Next, the calculator adds the worked time for every row. The total is shown in hours and minutes, and as decimal hours, which many payroll systems use. An end time earlier than the start time is treated as an overnight shift.'
				]
			},
			{
				heading: 'Overtime rules differ by country',
				paragraphs: [
					'This calculator uses a weekly rule: hours over 40 in a week are paid at 1.5 times the normal rate. This matches the US federal rule for most hourly workers. In the US, the Department of Labor sets the basic rule, and some states add their own.',
					'Other places work differently. California, for example, also pays overtime for hours over 8 in a single day. In the UK, there is no general legal overtime rate, so extra hours are paid as your contract says. Check your local rules before you rely on the overtime figure.'
				]
			},
			{
				heading: 'From gross pay to take-home pay',
				paragraphs: [
					'Gross pay is the amount you earn before tax and other deductions. Your take-home pay, the money that reaches your account, is lower. Tax, social insurance and pension contributions all reduce the gross figure.',
					'To estimate your take-home pay, use the [take-home pay calculator](/take-home-pay-calculator). For a yearly figure from an hourly rate, the [salary calculator](/salary-calculator) can help.'
				]
			},
			{
				heading: 'Keeping accurate records',
				paragraphs: [
					'A time card is only as good as the times on it. Write down the exact start and finish times, not the times you meant to work. Record breaks in the same way, so the total is correct.',
					'Some employers round times to the nearest 5, 10 or 15 minutes. Ask how your employer rounds, and compare your card with your payslip each pay period.'
				]
			},
			{
				heading: 'Working across time zones',
				paragraphs: [
					'Remote and international teams often log shifts in different time zones. Before you add the times, convert them to your own time. The [time zone calculator](/time-zone-calculator) shows the matching time in another city.',
					'For a single shift, the [hours calculator](/hours-calculator) is quicker. It works out the hours for one start and end time, with a break.'
				]
			}
		],
		formulas: [
			{
				title: 'Hours for one shift',
				expression: 'Worked minutes = (end − start) − break, with 24 hours added when the end is earlier than the start',
				variables: [{ symbol: '24 h', meaning: 'one full day, added for overnight shifts' }]
			},
			{
				title: 'Total and decimal hours',
				expression: 'Total minutes = sum of worked minutes for every shift. Decimal hours = total minutes ÷ 60.',
				variables: []
			},
			{
				title: 'Overtime split',
				expression: 'Regular hours = the first 40 hours. Overtime hours = total hours − 40, when the total is above 40.',
				variables: [{ symbol: '40', meaning: 'the weekly limit used by this calculator' }]
			},
			{
				title: 'Gross pay',
				expression: 'Pay = regular hours × rate + overtime hours × rate × 1.5',
				variables: [{ symbol: '1.5', meaning: 'overtime multiplier' }]
			}
		],
		example: {
			title: 'Five 9 to 5 days with a 30-minute break, paid at $20 an hour',
			steps: [
				'Each day: 17:00 − 09:00 = 8 h, minus 30 min = 7 h 30 min.',
				'Total: 5 × 7 h 30 min = 37 h 30 min, which is 37.50 decimal hours.',
				'Under 40 hours, so no overtime. Pay = 37.5 × $20 = $750.00.'
			],
			result: 'Total 37:30 (37.50 hours), gross pay $750.00.'
		},
		faq: [
			{
				q: 'How is overtime calculated here?',
				a: 'Hours beyond 40 in the week are paid at 1.5 times your hourly rate. This matches the US federal rule for most hourly workers. Other countries and some US states use daily limits or different rules.'
			},
			{
				q: 'How do I enter a shift that runs past midnight?',
				a: 'Enter the real end time, such as 06:00. If the end time is earlier than the start time, the shift is counted as running into the next morning.'
			},
			{
				q: 'What is the difference between h:mm and decimal hours?',
				a: 'h:mm shows hours and minutes, so 7:30 is seven and a half hours. Decimal hours write the same time as a number, so 7:30 is 7.50. Payroll systems often use decimals.'
			},
			{
				q: 'Does this include taxes or deductions?',
				a: 'No. Gross pay is before tax, insurance and other deductions, so your take-home pay will be lower.'
			},
			{
				q: 'What if my pay week is not Monday to Sunday?',
				a: 'The calculator totals whatever rows you enter, so add only the shifts in your pay week. The 40-hour overtime rule applies to the total you enter, so match the rows to your employer’s week.'
			}
		],
		sources: [
			{ title: 'US Department of Labor — Overtime pay', url: 'https://www.dol.gov/agencies/whd/overtime' }
		],
		disclaimer:
			'Results are estimates for planning. Check your pay stub or your employer’s records for the amount you are actually paid.'
	}
});
