import { limitIra, ROTH_PHASEOUT } from './us-retirement';

/** Grow a balance with yearly contributions (made through the year: half a year of growth). */
export function growIra(start: number, yearly: (age: number) => number, age: number, retire: number, r: number) {
	let balance = start;
	let put = 0;
	for (let a = age; a < retire; a++) {
		const c = yearly(a);
		balance = balance * (1 + r) + c * (1 + r / 2);
		put += c;
	}
	return { balance, put };
}

/**
 * IRS Roth IRA reduced limit (Pub. 590-A worksheet): reduce the limit in proportion to how far
 * MAGI is into the phase-out range, round UP to the next $10, and allow at least $200 if any.
 */
export function rothAllowed(status: string, magi: number, age: number): number {
	const limit = limitIra(age);
	const p = ROTH_PHASEOUT[status];
	if (!p) return NaN;
	if (magi <= p.from) return limit;
	if (magi >= p.to) return 0;
	const reduced = limit - (limit * (magi - p.from)) / (p.to - p.from);
	const rounded = Math.ceil(reduced / 10) * 10;
	return Math.max(200, Math.min(limit, rounded));
}
