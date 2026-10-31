import { defineCalculator, type CalculationResult, type InputValues } from '../types';
import { DASH } from '../format';
import meta from './hijri-date-converter.meta';

export const HIJRI_MONTHS = [
	'Muharram',
	'Safar',
	'Rabi al-Awwal',
	'Rabi al-Thani',
	'Jumada al-Ula',
	'Jumada al-Akhirah',
	'Rajab',
	'Shaban',
	'Ramadan',
	'Shawwal',
	'Dhu al-Qadah',
	'Dhu al-Hijjah'
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const GREG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY = 86_400_000;

export type HijriCalendar = 'islamic-umalqura' | 'islamic-civil';
export interface Hijri {
	y: number;
	m: number;
	d: number;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(cal: HijriCalendar): Intl.DateTimeFormat {
	let f = fmtCache.get(cal);
	if (!f) {
		f = new Intl.DateTimeFormat(`en-u-ca-${cal}-nu-latn`, { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
		fmtCache.set(cal, f);
	}
	return f;
}

/** Gregorian (UTC midnight, ms) → Hijri, using the ICU calendar data built into every modern browser. */
export function toHijri(ms: number, cal: HijriCalendar): Hijri {
	const parts = fmt(cal).formatToParts(new Date(ms));
	const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
	return { y: get('year'), m: get('month'), d: get('day') };
}

/** Hijri → Gregorian ms. Starts from the arithmetic (tabular) estimate and confirms with ICU. Null if the date doesn't exist. */
export function fromHijri(h: Hijri, cal: HijriCalendar): number | null {
	if (!Number.isInteger(h.y) || !Number.isInteger(h.m) || !Number.isInteger(h.d) || h.m < 1 || h.m > 12 || h.d < 1 || h.d > 30) return null;
	const jd = h.d + Math.ceil(29.5 * (h.m - 1)) + (h.y - 1) * 354 + Math.floor((3 + 11 * h.y) / 30) + 1948439.5 - 1;
	const guess = Math.round(jd - 2440587.5) * DAY;
	for (const off of [0, -1, 1, -2, 2, -3, 3]) {
		const ms = guess + off * DAY;
		const r = toHijri(ms, cal);
		if (r.y === h.y && r.m === h.m && r.d === h.d) return ms;
	}
	return null;
}

export function monthLength(y: number, m: number, cal: HijriCalendar): number {
	return fromHijri({ y, m, d: 30 }, cal) === null ? 29 : 30;
}

function parseIso(s: string): number | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (!m) return null;
	const ms = Date.UTC(+m[1], +m[2] - 1, +m[3]);
	const d = new Date(ms);
	return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? ms : null;
}

const gregText = (ms: number) => {
	const d = new Date(ms);
	return `${d.getUTCDate()} ${GREG_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const hijriText = (h: Hijri) => `${h.d} ${HIJRI_MONTHS[h.m - 1]} ${h.y} AH`;
function arabic(ms: number, cal: HijriCalendar): string {
	try {
		return new Intl.DateTimeFormat(`ar-SA-u-ca-${cal}`, { timeZone: 'UTC', dateStyle: 'full' }).format(new Date(ms));
	} catch {
		return DASH;
	}
}

// ICU's Umm al-Qura data covers 1300–1600 AH; keep well inside it.
const MIN_MS = Date.UTC(1937, 2, 14); // 1 Muharram 1356 (approx.)
const MAX_MS = Date.UTC(2076, 10, 26); // ~1500 AH
const toHijriMode = (v: InputValues) => v.mode === 'toHijri';
const toGregMode = (v: InputValues) => v.mode === 'toGregorian';

export default defineCalculator({
	meta,
	inputs: [
		{
			id: 'mode',
			label: 'Convert',
			type: 'select',
			display: 'segmented',
			default: 'toHijri',
			options: [
				{ label: 'Gregorian → Hijri', value: 'toHijri' },
				{ label: 'Hijri → Gregorian', value: 'toGregorian' }
			]
		},
		{ id: 'date', label: 'Gregorian date', type: 'date', default: 'today', visibleWhen: toHijriMode },
		{ id: 'hd', label: 'Day', type: 'number', default: 1, min: 1, max: 30, decimal: false, width: 'half', visibleWhen: toGregMode },
		{ id: 'hy', label: 'Year (AH)', type: 'number', default: 1448, min: 1356, max: 1500, decimal: false, width: 'half', visibleWhen: toGregMode },
		{
			id: 'hm',
			label: 'Month',
			type: 'select',
			display: 'menu',
			default: '9',
			options: HIJRI_MONTHS.map((name, i) => ({ label: `${i + 1}. ${name}`, value: String(i + 1) })),
			visibleWhen: toGregMode
		},
		{
			id: 'cal',
			label: 'Calendar',
			type: 'select',
			display: 'segmented',
			default: 'islamic-umalqura',
			options: [
				{ label: 'Umm al-Qura (Saudi)', value: 'islamic-umalqura' },
				{ label: 'Tabular (arithmetic)', value: 'islamic-civil' }
			]
		}
	],
	calculate(v): CalculationResult {
		const cal: HijriCalendar = v.cal === 'islamic-civil' ? 'islamic-civil' : 'islamic-umalqura';
		const toG = v.mode === 'toGregorian';
		const label = toG ? 'Gregorian date' : 'Hijri date';
		let ms: number | null;
		let h: Hijri;
		if (toG) {
			h = { y: Number(v.hy), m: Number(v.hm), d: Number(v.hd) };
			ms = h.y >= 1356 && h.y <= 1500 ? fromHijri(h, cal) : null;
			if (ms === null) {
				const ok = Number.isInteger(h.y) && h.y >= 1356 && h.y <= 1500 && h.m >= 1 && h.m <= 12;
				return {
					primaryResult: DASH,
					primaryLabel: label,
					summary: ok && h.d === 30 ? `${HIJRI_MONTHS[h.m - 1]} ${h.y} has only 29 days in this calendar.` : 'Enter a Hijri date between 1356 and 1500 AH.'
				};
			}
		} else {
			ms = parseIso(String(v.date));
			if (ms === null || ms < MIN_MS || ms > MAX_MS) {
				return { primaryResult: DASH, primaryLabel: label, summary: 'Enter a date between 1937 and 2076.' };
			}
			h = toHijri(ms, cal);
		}
		const weekday = WEEKDAYS[new Date(ms).getUTCDay()];
		return {
			primaryResult: toG ? gregText(ms) : hijriText(h),
			primaryLabel: label,
			summary: `${weekday}, ${toG ? hijriText(h) : gregText(ms)}.`,
			secondaryMetrics: [
				{ label: 'Weekday', value: weekday },
				{ label: 'In Arabic', value: arabic(ms, cal) },
				{ label: 'Days in this Hijri month', value: String(monthLength(h.y, h.m, cal)) },
				{ label: 'ISO date', value: new Date(ms).toISOString().slice(0, 10) }
			]
		};
	},
	content: {
		intro:
			'Convert dates between the Gregorian calendar and the Hijri (Islamic lunar) calendar, in either direction. Choose the Umm al-Qura calendar, used for civil dates in Saudi Arabia, or the tabular calendar, which is a fixed arithmetic rule.',
		howTo: [
			'Choose the direction: Gregorian to Hijri, or Hijri to Gregorian.',
			'Enter the date. For a Hijri date, enter the day, the year in AH and the month.',
			'Pick the calendar. Umm al-Qura is the default.',
			'Read the converted date, the weekday and the date written in Arabic.'
		],
		about: [
			{
				heading: 'What the Hijri calendar is',
				paragraphs: [
					'The Hijri calendar is a lunar calendar. Each month begins with the new moon, so a month has 29 or 30 days. Twelve months make a year of about 354 or 355 days. Year 1 AH is counted from the Hijra, the migration of the Prophet Muhammad from Mecca to Medina in 622 CE.',
					'Muslims use the Hijri calendar to mark festivals such as Eid, the month of fasting in Ramadan and the Hajj pilgrimage. Because the Hijri year is shorter, Hijri dates move earlier through the Gregorian year. Ramadan, for example, falls about 11 days earlier each year. It takes around 33 years for Ramadan to pass through every season.'
				]
			},
			{
				heading: 'Umm al-Qura and tabular calendars',
				paragraphs: [
					'The Umm al-Qura calendar is based on astronomical rules. Saudi Arabia uses it for civil dates. The tabular calendar uses a fixed 30-year cycle with 11 leap years. It is simpler, and many software tools use it, but it can differ from the official moon-based dates by a day.',
					'The two calendars often agree, but not always. For 28 October 2026, Umm al-Qura gives 17 Jumada al-Ula 1448 AH and the tabular calendar gives 16 Jumada al-Ula 1448 AH.'
				],
				table: {
					caption: 'Two calendars compared',
					columns: ['', 'Umm al-Qura', 'Tabular'],
					rows: [
						['Basis', 'Astronomical rules', 'Fixed 30-year arithmetic cycle'],
						['Main use', 'Civil dates in Saudi Arabia', 'Calculations and many software tools'],
						['28 October 2026', '17 Jumada al-Ula 1448 AH', '16 Jumada al-Ula 1448 AH']
					]
				}
			},
			{
				heading: 'Why local dates can differ',
				paragraphs: [
					'Many Muslim communities confirm the start of each month by sighting the new crescent moon. In countries such as Pakistan, India and Bangladesh, local sighting often decides the date. Because of this, a local Hijri date can be one day, or sometimes two, different from a calendar date.',
					'For religious observances such as Ramadan and Eid, check the date announced by your local authority or mosque. Use the calculator to plan ahead, not to set the official date. If the date really matters to you, ask a trusted local source first.'
				]
			},
			{
				heading: 'Reading the result',
				paragraphs: [
					'The result shows the Hijri day, month and year, with AH after the year. AH stands for “Anno Hegirae”, the Latin name for the year of the Hijra. The Arabic line shows the same date in Arabic script. Check the weekday too, so your prayer, meeting or family event falls on the day you expect. The [day of the week calculator](/day-of-the-week-calculator) works for any Gregorian date.',
					'The “Days in this Hijri month” line tells you whether the month has 29 or 30 days. If you enter the 30th of a month that only has 29 days, the calculator says so. For planning, you can also compare the date with the [date calculator](/date-calculator) or the [day counter](/day-counter).'
				]
			}
		],
		formulas: [
			{
				title: 'Calendars',
				expression: 'Umm al-Qura: astronomical rules used for Saudi civil dates. Tabular: a 30-year cycle of 354- and 355-day years.',
				variables: [{ symbol: 'Month', meaning: '29 or 30 days, starting with the new crescent moon' }]
			},
			{
				title: 'Tabular year length',
				expression: 'Year length = 354 days, plus 1 day in each leap year of the 30-year cycle',
				variables: [{ symbol: '11', meaning: 'leap years in every 30-year cycle, which have 355 days' }]
			}
		],
		example: {
			title: 'Converting 28 October 2026',
			steps: [
				'The calculator reads the date 28 October 2026 and checks it against the Umm al-Qura data.',
				'Umm al-Qura: 28 October 2026 is 17 Jumada al-Ula 1448 AH.',
				'Tabular: the same date is 16 Jumada al-Ula 1448 AH, one day earlier.',
				'The weekday is Wednesday in both calendars, because weekdays follow the Gregorian week.'
			],
			result: '28 October 2026 = Wednesday, 17 Jumada al-Ula 1448 AH (Umm al-Qura).'
		},
		faq: [
			{
				q: 'Why does my local Islamic date differ by a day?',
				a: 'Many countries, including Pakistan, India and Bangladesh, often start each month by local moon sighting. Their dates can be one (sometimes two) days different from the Umm al-Qura calendar.'
			},
			{
				q: 'Which calendar does Saudi Arabia use?',
				a: 'Saudi Arabia uses the Umm al-Qura calendar for civil dates. Many people confirm religious dates such as the start of Ramadan and Eid by moon sighting, so check the local announcement.'
			},
			{
				q: 'How long is a Hijri year?',
				a: 'About 354 or 355 days, roughly 11 days shorter than a Gregorian year. Islamic dates therefore move earlier each Gregorian year.'
			},
			{
				q: 'What is the difference between Hijri and Islamic calendar?',
				a: 'The two names usually mean the same calendar. “Hijri” comes from the Hijra, and “Islamic calendar” is the name used more widely in English and in software.'
			},
			{
				q: 'What dates can I convert?',
				a: 'Gregorian dates from 1937 to 2076, and Hijri years from 1356 to 1500 AH. Outside those ranges, the calculator does not show a result.'
			}
		],
		sources: [
			{ title: 'Wikipedia — Tabular Islamic calendar', url: 'https://en.wikipedia.org/wiki/Tabular_Islamic_calendar' }
		]
	}
});
