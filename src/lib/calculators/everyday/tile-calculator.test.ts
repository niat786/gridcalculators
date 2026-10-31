import { describe, expect, it } from 'vitest';
import calc from './tile-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('tile calculator', () => {
	it('matches the worked example: 12 ft × 10 ft room, 12 in tiles, 1/8 in grout, 10% waste, 10 per box', () => {
		// across: (144 + 0.125) ÷ (12 + 0.125) = 11.89 → 12; down: (120 + 0.125) ÷ 12.125 = 9.91 → 10
		// 12 × 10 = 120 tiles; × 1.1 = 132 tiles; 132 ÷ 10 = 13.2 → 14 boxes
		const r = run();
		expect(r.primaryResult).toBe('132 tiles');
		expect(r.primaryLabel).toBe('Tiles to buy');
		expect(r.secondaryMetrics?.[0].value).toBe('120 sq ft');
		expect(r.secondaryMetrics?.[1].value).toBe('120 tiles');
		expect(r.secondaryMetrics?.[2].value).toBe('14 boxes');
		expect(r.secondaryMetrics?.[3].value).toBe('132 sq ft');
	});

	it('works in metres: 3.6 m × 3 m room, 30 cm tiles, 3 mm grout, 10% waste', () => {
		// across: (360 + 0.3) ÷ 30.3 = 11.89 → 12; down: (300 + 0.3) ÷ 30.3 = 9.91 → 10
		// 120 tiles; × 1.1 = 132 tiles × 0.09 m² = 11.88 m² covered; 132 ÷ 10 → 14 boxes
		const r = run({ units: 'metric', roomLenM: '3.6', roomWidM: '3', tileWCm: '30', tileHCm: '30', groutMm: '3' });
		expect(r.primaryResult).toBe('132 tiles');
		expect(r.secondaryMetrics?.[0].value).toBe('10.8 sq m');
		expect(r.secondaryMetrics?.[2].value).toBe('14 boxes');
		expect(r.secondaryMetrics?.[3].value).toBe('11.88 sq m');
	});

	it('counts whole tiles for a 10 ft × 10 ft room with 6 in tiles and no grout', () => {
		// 120 ÷ 6 = 20 across and 20 down = 400 tiles; no waste; no box count
		const r = run({ roomLenFt: '10', roomWidFt: '10', tileWIn: '6', tileHIn: '6', groutIn: '0', waste: '0', perBox: '0' });
		expect(r.primaryResult).toBe('400 tiles');
		expect(r.secondaryMetrics?.[2].value).toBe('—');
	});

	it('returns a dash for a zero room length', () => {
		expect(run({ roomLenFt: '0' }).primaryResult).toBe('—');
	});

	it('returns a dash for a negative grout gap', () => {
		expect(run({ groutIn: '-0.1' }).primaryResult).toBe('—');
	});
});
