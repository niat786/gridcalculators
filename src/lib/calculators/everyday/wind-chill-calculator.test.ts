import { describe, expect, it } from 'vitest';
import calc from './wind-chill-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('wind chill calculator', () => {
	it('matches the worked example: 0 °F with 15 mph wind gives -19 °F', () => {
		// 35.74 − 35.75 × 15^0.16 = 35.74 − 55.14 = −19.40
		const r = run();
		expect(r.primaryResult).toBe('-19 °F');
		expect(r.secondaryMetrics?.[0].value).toBe('-28.6 °C');
		expect(r.secondaryMetrics?.[3].value).toBe('About 30 minutes');
	});

	it('works in metric: -20 °C with 30 km/h wind gives -33 °C', () => {
		// 13.12 + 0.6215 × (−20) − 11.37 × 30^0.16 + 0.3965 × (−20) × 30^0.16 = −32.57
		const r = run({ units: 'met', tempC: '-20', windKmh: '30' });
		expect(r.primaryResult).toBe('-33 °C');
		expect(r.secondaryMetrics?.[0].value).toBe('-26.6 °F');
	});

	it('gives 13 °F for 20 °F with 5 mph wind', () => {
		// 35.74 + 12.43 − 35.75 × 5^0.16 + 0.4275 × 20 × 5^0.16 = 12.98
		expect(run({ tempF: '20', windMph: '5' }).primaryResult).toBe('13 °F');
	});

	it('shows the air temperature when the formula does not apply', () => {
		const warm = run({ tempF: '60', windMph: '10' });
		expect(warm.primaryResult).toBe('60 °F');
		expect(warm.primaryLabel).toContain('no wind chill');
		expect(run({ tempF: '30', windMph: '0' }).primaryResult).toBe('30 °F');
	});

	it('returns a dash for a missing temperature or a negative wind speed', () => {
		expect(run({ tempF: 'abc' }).primaryResult).toBe('—');
		expect(run({ windMph: '-2' }).primaryResult).toBe('—');
	});
});
