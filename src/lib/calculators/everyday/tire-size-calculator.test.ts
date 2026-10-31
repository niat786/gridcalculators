import { describe, expect, it } from 'vitest';
import calc from './tire-size-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('tire size calculator', () => {
	it('matches the worked example: 225/45R17 is 24.97 in, about 808 turns per mile', () => {
		// sidewall 101.25 mm; diameter 431.8 + 202.5 = 634.3 mm = 24.97 in; circumference 1992.7 mm; 1609344 ÷ 1992.7 = 807.6
		const r = run();
		expect(r.primaryResult).toBe('24.97 in');
		expect(r.secondaryMetrics?.[0].value).toBe('3.99 in');
		expect(r.secondaryMetrics?.[1].value).toBe('17 in');
		expect(r.secondaryMetrics?.[2].value).toBe('78.5 in');
		expect(r.secondaryMetrics?.[3].value).toBe('808');
		expect(r.secondaryMetrics?.[4].value).toBe('Not compared');
	});

	it('reads metric: 225/45R17 is 634.3 mm, with 501.8 turns per km', () => {
		// 1,000,000 mm ÷ 1992.71 mm = 501.8
		const r = run({ units: 'met' });
		expect(r.primaryResult).toBe('634.3 mm');
		expect(r.secondaryMetrics?.[3].value).toBe('502');
	});

	it('compares 225/45R17 with 235/40R18: +1.72% diameter, and 61.0 mph at a 60 mph reading', () => {
		// 235/40R18 = 645.2 mm; (645.2 − 634.3) ÷ 634.3 = 1.72%; 60 × 645.2 ÷ 634.3 = 61.03 mph
		const r = run({ compare: '235/40R18' });
		expect(r.secondaryMetrics?.[4].value).toBe('+1.72%');
		expect(r.secondaryMetrics?.[5].value).toBe('61.0 mph');
	});

	it('gives 101.7 km/h at a 100 km/h reading in metric', () => {
		const r = run({ units: 'met', compare: '235/40R18' });
		expect(r.secondaryMetrics?.[5].value).toBe('101.7 km/h');
	});

	it('accepts a prefix and a space: P225/45 R17 is the same size', () => {
		expect(run({ sizeText: 'P225/45 R17' }).primaryResult).toBe('24.97 in');
	});

	it('takes width, aspect and rim fields: 225, 45, 17 is the same size', () => {
		expect(run({ entry: 'parts', width: '225', aspect: '45', rim: '17' }).primaryResult).toBe('24.97 in');
	});

	it('returns a dash for an incomplete size or a zero rim diameter', () => {
		expect(run({ sizeText: '225/45' }).primaryResult).toBe('—');
		expect(run({ entry: 'parts', rim: '0' }).primaryResult).toBe('—');
	});
});
