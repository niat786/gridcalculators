import { beforeEach, describe, expect, it } from 'vitest';
import calc from './redundancy-pay-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import { setCurrency } from '../format';

beforeEach(() => setCurrency('GBP'));

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const metric = (r: ReturnType<typeof run>, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('redundancy pay calculator', () => {
	it('matches the worked example: 5 years at 1.5 + 9 at 1 = 16.5 weeks × £600', () => {
		const r = run();
		expect(r.primaryResult).toBe('£9,900.00');
		expect(metric(r, "Weeks' pay entitlement")).toBe('16.5');
	});
	it('all years in the 22–40 band: age 40 at the start of the latest year → 14 weeks × 600', () => {
		expect(run({ dob: '1985-03-15' }).primaryResult).toBe('£8,400.00');
	});
	it('caps weekly pay at £751 (GB) and £783 (NI)', () => {
		expect(run({ weekly: '1000' }).primaryResult).toBe('£12,391.50'); // 16.5 × 751
		expect(run({ weekly: '1000', region: 'ni' }).primaryResult).toBe('£12,919.50'); // 16.5 × 783
	});
	it('counts at most 20 years: gov.uk maximum £22,530 = 30 weeks × £751', () => {
		const r = run({ dob: '1960-01-01', start: '1990-01-01', end: '2026-01-01', weekly: '2000' });
		expect(r.primaryResult).toBe('£22,530.00');
		expect(metric(r, 'Years counted (max 20)')).toBe('20');
	});
	it('mixes under-22 years at half a week', () => {
		// Years started at ages 22, 21, 20, 19 → 1 + 0.5×3 = 2.5 weeks × 400
		expect(run({ dob: '2000-06-01', start: '2020-01-01', end: '2024-01-01', weekly: '400' }).primaryResult).toBe('£1,000.00');
	});
	it('pays nothing under 2 years of service', () => {
		expect(run({ start: '2025-01-01', end: '2026-06-30' }).primaryResult).toBe('£0.00');
	});
	it('invalid input returns —', () => {
		expect(run({ dob: '' }).primaryResult).toBe('—');
		expect(run({ end: '2010-01-01' }).primaryResult).toBe('—');
		expect(run({ weekly: '' }).primaryResult).toBe('—');
	});
});
