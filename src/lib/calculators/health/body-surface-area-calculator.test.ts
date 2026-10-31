import { describe, expect, it } from 'vitest';
import calc from './body-surface-area-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const row = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('body surface area calculator', () => {
	it('matches the worked example: 175 cm, 70 kg', () => {
		// Mosteller √(175 × 70 ÷ 3600) = 1.8447; Du Bois 1.8481; Haycock 1.8468
		const r = run({ cm: '175', kg: '70' });
		expect(r.primaryResult).toBe('1.84 m²');
		expect(row(r, 'Du Bois')).toBe('1.85 m²');
		expect(row(r, 'Haycock')).toBe('1.85 m²');
		expect(row(r, 'Range across the three')).toBe('1.84 to 1.85 m²');
	});

	it('gives 2.30 for a large adult: 190 cm, 100 kg', () => {
		// Mosteller 2.2973; Du Bois 2.2828; Haycock 2.3114
		const r = run({ cm: '190', kg: '100' });
		expect(r.primaryResult).toBe('2.30 m²');
		expect(row(r, 'Du Bois')).toBe('2.28 m²');
		expect(row(r, 'Haycock')).toBe('2.31 m²');
	});

	it('converts imperial units: 5 ft 9 in, 154 lb', () => {
		// 175.26 cm and 69.85 kg → Mosteller 1.8441
		const r = run({ units: 'imperial', ft: '5', in: '9', lb: '154' });
		expect(r.primaryResult).toBe('1.84 m²');
	});

	it('returns a dash when the height is missing', () => {
		expect(run({ cm: '' }).primaryResult).toBe('—');
	});
});
