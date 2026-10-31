import { describe, expect, it } from 'vitest';
import calc from './bandwidth-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';
import type { CalculationResult } from '../types';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));

const metric = (r: CalculationResult, label: string) => r.secondaryMetrics?.find((m) => m.label === label)?.value;

describe('bandwidth calculator', () => {
	it('matches the worked example: 4.7 GB at 100 Mbps', () => {
		const r = run({ mode: 'download', size: '4.7', sizeUnit: 'GB', speed: '100', speedUnit: 'Mbps' });
		expect(r.primaryResult).toBe('0:06:16');
		expect(metric(r, 'Size in bits')).toBe('37,600,000,000');
		expect(metric(r, 'Transfer rate (MB/s)')).toBe('12.5');
	});

	it('uses bits: 1 GB at 8 Mbps takes 1,000 seconds', () => {
		expect(run({ size: '1', sizeUnit: 'GB', speed: '8', speedUnit: 'Mbps', base: 'decimal' }).primaryResult).toBe('0:16:40');
	});

	it('uses binary units when chosen: 1 MiB at 1 Mbps takes about 8.39 seconds', () => {
		const r = run({ size: '1', sizeUnit: 'MB', speed: '1', speedUnit: 'Mbps', base: 'binary' });
		expect(r.primaryResult).toBe('0:00:08');
		expect(metric(r, 'Time in seconds')).toBe('8.39');
	});

	it('handles Kbps: 1 KB at 8 Kbps is 8,000 bits, so 1 second', () => {
		expect(run({ size: '1', sizeUnit: 'KB', speed: '8', speedUnit: 'Kbps', base: 'decimal' }).primaryResult).toBe('0:00:01');
	});

	it('works out monthly data: 20 Mbps, 6 hours a day, 30 days = 1,620 GB', () => {
		const r = run({ mode: 'monthly', avg: '20', speedUnit: 'Mbps', hours: '6', days: '30' });
		expect(r.primaryResult).toBe('1,620 GB');
		expect(metric(r, 'Per day')).toBe('54 GB');
		expect(metric(r, 'Average transfer rate')).toBe('2.5 MB/s');
	});

	it('works out another monthly case: 10 Mbps, 2 hours a day, 31 days = 279 GB', () => {
		expect(run({ mode: 'monthly', avg: '10', speedUnit: 'Mbps', hours: '2', days: '31' }).primaryResult).toBe('279 GB');
	});

	it('gives zero data for zero hours', () => {
		expect(run({ mode: 'monthly', hours: '0' }).primaryResult).toBe('0 GB');
	});

	it('returns a dash for zero size or zero speed', () => {
		expect(run({ mode: 'download', size: '0' }).primaryResult).toBe('—');
		expect(run({ mode: 'download', speed: '0' }).primaryResult).toBe('—');
	});
});
