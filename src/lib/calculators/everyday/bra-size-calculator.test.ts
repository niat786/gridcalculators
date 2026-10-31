import { describe, expect, it } from 'vitest';
import calc from './bra-size-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const row = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('bra size calculator', () => {
	it('matches the worked example: US, underbust 32 in, bust 37 in', () => {
		// Band 32 (already even). Cup: 37 − 32 = 5 → DD. Sisters: 30DDD/F and 34D.
		const r = run();
		expect(r.primaryResult).toBe('32DD');
		expect(row(r, 'Sister sizes')).toBe('30DDD/F and 34D');
	});

	it('uses UK cup letters: underbust 32 in, bust 36 in → 32D', () => {
		// Difference 4 → D in UK letters (and in US letters)
		expect(run({ system: 'UK', underIn: '32', bustIn: '36' }).primaryResult).toBe('32D');
	});

	it('rounds the metric underbust to inches, then to an even band: 70 cm, bust 90 cm → 28G (US)', () => {
		// 70 cm = 27.56 in → 28. 90 cm = 35.43 in; 35.43 − 28 = 7.43 → 7 → G
		expect(run({ units: 'metric', system: 'US', underCm: '70', bustCm: '90' }).primaryResult).toBe('28G');
	});

	it('uses EU sizing: underbust 70 cm, bust 90 cm → 70E', () => {
		// Band 70 (nearest 5 cm). Difference 20 cm → E (20–22 cm)
		expect(run({ units: 'metric', system: 'EU', underCm: '70', bustCm: '90' }).primaryResult).toBe('70E');
	});

	it('adds 15 to the EU band for France and Spain: 70 cm, bust 90 cm → 85E', () => {
		expect(run({ units: 'metric', system: 'FR', underCm: '70', bustCm: '90' }).primaryResult).toBe('85E');
	});

	it('uses the Australian band: UK 34 becomes AU 12, bust 36 in → 12B', () => {
		// Band 34 → AU 12. Difference 2 → B
		expect(run({ system: 'AU', underIn: '34', bustIn: '36' }).primaryResult).toBe('12B');
	});

	it('converts inches for EU sizing: underbust 32 in, bust 37 in → 80A', () => {
		// 81.28 cm → band 80. Difference 93.98 − 81.28 = 12.7 cm → 13 → A
		expect(run({ system: 'EU' }).primaryResult).toBe('80A');
	});

	it('returns a dash when the bust is not larger than the underbust', () => {
		expect(run({ underIn: '32', bustIn: '30' }).primaryResult).toBe('—');
	});

	it('returns a dash when the measurements are outside the size chart', () => {
		expect(run({ underIn: '32', bustIn: '50' }).primaryResult).toBe('—');
	});
});
