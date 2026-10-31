import { describe, expect, it } from 'vitest';
import calc from './time-zone-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('time zone calculator', () => {
	it('converts New York to London in July (both on daylight time)', () => {
		// New York EDT is UTC−4: 09:00 → 13:00 UTC. London BST is UTC+1: 14:00.
		const r = run({ date: '2026-07-15', time: '09:00', from: 'America/New_York', to: 'Europe/London' });
		expect(r.primaryResult).toBe('14:00');
		expect(r.primaryLabel).toBe('Time in London');
		expect(r.summary).toContain('Wednesday, July 15, 2026 at 14:00 in London');
		expect(r.secondaryMetrics?.[0].value).toBe('Wednesday, July 15, 2026');
		expect(r.secondaryMetrics?.[1].value).toBe('UTC−04:00');
		expect(r.secondaryMetrics?.[2].value).toBe('UTC+01:00');
		expect(r.secondaryMetrics?.[3].value).toBe('London is 5 hours ahead of New York');
		expect(r.secondaryMetrics?.[4].value).toBe('2026-07-15 13:00 UTC');
	});

	it('converts New York to London in January (standard time in both)', () => {
		// New York EST is UTC−5: 09:00 → 14:00 UTC. London GMT is UTC+0: 14:00.
		const r = run({ date: '2026-01-15', time: '09:00', from: 'America/New_York', to: 'Europe/London' });
		expect(r.primaryResult).toBe('14:00');
		expect(r.secondaryMetrics?.[1].value).toBe('UTC−05:00');
		expect(r.secondaryMetrics?.[2].value).toBe('UTC+00:00');
		expect(r.secondaryMetrics?.[3].value).toBe('London is 5 hours ahead of New York');
	});

	it('converts to a half-hour zone: 09:00 New York on 15 July = 18:30 Kolkata', () => {
		// 13:00 UTC + 5:30 = 18:30 in Kolkata. Difference: 5.5 − (−4) = 9.5 hours.
		const r = run({ date: '2026-07-15', time: '09:00', from: 'America/New_York', to: 'Asia/Kolkata' });
		expect(r.primaryResult).toBe('18:30');
		expect(r.secondaryMetrics?.[2].value).toBe('UTC+05:30');
		expect(r.secondaryMetrics?.[3].value).toBe('Kolkata is 9.5 hours ahead of New York');
	});

	it('moves the date forward across midnight: 12:00 New York on 8 March = 01:00 Tokyo on 9 March', () => {
		// US daylight time starts at 02:00 on 8 March 2026, so noon is EDT (UTC−4) = 16:00 UTC.
		// Tokyo is UTC+9: 01:00 on Monday 9 March.
		const r = run({ date: '2026-03-08', time: '12:00', from: 'America/New_York', to: 'Asia/Tokyo' });
		expect(r.primaryResult).toBe('01:00');
		expect(r.secondaryMetrics?.[0].value).toBe('Monday, March 9, 2026');
		expect(r.secondaryMetrics?.[1].value).toBe('UTC−04:00');
		expect(r.secondaryMetrics?.[4].value).toBe('2026-03-08 16:00 UTC');
	});

	it('reads a time skipped by the spring-forward change using the pre-change offset', () => {
		// 02:30 does not exist in New York on 8 March 2026. It is read as 03:30 EDT = 07:30 UTC,
		// which is 07:30 in London (GMT).
		const r = run({ date: '2026-03-08', time: '02:30', from: 'America/New_York', to: 'Europe/London' });
		expect(r.primaryResult).toBe('07:30');
		expect(r.summary).toContain('02:30 does not exist in New York');
		expect(r.summary).toContain('03:30');
	});

	it('uses the first occurrence of a time repeated by the fall-back change', () => {
		// 01:30 happens twice in New York on 1 November 2026. The first (EDT, UTC−4) is 05:30 UTC,
		// which is 05:30 in London (GMT).
		const r = run({ date: '2026-11-01', time: '01:30', from: 'America/New_York', to: 'Europe/London' });
		expect(r.primaryResult).toBe('05:30');
		expect(r.summary).toContain('happens twice in New York');
	});

	it('returns a dash for an impossible date or an invalid time', () => {
		expect(run({ date: '2026-02-30' }).primaryResult).toBe('—');
		expect(run({ time: 'abc' }).primaryResult).toBe('—');
		expect(run({ time: '24:00' }).primaryResult).toBe('—');
	});
});
