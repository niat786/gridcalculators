import { describe, expect, it } from 'vitest';
import calc from './ideal-weight-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const row = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('ideal weight calculator', () => {
	it('matches the worked example (man, 175 cm)', () => {
		const r = run({ sex: 'male', cm: '175' });
		expect(r.primaryResult).toBe('56.7–76.3 kg');
		expect(row(r, 'Robinson (1983)')).toBe('68.9 kg');
		expect(row(r, 'Miller (1983)')).toBe('68.7 kg');
		expect(row(r, 'Devine (1974)')).toBe('70.5 kg');
		expect(row(r, 'Hamwi (1964)')).toBe('72.0 kg');
	});

	it('gives the BMI range for a woman of 165 cm', () => {
		const r = run({ sex: 'female', cm: '165' });
		expect(r.primaryResult).toBe('50.4–67.8 kg');
		expect(row(r, 'Robinson (1983)')).toBe('57.4 kg');
	});

	it('uses the Robinson formula at exactly 70 inches for a man, in pounds', () => {
		const r = run({ units: 'imperial', sex: 'male', ft: '5', in: '10' });
		expect(r.primaryResult).toBe('128.9–173.5 lb');
		expect(row(r, 'Robinson (1983)')).toBe('156.5 lb');
	});

	it('returns a dash for heights under 5 feet', () => {
		const r = run({ cm: '150' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toMatch(/152\.4 cm/);
	});
});
