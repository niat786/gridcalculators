import { describe, expect, it } from 'vitest';
import calc from './pregnancy-weight-gain-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('pregnancy weight gain calculator', () => {
	it('matches the worked example (65 kg, 165 cm, week 20, one baby)', () => {
		const r = run({ units: 'metric', kg: '65', cm: '165', pregnancy: 'single', week: '20' });
		expect(r.primaryResult).toBe('3.0–5.2 kg (6.7–11.4 lb)');
		expect(metric(r, 'Pre-pregnancy BMI')).toBe('23.9 (Normal weight)');
		expect(metric(r, 'Total gain goal')).toBe('11.3–15.9 kg (25–35 lb)');
		expect(metric(r, 'Pace after week 13')).toBe('0.36–0.45 kg a week');
		expect(metric(r, 'Trimester')).toBe('Second trimester');
	});

	it('uses the underweight rates from week 14: 50 kg, 170 cm, week 36', () => {
		const r = run({ units: 'metric', kg: '50', cm: '170', pregnancy: 'single', week: '36' });
		expect(metric(r, 'Pre-pregnancy BMI')).toBe('17.3 (Underweight)');
		expect(r.primaryResult).toBe('10.9–15.6 kg (24.1–34.3 lb)');
		expect(metric(r, 'Total gain goal')).toBe('12.7–18.1 kg (28–40 lb)');
	});

	it('gives total ranges only for twins: obese, 90 kg, 160 cm', () => {
		const r = run({ units: 'metric', kg: '90', cm: '160', pregnancy: 'twins', week: '30' });
		expect(r.primaryResult).toBe('11.3–19.1 kg (25–42 lb)');
		expect(metric(r, 'Pace after week 13')).toBe('Ask your care team');
	});

	it('shows the normal-weight twin total in imperial units', () => {
		const r = run({ units: 'imperial', lb: '143', ft: '5', in: '5', pregnancy: 'twins', week: '20' });
		expect(r.primaryResult).toBe('37–54 lb (16.8–24.5 kg)');
		expect(r.table?.rows.find((x) => x.bmi.startsWith('Normal'))?.twins).toBe('37–54 lb (16.8–24.5 kg)');
	});

	it('says there is no guideline for underweight twins', () => {
		const r = run({ units: 'metric', kg: '50', cm: '170', pregnancy: 'twins', week: '20' });
		expect(r.primaryResult).toBe('No guideline');
		expect(metric(r, 'Total gain goal')).toBe('Not set by the IOM');
	});

	it('returns a dash for invalid input', () => {
		expect(run({ week: '0' }).primaryResult).toBe('—');
		expect(run({ week: '43' }).primaryResult).toBe('—');
		expect(run({ cm: '0' }).primaryResult).toBe('—');
		expect(run({ kg: '' }).primaryResult).toBe('—');
	});
});
