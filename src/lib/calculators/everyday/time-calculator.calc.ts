import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH, num, plural } from '../format';
import meta from './time-calculator.meta';

const mode = (m: string) => (v: InputValues) => v.mode === m;

/** Split seconds into d/h/m/s parts (sign kept separately). */
export function splitSeconds(total: number) {
	const sign = total < 0 ? -1 : 1;
	let t = Math.round(Math.abs(total));
	const d = Math.floor(t / 86400);
	t -= d * 86400;
	const h = Math.floor(t / 3600);
	t -= h * 3600;
	const m = Math.floor(t / 60);
	const s = t - m * 60;
	return { sign, d, h, m, s };
}

export function describe(total: number): string {
	const { sign, d, h, m, s } = splitSeconds(total);
	const parts = [d && plural(d, 'day'), h && plural(h, 'hour'), m && plural(m, 'minute'), s && plural(s, 'second')].filter(Boolean);
	return `${sign < 0 ? '−' : ''}${parts.length ? parts.join(', ') : '0 seconds'}`;
}

function clock(total: number): string {
	const { sign, d, h, m, s } = splitSeconds(total);
	const hh = d * 24 + h;
	return `${sign < 0 ? '−' : ''}${hh}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'What do you want to do?',
			type: 'select',
			display: 'segmented',
			default: 'add',
			options: [
				{ label: 'Add or subtract times', value: 'add' },
				{ label: 'Add time to a date', value: 'date' }
			]
		},
		{ id: 'a', label: 'First time', type: 'duration', units: ['d', 'h', 'm', 's'], default: '0:2:45:0', visibleWhen: mode('add') },
		{
			id: 'op',
			label: 'Operation',
			type: 'select',
			display: 'segmented',
			default: 'plus',
			options: [
				{ label: 'Add (+)', value: 'plus' },
				{ label: 'Subtract (−)', value: 'minus' }
			],
			visibleWhen: mode('add')
		},
		{ id: 'b', label: 'Second time', type: 'duration', units: ['d', 'h', 'm', 's'], default: '0:1:30:30', visibleWhen: mode('add') },
		{ id: 'start', label: 'Start date', type: 'date', default: 'today', visibleWhen: mode('date') },
		{ id: 'clock', label: 'Start time', type: 'time', default: '09:00', visibleWhen: mode('date') },
		{
			id: 'dur',
			label: 'Time to add (use − to go back)',
			type: 'duration',
			units: ['d', 'h', 'm'],
			default: '0:8:30',
			allowNegative: true,
			visibleWhen: mode('date')
		}
	],
	calculate(v): CalculationResult {
		if (v.mode === 'date') {
			const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v.start));
			const t = /^(\d{2}):(\d{2})$/.exec(String(v.clock));
			const dur = Number(v.dur);
			if (!m || !t || !Number.isFinite(dur)) return { primaryResult: DASH, primaryLabel: 'Ends at', summary: 'Enter a date, a time and a duration.' };
			// Wall-clock arithmetic in UTC so daylight-saving changes don't shift the answer.
			const startMs = Date.UTC(+m[1], +m[2] - 1, +m[3], +t[1], +t[2]);
			const end = new Date(startMs + dur * 1000);
			const date = end.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
			const time = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
			return {
				primaryResult: time,
				primaryLabel: 'Ends at',
				summary: date,
				secondaryMetrics: [
					{ label: dur < 0 ? 'Time subtracted' : 'Time added', value: describe(Math.abs(dur)) },
					{ label: 'In hours', value: num(Math.abs(dur) / 3600, 2) }
				]
			};
		}

		const a = Number(v.a);
		const b = Number(v.b);
		if (!Number.isFinite(a) || !Number.isFinite(b)) return { primaryResult: DASH, primaryLabel: 'Result', summary: 'Enter two times.' };
		const total = v.op === 'minus' ? a - b : a + b;
		return {
			primaryResult: clock(total),
			primaryLabel: 'Result (hours:minutes:seconds)',
			summary: describe(total),
			secondaryMetrics: [
				{ label: 'Total hours', value: num(total / 3600, 4) },
				{ label: 'Total minutes', value: num(total / 60, 2) },
				{ label: 'Total seconds', value: num(total, 0) }
			]
		};
	},
	content: {
		intro:
			'Add or subtract hours, minutes and seconds, or add a duration to a date and time to find exactly when something ends. Use it for work shifts, recipes, travel, race times and project plans.',
		howTo: [
			'Choose whether to combine two times or add time to a date and time.',
			'Enter each time in the day, hour, minute and second boxes. Empty boxes count as zero.',
			'Pick add or subtract. Results carry over automatically, so 90 minutes becomes 1 hour and 30 minutes.',
			'Read the result as hours:minutes:seconds, in words, and as total hours, minutes or seconds.'
		],
		about: [
			{
				heading: 'Why time doesn’t add like normal numbers',
				paragraphs: [
					'Time is counted in groups. There are 60 seconds in a minute, 60 minutes in an hour and 24 hours in a day.',
					'That is why 2:45 plus 1:30 is not 3.75 hours. Add the minutes first: 45 + 30 = 75 minutes, which is 1 hour and 15 minutes. Then add the hours: 2 + 1 + 1 = 4 hours. The answer is 4:15.',
					'The calculator does this carrying for you.',
					'Any extra 60 seconds become a minute, and any extra 60 minutes become an hour.'
				]
			},
			{
				heading: 'Decimal hours and hours with minutes',
				paragraphs: [
					'Payroll systems, invoices and some apps show time as decimal hours, such as 2.75. To convert minutes to decimal hours, divide by 60. To convert back, multiply the decimal part by 60.',
					'Two numbers that look close can mean very different times. 2.5 hours is 2 hours and 30 minutes, not 2 hours and 50 minutes. Check the “Total hours” line when you need a decimal figure.'
				],
				table: {
					caption: 'Common conversions',
					columns: ['Decimal hours', 'Hours and minutes'],
					rows: [
						['0.25', '15 minutes'],
						['0.5', '30 minutes'],
						['0.75', '45 minutes'],
						['1.5', '1 hour 30 minutes'],
						['2.75', '2 hours 45 minutes']
					]
				}
			},
			{
				heading: 'Adding time to a date and time',
				paragraphs: [
					'Choose “Add time to a date” to find when something ends. Enter the start date and time, then the duration. For example, an 8-hour 30-minute shift that starts at 9:00 in the morning ends at 5:30 in the afternoon on the same day.',
					'Use a minus sign in front of the duration to go back in time. This is useful for working out when to start a task so it finishes on time.',
					'The calculator adds clock time. It does not adjust for daylight saving changes. On the day the clocks change, a “24 hour” span may be one hour more or less in real elapsed time. If you need the exact calendar gap across days, the [date calculator](/date-calculator) is a good choice.'
				]
			},
			{
				heading: '12-hour and 24-hour clocks',
				paragraphs: [
					'Most of the world writes times on a 24-hour clock, from 00:00 to 23:59. Timetables, transport and medical records often use it. In everyday speech, the US, Canada, Australia, India and Pakistan commonly use a 12-hour clock with a.m. and p.m.',
					'Some common mistakes come from the 12-hour clock. 12:00 p.m. is noon, and 12:00 a.m. is midnight. So 12:30 a.m. is 00:30 and 1:00 p.m. is 13:00. The result from this calculator follows the format your device uses for times.'
				]
			},
			{
				heading: 'Working out hours for pay and schedules',
				paragraphs: [
					'For a shift, add up the time you worked for each part of the day, then convert the total to decimal hours if your pay rate is per hour. You can use the [time card calculator](/time-card-calculator) to total a full week, or the [hours calculator](/hours-calculator) to find the time between a start and an end time.',
					'Keep an eye on breaks. Subtract any unpaid break from your total before you multiply by an hourly rate. Rules for breaks and overtime vary by country and by employer, so check your contract.'
				]
			}
		],
		formulas: [
			{
				title: 'Convert everything to seconds',
				expression: 'total = days × 86,400 + hours × 3,600 + minutes × 60 + seconds',
				variables: [
					{ symbol: '86,400', meaning: 'seconds in one day (24 × 3,600)' },
					{ symbol: '3,600', meaning: 'seconds in one hour (60 × 60)' }
				]
			},
			{
				title: 'Convert back to hours, minutes and seconds',
				expression: 'hours = ⌊total ÷ 3,600⌋, minutes = ⌊remainder ÷ 60⌋, seconds = remainder mod 60',
				variables: [{ symbol: '⌊ ⌋', meaning: 'round down to a whole number' }]
			},
			{
				title: 'Decimal hours',
				expression: 'decimal hours = hours + minutes ÷ 60 + seconds ÷ 3,600',
				variables: []
			},
			{
				title: 'Adding time to a date',
				expression: 'end = start date and time + duration (as clock time)',
				variables: []
			}
		],
		example: {
			title: 'Add 2 h 45 min to 1 h 30 min 30 s',
			steps: [
				'2 h 45 min = 2 × 3,600 + 45 × 60 = 9,900 s',
				'1 h 30 min 30 s = 3,600 + 1,800 + 30 = 5,430 s',
				'Total = 9,900 + 5,430 = 15,330 s',
				'15,330 s = 4 h (14,400 s) + 15 min (900 s) + 30 s'
			],
			result: '4 hours, 15 minutes and 30 seconds (4:15:30).'
		},
		faq: [
			{
				q: 'How do I add hours and minutes?',
				a: 'Add the minutes together and the hours together. Every 60 minutes carries over as 1 hour. For example, 2:45 + 1:30 = 3:75, which is 4:15.'
			},
			{
				q: 'How do I convert minutes to decimal hours?',
				a: 'Divide the minutes by 60. 45 minutes is 0.75 hours, so 2 hours 45 minutes is 2.75 hours. The “Total hours” line shows this for you.'
			},
			{
				q: 'How do I subtract one time from another?',
				a: 'Choose Subtract and enter the smaller time second. If the answer is negative, the calculator shows a minus sign. To find the time between two clock times, such as 09:00 and 17:30, the [hours calculator](/hours-calculator) is quicker.'
			},
			{
				q: 'How do I add more than 24 hours?',
				a: 'Enter the extra time in the days or hours box. For example, 30 hours shows as 30:00:00 in the result and as “1 day, 6 hours” in words.'
			},
			{
				q: 'Does adding time to a date account for daylight saving?',
				a: 'No. It adds exact clock time, so 24 hours always lands on the same clock time the next day. On a daylight-saving change, the real elapsed time differs by an hour.'
			},
			{
				q: 'What is the difference between 12-hour and 24-hour time?',
				a: '12-hour time uses a.m. and p.m. 24-hour time runs from 00:00 to 23:59, so 1:00 p.m. is 13:00. Midnight is 00:00 in 24-hour time and 12:00 a.m. in 12-hour time.'
			}
		],
		sources: [
			{ title: 'ISO 8601 — Date and time format', url: 'https://www.iso.org/iso-8601-date-and-time-format.html' }
		]
	}
});
