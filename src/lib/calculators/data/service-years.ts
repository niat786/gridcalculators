/** Length of service between two dates (both days counted), as whole calendar years plus a pro-rata fraction. */
export function parseISO(s: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (!m) return null;
	const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
	return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
}

const DAY = 86_400_000;

/**
 * Years of service from `start` to `end` inclusive (the last day worked counts).
 * Whole anniversaries first, then the remaining days divided by the length of that anniversary year.
 * Returns calendar days too. Null when end is before start.
 */
export function serviceYears(start: Date, end: Date): { years: number; calendarDays: number } | null {
	if (end < start) return null;
	const endExclusive = new Date(end.getTime() + DAY);
	const calendarDays = Math.round((endExclusive.getTime() - start.getTime()) / DAY);
	const anniv = (k: number) => new Date(Date.UTC(start.getUTCFullYear() + k, start.getUTCMonth(), start.getUTCDate()));
	let whole = 0;
	while (anniv(whole + 1) <= endExclusive && whole < 200) whole++;
	const from = anniv(whole);
	const len = Math.round((anniv(whole + 1).getTime() - from.getTime()) / DAY);
	const rest = Math.round((endExclusive.getTime() - from.getTime()) / DAY);
	return { years: whole + rest / len, calendarDays };
}

/** "6 years, 4 months" style label from fractional years (months rounded). */
export function yearsLabel(y: number): string {
	const totalMonths = Math.round(y * 12);
	const yr = Math.floor(totalMonths / 12);
	const mo = totalMonths % 12;
	const a = `${yr} ${yr === 1 ? 'year' : 'years'}`;
	return mo === 0 ? a : `${a}, ${mo} ${mo === 1 ? 'month' : 'months'}`;
}
