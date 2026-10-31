import { describe, expect, it } from 'vitest';
import calc from './gravel-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('gravel calculator', () => {
	it('matches the worked example: 20 ft × 10 ft, 3 in deep, 1.4 tons/yd³, 10% waste, $40/ton', () => {
		// 200 × 0.25 = 50 cu ft = 1.852 cu yd; × 1.1 = 2.037 cu yd (1.56 m³)
		// 2.037037 × 1.4 = 2.851852 tons; × $40 = $114.07
		const r = run();
		expect(r.primaryResult).toBe('2.04 cu yd');
		expect(r.primaryLabel).toBe('Gravel needed');
		expect(r.secondaryMetrics?.[0].value).toBe('1.85 cu yd (1.42 m³)');
		expect(r.secondaryMetrics?.[1].value).toBe('2.04 cu yd (1.56 m³)');
		expect(r.secondaryMetrics?.[2].value).toBe('2.85 tons');
		expect(r.secondaryMetrics?.[3].value).toBe('$114.07');
	});

	it('works in metric: 6 m × 4 m, 5 cm deep, 1.6 t/m³, 10% waste, $44/tonne', () => {
		// 6 × 4 × 0.05 = 1.2 m³; × 1.1 = 1.32 m³
		// 1.32 × 1.6 = 2.112 tonnes; × $44 = $92.93
		const r = run({ units: 'metric', lenM: '6', widM: '4', depthCm: '5', densityT: '1.6', priceT: '44' });
		expect(r.primaryResult).toBe('1.32 m³');
		expect(r.secondaryMetrics?.[0].value).toBe('1.57 cu yd (1.20 m³)');
		expect(r.secondaryMetrics?.[2].value).toBe('2.11 tonnes');
		expect(r.secondaryMetrics?.[3].value).toBe('$92.93');
	});

	it('handles a circle: 10 ft across, 3 in deep, no waste, no price', () => {
		// π × 5² × 0.25 = 19.635 cu ft; ÷ 27 = 0.727 cu yd, shown as 0.73
		// price 0 leaves out the cost
		const r = run({ shape: 'circle', diaFt: '10', depthIn: '3', waste: '0', priceTon: '0' });
		expect(r.primaryResult).toBe('0.73 cu yd');
		expect(r.secondaryMetrics?.[3].value).toBe('—');
	});

	it('returns a dash for a zero length or a negative waste allowance', () => {
		expect(run({ lenFt: '0', lenIn: '0' }).primaryResult).toBe('—');
		expect(run({ waste: '-5' }).primaryResult).toBe('—');
	});
});
