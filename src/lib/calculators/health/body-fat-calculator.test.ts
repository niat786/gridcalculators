import { describe, expect, it } from 'vitest';
import calc from './body-fat-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const row = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('body fat calculator (U.S. Navy)', () => {
	it('matches the worked example (man, 178 cm, neck 38, waist 85, 80 kg)', () => {
		const r = run({ sex: 'male', kg: '80', cm: '178', neckCm: '38', waistCm: '85' });
		expect(r.primaryResult).toBe('16.4%');
		expect(row(r, 'ACE category')).toBe('Fitness');
		expect(row(r, 'Fat mass')).toBe('13.1 kg');
		expect(row(r, 'Lean mass')).toBe('66.9 kg');
	});

	it('uses the hip measurement for a woman', () => {
		const r = run({ sex: 'female', kg: '60', cm: '165', neckCm: '32', waistCm: '74', hipCm: '98' });
		expect(r.primaryResult).toBe('28.4%');
		expect(row(r, 'ACE category')).toBe('Average');
		expect(row(r, 'Fat mass')).toBe('17.1 kg');
		expect(row(r, 'Lean mass')).toBe('42.9 kg');
	});

	it('converts imperial measurements and reports pounds', () => {
		const r = run({ units: 'imperial', sex: 'male', lb: '176', ft: '5', in: '10', neckIn: '15', waistIn: '33' });
		expect(r.primaryResult).toBe('15.5%');
		expect(row(r, 'ACE category')).toBe('Fitness');
		expect(row(r, 'Fat mass')).toBe('27.2 lb');
	});

	it('returns a dash when the waist is not wider than the neck', () => {
		const r = run({ sex: 'male', neckCm: '38', waistCm: '30' });
		expect(r.primaryResult).toBe('—');
		expect(r.summary).toMatch(/Waist must be wider/);
	});
});
