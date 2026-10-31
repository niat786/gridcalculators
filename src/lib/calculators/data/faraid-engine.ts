/**
 * Faraid engine: splits an estate (as shares of 1) among the heirs supported by the calculator, by the Hanafi rules in
 * ./faraid.ts. Pure and exact (integer fractions). It returns `ok: false` for every combination it cannot resolve with
 * confidence, so the caller never shows a guessed split.
 */
import {
	FARAID_MALE_UNITS,
	FARAID_FEMALE_UNITS,
	FARAID_MAX_COUNT,
	FARAID_MAX_WIVES,
	FARAID_SHARES,
	FARAID_SIBLINGS_REDUCE_MOTHER,
	type Fraction
} from './faraid';

// ---------- exact fractions ----------
type F = [number, number];
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export const frac = (n: number, d = 1): F => {
	const g = gcd(n, d) || 1;
	return [n / g, d / g];
};
const fromTuple = (f: Fraction): F => frac(f[0], f[1]);
const add = (a: F, b: F): F => frac(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const sub = (a: F, b: F): F => frac(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const mul = (a: F, b: F): F => frac(a[0] * b[0], a[1] * b[1]);
const div = (a: F, b: F): F => frac(a[0] * b[1], a[1] * b[0]);
const cmp = (a: F, b: F): number => a[0] * b[1] - b[0] * a[1];
const ZERO: F = [0, 1];
const ONE: F = [1, 1];
const sum = (xs: F[]): F => xs.reduce(add, ZERO);
export const fracToNumber = (f: readonly [number, number]): number => f[0] / f[1];
export const fracToString = (f: readonly [number, number]): string => (f[0] === 0 ? '0' : f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`);

// ---------- types ----------
export interface Heirs {
	/** true when the person who died is a woman (she can leave a husband), false for a man (he can leave wives). */
	deceasedIsWoman: boolean;
	husband: boolean;
	wives: number;
	sons: number;
	daughters: number;
	father: boolean;
	mother: boolean;
	grandfather: boolean;
	brothers: number;
	sisters: number;
	/** Anyone else who might inherit (grandchildren through a son, half-siblings, uncles, nephews, maternal relatives…). */
	others: boolean;
}

export type HeirKey = 'husband' | 'wives' | 'sons' | 'daughters' | 'father' | 'mother' | 'grandfather' | 'brothers' | 'sisters';

export interface Line {
	key: HeirKey;
	label: string;
	count: number;
	/** Share of the whole estate for the whole group (all wives together, all sons together…). 0 for blocked heirs. */
	share: [number, number];
	blocked: boolean;
	why: string;
}

export interface Outcome {
	ok: true;
	lines: Line[];
	/** The Umariyyatan rule was used for the mother. */
	umariyyatan: boolean;
	/** The fixed shares added up to more than the estate and were reduced in proportion (ʿawl). Holds the total before. */
	awl: [number, number] | null;
	/** Surplus was returned to the fixed-share heirs other than the spouse (radd). */
	radd: boolean;
}

export interface Unsupported {
	ok: false;
	reason: string;
}

const SCHOLAR = 'Please ask a qualified scholar or the court.';
const unsupported = (reason: string): Unsupported => ({ ok: false, reason: `${reason} ${SCHOLAR}` });

/** Names for the plural/singular form of a group. */
const LABELS: Record<HeirKey, [string, string]> = {
	husband: ['Husband', 'Husband'],
	wives: ['Wife', 'Wives'],
	sons: ['Son', 'Sons'],
	daughters: ['Daughter', 'Daughters'],
	father: ['Father', 'Father'],
	mother: ['Mother', 'Mother'],
	grandfather: ['Paternal grandfather', 'Paternal grandfather'],
	brothers: ['Full brother', 'Full brothers'],
	sisters: ['Full sister', 'Full sisters']
};

const isCount = (n: number, max: number) => Number.isInteger(n) && n >= 0 && n <= max;

export function distribute(h: Heirs): Outcome | Unsupported {
	if (h.others) {
		return unsupported('Other relatives who may inherit (grandchildren through a son, half-siblings, uncles, nephews, maternal relatives and so on) change the split in ways this tool does not cover.');
	}
	if (!isCount(h.wives, FARAID_MAX_WIVES) || !isCount(h.sons, FARAID_MAX_COUNT) || !isCount(h.daughters, FARAID_MAX_COUNT) || !isCount(h.brothers, FARAID_MAX_COUNT) || !isCount(h.sisters, FARAID_MAX_COUNT)) {
		return unsupported('The numbers of heirs must be whole numbers (up to 4 wives).');
	}

	// A man leaves wives, a woman leaves a husband.
	const husband = h.deceasedIsWoman && h.husband;
	const wives = h.deceasedIsWoman ? 0 : h.wives;
	const { sons, daughters, brothers, sisters } = h;
	const father = h.father;
	const mother = h.mother;
	const grandfatherPresent = h.grandfather;
	const spouse = husband || wives > 0;
	const hasChild = sons + daughters > 0;
	const sibs = brothers + sisters;

	if (!(husband || wives > 0 || sons || daughters || father || mother || grandfatherPresent || brothers || sisters)) {
		return unsupported('No heir has been entered. With no heirs the estate passes by other rules (distant kin or the state).');
	}

	// ---------- exclusion (hajb) ----------
	const gfActive = grandfatherPresent && !father; // the father blocks the grandfather
	const fatherLike = father || gfActive; // a male ascendant who takes the father's place
	const sibsBlocked = sons > 0 || fatherLike; // sons, father and (Hanafi) grandfather block full siblings
	const blockedWhy = sons > 0 ? 'Blocked by the sons' : father ? 'Blocked by the father' : 'Blocked by the grandfather (Hanafi view)';

	// ---------- cases this tool will not guess ----------
	const umarConditions = spouse && mother && !hasChild && sibs < FARAID_SIBLINGS_REDUCE_MOTHER;
	if (umarConditions && gfActive) {
		return unsupported('A spouse, the mother and the paternal grandfather (no father, no children) is a disputed case: the mother’s share depends on whether the grandfather is treated like the father.');
	}
	if (umarConditions && father && sibs === 1) {
		return unsupported('A spouse, both parents and exactly one brother or sister is a case where scholars apply the Umariyyatan rule differently.');
	}

	// ---------- fixed shares ----------
	interface Work {
		key: HeirKey;
		count: number;
		fixed: F; // fixed share before awl/radd
		residuary: boolean;
		why: string;
		blocked: boolean;
	}
	const work: Work[] = [];
	const push = (key: HeirKey, count: number, fixed: F, why: string, residuary = false, blocked = false) => work.push({ key, count, fixed, residuary, why, blocked });

	let umariyyatan = false;
	let spouseShare = ZERO;

	if (husband) {
		const s = fromTuple(hasChild ? FARAID_SHARES.husbandChild : FARAID_SHARES.husbandNoChild);
		spouseShare = s;
		push('husband', 1, s, hasChild ? 'One quarter: there are children' : 'One half: no children');
	}
	if (wives > 0) {
		const s = fromTuple(hasChild ? FARAID_SHARES.wivesChild : FARAID_SHARES.wivesNoChild);
		spouseShare = s;
		push('wives', wives, s, hasChild ? `One eighth${wives > 1 ? ', shared equally' : ''}: there are children` : `One quarter${wives > 1 ? ', shared equally' : ''}: no children`);
	}
	if (mother) {
		if (umarConditions && father) {
			umariyyatan = true;
			push('mother', 1, mul(fromTuple(FARAID_SHARES.motherOfRemainder), sub(ONE, spouseShare)), 'One third of what is left after the spouse (Umariyyatan, with the father)');
		} else if (hasChild) {
			push('mother', 1, fromTuple(FARAID_SHARES.motherReduced), 'One sixth: there are children');
		} else if (sibs >= FARAID_SIBLINGS_REDUCE_MOTHER) {
			push('mother', 1, fromTuple(FARAID_SHARES.motherReduced), 'One sixth: two or more brothers and sisters (even when blocked)');
		} else {
			push('mother', 1, fromTuple(FARAID_SHARES.motherFull), 'One third: no children and fewer than two brothers and sisters');
		}
	}
	if (father) {
		if (sons > 0) push('father', 1, fromTuple(FARAID_SHARES.fatherWithChild), 'One sixth: there are sons');
		else if (daughters > 0) push('father', 1, fromTuple(FARAID_SHARES.fatherWithChild), 'One sixth plus the remainder: there are only daughters', true);
		else push('father', 1, ZERO, 'The remainder', true);
	}
	if (grandfatherPresent) {
		if (!gfActive) push('grandfather', 1, ZERO, 'Blocked by the father', false, true);
		else if (sons > 0) push('grandfather', 1, fromTuple(FARAID_SHARES.fatherWithChild), 'Takes the father’s place: one sixth, there are sons');
		else if (daughters > 0) push('grandfather', 1, fromTuple(FARAID_SHARES.fatherWithChild), 'Takes the father’s place: one sixth plus the remainder', true);
		else push('grandfather', 1, ZERO, 'Takes the father’s place: the remainder', true);
	}
	if (daughters > 0) {
		if (sons > 0) push('daughters', daughters, ZERO, 'Share the remainder with the sons: a son gets twice a daughter', true);
		else if (daughters === 1) push('daughters', 1, fromTuple(FARAID_SHARES.daughterOne), 'One half: the only daughter');
		else push('daughters', daughters, fromTuple(FARAID_SHARES.daughtersMany), 'Two thirds together: two or more daughters, no sons');
	}
	if (sons > 0) push('sons', sons, ZERO, daughters > 0 ? 'Remainder: a son gets twice a daughter' : 'The remainder, shared equally', true);

	// Full brothers and sisters
	const sisterFixed = !hasChild && !fatherLike && brothers === 0 && sisters > 0;
	const sisterWithDaughters = daughters > 0 && sons === 0 && !fatherLike && brothers === 0 && sisters > 0;
	if (brothers > 0) {
		if (sibsBlocked) push('brothers', brothers, ZERO, blockedWhy, false, true);
		else push('brothers', brothers, ZERO, sisters > 0 ? 'Remainder: a brother gets twice a sister' : 'The remainder, shared equally', true);
	}
	if (sisters > 0) {
		if (sibsBlocked) push('sisters', sisters, ZERO, blockedWhy, false, true);
		else if (brothers > 0) push('sisters', sisters, ZERO, 'Share the remainder with the brothers: a brother gets twice a sister', true);
		else if (sisterWithDaughters) push('sisters', sisters, ZERO, 'Take the remainder after the daughters’ share (residuary with daughters)', true);
		else if (sisterFixed) {
			if (sisters === 1) push('sisters', 1, fromTuple(FARAID_SHARES.sisterOne), 'One half: the only sister, no children, father or grandfather');
			else push('sisters', sisters, fromTuple(FARAID_SHARES.sistersMany), 'Two thirds together: two or more sisters, no children, father or grandfather');
		} else {
			return unsupported('This combination of brothers, sisters and children is not covered.');
		}
	}

	// ---------- add up: ʿawl, residue, radd ----------
	const fixedTotal = sum(work.map((w) => w.fixed));
	const finalShare = new Map<HeirKey, F>();
	let awl: F | null = null;
	let radd = false;

	if (cmp(fixedTotal, ONE) > 0) {
		// ʿawl: every fixed share is reduced in proportion; residuaries get nothing.
		awl = fixedTotal;
		for (const w of work) {
			finalShare.set(w.key, w.blocked ? ZERO : div(w.fixed, fixedTotal));
			if (w.blocked) continue;
			w.why = `${w.why}; ${cmp(w.fixed, ZERO) === 0 ? 'nothing is left after the fixed shares (ʿawl)' : 'reduced in proportion because the shares exceed the estate (ʿawl)'}`;
		}
	} else {
		let residue = sub(ONE, fixedTotal);
		for (const w of work) finalShare.set(w.key, w.fixed);
		const residuaries = work.filter((w) => w.residuary);
		if (cmp(residue, ZERO) > 0 && residuaries.length > 0) {
			const get = (k: HeirKey) => residuaries.find((w) => w.key === k);
			if (get('sons')) {
				const d = get('daughters');
				const units = sons * FARAID_MALE_UNITS + (d ? daughters * FARAID_FEMALE_UNITS : 0);
				finalShare.set('sons', add(finalShare.get('sons')!, mul(residue, frac(sons * FARAID_MALE_UNITS, units))));
				if (d) finalShare.set('daughters', add(finalShare.get('daughters')!, mul(residue, frac(daughters * FARAID_FEMALE_UNITS, units))));
			} else if (get('father') || get('grandfather')) {
				const k: HeirKey = get('father') ? 'father' : 'grandfather';
				finalShare.set(k, add(finalShare.get(k)!, residue));
			} else if (get('brothers')) {
				const units = brothers * FARAID_MALE_UNITS + sisters * FARAID_FEMALE_UNITS;
				finalShare.set('brothers', add(finalShare.get('brothers')!, mul(residue, frac(brothers * FARAID_MALE_UNITS, units))));
				if (get('sisters')) finalShare.set('sisters', add(finalShare.get('sisters')!, mul(residue, frac(sisters * FARAID_FEMALE_UNITS, units))));
			} else if (get('sisters')) {
				finalShare.set('sisters', add(finalShare.get('sisters')!, residue));
			}
			residue = ZERO;
		}
		if (cmp(residue, ZERO) > 0) {
			// No residuary heir: return the surplus (radd) to the fixed-share heirs except the spouse.
			const eligible = work.filter((w) => !w.blocked && !w.residuary && w.key !== 'husband' && w.key !== 'wives' && cmp(w.fixed, ZERO) > 0);
			if (eligible.length === 0) {
				return unsupported('After the fixed shares part of the estate is left over, and the only heir is a spouse. A spouse does not receive the surplus under the majority view, so it passes to more distant relatives or by the rules of the court.');
			}
			radd = true;
			const eligibleTotal = sum(eligible.map((w) => w.fixed));
			const pool = sub(ONE, spouseShare);
			for (const w of eligible) {
				finalShare.set(w.key, mul(pool, div(w.fixed, eligibleTotal)));
				w.why = `${w.why}; increased by the return of the surplus (radd)`;
			}
		}
	}

	// ---------- sanity: shares must add up to the whole estate exactly ----------
	const total = sum([...finalShare.values()]);
	if (cmp(total, ONE) !== 0) {
		return unsupported('The shares for this combination do not add up to the whole estate.');
	}
	for (const v of finalShare.values()) if (cmp(v, ZERO) < 0) return unsupported('A share came out negative.');

	const order: HeirKey[] = ['husband', 'wives', 'father', 'grandfather', 'mother', 'sons', 'daughters', 'brothers', 'sisters'];
	const lines: Line[] = order
		.map((k) => work.find((w) => w.key === k))
		.filter((w): w is Work => Boolean(w))
		.map((w) => ({
			key: w.key,
			label: LABELS[w.key][w.count === 1 ? 0 : 1],
			count: w.count,
			share: finalShare.get(w.key) ?? ZERO,
			blocked: w.blocked,
			why: !w.blocked && cmp(finalShare.get(w.key) ?? ZERO, ZERO) === 0 && !w.why.includes('nothing is left') ? `${w.why}; nothing is left after the fixed shares` : w.why
		}));

	return { ok: true, lines, umariyyatan, awl, radd };
}
