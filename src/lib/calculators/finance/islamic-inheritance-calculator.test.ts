import { beforeEach, describe, expect, it } from 'vitest';
import calc from './islamic-inheritance-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';
import { distribute, fracToString, type HeirKey, type Heirs } from '../data/faraid-engine';

const none: Heirs = {
	deceasedIsWoman: false,
	husband: false,
	wives: 0,
	sons: 0,
	daughters: 0,
	father: false,
	mother: false,
	grandfather: false,
	brothers: 0,
	sisters: 0,
	others: false
};

/** Shares as { key: "n/d" } for readable known-answer checks. */
function split(over: Partial<Heirs>): Record<string, string> | string {
	const out = distribute({ ...none, ...over });
	if (!out.ok) return `UNSUPPORTED`;
	const r: Record<string, string> = {};
	for (const l of out.lines) r[l.key] = fracToString(l.share);
	return r;
}

// Every expected fraction below is a classic textbook result worked out by hand (fixed shares of the Quran, residue 2:1,
// awl by the sum of the fixed shares, radd in proportion to the shares), not produced by the code under test.
describe('Faraid engine: classic cases', () => {
	it('wife + 2 sons + 1 daughter: wife 1/8, then the remaining 7/8 split 2:2:1', () => {
		// 7/8 x 2/5 = 7/20 each son (14/20 together), 7/8 x 1/5 = 7/40 daughter
		expect(split({ wives: 1, sons: 2, daughters: 1 })).toEqual({ wives: '1/8', sons: '7/10', daughters: '7/40' });
	});

	it('husband + mother + 2 full sisters: awl, 3/8 + 1/8 + 4/8 (base 6 raised to 8)', () => {
		const out = distribute({ ...none, deceasedIsWoman: true, husband: true, mother: true, sisters: 2 });
		expect(out.ok && fracToString(out.awl!)).toBe('4/3');
		expect(split({ deceasedIsWoman: true, husband: true, mother: true, sisters: 2 })).toEqual({ husband: '3/8', mother: '1/8', sisters: '1/2' });
	});

	it('mother + daughter: radd, mother 1/4 and daughter 3/4', () => {
		const out = distribute({ ...none, deceasedIsWoman: true, mother: true, daughters: 1 });
		expect(out.ok && out.radd).toBe(true);
		expect(split({ deceasedIsWoman: true, mother: true, daughters: 1 })).toEqual({ mother: '1/4', daughters: '3/4' });
	});

	it('Umariyyatan: husband + father + mother: 1/2, mother 1/3 of the remaining half = 1/6, father 1/3', () => {
		const out = distribute({ ...none, deceasedIsWoman: true, husband: true, father: true, mother: true });
		expect(out.ok && out.umariyyatan).toBe(true);
		expect(split({ deceasedIsWoman: true, husband: true, father: true, mother: true })).toEqual({ husband: '1/2', father: '1/3', mother: '1/6' });
	});

	it('Umariyyatan: wife + father + mother: 1/4, mother 1/3 of 3/4 = 1/4, father 1/2', () => {
		expect(split({ wives: 1, father: true, mother: true })).toEqual({ wives: '1/4', father: '1/2', mother: '1/4' });
	});

	it('Minbariyyah (Ali): wife + 2 daughters + father + mother: base 24 raised to 27, wife 3/27 = 1/9', () => {
		const out = distribute({ ...none, wives: 1, daughters: 2, father: true, mother: true });
		expect(out.ok && fracToString(out.awl!)).toBe('9/8');
		expect(split({ wives: 1, daughters: 2, father: true, mother: true })).toEqual({ wives: '1/9', father: '4/27', mother: '4/27', daughters: '16/27' });
	});

	it('father + mother only: mother 1/3, father the remainder 2/3', () => {
		expect(split({ father: true, mother: true })).toEqual({ father: '2/3', mother: '1/3' });
	});

	it('father + mother + 2 brothers: brothers are blocked but still cut the mother to 1/6', () => {
		const out = distribute({ ...none, father: true, mother: true, brothers: 2 });
		expect(out.ok && out.lines.find((l) => l.key === 'brothers')?.blocked).toBe(true);
		expect(split({ father: true, mother: true, brothers: 2 })).toEqual({ father: '5/6', mother: '1/6', brothers: '0' });
	});

	it('mother + grandfather + sister: grandfather blocks the sister (Hanafi), mother 1/3 and grandfather 2/3', () => {
		expect(split({ mother: true, grandfather: true, sisters: 1 })).toEqual({ grandfather: '2/3', mother: '1/3', sisters: '0' });
	});

	it('grandfather is blocked by the father', () => {
		expect(split({ father: true, grandfather: true })).toEqual({ father: '1', grandfather: '0' });
	});

	it('1 daughter + 1 full sister: daughter 1/2, sister takes the remainder 1/2 (residuary with a daughter)', () => {
		expect(split({ daughters: 1, sisters: 1 })).toEqual({ daughters: '1/2', sisters: '1/2' });
	});

	it('wife + daughter + 6 full sisters: 1/8, 1/2, sisters 3/8 together (Darul Ifta Birmingham case, 16 shares)', () => {
		expect(split({ wives: 1, daughters: 1, sisters: 6 })).toEqual({ wives: '1/8', daughters: '1/2', sisters: '3/8' });
	});

	it('1 daughter + father: daughter 1/2, father 1/6 plus the remainder = 1/2', () => {
		expect(split({ daughters: 1, father: true })).toEqual({ father: '1/2', daughters: '1/2' });
	});

	it('daughters get nothing extra when a son exists; father keeps 1/6 and the son takes the rest', () => {
		// wife 1/8 = 3/24, father 1/6 = 4/24, mother 1/6 = 4/24, son 13/24
		expect(split({ wives: 1, sons: 1, father: true, mother: true })).toEqual({ wives: '1/8', father: '1/6', mother: '1/6', sons: '13/24' });
	});

	it('husband + 2 sons: 1/4 and 3/8 each', () => {
		expect(split({ deceasedIsWoman: true, husband: true, sons: 2 })).toEqual({ husband: '1/4', sons: '3/4' });
	});

	it('several wives share one fixed share', () => {
		expect(split({ wives: 3, sons: 1 })).toEqual({ wives: '1/8', sons: '7/8' });
		expect(split({ wives: 4, father: true })).toEqual({ wives: '1/4', father: '3/4' });
	});

	it('2 brothers + 1 sister: remainder split 2:2:1', () => {
		expect(split({ brothers: 2, sisters: 1 })).toEqual({ brothers: '4/5', sisters: '1/5' });
	});

	it('lone full sister gets 1/2 and the radd returns the rest to her; two sisters share everything', () => {
		expect(split({ sisters: 1 })).toEqual({ sisters: '1' });
		expect(split({ sisters: 2 })).toEqual({ sisters: '1' });
	});

	it('wife + 1 sister: wife is not given the surplus; sister 1/2 + radd = 3/4', () => {
		expect(split({ wives: 1, sisters: 1 })).toEqual({ wives: '1/4', sisters: '3/4' });
	});

	it('husband + sister: exactly 1/2 and 1/2, no awl and no radd', () => {
		expect(split({ deceasedIsWoman: true, husband: true, sisters: 1 })).toEqual({ husband: '1/2', sisters: '1/2' });
	});

	it('husband + sister + mother: awl 3/8, 3/8, 2/8 (one sibling leaves the mother 1/3)', () => {
		expect(split({ deceasedIsWoman: true, husband: true, mother: true, sisters: 1 })).toEqual({ husband: '3/8', mother: '1/4', sisters: '3/8' });
	});

	it('husband + mother + 2 daughters: awl 12 -> 13 (3/13, 2/13, 8/13)', () => {
		expect(split({ deceasedIsWoman: true, husband: true, mother: true, daughters: 2 })).toEqual({ husband: '3/13', mother: '2/13', daughters: '8/13' });
	});

	it('mother + 2 sisters: radd 1/5 and 4/5. Mother + 1 sister: 2/5 and 3/5', () => {
		expect(split({ mother: true, sisters: 2 })).toEqual({ mother: '1/5', sisters: '4/5' });
		expect(split({ mother: true, sisters: 1 })).toEqual({ mother: '2/5', sisters: '3/5' });
	});

	it('2 daughters, no other heir: 2/3 plus radd = everything; sons take everything alone', () => {
		expect(split({ daughters: 2 })).toEqual({ daughters: '1' });
		expect(split({ sons: 3 })).toEqual({ sons: '1' });
	});

	it('a son blocks brothers and sisters; a daughter alone does not block a brother', () => {
		expect(split({ sons: 1, brothers: 2, sisters: 1 })).toEqual({ sons: '1', brothers: '0', sisters: '0' });
		expect(split({ daughters: 1, brothers: 1 })).toEqual({ daughters: '1/2', brothers: '1/2' });
	});

	it('grandfather with a daughter takes 1/6 plus the remainder, like the father', () => {
		expect(split({ daughters: 1, grandfather: true })).toEqual({ grandfather: '1/2', daughters: '1/2' });
	});
});

describe('Faraid engine: cases that must show no split', () => {
	it('spouse only: nobody takes the surplus', () => {
		expect(split({ wives: 1 })).toBe('UNSUPPORTED');
		expect(split({ deceasedIsWoman: true, husband: true })).toBe('UNSUPPORTED');
	});

	it('no heirs at all', () => {
		expect(split({})).toBe('UNSUPPORTED');
	});

	it('other relatives switched on', () => {
		expect(split({ sons: 1, others: true })).toBe('UNSUPPORTED');
	});

	it('spouse + mother + grandfather (disputed) and spouse + both parents + one sibling', () => {
		expect(split({ deceasedIsWoman: true, husband: true, mother: true, grandfather: true })).toBe('UNSUPPORTED');
		expect(split({ wives: 1, father: true, mother: true, brothers: 1 })).toBe('UNSUPPORTED');
	});

	it('too many wives or fractional counts', () => {
		expect(split({ wives: 5, sons: 1 })).toBe('UNSUPPORTED');
		expect(split({ sons: 1.5 })).toBe('UNSUPPORTED');
	});

	it('spouse + mother + grandfather with two siblings is settled: mother 1/6 (siblings reduce her)', () => {
		expect(split({ deceasedIsWoman: true, husband: true, mother: true, grandfather: true, sisters: 2 })).toEqual({ husband: '1/2', grandfather: '1/3', mother: '1/6', sisters: '0' });
	});
});

describe('Faraid engine: invariants over many combinations', () => {
	it('whenever a split is returned the shares add up to the whole estate, none negative, sons get twice a daughter', () => {
		const bools = [false, true];
		let supported = 0;
		for (const woman of bools)
			for (const spouse of [0, 1, 2, 4])
				for (const sons of [0, 1, 3])
					for (const daughters of [0, 1, 2, 4])
						for (const father of bools)
							for (const mother of bools)
								for (const gf of bools)
									for (const brothers of [0, 1, 2])
										for (const sisters of [0, 1, 3]) {
											const h: Heirs = { ...none, deceasedIsWoman: woman, husband: woman && spouse > 0, wives: woman ? 0 : spouse, sons, daughters, father, mother, grandfather: gf, brothers, sisters };
											const out = distribute(h);
											if (!out.ok) continue;
											supported++;
											let total = 0;
											const by = new Map<HeirKey, number>();
											for (const l of out.lines) {
												const v = l.share[0] / l.share[1];
												expect(v).toBeGreaterThanOrEqual(0);
												total += v;
												by.set(l.key, v);
											}
											expect(total).toBeCloseTo(1, 12);
											if (sons > 0 && daughters > 0) {
												expect(by.get('sons')! / sons / (by.get('daughters')! / daughters)).toBeCloseTo(2, 12);
											}
											if (brothers > 0 && sisters > 0 && (by.get('brothers') ?? 0) > 0) {
												expect(by.get('brothers')! / brothers / (by.get('sisters')! / sisters)).toBeCloseTo(2, 12);
											}
											// A blocked heir never inherits.
											for (const l of out.lines) if (l.blocked) expect(l.share[0]).toBe(0);
											// The spouse never gets more than a half.
											expect((by.get('husband') ?? 0) + (by.get('wives') ?? 0)).toBeLessThanOrEqual(0.5 + 1e-12);
										}
		expect(supported).toBeGreaterThan(1000);
	});
});

const run = (over: Record<string, string | boolean> = {}) => {
	const r = calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
	return {
		...r,
		primaryResult: r.primaryResult.replace(/ /g, ' '),
		metrics: (r.secondaryMetrics ?? []).map((m) => m.value.replace(/ /g, ' ')),
		rows: (r.table?.rows ?? []).map((row) => Object.fromEntries(Object.entries(row).map(([k, val]) => [k, val.replace(/ /g, ' ')])))
	};
};

describe('Islamic inheritance calculator', () => {
	beforeEach(() => setCurrency('SAR'));

	it('matches the worked example: wife 125,000, each son 350,000, daughter 175,000 from 1,000,000', () => {
		const r = run({});
		expect(r.primaryResult).toBe('SAR 1,000,000.00');
		expect(r.rows[0].heir).toBe('Wife');
		expect(r.rows[0].amount).toBe('SAR 125,000.00');
		expect(r.rows[1].heir).toBe('2 sons');
		expect(r.rows[1].amount).toBe('SAR 700,000.00');
		expect(r.rows[1].each).toBe('SAR 350,000.00');
		expect(r.rows[2].amount).toBe('SAR 175,000.00');
	});

	it('takes debts and funeral costs off first, then a bequest capped at one third', () => {
		// 1,000,000 - 100,000 debts - 50,000 funeral = 850,000; bequest 400,000 is capped at 283,333.33
		const r = run({ debts: '100000', funeral: '50000', bequest: '400000' });
		expect(r.metrics[2]).toBe('SAR 283,333.33 (limited to one third)');
		expect(r.primaryResult).toBe('SAR 566,666.67');
		// wife 1/8 of 566,666.67 = 70,833.33
		expect(r.rows[0].amount).toBe('SAR 70,833.33');
	});

	it('a bequest inside the cap is paid in full', () => {
		const r = run({ bequest: '100000' });
		expect(r.metrics[2]).toBe('SAR 100,000.00');
		expect(r.primaryResult).toBe('SAR 900,000.00');
	});

	it('awl case: a woman leaves husband, mother and 2 full sisters; estate 800,000', () => {
		// 3/8, 1/8, 4/8
		const r = run({ deceased: 'woman', husband: true, mother: true, sons: '0', daughters: '0', sisters: '2', assets: '800000' });
		expect(r.rows.map((x) => x.amount)).toEqual(['SAR 300,000.00', 'SAR 100,000.00', 'SAR 400,000.00']);
		expect(r.metrics[3]).toContain('ʿawl');
	});

	it('radd case: mother + daughter, estate 120,000 gives 30,000 and 90,000', () => {
		const r = run({ deceased: 'woman', husband: false, mother: true, sons: '0', daughters: '1', assets: '120000' });
		expect(r.rows.map((x) => x.amount)).toEqual(['SAR 30,000.00', 'SAR 90,000.00']);
		expect(r.metrics[3]).toContain('Radd');
	});

	it('Umariyyatan case: wife + father + mother, estate 240,000 gives 60,000 / 120,000 / 60,000', () => {
		const r = run({ wives: '1', sons: '0', daughters: '0', father: true, mother: true, assets: '240000' });
		expect(r.rows.map((x) => x.amount)).toEqual(['SAR 60,000.00', 'SAR 120,000.00', 'SAR 60,000.00']);
		expect(r.metrics[3]).toContain('Umariyyatan');
	});

	it('shows no split, with a message to ask a scholar, when the case is outside what is covered', () => {
		const r = run({ others: true });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toContain('scholar');
		expect(run({ wives: '1', sons: '0', daughters: '0' }).primaryResult).toBe('—');
	});

	it('rejects invalid money and counts', () => {
		expect(run({ assets: '0' }).primaryResult).toBe('—');
		expect(run({ assets: '1000', debts: '1000' }).primaryResult).toBe('—');
		expect(run({ sons: 'abc' }).primaryResult).toBe('—');
		expect(run({ sons: '-1' }).primaryResult).toBe('—');
		expect(run({ wives: '5' }).primaryResult).toBe('—');
	});
});
