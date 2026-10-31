import { describe, expect, it } from 'vitest';
import calc from './btu-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('btu calculator', () => {
	it('matches the worked example: 18 × 14 ft living room, 8 ft ceiling, normal sun, 3 people', () => {
		// 252 × 20 = 5,040; people (3 − 2) × 600 = 600; total 5,640 BTU/h
		// watts 5,640 × 0.29307107 = 1,652.9 → 1,653 W; tons 5,640 ÷ 12,000 = 0.47
		const r = run();
		expect(r.primaryResult).toBe('5,640 BTU/h');
		expect(r.secondaryMetrics?.[0].value).toBe('252 sq ft');
		expect(r.secondaryMetrics?.[1].value).toBe('5,040 BTU/h');
		expect(r.secondaryMetrics?.[2].value).toBe('0 BTU/h');
		expect(r.secondaryMetrics?.[3].value).toBe('600 BTU/h');
		expect(r.secondaryMetrics?.[4].value).toBe('1,653 W');
		expect(r.secondaryMetrics?.[5].value).toBe('0.47 tons');
	});

	it('adds 4,000 BTU/h for a kitchen and +10% for a very sunny room', () => {
		// 10 × 12 = 120 sq ft × 20 = 2,400; sun +240 = 2,640; kitchen +4,000 = 6,640 BTU/h
		// watts 6,640 × 0.29307107 = 1,945.99 → 1,946 W; tons 6,640 ÷ 12,000 = 0.55
		const r = run({ lenFt: '10', widFt: '12', ceilFt: '8', sun: 'sunny', people: '2', use: 'kitchen' });
		expect(r.primaryResult).toBe('6,640 BTU/h');
		expect(r.secondaryMetrics?.[4].value).toBe('1,946 W');
		expect(r.secondaryMetrics?.[5].value).toBe('0.55 tons');
	});

	it('takes 10% off a shaded bedroom with a standard 8 ft ceiling', () => {
		// 20 × 10 = 200 sq ft × 20 = 4,000; shaded −400 = 3,600 BTU/h
		// watts 3,600 × 0.29307107 = 1,055.06 → 1,055 W; tons 3,600 ÷ 12,000 = 0.30
		const r = run({ lenFt: '20', widFt: '10', ceilFt: '8', sun: 'shaded', people: '1', use: 'bedroom' });
		expect(r.primaryResult).toBe('3,600 BTU/h');
		expect(r.secondaryMetrics?.[2].value).toBe('-400 BTU/h');
		expect(r.secondaryMetrics?.[4].value).toBe('1,055 W');
		expect(r.secondaryMetrics?.[5].value).toBe('0.30 tons');
	});

	it('works in metres: 5 m × 4 m, 2.5 m ceiling, 2 people, bedroom', () => {
		// 5 × 4 m = 215.28 sq ft; × 20 × (2.5 m = 8.20 ft ÷ 8) = 4,414.33 → 4,414 BTU/h
		// watts 4,414 × 0.29307107 = 1,293.6 → 1,294 W; tons 4,414 ÷ 12,000 = 0.368 → 0.37
		const r = run({ units: 'm', lenM: '5', widM: '4', ceilM: '2.5', people: '2', use: 'bedroom' });
		expect(r.primaryResult).toBe('4,414 BTU/h');
		expect(r.secondaryMetrics?.[0].value).toBe('215.3 sq ft');
		expect(r.secondaryMetrics?.[4].value).toBe('1,294 W');
		expect(r.secondaryMetrics?.[5].value).toBe('0.37 tons');
	});

	it('returns a dash for a zero room length or a negative count of people', () => {
		expect(run({ lenFt: '0' }).primaryResult).toBe('—');
		expect(run({ people: '-1' }).primaryResult).toBe('—');
	});
});
