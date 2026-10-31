import { describe, expect, it } from 'vitest';
import calc from './fha-loan-calculator.calc';
import { fhaAnnualMip } from '../data/us-loans';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

describe('FHA loan calculator', () => {
	it('matches the worked example', () => {
		const r = run();
		expect(r.primaryResult).toBe('$2,745.78');
		expect(r.secondaryMetrics?.[0].value).toBe('$2,115.98');
		expect(r.secondaryMetrics?.[1].value).toBe('$154.80');
	});
	it('follows HUD ML 2023-05 annual MIP bands', () => {
		expect(fhaAnnualMip(300000, 0.965, 30)).toEqual({ rate: 0.0055, years: 'life' });
		expect(fhaAnnualMip(300000, 0.93, 30)).toEqual({ rate: 0.005, years: 'life' });
		expect(fhaAnnualMip(300000, 0.9, 30)).toEqual({ rate: 0.005, years: 11 });
		expect(fhaAnnualMip(800000, 0.965, 30)).toEqual({ rate: 0.0075, years: 'life' });
		expect(fhaAnnualMip(300000, 0.9, 15)).toEqual({ rate: 0.0015, years: 11 });
		expect(fhaAnnualMip(800000, 0.85, 15)).toEqual({ rate: 0.004, years: 11 });
		expect(fhaAnnualMip(800000, 0.95, 15)).toEqual({ rate: 0.0065, years: 'life' });
	});
	it('rejects less than 3.5% down', () => {
		expect(run({ down: '3' }).primaryResult).toBe('—');
	});
});
