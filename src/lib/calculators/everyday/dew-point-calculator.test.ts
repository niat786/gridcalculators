import { describe, expect, it } from 'vitest';
import calc from './dew-point-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('dew point calculator', () => {
	it('matches the worked example: 25 °C at 60% gives 16.7 °C', () => {
		const r = run();
		expect(r.primaryResult).toBe('16.7 °C');
		expect(r.secondaryMetrics?.[0].value).toBe('62.1 °F');
		expect(r.secondaryMetrics?.[1].value).toBe('Comfortable');
		expect(r.secondaryMetrics?.[3].value).toBe('8.3 °C');
	});

	it('gives the same answer in Fahrenheit: 77 °F at 60% gives 62.1 °F', () => {
		const r = run({ units: 'f', tempF: '77', rh: '60' });
		expect(r.primaryResult).toBe('62.1 °F');
		expect(r.secondaryMetrics?.[0].value).toBe('16.7 °C');
	});

	it('20 °C at 50% gives 9.3 °C, a dry band', () => {
		const r = run({ tempC: '20', rh: '50' });
		expect(r.primaryResult).toBe('9.3 °C');
		expect(r.secondaryMetrics?.[1].value).toBe('Dry');
	});

	it('30 °C at 80% gives 26.2 °C, oppressive', () => {
		const r = run({ tempC: '30', rh: '80' });
		expect(r.primaryResult).toBe('26.2 °C');
		expect(r.secondaryMetrics?.[1].value).toBe('Oppressive');
	});

	it('handles a freezing dew point: 10 °C at 30% gives -6.8 °C', () => {
		expect(run({ tempC: '10', rh: '30' }).primaryResult).toBe('-6.8 °C');
	});

	it('returns a dash for humidity of 0% or above 100%, or a missing temperature', () => {
		expect(run({ rh: '0' }).primaryResult).toBe('—');
		expect(run({ rh: '101' }).primaryResult).toBe('—');
		expect(run({ tempC: '' }).primaryResult).toBe('—');
	});
});
