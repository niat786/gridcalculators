import { describe, expect, it } from 'vitest';
import calc from './golf-handicap-calculator.calc';
import { defaultRaw, encodeRows, toValues } from '../../components/calculator/state';
import type { RowsInput, RowValue } from '../types';

const rounds = calc.inputs.find((i) => i.id === 'rounds') as RowsInput;
const rows = (list: RowValue[]) => encodeRows(rounds, list);

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('golf handicap calculator (WHS)', () => {
	it('matches the worked example: seven rounds, course par 72, rating 72.0, slope 130', () => {
		// Lowest two differentials 14.1 and 14.8 average 14.45 → Index 14.5
		// Course handicap: 14.5 × 130 ÷ 113 + 0 = 16.68 → 17
		const r = run();
		expect(r.primaryResult).toBe('14.5');
		expect(r.secondaryMetrics?.[0].value).toBe('2');
		expect(r.secondaryMetrics?.[3].value).toBe('17');
	});

	it('uses the lowest differential with a −2.0 adjustment for three rounds', () => {
		// Each round: (113 ÷ 113) × (90 − 72 − 2) = 16.0. Lowest 1 = 16.0, minus 2.0 → 14.0
		const r = run({ rounds: rows([{ score: 90, rating: 72, slope: 113, pcc: 2 }, { score: 90, rating: 72, slope: 113, pcc: 2 }, { score: 90, rating: 72, slope: 113, pcc: 2 }]) });
		expect(r.primaryResult).toBe('14.0');
	});

	it('averages the lowest one differential for five rounds with no adjustment', () => {
		// Differentials 18.0, 23.0, 28.0, 33.0, 38.0 → lowest 1 → 18.0
		const r = run({
			rounds: rows([
				{ score: 90, rating: 72, slope: 113, pcc: 0 },
				{ score: 95, rating: 72, slope: 113, pcc: 0 },
				{ score: 100, rating: 72, slope: 113, pcc: 0 },
				{ score: 105, rating: 72, slope: 113, pcc: 0 },
				{ score: 110, rating: 72, slope: 113, pcc: 0 }
			])
		});
		expect(r.primaryResult).toBe('18.0');
	});

	it('caps the Handicap Index at 54.0', () => {
		// Differential 128.0 each → 128.0 − 2.0 = 126.0 → capped at 54.0
		const r = run({ rounds: rows([{ score: 200, rating: 72, slope: 113, pcc: 0 }, { score: 200, rating: 72, slope: 113, pcc: 0 }, { score: 200, rating: 72, slope: 113, pcc: 0 }]) });
		expect(r.primaryResult).toBe('54.0');
	});

	it('works out the course handicap for another course: index 14.0, slope 150, rating 72.5, par 72', () => {
		// Index 14.0 (three rounds of 16.0, minus 2.0). 14.0 × 150 ÷ 113 + (72.5 − 72) = 19.08 → 19
		const r = run({
			rounds: rows([{ score: 90, rating: 72, slope: 113, pcc: 2 }, { score: 90, rating: 72, slope: 113, pcc: 2 }, { score: 90, rating: 72, slope: 113, pcc: 2 }]),
			courseRating: '72.5',
			courseSlope: '150',
			par: '72'
		});
		expect(r.primaryResult).toBe('14.0');
		expect(r.secondaryMetrics?.[3].value).toBe('19');
	});

	it('returns a dash with fewer than three rounds', () => {
		const r = run({ rounds: rows([{ score: 90, rating: 72, slope: 113, pcc: 0 }, { score: 91, rating: 72, slope: 113, pcc: 0 }]) });
		expect(r.primaryResult).toBe('—');
	});

	it('returns a dash when a round has no score', () => {
		const r = run({ rounds: rows([{ score: '', rating: 72, slope: 113, pcc: 0 }, { score: 90, rating: 72, slope: 113, pcc: 0 }, { score: 91, rating: 72, slope: 113, pcc: 0 }]) });
		expect(r.primaryResult).toBe('—');
	});
});
