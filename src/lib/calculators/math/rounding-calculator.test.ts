import { describe, expect, it } from 'vitest';
import calc from './rounding-calculator.calc';
import { defaultRaw, toValues } from '../../components/calculator/state';

const run = (over: Record<string, string> = {}) =>
	calc.calculate(toValues(calc.inputs, { ...defaultRaw(calc.inputs, '2026-01-15'), ...over }));
const result = (x: string, place: string, method: string) => run({ x, place, method }).primaryResult;

describe('rounding calculator', () => {
	it('avoids floating-point errors: 1.005 to hundredths, half up, is 1.01', () => {
		expect(result('1.005', 'hundredths', 'half-up')).toBe('1.01');
		expect(result('2.675', 'hundredths', 'half-up')).toBe('2.68');
	});

	it('uses half even (banker’s) rounding on exact halves', () => {
		expect(result('2.5', 'ones', 'half-even')).toBe('2');
		expect(result('3.5', 'ones', 'half-even')).toBe('4');
		expect(result('0.285', 'hundredths', 'half-even')).toBe('0.28');
		expect(result('0.275', 'hundredths', 'half-even')).toBe('0.28');
	});

	it('uses half down on exact halves', () => {
		expect(result('2.5', 'ones', 'half-down')).toBe('2');
		expect(result('2.51', 'ones', 'half-down')).toBe('3');
	});

	it('rounds negative exact halves away from zero with half up', () => {
		expect(result('-2.5', 'ones', 'half-up')).toBe('−3');
		expect(result('2.5', 'ones', 'half-up')).toBe('3');
	});

	it('rounds up (ceiling) and down (floor) in opposite directions for negatives', () => {
		expect(result('1.2345', 'hundredths', 'up')).toBe('1.24');
		expect(result('1.239', 'hundredths', 'down')).toBe('1.23');
		expect(result('-1.239', 'hundredths', 'down')).toBe('−1.24');
		expect(result('-1.239', 'hundredths', 'up')).toBe('−1.23');
	});

	it('rounds to large places and keeps trailing zeros in decimal places', () => {
		expect(result('1234567', 'thousands', 'half-up')).toBe('1,235,000');
		expect(result('1255', 'tens', 'half-up')).toBe('1,260');
		expect(result('12', 'tenths', 'half-up')).toBe('12.0');
		expect(result('0.4', 'ones', 'half-up')).toBe('0');
	});

	it('shows the change and whether the number was exactly halfway', () => {
		const r = run({ x: '1.005', place: 'hundredths', method: 'half-up' });
		expect(r.secondaryMetrics?.find((m) => m.label === 'Exactly halfway')?.value).toBe('Yes');
		expect(r.secondaryMetrics?.find((m) => m.label === 'Change from input')?.value).toBe('+0.005');
	});

	it('returns a dash for junk or infinite input', () => {
		expect(result('abc', 'ones', 'half-up')).toBe('—');
		expect(result('1e309', 'ones', 'half-up')).toBe('—');
	});
});
