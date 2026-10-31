import { defineCalculator, type CalculationResult, type InputValues, type Table } from '../types';
import { DASH, num } from '../format';
import meta from './time-zone-calculator.meta';

const DAY_MS = 86_400_000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Friendly city names for the IANA zones in the menus. */
const ZONES: { zone: string; city: string }[] = [
	{ zone: 'America/New_York', city: 'New York' },
	{ zone: 'America/Chicago', city: 'Chicago' },
	{ zone: 'America/Denver', city: 'Denver' },
	{ zone: 'America/Phoenix', city: 'Phoenix' },
	{ zone: 'America/Los_Angeles', city: 'Los Angeles' },
	{ zone: 'America/Anchorage', city: 'Anchorage' },
	{ zone: 'Pacific/Honolulu', city: 'Honolulu' },
	{ zone: 'America/Halifax', city: 'Halifax' },
	{ zone: 'America/St_Johns', city: "St. John's" },
	{ zone: 'America/Mexico_City', city: 'Mexico City' },
	{ zone: 'America/Bogota', city: 'Bogota' },
	{ zone: 'America/Lima', city: 'Lima' },
	{ zone: 'America/Sao_Paulo', city: 'Sao Paulo' },
	{ zone: 'America/Argentina/Buenos_Aires', city: 'Buenos Aires' },
	{ zone: 'UTC', city: 'UTC' },
	{ zone: 'Europe/London', city: 'London' },
	{ zone: 'Europe/Dublin', city: 'Dublin' },
	{ zone: 'Europe/Lisbon', city: 'Lisbon' },
	{ zone: 'Europe/Paris', city: 'Paris' },
	{ zone: 'Europe/Berlin', city: 'Berlin' },
	{ zone: 'Europe/Madrid', city: 'Madrid' },
	{ zone: 'Europe/Rome', city: 'Rome' },
	{ zone: 'Europe/Amsterdam', city: 'Amsterdam' },
	{ zone: 'Europe/Stockholm', city: 'Stockholm' },
	{ zone: 'Europe/Athens', city: 'Athens' },
	{ zone: 'Europe/Helsinki', city: 'Helsinki' },
	{ zone: 'Europe/Istanbul', city: 'Istanbul' },
	{ zone: 'Europe/Moscow', city: 'Moscow' },
	{ zone: 'Africa/Cairo', city: 'Cairo' },
	{ zone: 'Africa/Lagos', city: 'Lagos' },
	{ zone: 'Africa/Nairobi', city: 'Nairobi' },
	{ zone: 'Africa/Johannesburg', city: 'Johannesburg' },
	{ zone: 'Asia/Dubai', city: 'Dubai' },
	{ zone: 'Asia/Karachi', city: 'Karachi' },
	{ zone: 'Asia/Kolkata', city: 'Kolkata' },
	{ zone: 'Asia/Dhaka', city: 'Dhaka' },
	{ zone: 'Asia/Bangkok', city: 'Bangkok' },
	{ zone: 'Asia/Singapore', city: 'Singapore' },
	{ zone: 'Asia/Hong_Kong', city: 'Hong Kong' },
	{ zone: 'Asia/Shanghai', city: 'Shanghai' },
	{ zone: 'Asia/Tokyo', city: 'Tokyo' },
	{ zone: 'Asia/Seoul', city: 'Seoul' },
	{ zone: 'Australia/Perth', city: 'Perth' },
	{ zone: 'Australia/Sydney', city: 'Sydney' },
	{ zone: 'Pacific/Auckland', city: 'Auckland' }
];

/** Cities used for the comparison table. */
const POPULAR = [
	'America/New_York',
	'America/Los_Angeles',
	'Europe/London',
	'Europe/Paris',
	'Asia/Dubai',
	'Asia/Kolkata',
	'Asia/Singapore',
	'Asia/Tokyo'
];

const ZONE_VALUES = new Set(ZONES.map((z) => z.zone));
const cityOf = (zone: string) => ZONES.find((z) => z.zone === zone)?.city ?? zone;
const pad = (n: number) => String(n).padStart(2, '0');

interface Wall {
	y: number;
	mo: number;
	d: number;
	h: number;
	mi: number;
	s: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** The wall-clock fields a zone shows at an instant, read from the browser's IANA data. */
function wallAt(zone: string, ms: number): Wall {
	let f = formatters.get(zone);
	if (!f) {
		f = new Intl.DateTimeFormat('en-US', {
			timeZone: zone,
			hourCycle: 'h23',
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric'
		});
		formatters.set(zone, f);
	}
	const o: Partial<Record<string, number>> = {};
	for (const p of f.formatToParts(new Date(ms))) {
		if (p.type !== 'literal') o[p.type] = Number(p.value);
	}
	return { y: o.year ?? 0, mo: o.month ?? 0, d: o.day ?? 0, h: (o.hour ?? 0) % 24, mi: o.minute ?? 0, s: o.second ?? 0 };
}

/** UTC offset in ms at an instant: wall-clock time in the zone minus UTC. */
export function offsetMs(zone: string, ms: number): number {
	const w = wallAt(zone, ms);
	return Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s) - Math.floor(ms / 1000) * 1000;
}

const sameMinute = (a: Wall, b: Wall) => a.y === b.y && a.mo === b.mo && a.d === b.d && a.h === b.h && a.mi === b.mi;

export type Resolution = { ms: number; kind: 'exact' | 'ambiguous' | 'missing' };

/**
 * Find the UTC instant at which a zone shows the given wall-clock time.
 * Iterates guess = Date.UTC(parts) − offset(guess) twice. Around daylight-saving changes the
 * time can happen twice (clocks fall back) or not at all (clocks jump forward); both are reported.
 */
export function resolveWallTime(zone: string, y: number, mo: number, d: number, h: number, mi: number): Resolution {
	const wall = Date.UTC(y, mo - 1, d, h, mi);
	let guess = wall - offsetMs(zone, wall);
	guess = wall - offsetMs(zone, guess);
	const offBefore = offsetMs(zone, wall - DAY_MS);
	const offAfter = offsetMs(zone, wall + DAY_MS);
	const target: Wall = { y, mo, d, h, mi, s: 0 };
	const candidates = [...new Set([guess, wall - offBefore, wall - offAfter])].filter((ms) =>
		sameMinute(wallAt(zone, ms), target)
	);
	if (candidates.length === 0) return { ms: wall - offBefore, kind: 'missing' };
	if (candidates.length > 1) return { ms: Math.min(...candidates), kind: 'ambiguous' };
	return { ms: candidates[0], kind: 'exact' };
}

function fmtOffset(ms: number): string {
	const mins = Math.round(ms / 60000);
	const abs = Math.abs(mins);
	return `UTC${mins < 0 ? '−' : '+'}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

function hoursText(x: number): string {
	return `${num(x, 2)} ${x === 1 ? 'hour' : 'hours'}`;
}

function weekdayOf(w: Wall): number {
	return new Date(Date.UTC(w.y, w.mo - 1, w.d)).getUTCDay();
}

export default defineCalculator({
	meta,
	inputs: [
		{ id: 'date', label: 'Date', type: 'date', default: 'today' },
		{ id: 'time', label: 'Time (24-hour)', type: 'time', default: '09:00' },
		{
			id: 'from',
			label: 'From time zone',
			type: 'select',
			default: 'America/New_York',
			options: ZONES.map((z) => ({ label: z.zone === 'UTC' ? 'UTC' : `${z.city} (${z.zone})`, value: z.zone }))
		},
		{
			id: 'to',
			label: 'To time zone',
			type: 'select',
			default: 'Europe/London',
			options: ZONES.map((z) => ({ label: z.zone === 'UTC' ? 'UTC' : `${z.city} (${z.zone})`, value: z.zone }))
		}
	],
	calculate(v: InputValues): CalculationResult {
		const fail = (summary: string): CalculationResult => ({
			primaryResult: DASH,
			primaryLabel: 'Converted time',
			summary
		});

		const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v.date));
		const t = /^(\d{2}):(\d{2})$/.exec(String(v.time));
		const from = String(v.from);
		const to = String(v.to);
		if (!m || !t) return fail('Enter a date and a time in 24-hour format.');
		if (!ZONE_VALUES.has(from) || !ZONE_VALUES.has(to)) return fail('Pick both time zones from the lists.');

		const y = Number(m[1]);
		const mo = Number(m[2]);
		const d = Number(m[3]);
		const h = Number(t[1]);
		const mi = Number(t[2]);
		const calendarDay = new Date(Date.UTC(y, mo - 1, d)).getUTCDate();
		if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || calendarDay !== d || h > 23 || mi > 59) {
			return fail('Enter a real date and time.');
		}

		const res = resolveWallTime(from, y, mo, d, h, mi);
		const instant = res.ms;
		const fromOff = offsetMs(from, instant);
		const toOff = offsetMs(to, instant);
		const there = wallAt(to, instant);
		const thereTime = `${pad(there.h)}:${pad(there.mi)}`;
		const dateText = `${DAYS[weekdayOf(there)]}, ${MONTHS[there.mo - 1]} ${there.d}, ${there.y}`;
		const timeText = `${pad(h)}:${pad(mi)}`;
		const fromCity = cityOf(from);
		const toCity = cityOf(to);

		const diffMin = Math.round((toOff - fromOff) / 60000);
		const diffText =
			diffMin === 0
				? 'Same UTC offset'
				: `${toCity} is ${hoursText(Math.abs(diffMin) / 60)} ${diffMin > 0 ? 'ahead of' : 'behind'} ${fromCity}`;

		let summary = `${dateText} at ${thereTime} in ${toCity}.`;
		if (res.kind === 'missing') {
			const fromLocal = wallAt(from, instant);
			summary = `${timeText} does not exist in ${fromCity} on this date because clocks jump forward, so it is read as ${pad(fromLocal.h)}:${pad(fromLocal.mi)} after the change. ${dateText} at ${thereTime} in ${toCity}.`;
		} else if (res.kind === 'ambiguous') {
			summary = `${timeText} happens twice in ${fromCity} on this date because clocks fall back, so the first occurrence is used. ${dateText} at ${thereTime} in ${toCity}.`;
		}

		const table: Table = {
			title: 'The same moment in other cities',
			columns: [
				{ key: 'city', label: 'City' },
				{ key: 'time', label: 'Local time', align: 'end' },
				{ key: 'date', label: 'Date' },
				{ key: 'offset', label: 'UTC offset', align: 'end' }
			],
			rows: POPULAR.map((zone) => {
				const w = wallAt(zone, instant);
				return {
					city: cityOf(zone),
					time: `${pad(w.h)}:${pad(w.mi)}`,
					date: `${DAYS[weekdayOf(w)].slice(0, 3)} ${MONTHS[w.mo - 1].slice(0, 3)} ${w.d}`,
					offset: fmtOffset(offsetMs(zone, instant))
				};
			})
		};

		return {
			primaryResult: thereTime,
			primaryLabel: `Time in ${toCity}`,
			summary,
			secondaryMetrics: [
				{ label: 'Date there', value: dateText },
				{ label: `${fromCity} offset (from)`, value: fmtOffset(fromOff) },
				{ label: `${toCity} offset (to)`, value: fmtOffset(toOff) },
				{ label: 'Time difference', value: diffText },
				{ label: 'Same moment in UTC', value: `${new Date(instant).toISOString().slice(0, 16).replace('T', ' ')} UTC` }
			],
			table
		};
	},
	content: {
		intro:
			'Convert a date and time from one time zone to another, such as New York to London or Dubai to Tokyo. The calculator uses the daylight-saving rules for each city on the date you pick, so summer and winter times are handled for you.',
		howTo: [
			'Enter the date and the 24-hour time in the first time zone.',
			'Choose the time zone the time is in, and the time zone you want to convert it to.',
			'Read the converted time, then check the UTC offsets and the time difference.',
			'Use the table to see the same moment in other popular cities.'
		],
		about: [
			{
				heading: 'What a time zone is',
				paragraphs: [
					'A time zone is a region that uses the same clock time. Each zone is measured as an offset from UTC, Coordinated Universal Time. For example, New York is UTC−5 in winter, which means its clock is 5 hours behind UTC.',
					'Most offsets are whole hours, but not all. India is UTC+5:30, and Nepal is UTC+5:45. So the gap to a city in India is not always a round number of hours.'
				]
			},
			{
				heading: 'Daylight saving time changes the gap',
				paragraphs: [
					'Many countries move their clocks forward in summer and back in winter. This is called daylight saving time, or summer time. The United States and Canada change clocks in March and November. Most of Europe changes in March and October.',
					'Other places keep the same time all year. Japan, China, India and the United Arab Emirates do not use daylight saving time. As a result, the time gap between two cities can be one hour bigger or smaller for part of the year.'
				],
				table: {
					caption: 'Example offsets in winter and summer',
					columns: ['City', 'Winter offset', 'Summer offset'],
					rows: [
						['New York', 'UTC−5', 'UTC−4'],
						['London', 'UTC+0', 'UTC+1'],
						['Dubai', 'UTC+4', 'UTC+4'],
						['Kolkata', 'UTC+5:30', 'UTC+5:30'],
						['Tokyo', 'UTC+9', 'UTC+9']
					]
				}
			},
			{
				heading: 'Planning meetings across borders',
				paragraphs: [
					'Pick a time that falls inside working hours for both people. Check the date on each side, too. A call at 11:00 PM in one city can be the next day in another.',
					'Share the time with its zone, such as “14:00 London time”, rather than just the number. If you need the same moment for everyone, the “Same moment in UTC” line works well in an invitation.'
				],
				list: [
					'Send invitations in your own time zone and in the other person’s time zone.',
					'Avoid times that fall in a daylight-saving change week, when offsets are about to shift.',
					'For a remote team, record shift times with the [time card calculator](/time-card-calculator).'
				]
			},
			{
				heading: 'Missing and repeated times',
				paragraphs: [
					'On the day clocks move forward, one hour of local time never happens. For example, 02:30 may not exist. On the day clocks move back, one hour happens twice, so 01:30 can occur at two different moments.',
					'The calculator checks for both cases. It explains which time it used, so you can choose a different time if the result matters.'
				]
			},
			{
				heading: 'Adding time after a conversion',
				paragraphs: [
					'Once you have the converted time, you may need to add a duration to it. The [time calculator](/time-calculator) adds hours and minutes to a start time. For the number of hours between two clock times in the same zone, the [hours calculator](/hours-calculator) is quicker.'
				]
			}
		],
		formulas: [
			{
				title: 'Local time to UTC',
				expression: 'UTC time = local time − UTC offset',
				variables: [{ symbol: 'UTC offset', meaning: 'How far the zone is ahead of (+) or behind (−) UTC on that date' }]
			},
			{
				title: 'UTC to another zone',
				expression: 'local time in the target zone = UTC time + target UTC offset',
				variables: []
			},
			{
				title: 'Time difference',
				expression: 'difference = target UTC offset − source UTC offset',
				variables: []
			}
		],
		example: {
			title: 'New York to London on 15 July 2026',
			steps: [
				'New York is on daylight time on 15 July, so its offset is UTC−4 hours.',
				'09:00 in New York + 4 hours = 13:00 UTC.',
				'London is on British Summer Time on that date, so its offset is UTC+1 hour.',
				'13:00 UTC + 1 hour = 14:00 in London.'
			],
			result: '09:00 in New York is 14:00 in London on Wednesday, 15 July 2026. London is 5 hours ahead.'
		},
		faq: [
			{
				q: 'Why does the time difference change during the year?',
				a: 'Many places start and stop daylight saving time on different dates, and some do not use it at all. The gap between two cities can be an hour more or less for part of the year.'
			},
			{
				q: 'What does a missing or repeated time mean?',
				a: 'When clocks jump forward, one hour of local time never happens, so an input time inside that gap has no match. When clocks fall back, one hour happens twice. The calculator flags both cases and explains which time it used.'
			},
			{
				q: 'What is UTC?',
				a: 'UTC is Coordinated Universal Time, the reference time that all time zones are measured from. An offset such as UTC+5:30 means the local clock is 5 hours and 30 minutes ahead of UTC.'
			},
			{
				q: 'Can time zone rules change?',
				a: 'Yes. Governments sometimes change their clock rules, often at short notice. The calculator uses the time zone data built into your browser, so very recent changes depend on the browser being up to date.'
			}
		],
		sources: [{ title: 'IANA — Time zone database', url: 'https://www.iana.org/time-zones' }]
	}
});
